import React from 'react';
import './KeyMetrics.css';

const KeyMetrics = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="key-metrics">
        <div className="metrics-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading metrics...</span>
          </div>
        </div>
      </div>
    );
  }

  const formatProgress = (value) => {
    return value > 0 ? `+${value}%` : `${value}%`;
  };
  
  const getProgressClass = (value) => {
    return value >= 0 ? 'positive' : 'negative';
  };

  return (
    <div className="key-metrics">
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-icon sessions">
            <i className="fas fa-phone-alt"></i>
          </div>
          <div className="metric-content">
            <div className="metric-title">Training Sessions</div>
            <div className="metric-value">{metrics.sessions_count}</div>
            {metrics.progress && (
              <div className={`metric-trend ${getProgressClass(metrics.progress.last_week)}`}>
                {formatProgress(metrics.progress.last_week)} last week
              </div>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon time">
            <i className="fas fa-clock"></i>
          </div>
          <div className="metric-content">
            <div className="metric-title">Training Hours</div>
            <div className="metric-value">{metrics.training_time_hours}</div>
            {metrics.progress && (
              <div className={`metric-trend ${getProgressClass(metrics.progress.last_month)}`}>
                {formatProgress(metrics.progress.last_month)} last month
              </div>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon score">
            <i className="fas fa-chart-line"></i>
          </div>
          <div className="metric-content">
            <div className="metric-title">Overall Score</div>
            <div className="metric-value">{metrics.overall_score}</div>
          </div>
        </div>
      </div>

      {metrics.skills && (
        <div className="skills-metrics">
          <div className="skills-title">Key Skills Performance</div>
          <div className="skills-grid">
            {Object.entries(metrics.skills).map(([skill, score]) => (
              <div key={skill} className="skill-metric">
                <div className="skill-header">
                  <div className="skill-name">
                    {skill.split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </div>
                  <div className="skill-score">{score}</div>
                </div>
                <div className="skill-progress-container">
                  <div 
                    className="skill-progress-bar"
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.rank && (
        <div className="rank-section">
          <div className="rank-info">
            <div className="rank-title">Current Rank</div>
            <div className="rank-badge">{metrics.rank.current}</div>
          </div>
          <div className="rank-progress-container">
            <div className="rank-progress-bar" style={{ width: `${metrics.rank.progress_to_next}%` }}></div>
          </div>
          <div className="rank-status">
            {metrics.rank.progress_to_next}% to next rank
          </div>
        </div>
      )}

      {metrics.badges_earned && (
        <div className="badges-section">
          <div className="badges-info">
            <div className="badges-icon">
              <i className="fas fa-medal"></i>
            </div>
            <div className="badges-value">{metrics.badges_earned}</div>
            <div className="badges-label">Badges Earned</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyMetrics; 