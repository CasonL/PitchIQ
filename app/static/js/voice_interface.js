// Voice Interface Script
//
// // Import Deepgram SDK via CDN
// // This must be included before this script is loaded on the HTML page
// // If not added here, add to your HTML: <script src="https://cdn.jsdelivr.net/npm/@deepgram/sdk"></script>
//
// const VoiceInterface = (() => { // <<< Start IIFE Module
//
//     // --- State Variables (private to the module) ---
//     let useElevenLabs = true; // Set to true to enable ElevenLabs
//     const conversationId = document.getElementById('conversation-id')?.value || window.conversationId;
//     
//     // Mode selection - "coach" or "roleplay"
//     let currentMode = "coach"; // Default to coaching mode
//     
//     // Debug flags
//     const DEBUG_MODE = true; // Set to true to enable debug features
//     const USE_DEBUG_ENDPOINT = false; // Set to false in production
//     
//     // Voice selection state
//     let selectedVoice = {
//         id: "9BWtsMINqrJLrRacOk9x", // Aria voice as default
//         name: "Aria"
//     };
//     
//     // Speech recognition setup - REMOVED BROWSER API
//     // let recognition;
//     let isRecognizing = false; 
//     let finalTranscript = ''; // Keep for accumulating Deepgram transcript
//     // let isUserTurn = true; // Seems unused?
//     let isAISpeaking = false;
//     let pendingText = ''; // Keep for accumulating Deepgram transcript
//     let isProcessing = false;
//     // let sendIndicatorShown = false; // Seems unused?
//     let pauseDetectionTimeout = null;
//     let warningTimeout = null;
//     let orangeTimer = null; 
//     
//     // Deepgram specific state
//     let deepgramSocket = null;
//     let mediaRecorder = null;
//     let audioStream = null; 
//     let deepgramApiKey = null; // To store the temporary key
//
//     // Audio playback state (for TTS later)
//     let audioContext = null;
//     let audioQueue = []; // Queue for incoming audio chunks
//     let sourceNode = null; // Current audio source being played
//     
//     // Mic calibration variables
//     let baseNoiseLevel = 0.05; 
//     let interruptionThreshold = 0.35; 
//     let noiseCalibrationSamples = []; 
//     const MIN_THRESHOLD = 0.15; 
//     const MAX_THRESHOLD = 0.6; 
//     const CALIBRATION_SAMPLE_COUNT = 100; 
//     let isCalibrating = false;
//     let calibrationInterval = null;
//     
//     // Audio playback variables
//     let currentAudioElement = null;
//     // let interruptionDetected = false; // Seems unused?
//     
//     // Awkwardness variables (Potentially remove if unused)
//     let interruptionCount = 0;
//     let awkwardnessQueue = []; 
//     let lastInterruptionTime = 0;
//     let State = { wasInterrupted: false }; 
//     
//     // let isContinuousMode = false; // Seems unused now?
//
//     // Buyer Persona Types (Potentially move if only used by backend)
//     const buyerPersonaTypes = {
//         // ... persona data ...
//     };
//
//     // --- DOM Elements (fetched in init) ---
//     let transcriptContainer = null;
//     let conversationStatus = null;
//     let toggleRecordButton = null;
//     let feedbackPanel = null;
//     let conversationOrb = null;
//     let modeToggleButton = null;
//
//     // --- Core Functions (will become methods) ---
//
//     // Utility function to log the current state for debugging
//     function logState(message) {
//          console.log(`[STATE] ${message} - isRecognizing: ${isRecognizing}, isAISpeaking: ${isAISpeaking}, isProcessing: ${isProcessing}, pendingText: "${pendingText}"`);
//     }
//     
//     // Helper function to determine if the input is unusual (for awkwardness detection)
//     function isUnusualInput(text) {
//         // ... (keep if needed)
//         return false; // Simplified for now
//     }
//     
//     // Get a natural response delay to simulate human conversation
//     function getNaturalResponseDelay() {
//         // ... (keep if needed)
//         return 100 + Math.random() * 300;
//     }
//
//     // Placeholder for initialization logic
//     function init() {
//         console.log("VoiceInterface.init() called.");
//         // Fetch DOM elements
//         transcriptContainer = document.getElementById('transcript-container');
//         conversationStatus = document.getElementById('conversation-status');
//         toggleRecordButton = document.getElementById('toggle-record');
//         feedbackPanel = document.getElementById('feedback-panel');
//         conversationOrb = document.getElementById('voice-orb');
//         modeToggleButton = document.getElementById('mode-toggle');
//
//         // Set up mode toggle button if it exists
//         if (modeToggleButton) {
//             // Set initial button text based on default mode
//             updateModeButtonText();
//             
//             // Add click handler for mode toggle
//             modeToggleButton.addEventListener('click', () => {
//                 toggleMode();
//             });
//         }
//
//         // Add event listener to the body for delegation
//         document.body.addEventListener('click', (event) => {
//             const button = event.target.closest('#toggle-record');
//             if (button) {
//                 if (isAISpeaking || isProcessing) {
//                     console.log("Ignoring click, AI speaking or processing.");
//                     return; 
//                 }
//
//                 // --- Handle STARTING recognition ---
//                 if (!isRecognizing) {
//                     console.log("Click Handler: Forcing INITIALIZING state and starting recognition");
//                     isRecognizing = false; // Explicitly reset just in case
//                     updateUI('initializing'); // Force orange orb NOW
//
//                     // Start Fixed 2-Second ORANGE Display Timer 
//                     clearTimeout(orangeTimer); // Clear previous timer
//                     orangeTimer = setTimeout(() => {
//                         console.log("Forced 2-second orange display timer ended.");
//                         orangeTimer = null; 
//                         // After 2 seconds, check if engine *actually* started
//                         if (isRecognizing) { 
//                              // Engine is ready, switch to listening UI
//                              console.log("--> Forcing UI to listening state after 2s.");
//                              updateUI('listening'); 
//                         } else {
//                              // Engine failed to start within 2s
//                              console.log("--> Engine not ready after 2s, forcing UI to idle/error.");
//                              // Clean up any resources if needed
//                              if (mediaRecorder && mediaRecorder.state !== 'inactive') { 
//                                  try { mediaRecorder.stop(); } catch(e){} 
//                              }
//                              if (audioStream) { 
//                                  try { audioStream.getTracks().forEach(track => track.stop()); } catch(e){} 
//                              }
//                              isRecognizing = false; // Ensure reset
//                              updateUI('error'); // Indicate failure
//                              setTimeout(() => updateUI('idle'), 1500);
//                         }
//                     }, 2000); // 2 second fixed display
//
//                     // Call startListeningManual AFTER setting UI and timer
//                     startListeningManual(); 
//                 
//                 // --- Handle STOPPING recognition ---
//                 } else {
//                     console.log("Click Handler: Attempting to STOP recognition");
//                     clearTimeout(orangeTimer); // Clear fixed timer if we stop manually
//                     stopListeningAndSend(); // Directly call stop
//                 }
//             }
//         });
//         console.log("Event delegation set up on body for #toggle-record");
//
//         // Set up voice selection modal functionality
//         const voiceSelectionToggle = document.getElementById('voice-selection-toggle');
//         const voiceSelectionModal = document.getElementById('voice-selection-modal');
//         const closeModalButton = document.getElementById('close-modal');
//         const voiceOptions = document.querySelectorAll('.voice-option');
//         
//         // Toggle modal visibility
//         if (voiceSelectionToggle) {
//             voiceSelectionToggle.addEventListener('click', () => {
//                 voiceSelectionModal.style.display = 'flex';
//                 
//                 // Highlight the currently selected voice
//                 voiceOptions.forEach(option => {
//                     if (option.dataset.voiceId === selectedVoice.id) {
//                         option.classList.add('selected');
//                     } else {
//                         option.classList.remove('selected');
//                     }
//                 });
//             });
//         }
//         
//         // Close modal on button click
//         if (closeModalButton) {
//             closeModalButton.addEventListener('click', () => {
//                 voiceSelectionModal.style.display = 'none';
//             });
//         }
//         
//         // Close modal when clicking outside
//         window.addEventListener('click', (event) => {
//             if (event.target === voiceSelectionModal) {
//                 voiceSelectionModal.style.display = 'none';
//             }
//         });
//         
//         // Voice selection
//         voiceOptions.forEach(option => {
//             option.addEventListener('click', () => {
//                 // Remove selected class from all options
//                 voiceOptions.forEach(opt => opt.classList.remove('selected'));
//                 
//                 // Add selected class to clicked option
//                 option.classList.add('selected');
//                 
//                 // Update selected voice
//                 selectedVoice = {
//                     id: option.dataset.voiceId,
//                     name: option.querySelector('.voice-name').textContent
//                 };
//                 
//                 console.log(`Selected voice: ${selectedVoice.name} (${selectedVoice.id})`);
//                 
//                 // Add a small delay before closing the modal
//                 setTimeout(() => {
//                     voiceSelectionModal.style.display = 'none';
//                 }, 300);
//             });
//         });
//
//         // REMOVED Call to browser init
//         // initSpeechRecognition(); 
//
//         // REMOVED Priming Logic
//         /*
//         if (recognition) { ... priming code ... } 
//         */
//
//         updateUI('idle'); 
//         console.log("VoiceInterface initialized (Browser APIs removed)."); // Updated log
//     }
//
//     // REMOVED Entire browser speech recognition setup function
//     /*
//     function initSpeechRecognition() { ... }
//     */
//
//     // REMOVED Beep sound function
//     /*
//     function playStartSound() { ... }
//     */
//
//     // Gutted start function - will initiate audio capture & Deepgram later
//     function startListeningManual() {
//         console.log("VoiceInterface.startListeningManual() called (Deepgram).");
//         if (!isRecognizing && !isAISpeaking) {
//             updateUI('initializing'); // Show initializing state
//             
//             // 1. Fetch Temporary Deepgram Token
//             fetch('/voice/api/get_deepgram_token') // Server endpoint that securely provides temporary Deepgram credentials
//                 .then(response => {
//                     if (!response.ok) {
//                         throw new Error(`HTTP error! status: ${response.status}`);
//                     }
//                     return response.json();
//                 })
//                 .then(data => {
//                     if (!data.key) {
//                         throw new Error('Temporary API key not received from backend.');
//                     }
//                     deepgramApiKey = data.key;
//                     console.log("Received temporary Deepgram key.");
//                     
//                     // 2. Proceed to connect and capture audio
//                     startDeepgramConnection(); 
//                     
//                 })
//                 .catch(error => {
//                     console.error("Error fetching Deepgram token:", error);
//                     updateUI('error');
//                     // No need to clear orangeTimer here, it wasn't started for this path
//                 });
//
//         } else {
//             console.warn("Cannot startListeningManual. State:", {isRecognizing, isAISpeaking});
//         }
//     }
//
//     // NEW function to handle connection and audio capture after getting token
//     function startDeepgramConnection() {
//          console.log("Attempting to start Deepgram connection and audio capture...");
//          // Start the fixed orange display timer after successful token fetch
//          clearTimeout(orangeTimer); 
//          orangeTimer = setTimeout(() => {
//             console.log("Forced 2-second orange display timer ended.");
//             orangeTimer = null; 
//             if (isRecognizing) { 
//                  console.log("--> Forcing UI to listening state after 2s.");
//                  updateUI('listening'); 
//             } else {
//                  console.log("--> Engine/Mic not ready after 2s, forcing UI to idle/error.");
//                  // Clean up any resources
//                  if (mediaRecorder && mediaRecorder.state !== 'inactive') { mediaRecorder.stop(); }
//                  if (audioStream) { audioStream.getTracks().forEach(track => track.stop()); audioStream = null; }
//                  isRecognizing = false; 
//                  updateUI('error'); 
//                  setTimeout(() => updateUI('idle'), 1500);
//             }
//         }, 2000);
//
//          // 1. Access Microphone
//          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//             navigator.mediaDevices.getUserMedia({ audio: true })
//                 .then(stream => {
//                     console.log("Microphone access granted.");
//                     audioStream = stream; // Store the stream
//                     
//                     // Optional: Update UI slightly? Maybe not needed if 'initializing' is okay.
//                     // updateUI('mic_acquired'); 
//
//                     // 2. TODO: Establish WebSocket Connection to Deepgram using deepgramApiKey
//                     establishDeepgramWebSocket(); // Call next step
//                     
//                     // 3. TODO: Setup MediaRecorder (Will happen after WebSocket is open)
//
//                 })
//                 .catch(err => {
//                     console.error("Error accessing microphone:", err);
//                     if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
//                         alert("Microphone access denied. Please allow microphone access in your browser settings.");
//                     } else {
//                          alert(`Error accessing microphone: ${err.name}`);
//                     }
//                     clearTimeout(orangeTimer); // Stop timer on error
//                     isRecognizing = false; // Ensure state reset
//                     updateUI('error');
//                 });
//         } else {
//             console.error("getUserMedia not supported on this browser!");
//             alert("Your browser does not support microphone access.");
//             clearTimeout(orangeTimer); // Stop timer on error
//             isRecognizing = false; // Ensure state reset
//             updateUI('error');
//         }
//          
//          // --- Remove MOCK SUCCESS ---
//          // isRecognizing = true; ... etc.
//          // logState("startDeepgramConnection - MOCK SUCCESS");
//          
//     }
//
//     // Function to handle WebSocket connection
//     function establishDeepgramWebSocket() {
//         console.log("Attempting to establish Deepgram connection using SDK...");
//         if (!deepgramApiKey) {
//             console.error("Deepgram API Key/Token not available.");
//             updateUI('error');
//             clearTimeout(orangeTimer);
//             return;
//         }
//
//         try {
//             // 1. Instantiate Deepgram SDK Client
//             // Assuming the SDK is loaded globally as `deepgram` or `@deepgram/sdk`
//             // Adjust the object name if necessary based on how the SDK is included
//             const { createClient, LiveTranscriptionEvents } = deepgram; // Add LiveTranscriptionEvents
//             console.log("SDK loaded, creating client with key");
//             const _deepgram = createClient(deepgramApiKey);
//
//             // 2. Create Live Transcription Connection
//             // Construct options based on URL parameters we had before
//             const connectionOptions = {
//                 model: 'nova-2', // Example model, choose appropriate one
//                 language: 'en-US',
//                 punctuate: true,
//                 interim_results: true,
//                 encoding: 'linear16', // Changed from opus to linear16 - more reliable
//                 sample_rate: 16000, // Ensure this matches your mic source if possible
//                 vad_events: true, // Enable Voice Activity Detection events
//                 endpointing: 200  // Milliseconds of silence for endpointing
//             };
//             
//             console.log("Creating Deepgram live connection with options:", connectionOptions);
//             deepgramSocket = _deepgram.listen.live(connectionOptions);
//
//             // 3. Attach Event Listeners (Using SDK Event Names)
//             // Properly use LiveTranscriptionEvents enum for event names
//             deepgramSocket.on(LiveTranscriptionEvents.Open, () => {
//                 console.log("Deepgram SDK connection opened.");
//                 clearTimeout(orangeTimer); 
//                 
//                 // Set isRecognizing to true IMMEDIATELY when connection opens
//                 isRecognizing = true;
//                 updateUI('listening'); 
//                 
//                 logState("Deepgram SDK Opened");
//                 setupMediaRecorder(); // Setup recorder now that connection is open
//             });
//
//             deepgramSocket.on(LiveTranscriptionEvents.Transcript, (data) => {
//                 console.log("Deepgram transcript received:", data);
//                 
//                 // Check if channel and alternatives exist
//                 if (data?.channel?.alternatives?.length > 0) {
//                     const transcript = data.channel.alternatives[0].transcript || '';
//                     const isFinal = data.is_final || false;
//                     const speechFinal = data.speech_final || false;
//
//                     if (transcript.trim()) {
//                         // Use the SDK's finalized transcript markers
//                         if (isFinal) {
//                             // Append final parts with a space
//                             finalTranscript += transcript.trim() + ' '; 
//                             console.log("FINAL transcript:", finalTranscript);
//                         }
//                         
//                         // Update pendingText with the latest (potentially interim included for display)
//                         const currentInterim = isFinal ? '' : transcript;
//                         pendingText = (finalTranscript + currentInterim).trim(); 
//                         
//                         // Update Status UI with ongoing transcript
//                         if (conversationStatus) {
//                             conversationStatus.textContent = pendingText;
//                         }
//                         console.log(`Transcript: "${transcript}" (isFinal: ${isFinal}, speechFinal: ${speechFinal})`);
//                     }
//                     
//                     // If Deepgram signals the end of speech, send the final transcript
//                     if (speechFinal && finalTranscript.trim()) {
//                         console.log("Deepgram indicated speech_final=true");
//                         const textToSend = finalTranscript.trim();
//                         
//                         // Reset for next utterance
//                         pendingText = '';
//                         finalTranscript = ''; 
//                         
//                         handleUserMessage(textToSend);
//                     }
//                 } else {
//                     console.warn("Received transcript event with unexpected format:", data);
//                 }
//             });
//
//             // Add specific error and close event handlers
//             deepgramSocket.on(LiveTranscriptionEvents.Error, (error) => {
//                 console.error("Deepgram SDK connection error:", error);
//                 clearTimeout(orangeTimer);
//                 isRecognizing = false;
//                 if (mediaRecorder && mediaRecorder.state !== 'inactive') { mediaRecorder.stop(); }
//                 if (audioStream) { audioStream.getTracks().forEach(track => track.stop()); audioStream = null; }
//                 updateUI('error');
//                 logState("Deepgram SDK Error");
//             });
//
//             deepgramSocket.on(LiveTranscriptionEvents.Close, (event) => {
//                 console.log("Deepgram SDK connection closed.", event);
//                 clearTimeout(orangeTimer);
//                 isRecognizing = false;
//                 if (mediaRecorder && mediaRecorder.state !== 'inactive') { mediaRecorder.stop(); } 
//                 if (audioStream) { audioStream.getTracks().forEach(track => track.stop()); audioStream = null; }
//                 deepgramSocket = null; 
//                 if (!document.getElementById('voice-orb')?.classList.contains('error')) {
//                     updateUI('idle'); 
//                 }
//                 logState("Deepgram SDK Closed");
//             });
//
//             // Add handlers for Voice Activity Detection if available
//             if (LiveTranscriptionEvents.SpeechStarted) {
//                 deepgramSocket.on(LiveTranscriptionEvents.SpeechStarted, () => {
//                     console.log("🎤 Speech started detected");
//                 });
//             }
//             
//             if (LiveTranscriptionEvents.SpeechFinished) {
//                 deepgramSocket.on(LiveTranscriptionEvents.SpeechFinished, () => {
//                     console.log("🔇 Speech finished detected");
//                 });
//             }
//
//         } catch (error) {
//              console.error("Error initializing Deepgram SDK or Connection:", error);
//              clearTimeout(orangeTimer);
//              updateUI('error');
//              isRecognizing = false; 
//         }
//     }
//
//     // NEW function to setup MediaRecorder
//     function setupMediaRecorder() {
//         if (!audioStream) {
//             console.error("Cannot setup MediaRecorder: Audio stream not available.");
//             updateUI('error');
//             return;
//         }
//         
//         // With Deepgram SDK, we don't need to check the WebSocket readyState
//         // The SDK handles this internally, and if onopen fired, we're ready
//         if (!deepgramSocket) {
//             console.error("Cannot setup MediaRecorder: Deepgram connection not initialized.");
//             updateUI('error');
//             return;
//         }
//
//         try {
//             // Create audio context for processing
//             window.AudioContext = window.AudioContext || window.webkitAudioContext;
//             const audioContext = new AudioContext({
//                 sampleRate: 16000 // Match Deepgram sample rate
//             });
//             
//             // Create source from microphone stream
//             const source = audioContext.createMediaStreamSource(audioStream);
//             
//             // Create processor node to get raw audio data
//             const processor = audioContext.createScriptProcessor(4096, 1, 1);
//             
//             // Connect source -> processor -> destination (silent)
//             source.connect(processor);
//             processor.connect(audioContext.destination);
//             
//             // Process audio data and send to Deepgram
//             processor.onaudioprocess = (e) => {
//                 if (deepgramSocket) {
//                     try {
//                         // Get audio data from the buffer
//                         const input = e.inputBuffer.getChannelData(0);
//                         
//                         // Convert to 16-bit PCM (Int16Array) - required for linear16 encoding
//                         const buffer = new ArrayBuffer(input.length * 2);
//                         const view = new DataView(buffer);
//                         
//                         for (let i = 0; i < input.length; i++) {
//                             // Convert float32 to int16 range and write to buffer
//                             const s = Math.max(-1, Math.min(1, input[i]));
//                             view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
//                         }
//                         
//                         // Send the PCM data to Deepgram
//                         deepgramSocket.send(buffer);
//                     } catch (err) {
//                         console.error("Error sending audio to Deepgram:", err);
//                     }
//                 }
//             };
//             
//             // Store references for cleanup
//             mediaRecorder = {
//                 isCustom: true,
//                 audioContext: audioContext,
//                 processor: processor,
//                 source: source,
//                 state: 'recording',
//                 stop: function() {
//                     if (this.state !== 'inactive') {
//                         try {
//                             // Disconnect and clean up
//                             this.source.disconnect();
//                             this.processor.disconnect();
//                             this.audioContext.close();
//                             this.state = 'inactive';
//                             console.log("Custom audio processor stopped");
//                         } catch (e) {
//                             console.error("Error stopping custom audio processor:", e);
//                         }
//                     }
//                 }
//             };
//             
//             console.log("Custom audio processor started for Deepgram");
//             logState("MediaRecorder Started");
//             
//             // Set isRecognizing to true AFTER we've successfully started
//             isRecognizing = true;
//         } catch (error) {
//             console.error("Error setting up audio processor:", error);
//             updateUI('error');
//             if (deepgramSocket) {
//                 try { deepgramSocket.close(); } catch(e) { console.error("Error closing socket:", e); }
//             }
//         }
//     }
//
//     // Handle stopping the recording
//     function stopListeningAndSend() {
//         console.log("VoiceInterface.stopListeningAndSend() called (Deepgram).");
//         clearTimeout(orangeTimer); // Clear fixed timer if we stop manually
//         
//         // First update UI to show processing state
//         isProcessing = true;
//         updateUI('processing');
//         
//         if (isRecognizing) {
//              console.log("--> Stopping audio capture & Deepgram connection...");
//              
//              // 1. Stop MediaRecorder (custom or standard)
//              if (mediaRecorder) {
//                  if (mediaRecorder.isCustom) {
//                      // Custom audio processor
//                      mediaRecorder.stop();
//                  } else if (mediaRecorder.state !== 'inactive') {
//                      // Standard MediaRecorder
//                      mediaRecorder.stop();
//                  }
//                  console.log("Audio processor/recorder stopped.");
//                  mediaRecorder = null;
//              } else {
//                  console.log("MediaRecorder already inactive or not initialized.");
//              }
//              
//              // 2. Stop Microphone Track
//              if (audioStream) {
//                  audioStream.getTracks().forEach(track => track.stop());
//                  console.log("Microphone tracks stopped.");
//                  audioStream = null; // Clear the stream variable
//              }
//
//              // 3. Send End-of-Stream to Deepgram SDK
//              if (deepgramSocket) {
//                  try {
//                      // The SDK might have a finish() method
//                      if (typeof deepgramSocket.finish === 'function') {
//                          deepgramSocket.finish();
//                          console.log("Sent finish() to Deepgram SDK.");
//                      } else {
//                          // Fallback to close()
//                          deepgramSocket.close();
//                          console.log("Closed Deepgram SDK connection.");
//                      }
//                  } catch (error) {
//                      console.error("Error ending Deepgram stream:", error);
//                  }
//                  deepgramSocket = null;
//              }
//
//              // 4. Update state and UI
//              isRecognizing = false; 
//              logState("stopListeningAndSend - Deepgram");
//
//             // 5. Process accumulated transcript
//             if (pendingText.trim()) {
//                 handleUserMessage(pendingText.trim());
//                 pendingText = '';
//                 finalTranscript = '';
//             } else {
//                 // No text was transcribed, go back to idle state
//                 isProcessing = false;
//                 setTimeout(() => {
//                     updateUI('idle');
//                 }, 300);
//             }
//
//         } else {
//              console.log("Not recognizing, nothing to stop.");
//              isProcessing = false;
//              updateUI('idle');
//         }
//     }
//
//     // Toggle recording state (Structure remains the same)
//     function toggleRecording() {
//         logState("toggleRecording called");
//         if (isRecognizing) {
//             stopListeningAndSend();
//         } else {
//             startListeningManual();
//         }
//     }
//
//     // Handle text-to-speech using the backend
//     function speakText(text) {
//         console.log("VoiceInterface.speakText() called with text:", text);
//         isAISpeaking = true;
//         updateUI('speaking');
//         logState("speakText started");
//
//         // Flag to switch between ElevenLabs and browser TTS
//         const useElevenLabsTTS = true; // Set to false to use browser TTS
//         
//         if (useElevenLabsTTS) {
//             // Choose the endpoint based on debug flag
//             const endpoint = USE_DEBUG_ENDPOINT ? '/voice/api/debug-tts' : '/voice/api/tts';
//             console.log(`Using TTS endpoint: ${endpoint} (debug mode: ${USE_DEBUG_ENDPOINT})`);
//             
//             // Use the backend TTS endpoint with ElevenLabs
//             fetch(endpoint, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'X-Requested-With': 'XMLHttpRequest'
//                 },
//                 body: JSON.stringify({
//                     text: text,
//                     voice_id: selectedVoice.id, // Use the selected voice ID
//                     conversation_id: conversationId
//                 })
//             })
//             .then(response => {
//                 if (!response.ok) {
//                     throw new Error(`HTTP error! Status: ${response.status}`);
//                 }
//                 return response.blob(); // Get audio as blob
//             })
//             .then(audioBlob => {
//                 // Check if the blob is valid
//                 if (audioBlob.size === 0) {
//                     throw new Error("Received empty audio blob");
//                 }
//                 
//                 // Get MIME type from the blob, or default to audio/mpeg
//                 const contentType = audioBlob.type || 'audio/mpeg';
//                 console.log("Received audio blob with content type:", contentType, "size:", audioBlob.size, "bytes");
//                 
//                 // Create audio URL and set up playback
//                 const audioUrl = URL.createObjectURL(audioBlob);
//                 const audio = new Audio();
//                 
//                 // Store reference for potential interruption
//                 currentAudioElement = audio;
//                 
//                 // Set up event handlers first before setting the source
//                 audio.onplay = () => {
//                     console.log("ElevenLabs audio playback started");
//                     // Ensure UI stays in speaking state
//                     isAISpeaking = true;
//                     updateUI('speaking');
//                 };
//                 
//                 audio.onended = () => {
//                     console.log("ElevenLabs audio playback complete");
//                     isAISpeaking = false;
//                     updateUI('idle');
//                     logState("speakText finished");
//                     
//                     // Clean up
//                     URL.revokeObjectURL(audioUrl);
//                     currentAudioElement = null;
//                 };
//                 
//                 audio.onerror = (error) => {
//                     console.error("ElevenLabs audio playback error:", error);
//                     // Additional debug info
//                     console.error("Audio error details:", {
//                         error: error,
//                         code: audio.error ? audio.error.code : 'unknown',
//                         message: audio.error ? audio.error.message : 'unknown'
//                     });
//                     
//                     isAISpeaking = false;
//                     updateUI('idle');
//                     logState("speakText error");
//                     
//                     // Clean up
//                     URL.revokeObjectURL(audioUrl);
//                     currentAudioElement = null;
//                     
//                     // Fallback to browser TTS
//                     useBrowserTTSFallback(text);
//                 };
//                 
//                 // Set source and load AFTER event handlers are set up
//                 audio.src = audioUrl;
//                 audio.load();
//                 
//                 // Start playback
//                 console.log("Attempting to play ElevenLabs audio...");
//                 const playPromise = audio.play();
//                 
//                 // Handle play promise (required for some browsers)
//                 if (playPromise !== undefined) {
//                     playPromise.catch(error => {
//                         console.error("ElevenLabs audio play promise rejected:", error);
//                         // Fallback to browser TTS
//                         useBrowserTTSFallback(text);
//                     });
//                 }
//             })
//             .catch(error => {
//                 console.error("Error fetching ElevenLabs audio:", error);
//                 // Fallback to browser TTS on error
//                 useBrowserTTSFallback(text);
//             });
//         } else {
//             // Use browser TTS fallback
//             useBrowserTTSFallback(text);
//         }
//     }
//     
//     // Fallback to browser TTS
//     function useBrowserTTSFallback(text) {
//         console.log("Using browser TTS fallback");
//         
//         // Check if browser supports speech synthesis
//         if ('speechSynthesis' in window) {
//             const utterance = new SpeechSynthesisUtterance(text);
//             
//             // Ensure UI state is correct before speaking
//             isAISpeaking = true;
//             updateUI('speaking');
//             
//             // Function to actually speak with selected voice
//             const speakWithVoice = () => {
//                 // Configure voice - try to find a good quality voice
//                 const voices = window.speechSynthesis.getVoices();
//                 
//                 // Try to get a high-quality voice - prefer Google voices if available
//                 let selectedVoice = voices.find(voice => voice.name.includes('Google') && voice.lang.includes('en')) ||
//                                   voices.find(voice => voice.name.includes('Microsoft') && voice.lang.includes('en')) ||
//                                   voices.find(voice => voice.lang.includes('en-US')) ||
//                                   voices.find(voice => voice.lang.includes('en')) ||
//                                   voices[0];
//                                   
//                 if (selectedVoice) {
//                     console.log("Using voice:", selectedVoice.name);
//                     utterance.voice = selectedVoice;
//                 }
//                 
//                 // Handle speech end
//                 utterance.onend = () => {
//                     console.log("Browser TTS finished");
//                     isAISpeaking = false;
//                     updateUI('idle');
//                     logState("speakText finished (browser TTS)");
//                 };
//                 
//                 // Handle errors
//                 utterance.onerror = (event) => {
//                     console.error("Browser TTS error:", event);
//                     isAISpeaking = false;
//                     updateUI('idle');
//                     logState("speakText error (browser TTS)");
//                 };
//                 
//                 // Double check UI is in speaking state before actually speaking
//                 updateUI('speaking');
//                 
//                 // Speak the text
//                 window.speechSynthesis.speak(utterance);
//             };
//             
//             // Check if voices are available immediately or need to wait for them to load
//             if (window.speechSynthesis.getVoices().length > 0) {
//                 speakWithVoice();
//             } else {
//                 // Wait for voices to be loaded
//                 window.speechSynthesis.onvoiceschanged = speakWithVoice;
//             }
//             
//         } else {
//             console.error("Browser doesn't support speech synthesis");
//             isAISpeaking = false;
//             updateUI('idle');
//             logState("speakText error (TTS not supported)");
//         }
//     }
//
//     // Update the UI based on state
//     function updateUI(state) {
//         console.log(`VoiceInterface.updateUI() called with state: ${state}`);
//         logState("updateUI");
//
//         // Force state based on system conditions - this ensures UI consistency
//         if (isAISpeaking && state !== 'speaking') {
//             console.log("Forcing UI state to 'speaking' because isAISpeaking is true");
//             state = 'speaking';
//         } else if (isRecognizing && !isAISpeaking && !isProcessing && state !== 'listening') {
//             console.log("Forcing UI state to 'listening' because isRecognizing is true");
//             state = 'listening';
//         } else if (isProcessing && state !== 'processing') {
//             console.log("Forcing UI state to 'processing' because isProcessing is true");
//             state = 'processing';
//         }
//
//         if (conversationOrb) {
//             // Reset classes first
//             conversationOrb.classList.remove('listening', 'processing', 'speaking', 'idle', 'error', 'initializing'); 
//
//             // Add the new state class
//             if (state) { 
//                 conversationOrb.classList.add(state);
//             } else {
//                  console.warn("updateUI called with invalid state:", state);
//                  conversationOrb.classList.add('error'); 
//              }
//          } else {
//              console.warn("#voice-orb element not found during updateUI. Cannot update visual state.");
//          }
//
//          // Update status text (independent of the orb)
//          if (conversationStatus) {
//             switch(state) {
//                 case 'initializing':
//                     conversationStatus.textContent = "Getting ready...";
//                     break;
//                 case 'idle':
//                     conversationStatus.textContent = "Click button to talk"; 
//                     break;
//                 case 'listening':
//                      conversationStatus.textContent = "Listening...";
//                     break;
//                 case 'processing':
//                      conversationStatus.textContent = "Processing...";
//                     break;
//                 case 'speaking':
//                      conversationStatus.textContent = "AI Speaking...";
//                     break;
//                 case 'error':
//                      conversationStatus.textContent = "Error occurred";
//                     break;
//                 default:
//                      conversationStatus.textContent = "Ready";
//             }
//         } else {
//             console.warn("#conversation-status element not found during updateUI.");
//         }
//
//         // Optionally update the toggle button's appearance/text if needed
//         if (toggleRecordButton) {
//            if (state === 'listening') {
//                toggleRecordButton.textContent = 'Stop Recording'; 
//                toggleRecordButton.classList.add('recording'); 
//                toggleRecordButton.classList.remove('idle');
//            } else {
//                toggleRecordButton.textContent = 'Start Recording'; 
//                 toggleRecordButton.classList.add('idle'); 
//                toggleRecordButton.classList.remove('recording');
//            }
//            // Disable button when AI is speaking, processing, or initializing
//            if (state === 'speaking' || state === 'processing' || state === 'initializing') {
//                toggleRecordButton.disabled = true;
//            } else {
//                toggleRecordButton.disabled = false;
//            }
//        } else {
//             console.warn("#toggle-record button not found during updateUI.");
//        }
//     }
//
//     /**
//      * Handles processing the user's message.
//      * @param {string} message - The message from the user to process
//      * @returns {void}
//      */
//     function handleUserMessage(message) {
//         logState("handleUserMessage ENTRY - Original");
//         console.log(`[Received Original]: "${message}"`);
//
//         if (!message || message.trim().length === 0) {
//             console.log("handleUserMessage: Empty message, ignoring.");
//             updateUI('idle');
//             return;
//         }
//         
//         // --- Basic Text Clean-up and Punctuation Formatting ---
//         let cleanedMessage = message.trim();
//         // Replace multiple spaces with single spaces
//         cleanedMessage = cleanedMessage.replace(/\s{2,}/g, ' ');
//         // Remove space before common punctuation
//         cleanedMessage = cleanedMessage.replace(/\s+([.,?!])/g, '$1');
//         // Ensure space after common punctuation (if followed by a letter/number)
//         cleanedMessage = cleanedMessage.replace(/([.,?!])(\w)/g, '$1 $2');
//         // Capitalize the first letter of the entire message
//         cleanedMessage = cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);
//         // Attempt to capitalize after sentence-ending punctuation (.?!) - more complex, basic attempt:
//         cleanedMessage = cleanedMessage.replace(/([.?!]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
//         
//         console.log(`[Cleaned Message]: "${cleanedMessage}"`);
//         logState("handleUserMessage - Cleaned");
//         // --- End Clean-up ---
//         
//         // Use cleanedMessage from now on
//         message = cleanedMessage; // Overwrite original with cleaned version for further processing
//
//         isProcessing = true; // Mark as processing
//         updateUI('processing');
//
//         // --- Real API Call to Backend ---
//         console.log(`Sending message to backend API (mode: ${currentMode})...`);
//         
//         // Prepare request data
//         const requestData = {
//             message: message,
//             conversation_id: conversationId,
//             mode: currentMode // Include the current mode in the request
//         };
//         
//         // Use the appropriate endpoint based on the mode
//         const apiEndpoint = `/voice/api/${currentMode}`;
//         
//         // Make API call to backend
//         fetch(apiEndpoint, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-Requested-With': 'XMLHttpRequest'
//             },
//             body: JSON.stringify(requestData)
//         })
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }
//             return response.json();
//         })
//         .then(data => {
//             console.log("Response received from backend:", data);
//             isProcessing = false;
//             
//             // Update conversation ID if provided
//             if (data.conversation_id) {
//                 window.conversationId = data.conversation_id;
//                 // Update hidden field if it exists
//                 const hiddenField = document.getElementById('conversation-id');
//                 if (hiddenField) {
//                     hiddenField.value = data.conversation_id;
//                 }
//             }
//             
//             // If the response contains phase information (for roleplay mode)
//             if (data.phase) {
//                 // Update any UI elements to reflect the current conversation phase
//                 console.log(`Conversation phase: ${data.phase}`);
//                 
//                 // Optional: Update the transcript with phase information or UI indicators
//                 if (transcriptContainer) {
//                     const phaseElement = document.getElementById('conversation-phase');
//                     if (phaseElement) {
//                         phaseElement.textContent = `Phase: ${data.phase.charAt(0).toUpperCase() + data.phase.slice(1)}`;
//                         phaseElement.style.display = 'block';
//                     }
//                 }
//             }
//             
//             // Speak the response
//             if (data.response) {
//                 speakText(data.response);
//             } else {
//                 console.error("No response text received from backend");
//                 updateUI('idle');
//             }
//             
//             logState("handleUserMessage BACKEND RESPONSE");
//         })
//         .catch(error => {
//             console.error("Error communicating with backend:", error);
//             isProcessing = false;
//             updateUI('error');
//             setTimeout(() => {
//                 updateUI('idle');
//             }, 1500);
//         });
//     }
//
//     // Function to toggle between coaching and roleplay modes
//     function toggleMode() {
//         // Toggle the mode
//         currentMode = currentMode === "coach" ? "roleplay" : "coach";
//         
//         // Update the UI
//         updateModeButtonText();
//         
//         // Show toast notification about mode change
//         const modeDescription = currentMode === "coach" ? "Coaching Mode" : "Roleplay Mode";
//         if (showToast) {
//             showToast(`Switched to ${modeDescription}`);
//         } else {
//             alert(`Switched to ${modeDescription}`);
//         }
//         
//         // Reset conversation when mode changes
//         resetConversation();
//         
//         console.log(`Mode changed to: ${currentMode}`);
//     }
//     
//     // Update the mode button text based on current mode
//     function updateModeButtonText() {
//         if (modeToggleButton) {
//             if (currentMode === "coach") {
//                 modeToggleButton.textContent = "Switch to Roleplay";
//                 modeToggleButton.classList.remove("roleplay-mode");
//                 modeToggleButton.classList.add("coach-mode");
//             } else {
//                 modeToggleButton.textContent = "Switch to Coaching";
//                 modeToggleButton.classList.remove("coach-mode");
//                 modeToggleButton.classList.add("roleplay-mode");
//             }
//         }
//     }
//     
//     // Reset the conversation
//     function resetConversation() {
//         // Clear any ongoing conversation
//         pendingText = '';
//         finalTranscript = '';
//         
//         // Clear the conversation status
//         if (conversationStatus) {
//             conversationStatus.textContent = "Click button to talk";
//         }
//         
//         // Update the UI
//         updateUI('idle');
//     }
//
//     // Helper function to show toast notifications (if available)
//     function showToast(message) {
//         // Check if toast container exists
//         const toastContainer = document.getElementById('toast-container');
//         if (toastContainer) {
//             // Create toast element
//             const toast = document.createElement('div');
//             toast.className = 'toast';
//             toast.textContent = message;
//             
//             // Add to container
//             toastContainer.appendChild(toast);
//             
//             // Show the toast
//             setTimeout(() => {
//                 toast.classList.add('show');
//             }, 10);
//             
//             // Remove after 3 seconds
//             setTimeout(() => {
//                 toast.classList.remove('show');
//                 setTimeout(() => {
//                     toastContainer.removeChild(toast);
//                 }, 300);
//             }, 3000);
//             
//             return true;
//         }
//         return false;
//     }
//
//     // ... (Other internal helper functions can go here)
//
//     // --- Public Interface (returned by the IIFE) ---
//     return {
//         init: init,
//         startListeningManual: startListeningManual,
//         stopListeningAndSend: stopListeningAndSend,
//         handleUserMessage: handleUserMessage,
//         speakText: speakText,
//         updateUI: updateUI,
//         toggleMode: toggleMode, // Expose the toggle mode function
//         getCurrentMode: () => currentMode // Expose getter for current mode
//     };
//
// })(); // <<< End IIFE Module
//
// // Add this to the end of the file or near related UI functions
// // Ensure all necessary DOM elements are defined or checked for existence
// console.log('Attaching DOMContentLoaded listener for voice interface init...'); 
// document.addEventListener('DOMContentLoaded', VoiceInterface.init); // <<< Call init via the module
