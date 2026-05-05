# Call Recording - Implementation Options

**Status**: Not currently implemented  
**Effort**: 3-4 hours for basic implementation  
**Priority**: Medium - useful for training analysis and quality assurance

## Current State

**Recording capability**: ❌ Not implemented  
**Audio pipeline**: AssemblyAI (STT) + Cartesia (TTS) via MarcusVoiceManager

The system currently:
- ✅ Captures user speech via microphone
- ✅ Generates Marcus speech via TTS
- ✅ Stores conversation transcript in memory
- ❌ Does NOT record raw audio

## Why Record Calls?

**Training & Analysis**:
- Review actual call audio for coaching insights
- Analyze tone, pacing, energy levels
- Identify transcript quality issues (STT errors)
- Compare Marcus voice performance across different scenarios

**Quality Assurance**:
- Verify TTS quality and naturalness
- Debug STT accuracy issues
- Replay problematic calls for troubleshooting

**User Features**:
- Let users download their practice calls
- Self-review before seeing AI feedback
- Build confidence by hearing improvement over time

## Implementation Options

### Option 1: Client-Side Recording (Recommended)

**Use MediaRecorder API** to capture:
1. User microphone input (before STT)
2. Marcus TTS output (before playback)
3. Mixed stereo track (user left channel, Marcus right)

**Pros**:
- No backend infrastructure needed
- Works offline
- Low latency
- User controls their data

**Cons**:
- Limited to browser-supported formats (WebM, Ogg)
- File size grows with call length
- Browser compatibility variations

**Implementation**:

```typescript
// services/voice/CallRecorder.ts

export interface RecordingOptions {
  recordUser: boolean;      // Record user speech
  recordMarcus: boolean;    // Record Marcus speech
  stereoMix: boolean;       // Separate channels vs mixed
  format: 'webm' | 'ogg';
}

export class CallRecorder {
  private userRecorder: MediaRecorder | null = null;
  private marcusRecorder: MediaRecorder | null = null;
  private mixedRecorder: MediaRecorder | null = null;
  
  private userChunks: Blob[] = [];
  private marcusChunks: Blob[] = [];
  private mixedChunks: Blob[] = [];
  
  private audioContext: AudioContext | null = null;
  private mixDest: MediaStreamAudioDestinationNode | null = null;
  
  /**
   * Start recording
   */
  async startRecording(
    userStream: MediaStream,
    options: RecordingOptions
  ): Promise<void> {
    this.audioContext = new AudioContext();
    
    if (options.stereoMix) {
      // Create stereo mix: user = left, Marcus = right
      this.mixDest = this.audioContext.createMediaStreamDestination();
      
      // User to left channel
      const userSource = this.audioContext.createMediaStreamSource(userStream);
      const userPanner = this.audioContext.createStereoPanner();
      userPanner.pan.value = -1; // Full left
      userSource.connect(userPanner).connect(this.mixDest);
      
      // Marcus will be added on speak events
      
      this.mixedRecorder = new MediaRecorder(this.mixDest.stream, {
        mimeType: `audio/${options.format}`
      });
      
      this.mixedRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.mixedChunks.push(e.data);
      };
      
      this.mixedRecorder.start(1000); // Collect data every 1s
    }
    
    if (options.recordUser) {
      this.userRecorder = new MediaRecorder(userStream, {
        mimeType: `audio/${options.format}`
      });
      
      this.userRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.userChunks.push(e.data);
      };
      
      this.userRecorder.start(1000);
    }
  }
  
  /**
   * Add Marcus speech to recording
   */
  captureMarcusSpeech(audioBuffer: AudioBuffer): void {
    if (!this.audioContext || !this.mixDest) return;
    
    // Play Marcus audio to right channel
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const panner = this.audioContext.createStereoPanner();
    panner.pan.value = 1; // Full right
    
    source.connect(panner).connect(this.mixDest);
    source.start();
  }
  
  /**
   * Stop recording and return blobs
   */
  async stopRecording(): Promise<{
    userBlob?: Blob;
    marcusBlob?: Blob;
    mixedBlob?: Blob;
  }> {
    const result: any = {};
    
    // Stop all recorders
    if (this.userRecorder) {
      this.userRecorder.stop();
      await new Promise(resolve => {
        this.userRecorder!.onstop = resolve;
      });
      result.userBlob = new Blob(this.userChunks, { 
        type: `audio/${this.userRecorder.mimeType}` 
      });
    }
    
    if (this.mixedRecorder) {
      this.mixedRecorder.stop();
      await new Promise(resolve => {
        this.mixedRecorder!.onstop = resolve;
      });
      result.mixedBlob = new Blob(this.mixedChunks, { 
        type: `audio/${this.mixedRecorder.mimeType}` 
      });
    }
    
    // Cleanup
    this.audioContext?.close();
    this.reset();
    
    return result;
  }
  
  /**
   * Download recording as file
   */
  downloadRecording(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  private reset(): void {
    this.userChunks = [];
    this.marcusChunks = [];
    this.mixedChunks = [];
    this.userRecorder = null;
    this.marcusRecorder = null;
    this.mixedRecorder = null;
    this.audioContext = null;
    this.mixDest = null;
  }
}
```

**Integration with MarcusVoiceManager**:

```typescript
// In MarcusVoiceManager.ts

import { CallRecorder } from './CallRecorder';

export class MarcusVoiceManager {
  private recorder: CallRecorder | null = null;
  
  async startListening(recordCall: boolean = false): Promise<void> {
    // ... existing code ...
    
    if (recordCall) {
      this.recorder = new CallRecorder();
      await this.recorder.startRecording(this.mediaStream!, {
        recordUser: true,
        recordMarcus: true,
        stereoMix: true,
        format: 'webm'
      });
    }
  }
  
  async speak(text: string, options: SpeakOptions): Promise<void> {
    // ... existing TTS code ...
    
    // Capture Marcus speech in recording
    if (this.recorder && audioBuffer) {
      this.recorder.captureMarcusSpeech(audioBuffer);
    }
  }
  
  async cleanup(): Promise<void> {
    if (this.recorder) {
      const recordings = await this.recorder.stopRecording();
      
      // Auto-download or save to localStorage/IndexedDB
      if (recordings.mixedBlob) {
        const timestamp = new Date().toISOString();
        this.recorder.downloadRecording(
          recordings.mixedBlob, 
          `marcus-call-${timestamp}.webm`
        );
      }
      
      this.recorder = null;
    }
    
    // ... existing cleanup ...
  }
}
```

### Option 2: Server-Side Recording

**Stream audio to backend** for server-side recording and storage.

**Pros**:
- Centralized storage
- Better format conversion (MP3, AAC)
- Can process recordings (transcription, analysis)
- Persistent storage for later review

**Cons**:
- Requires backend infrastructure
- Higher latency and bandwidth usage
- Privacy concerns (audio stored on server)
- More complex implementation

**Would require**:
- WebSocket or HTTP streaming to Flask backend
- Server-side audio processing (FFmpeg)
- Database/S3 storage
- Security/privacy considerations

## Recommended Approach

**Phase 1: Client-Side Recording (3-4 hours)**
- Add CallRecorder service
- Integrate with MarcusVoiceManager
- Auto-download recordings after calls
- Store metadata in localStorage

**Phase 2: Storage & Playback (2-3 hours)**
- Save recordings to IndexedDB (browser storage)
- Add playback UI in post-call view
- Link recordings to call sessions

**Phase 3: Server Upload (Optional, 4-6 hours)**
- Upload recordings to backend after call
- Store in S3 or file storage
- Associate with user account
- Add privacy controls

## File Size Estimates

**WebM Opus codec** (recommended for voice):
- ~12 KB/second = ~720 KB/minute
- 5 minute call = ~3.6 MB
- 20 minute call = ~14.4 MB

**Storage considerations**:
- IndexedDB: ~50 MB typical limit per domain
- Can store ~10-15 typical practice calls locally
- Auto-cleanup after 30 days or manual deletion

## Privacy & Security

**User controls**:
- Opt-in recording (toggle in settings)
- Clear indication when recording is active (red dot)
- Ability to delete recordings immediately
- Local-first approach (no server upload by default)

**Compliance**:
- GDPR: User controls their data, can delete anytime
- Consent: Clear notification before recording starts
- Retention: Auto-delete after X days

## Timestamp-Synchronized Moment Playback

**Core Feature**: Automatically link critical moments to their exact timestamps in the recording.

### How It Works

```typescript
// 1. Track timestamps as conversation happens
interface ConversationExchange {
  turnNumber: number;
  speaker: 'user' | 'marcus';
  text: string;
  timestampMs: number;  // Milliseconds from call start
  audioTimestamp: number; // Seconds into recording (for playback)
}

// 2. Critical moments reference their turn numbers
interface CriticalMoment {
  turnNumber: number;
  timestamp: number;  // When this moment occurred
  type: 'missed_opportunity' | 'positive_shift' | ...;
  userMessage: string;
  marcusResponse: string;
  // NEW: Audio playback info
  audioTimestamp?: number;  // Seconds into recording
  audioDuration?: number;   // Duration of this exchange
}

// 3. Link moments to audio when generating feedback
function linkMomentsToAudio(
  moments: CriticalMoment[],
  exchanges: ConversationExchange[],
  recordingStartTime: number
): CriticalMoment[] {
  return moments.map(moment => {
    // Find the exchange pair for this turn
    const userExchange = exchanges.find(
      e => e.turnNumber === moment.turnNumber && e.speaker === 'user'
    );
    const marcusExchange = exchanges.find(
      e => e.turnNumber === moment.turnNumber && e.speaker === 'marcus'
    );
    
    if (!userExchange) return moment;
    
    // Calculate audio timestamp (seconds from recording start)
    const audioTimestamp = (userExchange.timestampMs - recordingStartTime) / 1000;
    
    // Calculate duration (user speech + Marcus response)
    const endTime = marcusExchange 
      ? marcusExchange.timestampMs 
      : userExchange.timestampMs + 3000; // Estimate 3s if no response
    const audioDuration = (endTime - userExchange.timestampMs) / 1000;
    
    return {
      ...moment,
      audioTimestamp,
      audioDuration
    };
  });
}
```

### Implementation in CallRecorder

**Track recording start time**:

```typescript
export class CallRecorder {
  private recordingStartTime: number = 0;
  
  async startRecording(
    userStream: MediaStream,
    options: RecordingOptions
  ): Promise<void> {
    this.recordingStartTime = performance.now();
    // ... existing setup ...
  }
  
  getRecordingStartTime(): number {
    return this.recordingStartTime;
  }
  
  /**
   * Convert conversation timestamp to audio playback position
   */
  conversationToAudioTimestamp(conversationMs: number): number {
    return (conversationMs - this.recordingStartTime) / 1000;
  }
}
```

### Integration with CharmerController

**Store timestamps for each exchange**:

```typescript
// In CharmerController.tsx - when processing user input
const processUserInput = useCallback(async (userText: string) => {
  const exchangeTimestamp = performance.now() - callStartTimeRef.current;
  
  // Add to conversation with timestamp
  const userExchange: ConversationExchange = {
    id: `user-${Date.now()}`,
    turnNumber: currentTurnNumber,
    speaker: 'user',
    text: userText,
    timestampMs: exchangeTimestamp,
    timestamp: exchangeTimestamp / 1000
  };
  
  // Track in conversation tracker
  conversationTrackerRef.current?.addExchange(userExchange);
  
  // ... generate Marcus response ...
  
  const marcusExchange: ConversationExchange = {
    id: `marcus-${Date.now()}`,
    turnNumber: currentTurnNumber,
    speaker: 'marcus',
    text: aiResponse.content,
    timestampMs: performance.now() - callStartTimeRef.current,
    timestamp: (performance.now() - callStartTimeRef.current) / 1000
  };
  
  conversationTrackerRef.current?.addExchange(marcusExchange);
}, []);
```

**Link moments to audio on call end**:

```typescript
// When generating post-call feedback
const endCall = async () => {
  // Get recording
  const recordingBlob = await recorder?.stopRecording();
  
  // Get conversation exchanges
  const exchanges = conversationTrackerRef.current?.getExchanges() || [];
  
  // Detect critical moments
  const moments = detectCriticalMoments(exchanges);
  
  // Link moments to audio timestamps
  const momentsWithAudio = linkMomentsToAudio(
    moments,
    exchanges,
    recorder?.getRecordingStartTime() || 0
  );
  
  // Save for playback
  setMomentFeedbackData({
    moments: momentsWithAudio,
    recording: recordingBlob,
    exchanges
  });
};
```

## UI Integration

**Recording indicator** during call:
```
[🔴 Recording] 05:32
```

**Post-call playback with moment navigation**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📼 CALL RECORDING + CRITICAL MOMENTS

Duration: 5:32
Size: 3.8 MB
Format: WebM

[▶️ Play Full Call]  [⬇️ Download]  [🗑️ Delete]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CRITICAL MOMENTS (Jump to Audio)

[★] Turn 3 - Best Moment (1:24)
    "Great discovery question" 
    [▶️ Play This Moment (8s)]

[✗] Turn 6 - Missed Opportunity (2:45)  ⚠️ CRUCIAL
    "Prospect mentioned budget but you didn't explore"
    [▶️ Play This Moment (12s)]

[‼] Turn 9 - Blunder (4:03)
    "Talked for 43 seconds without asking question"
    [▶️ Play This Moment (45s)]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 FULL TRANSCRIPT (Synchronized)

[User - 0:00] Hey Marcus, this is...
       [▶️ Jump to 0:00]
[Marcus - 0:03] Yeah? Who's this?
       [▶️ Jump to 0:03]
[User - 0:06] It's Sarah from...
       [▶️ Jump to 0:06]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Enhanced MomentCard Component

```typescript
interface MomentCardProps {
  moment: KeyMoment;
  isSelected: boolean;
  onClick: () => void;
  onPlayMoment?: (timestamp: number, duration: number) => void;
  recordingBlob?: Blob; // Audio file
}

export const MomentCard: React.FC<MomentCardProps> = ({ 
  moment, 
  isSelected, 
  onClick,
  onPlayMoment,
  recordingBlob
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const handlePlayMoment = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger card selection
    
    if (!recordingBlob || !moment.audioTimestamp) return;
    
    // Create audio element if needed
    if (!audioRef.current && recordingBlob) {
      const url = URL.createObjectURL(recordingBlob);
      audioRef.current = new Audio(url);
    }
    
    if (audioRef.current) {
      // Jump to moment timestamp
      audioRef.current.currentTime = moment.audioTimestamp;
      
      // Play for duration of this moment (or until user stops)
      setIsPlaying(true);
      audioRef.current.play();
      
      // Auto-stop after moment duration
      if (moment.audioDuration) {
        setTimeout(() => {
          audioRef.current?.pause();
          setIsPlaying(false);
        }, moment.audioDuration * 1000);
      }
      
      // Or notify parent to control playback
      if (onPlayMoment) {
        onPlayMoment(moment.audioTimestamp, moment.audioDuration || 10);
      }
    }
  };
  
  return (
    <div className="moment-card">
      {/* ... existing card content ... */}
      
      {/* Play button for this specific moment */}
      {moment.audioTimestamp !== undefined && recordingBlob && (
        <button
          onClick={handlePlayMoment}
          className="play-moment-btn"
          title={`Play this moment (${moment.audioDuration?.toFixed(0)}s)`}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play Moment'}
        </button>
      )}
    </div>
  );
};
```

### Centralized Audio Player

For better UX, use a single audio player that all moments control:

```typescript
// In MarcusPostCallMoments.tsx or similar
const AudioPlayer: React.FC<{
  recordingBlob: Blob;
  moments: CriticalMoment[];
}> = ({ recordingBlob, moments }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMoment, setActiveMoment] = useState<CriticalMoment | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    const url = URL.createObjectURL(recordingBlob);
    audioRef.current = new Audio(url);
    
    audioRef.current.addEventListener('timeupdate', () => {
      setCurrentTime(audioRef.current!.currentTime);
    });
    
    audioRef.current.addEventListener('loadedmetadata', () => {
      setDuration(audioRef.current!.duration);
    });
    
    return () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
    };
  }, [recordingBlob]);
  
  const playMoment = (moment: CriticalMoment) => {
    if (!audioRef.current || !moment.audioTimestamp) return;
    
    audioRef.current.currentTime = moment.audioTimestamp;
    audioRef.current.play();
    setIsPlaying(true);
    setActiveMoment(moment);
    
    // Highlight the moment being played
  };
  
  const seekTo = (timestamp: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timestamp;
    }
  };
  
  return (
    <div className="audio-player">
      {/* Waveform or progress bar */}
      <div className="progress-bar">
        <div 
          className="progress" 
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        
        {/* Moment markers on timeline */}
        {moments.map(moment => (
          <div
            key={moment.id}
            className="moment-marker"
            style={{ 
              left: `${(moment.audioTimestamp! / duration) * 100}%` 
            }}
            onClick={() => playMoment(moment)}
            title={moment.title}
          >
            {moment.classification === 'best_moment' ? '★' : 
             moment.classification === 'blunder' ? '‼' : '●'}
          </div>
        ))}
      </div>
      
      {/* Playback controls */}
      <div className="controls">
        <button onClick={() => audioRef.current?.play()}>▶️</button>
        <button onClick={() => audioRef.current?.pause()}>⏸️</button>
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        
        {activeMoment && (
          <span className="playing-moment">
            Playing: {activeMoment.title}
          </span>
        )}
      </div>
    </div>
  );
};
```

## Browser Compatibility

**MediaRecorder support**:
- ✅ Chrome/Edge: Excellent (WebM, Ogg)
- ✅ Firefox: Excellent (WebM, Ogg)
- ⚠️ Safari: Limited (WebM support added in Safari 14.1+)
- ❌ Older browsers: Polyfill required

**Fallback strategy**:
- Check MediaRecorder support before offering recording
- Graceful degradation: transcript-only mode
- Progressive enhancement: add recording if supported

## Implementation Checklist

**Core Recording** (3 hours):
- [ ] Create CallRecorder service
- [ ] Add MediaRecorder setup with stereo mix
- [ ] Integrate with MarcusVoiceManager
- [ ] Test WebM recording quality

**Storage & Download** (1 hour):
- [ ] Auto-download after call ends
- [ ] Save to IndexedDB with metadata
- [ ] Add manual download button

**UI Integration** (2 hours):
- [ ] Recording indicator during call
- [ ] Post-call playback controls
- [ ] Sync with transcript (click line → jump to audio)
- [ ] Delete/manage recordings

**Polish** (1 hour):
- [ ] Privacy controls (opt-in toggle)
- [ ] Browser compatibility checks
- [ ] Error handling (out of storage, etc.)
- [ ] File size warnings for long calls

## Next Steps

1. **Decide on approach**: Client-side only vs eventual server upload
2. **Build CallRecorder service**: Core MediaRecorder wrapper
3. **Add to MarcusVoiceManager**: Capture user + Marcus audio
4. **Test with real calls**: Verify quality and file sizes
5. **Add UI controls**: Recording toggle, playback, download

---

**Current Status**: ❌ Not implemented  
**Recommended**: Start with client-side recording (Option 1)  
**Estimated Effort**: 3-4 hours for basic version  
**User Value**: High - enables self-review and quality improvement
