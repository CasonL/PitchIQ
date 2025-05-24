/**
 * Voice Feedback Integration
 * Handles the integration of voice metrics into the sales training feedback UI
 */

class VoiceFeedbackIntegration {
  constructor(conversationId) {
    this.conversationId = conversationId;
    this.metricsDisplay = null;
    this.metricsData = null;
    this.feedbackContainer = document.getElementById('voice-feedback-container');
    
    if (!this.feedbackContainer) {
      console.error('Voice feedback container not found');
      return;
    }
    
    this.init();
  }
  
  async init() {
    // Load required CSS
    this.loadStylesheet('/static/css/voice-metrics.css');
    
    // Create container for voice metrics
    this.createMetricsContainer();
    
    // Initialize metrics display
    this.initMetricsDisplay();
    
    // Load voice metrics data
    await this.loadVoiceMetrics();
  }
  
  loadStylesheet(path) {
    // Check if stylesheet is already loaded
    const links = document.getElementsByTagName('link');
    for (let i = 0; i < links.length; i++) {
      if (links[i].href.includes(path)) {
        return;
      }
    }
    
    // Create and append stylesheet link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = path;
    document.head.appendChild(link);
  }
  
  createMetricsContainer() {
    // Create section for voice metrics
    const section = document.createElement('section');
    section.className = 'feedback-section voice-metrics-section';
    section.innerHTML = `
      <h2>Voice Analysis</h2>
      <p class="section-description">Detailed metrics about your voice patterns during this conversation.</p>
      <div id="voice-metrics-display"></div>
    `;
    
    this.feedbackContainer.appendChild(section);
  }
  
  initMetricsDisplay() {
    // Dynamically load the VoiceMetricsDisplay component
    this.loadScript('/static/js/components/VoiceMetricsDisplay.js')
      .then(() => {
        if (typeof VoiceMetricsDisplay !== 'undefined') {
          this.metricsDisplay = new VoiceMetricsDisplay(
            document.getElementById('voice-metrics-display')
          );
          
          // If we already have metrics data, display it
          if (this.metricsData) {
            this.metricsDisplay.setMetrics(this.metricsData);
            this.metricsDisplay.render();
          }
        } else {
          console.error('VoiceMetricsDisplay component failed to load');
        }
      })
      .catch(err => {
        console.error('Error loading voice metrics component:', err);
      });
  }
  
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      
      document.head.appendChild(script);
    });
  }
  
  async loadVoiceMetrics() {
    try {
      const response = await fetch(`/api/advanced-voice-metrics?conversation_id=${this.conversationId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch voice metrics: ${response.status} ${response.statusText}`);
      }
      
      this.metricsData = await response.json();
      
      // Update UI with metrics data if display component is ready
      if (this.metricsDisplay) {
        this.metricsDisplay.setMetrics(this.metricsData);
        this.metricsDisplay.render();
      }
      
      // Dispatch event that metrics are loaded
      document.dispatchEvent(
        new CustomEvent('voiceMetricsLoaded', { detail: this.metricsData })
      );
      
    } catch (error) {
      console.error('Error fetching voice metrics:', error);
      
      // Show error in UI
      const metricsElement = document.getElementById('voice-metrics-display');
      if (metricsElement) {
        metricsElement.innerHTML = `
          <div class="metrics-error">
            <p>Unable to load voice metrics. ${error.message}</p>
          </div>
        `;
      }
    }
  }
  
  /**
   * Initialize voice feedback on the feedback page
   * @param {string} conversationId - The ID of the conversation
   */
  static initFeedback(conversationId) {
    if (!conversationId) {
      console.error('Cannot initialize voice feedback: No conversation ID provided');
      return;
    }
    
    document.addEventListener('DOMContentLoaded', () => {
      new VoiceFeedbackIntegration(conversationId);
    });
  }
}

// Expose to global scope for use in templates
window.VoiceFeedbackIntegration = VoiceFeedbackIntegration; 