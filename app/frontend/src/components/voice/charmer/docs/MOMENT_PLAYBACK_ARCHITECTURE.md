# Moment Playback Architecture - Technical Implementation

**Feature**: Automatically sync critical moments with audio timestamps for instant playback

## Problem Solved

When the LLM identifies **Turn 6** as crucial, the system needs to:
1. Find Turn 6 in the conversation history
2. Locate its exact timestamp in the audio recording
3. Provide a play button that jumps directly to that moment
4. Optionally play just that exchange (user + Marcus response)

## Data Flow

```
Call Recording Started
    ↓
[User speaks at 1:24.350] → Transcript → Exchange logged with timestampMs
    ↓
[Marcus responds at 1:27.120] → TTS played → Exchange logged with timestampMs
    ↓
... more exchanges ...
    ↓
Call Ends → Post-call analysis
    ↓
LLM detects: "Turn 6 was crucial - missed budget signal"
    ↓
System links Turn 6 → audioTimestamp: 84.35s, audioDuration: 12s
    ↓
UI shows: [▶️ Play This Moment (12s)] button
    ↓
User clicks → Audio jumps to 84.35s and plays for 12s
```

## Core Architecture

### 1. Timestamp Collection (During Call)

**In CharmerController.tsx**:

```typescript
// Track when call started (for relative timestamps)
const callStartTimeRef = useRef<number>(0);

// When call connects
const handleCallStart = () => {
  callStartTimeRef.current = performance.now();
  conversationTrackerRef.current = new ConversationTracker(callStartTimeRef.current);
};

// When user speaks (UtteranceEnd event)
const processUserInput = (userText: string) => {
  const timestampMs = performance.now() - callStartTimeRef.current;
  
  const exchange: ConversationExchange = {
    role: 'user',
    content: userText,
    timestamp: timestampMs / 1000,  // Seconds
    timestampMs: timestampMs,        // Milliseconds (precise)
    turnNumber: currentTurnNumber
  };
  
  conversationTrackerRef.current.addExchange(exchange);
  
  // ... generate Marcus response ...
};

// When Marcus responds
const afterMarcusSpeaks = (marcusText: string) => {
  const timestampMs = performance.now() - callStartTimeRef.current;
  
  const exchange: ConversationExchange = {
    role: 'assistant',
    content: marcusText,
    timestamp: timestampMs / 1000,
    timestampMs: timestampMs,
    turnNumber: currentTurnNumber
  };
  
  conversationTrackerRef.current.addExchange(exchange);
};
```

### 2. Recording Sync (CallRecorder)

**Track recording start time relative to conversation**:

```typescript
export class CallRecorder {
  private recordingStartTime: number = 0;
  private conversationStartTime: number = 0;
  
  async startRecording(
    userStream: MediaStream,
    conversationStartTime: number  // From callStartTimeRef
  ): Promise<void> {
    this.recordingStartTime = performance.now();
    this.conversationStartTime = conversationStartTime;
    
    // ... MediaRecorder setup ...
  }
  
  /**
   * Convert conversation timestamp (ms from call start) 
   * to audio playback position (seconds into recording)
   */
  conversationToAudioTimestamp(conversationMs: number): number {
    // Conversation timestamps are relative to callStartTimeRef
    // Recording timestamps are relative to recordingStartTime
    // Need to account for any offset between them
    
    const conversationAbsolute = this.conversationStartTime + conversationMs;
    const audioMs = conversationAbsolute - this.recordingStartTime;
    return Math.max(0, audioMs / 1000); // Seconds
  }
}
```

### 3. Moment Detection & Linking (Post-Call)

**After call ends, link moments to audio**:

```typescript
// In CharmerController.tsx or PostCallAnalyzer
const generateMomentFeedback = async () => {
  // 1. Get conversation exchanges with timestamps
  const exchanges = conversationTrackerRef.current.getExchanges();
  
  // 2. Detect critical moments (existing logic)
  const rawMoments = detectCriticalMoments(exchanges);
  
  // 3. Link moments to audio timestamps
  const momentsWithAudio = linkMomentsToAudio(
    rawMoments,
    exchanges,
    recorder?.getRecordingStartTime() || 0
  );
  
  // 4. Store with recording
  setMomentFeedbackData({
    moments: momentsWithAudio,
    conversationExchanges: exchanges,
    recordingBlob: recordingBlob,
    recordingStartTime: recorder?.getRecordingStartTime()
  });
};

function linkMomentsToAudio(
  moments: CriticalMoment[],
  exchanges: ConversationExchange[],
  recordingStartTime: number
): CriticalMoment[] {
  return moments.map(moment => {
    // Find exchanges for this turn
    const turnExchanges = exchanges.filter(
      e => e.turnNumber === moment.turnNumber
    );
    
    if (turnExchanges.length === 0) return moment;
    
    // Get user exchange (start of turn)
    const userExchange = turnExchanges.find(e => e.role === 'user');
    const marcusExchange = turnExchanges.find(e => e.role === 'assistant');
    
    if (!userExchange?.timestampMs) return moment;
    
    // Calculate audio position
    const audioTimestamp = (userExchange.timestampMs) / 1000; // Already relative to call start
    
    // Calculate duration (user + Marcus response)
    let audioDuration = 3; // Default 3s if no Marcus response
    if (marcusExchange?.timestampMs) {
      audioDuration = (marcusExchange.timestampMs - userExchange.timestampMs) / 1000;
      // Add estimated Marcus speech duration
      audioDuration += estimateSpeechDuration(marcusExchange.content);
    }
    
    return {
      ...moment,
      audioTimestamp,
      audioDuration
    };
  });
}

function estimateSpeechDuration(text: string): number {
  // Rough estimate: ~150 words per minute = 2.5 words per second
  const wordCount = text.split(/\s+/).length;
  return (wordCount / 2.5) + 0.5; // Add 0.5s buffer
}
```

### 4. UI Playback

**MomentCard with play button**:

```typescript
export const MomentCard: React.FC<MomentCardProps> = ({ 
  moment,
  onPlayMoment 
}) => {
  return (
    <div className="moment-card">
      <div className="moment-header">
        <span>{moment.title}</span>
        <span>Turn {moment.turnNumber}</span>
        
        {/* Audio playback button */}
        {moment.audioTimestamp !== undefined && (
          <button
            onClick={() => onPlayMoment(moment.audioTimestamp!, moment.audioDuration)}
            className="play-moment-btn"
          >
            ▶️ {formatDuration(moment.audioDuration || 0)}
          </button>
        )}
      </div>
      
      {/* ... rest of card ... */}
    </div>
  );
};
```

**Centralized AudioPlayer component**:

```typescript
export const CallRecordingPlayer: React.FC<{
  recordingBlob: Blob;
  moments: CriticalMoment[];
  exchanges: ConversationExchange[];
}> = ({ recordingBlob, moments, exchanges }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    // Create audio element from blob
    const url = URL.createObjectURL(recordingBlob);
    audioRef.current = new Audio(url);
    
    audioRef.current.addEventListener('timeupdate', () => {
      setCurrentTime(audioRef.current!.currentTime);
    });
    
    return () => URL.revokeObjectURL(url);
  }, [recordingBlob]);
  
  const playMoment = (timestamp: number, duration?: number) => {
    if (!audioRef.current) return;
    
    // Jump to timestamp
    audioRef.current.currentTime = timestamp;
    audioRef.current.play();
    setIsPlaying(true);
    
    // Auto-pause after duration
    if (duration) {
      setTimeout(() => {
        audioRef.current?.pause();
        setIsPlaying(false);
      }, duration * 1000);
    }
  };
  
  return (
    <div className="recording-player">
      {/* Timeline with moment markers */}
      <AudioTimeline
        currentTime={currentTime}
        duration={audioRef.current?.duration || 0}
        moments={moments}
        onSeek={(time) => audioRef.current!.currentTime = time}
        onPlayMoment={playMoment}
      />
      
      {/* Playback controls */}
      <div className="controls">
        <button onClick={() => audioRef.current?.play()}>▶️</button>
        <button onClick={() => audioRef.current?.pause()}>⏸️</button>
        <span>{formatTime(currentTime)}</span>
      </div>
    </div>
  );
};
```

## Example: LLM Says "Turn 6 is Crucial"

**Flow**:

1. **During call**:
   ```typescript
   Turn 6:
   - User speaks at timestampMs: 84350 (1:24.35)
   - Marcus responds at timestampMs: 87120 (1:27.12)
   - Both logged in conversationTrackerRef
   ```

2. **Post-call analysis**:
   ```typescript
   LLM generates:
   {
     type: 'missed_opportunity',
     turnNumber: 6,
     issue: 'Prospect mentioned budget but you didn't explore it',
     userMessage: 'We've been looking at solutions around $50k',
     marcusResponse: 'That's great. So what made you reach out to us?'
   }
   ```

3. **Linking step**:
   ```typescript
   linkMomentsToAudio finds:
   - userExchange.turnNumber === 6, timestampMs: 84350
   - marcusExchange.turnNumber === 6, timestampMs: 87120
   
   Calculates:
   - audioTimestamp = 84350 / 1000 = 84.35 seconds
   - audioDuration = (87120 - 84350) / 1000 + estimateSpeech("That's great...") 
                   = 2.77s + 2.5s = 5.27s
   
   Result:
   {
     ...moment,
     audioTimestamp: 84.35,
     audioDuration: 5.27
   }
   ```

4. **UI displays**:
   ```
   [✗] Turn 6 - Missed Opportunity (1:24)
       "Prospect mentioned budget but you didn't explore"
       [▶️ Play This Moment (5s)]
   ```

5. **User clicks play**:
   ```typescript
   audioRef.current.currentTime = 84.35;
   audioRef.current.play();
   setTimeout(() => audioRef.current.pause(), 5270);
   ```

## Edge Cases & Solutions

### Problem: Recording starts after conversation begins

**Scenario**: User clicks "Call Marcus" → greeting plays → recording starts 2s later

**Solution**: Track offset between conversation and recording:

```typescript
const callStartTimeRef = useRef(0);      // Conversation starts
const recordingStartTimeRef = useRef(0); // Recording starts (may be later)

// Calculate offset
const offset = recordingStartTimeRef.current - callStartTimeRef.current;

// When linking moments
const audioTimestamp = (conversationTimestamp - offset) / 1000;
```

### Problem: STT delay means transcript timestamp ≠ actual speech time

**Scenario**: User speaks at 10.0s, but transcript arrives at 10.5s

**Solution**: Use UtteranceEnd event timestamp (when speech ended) not when transcript processed:

```typescript
// AssemblyAI provides speech_final timestamp
onTranscript: (text, isFinal, metadata) => {
  if (isFinal && metadata?.audio_end) {
    // Use STT-provided timestamp, not Date.now()
    const timestampMs = metadata.audio_end - callStartTimeRef.current;
    addExchange({ text, timestampMs });
  }
}
```

### Problem: TTS playback delay

**Scenario**: Marcus generates response at 15s, but audio plays at 15.2s

**Solution**: Log timestamp when TTS audio actually starts playing:

```typescript
// In CartesiaService or TTS layer
onAudioStart: (startTime) => {
  const timestampMs = startTime - callStartTimeRef.current;
  // Use this for Marcus exchange timestamp
}
```

## Storage Considerations

**IndexedDB schema**:

```typescript
interface StoredCall {
  sessionId: string;
  timestamp: number;
  
  // Conversation data
  exchanges: ConversationExchange[];
  moments: CriticalMoment[];
  
  // Audio recording
  recordingBlob: Blob;  // WebM audio file
  recordingDuration: number;
  
  // Sync metadata
  callStartTime: number;
  recordingStartTime: number;
}

// Store in IndexedDB (supports Blobs)
const db = await openDB('pitchiq-recordings', 1, {
  upgrade(db) {
    db.createObjectStore('calls', { keyPath: 'sessionId' });
  }
});

await db.put('calls', storedCall);
```

## Implementation Checklist

**Phase 1: Timestamp Tracking** (1 hour):
- [x] Add timestampMs to ConversationExchange type
- [ ] Modify CharmerController to log precise timestamps
- [ ] Update ConversationTracker to store timestamps
- [ ] Test timestamp accuracy (±100ms acceptable)

**Phase 2: Recording Integration** (2 hours):
- [ ] Create CallRecorder service with timestamp tracking
- [ ] Integrate into MarcusVoiceManager
- [ ] Store recordingBlob with feedback data
- [ ] Test recording start/stop timing

**Phase 3: Moment Linking** (1 hour):
- [ ] Create linkMomentsToAudio utility
- [ ] Add audioTimestamp/audioDuration to CriticalMoment type
- [ ] Call linking function in post-call analysis
- [ ] Verify accurate moment timestamps

**Phase 4: Playback UI** (2 hours):
- [ ] Add play button to MomentCard
- [ ] Create CallRecordingPlayer component
- [ ] Add moment markers to timeline
- [ ] Test seeking and auto-pause

**Phase 5: Storage** (1 hour):
- [ ] Set up IndexedDB for recordings
- [ ] Save/load recordings with moments
- [ ] Handle cleanup (delete old recordings)

**Total Effort**: ~7 hours

## Success Metrics

- ✅ Moment playback accuracy: ±1 second
- ✅ Click-to-play latency: <500ms
- ✅ Recording file size: <1 MB/minute
- ✅ Storage capacity: 10+ calls locally

---

**Status**: Documented - Ready for implementation  
**Dependencies**: CALL_RECORDING.md (base architecture)  
**Next Step**: Implement Phase 1 (timestamp tracking)
