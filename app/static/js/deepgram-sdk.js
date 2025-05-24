/**
 * Simple Deepgram Mock SDK for PitchIQ
 * A minimal implementation that mimics the Deepgram SDK interface
 * but falls back to native browser WebSpeechAPI
 */

(function(root) {
    'use strict';

    // Mock LiveTranscriptionEvents
    const LiveTranscriptionEvents = {
        Open: 'open',
        Close: 'close',
        Transcript: 'transcript',
        Metadata: 'metadata',
        Error: 'error',
        SpeechStarted: 'speechStarted',
        UtteranceEnd: 'utteranceEnd'
    };

    // Mock ConnectionState
    const LiveConnectionState = {
        CONNECTING: 'CONNECTING',
        OPEN: 'OPEN',
        CLOSING: 'CLOSING',
        CLOSED: 'CLOSED'
    };

    // Mock LiveClient (connection to Deepgram)
    class LiveClient {
        constructor(options) {
            this.options = options || {};
            this.state = LiveConnectionState.CLOSED;
            this.recognition = null;
            this.eventListeners = {};
            this.stream = null;
            this.mediaRecorder = null;
            
            // Initialize WebSpeech API if available
            this._initWebSpeech();
        }

        _initWebSpeech() {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                console.error('Web Speech API is not supported in this browser');
                return false;
            }
            
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.options.language || 'en-US';
            
            // Set up recognition event handlers
            this.recognition.onstart = () => {
                this.state = LiveConnectionState.OPEN;
                this._triggerEvent(LiveTranscriptionEvents.Open);
                console.log('Web Speech recognition started');
            };
            
            this.recognition.onend = () => {
                this.state = LiveConnectionState.CLOSED;
                this._triggerEvent(LiveTranscriptionEvents.Close, { code: 1000, reason: 'Normal closure' });
                console.log('Web Speech recognition ended');
            };
            
            this.recognition.onresult = (event) => {
                const last = event.results.length - 1;
                const transcript = event.results[last][0].transcript;
                const is_final = event.results[last].isFinal;
                
                // Create a Deepgram-like transcript object
                const transcriptData = {
                    channel: {
                        alternatives: [
                            {
                                transcript: transcript,
                                confidence: event.results[last][0].confidence
                            }
                        ]
                    },
                    is_final: is_final,
                    speech_final: is_final,
                    start: Date.now() - 1000, // Fake timestamp
                    duration: 1000 // Fake duration
                };
                
                this._triggerEvent(LiveTranscriptionEvents.Transcript, transcriptData);
                
                if (is_final) {
                    const utteranceEndData = {
                        last_word_end: Date.now(),
                        channel: 0
                    };
                    this._triggerEvent(LiveTranscriptionEvents.UtteranceEnd, utteranceEndData);
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Web Speech recognition error:', event.error);
                this._triggerEvent(LiveTranscriptionEvents.Error, {
                    message: event.error,
                    type: 'Web Speech API Error'
                });
            };
            
            this.recognition.onspeechstart = () => {
                this._triggerEvent(LiveTranscriptionEvents.SpeechStarted);
            };
            
            return true;
        }

        // Add event listener (mimics Deepgram SDK interface)
        on(event, callback) {
            if (!this.eventListeners[event]) {
                this.eventListeners[event] = [];
            }
            this.eventListeners[event].push(callback);
            return this;
        }

        // Method to actually start listening (part of Deepgram SDK interface)
        start() {
            if (!this.recognition) {
                this._triggerEvent(LiveTranscriptionEvents.Error, {
                    message: 'Speech recognition not supported',
                    type: 'Browser Support Error'
                });
                return;
            }
            
            try {
                this.recognition.start();
                
                // Access the microphone to get stream for visualizer
                navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                    .then(stream => {
                        this.stream = stream;
                    })
                    .catch(err => {
                        console.error('Error accessing microphone:', err);
                    });
            } catch (error) {
                this._triggerEvent(LiveTranscriptionEvents.Error, {
                    message: error.message,
                    type: 'Recognition Start Error'
                });
            }
        }

        // Stop listening (part of Deepgram SDK interface)
        finish() {
            if (this.recognition) {
                try {
                    this.recognition.stop();
                } catch (error) {
                    console.error('Error stopping recognition:', error);
                }
            }
            
            // Stop the stream for visualizer
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
        }

        // Get the stream for visualizer
        getStream() {
            return this.stream;
        }

        // Trigger registered event callbacks
        _triggerEvent(event, data) {
            if (this.eventListeners[event]) {
                this.eventListeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error('Error in event listener callback:', error);
                    }
                });
            }
        }
    }

    // Create factory functions for the SDK
    function createClient(apiKey) {
        console.log('Creating Deepgram client with API key:', apiKey ? apiKey.substring(0, 5) + '...' : 'none');
        return {
            listen: {
                live: function(options) {
                    console.log('Creating live transcription with options:', options);
                    const client = new LiveClient(options);
                    // Immediately start listening when the connection is created
                    setTimeout(() => client.start(), 100);
                    return client;
                }
            }
        };
    }

    // Export the SDK to the global scope
    root.Deepgram = {
        createClient: createClient,
        LiveTranscriptionEvents: LiveTranscriptionEvents,
        LiveConnectionState: LiveConnectionState
    };

})(typeof self !== 'undefined' ? self : this);

console.log('Deepgram SDK mock loaded successfully');

