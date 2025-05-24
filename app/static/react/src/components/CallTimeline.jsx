import React from 'react';
import { Link } from 'react-router-dom';
import './CallTimeline.css';

const CallTimeline = ({ sessions = [] }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end - start) / (1000 * 60));
    
    return `${durationMinutes} min`;
  };
  
  const getProgressBarWidth = (progressData) => {
    const { completed_phases } = progressData;
    return `${Math.min(100, (completed_phases / 5) * 100)}%`;
  };
  
  const formatPhase = (phase) => {
    return phase.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  if (sessions.length === 0) {
    return (
      <div className="call-timeline empty-state">
        <p>No recent calls found.</p>
        <button className="btn btn-primary">Start Practice Call</button>
      </div>
    );
  }

  return (
    <div className="call-timeline">
      {sessions.map((session) => (
        <div key={session.id} className="timeline-item">
          <div className="timeline-date">
            {formatDate(session.start_time)}
          </div>
          
          <div className="timeline-content">
            <div className="session-header">
              <h4>{session.title}</h4>
              <span className={`session-tag ${session.scenario.toLowerCase().replace(/\s+/g, '-')}`}>
                {session.scenario}
              </span>
            </div>
            
            <div className="session-meta">
              <span className="session-duration">
                <i className="far fa-clock"></i> {calculateDuration(session.start_time, session.end_time)}
              </span>
              {session.status === 'completed' && (
                <span className="session-score">
                  <i className="far fa-chart-bar"></i> Score: {session.score}
                </span>
              )}
            </div>
            
            <div className="session-progress">
              <div className="progress-label">
                <span>{formatPhase(session.progress.current_phase)}</span>
                <span className="progress-indicator">{session.progress.completed_phases}/5</span>
              </div>
              <div className="progress">
                <div 
                  className="progress-bar" 
                  style={{ width: getProgressBarWidth(session.progress) }}
                ></div>
              </div>
            </div>
            
            <div className="session-actions">
              <Link to={`/sessions/${session.id}`} className="btn btn-sm btn-outline-primary">
                View Details
              </Link>
              <Link to={`/sessions/${session.id}/transcript`} className="btn btn-sm btn-outline-secondary">
                Transcript
              </Link>
            </div>
          </div>
        </div>
      ))}
      
      <div className="timeline-more">
        <Link to="/sessions" className="view-all-link">
          View All Sessions <i className="fas fa-chevron-right"></i>
        </Link>
      </div>
    </div>
  );
};

export default CallTimeline; 