import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DeepgramVoiceAgent from "../voice/DeepgramVoiceAgent";

/**********************************************************************
 * Dashboard card wrapper for the modular Deepgram Voice Agent
 *********************************************************************/

const DeepgramVoiceAgentCard: React.FC = () => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🎤 Deepgram Voice Agent</span>
          <Badge variant="outline">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Real-time voice-to-voice AI conversation using Deepgram's Agent API.
          Click "Start Voice Chat" to begin speaking with the AI.
        </p>
        
        <Separator />
        
        {/* Use the modular component */}
        <DeepgramVoiceAgent
          showLogs={true}
          showTranscript={true}
          className="w-full"
          buttonVariant="default"
          compact={false}
        />
      </CardContent>
    </Card>
  );
};

export default DeepgramVoiceAgentCard;
