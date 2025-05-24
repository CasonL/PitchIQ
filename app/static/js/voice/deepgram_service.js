/**
 * deepgram_service.js
 * Service for speech-to-text using Deepgram
 */

class DeepgramService {
  /**
   * Create a new DeepgramService instance
   * @param {Object} options - Configuration options
   * @param {string} options.apiKey - Deepgram API key
   * @param {string} options.language - Language for transcription
   * @param {string} options.model - Model for transcription
   * @param {Function} options.onTranscriptUpdate - Callback for transcript updates
   * @param {Function} options.onError - Callback for errors
   */
  constructor(options = {}) {
    // API Configuration
    this.apiKey = options.apiKey || '';
    this.language = options.language || 'en';
    this.model = options.model || 'nova-2';
    
    // State tracking
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    
    // Event callbacks
    this.onTranscriptUpdate = options.onTranscriptUpdate || null;
    this.onError = options.onError || null;
    
    // Binding methods
    this._handleDataAvailable = this._handleDataAvailable.bind(this);
    this._handleError = this._handleError.bind(this);
  }
  
  /**
   * Initialize the service
   * @param {Object} options - Initialization options
   * @returns {Promise<DeepgramService>} - This instance
   */
  async initialize(options = {}) {
    console.log('Initializing Deepgram service');
    
    if (options.apiKey) this.apiKey = options.apiKey;
    if (options.language) this.language = options.language;
    if (options.model) this.model = options.model;
    if (options.onTranscriptUpdate) this.onTranscriptUpdate = options.onTranscriptUpdate;
    if (options.onError) this.onError = options.onError;
    
    // Check if API key is provided
    if (!this.apiKey) {
      console.warn('No Deepgram API key provided');
    }
    
    return this;
  }
  
  /**
   * Start recording audio
   * @returns {Promise<boolean>} - Success status
   */
  async startRecording() {
    if (this.isRecording) {
      console.warn('Recording already in progress');
      return false;
    }
    
    try {
      console.log('Starting recording for Deepgram');
      
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];
      
      // Set up event handlers
      this.mediaRecorder.addEventListener('dataavailable', this._handleDataAvailable);
      this.mediaRecorder.addEventListener('error', this._handleError);
      
      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      
      console.log('Recording started successfully');
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this._handleError(error);
      return false;
    }
  }
  
  /**
   * Stop recording and transcribe the audio
   * @returns {Promise<{success: boolean, transcript: string, audioBlob: Blob}>} - Transcribed text
   */
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn('No active recording to stop');
      return { success: false, transcript: '', audioBlob: null };
    }
    
    try {
      console.log('Stopping recording and starting transcription');
      
      // Create a promise to wait for media recorder to stop
      const audioBlob = await new Promise((resolve, reject) => {
        // Add event listener for when recording stops
        this.mediaRecorder.addEventListener('stop', () => {
          // Create audio blob from chunks
          const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
          resolve(blob);
        });
        
        // Add error event listener
        this.mediaRecorder.addEventListener('error', (error) => {
          reject(error);
        });
        
        // Stop the media recorder to trigger 'stop' event
        this.mediaRecorder.stop();
      });
      
      // Clean up resources
      this._cleanupRecording();
      
      // Transcribe the audio
      const transcript = await this._transcribeAudio(audioBlob);
      
      // Return a structured result object
      return {
        success: true,
        transcript: transcript || '',
        audioBlob: audioBlob
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      this._handleError(error);
      this._cleanupRecording();
      return { success: false, transcript: '', audioBlob: null };
    }
  }
  
  /**
   * Clean up resources and cancel any ongoing operations
   */
  cleanup() {
    this._cleanupRecording();
  }
  
  // Private methods
  
  /**
   * Handle audio data becoming available
   * @private
   * @param {Event} event - Data available event
   */
  _handleDataAvailable(event) {
    if (event.data.size > 0) {
      this.audioChunks.push(event.data);
    }
  }
  
  /**
   * Handle errors
   * @private
   * @param {Error} error - Error object
   */
  _handleError(error) {
    console.error('Deepgram service error:', error);
    
    if (this.onError) {
      this.onError(error);
    }
  }
  
  /**
   * Clean up recording resources
   * @private
   */
  _cleanupRecording() {
    // Stop media recorder if it's active
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
    }
    
    // Stop all tracks in the stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    // Reset state
    this.isRecording = false;
    this.mediaRecorder = null;
    this.stream = null;
    this.audioChunks = [];
  }
  
  /**
   * Transcribe audio using Deepgram API
   * @private
   * @param {Blob} audioBlob - Audio data to transcribe
   * @returns {Promise<string>} - Transcribed text
   */
  async _transcribeAudio(audioBlob) {
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('No audio data to transcribe');
      return null;
    }
    
    if (!this.apiKey) {
      console.error('Missing Deepgram API key');
      throw new Error('Missing Deepgram API key');
    }
    
    console.log(`Transcribing audio with size ${audioBlob.size} bytes`);
    
    try {
      // Convert blob to base64 for API transmission
      const reader = new FileReader();
      const audioBase64 = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });
      
      // Prepare API request
      const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBlob,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      // Extract transcript
      const transcript = data?.results?.channels[0]?.alternatives[0]?.transcript;
      
      if (!transcript) {
        console.warn('No transcript found in Deepgram response');
        return null;
      }
      
      console.log('Transcription successful:', transcript);
      
      // Trigger transcript update callback if provided
      if (this.onTranscriptUpdate) {
        this.onTranscriptUpdate(transcript);
      }
      
      return transcript;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      this._handleError(error);
      return null;
    }
  }
}

export { DeepgramService }; 