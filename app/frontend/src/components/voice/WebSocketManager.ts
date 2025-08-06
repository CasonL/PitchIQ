/**
 * WebSocketManager.ts - Deepgram WebSocket manager using SDK approach
 * Based on successful DeepgramVoiceAgent SDK implementation pattern
 */

import { createClient, AgentEvents } from "@deepgram/sdk";
import { Buffer } from "buffer";
import { AudioManager } from "./AudioManager";
import { VoiceSelector } from "./VoiceSelector";

// Poly-fill for Buffer (DG browser SDK expects Node.Buffer in the global scope)
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

// Constants
const MIC_RATE = 48_000; // True browser native rate
const TTS_RATE = 48_000; // Keep aligned - fix sample rate mismatch
const KEEPALIVE_MS = 5_000; // Send keepalive every 5 seconds

export interface WebSocketConfig {
  token: string;
  log: (message: string, level?: string) => void;
  onOpen?: () => void;
  onClose?: (wasClean: boolean, code: number, reason: string) => void;
  onError?: (error: any) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAudio?: (audioData: ArrayBuffer) => void;
  sessionId?: string;
  personaName?: string;
  personaData?: any;
  userName?: string;
  onPersonaChanged?: (newPersona: any) => void;
}

interface DeepgramAgent {
  configure: (settings: any) => void;
  start: () => void;
  send: (data: ArrayBuffer) => void;
  keepAlive: () => void;
  finish: () => void;
  close: () => void;
  on: (event: string, callback: (data?: any) => void) => void;
  stop: () => void;
  reconfigure: (settings: any) => void; // Important for dynamic persona switching
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
  
  // Statistics for logging
  private audioPacketCount: number = 0;
  private micChunkCount: number = 0;
  private lastLogTime: number = Date.now();

  constructor(config: WebSocketConfig) {
    this.config = config;
    
    // Use provided session ID or generate a stable one
    this._stableSessionId = config.sessionId || this.generateSessionId();
    
    this.config.log(`🆔 Using stable session ID: ${this._stableSessionId}`);
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

  // Start the WebSocket connection
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      this.config.log("⚠️ Already connecting or connected");
      return;
    }

    this.isConnecting = true;
    this.intentionalTermination = false;

    try {
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
      
      // Initialize the Deepgram client (without passing agent ID directly)
      this.dgClient = createClient(this.config.token);
      this.agent = this.dgClient.agent();
      
      this.smartLog('important', `✅ Deepgram client created - will use agent: ${agentId} in settings`);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Request microphone access
      await this.setupMicrophone();
      
      // Configure and start the agent
      const settings = await this.buildSettings();
      this.agent.configure(settings);
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
      this.config.onOpen?.();
    });

    this.agent.on(AgentEvents.SettingsApplied, () => {
      this.smartLog('important', `✅ Settings applied for session ${this._stableSessionId} - starting agent`);
      
      // CRITICAL: Start the agent AFTER settings are applied
      // This is the key difference from the old implementation
      if (this.agent) {
        this.agent.start();
        this.smartLog('important', "✅ Agent started - AI should initiate conversation");
      }
    });

    this.agent.on(AgentEvents.UserStartedSpeaking, () => {
      this.smartLog('important', "🎤 User started speaking");
    });

    this.agent.on(AgentEvents.AgentAudioDone, () => {
      this.smartLog('important', "🔇 Agent finished speaking");
    });

    this.agent.on(AgentEvents.AgentThinking, () => {
      this.smartLog('important', "🤔 Agent thinking...");
    });

    this.agent.on(AgentEvents.AgentStartedSpeaking, () => {
      this.smartLog('important', "🗣️ Agent started speaking");
    });

    this.agent.on(AgentEvents.ConversationText, (msg: any) => {
      this.smartLog('important', `💬 "${msg.content}"`);
      this.config.onTranscript?.(msg.content, true);
    });
    
    this.agent.on(AgentEvents.Audio, (payload: any) => {
      // Forward audio to AudioManager
      if (this.config.onAudio) {
        this.config.onAudio(payload);
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
      
      this.cleanup();
    });

    this.agent.on(AgentEvents.Close, () => {
      this.smartLog('important', "🌐 WebSocket closed");
      const wasClean = this.intentionalTermination;
      this.cleanup();
      this.config.onClose?.(wasClean, wasClean ? 1000 : 1006, wasClean ? "Intentional termination" : "Connection closed");
    });
  }

  // Build agent settings
  private async buildSettings(): Promise<any> {
    // Generate the prompt for logging/reference but don't use it in settings
    const prospectPrompt = this.generateProspectPrompt();
    this.smartLog('important', `📋 Generated prompt for ${this.config.personaName || 'prospect'} (${prospectPrompt.length} chars)`); 
    
    // Select appropriate voice model based on persona data
    let voiceModel = 'aura-2-nova-en'; // Default to Nova voice
    
    if (this.config.personaData) {
      // Use voice_id from persona if available
      if (this.config.personaData.voice_id) {
        voiceModel = this.config.personaData.voice_id;
      } 
      // Otherwise select voice by gender
      else {
        // Handle potential Promise return value from selectVoiceForPersona
        const voiceSelection = VoiceSelector.selectVoiceForPersona(this.config.personaData);
        
        // Check if result is a Promise and await it if needed
        if (voiceSelection instanceof Promise) {
          try {
            voiceModel = await voiceSelection;
            this.smartLog('important', '✅ Successfully retrieved voice model asynchronously');
          } catch (error) {
            this.smartLog('important', `❌ Error getting voice model: ${error.message}, using default`);
          }
        } else {
          // It's already a string, use it directly
          voiceModel = voiceSelection;
          this.smartLog('important', '✅ Retrieved voice model synchronously');
        }
      }
    }
    
    // Log the selected voice
    this.smartLog('important', `🎙️ Selected voice model: ${voiceModel}`);
    
    // Build comprehensive settings object
    const settings = {
      input: {
        microphone: true
      },
      output: {
        encoding: "linear16",
        sample_rate: TTS_RATE,
        provider: {
          type: "deepgram",
          model: voiceModel,
        },
      },
      agent_id: this._agentId, // Add agent_id to ensure proper message parsing
      experimental: false,
    };
    
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
        await this.micCtx.audioWorklet.addModule("/deepgram-worklet.js");
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
      
      // Process audio from the worklet with improved error handling
      let hold = new Int16Array(0);
      let sentFirstChunks = false;
      let lastSendTime = Date.now();
      
      this.micNode.port.onmessage = (e) => {
        const data = e.data;
        const now = Date.now();
        
        // Skip if no agent, no data, or disconnected
        if (!this.agent || !data || !this.isConnected) {
          if (!data && this.agent && this.isConnected) {
            this.smartLog('important', '⚠️ Received empty audio data from worklet');
          }
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
    
    // Detailed prompt with persona data
    const {
      name = personaName,
      role = 'a potential customer',
      company = 'a company',
      industry = '',
      pain_points = [],
    } = personaData;

    const painPointsText = pain_points.length > 0 
      ? `Your main pain points or challenges are: ${pain_points.join(', ')}.` 
      : '';

    const detailedPrompt = [
      `You are ${name}, ${role} at ${company}${industry ? ` in the ${industry} industry` : ''}.`,
      `You're on a sales call with ${userName || 'a sales representative'}.`,
      painPointsText,
      "IMPORTANT: YOU MUST START THE CONVERSATION FIRST with a greeting as soon as the call connects.",
      `Begin by introducing yourself briefly, mentioning your role at ${company}.`,
      "Speak naturally and conversationally, as if on a real phone call.",
      "If they introduce themselves as a sales representative or ask about your needs, show mild interest but don't be too eager to buy.",
      "Ask questions about their product or service to understand if it meets your needs.",
      "Be professional but somewhat guarded, as you would with any sales call.",
      `Session ID: ${this._stableSessionId}`
    ].filter(line => line.length > 0).join(' ');

    this.smartLog('important', `👋 AI will initiate conversation automatically for ${name}`);
    return detailedPrompt;
  }

  // Properly clean up resources
  cleanup(): void {
    this.config.log(`🧹 Cleaning up resources for session ${this._stableSessionId}`);
    
    this.stopKeepalive();
    
    // Close the agent
    if (this.agent) {
      try {
        if (this.isConnected) {
          // Fix: Check if finish method exists before calling it
          if (typeof this.agent.finish === 'function') {
            this.agent.finish();
          }
          this.agent.close();
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
          
          // Check if result is a Promise and await it if needed
          if (voiceSelection instanceof Promise) {
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
      
      // Save current voice model
      this._currentVoiceModel = voiceModel;
      
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
      
      // Generate new settings
      const newSettings = {
        input: {
          microphone: true
        },
        output: {
          encoding: "linear16",
          sample_rate: TTS_RATE,
          provider: {
            type: "deepgram",
            model: voiceModel,
          },
        },
        agent_id: newAgentId,
        experimental: false,
        system_prompt: systemPrompt || this.generateProspectPrompt(), // Use provided prompt or generate one
      };
      
      // Log the persona switch details
      this.config.log(`🎭 Switching to ${newPersona.name || 'new persona'} with voice ${voiceModel}`);
      
      // Reconfigure the agent with new settings
      if (this.agent && typeof this.agent.reconfigure === 'function') {
        try {
          // First stop the current conversation flow
          if (typeof this.agent.stop === 'function') {
            this.agent.stop();
            this.config.log("✋ Stopped current conversation flow");
          }
          
          // Apply new settings
          this.agent.reconfigure(newSettings);
          this.config.log("✅ Reconfigured agent with new persona settings");
          
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
      this.config.log(`🔊 Changing voice to ${voiceModel} in session ${this._stableSessionId}`);
      
      // Save current voice model
      this._currentVoiceModel = voiceModel;
      
      // Generate new settings with just the voice model changed
      const voiceSettings = {
        output: {
          encoding: "linear16",
          sample_rate: TTS_RATE,
          provider: {
            type: "deepgram",
            model: voiceModel,
          },
        }
      };
      
      // Reconfigure the agent with new voice settings
      if (this.agent && typeof this.agent.reconfigure === 'function') {
        this.agent.reconfigure(voiceSettings);
        this.config.log("✅ Voice model updated");
        return true;
      } else {
        this.config.log("❌ Agent does not support voice reconfiguration", "error");
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
      this.config.log(`📝 Updating system prompt in session ${this._stableSessionId}`);
      
      // Generate new settings with just the system prompt changed
      const promptSettings = {
        system_prompt: systemPrompt
      };
      
      // Reconfigure the agent with new prompt
      if (this.agent && typeof this.agent.reconfigure === 'function') {
        this.agent.reconfigure(promptSettings);
        this.config.log("✅ System prompt updated");
        return true;
      } else {
        this.config.log("❌ Agent does not support prompt reconfiguration", "error");
        return false;
      }
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
