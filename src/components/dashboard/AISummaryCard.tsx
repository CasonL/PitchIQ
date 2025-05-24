import React, { useState, useEffect } from 'react';

// Add new state for tracking previous responses
const [previousResponses, setPreviousResponses] = useState<{text: string, timestamp: number}[]>([]);

// Add new state variables for contextual questions
const [showThinking, setShowThinking] = useState(false);
const [thinkingMessageId, setThinkingMessageId] = useState<string | null>(null);
const [isWaitingForFollowUp, setIsWaitingForFollowUp] = useState<boolean>(false);
const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);

// Add auto-scroll effect when messages change
useEffect(() => {
} 