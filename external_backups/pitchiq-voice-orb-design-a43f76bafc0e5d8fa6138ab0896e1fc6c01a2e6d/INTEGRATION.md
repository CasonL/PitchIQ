# Voice Orb Integration Guide

This document outlines how to integrate the voice orb component into the main PitchIQ codebase.

## Components to Copy

1. **VoiceOrb.tsx** - The core canvas-based visualization
2. **ChatInterface.tsx** - The container for the voice interaction

## Integration Steps

### 1. Copy Core Components

Copy these files to your main project:

- `src/components/VoiceOrb.tsx` → Core visualization component
- `src/components/ChatInterface.tsx` → Container for voice interactions

### 2. Add Required Dependencies

Ensure your main project has these dependencies:
- TailwindCSS
- lucide-react (for icons)
- shadcn/ui components (Button, Sheet)

### 3. Update Your Routes

In your main application, add a route for the chat interface:

```tsx
// In your router configuration
<Route path="/chat" element={<Chat />} />
```

Create a simple Chat.tsx wrapper page:

```tsx
import ChatInterface from '../components/ChatInterface';

const Chat = () => {
  return (
    <div className="flex flex-col h-screen bg-white text-slate-900">
      <ChatInterface />
    </div>
  );
};

export default Chat;
```

### 4. Connect to Your API

Modify the ChatInterface.tsx to connect with your backend:

```typescript
// Add these functions where appropriate

// When user has finished speaking
const handleUserSpeechEnd = async (transcript) => {
  setIsListening(false);
  if (transcript) {
    addMessage(transcript, true);
    await sendToBackend(transcript);
  }
};

// Send to your backend and handle response
const sendToBackend = async (userMessage) => {
  try {
    setIsSpeaking(true);
    
    // Replace with your actual API call
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    });
    
    const data = await response.json();
    
    if (data.response) {
      addMessage(data.response, false);
      // Optional: Text-to-speech with the response
      speakResponse(data.response);
    }
  } catch (error) {
    console.error('Error communicating with backend:', error);
    toast({
      title: "Error",
      description: "Failed to communicate with the server.",
      variant: "destructive"
    });
  } finally {
    setIsSpeaking(false);
  }
};

// Optional: Implement text-to-speech
const speakResponse = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = volume;
    
    // Optional event handlers
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }
};
```

### 5. Implement Speech Recognition

Add speech-to-text functionality:

```typescript
// In the startListening function of ChatInterface.tsx

// Initialize Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');
      
    // Update UI with interim results if needed
    if (event.results[0].isFinal) {
      handleUserSpeechEnd(transcript);
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    stopListening();
  };
  
  recognition.start();
} else {
  toast({
    title: "Not supported",
    description: "Speech recognition is not supported in this browser",
    variant: "destructive"
  });
}
```

### 6. Add Metrics Integration

Replace the placeholder metrics with real data:

```typescript
// In ChatInterface.tsx, update the metrics section

// Example metrics data structure
const [metrics, setMetrics] = useState({
  clarity: 0,
  confidence: 0,
  engagement: 0,
  keyPoints: 0
});

// Update when you receive feedback from backend
const updateMetrics = (data) => {
  setMetrics({
    clarity: data.clarity || 0,
    confidence: data.confidence || 0,
    engagement: data.engagement || 0,
    keyPoints: data.keyPointsHit || 0
  });
};

// Then in your metrics display section
<div className="flex justify-between text-xs mb-1">
  <span className="text-slate-500">Clarity</span>
  <span className="text-slate-700 font-medium">
    {metrics.clarity ? `${Math.round(metrics.clarity * 100)}%` : '--'}
  </span>
</div>
<div className="w-full bg-slate-100 rounded-full h-1.5">
  <div className="bg-red-600 h-1.5 rounded-full" style={{ 
    width: `${metrics.clarity * 100}%` 
  }}></div>
</div>
```

## Customization Options

1. **Color Scheme**: Edit the gradient colors in VoiceOrb.tsx to match your brand
2. **Size & Responsiveness**: Adjust the container div sizes in the ChatInterface.tsx
3. **Animation Speed**: Modify the `transitionSpeed` value in VoiceOrb.tsx

## Performance Considerations

1. The canvas animation uses requestAnimationFrame, which is efficient but can use CPU
2. For mobile devices, consider reducing animation complexity
3. Ensure audio resources are properly cleaned up when unmounting

## Browser Compatibility

- Web Audio API: Chrome 14+, Firefox 23+, Safari 6+, Edge 12+
- Canvas API: All modern browsers
- Web Speech API: Chrome, Edge, Safari (with varying levels of support)

## Troubleshooting

- If audio fails to initialize, check microphone permissions
- For HTTPS requirements, use a secure context for development
- Canvas performance issues may require reducing animation details 