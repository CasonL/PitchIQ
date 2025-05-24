/**
 * VoiceMetricsDisplay
 * Renders voice analysis metrics in a user-friendly visual format
 */

class VoiceMetricsDisplay {
    constructor(containerElement) {
        this.container = containerElement;
        this.metrics = null;
        this.categories = {
            pace: {
                title: 'Speaking Pace',
                description: 'Words per minute and overall pace assessment',
                icon: 'fa-gauge-high'
            },
            clarity: {
                title: 'Clarity & Articulation',
                description: 'How clearly each word is pronounced',
                icon: 'fa-waveform'
            },
            tone: {
                title: 'Tone Analysis',
                description: 'Emotional tone detected in your voice',
                icon: 'fa-chart-line'
            },
            patterns: {
                title: 'Speech Patterns',
                description: 'Recurring patterns in your communication',
                icon: 'fa-repeat'
            }
        };
    }

    /**
     * Set voice metrics data to display
     * @param {Object} metricsData - Voice metrics data
     */
    setMetrics(metricsData) {
        this.metrics = metricsData;
        return this;
    }

    /**
     * Render the voice metrics visualization
     */
    render() {
        if (!this.metrics) {
            this.container.innerHTML = '<div class="metrics-loading">No metrics data available</div>';
            return;
        }
        
        const html = `
            <div class="voice-metrics-card">
                <div class="metrics-header">
                    <h3>Voice Analysis Results</h3>
                    <div class="metrics-timestamp">Analyzed on ${this.formatDate(this.metrics.timestamp)}</div>
                </div>
                
                <div class="metrics-summary">
                    ${this.renderOverallScore()}
                </div>
                
                <div class="metrics-details">
                    ${this.renderPaceMetrics()}
                    ${this.renderClarityMetrics()}
                    ${this.renderToneMetrics()}
                    ${this.renderPatternsMetrics()}
                </div>
                
                <div class="voice-insights">
                    <h4>AI Voice Coach Insights</h4>
                    <div class="insights-content">
                        ${this.renderInsights()}
                    </div>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
        this.initInteractions();
    }

    renderOverallScore() {
        const score = this.metrics.overall_score || 0;
        const rating = this.getRatingLabel(score);
        
        return `
            <div class="overall-score">
                <div class="score-circle ${rating.toLowerCase()}">
                    <div class="score-value">${Math.round(score)}</div>
                </div>
                <div class="score-label">
                    <span class="rating ${rating.toLowerCase()}">${rating}</span>
                    <span class="score-description">Overall Voice Score</span>
                </div>
            </div>
        `;
    }

    renderPaceMetrics() {
        const pace = this.metrics.pace || {};
        const wpm = pace.words_per_minute || 0;
        const paceRating = this.getRatingLabel(pace.score || 0);
        
        return `
            <div class="metric-section" data-category="pace">
                <div class="metric-header">
                    <i class="fas ${this.categories.pace.icon}"></i>
                    <h4>${this.categories.pace.title}</h4>
                </div>
                <div class="metric-content">
                    <div class="pace-gauge">
                        <div class="gauge-container">
                            <div class="gauge-labels">
                                <span>Too Slow</span>
                                <span>Optimal</span>
                                <span>Too Fast</span>
                            </div>
                            <div class="gauge-track">
                                <div class="gauge-fill ${paceRating}" style="width: ${this.getPaceIndicatorPosition(wpm)}%"></div>
                            </div>
                        </div>
                        <div class="pace-value">${wpm} WPM</div>
                    </div>
                    <div class="pace-stats">
                        <div class="stat-item">
                            <span class="stat-label">Pauses</span>
                            <span class="stat-value">${pace.pause_count || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Avg Pause</span>
                            <span class="stat-value">${this.formatDuration(pace.avg_pause_duration || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderClarityMetrics() {
        const clarity = this.metrics.clarity || {};
        const clarityScore = clarity.score || 0;
        const clarityRating = this.getRatingLabel(clarityScore);
        
        return `
            <div class="metric-section" data-category="clarity">
                <div class="metric-header">
                    <i class="fas ${this.categories.clarity.icon}"></i>
                    <h4>${this.categories.clarity.title}</h4>
                </div>
                <div class="metric-content">
                    <div class="clarity-score">
                        <div class="progress-bar">
                            <div class="progress-fill ${clarityRating.toLowerCase()}" style="width: ${clarityScore}%"></div>
                        </div>
                        <div class="progress-value">${clarityRating}</div>
                    </div>
                    <div class="clarity-details">
                        <div class="stat-item">
                            <span class="stat-label">Pronunciation</span>
                            <span class="stat-value ${this.getRatingLabel(clarity.pronunciation_score || 0).toLowerCase()}">${Math.round(clarity.pronunciation_score || 0)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Articulation</span>
                            <span class="stat-value ${this.getRatingLabel(clarity.articulation_score || 0).toLowerCase()}">${Math.round(clarity.articulation_score || 0)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderToneMetrics() {
        const tone = this.metrics.tone || {};
        const emotions = tone.emotions || {};
        const primary = tone.primary_emotion || 'Neutral';
        
        // Convert emotion data to array for sorting
        const emotionData = Object.entries(emotions).map(([name, value]) => ({
            name: name,
            value: value
        })).sort((a, b) => b.value - a.value).slice(0, 4);
        
        return `
            <div class="metric-section" data-category="tone">
                <div class="metric-header">
                    <i class="fas ${this.categories.tone.icon}"></i>
                    <h4>${this.categories.tone.title}</h4>
                </div>
                <div class="metric-content">
                    <div class="primary-tone">
                        <span class="tone-label">Primary Tone</span>
                        <span class="tone-value">${primary}</span>
                    </div>
                    <div class="tone-distribution">
                        ${emotionData.map(emotion => `
                            <div class="tone-bar">
                                <div class="tone-bar-label">${this.capitalizeFirst(emotion.name)}</div>
                                <div class="tone-bar-track">
                                    <div class="tone-bar-fill" style="width: ${emotion.value * 100}%"></div>
                                </div>
                                <div class="tone-bar-value">${Math.round(emotion.value * 100)}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderPatternsMetrics() {
        const patterns = this.metrics.patterns || {};
        const fillerWords = patterns.filler_words || [];
        const repetitions = patterns.repetitions || [];
        
        return `
            <div class="metric-section" data-category="patterns">
                <div class="metric-header">
                    <i class="fas ${this.categories.patterns.icon}"></i>
                    <h4>${this.categories.patterns.title}</h4>
                </div>
                <div class="metric-content">
                    <div class="speech-patterns">
                        <div class="pattern-section">
                            <h5>Filler Words <span class="count">(${fillerWords.length})</span></h5>
                            <div class="pattern-items">
                                ${fillerWords.length > 0 
                                    ? fillerWords.map(item => `<div class="pattern-item">
                                        <span class="pattern-word">${item.word}</span>
                                        <span class="pattern-count">${item.count}×</span>
                                    </div>`).join('')
                                    : '<div class="empty-message">No filler words detected</div>'
                                }
                            </div>
                        </div>
                        <div class="pattern-section">
                            <h5>Repetitive Phrases <span class="count">(${repetitions.length})</span></h5>
                            <div class="pattern-items">
                                ${repetitions.length > 0
                                    ? repetitions.map(item => `<div class="pattern-item">
                                        <span class="pattern-word">${item.phrase}</span>
                                        <span class="pattern-count">${item.count}×</span>
                                    </div>`).join('')
                                    : '<div class="empty-message">No repetitive phrases detected</div>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderInsights() {
        const insights = this.metrics.insights || [];
        
        if (!insights.length) {
            return '<p>No voice coaching insights available for this conversation.</p>';
        }
        
        return `
            <ul class="insights-list">
                ${insights.map(insight => `
                    <li class="insight-item">
                        <div class="insight-category ${insight.category.toLowerCase()}">${insight.category}</div>
                        <div class="insight-content">${insight.text}</div>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    initInteractions() {
        // Add any interactive elements here if needed
    }

    // Helper methods
    getPaceIndicatorPosition(wpm) {
        // Position on a scale of 0-100 where:
        // 0-20: very slow (< 100 WPM)
        // 20-40: slow (100-120 WPM)
        // 40-60: optimal (120-150 WPM)
        // 60-80: fast (150-180 WPM)
        // 80-100: very fast (> 180 WPM)
        
        if (wpm < 100) return Math.max(wpm / 5, 5);
        if (wpm < 120) return 20 + ((wpm - 100) / 20) * 20;
        if (wpm < 150) return 40 + ((wpm - 120) / 30) * 20;
        if (wpm < 180) return 60 + ((wpm - 150) / 30) * 20;
        return Math.min(80 + ((wpm - 180) / 40) * 20, 95);
    }

    getRatingLabel(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 60) return 'Average';
        if (score >= 40) return 'Fair';
        return 'Needs Work';
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    formatDuration(seconds) {
        if (seconds < 1) {
            return `${Math.round(seconds * 1000)}ms`;
        }
        return `${seconds.toFixed(1)}s`;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Make available globally
window.VoiceMetricsDisplay = VoiceMetricsDisplay; 