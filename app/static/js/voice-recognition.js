// Voice Recognition Manager for PitchIQ using Web Speech API
// Uses UMD pattern for better compatibility

// Debug logging to verify script loading
console.log('Loading VoiceRecognitionManager with Deepgram integration...');
console.log('Deepgram SDK global availability:', typeof window.deepgram !== 'undefined');

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module
        define(['deepgram'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('deepgram'));
    } else {
        // Browser globals (root is window)
        // In browser environments, Deepgram should be loaded separately
        root.VoiceRecognitionManager = factory(root.Deepgram);
    }
}(typeof self !== 'undefined' ? self : this, function(Deepgram) {
    'use strict';
    
    // Debug logging
    console.log('Initializing VoiceRecognitionManager factory');
    console.log('Deepgram parameter:', Deepgram);

    /**
     * Voice Recognition Manager for PitchIQ
     * Handles microphone capture and voice recognition
     */
    class VoiceRecognitionManager {
        constructor(options = {}) {
            // Store user options
            this.options = options;
            
            // SDK related
            this.dgClient = null;
            this.dgConnection = null;
            this.apiKey = null; // Will hold the API key

            // State and Callbacks
            this.isRecording = false;
            this.isInitialized = false;
            this.isInitializing = false; // To prevent multiple initializations
            this.currentLanguage = this.options.language || 'en'; // Default language
            this.isPremiumUser = this.options.isPremiumUser || false;

            // External callbacks (to update UI etc.)
            this.onTranscriptCallback = null;
            this.onErrorCallback = null;
            this.onStatusChangeCallback = null;
            this.onAnalyticsCallback = null; // For premium tone analysis

            // Audio visualization
            this.audioContext = null;
            this.analyserNode = null;
            this.visualizerSource = null;
            this.visualizerStream = null; // Keep track of stream used for visualizer
            this.animationFrameId = null;
            this.canvasCtx = null;
            this.canvasElement = null;
            this.mediaRecorder = null; // For Deepgram streaming
            
            console.log(`VoiceRecognitionManager created (Premium: ${this.isPremiumUser})`);
        }

        /**
         * Fetches a temporary API key from the backend.
         * @returns {Promise<string>} The API key.
         */
        async getDeepgramToken() {
            console.log('Fetching Deepgram API token...');
            try {
                // Check if user has premium access
                const isPremiumUser = this.options?.isPremiumUser || false;
                
                if (!isPremiumUser) {
                    console.log('Using mock token for free tier (Web Speech API fallback)');
                    return "mock-token-for-local-development";
                }
                
                // Use real API endpoint for premium users
                console.log('Fetching real Deepgram token from server endpoint');
                try {
                    const response = await fetch('/api/get_deepgram_token');
                    
                    if (!response.ok) {
                        console.error(`Error fetching token: ${response.status}`);
                        throw new Error(`Error fetching token: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    if (!data.apiKey) {
                        console.error('API key not found in server response');
                        throw new Error('API key not found in response');
                    }
                    
                    console.log('Deepgram API token received successfully');
                    return data.apiKey;
                } catch (fetchError) {
                    console.error('Failed to fetch Deepgram token:', fetchError);
                    // Fall back to default token for testing
                    console.warn('Falling back to default token for testing/development');
                    return "24c7f8fea429c7e9be1b58a78a242b7c71f57cbb"; // Fallback to the token in .env
                }
            } catch (error) {
                console.error('Error in getDeepgramToken:', error);
                throw error;
            }
        }

        /**
         * Initialize the recognition client.
         * Should be called once when the component/page loads.
         * @returns {Promise<void>}
         */
        async initialize() {
            if (this.isInitialized || this.isInitializing) {
                console.log('Already initialized or initializing.');
                return;
            }
            this.isInitializing = true;
            console.log('Initializing VoiceRecognitionManager...');
            this.updateStatus('initializing');
        
            try {
                // Check if we should use the official Deepgram SDK (for premium users)
                if (this.isPremiumUser) {
                    // Check if Deepgram SDK is available globally from the CDN
                    if (!window.deepgram || !window.deepgram.createClient) {
                        throw new Error('Official Deepgram SDK not available');
                    }

                    // Get token and create client
                    this.apiKey = await this.getDeepgramToken();
                    console.log('Creating client with official SDK...');
                    this.dgClient = window.deepgram.createClient(this.apiKey);
                    
                    // Also store the LiveTranscriptionEvents for later use
                    this.LiveTranscriptionEvents = window.deepgram.LiveTranscriptionEvents;
                    
                    console.log('Using official Deepgram SDK');
                } else {
                    // For non-premium users, fall back to the mock implementation
                    console.log('Using Web Speech API fallback for free tier');
                    this._initWebSpeech();
                }

                // Initialize AudioContext for visualizer
                if (!this.audioContext || this.audioContext.state === 'closed') {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('AudioContext initialized for visualizer.');
                }

                this.isInitialized = true;
                this.updateStatus('initialized');
                console.log('VoiceRecognitionManager initialized successfully.');

            } catch (error) {
                this.handleError(error);
                this.updateStatus('error');
                console.error('Failed to initialize VoiceRecognitionManager:', error);
            } finally {
                this.isInitializing = false;
            }
        }

        /**
         * Ensure AudioContext is running (required after user interaction)
         * @returns {Promise<void>}
         */
        async ensureAudioContextRunning() {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    console.log('Resuming AudioContext...');
                    await this.audioContext.resume();
                    console.log('AudioContext resumed.');
                } catch (err) {
                    console.error('Error resuming AudioContext:', err);
                    this.handleError(new Error('Could not resume audio context. Please interact with the page.'));
                }
            }
        }

        /**
         * Start recording and streaming audio.
         * @param {Object} options - Recognition options (e.g., model, language).
         * @returns {Promise<void>}
         */
        async startRecording(options = {}) {
            if (this.isRecording) {
                console.warn('Already recording.');
                return;
            }
            if (!this.isInitialized) {
                console.error('Manager not initialized. Call initialize() first.');
                this.handleError(new Error('Voice recognition not ready. Please wait or refresh.'));
                this.updateStatus('error');
                return;
            }

            await this.ensureAudioContextRunning();

            console.log('Starting recording with options:', options);
            this.updateStatus('starting');

            try {
                // Request microphone access first
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    this.visualizerStream = stream; // Store for visualizer
                    
                    if (this.isPremiumUser && this.dgClient) {
                        // Use official Deepgram SDK for premium users
                        console.log('Using official Deepgram SDK for transcription');
                        
                        // Get LiveTranscriptionEvents that we stored during initialization
                        const LiveTranscriptionEvents = this.LiveTranscriptionEvents;
                        
                        this.dgConnection = this.dgClient.listen.live({
                            model: options.model || 'nova-2',
                            language: options.language || this.currentLanguage,
                            smart_format: options.smart_format !== undefined ? options.smart_format : true,
                            interim_results: options.interim_results !== undefined ? options.interim_results : true,
                            utterance_end_ms: options.utterance_end_ms || 1000,
                            vad_events: options.vad_events !== undefined ? options.vad_events : true,
                            ...options
                        });
                        
                        // SDK Event Listeners
                        this.dgConnection.on(LiveTranscriptionEvents.Open, () => {
                            console.log('Recognition connection opened.');
                            this.isRecording = true;
                            this.updateStatus('recording');
                            this.createVisualizer();
                        });
                        
                        this.dgConnection.on(LiveTranscriptionEvents.Close, (event) => {
                            console.log('Recognition connection closed.', event);
                            if (this.isRecording) {
                                this.handleError(new Error(`Connection closed unexpectedly`));
                                this.stopRecordingInternal(false);
                            }
                            this.updateStatus('closed');
                        });
                        
                        this.dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
                            const transcript = data.channel?.alternatives?.[0]?.transcript;
                            if (transcript) {
                                this.handleTranscript({
                                    text: transcript,
                                    is_final: data.is_final,
                                    speech_final: data.speech_final
                                });
                            }
                        });
                        
                        this.dgConnection.on(LiveTranscriptionEvents.SpeechStarted, () => {
                            console.log('Speech detected');
                            this.updateStatus('speech_detected');
                        });
                        
                        this.dgConnection.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
                            console.log('Utterance ended');
                            this.updateStatus('utterance_end');
                        });
                        
                        this.dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
                            console.error('Recognition error:', error);
                            this.handleError(new Error(`Recognition error: ${error.message || 'Unknown error'}`));
                        });
                        
                        // Add more detailed error handler for WebSocket errors
                        const dgConnectionObj = this.dgConnection;
                        if (dgConnectionObj && dgConnectionObj.connection && dgConnectionObj.connection.conn) {
                            dgConnectionObj.connection.conn.onerror = (event) => {
                                console.error('WebSocket connection error:', event);
                                
                                // Extract more detailed information if possible
                                let errorDetails = 'Unknown WebSocket error';
                                
                                // Check if this is an authentication error (401/403)
                                if (event.target && event.target.readyState === WebSocket.CLOSED) {
                                    // Try to determine if this is an auth error based on URL and timing
                                    if (event.timeStamp && (event.timeStamp < 1000)) {
                                        errorDetails = 'Authentication failed - invalid API key or permission denied';
                                    } else {
                                        errorDetails = 'WebSocket connection closed unexpectedly';
                                    }
                                }
                                
                                this.handleError(new Error(`WebSocket error: ${errorDetails}`));
                            };
                        }
                        
                        // Create a MediaRecorder to convert the media stream to binary data for Deepgram
                        const mediaRecorder = new MediaRecorder(stream);
                        this.mediaRecorder = mediaRecorder;
                        
                        // Send audio data to Deepgram when available
                        mediaRecorder.addEventListener('dataavailable', event => {
                            if (event.data.size > 0 && this.dgConnection) {
                                // Send the audio data to Deepgram
                                this.dgConnection.send(event.data);
                            }
                        });
                        
                        // Start recording with small time slices for low latency
                        mediaRecorder.start(100);
                    } else {
                        // Use Web Speech API for free tier users
                        if (this.recognition) {
                            try {
                                this.recognition.start();
                                this.isRecording = true;
                                this.updateStatus('recording');
                                this.createVisualizer();
                            } catch (e) { 
                                console.error('Speech recognition start error:', e);
                                this.handleError(e);
                            }
                        } else {
                            this.handleError(new Error('Speech recognition not initialized'));
                        }
                    }
                } catch (mediaError) {
                    console.error('Error accessing microphone:', mediaError);
                    this.handleError(new Error(`Microphone access denied: ${mediaError.message || 'Permission denied'}`));
                    return;
                }
            } catch (error) {
                console.error('Failed to start recording:', error);
                this.handleError(error);
                this.updateStatus('error');
                this.isRecording = false;
                
                if (this.dgConnection) {
                    try { this.dgConnection.finish(); } catch (e) { console.error("Error finishing connection:", e); }
                    this.dgConnection = null;
                }
                
                if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                    try { this.mediaRecorder.stop(); } catch (e) { console.error("Error stopping media recorder:", e); }
                    this.mediaRecorder = null;
                }
                
                if (this.visualizerStream) {
                    try {
                        this.visualizerStream.getTracks().forEach(track => track.stop());
                    } catch (e) { console.error("Error stopping media tracks:", e); }
                    this.visualizerStream = null;
                }
            }
        }

        /**
         * Stops recording.
         */
        stopRecording() {
            this.stopRecordingInternal(true);
        }

        /**
         * Internal method to stop recording and clean up.
         * @param {boolean} userInitiated - Was this stop requested by the user?
         */
        stopRecordingInternal(userInitiated) {
            if (!this.isRecording) {
                console.warn('Not recording.');
                return;
            }
    
            console.log('Stopping recording' + (userInitiated ? ' (user initiated)' : ''));
            this.updateStatus('stopping');
            this.isRecording = false;
            
            // Stop MediaRecorder if active
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                try {
                    this.mediaRecorder.stop();
                    console.log('MediaRecorder stopped');
                } catch (e) {
                    console.error("Error stopping MediaRecorder:", e);
                }
                this.mediaRecorder = null;
            }
            
            // Stop media tracks
            if (this.visualizerStream) {
                try {
                    this.visualizerStream.getTracks().forEach(track => {
                        track.stop();
                        console.log('Media track stopped');
                    });
                } catch (e) {
                    console.error("Error stopping media tracks:", e);
                }
            }
    
            // Stop visualizer
            this.stopVisualizer();
    
            if (this.isPremiumUser && this.dgConnection) {
                // Stop Deepgram connection for premium users
                try {
                    // Finish gracefully
                    this.dgConnection.finish();
                    console.log('Deepgram connection finished');
                } catch (e) {
                    console.error("Error finishing Deepgram connection:", e);
                } finally {
                    this.dgConnection = null;
                }
            } else if (this.recognition) {
                // Stop Web Speech API for free tier
                try {
                    this.recognition.stop();
                    console.log('Web Speech recognition stopped');
                } catch (e) {
                    console.error("Error stopping Web Speech recognition:", e);
                }
            }
    
            this.updateStatus('stopped');
        }

        /**
         * Set the callback function for transcript updates.
         * @param {function(string, boolean, object)} callback - Fn(text, isFinal, data)
         */
        onTranscript(callback) {
            this.onTranscriptCallback = callback;
        }

        /**
         * Set the callback function for error events.
         * @param {function(Error)} callback - Fn(error)
         */
        onError(callback) {
            this.onErrorCallback = callback;
        }

        /**
         * Set the callback function for status change events.
         * @param {function(string)} callback - Fn(status)
         */
        onStatusChange(callback) {
            this.onStatusChangeCallback = callback;
        }

        /**
         * Set the callback function for analytics updates (premium only).
         * @param {function(object)} callback - Fn(analyticsData)
         */
        onAnalytics(callback) {
            this.onAnalyticsCallback = callback;
        }

        /**
         * Update the recording status and notify listener.
         * @param {string} status - New status (e.g., 'initializing', 'ready', 'recording', 'stopped', 'error')
         */
        updateStatus(status) {
            console.log('Status updated:', status);
            if (this.onStatusChangeCallback) {
                try {
                    this.onStatusChangeCallback(status);
                } catch (e) {
                    console.error("Error in onStatusChangeCallback:", e);
                }
            }
        }

        /**
         * Handle incoming transcript data.
         * @param {object} data - Transcript data { text: string, is_final: boolean, speech_final: boolean }
         */
        handleTranscript(data) {
            if (this.onTranscriptCallback && data.text) {
                try {
                    this.onTranscriptCallback(data.text, data.is_final, data);
                } catch (e) {
                    console.error("Error in onTranscriptCallback:", e);
                }
            }
            
            // Generate analytics data for premium users
            if (this.isPremiumUser && this.onAnalyticsCallback && data.is_final) {
                try {
                    // In a real Deepgram implementation, this would use actual Deepgram analytics
                    // For our mock implementation, we'll generate some plausible values
                    const analyticsData = this._generateAnalyticsData(data.text);
                    this.onAnalyticsCallback(analyticsData);
                } catch (e) {
                    console.error("Error in onAnalyticsCallback:", e);
                }
            }
        }
        
        /**
         * Generate mock analytics data for non-premium users.
         * This simulates what Deepgram would provide in the premium tier.
         * @param {string} text - The transcript text
         * @returns {object} Analytics data object
         */
        _generateAnalyticsData(text) {
            // For a real implementation, this would come from Deepgram
            // This is a placeholder that generates reasonable-looking data
            const wordCount = text.split(/\s+/).length;
            const fillerWords = ['um', 'uh', 'like', 'you know', 'sort of'].filter(word => 
                text.toLowerCase().includes(word)
            );
            
            // Simple word-per-minute calculation (assuming average speaking time)
            const wordsPerMinute = Math.min(180, Math.max(100, 130 + Math.floor(Math.random() * 60)));
            
            // Mock confidence score between 0.7 and 0.98
            const confidence = Math.min(0.98, Math.max(0.7, 0.8 + Math.random() * 0.18));
            
            // Generate a reasonable pace score between 0.3 and 0.7 (where 0.5 is "normal")
            const paceScore = Math.min(0.7, Math.max(0.3, 0.5 + (Math.random() * 0.4 - 0.2)));
            
            // Detect tone based on keywords (very simplified)
            let tone = "neutral";
            const text_lower = text.toLowerCase();
            if (/excit(ed|ing)|great|awesome|fantastic/.test(text_lower)) {
                tone = "excited";
            } else if (/concern(ed)?|worr(ied|y)|problem|issue/.test(text_lower)) {
                tone = "concerned";
            } else if (/\?|how|what|when|where|why|who/.test(text_lower)) {
                tone = "questioning";
            }
            
            return {
                confidence: confidence,
                pace: {
                    score: paceScore,
                    wpm: wordsPerMinute,
                    assessment: paceScore < 0.4 ? "slow" : paceScore > 0.6 ? "fast" : "normal"
                },
                filler_words: {
                    count: fillerWords.length,
                    words: fillerWords
                },
                tone: tone,
                word_count: wordCount,
                premium_feature: true,
                timestamp: new Date().toISOString()
            };
        }

        /**
         * Handle errors from recognition or internal processes.
         * @param {Error} error - Error object
         */
        handleError(error) {
            console.error('Voice Recognition Error:', error);
            if (this.onErrorCallback) {
                try {
                    this.onErrorCallback(error);
                } catch (e) {
                    console.error("Error in onErrorCallback:", e);
                }
            }
            this.updateStatus('error');
            if (this.isRecording || this.dgConnection) {
                this.stopRecordingInternal(false);
            }
        }

        /**
         * Creates a visualizer for the audio stream.
         */
        createVisualizer() {
            // Find the canvas element if not already set
            if (!this.canvasElement) {
                this.canvasElement = document.getElementById('voice-visualizer');
                if (!this.canvasElement) {
                    console.warn('Voice visualizer canvas not found');
                    return;
                }
            }
            
            if (!this.audioContext) {
                console.warn('AudioContext not available for visualizer');
                return;
            }
            
            // Set up canvas context
            this.canvasCtx = this.canvasElement.getContext('2d');
            
            // Create analyzer node if not exists
            if (!this.analyserNode) {
                this.analyserNode = this.audioContext.createAnalyser();
                this.analyserNode.fftSize = 256;
                this.analyserNode.smoothingTimeConstant = 0.8;
            }
            
            // Connect stream to analyzer
            if (this.visualizerStream) {
                try {
                    // If already have a source, disconnect it
                    if (this.visualizerSource) {
                        this.visualizerSource.disconnect();
                    }
                    
                    this.visualizerSource = this.audioContext.createMediaStreamSource(this.visualizerStream);
                    this.visualizerSource.connect(this.analyserNode);
                    
                    // Start drawing
                    this.drawVisualizer();
                    console.log('Visualizer connected to stream');
                } catch (e) {
                    console.error('Error connecting visualizer to stream:', e);
                }
            } else {
                console.warn('No stream available for visualizer');
            }
        }

        /**
         * Draws the audio visualizer animation frame.
         */
        drawVisualizer() {
            if (!this.analyserNode || !this.canvasCtx || !this.canvasElement) {
                return;
            }
            
            // Get canvas dimensions
            const WIDTH = this.canvasElement.width;
            const HEIGHT = this.canvasElement.height;
            
            // Clear canvas
            this.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
            
            // Create data array for frequency data
            const bufferLength = this.analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // Get current frequency data
            this.analyserNode.getByteFrequencyData(dataArray);
            
            // Calculate bar width based on canvas size and buffer length
            const barWidth = (WIDTH / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            // Draw bars for each frequency
            for(let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2; // Scale down height
                
                // Use gradient based on frequency
                const hue = i / bufferLength * 180 + 180; // Blue to purple range
                this.canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                
                // Draw bar
                this.canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
                
                // Move to next bar position
                x += barWidth + 1;
            }
            
            // Schedule next frame if still recording
            if (this.isRecording) {
                this.animationFrameId = requestAnimationFrame(() => this.drawVisualizer());
            }
        }

        /**
         * Stops the visualizer animation and disconnects audio nodes.
         */
        stopVisualizer() {
            // Cancel animation frame if active
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
            }
            
            // Disconnect audio source if exists
            if (this.visualizerSource) {
                try {
                    this.visualizerSource.disconnect();
                } catch (e) {
                    console.error('Error disconnecting visualizer source:', e);
                }
                this.visualizerSource = null;
            }
            
            // Clear canvas if available
            if (this.canvasCtx && this.canvasElement) {
                this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            }
            
            // Reset stream reference
            this.visualizerStream = null;
        }

         /**
          * Clean up all resources when the manager is no longer needed.
          */
         destroy() {
            console.log("Destroying VoiceRecognitionManager...");
            
            // Stop recording if active
            if (this.isRecording) {
                this.stopRecordingInternal(false);
            }
            
            // Additional cleanup for MediaRecorder
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                try {
                    this.mediaRecorder.stop();
                } catch(e) { console.error("Error stopping MediaRecorder in destroy:", e); }
                this.mediaRecorder = null;
            }
            
            // Stop media tracks if any are active
            if (this.visualizerStream) {
                try {
                    this.visualizerStream.getTracks().forEach(track => track.stop());
                } catch(e) { console.error("Error stopping media tracks in destroy:", e); }
                this.visualizerStream = null;
            }

            // Close audio context if we created it
            if (this.audioContext && this.audioContext.state !== 'closed') {
                try {
                    this.audioContext.close().then(() => console.log("AudioContext closed in destroy."));
                } catch(e) { console.error("Error closing AudioContext in destroy:", e); }
            }
            this.audioContext = null;

            // Clean up Deepgram connection if still active
            if (this.dgConnection) {
                try {
                    this.dgConnection.finish();
                } catch(e) { console.error("Error finishing Deepgram connection in destroy:", e); }
                this.dgConnection = null;
            }

            // Clean up Web Speech API if active
            if (this.recognition) {
                try {
                    this.recognition.stop();
                } catch(e) { /* Ignore errors when stopping recognition */ }
                this.recognition = null;
            }

            // Nullify all remaining references
            this.onTranscriptCallback = null;
            this.onErrorCallback = null;
            this.onStatusChangeCallback = null;
            this.onAnalyticsCallback = null;
            this.dgClient = null;
            this.apiKey = null;
            this.analyserNode = null;
            this.visualizerSource = null;
            this.canvasCtx = null;
            this.canvasElement = null;
            this.isInitialized = false;
            this.isInitializing = false;

            console.log("VoiceRecognitionManager fully destroyed.");
         }

        /**
         * Initialize Web Speech API as a fallback for non-premium users
         * @returns {boolean} - Success or failure
         */
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
                this.isRecording = true;
                this.updateStatus('recording');
                console.log('Web Speech recognition started');
            };
            
            this.recognition.onend = () => {
                this.isRecording = false;
                this.updateStatus('stopped');
                console.log('Web Speech recognition ended');
            };
            
            this.recognition.onresult = (event) => {
                const last = event.results.length - 1;
                const transcript = event.results[last][0].transcript;
                const isFinal = event.results[last].isFinal;
                
                this.handleTranscript({
                    text: transcript,
                    is_final: isFinal,
                    speech_final: isFinal
                });
            };
            
            this.recognition.onerror = (event) => {
                console.error('Web Speech recognition error:', event.error);
                this.handleError(new Error(`Web Speech API Error: ${event.error}`));
                this.isRecording = false;
                this.updateStatus('error');
            };
            
            return true;
        }
    }

    return VoiceRecognitionManager;
})); 