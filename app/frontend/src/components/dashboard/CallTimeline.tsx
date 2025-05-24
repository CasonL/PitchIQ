import React from 'react';
import './CallTimeline.css';

interface Session {
  id: number;
  title: string;
  start_time: string;
  duration: number;
  scenario: string;
  score: number;
  status: string;
}

interface CallTimelineProps {
  sessions: Session[];
}

const CallTimeline: React.FC<CallTimelineProps> = ({ sessions }) => {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="call-timeline card">
        <div className="timeline-empty">
          <p>No training sessions found.</p>
          <button className="start-session-btn">Start New Session</button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  const getScoreClass = (score: number): string => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    return 'needs-improvement';
  };

  return (
    <div className="call-timeline card">
      <div className="timeline-header">
        <div className="timeline-title">Recent Training Calls</div>
        <button className="new-session-btn">+ New Session</button>
      </div>
      
      <div className="timeline-list">
        {sessions.map((session) => (
          <div key={session.id} className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <div className="timeline-session-header">
                <div className="session-title">
                  {session.title}
                  <span className="session-type">{session.scenario}</span>
                </div>
                <div className={`session-score ${getScoreClass(session.score)}`}>
                  {session.score}
                </div>
              </div>
              
              <div className="timeline-session-meta">
                <div className="session-time">
                  <i className="far fa-clock"></i> {formatDate(session.start_time)}
                </div>
                <div className="session-duration">
                  <i className="fas fa-stopwatch"></i> {formatDuration(session.duration)}
                </div>
                <div className="session-status">
                  {session.status === 'completed' ? (
                    <span className="status-completed">
                      <i className="fas fa-check-circle"></i> Completed
                    </span>
                  ) : (
                    <span className="status-in-progress">
                      <i className="fas fa-circle-notch fa-spin"></i> In Progress
                    </span>
                  )}
                </div>
              </div>
              
              <div className="timeline-actions">
                <button className="action-btn view">
                  <i className="fas fa-eye"></i> View
                </button>
                <button className="action-btn transcript">
                  <i className="fas fa-file-alt"></i> Transcript
                </button>
                <button className="action-btn insights">
                  <i className="fas fa-lightbulb"></i> Insights
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {sessions.length > 0 && (
        <div className="timeline-footer">
          <button className="view-all-btn">View All Sessions</button>
        </div>
      )}
    </div>
  );
};

export default CallTimeline; 