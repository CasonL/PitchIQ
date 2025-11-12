import { sanitizeForDeepgramText } from "@/utils/deepgramSanitizer";
import type { SpeakQueue, Logger } from "./speakQueue";

export type StepId = "ASK_PRODUCT" | "FISH_PRODUCT" | "ASK_AUDIENCE" | "CONFIRM" | "DONE";

export interface FlowOptions {
  speakQueue: SpeakQueue;
  onDataCollected: (data: { product: string; audience: string }) => void;
  log?: Logger;
  nudgeMs?: number; // inactivity nudge for each question
  skipFirstSpeak?: boolean; // if true, do not speak the initial question (use agent.greeting)
  onStateChange?: (state: StepId) => void; // notify UI about current step
  // Suggest prefill to UI and await explicit confirmation
  onPrefillSuggestion?: (payload: { type: "product" | "audience"; text: string }) => void;
  // Notify orchestrator that a confirm prompt is about to be spoken so UI can gate the button
  onConfirmCue?: (type: "product" | "audience") => void;
}

export const validators = {
  isSmallTalk(s: string) {
    const t = s.toLowerCase();
    return /^(hey|hi|hello|how'?s it going|what'?s up|nice|cool|okay|ok|thanks|thank you|confirmed|i confirmed|i'?ve confirmed|i clicked confirm|done|i am done|i'?m done)[.!\s]*$/i.test(t);
  },
  isValidProduct(s: string) {
    const t = s.toLowerCase();
    if (validators.isSmallTalk(t)) return false;
    if (/[?]$/.test(t)) return false;
    // Trim trailing punctuation/spaces
    const norm = t.replace(/[.,!\s]+$/g, "");
    // Primary keyword-based acceptance (verbs/products)
    if (/\b(sell|offer|build|make|provide|develop|deliver|software|app|saas|crm|website|service|training|product|coaching|course|consulting|agency|platform|tool|solution|hardware|device|ai|ml|data|analytics)\b/.test(norm)) {
      return true;
    }
    // Accept concise noun phrases like "snowboards", "lemonade stand", "marketing"
    const words = norm.split(/\s+/).filter(Boolean);
    if (words.length > 0 && words.length <= 5) {
      const hasLetters = words.some((w) => /[a-z]/.test(w));
      const hasLongish = words.some((w) => w.length >= 5); // e.g., "snowboards"
      if (hasLetters && hasLongish) return true;
    }
    return false;
  },
  isValidAudience(s: string) {
    const t = s.toLowerCase();
    if (validators.isSmallTalk(t)) return false;
    if (/[?]$/.test(t)) return false;
    const norm = t.replace(/[.,!\s]+$/g, "");
    
    // Detect incomplete/hesitant speech patterns
    const fillerWords = /\b(uh|um|hmm|er|ah|like|you know|i mean|sort of|kind of)\b/i;
    const trailingPreposition = /\b(to|for|with|in|at|on|by|from)\s*[.,]*\s*$/i;
    const hasEllipsis = /\.{2,}|\s+\.+\s*$/; // "..." or trailing dots
    const repeatedCommas = /,\s*,/; // ",," suggests incomplete
    
    // If it has filler words AND ends with preposition or ellipsis, it's incomplete
    if (fillerWords.test(t) && (trailingPreposition.test(t) || hasEllipsis.test(t))) {
      return false;
    }
    // If it ends with a preposition and nothing substantial after, likely incomplete
    if (trailingPreposition.test(t) && t.trim().split(/\s+/).length <= 4) {
      return false;
    }
    // Ellipsis or repeated commas suggest trailing off
    if (hasEllipsis.test(t) || repeatedCommas.test(t)) return false;
    
    // Minimum content requirements
    const words = t.trim().split(/\s+/).filter(Boolean);
    const alphanumericLength = t.replace(/[^a-z0-9]+/gi, "").length;
    
    // Reject single words or very short phrases (less than 4 characters of content)
    if (words.length < 2 && alphanumericLength < 4) return false;
    
    // Broad audience tokens: roles, demographics, common groups
    const audienceTokens = /\b(target|customers?|clients?|users?|buyers?|shoppers?|consumers?|founders?|entrepreneurs?|solopreneurs?|startups?|smbs?|small\s*business(es)?|business\s*owners?|clinics?|doctors?|retail|enterprise|schools?|nonprofits?|men|women|males?|females?|boys|girls|teens?|teenagers?|youth|young(er)?\s+(people|individuals|adults|men|women)|adults?|seniors?|parents?|students?|homeowners?|home\s*buyers?|athletes?|coaches?|engineers?|developers?|designers?|marketers?|cto?s?|ceo?s?|snowboarders?|skiers?|riders?|outdoor\s+enthusiasts?|tourists?|locals?|families?|employees?|workers?)\b/;
    if (audienceTokens.test(norm)) return true;
    // Age ranges like "18-35", "ages 25-40", or decades like "20s"
    if (/\b\d{1,2}\s*-\s*\d{1,2}\b/.test(norm)) return true;
    if (/\bages?\s*\d{1,2}(\s*-\s*\d{1,2})?\b/.test(norm)) return true;
    if (/\b\d{2}s\b/.test(norm)) return true; // 20s, 30s
    // B2B/B2C markers
    if (/\b(b2b|b2c)\b/.test(norm)) return true;
    // Multi-word phrase with audience context
    if (words.length >= 2 && alphanumericLength >= 8) return true;
    // Prepositions only valid if part of longer phrase (at least 2 words)
    if (words.length >= 2 && /\b(to|for|with|serv(e|ing)?|help(ing)?)\b/.test(t)) return true;
    return false;
  },
};

export function createMinimalCoachFlow(opts: FlowOptions) {
  const log: Logger = opts.log || (() => {});
  const speak = (t: string) => opts.speakQueue.speak(sanitizeForDeepgramText(t, 240));
  const nudgeMs = Math.max(8000, Math.min(30000, opts.nudgeMs ?? 15000));

  let state: StepId = "ASK_PRODUCT";
  let product = "";
  let audience = "";
  let disposed = false;
  let nudgeTimer: number | null = null;
  let awaitingProductConfirm = false;
  let awaitingAudienceConfirm = false;
  // Fishing state for product refinement
  type FishSlots = {
    delivery_model?: "SaaS" | "Coaching" | "Course" | "Consulting" | "Agency" | "Service" | "Other";
    motion?: "B2B" | "B2C";
    outcome?: string; // primary result promised
    advantage?: string; // competitive advantage
    audience_refine?: string; // role/industry/segment/geography
    price_tier?: "Premium" | "Affordable" | "Entry" | "Mid" | string;
  };
  let fish: FishSlots = {};
  let fishTurns = 0;
  const maxFishTurns = 3;
  let lastFishAsked: keyof FishSlots | null = null;

  const clearNudge = () => { if (nudgeTimer) { clearTimeout(nudgeTimer); nudgeTimer = null; } };
  const startNudge = (msg: string) => {
    clearNudge();
    nudgeTimer = window.setTimeout(() => {
      if (!disposed && (state === "ASK_PRODUCT" || state === "FISH_PRODUCT" || state === "ASK_AUDIENCE")) {
        speak(msg).catch(() => {});
      }
    }, nudgeMs);
  };

  

  async function start() {
    log("[Flow] start → ASK_PRODUCT");
    state = "ASK_PRODUCT";
    opts.onStateChange?.(state);
    if (opts.skipFirstSpeak) {
      // Agent will deliver greeting itself; just schedule a nudge
      startNudge("Just a short phrase works — what do you sell?");
      return;
    }
    await speak("Hey there! I'm Sam. First, what do you sell?");
    startNudge("Just a short phrase works — what do you sell?");
  }

  async function onUser(text: string) {
    if (disposed) return;
    const raw = String(text || "").trim();
    if (!raw) return;

    // Filter out small talk confirmations that aren't actual data
    const confirmationPhrases = /^(yes|yeah|yep|correct|that'?s right|that'?s correct|looks good|perfect|confirmed|i confirmed|i clicked confirm|ok|okay|sounds good|good|right|this is correct)[.!\s]*$/i;
    if (confirmationPhrases.test(raw)) {
      log(`[Flow] Ignoring small talk confirmation: "${raw}"`);
      return;
    }

    switch (state) {
      case "ASK_PRODUCT": {
        if (awaitingProductConfirm) {
          log(`[Flow] Ignoring user speech while awaiting product confirmation: "${raw}"`);
          // Don't respond at all - just silently ignore
          return;
        }
        if (!validators.isValidProduct(raw)) {
          log("[Flow] product invalid → re-ask");
          clearNudge();
          await speak("Could you tell me what you sell? A short phrase is perfect.");
          startNudge("What do you sell?");
          return;
        }
        // Store initial product and move to fishing stage
        product = raw;
        fish = {};
        fishTurns = 0;
        clearNudge();
        state = "FISH_PRODUCT";
        opts.onStateChange?.(state);
        await speak("Great start. Can you be a bit more specific? Is it a course, coaching, or a SaaS tool?");
        startNudge("Is it a course, coaching, or a SaaS tool?");
        return;
      }
      case "FISH_PRODUCT": {
        // Capture answers and keep asking until we have 3 slots or hit max turns
        fishTurns++;
        // Simple parsers
        const t = raw.toLowerCase();
        if (!fish.delivery_model) {
          if (/(saas|software\s+as\s+a\s+service)/i.test(raw)) fish.delivery_model = "SaaS";
          else if (/coaching?/i.test(raw)) fish.delivery_model = "Coaching";
          else if (/course|program/i.test(raw)) fish.delivery_model = "Course";
          else if (/consult(ing|ant)/i.test(raw)) fish.delivery_model = "Consulting";
          else if (/agency/i.test(raw)) fish.delivery_model = "Agency";
          else if (/service/i.test(raw)) fish.delivery_model = "Service";
          else if (t.length > 2) fish.delivery_model = "Other";
        }
        if (!fish.motion) {
          if (/\bb2b\b|business\s*to\s*business/i.test(raw)) fish.motion = "B2B";
          else if (/\bb2c\b|business\s*to\s*consumer|consumers?|individuals?/i.test(raw)) fish.motion = "B2C";
        }
        if (!fish.outcome) {
          const m = raw.match(/(increase|grow|boost|improve)\s+([a-z\s]+?)(?:\.|$)/i);
          if (m) fish.outcome = `${m[1]} ${m[2]}`.trim();
        }
        if (!fish.advantage) {
          if (/unique|different|advantage|edge|faster|better|cheaper|easier/i.test(raw)) {
            fish.advantage = raw;
          }
        }
        if (!fish.audience_refine && /(founders?|reps?|owners?|smb|enterprise|startup|industry|geograph|north|usa|canada|europe|role|team|segment)/i.test(raw)) {
          fish.audience_refine = raw;
        }
        if (!fish.price_tier) {
          if (/premium|high\s*ticket|expensive/i.test(raw)) fish.price_tier = "Premium";
          else if (/affordable|budget|low|cheap/i.test(raw)) fish.price_tier = "Affordable";
          else if (/entry\s*level/i.test(raw)) fish.price_tier = "Entry";
        }

        const filled = [
          fish.delivery_model,
          fish.motion,
          fish.outcome,
          fish.advantage,
          fish.audience_refine,
          fish.price_tier,
        ].filter(Boolean).length;

        if (filled >= 3 || fishTurns >= maxFishTurns) {
          clearNudge();
          // Paraphrase summary then confirm
          try {
            const resp = await fetch('/api/openai/summarize-business', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product, slots: fish }),
            });
            let summary = product;
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.summary) summary = String(data.summary);
            }
            // Send to UI and gate confirm
            opts.onPrefillSuggestion?.({ type: "product", text: summary });
            awaitingProductConfirm = true;
            opts.onConfirmCue?.("product");
            const sClean = String(summary || '').replace(/[.\s]+$/g, '');
            await speak(`Here's a short summary: ${sClean}. Please confirm.`);
          } catch {
            // Fallback: directly confirm with the raw product
            opts.onPrefillSuggestion?.({ type: "product", text: product });
            awaitingProductConfirm = true;
            opts.onConfirmCue?.("product");
            await speak("Got it. I wrote that below — please confirm.");
          }
          // Keep state here (ASK_PRODUCT logic will handle confirmation)
          state = "ASK_PRODUCT";
          opts.onStateChange?.(state);
          startNudge("If the summary looks right, press confirm.");
          return;
        }

        // Ask next missing slot question (avoid immediate repetition of the same slot)
        const missing: Array<keyof FishSlots> = [];
        if (!fish.delivery_model) missing.push("delivery_model");
        if (!fish.motion) missing.push("motion");
        if (!fish.outcome) missing.push("outcome");
        if (!fish.advantage) missing.push("advantage");
        if (!fish.audience_refine) missing.push("audience_refine");
        if (!fish.price_tier) missing.push("price_tier");

        let nextSlot: keyof FishSlots | undefined = missing[0];
        if (lastFishAsked && missing.length > 1 && nextSlot === lastFishAsked) {
          nextSlot = missing[1];
        }

        // If only one slot remains and we just asked it in the previous turn, stop fishing and paraphrase now
        if (missing.length === 1 && lastFishAsked === missing[0]) {
          clearNudge();
          try {
            const resp = await fetch('/api/openai/summarize-business', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ product, slots: fish }),
            });
            let summary = product;
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.summary) summary = String(data.summary);
            }
            opts.onPrefillSuggestion?.({ type: "product", text: summary });
            awaitingProductConfirm = true;
            opts.onConfirmCue?.("product");
            const sClean = String(summary || '').replace(/[.\s]+$/g, '');
            await speak(`Here's a short summary: ${sClean}. Please confirm.`);
          } catch {
            opts.onPrefillSuggestion?.({ type: "product", text: product });
            awaitingProductConfirm = true;
            opts.onConfirmCue?.("product");
            await speak("Got it. I wrote that below — please confirm.");
          }
          state = "ASK_PRODUCT";
          opts.onStateChange?.(state);
          startNudge("If the summary looks right, press confirm.");
          return;
        }

        const variant = fishTurns % 2; // simple phrasing variety
        if (nextSlot === "delivery_model") {
          lastFishAsked = "delivery_model";
          await speak(variant ? "Is it a course, coaching, SaaS, or something else?" : "Delivery-wise — course, coaching, or a SaaS tool?");
          startNudge("Course, coaching, SaaS, or something else?");
          return;
        }
        if (nextSlot === "motion") {
          lastFishAsked = "motion";
          await speak(variant ? "Is your sales motion B2B or B2C?" : "Do you sell B2B or B2C?");
          startNudge("B2B or B2C?");
          return;
        }
        if (nextSlot === "outcome") {
          lastFishAsked = "outcome";
          await speak(variant ? "What's the primary outcome you help them achieve?" : "What result do you help customers get?");
          startNudge("What's the primary outcome?");
          return;
        }
        if (nextSlot === "advantage") {
          lastFishAsked = "advantage";
          await speak(variant ? "What makes it stand out — any competitive advantage?" : "What’s different about it versus alternatives?");
          startNudge("Any competitive advantage?");
          return;
        }
        if (nextSlot === "audience_refine") {
          lastFishAsked = "audience_refine";
          await speak(variant ? "Who typically buys — role, industry, or segment?" : "Which roles or industries usually buy it?");
          startNudge("Role, industry, or segment?");
          return;
        }
        if (nextSlot === "price_tier") {
          lastFishAsked = "price_tier";
          await speak(variant ? "How would you position it — premium, affordable, or entry-level?" : "Is it premium, affordable, or entry-level?");
          startNudge("Premium, affordable, or entry-level?");
          return;
        }
        return;
      }
      case "ASK_AUDIENCE": {
        if (awaitingAudienceConfirm) {
          log(`[Flow] Ignoring user speech while awaiting audience confirmation: "${raw}"`);
          // Don't respond at all - just silently ignore
          return;
        }
        if (!validators.isValidAudience(raw)) {
          log(`[Flow] audience invalid → re-ask (raw="${raw}")`);
          clearNudge();
          await speak("Got it. And who do you sell to? You can keep it short.");
          startNudge("Who do you sell to?");
          return;
        }
        opts.onPrefillSuggestion?.({ type: "audience", text: raw });
        awaitingAudienceConfirm = true;
        clearNudge();
        opts.onConfirmCue?.("audience");
        await speak("Thanks — I drafted your target market below. Please confirm.");
        return;
      }
      case "CONFIRM":
      case "DONE":
      default:
        return;
    }
  }

  async function confirmProduct(text: string) {
    if (disposed) return;
    if (!(state === "ASK_PRODUCT" || state === "FISH_PRODUCT")) return;
    const raw = String(text || "").trim();
    if (!raw) return;
    product = raw;
    awaitingProductConfirm = false;
    log(`[Flow] product confirmed → ${product}`);
    clearNudge();
    state = "ASK_AUDIENCE";
    opts.onStateChange?.(state);
    await speak("Great. And who do you sell to?");
    startNudge("Who do you typically sell to?");
  }

  async function confirmAudience(text: string) {
    if (disposed) return;
    if (state !== "ASK_AUDIENCE") return;
    const raw = String(text || "").trim();
    if (!raw) return;
    audience = raw;
    awaitingAudienceConfirm = false;
    log(`[Flow] audience confirmed → ${audience}`);
    clearNudge();
    state = "CONFIRM";
    opts.onStateChange?.(state);
    // Start persona generation immediately, then deliver the closing line.
    // This lets the UI begin generating while Sam finishes speaking.
    opts.onDataCollected({ product, audience });
    await speak("Perfect. Give me a moment while I generate your persona!");
    state = "DONE";
    opts.onStateChange?.(state);
  }

  function dispose() {
    disposed = true;
    clearNudge();
  }

  function getState() { return state; }

  return { start, onUser, dispose, getState, confirmProduct, confirmAudience };
}
