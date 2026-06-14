/**
 * Conversation Turn State Machine for Proper Turn Management
 * 
 * Prevents the race condition where continued user speech is treated as separate turns,
 * causing Marcus to respond to incomplete thoughts and creating conversational stupidity.
 * 
 * This operates at the TURN level (who's speaking when), separate from ProspectCallState
 * which operates at the CONNECTION level (WebSocket up/down).
 */

export type ConversationTurnState = 
  | 'listening'           // Waiting for user to speak
  | 'user_speaking'       // User is actively speaking (interim transcripts)
  | 'user_turn_pending'   // User finished speaking, but turn not committed yet
  | 'assistant_generating' // Marcus is generating response
  | 'assistant_speaking'  // Marcus is speaking (TTS playing)
  | 'interrupted';        // User interrupted Marcus while he was speaking

export interface ConversationTurnManager {
  currentState: ConversationTurnState;
  pendingUserTurn: string | null;
  activeRequestId: string | null;
  userTurnCommitTimer: NodeJS.Timeout | null;
  
  // State transition methods
  startUserSpeaking(): void;
  appendToUserTurn(text: string): void;
  commitUserTurn(): void;
  startAssistantGeneration(requestId: string): void;
  cancelAssistantGeneration(): void;
  startAssistantSpeaking(): void;
  finishAssistantSpeaking(): void;
  handleInterruption(): void;
  
  // State queries
  canCommitUserTurn(): boolean;
  shouldMergeUserSpeech(): boolean;
  shouldCancelGeneration(): boolean;
  
  // Integration with connection state
  setConnectionState(connected: boolean): void;
}

export class ConversationTurnManagerImpl implements ConversationTurnManager {
  currentState: ConversationTurnState = 'listening';
  pendingUserTurn: string | null = null;
  activeRequestId: string | null = null;
  userTurnCommitTimer: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  
  private readonly COMMIT_DELAY_MS = 1500; // Grace period before committing user turn
  private readonly onStateChange: (state: ConversationTurnState) => void;
  private readonly onUserTurnCommit: (text: string) => void;
  
  constructor(
    onStateChange: (state: ConversationTurnState) => void,
    onUserTurnCommit: (text: string) => void
  ) {
    this.onStateChange = onStateChange;
    this.onUserTurnCommit = onUserTurnCommit;
  }
  
  setConnectionState(connected: boolean): void {
    this.isConnected = connected;
    if (!connected) {
      // Reset to listening state when disconnected
      this.cleanup();
      console.log(`🔌 [TurnState] Connection lost - resetting to listening`);
    }
  }
  
  startUserSpeaking(): void {
    // Don't process turns if not connected
    if (!this.isConnected) {
      console.log(`⚠️ [TurnState] Ignoring user speech - not connected`);
      return;
    }
    
    console.log(`🎤 [TurnState] ${this.currentState} → user_speaking`);
    
    // Cancel any pending commit timer
    if (this.userTurnCommitTimer) {
      clearTimeout(this.userTurnCommitTimer);
      this.userTurnCommitTimer = null;
    }
    
    // If Marcus is generating, cancel it - user is continuing their thought
    if (this.currentState === 'assistant_generating') {
      console.log(`🚫 [TurnState] Canceling Marcus generation - user continuing speech`);
      this.cancelAssistantGeneration();
    }
    
    // If Marcus is speaking, this is a true interruption
    if (this.currentState === 'assistant_speaking') {
      console.log(`🛑 [TurnState] User interrupted Marcus while speaking`);
      this.handleInterruption();
      return;
    }
    
    this.currentState = 'user_speaking';
    this.onStateChange(this.currentState);
  }
  
  appendToUserTurn(text: string): void {
    if (this.pendingUserTurn === null) {
      this.pendingUserTurn = text;
    } else {
      // Merge with existing turn - this is the key fix!
      this.pendingUserTurn = this.pendingUserTurn + ' ' + text;
    }
    
    console.log(`📝 [TurnState] Appended to user turn: "${this.pendingUserTurn?.substring(0, 60)}..."`);
  }
  
  commitUserTurn(): void {
    if (!this.pendingUserTurn) {
      console.warn(`⚠️ [TurnState] No pending user turn to commit`);
      return;
    }
    
    console.log(`✅ [TurnState] Committing user turn: "${this.pendingUserTurn.substring(0, 60)}..."`);
    
    // Clear commit timer
    if (this.userTurnCommitTimer) {
      clearTimeout(this.userTurnCommitTimer);
      this.userTurnCommitTimer = null;
    }
    
    const turnText = this.pendingUserTurn;
    this.pendingUserTurn = null;
    this.currentState = 'listening';
    this.onStateChange(this.currentState);
    
    // Trigger Marcus generation
    this.onUserTurnCommit(turnText);
  }
  
  startAssistantGeneration(requestId: string): void {
    // Don't start generation if not connected
    if (!this.isConnected) {
      console.log(`⚠️ [TurnState] Ignoring generation start - not connected`);
      return;
    }
    
    console.log(`🤖 [TurnState] ${this.currentState} → assistant_generating (${requestId})`);
    
    this.currentState = 'assistant_generating';
    this.activeRequestId = requestId;
    this.onStateChange(this.currentState);
  }
  
  cancelAssistantGeneration(): void {
    console.log(`🚫 [TurnState] Canceling assistant generation (${this.activeRequestId})`);
    
    this.activeRequestId = null;
    
    // Don't change state if user is speaking - let that state persist
    if (this.currentState === 'assistant_generating') {
      this.currentState = 'listening';
      this.onStateChange(this.currentState);
    }
  }
  
  startAssistantSpeaking(): void {
    // Only start speaking if we're still in generation state (not canceled) and connected
    if (!this.isConnected) {
      console.log(`⚠️ [TurnState] Ignoring assistant speech - not connected`);
      return;
    }
    
    if (this.currentState !== 'assistant_generating') {
      console.log(`🚫 [TurnState] Ignoring assistant speech - state is ${this.currentState}`);
      return;
    }
    
    console.log(`🗣️ [TurnState] ${this.currentState} → assistant_speaking`);
    
    this.currentState = 'assistant_speaking';
    this.activeRequestId = null;
    this.onStateChange(this.currentState);
  }
  
  finishAssistantSpeaking(): void {
    console.log(`✅ [TurnState] ${this.currentState} → listening`);
    
    this.currentState = 'listening';
    this.onStateChange(this.currentState);
  }
  
  handleInterruption(): void {
    console.log(`🛑 [TurnState] ${this.currentState} → interrupted`);
    
    // Cancel any active generation
    if (this.activeRequestId) {
      this.activeRequestId = null;
    }
    
    this.currentState = 'interrupted';
    this.onStateChange(this.currentState);
    
    // Immediately transition to user_speaking
    this.currentState = 'user_speaking';
    this.onStateChange(this.currentState);
  }
  
  // When user stops speaking (UtteranceEnd), start commit timer
  scheduleUserTurnCommit(): void {
    if (!this.isConnected) {
      console.log(`⚠️ [TurnState] Cannot schedule commit - not connected`);
      return;
    }
    
    if (this.currentState !== 'user_speaking') {
      console.warn(`⚠️ [TurnState] Cannot schedule commit - not in user_speaking state`);
      return;
    }
    
    console.log(`⏱️ [TurnState] user_speaking → user_turn_pending (${this.COMMIT_DELAY_MS}ms grace period)`);
    
    this.currentState = 'user_turn_pending';
    this.onStateChange(this.currentState);
    
    // Start commit timer
    this.userTurnCommitTimer = setTimeout(() => {
      this.commitUserTurn();
    }, this.COMMIT_DELAY_MS);
  }
  
  canCommitUserTurn(): boolean {
    return this.currentState === 'user_turn_pending' && this.pendingUserTurn !== null;
  }
  
  shouldMergeUserSpeech(): boolean {
    return this.currentState === 'user_speaking' || 
           this.currentState === 'user_turn_pending' ||
           this.currentState === 'assistant_generating';
  }
  
  shouldCancelGeneration(): boolean {
    return this.currentState === 'assistant_generating' && this.activeRequestId !== null;
  }
  
  // Check if a response should be ignored (came from canceled request)
  isResponseValid(requestId: string): boolean {
    return this.activeRequestId === requestId;
  }
  
  cleanup(): void {
    if (this.userTurnCommitTimer) {
      clearTimeout(this.userTurnCommitTimer);
      this.userTurnCommitTimer = null;
    }
    this.activeRequestId = null;
    this.pendingUserTurn = null;
    this.currentState = 'listening';
  }
}
