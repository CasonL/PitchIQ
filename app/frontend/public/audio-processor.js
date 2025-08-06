// Minimal AudioWorklet that converts incoming Float32 samples to Int16 PCM
// and posts the ArrayBuffer to the main thread.

class PCMWorklet extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      const channel = input[0];
      const i16 = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        // clamp to [-1,1] then scale to 16-bit
        let s = channel[i];
        s = Math.max(-1, Math.min(1, s));
        i16[i] = s * 0x7fff;
      }
      // Transfer the buffer to avoid copy
      this.port.postMessage(i16.buffer, [i16.buffer]);
    }
    return true;
  }
}

registerProcessor('audio-processor', PCMWorklet);
