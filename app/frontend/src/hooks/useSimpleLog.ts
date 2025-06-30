import { useState, useCallback } from "react";

interface LogMessage {
  content: string;
  type: "log" | "error" | "warn";
}

export const useSimpleLog = (source: string) => {
  const [messages, setMessages] = useState<LogMessage[]>([]);

  const log = useCallback(
    (message: string, type: "log" | "error" | "warn" = "log", ...args: any[]) => {
      const fullMessage = `[${source}] ${message}`;
      console[type](fullMessage, ...args);
      setMessages((prev) => [...prev, { content: fullMessage, type }]);
    },
    [source]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { log, messages, clearMessages };
}; 