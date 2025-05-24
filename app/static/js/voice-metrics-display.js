/**
 * Voice Metrics Display
 * Renders voice metrics data in a visually appealing format
 */

class VoiceMetricsDisplay {
  constructor(container) {
    this.container = container;
    this.metrics = null;
    this.scoreLabels = {
      excellent: { range: [90, 100], color: '#2ecc71' },
      good: { range: [75, 89], color: '#27ae60' },
      average: { range: [60, 74], color: '#f39c12' },
      fair: { range: [40, 59], color: '#e67e22' },
      needsWork: { range: [0, 39], color: '#e74c3c' }
    };
  }

  /**
   * Sets the metrics data to display
   * @param {Object} metrics - The voice metrics data
   */
  setMetrics(metrics) {
    this.metrics = metrics;
    return this;
  }

  /**
   * Gets the appropriate score category based on a numeric score
   * @param {number} score - The numeric score (0-100)
   * @returns {Object} The score category information
   */
  getScoreCategory(score) {
    for (const [category, data] of Object.entries(this.scoreLabels)) {
      const [min, max] = data.range;
      if (score >= min && score <= max) {
        return {
          label: category.replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^\w/, c => c.toUpperCase()),
          color: data.color
        };
      }
    }
    return { label: 'N/A', color: '#999' };
  }

  /**
   * Formats a timestamp into a readable date/time
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted date/time
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  /**
   * Renders a score circle with the given value
   * @param {number} score - The score value (0-100)
   * @param {string} label - The label for the score
   * @returns {string} HTML for the score circle
   */
  renderScoreCircle(score, label) {
    const { label: categoryLabel, color } = this.getScoreCategory(score);
    
    return `
      <div class="score-circle" style="--score-color: ${color}">
        <div class="score-value">${Math.round(score)}</div>
        <div class="score-label">${label}</div>
        <div class="score-category">${categoryLabel}</div>
      </div>
    `;
  }

  /**
   * Renders a metrics card with title and value
   * @param {string} title - The metric title
   * @param {string|number} value - The metric value
   * @param {string} [unit=''] - Optional unit for the value
   * @returns {string} HTML for the metric card
   */
  renderMetricCard(title, value, unit = '') {
    return `
      <div class="metric-card">
        <div class="metric-title">${title}</div>
        <div class="metric-value">${value}${unit ? ` <span class="metric-unit">${unit}</span>` : ''}</div>
      </div>
    `;
  }

  /**
   * Renders the voice metrics in the container
   */
  render() {
    if (!this.metrics) {
      this.container.innerHTML = '<div class="metrics-empty">No metrics data available</div>';
      return;
    }

    const {
      overall_score = 0,
      timestamp = new Date().toISOString(),
      pace = { wpm: 0, score: 0 },
      clarity = { score: 0 },
      tone = { score: 0 },
      fillers = { count: 0, score: 0 },
      loudness = { db: 0 },
      pitch = { avg: 0 },
      energy = { score: 0 },
      pause_distribution = { score: 0 },
      confidence_markers = { score: 0 }
    } = this.metrics;

    this.container.innerHTML = `
      <div class="voice-metrics-card">
        <div class="metrics-header">
          <h3>Voice Analysis</h3>
          <div class="metrics-timestamp">Analyzed: ${this.formatTimestamp(timestamp)}</div>
        </div>
        
        <div class="metrics-summary">
          <div class="overall-score">
            ${this.renderScoreCircle(overall_score, 'Overall')}
          </div>
          
          <div class="primary-metrics">
            ${this.renderScoreCircle(pace.score, 'Pace')}
            ${this.renderScoreCircle(clarity.score, 'Clarity')}
            ${this.renderScoreCircle(tone.score, 'Tone')}
          </div>
        </div>
        
        <div class="metrics-details">
          <div class="metrics-section">
            <h4>Speech Metrics</h4>
            <div class="metrics-grid">
              ${this.renderMetricCard('Speaking Rate', pace.wpm, 'WPM')}
              ${this.renderMetricCard('Filler Words', fillers.count, '')}
              ${this.renderMetricCard('Volume', Math.round(loudness.db), 'dB')}
            </div>
          </div>
          
          <div class="metrics-section">
            <h4>Presentation Metrics</h4>
            <div class="metrics-grid">
              ${this.renderMetricCard('Energy', Math.round(energy.score), '')}
              ${this.renderMetricCard('Pausing', Math.round(pause_distribution.score), '')}
              ${this.renderMetricCard('Confidence', Math.round(confidence_markers.score), '')}
            </div>
          </div>
        </div>
        
        <div class="metrics-footer">
          <div class="metrics-note">
            Powered by advanced voice analytics
          </div>
        </div>
      </div>
    `;
  }
}

// Expose to global scope
window.VoiceMetricsDisplay = VoiceMetricsDisplay; 