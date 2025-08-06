import { useState, useCallback, useRef } from "react";

interface LogMessage {
  content: string;
  type: "log" | "error" | "warn";
}

// Smart filtering for frontend logs
const NOISY_PATTERNS = [
  /🔉.*DG audio/,
  /🔊.*TTS/,
  /📡.*DG.*AgentAudio/,
  /DG audio.*samples/,
  /TTS.*playback/,
  /AgentAudio.*event/,
];

const IMPORTANT_PATTERNS = [
  /error/i,
  /failed/i,
  /warning/i,
  /connected/i,
  /disconnected/i,
  /session.*started/i,
  /session.*ended/i,
];

export const useSimpleLog = (source: string) => {
  const [messages, setMessages] = useState<LogMessage[]>([]);
  const lastLogTime = useRef<{ [key: string]: number }>({});

  const shouldLog = useCallback((message: string, type: "log" | "error" | "warn") => {
    // Always log errors and warnings
    if (type === "error" || type === "warn") return true;
    
    // Always log important patterns
    for (const pattern of IMPORTANT_PATTERNS) {
      if (pattern.test(message)) return true;
    }
    
    // Filter out noisy patterns
    for (const pattern of NOISY_PATTERNS) {
      if (pattern.test(message)) {
        // Rate limit: only log once every 5 seconds for noisy patterns
        const key = pattern.toString();
        const now = Date.now();
        if (lastLogTime.current[key] && now - lastLogTime.current[key] < 5000) {
          return false;
        }
        lastLogTime.current[key] = now;
        return true; // Log the first one and then every 5 seconds
      }
    }
    
    return true; // Log everything else
  }, []);

  const log = useCallback(
    (message: string, type: "log" | "error" | "warn" = "log", ...args: any[]) => {
      if (!shouldLog(message, type)) return;
      
      const fullMessage = `[${source}] ${message}`;
      console[type](fullMessage, ...args);
      setMessages((prev) => [...prev, { content: fullMessage, type }]);
    },
    [source, shouldLog]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { log, messages, clearMessages };
}; 