/**
 * Voice-to-voice.js - Handling voice interaction for PitchIQ
 * This file provides integration between voice recognition and voice synthesis
 */

// Voice recognition manager instance
let voiceRecognition = null;
let voiceEnabled = false;
let synthesisVoice = null;

// Initialize voice capabilities
document.addEventListener('DOMContentLoaded', function() {
    console.log('Voice-to-voice module loaded');
    
    // Initialize toggle button if it exists
    const toggleVoiceBtn = document.getElementById('toggleVoiceBtn');
    const toggleVoiceText = document.getElementById('toggleVoiceText');
    
    if (toggleVoiceBtn) {
        toggleVoiceBtn.addEventListener('click', function() {
            voiceEnabled = !voiceEnabled;
            toggleVoiceText.textContent = voiceEnabled ? 'Disable Voice' : 'Enable Voice';
            toggleVoiceBtn.setAttribute('aria-pressed', voiceEnabled);
            
            // Save preference
            localStorage.setItem('voiceEnabled', voiceEnabled);
            
            console.log(`Voice responses ${voiceEnabled ? 'enabled' : 'disabled'}`);
        });
        
        // Load saved preference
        const savedPreference = localStorage.getItem('voiceEnabled');
        if (savedPreference !== null) {
            voiceEnabled = savedPreference === 'true';
            toggleVoiceText.textContent = voiceEnabled ? 'Disable Voice' : 'Enable Voice';
            toggleVoiceBtn.setAttribute('aria-pressed', voiceEnabled);
        }
    }
    
    // Initialize voice synthesis
    if ('speechSynthesis' in window) {
        console.log('Voice synthesis supported');
        
        // Get available voices
        function loadVoices() {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                // Prefer English voices
                synthesisVoice = voices.find(voice => 
                    voice.lang.includes('en-') && voice.name.includes('Female')
                ) || voices[0];
                
                console.log(`Selected voice: ${synthesisVoice.name}`);
            }
        }
        
        // Load voices (Chrome loads them asynchronously)
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
        
        loadVoices();
    } else {
        console.warn('Voice synthesis not supported in this browser');
    }
});

// Speak text if voice is enabled
function speakResponse(text) {
    if (!voiceEnabled || !('speechSynthesis' in window) || !synthesisVoice) {
        return;
    }
    
    // Clean up text - remove markdown and code blocks
    const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code example omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/\n\n/g, '. ')
        .replace(/\n/g, ' ');
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.voice = synthesisVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Speak
    window.speechSynthesis.speak(utterance);
}

// Cancel speaking
function stopSpeaking() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

// Export functions for use in other modules
window.VoiceToVoice = {
    speakResponse,
    stopSpeaking,
    isVoiceEnabled: () => voiceEnabled
}; 