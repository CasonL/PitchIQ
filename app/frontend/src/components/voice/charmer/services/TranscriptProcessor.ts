/**
 * TranscriptProcessor - Handles transcript processing and utterance management
 * 
 * Responsibilities:
 * - Echo filtering
 * - Multi-part utterance stitching
 * - Quality assessment
 * - Utterance validation
 * - Continuation detection
 */

import { TranscriptQualityDetector } from '../TranscriptQualityDetector';

export interface ProcessedTranscript {
  text: string;
  utteranceNumber: number;
  isValid: boolean;
  qualityIssues?: string[];
  isMultiPart?: boolean;
  partCount?: number;
}

export interface UtterancePart {
  text: string;
  count: number;
}

export class TranscriptProcessor {
  private utteranceCount = 0;
  private lastTranscript = '';
  private lastMarcusMessage = '';
  
  // Multi-part utterance handling
  private queuedUtterances: UtterancePart[] = [];
  private interruptedUtterance: UtterancePart | null = null;
  private processingTranscript = '';
  private isStitchedMessage = false;

  /**
   * Process a new final transcript from STT
   */
  processTranscript(
    transcript: string,
    isFinal: boolean
  ): ProcessedTranscript | null {
    if (!isFinal) {
      console.log(`📝 [TranscriptProcessor] Partial: "${transcript.substring(0, 60)}..."`);
      return null;
    }

    console.log(`✅ [TranscriptProcessor] Final transcript received`);

    const newContent = transcript.replace(this.lastTranscript, '').trim();
    
    if (!newContent || newContent.length <= 3) {
      console.log(`⏭️ [TranscriptProcessor] Too short: "${newContent}"`);
      return null;
    }

    // Filter echo (Marcus's own voice)
    if (this.isEcho(newContent)) {
      console.log(`🔇 [TranscriptProcessor] Filtered echo: "${newContent.substring(0, 50)}..."`);
      this.lastTranscript = transcript;
      return null;
    }

    // Check transcript quality
    const qualityCheck = TranscriptQualityDetector.assess(newContent);
    const qualityIssues = qualityCheck.isLikelyGarbled ? qualityCheck.issues : undefined;

    // Increment utterance count
    this.utteranceCount++;
    const utteranceNumber = this.utteranceCount;

    console.log(`📊 [TranscriptProcessor] Utterance #${utteranceNumber}: "${newContent.substring(0, 50)}..."`);

    this.lastTranscript = transcript;

    return {
      text: newContent,
      utteranceNumber,
      isValid: true,
      qualityIssues
    };
  }

  /**
   * Check if transcript is Marcus's own voice (echo)
   */
  private isEcho(userText: string): boolean {
    if (!this.lastMarcusMessage) return false;

    const marcusText = this.lastMarcusMessage.toLowerCase().trim();
    const normalizedUserText = userText.toLowerCase().trim();

    return (
      normalizedUserText === marcusText ||
      marcusText.includes(normalizedUserText) ||
      normalizedUserText.includes(marcusText) ||
      (normalizedUserText.length > 10 && marcusText.startsWith(normalizedUserText.slice(0, 10)))
    );
  }

  /**
   * Update last Marcus message for echo filtering
   */
  setLastMarcusMessage(message: string): void {
    this.lastMarcusMessage = message;
  }

  /**
   * Handle user interruption during processing
   */
  handleInterruption(newUtteranceText: string, newUtteranceCount: number): void {
    console.log(`🚫 [TranscriptProcessor] User interrupted - queuing utterance`);

    // Save currently processing utterance if not already saved
    if (!this.interruptedUtterance && this.processingTranscript) {
      this.interruptedUtterance = {
        text: this.processingTranscript,
        count: this.utteranceCount - this.queuedUtterances.length
      };
      console.log(`💾 [TranscriptProcessor] Saved interrupted: "${this.processingTranscript.substring(0, 50)}..."`);
    }

    // Queue the new utterance
    this.queuedUtterances.push({
      text: newUtteranceText,
      count: newUtteranceCount
    });
    console.log(`📦 [TranscriptProcessor] Queued continuation (${this.queuedUtterances.length} parts)`);
  }

  /**
   * Mark that we're processing a transcript
   */
  setProcessingTranscript(text: string): void {
    this.processingTranscript = text;
  }

  /**
   * Check if there are queued utterances to process
   */
  hasQueuedUtterances(): boolean {
    return this.queuedUtterances.length > 0 || this.interruptedUtterance !== null;
  }

  /**
   * Get and clear queued multi-part utterance
   */
  getStitchedUtterance(): ProcessedTranscript | null {
    if (!this.hasQueuedUtterances()) {
      return null;
    }

    const parts: UtterancePart[] = [];

    // Include interrupted utterance as part 1
    if (this.interruptedUtterance) {
      parts.push(this.interruptedUtterance);
      console.log(`📝 [TranscriptProcessor] Part 1 (interrupted): "${this.interruptedUtterance.text.substring(0, 50)}..."`);
    }

    // Add all queued parts
    parts.push(...this.queuedUtterances);
    this.queuedUtterances.forEach((part, idx) => {
      console.log(`📝 [TranscriptProcessor] Part ${idx + (this.interruptedUtterance ? 2 : 1)}: "${part.text.substring(0, 50)}..."`);
    });

    // Format as numbered sequence for LLM
    const stitchedText = parts.length > 1
      ? `User said (${parts.length}-part thought):\n${parts.map((p, i) => `${i + 1}. "${p.text}"`).join('\n')}\n\nRespond to the COMPLETE thought, not just the last part.`
      : parts[0].text;

    const lastCount = parts[parts.length - 1].count;

    console.log(`▶️ [TranscriptProcessor] Processing ${parts.length}-part utterance sequence`);

    // Clear queues
    this.queuedUtterances = [];
    this.interruptedUtterance = null;
    this.isStitchedMessage = true;

    return {
      text: stitchedText,
      utteranceNumber: lastCount,
      isValid: true,
      isMultiPart: true,
      partCount: parts.length
    };
  }

  /**
   * Check if current processing is a stitched message
   */
  isProcessingStitched(): boolean {
    return this.isStitchedMessage;
  }

  /**
   * Clear stitched flag
   */
  clearStitchedFlag(): void {
    this.isStitchedMessage = false;
  }

  /**
   * Clear all processing state
   */
  clearProcessingState(): void {
    this.processingTranscript = '';
    this.isStitchedMessage = false;
  }

  /**
   * Detect if text suggests user will continue speaking
   */
  detectContinuationCue(text: string): boolean {
    const trimmed = text.trim().toLowerCase();

    // Trailing conjunctions or connectives
    const trailingConjunction = /\b(and|but|so|or|because|since|while|though|although|however|yet|nor)\s*[.,]?\s*$/i.test(trimmed);

    // Fillers suggesting more coming
    const trailingFiller = /\b(yeah|like|um|uh|well|actually|basically|you know)\s*[.,]?\s*$/i.test(trimmed);

    // Incomplete thought patterns
    const incompleteThought = /\b(i mean|what i'm saying|the thing is|so like)\s*$/i.test(trimmed);

    return trailingConjunction || trailingFiller || incompleteThought;
  }

  /**
   * Get current utterance count
   */
  getUtteranceCount(): number {
    return this.utteranceCount;
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.utteranceCount = 0;
    this.lastTranscript = '';
    this.lastMarcusMessage = '';
    this.queuedUtterances = [];
    this.interruptedUtterance = null;
    this.processingTranscript = '';
    this.isStitchedMessage = false;
    console.log('🔄 [TranscriptProcessor] Reset');
  }
}
