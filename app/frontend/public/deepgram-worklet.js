const DEBUG = false;

class DeepgramWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleCount = 0;
    this.debugCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    // Debug: Log every 100th frame to see if we're getting audio
    if (DEBUG) {
      this.debugCount++;
      if (this.debugCount % 100 === 0) {
        const maxSample = Math.max(...input[0].map(Math.abs));
        // eslint-disable-next-line no-console
        console.log(`🎤 Worklet processing audio - max sample: ${maxSample.toFixed(4)}`);
      }
    }

    const channelCount = input.length;
    const frameCount = input[0].length;
    
    // Convert multi-channel float32 to mono int16
    const buffer = new Int16Array(frameCount);
    
    for (let frame = 0; frame < frameCount; frame++) {
      let sample = 0;
      
      // Mix all channels to mono
      for (let channel = 0; channel < channelCount; channel++) {
        sample += input[channel][frame];
      }
      
      // Average channels and apply gain
      sample = sample / channelCount;
      
      // Apply moderate gain (1.4x) and convert to int16
      sample = sample * 1.4 * 32767;
      
      // Clamp to int16 range
      buffer[frame] = Math.max(-32768, Math.min(32767, Math.round(sample)));
    }

    // Send the processed audio back to main thread
    this.port.postMessage(buffer.buffer, [buffer.buffer]);
    
    this.sampleCount += frameCount;
    return true;
  }
}

registerProcessor('deepgram-worklet', DeepgramWorklet); 