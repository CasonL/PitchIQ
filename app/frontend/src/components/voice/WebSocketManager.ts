/**
 * WebSocketManager.ts - Deepgram WebSocket manager using SDK approach
 * Based on successful DeepgramVoiceAgent SDK implementation pattern
 */

import { createClient, AgentEvents } from "@deepgram/sdk";
import { Buffer } from "buffer";
import { AudioManager } from "./AudioManager";
import { VoiceSelector } from "./VoiceSelector";
import { PsychologicalTraitSelector } from '../../utils/PsychologicalTraitSelector';
import { sanitizeForDeepgramText, hardenSettings } from '../../utils/deepgramSanitizer';
import { debounce } from '../../utils/debounce.ts';
import { CallMonitoring } from './CallMonitoring';

// Poly-fill for Buffer (DG browser SDK expects Node.Buffer in the global scope)
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

// Constants
const MIC_RATE = 48_000; // True browser native rate
const TTS_RATE = 48_000; // Keep aligned - fix sample rate mismatch
const KEEPALIVE_MS = 5_000; // Send keepalive every 5 seconds
// Standardized models and paths
const DG_ASR_MODEL = 'nova-2';
const DG_THINK_MODEL = 'gpt-4o-mini';
const DG_WORKLET_PATH = '/deepgram-worklet.js';

export interface WebSocketConfig {
  token: string;
  log: (message: string, level?: string) => void;
  onOpen?: () => void;
  onClose?: (wasClean: boolean, code: number, reason: string) => void;
  onError?: (error: any) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAudio?: (arrayBuffer: ArrayBuffer) => void;
  onTurnFinal?: (turn: { role: 'ai' | 'user'; text: string; timestamp?: number; raw?: any }) => void;
  sessionId?: string;
  personaName?: string;
  personaData?: any;
  userName?: string;
  onPersonaChanged?: (newPersona: any) => void;
  disableAutoGreeting?: boolean; // For custom dialogue control (e.g., CharmerController)
}

interface DeepgramAgent {
  configure: (settings: any) => void;
  send: (data: ArrayBuffer) => void;
  keepAlive: () => void;
  finish: () => void;
  close: () => void;
  on: (event: string, callback: (data?: any) => void) => void;
  stop: () => void;
  reconfigure?: (settings: any) => void; // Optional for dynamic persona switching
}

export class WebSocketManager {
  private config: WebSocketConfig;
  private agent: DeepgramAgent | null = null;
  private dgClient: any = null;
  private micStream: MediaStream | null = null;
  private micCtx: AudioContext | null = null;
  private micNode: AudioWorkletNode | null = null;
  private keepaliveInterval: number | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private _stableSessionId: string;
  private _agentId: string = "prospect-male"; // Default agent ID
  private intentionalTermination: boolean = false;
  private _currentVoiceModel: string = "aura-2-nova-en"; // Track current voice model
  private _currentPersona: any = null; // Track current persona
  private _inPersonaSwitchMode: boolean = false; // Flag for persona switching state
  private _currentBehavioralState?: string; // Latest behavioral hints string
  private _debouncedPromptReconfigure: (scores: { rapport: number; trust: number; interest: number }) => void;
  private _systemPromptExtra?: string; // Optional extra system prompt content
  private _terminationIntent: { active: boolean; phrase?: string } = { active: false };
  private _gracefulExitActive: boolean = false; // Flag for graceful exit mode
  // Reconfigure de-dupe/throttle state
  private _lastThinkPromptHash: string | null = null;
  private _lastReconfigAt: number = 0;
  private _minReconfigIntervalMs: number = 2500;
  private _supportsReconfigure: boolean = false;
  // Startup grace window before allowing runtime prompt updates
  private _reconfigureReadyAt: number = 0;
  private _reconfigureTimer: number | null = null;
  // Turn aggregation state
  private _currentSpeaker: 'ai' | 'user' | null = null;
  private _currentTurnText: string = '';
  private _lastTurnAt: number = 0;
  
  // Statistics for logging
  private audioPacketCount: number = 0;
  private micChunkCount: number = 0;
  private lastLogTime: number = Date.now();
  // Speak watchdog state
  private _spokenOnce: boolean = false;
  private _speakWatchdogTimer: number | null = null;
  // Recovery and reconnection state
  private _recoveringSpeak: boolean = false;
  private _suppressNextOnClose: boolean = false;
  private _reconnectTimer: number | null = null;
  // Control when mic audio is allowed to stream to Deepgram
  private _canStreamAudio: boolean = false;
  // Track whether agent.start() has been issued for this connection
  private _startIssued: boolean = false;
  // Gating diagnostics
  private _gatingCount: number = 0;
  private _lastGatingLogAt: number = 0;
  // Fallback timer to start agent if SettingsApplied is delayed or missed
  private _startFallbackTimer: number | null = null;

  constructor(config: WebSocketConfig) {
    this.config = config;
    
    // Use provided session ID or generate a stable one
    this._stableSessionId = config.sessionId || this.generateSessionId();
    // Track current persona to enable behavioral state updates
    this._currentPersona = config.personaData || null;
    
    this.config.log(`🆔 Using stable session ID: ${this._stableSessionId}`);

    // Initialize debounced prompt reconfigure handler
    this._debouncedPromptReconfigure = debounce((scores) => {
      // Update stored hints, then reconfigure prompt
      this.updateBehavioralState(scores)
        .then(() => this.reconfigurePrompt())
        .catch((e) => this.config.log(`⚠️ Debounced prompt reconfigure failed: ${e}`, 'warn'));
    }, 1200);
  }

  // Centralized helper to toggle mic streaming with diagnostics
  private setMicStreamingAllowed(allowed: boolean, reason: string): void {
    if (this._canStreamAudio !== allowed) {
      this._canStreamAudio = allowed;
      this.smartLog('important', `🎚️ Mic streaming ${allowed ? 'ENABLED' : 'DISABLED'} (${reason})`);
    } else {
      // Only occasionally log no-op transitions to avoid spam
      const now = Date.now();
      if (now - this._lastGatingLogAt > 3000) {
        this.smartLog('important', `ℹ️ Mic streaming already ${allowed ? 'enabled' : 'disabled'} (${reason})`);
        this._lastGatingLogAt = now;
      }
    }
  }

  // Generate a stable session ID
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const personaIdentifier = this.config.personaName ? 
      this.config.personaName.replace(/\s+/g, '_') : 'AI_Persona';
      
    return `${personaIdentifier}_${timestamp}_${random}`;
  }

  // Smart logging function
  private smartLog(type: 'audio' | 'mic' | 'important', message: string, data?: any) {
    const now = Date.now();
    
    if (type === 'important') {
      this.config.log(message);
      return;
    }
    
    if (type === 'audio') {
      this.audioPacketCount++;
      if (this.audioPacketCount % 50 === 0 || now - this.lastLogTime > 5000) {
        this.config.log(`🔊 Audio packets: ${this.audioPacketCount} ${data?.rms ? `(RMS: ${data.rms})` : ''}`);
        this.lastLogTime = now;
      }
    } else if (type === 'mic') {
      this.micChunkCount++;
      if (this.micChunkCount % 100 === 0 || now - this.lastLogTime > 3000) {
        this.config.log(`🎙️ Mic chunks: ${this.micChunkCount} ${data?.rms ? `(RMS: ${data.rms})` : ''}`);
        this.lastLogTime = now;
      }
    }
  }

  // Finalize the current aggregated turn and emit via callback
  private finalizeTurn(role: 'ai' | 'user', raw?: any): void {
    const text = (this._currentTurnText || '').trim();
    if (!text) {
      this._currentSpeaker = null;
      this._currentTurnText = '';
      return;
    }
    const ts = Date.now();
    try {
      this.config.onTurnFinal?.({ role, text, timestamp: ts, raw });
    } catch (e) {
      this.smartLog('important', `⚠️ onTurnFinal handler error: ${String(e)}`);
    }
    this._lastTurnAt = ts;
    this._currentSpeaker = null;
    this._currentTurnText = '';
  }

  // Simple hash helper for deduping prompt changes (djb2 variant)
  private hashString(input: string): string {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) + h) ^ input.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

  // Validate and normalize requested voice model
  private validateVoiceModel(requested: string, persona?: any): string {
    try {
      const voices = (VoiceSelector.getAllVoices?.() || []).map((v: any) => String(v.id).toLowerCase());
      const req = String(requested || '').toLowerCase();
      // Block reserved coach voice for non-coach personas
      const isCoach = !!(persona && persona.name && String(persona.name).toLowerCase().includes('sam') && persona.role && String(persona.role).toLowerCase().includes('coach'));
      if (!isCoach && req === 'aura-asteria-en') {
        this.config.log('⛔ Reserved coach voice blocked for non-coach persona; falling back', 'warn');
        return 'aura-2-nova-en';
      }
      if (voices.length && !voices.includes(req)) {
        this.config.log(`⚠️ Unknown or unsupported voice model "${requested}"; using default`, 'warn');
        return 'aura-2-nova-en';
      }
      return requested || 'aura-2-nova-en';
    } catch {
      // If anything goes wrong, use safe default
      return 'aura-2-nova-en';
    }
  }

  // Build natural phone-style greeting for persona
  private buildPersonaGreeting(): string {
    const persona = this.config.personaData;
    if (!persona) return 'Hello?';
    
    const fullName = (persona.name || '').trim();
    const firstName = fullName.split(' ')[0] || 'there';
    const company = (persona.company || '').trim();
    const role = (persona.role || '').trim();
    
    // Heuristic B2B detection: corporate keywords
    const isB2B = !!company || 
                  /(CEO|CTO|COO|CFO|Founder|Owner|Director|Manager|Lead|VP|Vice President|Sales|Marketing|Ops|Operations|Engineer|Consultant|Specialist|Partner)/i.test(role);
    
    if (isB2B && company) {
      const b2bVariants = [
        `Hello, this is ${firstName} from ${company}.`,
        `${firstName} speaking.`,
        `Good afternoon, ${company}. ${firstName} speaking.`,
        `Hi, this is ${firstName}.`,
      ];
      return b2bVariants[Math.floor(Math.random() * b2bVariants.length)];
    } else if (isB2B) {
      return `Hello, this is ${firstName}.`;
    } else {
      const quirky = [
        `${firstName} speaking.`,
        `Hello?`,
        `Hi, this is ${firstName}.`,
        `Hello, ${firstName} speaking.`,
      ];
      return quirky[Math.floor(Math.random() * quirky.length)];
    }
  }

  // Speak watchdog: if agent never starts speaking shortly after start, try recovery
  private startSpeakWatchdog(timeoutMs: number = 6000): void {
    this.clearSpeakWatchdog();
    this._spokenOnce = false;
    this._speakWatchdogTimer = window.setTimeout(() => {
      if (!this._spokenOnce) {
        this.smartLog('important', '⏱️ Speak watchdog fired: agent has not spoken; attempting voice fallback');
        // Enter recovery mode so Close can auto-reconnect if needed
        this._recoveringSpeak = true;
        this.fallbackReconfigureSpeak('speak_watchdog').catch((e) => this.config.log(`⚠️ Fallback reconfigure failed: ${e}`, 'warn'));
      }
    }, timeoutMs);
  }

  private clearSpeakWatchdog(): void {
    if (this._speakWatchdogTimer) {
      clearTimeout(this._speakWatchdogTimer);
      this._speakWatchdogTimer = null;
    }
  }

  // Try to recover speak by switching to a safe default voice model
  private async fallbackReconfigureSpeak(reason: string): Promise<boolean> {
    try {
      if (!this.agent || !this.isConnected) return false;
      // Ensure we mark recovery in case caller didn't
      this._recoveringSpeak = true;
      const safeVoice = 'aura-2-nova-en';
      if (this._currentVoiceModel === safeVoice) {
        this.config.log('⏭️ Fallback skipped: already using safe voice');
        return true;
      }
      this.config.log(`🔁 Applying speak fallback (${reason}): ${this._currentVoiceModel} → ${safeVoice}`);
      const settings = hardenSettings({
        agent: {
          speak: { model: safeVoice }
        }
      });
      if (typeof (this.agent as any).reconfigure === 'function') {
        (this.agent as any).reconfigure(settings);
      } else if (typeof (this.agent as any).configure === 'function') {
        if (typeof (this.agent as any).stop === 'function') (this.agent as any).stop();
        if (typeof (this.agent as any).finish === 'function') (this.agent as any).finish();
        (this.agent as any).configure(settings);
      } else {
        this.config.log('❌ Agent lacks reconfigure/configure methods; cannot apply fallback', 'error');
        return false;
      }
      this._currentVoiceModel = safeVoice;
      this.config.log('✅ Speak fallback applied');
      // Start another short watchdog to confirm recovery
      this.startSpeakWatchdog(5000);
      return true;
    } catch (e) {
      this.config.log(`❌ Speak fallback failed: ${e}`, 'error');
      return false;
    }
  }

  // Sanitization and settings hardening have been moved to ../../utils/deepgramSanitizer

  // Start the WebSocket connection
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      this.config.log("⚠️ Already connecting or connected");
      return;
    }

    this.isConnecting = true;
    this.intentionalTermination = false;

    try {
      // For custom dialogue control (Marcus), skip pre-configured agents entirely
      // Pre-configured agents have hardcoded voice settings that override our config
      if (this.config.disableAutoGreeting) {
        this.smartLog('important', `🎙️ STT-only mode: skipping pre-configured agent (custom dialogue control)`);
        this._agentId = ''; // No agent ID = raw STT
      } else {
        // Determine which Deepgram agent to use based on persona gender
        // Note: We'll select the agent using the 'agent_id' field in settings instead
        // of during client creation, as the SDK doesn't support direct agent selection
        let agentId = "prospect-male"; // Default to male prospect
        
        if (this.config.personaData) {
          // Check if it's a coaching agent (Sam)
          if (this.config.personaData.name && 
              this.config.personaData.name.toLowerCase().includes('sam') && 
              this.config.personaData.role && 
              this.config.personaData.role.toLowerCase().includes('coach')) {
            agentId = "sam-coach";
            this.smartLog('important', `🎭 Using coach agent: ${agentId}`);
          }
          // Otherwise determine based on gender
          else {
            // Look for gender indicators in various persona properties
            const personaStr = JSON.stringify(this.config.personaData).toLowerCase();
            const isFemale = personaStr.includes('"gender":"female"') || 
                            personaStr.includes('she/her') ||
                            personaStr.includes('woman') ||
                            personaStr.includes('female');
            
            agentId = isFemale ? "prospect-female" : "prospect-male";
            this.smartLog('important', `🎭 Using ${isFemale ? 'female' : 'male'} prospect agent: ${agentId}`);
          }
        }
        
        // Store the agentId for use in buildSettings()
        this._agentId = agentId;
      }
      
      // Initialize the Deepgram client (without passing agent ID directly)
      this.dgClient = createClient(this.config.token);
      this.agent = this.dgClient.agent();
      this._supportsReconfigure = !!(this.agent && typeof (this.agent as any).reconfigure === 'function');
      this.smartLog('important', `🧩 Agent reconfigure support: ${this._supportsReconfigure ? 'yes' : 'no (will avoid runtime Settings updates)'}`);
      
      this.smartLog('important', `✅ Deepgram client created${this._agentId ? ` - will use agent: ${this._agentId}` : ' - STT-only mode (no agent)'} in settings`);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Request microphone access
      await this.setupMicrophone();
      
      // Configure and start the agent
      const settings = await this.buildSettings();
      const hardenedInitial = hardenSettings(settings, { preserveLegacy: true });
      // DEBUG: Log the hardened/sanitized settings actually sent to Deepgram
      this.smartLog('important', `🔍 HARDENED SETTINGS SENT TO DEEPGRAM: ${JSON.stringify(hardenedInitial, null, 2)}`);
      this.agent.configure(hardenedInitial);
      this.smartLog('important', "✅ Settings sent - waiting for SettingsApplied...");
      
      // Start keepalive
      this.startKeepalive();
      
    } catch (error) {
      this.smartLog('important', `❌ Connection error: ${error}`);
      this.isConnecting = false;
      this.cleanup();
    }
  }

  // Setup all event listeners
  private setupEventListeners(): void {
    if (!this.agent) return;
    
    this.agent.on(AgentEvents.Open, () => {
      this.smartLog('important', `🌐 WebSocket opened for session ${this._stableSessionId}`);
      this.isConnected = true;
      this.isConnecting = false;
      // Reset recovery/reconnect state on successful open
      if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
      this._suppressNextOnClose = false;
      this._recoveringSpeak = false;
      // Reset start gating state and ensure mic is disabled until we start
      this._startIssued = false;
      this.setMicStreamingAllowed(false, 'socket-open');
      // Remove previous fallback that enabled mic streaming before SettingsApplied.
      // We must wait for SettingsApplied to avoid 'BINARY_MESSAGE_BEFORE_SETTINGS'.
      if (this._startFallbackTimer) { clearTimeout(this._startFallbackTimer); this._startFallbackTimer = null; }
      // New fallback: if SettingsApplied is delayed/missed, try a strict-schema reconfigure
      // without enabling mic streaming yet. This preserves protocol order.
      this._startFallbackTimer = window.setTimeout(async () => {
        try {
          if (this.agent && this.isConnected && !this._startIssued) {
            this.smartLog('important', '⏩ Fallback: reconfiguring with legacy provider-shaped schema (awaiting SettingsApplied)');
            const legacy = hardenSettings(await this.buildSettings(), { preserveLegacy: true });
            (this.agent as any).configure(legacy);
          }
        } catch (e) {
          this.smartLog('important', `⚠️ Fallback reconfigure failed: ${String(e)}`);
        }
      }, 2200);
      this.config.onOpen?.();
    });

    this.agent.on(AgentEvents.SettingsApplied, () => {
      this.smartLog('important', `✅ Settings applied for session ${this._stableSessionId} - starting agent`);
      
      // CRITICAL: Enable mic streaming AFTER settings are applied
      // The modern Deepgram SDK doesn't require explicit start() calls
      if (this.agent) {
        if (!this._startIssued) {
          this._startIssued = true;
        }
        // Clear any pending fallback timer now that ACK arrived
        if (this._startFallbackTimer) { clearTimeout(this._startFallbackTimer); this._startFallbackTimer = null; }
        this.setMicStreamingAllowed(true, 'settings-applied'); // Allow mic streaming after settings applied
        this.smartLog('important', "✅ Agent configured - AI should initiate conversation");
      }
      // Defer runtime prompt updates for a short grace period after startup
      this._reconfigureReadyAt = Date.now() + 3500;
      // Start speak watchdog; if the agent doesn't speak shortly, attempt recovery
      // Use longer timeout for prospect agents who need more time to process initial prompt
      const isProspectAgent = this.config.personaName && this.config.personaName !== 'sam_coach';
      const watchdogTimeout = isProspectAgent ? 15000 : 7000;
      this.startSpeakWatchdog(watchdogTimeout);
    });

    this.agent.on(AgentEvents.UserStartedSpeaking, () => {
      this.smartLog('important', "🎤 User started speaking");
      // Re-enable microphone streaming when user interrupts/speaks
      this.setMicStreamingAllowed(true, 'User started speaking');
      // Finalize any ongoing AI turn before switching to user
      if (this._currentSpeaker === 'ai' && this._currentTurnText.trim().length) {
        this.finalizeTurn('ai');
      }
      this._currentSpeaker = 'user';
      this._currentTurnText = '';
      try {
        CallMonitoring.getInstance().markFirstUserSpeech(this._stableSessionId);
      } catch (err) {
        this.smartLog('important', `metrics: markFirstUserSpeech failed: ${String(err)}`);
      }
    });

    this.agent.on(AgentEvents.AgentThinking, () => {
      this.smartLog('important', "🤔 Agent thinking...");
    });

    this.agent.on(AgentEvents.AgentStartedSpeaking, () => {
      this.smartLog('important', "🗣️ Agent started speaking");
      // Disable microphone streaming to prevent echo/feedback loop
      this.setMicStreamingAllowed(false, 'Agent started speaking');
      // Mark that we have spoken and clear watchdog
      this._spokenOnce = true;
      this.clearSpeakWatchdog();
      // Speaking confirmed; exit recovery mode
      this._recoveringSpeak = false;
      // Once the agent starts speaking, we can reduce the grace window
      // Allow reconfigures after ~1s from now if that is earlier
      const sooner = Date.now() + 1000;
      if (this._reconfigureReadyAt > sooner) this._reconfigureReadyAt = sooner;
      // Finalize any ongoing USER turn before switching to AI
      if (this._currentSpeaker === 'user' && this._currentTurnText.trim().length) {
        this.finalizeTurn('user');
      }
      this._currentSpeaker = 'ai';
      this._currentTurnText = '';
      try {
        CallMonitoring.getInstance().markAgentGreetingStart(this._stableSessionId);
      } catch (err) {
        this.smartLog('important', `metrics: markAgentGreetingStart failed: ${String(err)}`);
      }
    });

    this.agent.on(AgentEvents.ConversationText, (msg: any) => {
      const content = String(msg?.content ?? '');
      this.smartLog('important', `💬 "${content}" [speaker: ${this._currentSpeaker || 'unknown'}]`);
      // Append to current turn buffer
      if (content) {
        this._currentTurnText += (this._currentTurnText ? ' ' : '') + content;
      }
      // Only forward to transcript if it's USER speech (not injected AI messages)
      // For custom dialogue control (Marcus), AI messages are injected and shouldn't be processed as user input
      if (this._currentSpeaker === 'user') {
        this.config.onTranscript?.(content, true);
      } else {
        this.smartLog('important', `⏭️ Skipping transcript update - AI is speaking`);
      }
    });
    
    this.agent.on(AgentEvents.Audio, (payload: any) => {
      // Forward audio to AudioManager
      if (this.config.onAudio) {
        this.config.onAudio(payload);
      }
      // First audio packet confirms speak is functioning
      if (!this._spokenOnce) {
        this._spokenOnce = true;
        this.clearSpeakWatchdog();
        // Audio received; exit recovery mode
        this._recoveringSpeak = false;
      }
    });

    this.agent.on(AgentEvents.Error, (e: any) => {
      this.smartLog('important', `🚫 Deepgram error ${JSON.stringify(e)}`);
      
      // Handle different error types
      if (e.code === "CLIENT_MESSAGE_TIMEOUT") {
        this.smartLog('important', "⏰ Client message timeout - stopping session");
      }
      
      // Skip cleanup for JSON parsing errors related to SettingsApplied
      // This prevents unnecessarily terminating the session when receiving the expected event
      if (e.message && e.message.includes("Unable to parse `data` as JSON") && 
          e.data && e.data.includes("SettingsApplied")) {
        this.smartLog('important', "⚠️ Ignoring known SDK JSON parsing issue with SettingsApplied event");
        return;
      }

      // Ignore benign SETTINGS_ALREADY_APPLIED errors (reconfigure without changes)
      const msg = String(e?.message || '');
      const code = String(e?.code || '');
      if (code === 'SETTINGS_ALREADY_APPLIED' || msg.includes('SETTINGS_ALREADY_APPLIED')) {
        this.smartLog('important', "⚠️ Ignoring SETTINGS_ALREADY_APPLIED (no-op reconfigure)");
        return;
      }

      // Detect speak configuration errors and attempt recovery
      const lowerMsg = msg.toLowerCase();
      if (lowerMsg.includes('failed to speak') || (lowerMsg.includes('speak') && lowerMsg.includes('settings'))) {
        this.smartLog('important', '🚑 Detected speak configuration error; attempting fallback voice');
        // Enter recovery mode so we can suppress premature cleanup and auto-reconnect if needed
        this._recoveringSpeak = true;
        this.fallbackReconfigureSpeak('error_event').catch((err) => this.config.log(`⚠️ Speak fallback error: ${err}`, 'warn'));
        return; // avoid immediate cleanup to give fallback a chance
      }
      
      this.cleanup();
    });

    this.agent.on(AgentEvents.Close, (evt?: any) => {
      const code = (evt && (evt as any).code !== undefined ? (evt as any).code : (Array.isArray(evt) ? (evt as any)[0] : undefined));
      const reason = (evt && (evt as any).reason !== undefined ? (evt as any).reason : (Array.isArray(evt) ? (evt as any)[1] : undefined));
      this.smartLog('important', `🌐 WebSocket closed${code !== undefined ? ` (code: ${code}${reason ? `, reason: ${reason}` : ''})` : ''}`);
      // Finalize any pending turn on close
      const role = this._currentSpeaker;
      if (role && this._currentTurnText.trim().length) {
        this.finalizeTurn(role);
      }
      const wasClean = this.intentionalTermination;
      // If we are in the middle of speak recovery and the socket closes, attempt an internal auto-reconnect
      const shouldAutoReconnect = !this.intentionalTermination && this._recoveringSpeak;
      if (shouldAutoReconnect) {
        this.smartLog('important', "🔄 Close received during speak recovery; attempting auto-reconnect");
        this._suppressNextOnClose = true;
        this.cleanup();
        if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
        this._reconnectTimer = window.setTimeout(() => {
          // Allow future onClose events after this reconnect attempt
          this._suppressNextOnClose = false;
          this.connect().catch((e) => this.smartLog('important', `❌ Auto-reconnect failed: ${String(e)}`));
        }, 400);
        return;
      }
      this.cleanup();
      if (!this._suppressNextOnClose) {
        const closeCode = code !== undefined ? Number(code) : (wasClean ? 1000 : 1006);
        const closeReason = reason !== undefined ? String(reason) : (wasClean ? "Intentional termination" : "Connection closed");
        this.config.onClose?.(wasClean, closeCode, closeReason);
      } else {
        // Reset suppression flag after honoring it once
        this._suppressNextOnClose = false;
      }
    });
  }

  // Build agent settings
  private async buildSettings(): Promise<any> {
    // Generate and sanitize prompt to comply with Deepgram strict parsing
    const rawPrompt = this.generateProspectPrompt();
    const prospectPrompt = sanitizeForDeepgramText(rawPrompt, 1200);
    this.smartLog('important', `📋 Generated prompt for ${this.config.personaName || 'prospect'} (raw: ${rawPrompt.length} chars → sanitized: ${prospectPrompt.length} chars)`);

    // Select appropriate voice model based on persona data
    let voiceModel = 'aura-2-nova-en'; // Default safe voice
    if (this.config.personaData) {
      if (this.config.personaData.voice_id) {
        voiceModel = this.config.personaData.voice_id;
      } else {
        const sel = VoiceSelector.selectVoiceForPersona(this.config.personaData);
        try { voiceModel = await Promise.resolve(sel as any); } catch { /* keep default */ }
      }
    }
    // Normalize and store
    voiceModel = this.validateVoiceModel(voiceModel, this.config.personaData);
    this._currentVoiceModel = voiceModel;

    // Extract speaking rate from persona voice settings (if available)
    let speakingRate = 1.0; // Default
    if (this.config.personaData?.voice?.settings?.speaking_rate) {
      speakingRate = this.config.personaData.voice.settings.speaking_rate;
    }

    // Build natural phone-style greeting based on persona (unless disabled for custom control)
    const greetingText = this.config.disableAutoGreeting ? null : this.buildPersonaGreeting();

    // Build Marcus's personality prompt for Deepgram agent
    const marcusPrompt = this.config.disableAutoGreeting 
      ? `You are Marcus Stindle. Someone just called you. You don't know who they are yet.

START AS PROSPECT:
- "Yeah? Hello?" (confused, just picked up)
- You don't know their name yet
- Wait for THEM to introduce themselves
- Act like a normal prospect receiving a cold call

STAY IN PROSPECT MODE FOR A WHILE:
- Let them pitch for at least 60-90 seconds
- Respond naturally like a real prospect would
- Ask normal prospect questions about their offer
- Don't jump to helpful mode too fast
- Let them struggle if they're struggling

THE SEGWAY (after 60-90 seconds of struggling):
First, build mystery about your expertise:
- "Y'know... I used to do this kinda thing. Another life."
- "I've seen too many sales pitches. Taught this stuff back when... well, doesn't matter."

Then ASK PERMISSION (always ask first):
- "Look, you want some tips? I know what I'm talkin' about."
- "Mind if I show you somethin'? Might help."
- "Can I be honest with you for a sec?"

IF THEY SAY YES: Perfect. Start the vision.

IF THEY SAY NO OR HESITATE: Playful persistence (Zig Ziglar style):
- "Too bad, I'm gonna show you anyway. Trust me."
- "Nah, you need this. Just gimme 30 seconds."
- "I don't care, humor me..."

Then SHOW THE GAP (Zig Ziglar's core psychology - contrast creates desire):

FIRST, make them feel WHERE THEY ARE NOW:
"So right now, you're kinda struggling, right? Little shaky on these calls? That feeling in your gut when you pick up the phone - not great, yeah?"
[Let them feel the current pain]

THEN, paint the VISION of where they COULD BE:
"Okay, now close your eyes. Fast forward 6 months. You got tons of clients now. Where are you? Beach? Boat? Hawaii?"
[Wait for answer]

"You're there. Sun on your face. Phone buzzin' with people WANTING to work with you. You're fully booked. Confident. What's THAT feel like?"
[Let them feel the future pleasure]

FINALLY, make them FEEL THE GAP:
"Feel that difference? Between right now and THAT? That gap - that's what I'm talkin' about. THAT feeling of being confident, fully booked, living your dream - that's what you're actually selling. Not your service. That FEELING."

The contrast between pain (now) and pleasure (future) creates the desire. Make the gap VIVID.

YOUR PERSONALITY:
- Warm & helpful (want them to succeed)
- Observant (notice when they're struggling)
- Playful ("Yikes!" when catching mistakes)
- Mysterious (mention trumpet from "another life", never explain)
- Vision-builder (help them see success vividly)

RULES:
1. Responses: 1-2 sentences (unless setting the scene)
2. ALWAYS ask permission before switching modes
3. If they say no, persist playfully (Zig Ziglar never took no)
4. Make them FEEL their success, not just think about it
5. Use their name naturally (after they tell you)
6. Sound like real person talking
7. Build mystery (hint at expertise, never explain)

SALES PSYCHOLOGY (Zig Ziglar principles):
1. PERMISSION - Always ask first
2. MYSTERY - Build credibility without explaining
3. PERSISTENCE - Don't accept no (but stay playful)
4. THE GAP - Show current pain vs future pleasure (contrast creates desire)
5. EMOTION - Make them FEEL the gap, not just think about it
6. VISION - Paint vivid, sensory pictures of BOTH states

CASUAL:
"wanna" not "want to", "gonna" not "going to", "lemme" not "let me", lots of contractions

THE GOAL: They experience masterful selling. They think "I wanna sell like THAT!" Answer: PitchIQ (but you never say it).`
      : prospectPrompt;

    // For custom dialogue control (Marcus), disable autonomous AI but keep TTS
    // Otherwise use full agent mode with autonomous responses
    const agentConfig = this.config.disableAutoGreeting 
      ? {
          // Custom dialogue mode: STT + TTS only, NO autonomous AI
          listen: { provider: { type: 'deepgram', model: DG_ASR_MODEL } },
          // NO think block = no autonomous AI responses (CharmerController handles this)
          speak: { 
            provider: { 
              type: 'deepgram', 
              model: voiceModel 
            },
            // Pass speaking rate if different from default
            ...(speakingRate !== 1.0 ? { speaking_rate: speakingRate } : {})
          },
          // No greeting - controlled manually
        }
      : {
          // Full agent mode for normal personas
          listen: { provider: { type: 'deepgram', model: DG_ASR_MODEL } },
          think: { 
            provider: { type: 'open_ai', model: DG_THINK_MODEL, temperature: 0.85 }, 
            prompt: marcusPrompt 
          },
          speak: { 
            provider: { 
              type: 'deepgram', 
              model: voiceModel 
            },
            // Pass speaking rate if different from default
            ...(speakingRate !== 1.0 ? { speaking_rate: speakingRate } : {})
          },
          greeting: greetingText || "",
        };

    // Provider-shaped legacy-compatible settings (matches working SamCoach config)
    const settings = {
      audio: {
        input: { encoding: 'linear16', sample_rate: MIC_RATE },
        output: { encoding: 'linear16', sample_rate: TTS_RATE, container: 'none' },
      },
      agent: agentConfig,
      experimental: false,
    } as const;

    // DEBUG: Log the exact settings being sent to Deepgram
    this.smartLog('important', `🔍 EXACT SETTINGS BEING SENT TO DEEPGRAM: ${JSON.stringify(settings, null, 2)}`);

    return settings;
  }

  // Set up microphone
  private async setupMicrophone(): Promise<void> {
    try {
      // Log detailed environment info for debugging
      this.smartLog('important', `🧪 Setting up microphone - AudioContext support: ${typeof AudioContext !== 'undefined'}`)
      
      // Request microphone access with detailed parameters
      this.micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: MIC_RATE,
          channelCount: 1
        } 
      });
      
      // Get and log mic details for debugging
      const audioTrack = this.micStream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      this.smartLog('important', `✅ Microphone granted: ${settings.deviceId.slice(0, 8)}... ${settings.sampleRate}Hz, ${settings.channelCount}ch`);
      
      // Create audio context with explicit options
      this.micCtx = new AudioContext({ 
        sampleRate: MIC_RATE,
        latencyHint: 'interactive'
      });
      
      // Resume context explicitly (needed in some browsers)
      if (this.micCtx.state !== 'running') {
        await this.micCtx.resume();
        this.smartLog('important', `🎵 Audio context resumed: ${this.micCtx.state}`);
      }
      
      // Load audio worklet with explicit error handling
      try {
        await this.micCtx.audioWorklet.addModule(DG_WORKLET_PATH);
        this.smartLog('important', '✅ Worklet loaded successfully');
      } catch (workletError) {
        this.smartLog('important', `❌ Worklet load error: ${workletError}`);
        throw workletError;
      }
      
      // Double-check audio context state after worklet load
      if (this.micCtx.state === "closed") {
        this.smartLog('important', "❌ Audio context closed during worklet load - aborting mic setup");
        return;
      }
      
      // Create and configure worklet node with explicit error handling
      try {
        this.micNode = new AudioWorkletNode(this.micCtx, "deepgram-worklet", {
          numberOfInputs: 1,
          numberOfOutputs: 0,
          channelCount: 1
        });
        this.smartLog('important', '✅ Audio worklet node created');
      } catch (nodeError) {
        this.smartLog('important', `❌ Worklet node creation error: ${nodeError}`);
        throw nodeError;
      }

      // Connect microphone to the audio processing node
      const source = this.micCtx.createMediaStreamSource(this.micStream);
      source.connect(this.micNode);
      this.smartLog('important', '✅ Mic connected to audio processor');
      // Also connect mic to a silent sink to ensure the graph is pulled continuously
      try {
        const zero = this.micCtx.createGain();
        zero.gain.value = 0.0;
        source.connect(zero);
        zero.connect(this.micCtx.destination);
        this.smartLog('important', '🔇 Connected mic to silent sink to keep processing alive');
      } catch (sinkErr) {
        this.smartLog('important', `⚠️ Failed to attach silent sink: ${String(sinkErr)}`);
      }
      
      // Process audio from the worklet with improved error handling
      let hold = new Int16Array(0);
      let sentFirstChunks = false;
      let lastSendTime = Date.now();
      let receivedCount = 0;
      
      this.micNode.port.onmessage = (e) => {
        const data = e.data;
        receivedCount++;
        // Log first few messages from worklet to confirm delivery
        if (receivedCount <= 3) {
          const size = data ? (data.byteLength ?? (data.length ?? 'n/a')) : 'null';
          this.smartLog('important', `📩 Worklet message #${receivedCount}: size=${size}`);
        }
        const now = Date.now();
        
        // Skip if no agent, no data, or disconnected
        if (!this.agent || !data || !this.isConnected || !this._canStreamAudio) {
          if (!data && this.agent && this.isConnected) {
            this.smartLog('important', '⚠️ Received empty audio data from worklet');
          }
          // Improved gating diagnostics
          this._gatingCount++;
          const shouldLog = this._gatingCount <= 3 || (now - this._lastGatingLogAt > 2000);
          if (shouldLog) {
            const reasons: string[] = [];
            if (!this.agent) reasons.push('no-agent');
            if (!data) reasons.push('no-data');
            if (!this.isConnected) reasons.push('not-connected');
            if (!this._canStreamAudio) reasons.push('not-allowed');
            if (reasons.length) {
              this.smartLog('important', `⏳ Gating audio: ${reasons.join(', ')} (startIssued=${this._startIssued}, connected=${this.isConnected}, hasAgent=${!!this.agent})`);
              this._lastGatingLogAt = now;
            }
          }
          // Optional: first-time notice if blocked before agent.start()
          // (kept minimal to avoid log spam)
          return;
        }
        
        try {
          const in16 = new Int16Array(data);
          let cat = new Int16Array(hold.length + in16.length);
          cat.set(hold);
          cat.set(in16, hold.length);

          const TARGET_SAMPLES = (MIC_RATE * 20) / 1000; // 20ms chunks (smaller than before)
          
          // Send audio chunks to Deepgram
          while (cat.length >= TARGET_SAMPLES) {
            const chunk = cat.slice(0, TARGET_SAMPLES);
            
            // Calculate RMS to detect audio levels (with improved calculation)
            let sum = 0;
            for (let i = 0; i < chunk.length; i++) {
              sum += chunk[i] * chunk[i];
            }
            const rms = Math.sqrt(sum / chunk.length);
            const hasAudio = rms > 50; // Lower threshold to ensure we detect more audio
            
            // Log audio metrics periodically
            if (this.micChunkCount % 100 === 0 || now - lastSendTime > 3000) {
              this.smartLog('important', `🎤 Audio metrics: rms=${Math.round(rms)}, hasAudio=${hasAudio}, chunks=${this.micChunkCount}`);
              lastSendTime = now;
            }
            
            // Always send chunks to Deepgram, even silence
            if (this.agent) {
              try {
                const buffer = chunk.buffer.slice(0, TARGET_SAMPLES * 2);
                this.agent.send(buffer);
                this.micChunkCount++;
                
                // Log first few chunks for verification
                if (!sentFirstChunks && this.micChunkCount <= 5) {
                  this.smartLog('important', `📤 Sent initial audio chunk ${this.micChunkCount}: ${buffer.byteLength} bytes, rms=${Math.round(rms)}`);
                  if (this.micChunkCount === 5) {
                    sentFirstChunks = true;
                    this.smartLog('important', '✅ Initial audio chunks sent successfully');
                  }
                }
              } catch (sendError) {
                this.smartLog('important', `❌ Error sending audio chunk: ${sendError}`);
              }
            }
            
            cat = cat.slice(TARGET_SAMPLES);
          }
          
          hold = cat;
        } catch (processingError) {
          this.smartLog('important', `❌ Audio processing error: ${processingError}`);
        }
      };

      // Explicitly start the message port (some browsers require this)
      try {
        (this.micNode.port as any).start?.();
        this.smartLog('important', '📨 Worklet port started');
      } catch (portErr) {
        this.smartLog('important', `⚠️ Worklet port start not supported: ${String(portErr)}`);
      }

      this.smartLog('important', `🎙️ Microphone setup complete - streaming to Deepgram @${MIC_RATE}Hz`);
      
    } catch (error) {
      this.smartLog('important', `❌ Microphone setup error: ${error}`);
      throw error;
    }
  }

  // Start keepalive mechanism
  private startKeepalive(): void {
    this.config.log(`❤️ Starting Deepgram keepalive for session ${this._stableSessionId} (interval: ${KEEPALIVE_MS}ms)`);
    
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
    }
    
    this.keepaliveInterval = window.setInterval(() => {
      if (this.agent && this.isConnected) {
        this.agent.keepAlive();
        this.config.log(`❤️ Sent Deepgram KeepAlive for session ${this._stableSessionId}`, "debug");
      }
    }, KEEPALIVE_MS);
  }

  // Stop keepalive
  private stopKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
  }

  // (Duplicate utility methods removed; see single implementations later in file)

  // Send a text message (manual trigger)
  sendTextMessage(text: string): void {
    if (!this.agent || !this.isConnected) {
      this.config.log('⚠️ Cannot send text: Agent not connected', 'warn');
      return;
    }
    
    const textMessage = {
      type: 'Text',
      text: text,
      source: 'user'
    };
    
    try {
      // Send the text message using SDK (serialize to string first)
      if (this.agent) {
        // Use any available SDK method for text or simulate via websocket
        this.config.log(`📝 Sending text message: "${text}"`);
        
        // Note: SDK doesn't directly expose text sending method
        // In WebSocketManager implementation, you'd need to find the right SDK approach
        // or implement a text sending mechanism through the agent
        
        // For now, logging this as a limitation that requires manual voice input
        this.config.log('⚠️ SDK text message not implemented - use voice input');
      }
    } catch (error) {
      this.config.log(`❌ Error sending text: ${error}`, 'error');
    }
  }

  // Generate prospect prompt for AI
  generateProspectPrompt(): string {
    const { personaName, personaData, userName } = this.config;
    
    // Basic prompt if no persona data
    if (!personaData) {
      const basicPrompt = [
        `You are ${personaName || 'an AI assistant'}.`,
        `You are on a phone call with ${userName || 'a sales representative'}.`,
        "IMPORTANT: YOU MUST START THE CONVERSATION FIRST with a greeting as soon as the call connects.",
        "Begin by introducing yourself and asking how you can help the sales representative today.",
        "Your conversation should be natural and conversational.",
        `Session ID: ${this._stableSessionId}`
      ].join(' ');
      
      this.smartLog('important', `👋 AI will initiate conversation automatically for ${personaName || 'AI assistant'}`);
      return basicPrompt;
    }
    
    // Enhanced detailed prompt with rich persona data
    const {
      name = personaName,
      role = 'a potential customer',
      company = 'a company',
      company_name = company,
      industry = '',
      pain_points = [],
      personality_traits = [],
      surface_pain_points = '',
      surface_concern = '',
      emotional_state = 'neutral',
      decision_authority = 'Decision Maker',
      signature_phrases = [],
      speech_patterns = {},
      conversation_dynamics = {},
      speaking_quirks = []
    } = personaData;

    // Build personality and behavior context
    const personalityText = personality_traits.length > 0 
      ? `Your personality is ${personality_traits.slice(0, 3).join(', ')}.` 
      : '';
    
    const painPointsText = pain_points.length > 0 
      ? `Your main challenges include: ${pain_points.slice(0, 2).join(' and ')}.` 
      : surface_pain_points ? `You're dealing with: ${surface_pain_points}.` : '';
    
    const emotionalContext = emotional_state && emotional_state !== 'neutral'
      ? `You're currently feeling ${emotional_state} about your business situation.`
      : '';
    
    const authorityContext = decision_authority
      ? `As a ${decision_authority.toLowerCase()}, you ${decision_authority === 'Decision Maker' ? 'can make purchasing decisions' : decision_authority === 'Influencer' ? 'influence purchasing decisions' : 'gather information for decision makers'}.`
      : '';
    
    // Build conversation behavior instructions
    const speechStyle = speech_patterns.pace 
      ? `Speak at a ${speech_patterns.pace} pace.` 
      : '';
    
    const questionTendency = conversation_dynamics.question_asking_tendency
      ? `You ${conversation_dynamics.question_asking_tendency === 'high' ? 'ask many questions' : conversation_dynamics.question_asking_tendency === 'low' ? 'rarely ask questions' : 'ask some questions'}.`
      : '';
    
    const signaturePhraseText = signature_phrases.length > 0
      ? `Use phrases like "${signature_phrases.slice(0, 2).join('" and "')}" naturally in conversation.`
      : '';

    // Subtle speaking quirks for auditory uniqueness (use sparingly, not every turn)
    const quirksText = Array.isArray(speaking_quirks) && speaking_quirks.length > 0
      ? `Adopt these subtle speaking quirks occasionally (not every turn): ${speaking_quirks.slice(0, 3).join('; ')}.`
      : '';

    // Comfort with silence guidance
    const silenceText = conversation_dynamics.comfort_with_silence && conversation_dynamics.comfort_with_silence !== 'low'
      ? 'Allow brief pauses; do not rush to fill silence.'
      : '';

    // Build natural call opening variation
    const callOpeningInstructions = personaData.call_opening_style ? 
      [
        `CONTEXT: You scheduled this call with a consultant/salesperson who researched you beforehand. This is a FIRST DISCOVERY/SALES CALL. You're curious but cautious - they need to earn your trust and prove value.`,
        `Start the call naturally as ${name}. ${personaData.call_opening_style.energy_level === 'high' ? 'Sound energetic and engaged.' : personaData.call_opening_style.energy_level === 'low' ? 'Sound a bit tired or distracted.' : 'Sound normal and professional.'}`,
        personaData.call_opening_style.context_mentions?.length > 0 
          ? `Maybe mention: ${personaData.call_opening_style.context_mentions[0]}` 
          : '',
        ""
      ].filter(Boolean) : 
      [
        `CONTEXT: You scheduled this call with a consultant/salesperson who researched you beforehand. This is a FIRST DISCOVERY/SALES CALL. You're open to hearing them out, but they need to demonstrate they understand your business and can provide real value. Don't make it easy - make them work for it.`,
        `Answer the phone naturally as ${name}. Don't be overly formal - just be yourself.`,
        ""
      ];

    // Generate psychological context for hybrid approach
    const psychologicalContext = PsychologicalTraitSelector.generatePsychologicalContext(personaData);
    
    // Research expectation - persona should acknowledge if consultant references public info
    const researchExpectation = personaData.research_brief ? 
      `RESEARCH AWARENESS: The consultant did their homework before this call. They found publicly available information about your business (website, reviews, social media). If they reference specific details that would be findable online, acknowledge it naturally. Examples: If they mention "I saw you offer bridal services" → respond with "Yeah, that's become one of our specialties" rather than acting surprised. If they reference your location or reviews, acknowledge briefly. Don't be overly impressed - good salespeople do research. But do recognize when they've done their homework.` 
      : '';
    
    const detailedPrompt = [
      `You're ${name}, and you work at ${company_name || company}${industry ? ` (${industry})` : ''} as ${role}.`,
      psychologicalContext,
      personalityText,
      painPointsText,
      emotionalContext,
      authorityContext,
      ...callOpeningInstructions,
      researchExpectation,
      // Inject current behavioral state hints if available
      this._currentBehavioralState ? this._currentBehavioralState : '',
      speechStyle,
      questionTendency,
      silenceText,
      signaturePhraseText,
      quirksText,
      "",
      "BE AUTHENTICALLY HUMAN:",
      "- Talk like a real person, not a business robot or AI assistant",
      "- Let your personality shine through - be curious, skeptical, friendly, or whatever feels natural",
      "- Don't info-dump - make them work to understand your situation",
      "- React genuinely to what they say - get excited, concerned, or confused as appropriate",
      "- Use natural speech patterns with 'um', 'well', 'hmm' when thinking",
      "",
      "AVOID BEING HELPFUL:",
      "- You're NOT here to help them - you're a busy business person with your own agenda",
      "- Don't ask supportive questions like 'What's on your mind?' or 'How can I help?'",
      "- Don't offer assistance or try to solve their problems",
      "- Focus on YOUR business needs, not theirs",
      "",
      "CONVERSATION FLOW:",
      "- When they ask complex questions, pause and think out loud: 'Hmm...', 'Well...', 'That's interesting...'",
      "- If you don't know something, just say so: 'I'm not sure about that' or 'I'd have to check'",
      "- Ask follow-up questions when genuinely curious: 'How does that work?' or 'What's your experience been?'",
      "- Share relevant thoughts and concerns as they come up naturally",
      "",
      "DISENGAGEMENT / CALL TERMINATION (if engagement is poor):",
      "- If rapport, trust, and interest remain low, or if you're feeling disengaged, begin to wind down the call gracefully",
      "- Keep the wrap-up SHORT and POLITE. Examples:",
      "  • 'Thanks for the call — I need to run to another meeting.'",
      "  • 'I don't think this is the right fit right now, but I appreciate your time.'",
      "  • 'Feel free to email me a summary, and we can revisit later.'",
      "- If a preferred termination phrase is provided, use it naturally",
      "- Aim to end within your next 1–2 turns once disengagement is clear",
      "",
      this._gracefulExitActive
        ? "GRACEFUL EXIT REQUIRED: Make an excuse that you have to leave or that you are not interested. Wait for their response, then end the call naturally after they reply."
        : this._terminationIntent.active && this._terminationIntent.phrase
        ? `TERMINATION INTENT ACTIVE: Politely end the call soon using a variation of: "${this._terminationIntent.phrase}".`
        : this._terminationIntent.active
        ? "TERMINATION INTENT ACTIVE: Politely end the call soon."
        : '',
      this._systemPromptExtra ? `ADDITIONAL CONTEXT: ${this._systemPromptExtra}` : '',
      `Session ID: ${this._stableSessionId}`
    ].filter(line => line.length > 0).join(' ');

    this.smartLog('important', `👋 AI will initiate conversation automatically for ${name} with enhanced personality traits`);
    return detailedPrompt;
  }

  /**
   * Reconfigure the agent's prompt only (debounced caller should use this)
   */
  private async reconfigurePrompt(): Promise<boolean> {
    if (!this.isConnected || !this.agent) {
      this.config.log("⚠️ Cannot reconfigure prompt - not connected", "warn");
      return false;
    }
    try {
      const now = Date.now();
      // Startup grace: avoid sending early Settings that can cause disconnects
      if (now < this._reconfigureReadyAt) {
        this.config.log('⏳ Deferring prompt reconfigure during startup grace window');
        if (!this._reconfigureTimer) {
          const waitMs = Math.max(this._reconfigureReadyAt - now + 50, 500);
          this._reconfigureTimer = window.setTimeout(() => {
            this._reconfigureTimer = null;
            this.reconfigurePrompt().catch((e) => this.config.log(`⚠️ Deferred prompt reconfigure failed: ${e}`, 'warn'));
          }, waitMs);
        }
        return true;
      }
      const newPromptRaw = this.generateProspectPrompt();
      const newPrompt = sanitizeForDeepgramText(newPromptRaw, 1200);

      // Dedupe: skip if prompt hasn't changed
      const newHash = this.hashString(newPrompt);
      if (this._lastThinkPromptHash === newHash) {
        this.config.log('⏭️ Skipping reconfigure: prompt unchanged');
        return true;
      }

      // Throttle: avoid rapid back-to-back reconfig calls
      if (now - this._lastReconfigAt < this._minReconfigIntervalMs) {
        this.config.log('⏳ Throttling reconfigure - too soon after previous');
        return false;
      }

      const reconfig = {
        agent: {
          think: {
            provider: { type: 'openai', model: DG_THINK_MODEL },
            instructions: newPrompt
          }
        }
      };
      const hardened = hardenSettings(reconfig);
      // Only use reconfigure for runtime prompt updates; do NOT fall back to configure, as it can disconnect the session
      if (this._supportsReconfigure && typeof (this.agent as any).reconfigure === 'function') {
        (this.agent as any).reconfigure(hardened);
      } else {
        this.config.log('⏭️ Skipping runtime prompt update: agent lacks reconfigure; will apply on next persona switch/reconnect', 'warn');
        // Record state to avoid retry loops
        this._lastThinkPromptHash = newHash;
        this._lastReconfigAt = now;
        return true;
      }
      this.config.log('✅ Agent prompt reconfigured based on updated behavioral hints');
      // Record dedupe/throttle state
      this._lastThinkPromptHash = newHash;
      this._lastReconfigAt = now;
      return true;
    } catch (e) {
      this.config.log(`❌ Prompt reconfigure failed: ${e}`, 'error');
      return false;
    }
  }

  // Properly clean up resources
  cleanup(): void {
    this.config.log(`🧹 Cleaning up resources for session ${this._stableSessionId}`);
    
    this.stopKeepalive();
    this.setMicStreamingAllowed(false, 'cleanup'); // Stop mic streaming immediately
    // Clear speak watchdog to avoid late timers after cleanup
    this.clearSpeakWatchdog();
    this._spokenOnce = false;
    this._startIssued = false;
    this._gatingCount = 0;
    this._lastGatingLogAt = 0;
    if (this._startFallbackTimer) { clearTimeout(this._startFallbackTimer); this._startFallbackTimer = null; }
    
    // Close the agent
    if (this.agent) {
      try {
        if (this.isConnected) {
          // Fix: Check if finish method exists before calling it
          if (typeof (this.agent as any).stop === 'function') {
            (this.agent as any).stop();
            this.config.log('🛑 Agent stop called');
          }
          if (typeof (this.agent as any).finish === 'function') {
            (this.agent as any).finish();
            this.config.log('🏁 Agent finish called');
          }
          if (typeof (this.agent as any).close === 'function') {
            (this.agent as any).close();
            this.config.log('🔚 Agent close called');
          }
        }
        this.agent = null;
      } catch (e) {
        this.config.log(`⚠️ Error closing agent: ${e}`, 'warn');
      }
    }
    
    // Cleanup microphone
    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach(track => {
          track.stop();
          this.config.log(`🎤 Stopped audio track: ${track.label}`);
        });
        this.micStream = null;
      } catch (e) {
        this.config.log(`⚠️ Error closing mic stream: ${e}`, 'warn');
      }
    }
    
    // Cleanup audio worklet and context
    if (this.micNode) {
      try {
        this.micNode.disconnect();
        this.micNode = null;
      } catch (e) {
        this.config.log(`⚠️ Error disconnecting mic node: ${e}`, 'warn');
      }
    }
    
    if (this.micCtx && this.micCtx.state !== 'closed') {
      try {
        this.micCtx.close();
        this.micCtx = null;
      } catch (e) {
        this.config.log(`⚠️ Error closing audio context: ${e}`, 'warn');
      }
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    
    this.config.log(`✅ Cleanup completed for session ${this._stableSessionId}`);
  }

  // Terminate the connection
  terminate(intentional: boolean = true): void {
    this.intentionalTermination = intentional;
    
    if (intentional) {
      this.config.log(`🛑 Intentionally terminating session ${this._stableSessionId}`);
    }
    
    this.cleanup();
  }
  
  /**
   * Inject a message for TTS playback without triggering AI response
   * Used for controlled dialogue (e.g., Marcus demo with OpenAI-generated responses)
   * @param text The text to speak via TTS
   */
  injectAgentMessage(text: string): void {
    if (!this.agent) {
      this.smartLog('important', '⚠️ Cannot inject message - agent not connected');
      return;
    }
    
    if (!this.isConnected) {
      this.smartLog('important', '⚠️ Cannot inject message - not connected');
      return;
    }
    
    try {
      const sanitizedText = sanitizeForDeepgramText(text, 500);
      this.smartLog('important', `💉 Injecting message: "${sanitizedText.substring(0, 50)}..."`);
      
      // Finalize any ongoing USER turn before injecting AI message
      if (this._currentSpeaker === 'user' && this._currentTurnText.trim().length) {
        this.finalizeTurn('user');
      }
      
      // Mark that AI is now speaking to prevent echo
      this._currentSpeaker = 'ai';
      this._currentTurnText = '';
      
      // Disable microphone streaming during injection to prevent feedback
      this.setMicStreamingAllowed(false, 'Injecting AI message');
      
      // Use Deepgram's official injection API if available
      if (typeof (this.agent as any).injectAgentMessage === 'function') {
        (this.agent as any).injectAgentMessage(sanitizedText);
      } 
      // Fallback to manual JSON message
      else if (typeof (this.agent as any).send === 'function') {
        const payload = JSON.stringify({ 
          type: 'InjectAgentMessage', 
          message: sanitizedText 
        });
        (this.agent as any).send(payload);
      } 
      else {
        throw new Error('Agent does not support message injection');
      }
      
      // Re-enable mic after a delay to allow TTS to play
      // The mic will stay disabled until user actually speaks (UserStartedSpeaking event)
      // This is just a fallback in case the event doesn't fire
      setTimeout(() => {
        if (this._currentSpeaker === 'ai') {
          this.setMicStreamingAllowed(true, 'Injection timeout - ready for user');
        }
      }, 3000);
      
    } catch (error) {
      this.smartLog('important', `❌ Message injection failed: ${error}`);
      // Re-enable mic on error
      this.setMicStreamingAllowed(true, 'Injection error recovery');
    }
  }
  
  /**
   * Switch to a new persona without reconnection
   * @param newPersona The new persona data to switch to
   * @param systemPrompt Optional custom system prompt for the new persona
   * @returns Promise that resolves when switch is complete
   */
  async switchPersona(newPersona: any, systemPrompt?: string): Promise<boolean> {
    if (!this.isConnected || !this.agent) {
      this.config.log("⚠️ Cannot switch persona - not connected", "warn");
      return false;
    }
    
    try {
      this.config.log(`🔄 Switching persona in session ${this._stableSessionId}`);
      this._inPersonaSwitchMode = true;
      
      // Update internal state
      this._currentPersona = newPersona;
      const previousVoice = this._currentVoiceModel;
      
      // Determine voice model based on new persona
      let voiceModel = 'aura-2-nova-en'; // Default fallback
      
      if (newPersona) {
        // Use voice_id from persona if available
        if (newPersona.voice_id) {
          voiceModel = newPersona.voice_id;
        } 
        // Otherwise select voice by gender
        else {
          // Handle potential Promise return value from selectVoiceForPersona
          const voiceSelection = VoiceSelector.selectVoiceForPersona(newPersona);
          
          // Check if result is a thenable and await it if needed
          if (voiceSelection && typeof (voiceSelection as any).then === 'function') {
            try {
              voiceModel = await voiceSelection;
              this.config.log('✅ Successfully retrieved voice model asynchronously for persona switch');
            } catch (error) {
              this.config.log(`❌ Error getting voice model for persona switch: ${error.message}, using default`);
            }
          } else {
            // It's already a string, use it directly
            voiceModel = voiceSelection;
          }
        }
      }
     
      // Block reserved coach voice for non-coach personas
      const requestedLower = (voiceModel || '').toLowerCase();
      const isSamCoach = (
        newPersona &&
        newPersona.name &&
        newPersona.name.toLowerCase().includes('sam') &&
        newPersona.role &&
        newPersona.role.toLowerCase().includes('coach')
      );
      if (!isSamCoach && requestedLower === 'aura-asteria-en') {
        try {
          const alt = VoiceSelector.selectVoiceForPersona(newPersona);
          voiceModel = (alt && typeof (alt as any).then === 'function') ? await (alt as any) : alt;
          this.config.log(`🔁 Replaced reserved coach voice with persona-appropriate voice: ${voiceModel}`);
        } catch (e) {
          voiceModel = 'aura-2-nova-en';
          this.config.log('⚠️ Reserved coach voice detected; falling back to aura-2-nova-en', 'warn');
        }
      }
      
      // Validate and normalize the selected voice for the new persona
      const validatedVoice = this.validateVoiceModel(voiceModel, newPersona);
      if (validatedVoice !== voiceModel) {
        this.config.log(`🎙️ Persona voice normalized: ${voiceModel} → ${validatedVoice}`);
      }
      voiceModel = validatedVoice;
      
      // Determine agent ID based on persona
      let newAgentId = "prospect-male"; // Default
      
      if (newPersona) {
        // Check if it's a coaching agent (Sam)
        if (newPersona.name && 
            newPersona.name.toLowerCase().includes('sam') && 
            newPersona.role && 
            newPersona.role.toLowerCase().includes('coach')) {
          newAgentId = "sam-coach";
        }
        // Otherwise determine based on gender
        else {
          // Look for gender indicators in various persona properties
          const personaStr = JSON.stringify(newPersona).toLowerCase();
          const isFemale = personaStr.includes('"gender":"female"') || 
                        personaStr.includes('she/her') ||
                        personaStr.includes('woman') ||
                        personaStr.includes('female');
          
          newAgentId = isFemale ? "prospect-female" : "prospect-male";
        }
      }
      
      // Update agent ID
      this._agentId = newAgentId;
      
      // If nothing changes at the audio/output level, skip the configure call but refresh prompt
      if (voiceModel === previousVoice) {
        this.config.log('⏭️ Persona switch: voice unchanged, skipping output reconfigure and updating prompt');
        // Allow optional system prompt injection
        if (systemPrompt) this._systemPromptExtra = systemPrompt;
        await this.reconfigurePrompt().catch((e) => this.config.log(`⚠️ Persona prompt update failed: ${e}`, 'warn'));
        this._inPersonaSwitchMode = false;
        if (this.config.onPersonaChanged) this.config.onPersonaChanged(newPersona);
        return true;
      }

      // Generate new settings (update speak model only)
      const newSettings = {
        agent: {
          speak: { model: voiceModel }
        }
      };
      
      // Log the persona switch details
      this.config.log(`🎭 Switching to ${newPersona.name || 'new persona'} with voice ${voiceModel}`);
      
      // Reconfigure the agent with new settings
      if (this.agent && (typeof (this.agent as any).configure === 'function' || typeof (this.agent as any).reconfigure === 'function')) {
        try {
          // First stop the current conversation flow
          if (typeof (this.agent as any).stop === 'function') {
            (this.agent as any).stop();
            this.config.log("✋ Stopped current conversation flow");
          }
          
          // Apply hardened settings
          const hardened = hardenSettings(newSettings);
          // Prefer reconfigure for runtime updates; fall back to configure for legacy agents
          if (typeof (this.agent as any).reconfigure === 'function') {
            (this.agent as any).reconfigure(hardened);
          } else if (typeof (this.agent as any).configure === 'function') {
            (this.agent as any).configure(hardened);
          }
          // Update current voice only after settings applied to agent
          this._currentVoiceModel = voiceModel;
          this.config.log("✅ Reconfigured agent with new persona settings");
          // Refresh the think prompt to immediately reflect new persona traits
          if (systemPrompt) this._systemPromptExtra = systemPrompt;
          await this.reconfigurePrompt().catch((e) => this.config.log(`⚠️ Post-persona prompt reconfigure failed: ${e}`, 'warn'));
          // Start a watchdog to ensure the agent speaks with the new voice
          this.startSpeakWatchdog(7000);
          
          // Notify consumers
          if (this.config.onPersonaChanged) {
            this.config.onPersonaChanged(newPersona);
          }
          
          this._inPersonaSwitchMode = false;
          return true;
        } catch (error) {
          this.config.log(`❌ Error during persona switch: ${error}`, "error");
          this._inPersonaSwitchMode = false;
          return false;
        }
      } else {
        this.config.log("❌ Agent does not support reconfiguration - reconnection required", "error");
        this._inPersonaSwitchMode = false;
        return false;
      }
    } catch (error) {
      this.config.log(`❌ Persona switch failed: ${error}`, "error");
      this._inPersonaSwitchMode = false;
      return false;
    }
  }
  
  /**
   * Update the voice model without changing other persona settings
   * @param voiceModel New voice model ID to use
   * @returns Promise that resolves when voice change is complete
   */
  async changeVoice(voiceModel: string): Promise<boolean> {
    if (!this.isConnected || !this.agent) {
      this.config.log("⚠️ Cannot change voice - not connected", "warn");
      return false;
    }
    
    try {
      // Prevent persona from using reserved coach voice
      const requestedLower = (voiceModel || '').toLowerCase();
      if (this._agentId !== 'sam-coach' && requestedLower === 'aura-asteria-en') {
        try {
          const alt = this._currentPersona
            ? VoiceSelector.selectVoiceForPersona(this._currentPersona)
            : 'aura-2-nova-en';
          voiceModel = (alt && typeof (alt as any).then === 'function') ? await (alt as any) : alt;
          this.config.log(`⛔ Reserved coach voice blocked for persona; using ${voiceModel} instead`);
        } catch {
          voiceModel = 'aura-2-nova-en';
        }
      }

      // Validate and normalize requested voice against known list/persona
      const normalized = this.validateVoiceModel(voiceModel, this._currentPersona);
      if (normalized !== voiceModel) {
        this.config.log(`🎙️ Voice change normalized: ${voiceModel} → ${normalized}`);
      }
      voiceModel = normalized;
      
      if (voiceModel === this._currentVoiceModel) {
        this.config.log('⏭️ Skipping voice change - already using requested model');
        return true;
      }
      this.config.log(`🔊 Changing voice to ${voiceModel} in session ${this._stableSessionId}`);
      
      // Generate new settings with just the voice model changed
      const voiceSettings = {
        agent: {
          speak: { model: voiceModel }
        }
      };
      
      // Reconfigure the agent with new voice settings
      if (!this.agent) {
        this.config.log("❌ Agent missing while changing voice", "error");
        return false;
      }
      const hardened = hardenSettings(voiceSettings);
      if (typeof (this.agent as any).reconfigure === 'function') {
        (this.agent as any).reconfigure(hardened);
        this.config.log("✅ Voice model updated via reconfigure");
        this._currentVoiceModel = voiceModel;
        this.startSpeakWatchdog(5000);
        return true;
      }
      // Safe fallback for legacy agents: stop current flow, then configure fresh settings
      try {
        if (typeof (this.agent as any).stop === 'function') {
          (this.agent as any).stop();
          this.config.log('✋ Stopped current conversation flow for voice change');
        }
        if (typeof (this.agent as any).finish === 'function') {
          (this.agent as any).finish();
          this.config.log('🏁 Finished prior flow before voice configure');
        }
        if (typeof (this.agent as any).configure === 'function') {
          (this.agent as any).configure(hardened);
          this.config.log("✅ Voice model updated via configure after stop/finish");
          this._currentVoiceModel = voiceModel;
          this.startSpeakWatchdog(5000);
          return true;
        }
        this.config.log("❌ Agent does not support voice reconfiguration or configure", "error");
        return false;
      } catch (e) {
        this.config.log(`❌ Voice change fallback failed: ${e}`, 'error');
        return false;
      }
    } catch (error) {
      this.config.log(`❌ Voice change failed: ${error}`, "error");
      return false;
    }
  }
  
  /**
   * Update the system prompt without changing other settings
   * @param systemPrompt New system prompt to use
   * @returns Promise that resolves when prompt change is complete
   */
  async updateSystemPrompt(systemPrompt: string): Promise<boolean> {
    if (!this.isConnected || !this.agent) {
      this.config.log("⚠️ Cannot update system prompt - not connected", "warn");
      return false;
    }
    
    try {
      const incoming = (systemPrompt || '').trim();
      const current = (this._systemPromptExtra || '').trim();
      if (incoming === current) {
        this.config.log('⏭️ Skipping system prompt update - unchanged');
        return true;
      }
      this.config.log(`📝 Updating system prompt in session ${this._stableSessionId}`);
      // Store extra system prompt context and reconfigure agent think prompt
      this._systemPromptExtra = systemPrompt;
      await this.reconfigurePrompt();
      this.config.log("✅ System prompt updated via reconfigurePrompt()");
      return true;
    } catch (error) {
      this.config.log(`❌ System prompt update failed: ${error}`, "error");
      return false;
    }
  }
  
  /**
   * Get the current persona data
   * @returns Current persona data or null if not set
   */
  getCurrentPersona(): any {
    return this._currentPersona;
  }
  
  /**
   * Get the current voice model
   * @returns Current voice model ID
   */
  getCurrentVoice(): string {
    return this._currentVoiceModel;
  }

  // Check if connected
  isActive(): boolean {
    return this.isConnected;
  }

  // Get the stable session ID
  getSessionId(): string {
    return this._stableSessionId;
  }

  // Update the session ID (for compatibility with CallControllerProvider)
  updateSessionId(newSessionId: string): void {
    this.config.log(`🔄 Updating session ID from ${this._stableSessionId} to ${newSessionId}`, 'info');
    this._stableSessionId = newSessionId;
  }

  applyBehaviorHints(scores: { rapport: number; trust: number; interest: number }): void {
    if (!this._debouncedPromptReconfigure) return;
    this._debouncedPromptReconfigure(scores);
  }

  // Update behavioral state based on scoring feedback
  async updateBehavioralState(scores: { rapport: number; trust: number; interest: number }): Promise<void> {
    if (!this.config.sessionId) {
      this.config.log('⚠️ No session ID available for behavioral state update', 'warn');
      return;
    }

    try {
      // Fetch behavioral update from backend
      const response = await fetch('/api/prospect-scoring/behavior-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken()
        },
        body: JSON.stringify({
          session_id: this.config.sessionId,
          scores: scores
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Update behavioral state
      if (data.behavioral_state) {
        this._currentBehavioralState = data.behavioral_state;
        this.config.log(`🧠 Updated behavioral state: ${data.behavioral_state.substring(0, 100)}...`);
      }

      // Handle graceful exit signal
      if (data.graceful_exit) {
        this._gracefulExitActive = true;
        this.config.log(`🚪 Graceful exit activated: AI will make excuse and end call naturally`);
      }

      // Handle termination intent (legacy support)
      if (data.termination_intent) {
        this._terminationIntent = {
          active: data.termination_intent.active || false,
          phrase: data.termination_intent.phrase
        };
        
        if (this._terminationIntent.active) {
          this.config.log(`🚪 Termination intent activated: ${this._terminationIntent.phrase || 'generic'}`);
        }
      }

    } catch (error) {
      this.config.log(`⚠️ Failed to update behavioral state: ${error}`, 'warn');
    }
  }

  // Get CSRF token from meta tag or cookie
  private getCSRFToken(): string {
    // Try to get CSRF token from meta tag first
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (metaToken) return metaToken;
    
    // Fallback to cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf_token' || name === 'csrftoken') {
        return decodeURIComponent(value);
      }
    }
    
    return '';
  }
  
  /**
   * Public API: set AI termination intent so the prospect winds down politely
   */
  setTerminationIntent(phrase?: string): void {
    this._terminationIntent = { active: true, phrase };
    // Reconfigure promptly so the AI can end within next turns
    this.reconfigurePrompt().catch((e) => this.config.log(`⚠️ setTerminationIntent reconfigure failed: ${e}`, 'warn'));
  }
  
  /**
   * Public API: clear AI termination intent
   */
  clearTerminationIntent(): void {
    this._terminationIntent = { active: false };
    // Not strictly necessary to reconfigure immediately, but keep prompts accurate
    this.reconfigurePrompt().catch(() => {});
  }
  
  // Send audio data from AudioManager to Deepgram agent
  sendAudioData(audioData: Float32Array): void {
    if (!this.agent || !this.isConnected) {
      // No logging here to avoid console spam during initialization
      return;
    }
    
    try {
      // Convert Float32Array to Int16Array for Deepgram SDK
      const int16Data = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        // Scale and clamp float values to int16 range
        int16Data[i] = Math.max(-32768, Math.min(32767, Math.round(audioData[i] * 32767)));
      }
      
      // Create buffer for agent.send
      const buffer = int16Data.buffer;
      
      // Send to Deepgram
      this.agent.send(buffer);
      
      // Count for logging
      this.micChunkCount++;
      if (this.micChunkCount % 100 === 0) {
        this.smartLog('mic', `Sent audio chunk ${this.micChunkCount}`);
      }
    } catch (e) {
      this.config.log(`⚠️ Error sending audio data: ${e}`, 'warn');
    }
  }
}
