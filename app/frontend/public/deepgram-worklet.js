class DeepgramWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const mono = input[0];
    
    if (!mono || mono.length === 0) {
      return true;
    }

    // Handle mono streams efficiently (most browsers provide mono when channelCount: 1 is requested)
    const buffer = new Int16Array(mono.length);
    
    for (let i = 0; i < mono.length; i++) {
      // Apply gain and clamp to [-1, 1] range before converting to int16
      const sample = Math.max(-1, Math.min(1, mono[i] * 1.4));
      buffer[i] = Math.round(sample * 32767);
    }

    // Send the processed audio back to main thread
    this.port.postMessage(buffer.buffer, [buffer.buffer]);
    
    this.sampleCount += mono.length;
    return true;
  }
}

registerProcessor('deepgram-processor', DeepgramWorklet); 