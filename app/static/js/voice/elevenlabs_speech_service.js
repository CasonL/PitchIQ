/**
 * elevenlabs_speech_service.js
 * Handles speech-to-speech conversion using ElevenLabs API
 */

class ElevenLabsSpeechService {
  /**
   * Create a new ElevenLabs Speech Service
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - ElevenLabs API Key
   * @param {string} config.apiBaseUrl - Base URL for API (default: https://api.elevenlabs.io/v1)
   * @param {Function} config.onError - Error callback
   * @param {Function} config.onStateChange - State change callback
   * @param {Function} config.onProgress - Progress callback
   */
  constructor(config = {}) {
    // API Configuration
    this.apiKey = config.apiKey || '';
    this.apiBaseUrl = config.apiBaseUrl || 'https://api.elevenlabs.io/v1';
    
    // Callbacks
    this.onError = config.onError || null;
    this.onStateChange = config.onStateChange || null;
    this.onProgress = config.onProgress || null;
    
    // State tracking
    this.isInitialized = false;
    this.isRecording = false;
    this.isProcessing = false;
    this.isPlaying = false;
    
    // Audio context and recorder
    this.audioContext = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.audioStream = null;
    this.responseAudio = null;
    this.audioPlayer = null;
    
    // Progress tracking
    this.progressState = {
      upload: 0,
      processing: 0,
      download: 0
    };
    
    // Event callbacks
    this.onSpeechStart = config.onSpeechStart || null;
    this.onSpeechEnd = config.onSpeechEnd || null;
    this.onProcessingStart = config.onProcessingStart || null;
    this.onProcessingEnd = config.onProcessingEnd || null;
    
    // Bindings
    this._onDataAvailable = this._onDataAvailable.bind(this);
  }
  
  /**
   * Initialize the speech service
   * @param {Object} options - Configuration options
   * @returns {Promise<ElevenLabsSpeechService>} - This instance
   */
  async initialize(options = {}) {
    console.log('Initializing ElevenLabs Speech Service');
    
    // Apply options
    if (options.apiKey) this.apiKey = options.apiKey;
    if (options.onSpeechStart) this.onSpeechStart = options.onSpeechStart;
    if (options.onSpeechEnd) this.onSpeechEnd = options.onSpeechEnd;
    if (options.onProcessingStart) this.onProcessingStart = options.onProcessingStart;
    if (options.onProcessingEnd) this.onProcessingEnd = options.onProcessingEnd;
    if (options.onError) this.onError = options.onError;
    
    try {
      // Initialize audio context for recording
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Test API connectivity and cache available voices
      const apiAccessible = await this.testAPIConnectivity();
      if (!apiAccessible) {
        throw new Error('Failed to establish ElevenLabs API connectivity. Please check your API key and permissions.');
      }
      
      // Get and cache available voices
      this.availableVoices = await this.getAvailableVoices();
      
      if (this.availableVoices.length === 0) {
        console.warn('No voices available in your ElevenLabs account. Some functionality may be limited.');
      } else {
        console.log(`Cached ${this.availableVoices.length} voices from ElevenLabs API.`);
      }
      
      this.isInitialized = true;
      console.log('ElevenLabs Speech Service initialized successfully');
      return this;
    } catch (error) {
      console.error('Error initializing ElevenLabs Speech Service:', error);
      if (this.onError) this.onError(error);
      return this;
    }
  }
  
  /**
   * Start recording user's speech
   * @returns {Promise<boolean>} - Success status
   */
  async startRecording() {
    if (this.isProcessing || this.mediaRecorder?.state === 'recording') {
      console.warn('Recording already in progress');
      return false;
    }
    
    try {
      this.recordedChunks = [];
      
      // Get microphone access with specific constraints for better audio quality
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1, // Mono audio (required for speech processing)
          sampleRate: 44100, // Standard sample rate
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Check available MIME types to find the best supported one
      const mimeTypes = [
        'audio/webm;codecs=opus', // Preferred format
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/mpeg'
      ];
      
      let selectedMimeType = '';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log(`Using supported audio MIME type: ${type}`);
          break;
        }
      }
      
      if (!selectedMimeType) {
        console.warn('None of the preferred MIME types are supported. Using default.');
        selectedMimeType = 'audio/webm';
      }
      
      // Configure recorder for high quality audio with specific settings
      const options = {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000
      };
      
      console.log('Creating MediaRecorder with options:', options);
      this.mediaRecorder = new MediaRecorder(this.audioStream, options);
      
      // Set up event handlers
      this.mediaRecorder.addEventListener('dataavailable', this._onDataAvailable);
      
      // Also listen for errors
      this.mediaRecorder.addEventListener('error', (event) => {
        console.error('MediaRecorder error:', event);
        if (this.onError) this.onError(new Error('Error recording audio: ' + event.name));
      });
      
      // Start recording with smaller chunks for better handling
      this.mediaRecorder.start(250); // Collect data in 250ms chunks
      
      if (this.onSpeechStart) this.onSpeechStart();
      
      console.log('Started recording user speech with MIME type:', selectedMimeType);
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      if (this.onError) this.onError(error);
      return false;
    }
  }
  
  /**
   * Stop recording and process the speech
   * @param {Object} personaConfig - Configuration for persona voice
   * @returns {Promise<Blob>} - Audio blob of the recording
   */
  async stopRecording(cancelRequest = false) {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      console.warn('No active recording to stop');
      return null;
    }
    
    try {
      return new Promise((resolve) => {
        // Create one-time handler for the stop event
        const stopHandler = () => {
          // Clean up
          this.mediaRecorder.removeEventListener('stop', stopHandler);
          this.audioStream.getTracks().forEach(track => track.stop());
          
          if (this.onSpeechEnd) this.onSpeechEnd();
          
          // If this is a cancel request, resolve with null
          if (cancelRequest) {
            resolve(null);
            return;
          }

          // Create a blob from all the chunks
          if (this.recordedChunks.length === 0) {
            console.warn('No audio data recorded');
            resolve(null);
            return;
          }
          
          // Check the MIME type used for recording
          const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
          console.log(`Creating audio blob with MIME type: ${mimeType}`);
          
          // Create the blob with the specified MIME type
          const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
          
          // Log details about the recorded audio
          console.log('Recorded audio details:', {
            size: audioBlob.size + ' bytes',
            type: audioBlob.type,
            chunks: this.recordedChunks.length,
            duration: 'unknown' // We don't track duration directly
          });
          
          // Verify that the blob has a reasonable size (at least 1KB)
          if (audioBlob.size < 1024) {
            console.warn('Audio recording is too small (< 1KB), may be corrupted or empty');
          }
          
          // Play a short preview to validate recording (optional, for debugging)
          if (audioBlob.size > 0) {
            this._validateAudioBlob(audioBlob)
              .then(isValid => {
                if (!isValid) {
                  console.warn('Audio blob validation failed - the audio may be corrupted');
                } else {
                  console.log('Audio blob validation successful');
                }
                // Always resolve with the blob regardless of validation
                // ElevenLabs might be able to process it even if our validation fails
                this.recordedChunks = [];
                resolve(audioBlob);
              });
          } else {
            this.recordedChunks = [];
            resolve(null);
          }
        };
        
        // Add the stop handler
        this.mediaRecorder.addEventListener('stop', stopHandler);
        
        // Stop the recording
        this.mediaRecorder.stop();
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      if (this.onError) this.onError(error);
      return null;
    }
  }
  
  /**
   * Validate an audio blob by attempting to create an audio element
   * @private
   * @param {Blob} audioBlob - Audio blob to validate
   * @returns {Promise<boolean>} - Whether the audio is valid
   */
  async _validateAudioBlob(audioBlob) {
    return new Promise(resolve => {
      try {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio();
        
        // Set timeouts to prevent hanging
        const timeout = setTimeout(() => {
          console.warn('Audio validation timed out');
          URL.revokeObjectURL(audioUrl);
          resolve(false);
        }, 2000);
        
        // Success case
        audio.oncanplaythrough = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(audioUrl);
          resolve(true);
        };
        
        // Error case
        audio.onerror = (err) => {
          clearTimeout(timeout);
          console.error('Error validating audio:', err);
          URL.revokeObjectURL(audioUrl);
          resolve(false);
        };
        
        audio.src = audioUrl;
      } catch (error) {
        console.error('Exception during audio validation:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Cancel the current recording without processing
   */
  cancelRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.stopRecording(true);
      console.log('Recording cancelled');
    }
  }
  
  /**
   * Validate voice ID exists
   * @param {string} voiceId - Voice ID to validate
   * @returns {Promise<boolean>} - Whether voice exists
   */
  async validateVoiceId(voiceId) {
    try {
      // Get available voices
      const voices = await this.getAvailableVoices();
      
      // Check if voice ID exists
      return voices.some(voice => voice.voice_id === voiceId);
    } catch (error) {
      console.error('Error validating voice ID:', error);
      return false;
    }
  }
  
  /**
   * Process speech with ElevenLabs API
   * @param {Blob} audioBlob - Audio blob from recording
   * @param {Object} personaConfig - Persona configuration
   * @param {string} personaConfig.voiceId - Voice ID to use
   * @param {string} personaConfig.modelId - Model ID to use (default: eleven_multilingual_sts_v2)
   * @param {number} personaConfig.stability - Voice stability (0-1)
   * @param {number} personaConfig.clarity - Voice clarity (0-1) 
   * @param {number} personaConfig.style - Voice style (0-1)
   * @param {string} personaConfig.outputFormat - Output format (default: mp3_44100_128)
   * @returns {Promise<Blob>} - Processed audio blob
   */
  async processSpeech(audioBlob, personaConfig) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Clear previous audio
    this.responseAudio = null;
    
    // Apply defaults if needed
    const config = {
      voiceId: personaConfig.voiceId,
      modelId: personaConfig.modelId || 'eleven_multilingual_sts_v2',
      stability: personaConfig.stability || 0.5,
      clarity: personaConfig.clarity || 0.75,
      style: personaConfig.style || 0.0,
      outputFormat: personaConfig.outputFormat || 'mp3_44100_128',
      removeBackgroundNoise: personaConfig.removeBackgroundNoise || false
    };

    try {
      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('No audio data to process');
      }
      
      // Log audio blob details for debugging
      console.log('Audio blob details:', {
        type: audioBlob.type,
        size: audioBlob.size,
        lastModified: audioBlob.lastModified
      });
      
      // Validate the audio blob can be played
      const isAudioValid = await this._validateAudioBlob(audioBlob);
      if (!isAudioValid) {
        console.warn('Audio validation failed, but will still attempt to send to API');
      }
      
      // Make sure we have access to available voices
      if (!this.availableVoices || this.availableVoices.length === 0) {
        this.availableVoices = await this.getAvailableVoices();
      }
      
      // Check if the requested voice exists in the available voices
      const requestedVoiceExists = this.availableVoices.some(voice => voice.voice_id === config.voiceId);
      
      if (!requestedVoiceExists) {
        console.warn(`Voice ID '${config.voiceId}' not found in your ElevenLabs account.`);
        
        // Use the first available voice instead
        if (this.availableVoices.length > 0) {
          const fallbackVoice = this.availableVoices[0];
          config.voiceId = fallbackVoice.voice_id;
          console.log(`Using fallback voice instead: ${fallbackVoice.name} (${fallbackVoice.voice_id})`);
        } else {
          throw new Error('No voices available in your ElevenLabs account. Unable to process speech.');
        }
      }

      // Construct voice settings
      const voiceSettings = JSON.stringify({
        stability: config.stability,
        similarity_boost: config.clarity,
        style: config.style
      });
      
      // Log request parameters for debugging
      console.log('Speech-to-speech request parameters:', {
        voiceId: config.voiceId,
        modelId: config.modelId,
        voiceSettings,
        outputFormat: config.outputFormat,
        removeBackgroundNoise: config.removeBackgroundNoise
      });
      
      // Construct API endpoint with voice ID and output format
      const endpoint = `/speech-to-speech/${config.voiceId}?output_format=${config.outputFormat}`;
      
      // Create a new blob with the same content but explicit audio/webm MIME type
      // This ensures ElevenLabs gets the correct format regardless of what browser used
      const processedBlob = new Blob([audioBlob], { type: 'audio/webm' });
      
      const formData = new FormData();
      formData.append('audio', processedBlob, 'speech.webm');
      formData.append('model_id', config.modelId);
      formData.append('voice_settings', voiceSettings);
      
      if (config.removeBackgroundNoise) {
        formData.append('remove_background_noise', 'true');
      }
      
      console.log(`Sending request to ${this.apiBaseUrl}${endpoint}`);
      
      // Add callback to monitor request progress
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.apiBaseUrl}${endpoint}`, true);
      xhr.setRequestHeader('xi-api-key', this.apiKey);
      
      // Track progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          this._updateProgress('upload', progress);
        }
      });
      
      // Send the request and handle response
      const response = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            // For error responses, we need to handle blob response type differently
            console.error(`Error: ${xhr.status} - ${xhr.statusText}`);
            
            // For 400 errors, we need to read the actual error message from the response
            if (xhr.status === 400 && xhr.response) {
              // Create a reader to read the blob response
              const reader = new FileReader();
              reader.onload = function() {
                try {
                  // Try to parse the response as JSON to get the detailed error
                  const errorDetail = JSON.parse(reader.result);
                  console.error('API Error details:', errorDetail);
                  
                  // Create error with more details - properly format the error message
                  let errorMessage = `API Error ${xhr.status}`;
                  if (errorDetail.detail) {
                    // Handle various error detail formats
                    if (typeof errorDetail.detail === 'string') {
                      errorMessage += `: ${errorDetail.detail}`;
                    } else if (typeof errorDetail.detail === 'object') {
                      errorMessage += `: ${JSON.stringify(errorDetail.detail)}`;
                    }
                  } else if (errorDetail.message) {
                    errorMessage += `: ${errorDetail.message}`;
                  }
                  
                  const error = new Error(errorMessage);
                  error.status = xhr.status;
                  error.details = errorDetail;
                  reject(error);
                } catch (e) {
                  // If we can't parse as JSON, use the text directly
                  const errorMessage = reader.result || xhr.statusText;
                  console.error('API Error response:', errorMessage);
                  
                  const error = new Error(`API Error ${xhr.status}: ${errorMessage}`);
                  error.status = xhr.status;
                  reject(error);
                }
              };
              
              reader.onerror = function() {
                const error = new Error(`API Error: ${xhr.status}`);
                error.status = xhr.status;
                error.statusText = xhr.statusText;
                reject(error);
              };
              
              // Read the blob as text
              reader.readAsText(xhr.response);
            } else {
              // For other errors, just return the status
              const error = new Error(`API Error: ${xhr.status}`);
              error.status = xhr.status;
              error.statusText = xhr.statusText;
              reject(error);
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.responseType = 'blob';
        xhr.send(formData);
      });
      
      this.responseAudio = response;
      return response;
      
    } catch (error) {
      console.error('Error processing speech:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }
  
  /**
   * Update progress state
   * @private
   * @param {string} stage - Stage of processing ('upload', 'processing', 'download')
   * @param {number} progress - Progress percentage (0-100)
   */
  _updateProgress(stage, progress) {
    if (this.progressState[stage] !== undefined) {
      this.progressState[stage] = progress;
      
      if (this.onProgress) {
        this.onProgress({
          stage,
          progress,
          overall: (this.progressState.upload + this.progressState.processing + this.progressState.download) / 3
        });
      }
    }
  }
  
  /**
   * Play audio from blob
   * @param {Blob} audioBlob - Audio blob to play
   * @returns {Promise<void>} - Resolves when audio playback completes
   */
  async playAudio(audioBlob) {
    return new Promise((resolve, reject) => {
      try {
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioElement = new Audio(audioUrl);
        
        audioElement.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audioElement.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        
        audioElement.play();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Get available voices from ElevenLabs API
   * @returns {Promise<Array>} - List of available voices
   */
  async getAvailableVoices() {
    try {
      const response = await this._makeApiRequest('/voices', 'GET');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }
      
      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      if (this.onError) this.onError(error);
      return [];
    }
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
    }
    
    this.recordedChunks = [];
    this.isProcessing = false;
  }
  
  // Private methods
  
  /**
   * Handle data available event from MediaRecorder
   * @private
   */
  _onDataAvailable(event) {
    if (event.data && event.data.size > 0) {
      this.recordedChunks.push(event.data);
    }
  }
  
  /**
   * Make an API request to ElevenLabs
   * @private
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {any} body - Request body
   * @param {boolean} isFormData - Whether body is FormData
   * @returns {Promise<Response>} - Fetch response
   */
  async _makeApiRequest(endpoint, method, body = null, isFormData = false) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    const headers = {
      'xi-api-key': this.apiKey
    };
    
    if (!isFormData && body) {
      headers['Content-Type'] = 'application/json';
    }
    
    const options = {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
    };
    
    return fetch(url, options);
  }
  
  /**
   * Test API connectivity with a simple text-to-speech request
   * @param {string} voiceId - Voice ID to test with
   * @returns {Promise<boolean>} - Whether the API is accessible
   */
  async testAPIConnectivity(voiceId = "21m00Tcm4TlvDq8ikWAM") {
    try {
      console.log('Testing ElevenLabs API connectivity...');
      
      // First check if API key is empty
      if (!this.apiKey || this.apiKey.trim() === '') {
        console.error('API key is empty. Please provide a valid API key.');
        return false;
      }
      
      // Try a simple voices list request first (lowest permission level)
      const voicesResponse = await this._makeApiRequest('/voices', 'GET');
      if (!voicesResponse.ok) {
        throw new Error(`Failed to access voices endpoint: ${voicesResponse.status}`);
      }
      
      const voicesData = await voicesResponse.json();
      console.log(`Successfully retrieved ${voicesData.voices?.length || 0} voices.`);
      
      // Check if the specified voice exists
      const voiceExists = voicesData.voices?.some(voice => voice.voice_id === voiceId);
      if (!voiceExists) {
        console.warn(`Voice ID "${voiceId}" not found in your account. Available voices:`, 
          voicesData.voices?.map(v => ({ id: v.voice_id, name: v.name })));
        
        // If no specific voice found, use the first available voice
        if (voicesData.voices?.length > 0) {
          voiceId = voicesData.voices[0].voice_id;
          console.log(`Using first available voice instead: ${voiceId}`);
        } else {
          throw new Error('No voices available in your account');
        }
      }
      
      // Try a simple text-to-speech request (requires text-to-speech permission)
      const endpoint = `/text-to-speech/${voiceId}`;
      const textToSpeechBody = {
        text: "API test",
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      };
      
      console.log('Testing text-to-speech endpoint...');
      const textToSpeechResponse = await this._makeApiRequest(endpoint, 'POST', textToSpeechBody);
      
      if (!textToSpeechResponse.ok) {
        if (textToSpeechResponse.status === 401) {
          throw new Error('API key is invalid or expired');
        } else if (textToSpeechResponse.status === 403) {
          throw new Error('API key does not have permission for text-to-speech');
        } else {
          throw new Error(`Text-to-speech test failed: ${textToSpeechResponse.status}`);
        }
      }
      
      console.log('API connectivity test successful. You have access to text-to-speech functionality.');
      
      // Note: We don't test speech-to-speech here as it requires more permissions
      // and we want to establish basic connectivity first
      
      return true;
    } catch (error) {
      console.error('API connectivity test failed:', error);
      return false;
    }
  }
}

export { ElevenLabsSpeechService }; 