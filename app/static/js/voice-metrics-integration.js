/**
 * Voice Metrics Integration
 * Handles retrieving voice metrics data from the API and displaying it using the VoiceMetricsDisplay component
 */

class VoiceMetricsIntegration {
  constructor(containerSelector, options = {}) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error(`Container not found: ${containerSelector}`);
      return;
    }

    this.options = {
      autoload: false,
      conversationId: null,
      messageId: null,
      ...options
    };

    this.display = new VoiceMetricsDisplay(this.container);
    this.isLoading = false;

    if (this.options.autoload && this.options.conversationId && this.options.messageId) {
      this.loadVoiceMetrics(this.options.conversationId, this.options.messageId);
    }

    // Setup API error handling
    this.handleApiError = this.handleApiError.bind(this);
  }

  /**
   * Loads voice metrics data from the API and displays it
   * @param {string} conversationId - ID of the conversation
   * @param {string} messageId - ID of the specific message
   * @returns {Promise<object>} - The metrics data
   */
  async loadVoiceMetrics(conversationId, messageId) {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      this.showLoading();
      
      const metricsData = await this.fetchVoiceMetrics(conversationId, messageId);
      
      if (metricsData && Object.keys(metricsData).length > 0) {
        this.display.setMetrics(metricsData);
        this.display.render();
      } else {
        this.showNoDataMessage();
      }
      
      return metricsData;
    } catch (error) {
      this.handleApiError(error);
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fetches voice metrics from the API
   * @param {string} conversationId - ID of the conversation
   * @param {string} messageId - ID of the specific message
   * @returns {Promise<object>} - Voice metrics data
   */
  async fetchVoiceMetrics(conversationId, messageId) {
    const url = `/api/advanced-voice-metrics?conversation_id=${conversationId}&message_id=${messageId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Handles API errors
   * @param {Error} error - The error that occurred
   */
  handleApiError(error) {
    console.error('Voice metrics API error:', error);
    this.container.innerHTML = `
      <div class="voice-metrics-error">
        <p>Unable to load voice metrics. Please try again later.</p>
        <small>${error.message}</small>
      </div>
    `;
  }

  /**
   * Shows loading indicator
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="metrics-loading">
        Loading voice analysis...
      </div>
    `;
  }

  /**
   * Shows a message when no voice data is available
   */
  showNoDataMessage() {
    this.container.innerHTML = `
      <div class="voice-metrics-card">
        <div class="metrics-header">
          <h3>Voice Analysis</h3>
        </div>
        <div style="padding: 2rem; text-align: center;">
          <p>No voice analysis data available for this message.</p>
          <small>Voice analysis is only available for audio messages processed with advanced voice recognition.</small>
        </div>
      </div>
    `;
  }

  /**
   * Manually refresh the metrics display
   */
  refresh() {
    if (this.display.metrics) {
      this.display.render();
    } else if (this.options.conversationId && this.options.messageId) {
      this.loadVoiceMetrics(this.options.conversationId, this.options.messageId);
    }
  }
}

// Expose to global scope
window.VoiceMetricsIntegration = VoiceMetricsIntegration; 