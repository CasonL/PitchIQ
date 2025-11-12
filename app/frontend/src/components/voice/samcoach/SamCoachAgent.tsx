import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { playHaptic } from "@/utils/haptics";
import { useSamCoachAgent } from "./useSamCoachAgent";

export interface SamCoachAgentProps {
  onDataCollected?: (data: { product_service: string; target_market: string }) => void;
  onConnectionStateChange?: (state: { connected: boolean; connecting: boolean }) => void;
  autoStart?: boolean;
}

const SamCoachAgent: React.FC<SamCoachAgentProps> = ({ onDataCollected, onConnectionStateChange, autoStart }) => {
  const {
    initializing,
    connected,
    connecting,
    sessionEnded,
    inactivityWarning,
    transcript,
    muted,
    isSessionActive,
    stopSession,
    restartSession,
    toggleMute,
  } = useSamCoachAgent({ onDataCollected, onConnectionStateChange, autoStart, logPrefix: "SamCoach" });

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4">
      <div className="w-full max-w-md p-6 bg-white border border-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-2">
            {initializing ? (
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected ? "bg-green-500" : connecting ? "bg-yellow-500 animate-pulse" : sessionEnded ? "bg-gray-400" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-medium text-gray-600">
                  {connected ? (muted ? "Connected (Muted)" : "Connected") : connecting ? "Connecting..." : sessionEnded ? "Session Ended" : "Disconnected"}
                </span>
              </>
            )}
          </div>
        </div>

        {inactivityWarning && connected && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-orange-700 font-medium">Session will end in 15 seconds due to inactivity</span>
            </div>
          </div>
        )}

        {transcript && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{transcript}</p>
          </div>
        )}

        <div className="flex justify-center items-center space-x-3">
          {!initializing && !sessionEnded ? (
            <>
              <Button
                onClick={() => {
                  toggleMute();
                  playHaptic("light");
                }}
                size="sm"
                className={`w-10 h-10 p-0 rounded-xl border border-gray-900 font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                  muted ? "bg-red-100 hover:bg-red-200 text-red-700" : "bg-white hover:bg-gray-100 text-black"
                }`}
                disabled={!isSessionActive}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              <Button
                onClick={() => {
                  playHaptic("medium");
                  stopSession();
                }}
                size="lg"
                className="px-8 py-3 bg-white hover:bg-red-100 text-black border border-gray-900 rounded-xl font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
                disabled={!isSessionActive}
              >
                End Call
              </Button>
            </>
          ) : sessionEnded && !initializing ? (
            <Button
              onClick={() => {
                playHaptic("medium");
                restartSession();
              }}
              size="lg"
              className="px-8 py-3 bg-white hover:bg-blue-100 text-black border border-gray-900 rounded-xl font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              Start Again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SamCoachAgent;
