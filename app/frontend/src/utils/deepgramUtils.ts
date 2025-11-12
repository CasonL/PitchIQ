// Audio processing utilities

export function createAudioBuffer(audioContext: AudioContext, data: ArrayBuffer, sampleRate = 24000): AudioBuffer | undefined {
  const audioDataView = new Int16Array(data);
  if (audioDataView.length === 0) {
    console.error("Received audio data is empty.");
    return;
  }

  const buffer = audioContext.createBuffer(1, audioDataView.length, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Convert linear16 PCM to float [-1, 1]
  for (let i = 0; i < audioDataView.length; i++) {
    channelData[i] = audioDataView[i] / 32768;
  }

  return buffer;
}

export function playAudioBuffer(
  audioContext: AudioContext, 
  buffer: AudioBuffer, 
  startTimeRef: React.MutableRefObject<number>, 
  analyzer: AnalyserNode
): AudioBufferSourceNode {
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(analyzer);
  analyzer.connect(audioContext.destination);

  const currentTime = audioContext.currentTime;
  if (startTimeRef.current < currentTime) {
    startTimeRef.current = currentTime;
  }

  source.start(startTimeRef.current);
  startTimeRef.current += buffer.duration;

  return source;
}

export function downsample(buffer: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
  if (fromSampleRate === toSampleRate) {
    return buffer;
  }
  const sampleRateRatio = fromSampleRate / toSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0,
      count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

export function convertFloat32ToInt16(buffer: Float32Array): ArrayBuffer {
  let l = buffer.length;
  const buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7fff;
  }
  return buf.buffer;
}

export const normalizeVolume = (analyzer: AnalyserNode, dataArray: Uint8Array, normalizationFactor: number): number => {
  analyzer.getByteFrequencyData(dataArray);
  const sum = dataArray.reduce((acc, val) => acc + val, 0);
  const average = sum / dataArray.length;
  return Math.min(average / normalizationFactor, 1);
};

export const sendMicToSocket = (socket: WebSocket) => (event: AudioProcessingEvent) => {
  const inputData = event?.inputBuffer?.getChannelData(0);
  if (!inputData) return;
  
  // Check if socket is still open before sending
  if (socket.readyState !== WebSocket.OPEN) {
    console.warn("WebSocket not open, skipping audio data");
    return;
  }
  
  const downsampledData = downsample(inputData, 48000, 16000);
  const audioDataToSend = convertFloat32ToInt16(downsampledData);
  
  try {
    socket.send(audioDataToSend);
  } catch (error) {
    console.error("Error sending audio data to WebSocket:", error);
  }
};

export const sendSocketMessage = (socket: WebSocket, message: any) => {
  socket.send(JSON.stringify(message));
};

export const sendKeepAliveMessage = (socket: WebSocket) => () => {
  sendSocketMessage(socket, { type: "KeepAlive" });
};
