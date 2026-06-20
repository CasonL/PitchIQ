/**
 * TurnAudioRecorder captures per-turn audio for both user and AI speakers.
 * 
 * Design:
 * - User audio: captured via MediaRecorder on the mic stream per turn
 * - AI audio: captured from the onAudio ArrayBuffer chunks passed in
 * - Each turn gets a unique ID, start/end time, transcript text, and audio blob
 * - Vocal metrics are computed on finalization
 */

export interface TurnEvent {
  id: string;
  speaker: 'user' | 'ai';
  text: string;
  audioBlob: Blob | null;
  startMs: number;
  endMs: number;
  durationMs: number;
  metrics?: VocalMetrics;
}

export interface VocalMetrics {
  wordCount?: number;
  wordsPerMinute?: number;
  fillerCount?: number;
  fillerWords?: string[];
  pauseCount?: number;
  avgPauseMs?: number;
  longestPauseMs?: number;
  questionCount?: number;
  monologueMs?: number;
}

export interface TurnRecorderConfig {
  micStream: MediaStream | null;
  onTurnReady?: (turn: TurnEvent) => void;
  log?: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

const FILLER_WORDS = new Set([
  'um', 'uh', 'ah', 'er', 'like', 'so', 'you know', 'i mean', 'actually', 'basically', 'sort of', 'kind of'
]);

function generateTurnId(speaker: 'user' | 'ai', index: number): string {
  return `${speaker}_${String(index).padStart(3, '0')}`;
}

export class TurnAudioRecorder {
  private config: TurnRecorderConfig;
  private micStream: MediaStream | null;
  private turns: TurnEvent[] = [];
  private currentUserRecorder: MediaRecorder | null = null;
  private currentUserChunks: Blob[] = [];
  private currentAiChunks: ArrayBuffer[] = [];
  private currentTurnStartMs: number = 0;
  private currentSpeaker: 'user' | 'ai' | null = null;
  private userTurnIndex: number = 0;
  private aiTurnIndex: number = 0;
  private turnText: string = '';
  private lastSpeechMs: number = 0;
  private pauseStartMs: number | null = null;
  private pausesMs: number[] = [];
  private turnTimeouts: number[] = [];
  private callStartMs: number = 0;

  constructor(config: TurnRecorderConfig) {
    this.config = config;
    this.micStream = config.micStream || null;
  }

  startCall(): void {
    this.callStartMs = performance.now();
    this.turns = [];
    this.userTurnIndex = 0;
    this.aiTurnIndex = 0;
    this.currentSpeaker = null;
    this.turnText = '';
    this.lastSpeechMs = 0;
    this.pausesMs = [];
    this.clearTimeouts();
  }

  endCall(): void {
    this.finalizeCurrentTurn();
    this.clearTimeouts();
  }

  setMicStream(stream: MediaStream): void {
    this.micStream = stream;
  }

  startUserTurn(): void {
    if (this.currentSpeaker === 'user') return;
    this.finalizeCurrentTurn();
    
    this.currentSpeaker = 'user';
    this.currentTurnStartMs = this.elapsedMs();
    this.turnText = '';
    this.pausesMs = [];
    this.pauseStartMs = null;
    this.lastSpeechMs = this.currentTurnStartMs;
    this.currentUserChunks = [];
    
    this.startUserRecording();
    this.log('🎙️ Started user turn recording');
  }

  startAiTurn(): void {
    if (this.currentSpeaker === 'ai') return;
    this.finalizeCurrentTurn();
    
    this.currentSpeaker = 'ai';
    this.currentTurnStartMs = this.elapsedMs();
    this.turnText = '';
    this.currentAiChunks = [];
    
    this.log('🎙️ Started AI turn recording');
  }

  appendUserTranscript(text: string): void {
    if (this.currentSpeaker !== 'user') return;
    this.appendTranscript(text);
  }

  appendAiTranscript(text: string): void {
    if (this.currentSpeaker !== 'ai') return;
    this.appendTranscript(text);
  }

  appendAiAudio(chunk: ArrayBuffer): void {
    if (this.currentSpeaker !== 'ai') {
      // If we're receiving AI audio but not in an AI turn, start one
      this.startAiTurn();
    }
    this.currentAiChunks.push(chunk);
    this.lastSpeechMs = this.elapsedMs();
    this.pauseStartMs = null;
  }

  private appendTranscript(text: string): void {
    const now = this.elapsedMs();
    
    if (this.turnText) {
      const pauseMs = now - this.lastSpeechMs;
      if (pauseMs > 250) {
        this.pausesMs.push(pauseMs);
      }
    }
    
    this.turnText += (this.turnText ? ' ' : '') + text;
    this.lastSpeechMs = now;
    this.pauseStartMs = null;
  }

  finalizeCurrentTurn(): void {
    if (!this.currentSpeaker) return;
    
    const speaker = this.currentSpeaker;
    const endMs = this.elapsedMs();
    const durationMs = endMs - this.currentTurnStartMs;
    const text = this.turnText.trim();
    
    let audioBlob: Blob | null = null;
    
    if (speaker === 'user') {
      audioBlob = this.stopUserRecording();
    } else if (speaker === 'ai') {
      audioBlob = this.mergeAiAudioChunks();
    }
    
    const metrics = this.computeMetrics(text, durationMs);
    
    const turnIndex = speaker === 'user' ? ++this.userTurnIndex : ++this.aiTurnIndex;
    const turn: TurnEvent = {
      id: generateTurnId(speaker, turnIndex),
      speaker,
      text,
      audioBlob,
      startMs: this.currentTurnStartMs,
      endMs,
      durationMs,
      metrics
    };
    
    this.turns.push(turn);
    
    this.log(`🎙️ Finalized ${speaker} turn ${turn.id}: ${text.slice(0, 40)}${text.length > 40 ? '...' : ''}`);
    
    this.config.onTurnReady?.(turn);
    
    this.currentSpeaker = null;
    this.turnText = '';
    this.currentUserChunks = [];
    this.currentAiChunks = [];
    this.pausesMs = [];
    this.pauseStartMs = null;
  }

  private startUserRecording(): void {
    if (!this.micStream) return;
    
    try {
      this.currentUserRecorder = new MediaRecorder(this.micStream, { mimeType: 'audio/webm' });
      this.currentUserChunks = [];
      
      this.currentUserRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.currentUserChunks.push(event.data);
        }
      };
      
      this.currentUserRecorder.start(1000);
    } catch (error) {
      this.log(`⚠️ Failed to start user recording: ${error}`, 'warn');
    }
  }

  private stopUserRecording(): Blob | null {
    if (!this.currentUserRecorder || this.currentUserRecorder.state === 'inactive') {
      return this.currentUserChunks.length > 0
        ? new Blob(this.currentUserChunks, { type: 'audio/webm' })
        : null;
    }
    
    this.currentUserRecorder.stop();
    
    // Synchronously return blob (chunks already collected)
    return this.currentUserChunks.length > 0
      ? new Blob(this.currentUserChunks, { type: 'audio/webm' })
      : null;
  }

  private mergeAiAudioChunks(): Blob | null {
    if (this.currentAiChunks.length === 0) return null;
    
    const totalLength = this.currentAiChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.currentAiChunks) {
      merged.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    // AI audio from Deepgram is typically raw PCM or WAV; we wrap as WAV if needed
    // For now, return as raw audio blob. The player will need to know the format.
    return new Blob([merged], { type: 'audio/wav' });
  }

  private computeMetrics(text: string, durationMs: number): VocalMetrics {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const wordsPerMinute = durationMs > 0 ? (wordCount / (durationMs / 60000)) : 0;
    
    const fillerWords: string[] = [];
    for (const word of words) {
      const lower = word.toLowerCase().replace(/[^a-z]/g, '');
      if (FILLER_WORDS.has(lower)) {
        fillerWords.push(word);
      }
    }
    
    const questionCount = (text.match(/\?/g) || []).length;
    
    const pauseCount = this.pausesMs.length;
    const avgPauseMs = pauseCount > 0
      ? Math.round(this.pausesMs.reduce((a, b) => a + b, 0) / pauseCount)
      : 0;
    const longestPauseMs = pauseCount > 0
      ? Math.max(...this.pausesMs)
      : 0;
    
    return {
      wordCount,
      wordsPerMinute: Math.round(wordsPerMinute),
      fillerCount: fillerWords.length,
      fillerWords,
      pauseCount,
      avgPauseMs,
      longestPauseMs,
      questionCount,
      monologueMs: durationMs
    };
  }

  getTurns(): TurnEvent[] {
    return [...this.turns];
  }

  getTimeline(): TurnEvent[] {
    return this.getTurns();
  }

  private elapsedMs(): number {
    return Math.round(performance.now() - this.callStartMs);
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    this.config.log?.(message, level);
  }

  private clearTimeouts(): void {
    for (const timeout of this.turnTimeouts) {
      clearTimeout(timeout);
    }
    this.turnTimeouts = [];
  }
}
