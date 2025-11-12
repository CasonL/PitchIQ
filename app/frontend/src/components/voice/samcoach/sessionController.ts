import { IntakeContext, IntakeState, advance, nextAgentLine, initialContext } from "./dialogueFlow";
import { extractLeadSpec, quickSplit } from "./extractor";

export class SessionController {
  private ctx: IntakeContext = initialContext;
  private productAnswer = "";
  private audienceAnswer = "";

  // Very lightweight heuristics to avoid treating small-talk as answers
  private isGreetingOrSmallTalk(text: string): boolean {
    const t = text.toLowerCase().trim();
    if (!t) return true;
    const short = t.replace(/[^a-z0-9\s'.,!?-]/g, "").trim();
    const norm = short.replace(/[.,!?-]/g, "").replace(/\s+/g, " ");
    const exacts = new Set([
      "hi", "hey", "hello", "hiya", "yo", "sup", "what's up", "good morning", "good afternoon", "good evening",
      "how's it going", "how are you", "i'm good", "i am good", "i'm well", "i am well", "doing well", "i'm doing well",
      "fine", "thanks", "thank you", "no problem", "np", "ok", "okay", "cool", "great", "awesome",
      "how can i help you", "how can i help you today", "how can i assist you", "how can i assist you today"
    ]);
    if (exacts.has(norm)) return true;
    // simple contains checks for common support phrases
    if (
      norm.includes("how can i help") ||
      norm.includes("how can i assist") ||
      norm === "how are you doing" ||
      norm === "how are you"
    ) return true;
    // If all tokens are from acknowledgement set and there are only one or two tokens, treat as small talk
    const tokens = norm.split(/\s+/).filter(Boolean);
    if (tokens.length > 0 && tokens.length <= 2) {
      const ack = new Set(["hi","hey","hello","good","thanks","thank","ok","okay","fine","cool","great","awesome","morning","afternoon","evening"]);
      if (tokens.every(w => ack.has(w))) return true;
    }
    return false;
  }

  private isValidProductAnswer(text: string): boolean {
    const t = text.toLowerCase().trim();
    if (this.isGreetingOrSmallTalk(t)) return false;
    if (!t || t === "-") return false;
    // Accept if contains common offer verbs or nouns
    const cues = /(we|i)\s+(sell|offer|build|make|provide|develop|deliver)\b|\b(software|app|platform|website|websites|service|training|consulting|course|tool|agency|product|hardware|saas|crm|platform)\b/;
    // Disallow obvious questions
    if (/[?]$/.test(t)) return false;
    if (cues.test(t)) return true;
    // Fallback: allow single-word concrete nouns (e.g., "socks", "websites")
    const tokens = t.split(/\s+/).filter(Boolean);
    if (tokens.length === 1 && tokens[0].length >= 3) {
      const word = tokens[0];
      const deny = new Set(["hey","hi","hello","thanks","ok","okay","cool","great","awesome"]);
      if (!deny.has(word)) return true;
    }
    return false;
  }

  private isValidAudienceAnswer(text: string): boolean {
    const t = text.toLowerCase().trim();
    if (this.isGreetingOrSmallTalk(t)) return false;
    if (!t || t === "-") return false;
    // Single-word segments like "dentists", "founders" should be accepted
    const audienceCues = /(to|for)\s+|\b(customers|clients|businesses|companies|founders|startups|smbs?|enterprise|teachers|students|patients|homeowners|consumers|parents|dentists|doctors|clinics|restaurants|retailers|nonprofits|realtors|contractors|marketers|developers|designers|lawyers|accountants|cpas|therapists)\b/;
    // Disallow obvious questions
    if (/[?]$/.test(t)) return false;
    return audienceCues.test(t);
  }

  constructor(
    private ttsSpeak: (line: string) => Promise<void>,
    private onPersonaGenerate: (data: { product: string; audience: string }) => void
  ) {}

  /** Call this when Deepgram yields a final user utterance */
  async onUserUtterance(text: string) {
    const utterance = (text || "").trim();
    this.ctx.lastUserUtterance = utterance;

    // Handle product step
    if (this.ctx.state === IntakeState.ASK_PRODUCT) {
      // Ignore greetings/small talk
      if (this.isGreetingOrSmallTalk(utterance)) {
        await this.ttsSpeak(nextAgentLine(this.ctx));
        return;
      }
      // Try quick split (both answers in one sentence)
      const quickResult = quickSplit(utterance);
      if (quickResult && quickResult.product && quickResult.audience) {
        const prodOk = this.isValidProductAnswer(quickResult.product);
        const audOk = this.isValidAudienceAnswer(quickResult.audience);
        if (prodOk) this.productAnswer = quickResult.product;
        if (audOk) this.audienceAnswer = quickResult.audience;
        if (!prodOk) {
          // Re-ask product
          await this.ttsSpeak(nextAgentLine(this.ctx));
          return;
        }
        // Advance to audience if needed
        this.ctx = advance(this.ctx); // -> ASK_AUDIENCE
        if (!audOk) {
          await this.ttsSpeak(nextAgentLine(this.ctx));
          return;
        }
        // If both valid, proceed to CONFIRM
        this.ctx = advance(this.ctx); // ASK_AUDIENCE -> CONFIRM
      } else {
        // Single product capture path
        if (!this.isValidProductAnswer(utterance)) {
          await this.ttsSpeak(nextAgentLine(this.ctx));
          return;
        }
        this.productAnswer = utterance;
        this.ctx = advance(this.ctx); // -> ASK_AUDIENCE
        await this.ttsSpeak(nextAgentLine(this.ctx));
        return;
      }
    }

    // Handle audience step when reached by normal flow
    if (this.ctx.state === IntakeState.ASK_AUDIENCE) {
      if (this.isGreetingOrSmallTalk(utterance) || !this.isValidAudienceAnswer(utterance)) {
        await this.ttsSpeak(nextAgentLine(this.ctx));
        return;
      }
      this.audienceAnswer = utterance;
      this.ctx = advance(this.ctx); // -> CONFIRM
    }

    // Handle confirmation state
    if (this.ctx.state === IntakeState.CONFIRM) {
      const { product, audience } = await extractLeadSpec(this.productAnswer, this.audienceAnswer);
      const productValid = this.isValidProductAnswer(product);
      const audienceValid = this.isValidAudienceAnswer(audience);

      if (!productValid || !audienceValid) {
        // Redirect to missing field(s)
        if (!productValid) {
          this.ctx = { ...this.ctx, state: IntakeState.ASK_PRODUCT };
          await this.ttsSpeak(nextAgentLine(this.ctx));
          return;
        }
        if (!audienceValid) {
          this.ctx = { ...this.ctx, state: IntakeState.ASK_AUDIENCE };
          await this.ttsSpeak(nextAgentLine(this.ctx));
          return;
        }
      }

      this.ctx.product = product;
      this.ctx.audience = audience;
      await this.ttsSpeak(nextAgentLine(this.ctx));
      this.ctx = advance(this.ctx); // -> DONE

      // Trigger persona generation only when both are validated
      this.onPersonaGenerate({ product, audience });
      return;
    }
  }

  /** Start the flow: greet, then immediately ask product */
  async start() {
    // INTRO line
    await this.ttsSpeak(nextAgentLine(this.ctx));
    // advance and ask product
    this.ctx = advance(this.ctx);
    await this.ttsSpeak(nextAgentLine(this.ctx));
  }

  /** Use this when an external greeting already played. Jumps straight to product question. */
  async beginAfterGreeting() {
    if (this.ctx.state === IntakeState.INTRO) {
      this.ctx = advance(this.ctx); // -> ASK_PRODUCT
      await this.ttsSpeak(nextAgentLine(this.ctx));
    }
  }

  /** Align state to expect product answer after external greeting without speaking. */
  alignAfterIntro() {
    if (this.ctx.state === IntakeState.INTRO) {
      this.ctx = { ...this.ctx, state: IntakeState.ASK_PRODUCT };
    }
  }

  /** Get current state for debugging */
  getState(): IntakeState {
    return this.ctx.state;
  }

  /** Check if conversation is complete */
  isDone(): boolean {
    return this.ctx.state === IntakeState.DONE;
  }

  /** Reset the conversation */
  reset() {
    this.ctx = initialContext;
    this.productAnswer = "";
    this.audienceAnswer = "";
  }
}
