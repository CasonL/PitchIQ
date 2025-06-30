import { useState, useCallback, useRef } from "react";
import { log } from "@/utils/logger";

interface AudioPlayback {
  isPlaying: boolean;
  play: (data: Int16Array) => void;
  stop: () => void;
}

const useAudioPlayback = (
  audioContextRef: React.RefObject<AudioContext | null>
): AudioPlayback => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioQueue = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const startTimeRef = useRef(0);

  const processQueue = useCallback(() => {
    if (audioQueue.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    const buffer = audioQueue.current.shift();
    if (!buffer || !audioContextRef.current) return;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    source.onended = processQueue;

    const currentTime = audioContextRef.current.currentTime;
    if (startTimeRef.current < currentTime) {
      startTimeRef.current = currentTime;
    }

    source.start(startTimeRef.current);
    startTimeRef.current += buffer.duration;
  }, [audioContextRef]);

  const play = useCallback(
    (data: Int16Array) => {
      if (!audioContextRef.current) {
        log("AudioContext not available. Cannot play audio.", "error");
        return;
      }

      const float32Data = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        float32Data[i] = data[i] / 32768;
      }

      const buffer = audioContextRef.current.createBuffer(
        1,
        float32Data.length,
        audioContextRef.current.sampleRate
      );
      buffer.copyToChannel(float32Data, 0);

      audioQueue.current.push(buffer);

      if (!isPlayingRef.current && audioContextRef.current) {
        startTimeRef.current = audioContextRef.current.currentTime;
        processQueue();
      }
    },
    [processQueue, audioContextRef]
  );

  const stop = useCallback(() => {
    audioQueue.current = [];
    startTimeRef.current = 0;
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      log("Audio playback stopped and queue cleared.");
    }
  }, []);

  return { isPlaying, play, stop };
};

export default useAudioPlayback; 