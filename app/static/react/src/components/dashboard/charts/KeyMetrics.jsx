/**
 * Key Metrics Component
 * 
 * Displays key performance metrics for the user's sales training.
 */

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import './KeyMetrics.css';

export const KeyMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch metrics from API
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const data = await api.getUserMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
        setError('Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);
  
  if (loading) {
    return (
      <div className="key-metrics">
        <h2 className="section-title">Key Metrics</h2>
        <div className="metrics-loading">Loading metrics...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="key-metrics">
        <h2 className="section-title">Key Metrics</h2>
        <div className="metrics-error">{error}</div>
      </div>
    );
  }
  
  if (!metrics) {
    return (
      <div className="key-metrics">
        <h2 className="section-title">Key Metrics</h2>
        <div className="metrics-empty">No metrics available</div>
      </div>
    );
  }
  
  return (
    <div className="key-metrics">
      <h2 className="section-title">Key Metrics</h2>
      
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-title">Overall Score</div>
          <div className="metric-value">{metrics.overall_score}</div>
          <div className="metric-label">out of 100</div>
          <div className={`metric-indicator ${metrics.overall_score >= 75 ? 'positive' : 'negative'}`}>
            {metrics.overall_score >= 75 ? '↑' : '↓'}
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">📞</div>
          <div className="metric-title">Calls</div>
          <div className="metric-value">{metrics.sessions_count}</div>
          <div className="metric-label">this month</div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-title">Time</div>
          <div className="metric-value">{metrics.training_time_hours}</div>
          <div className="metric-label">hours</div>
        </div>
      </div>
      
      <div className="metrics-extra">
        <div className="metrics-progress">
          <h3>Skill Breakdown</h3>
          {Object.entries(metrics.skills).map(([skill, value]) => (
            <div className="progress-item" key={skill}>
              <div className="progress-label">
                {skill.charAt(0).toUpperCase() + skill.slice(1).replace('_', ' ')}
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar" 
                  style={{ width: `${value}%` }}
                >
                  <span className="progress-value">{value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 