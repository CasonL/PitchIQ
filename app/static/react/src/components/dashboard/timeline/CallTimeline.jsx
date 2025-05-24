/**
 * Call Timeline Component
 * 
 * Shows a timeline of recent calls with markers for different call phases.
 */

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import './CallTimeline.css';

export const CallTimeline = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  
  // Fetch recent sessions
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const data = await api.getSessions({ limit: 5 });
        setSessions(data);
        
        // Select the most recent session by default
        if (data.length > 0) {
          setSelectedSession(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError('Failed to load recent sessions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, []);
  
  // For now, use mock data for call phases
  const callPhases = [
    { name: 'Rapport', position: '10%' },
    { name: 'Discovery', position: '30%' },
    { name: 'Present', position: '50%' },
    { name: 'Objections', position: '70%' },
    { name: 'Close', position: '90%' }
  ];
  
  if (loading) {
    return (
      <div className="call-timeline">
        <h2 className="section-title">Recent Call Timeline</h2>
        <div className="timeline-loading">Loading sessions...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="call-timeline">
        <h2 className="section-title">Recent Call Timeline</h2>
        <div className="timeline-error">{error}</div>
      </div>
    );
  }
  
  if (sessions.length === 0) {
    return (
      <div className="call-timeline">
        <h2 className="section-title">Recent Call Timeline</h2>
        <div className="timeline-empty">No recent calls found</div>
      </div>
    );
  }
  
  return (
    <div className="call-timeline">
      <h2 className="section-title">Recent Call Timeline</h2>
      
      <div className="session-selector">
        {sessions.map(session => (
          <button
            key={session.id}
            className={`session-button ${selectedSession === session.id ? 'active' : ''}`}
            onClick={() => setSelectedSession(session.id)}
          >
            Session {session.id}
            <span className="session-date">
              {new Date(session.start_time).toLocaleDateString()}
            </span>
          </button>
        ))}
      </div>
      
      <div className="timeline-container">
        <div className="timeline-track">
          {callPhases.map((phase, index) => (
            <div
              key={index}
              className="timeline-marker"
              style={{ left: phase.position }}
            >
              {phase.name}
            </div>
          ))}
          
          {/* Progress indicator */}
          <div 
            className="timeline-progress" 
            style={{ width: '65%' }} // Would be dynamic based on session data
          />
        </div>
      </div>
      
      <div className="timeline-legend">
        <div className="legend-item">
          <span className="legend-color completed"></span>
          <span className="legend-label">Completed</span>
        </div>
        <div className="legend-item">
          <span className="legend-color current"></span>
          <span className="legend-label">Current Phase</span>
        </div>
        <div className="legend-item">
          <span className="legend-color upcoming"></span>
          <span className="legend-label">Upcoming</span>
        </div>
      </div>
    </div>
  );
}; 