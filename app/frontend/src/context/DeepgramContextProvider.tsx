"use client";

import { createContext, useContext, useState, useRef, ReactNode, useCallback } from "react";

interface DeepgramContextType {
  socket: WebSocket | undefined;
  socketState: number;
  rateLimited: boolean;
  connectToDeepgram: () => void;
}

const DeepgramContext = createContext<DeepgramContextType | undefined>(undefined);

interface DeepgramContextProviderProps {
  children: ReactNode;
}

const getAuthToken = async (): Promise<string> => {
  const response = await fetch('/api/deepgram/token');
  const data = await response.json();
  return data.token;
};

const sendKeepAliveMessage = (socket: WebSocket) => () => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "KeepAlive" }));
  }
};

const DeepgramContextProvider = ({ children }: DeepgramContextProviderProps) => {
  const [socket, setSocket] = useState<WebSocket | undefined>();
  const [socketState, setSocketState] = useState(-1);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const keepAlive = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;

  const connectToDeepgram = useCallback(async () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Fetch Deepgram token from backend
      const tokenResponse = await fetch('/api/deepgram/token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get Deepgram token: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      const apiKey = tokenData.token || tokenData.key;

      if (!apiKey) {
        throw new Error("No API key received from backend");
      }

      const ws = new WebSocket("wss://agent.deepgram.com/v1/agent/converse", [
        "token",
        apiKey,
      ]);

      ws.onopen = () => {
        console.info("WebSocket connection established");
        setSocket(ws);
        setSocketState(1);
        setReconnectAttempts(0);
        
        // Set up keep alive
        if (keepAlive.current) {
          clearInterval(keepAlive.current);
        }
        keepAlive.current = setInterval(sendKeepAliveMessage(ws), 30000);
      };

      ws.onerror = (event) => {
        console.error("Websocket error", event);
        setSocketState(0);
      };

      ws.onclose = () => {
        console.info("WebSocket closed. Attempting to reconnect...");
        setSocket(undefined);
        setSocketState(0);
        
        if (keepAlive.current) {
          clearInterval(keepAlive.current);
        }
        
        if (reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1);
          setTimeout(connectToDeepgram, 1000);
        }
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "agent_response") {
          console.log("Agent response:", message);
        }
      };
    } catch (error) {
      console.error("Error connecting to Deepgram:", error);
      setSocketState(0);
    }
  }, [socket, reconnectAttempts, maxReconnectAttempts]);

  return (
    <DeepgramContext.Provider
      value={{
        socket,
        socketState,
        rateLimited,
        connectToDeepgram,
      }}
    >
      {children}
    </DeepgramContext.Provider>
  );
};

function useDeepgram() {
  const context = useContext(DeepgramContext);
  if (!context) {
    throw new Error("useDeepgram must be used within a DeepgramContextProvider");
  }
  return context;
}

export { DeepgramContextProvider, useDeepgram };
