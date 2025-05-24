/**
 * AudioService
 * Handles microphone access, audio recording, and audio level analysis
 */
export default class AudioService {
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private audioLevelCallback: ((level: number) => void) | null = null;
  private isActive = false;
  private animationFrame: number | null = null;
  // Add natural pause timing parameters
  private naturalResponseDelay = {
    min: 200, // Minimum delay in ms (based on human response research)
    max: 500  // Maximum delay in ms
  };
  
  constructor() {
    this.setupAudioContext();
  }
  
  /**
   * Set up the AudioContext and analyzer
   */
  private setupAudioContext() {
    try {
      // Create audio context (with browser compatibility)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Set up analyzer for audio levels
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 256; // Fast enough for real-time visualization
      this.analyzer.smoothingTimeConstant = 0.8; // Smooth transitions between levels
    } catch (error) {
      console.error('Error setting up AudioContext', error);
    }
  }
  
  /**
   * Start listening to microphone input
   * @param onAudioLevel Callback function to receive audio level updates (0-1)
   * @returns Promise resolving to success status
   */
  public async startListening(onAudioLevel: (level: number) => void): Promise<boolean> {
    try {
      // If already active, just return success
      if (this.isActive) return true;
      
      // Initialize audio context if needed
      if (!this.audioContext) {
        this.setupAudioContext();
      }
      
      // Resume audio context if suspended (browser policy)
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create and connect audio source
      this.source = this.audioContext!.createMediaStreamSource(this.mediaStream);
      this.source.connect(this.analyzer!);
      
      // Set callback and start analyzing
      this.audioLevelCallback = onAudioLevel;
      this.isActive = true;
      
      this.startAnalyzing();
      return true;
    } catch (error) {
      console.error('Error starting microphone', error);
      return false;
    }
  }
  
  /**
   * Stop listening to microphone input
   */
  public stopListening() {
    if (!this.isActive) return;
    
    // Cancel animation frame if active
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Stop and release microphone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Disconnect audio source
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    // Reset state
    this.audioLevelCallback = null;
    this.isActive = false;
  }
  
  /**
   * Start analyzing audio levels in real-time
   */
  private startAnalyzing() {
    if (!this.analyzer || !this.isActive) return;
    
    // Create data array for frequency analysis
    const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
    
    // Recursive function to analyze audio
    const analyze = () => {
      if (!this.isActive || !this.analyzer || !this.audioLevelCallback) return;
      
      // Get frequency data
      this.analyzer.getByteFrequencyData(dataArray);
      
      // Calculate audio level (0-1)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const level = Math.min(1, average / 128); // Normalize to 0-1
      
      // Send level to callback
      this.audioLevelCallback(level);
      
      // Continue analyzing in next animation frame
      this.animationFrame = requestAnimationFrame(analyze);
    };
    
    // Start analysis loop
    this.animationFrame = requestAnimationFrame(analyze);
  }
  
  /**
   * Clean up resources
   */
  public dispose() {
    this.stopListening();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyzer = null;
  }
  
  /**
   * Get a random natural pause duration within research-based parameters
   * Human conversations typically have 200-500ms gaps between turns
   */
  public getNaturalDelay(): number {
    return Math.floor(Math.random() * 
      (this.naturalResponseDelay.max - this.naturalResponseDelay.min + 1)) + 
      this.naturalResponseDelay.min;
  }
  
  /**
   * Set custom natural response delay parameters
   * @param min Minimum delay in ms (default: 200ms)
   * @param max Maximum delay in ms (default: 500ms)
   */
  public setNaturalResponseDelay(min: number, max: number) {
    if (min >= 0 && max > min) {
      this.naturalResponseDelay.min = min;
      this.naturalResponseDelay.max = max;
    }
  }
} 