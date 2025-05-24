/**
 * Skill Radar Chart Component
 * 
 * Displays a radar chart of the user's sales skills.
 */

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import './SkillRadar.css';

export const SkillRadar = () => {
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
        setError('Failed to load skill metrics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);
  
  // Calculate positions for radar chart points
  const calculatePoint = (value, index, total) => {
    const angle = (Math.PI * 2 * index) / total;
    // Scale value between 0 and 1, where 1 is the edge of the chart
    const scaledValue = value / 100;
    // Calculate position, center is at 50%
    const x = 50 + 40 * scaledValue * Math.sin(angle);
    const y = 50 - 40 * scaledValue * Math.cos(angle);
    return { x, y };
  };
  
  // Generate SVG polygon points for the radar chart
  const generatePolygonPoints = (skills) => {
    if (!skills) return '';
    
    const skillKeys = Object.keys(skills);
    return skillKeys
      .map((skill, i) => {
        const point = calculatePoint(skills[skill], i, skillKeys.length);
        return `${point.x},${point.y}`;
      })
      .join(' ');
  };
  
  if (loading) {
    return (
      <div className="skill-radar">
        <h2 className="section-title">Skill Radar</h2>
        <div className="radar-loading">Loading skills data...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="skill-radar">
        <h2 className="section-title">Skill Radar</h2>
        <div className="radar-error">{error}</div>
      </div>
    );
  }
  
  if (!metrics || !metrics.skills) {
    return (
      <div className="skill-radar">
        <h2 className="section-title">Skill Radar</h2>
        <div className="radar-empty">No skill data available</div>
      </div>
    );
  }
  
  const { skills } = metrics;
  
  return (
    <div className="skill-radar">
      <h2 className="section-title">Skill Radar</h2>
      
      <div className="radar-chart">
        <svg viewBox="0 0 100 100" className="radar-svg">
          {/* Background circles */}
          <circle cx="50" cy="50" r="40" className="radar-circle outer" />
          <circle cx="50" cy="50" r="30" className="radar-circle" />
          <circle cx="50" cy="50" r="20" className="radar-circle" />
          <circle cx="50" cy="50" r="10" className="radar-circle inner" />
          
          {/* Skill axes */}
          {Object.keys(skills).map((skill, i) => {
            const angle = (Math.PI * 2 * i) / Object.keys(skills).length;
            const x2 = 50 + 40 * Math.sin(angle);
            const y2 = 50 - 40 * Math.cos(angle);
            return (
              <line
                key={skill}
                x1="50"
                y1="50"
                x2={x2}
                y2={y2}
                className="radar-axis"
              />
            );
          })}
          
          {/* Skill polygon */}
          <polygon
            points={generatePolygonPoints(skills)}
            className="radar-area"
          />
          
          {/* Skill points */}
          {Object.keys(skills).map((skill, i) => {
            const point = calculatePoint(skills[skill], i, Object.keys(skills).length);
            return (
              <circle
                key={skill}
                cx={point.x}
                cy={point.y}
                r="2"
                className="radar-point"
              />
            );
          })}
        </svg>
        
        {/* Skill labels */}
        {Object.keys(skills).map((skill, i) => {
          const point = calculatePoint(100, i, Object.keys(skills).length);
          // Position the label a bit further out
          const labelX = 50 + 48 * Math.sin((Math.PI * 2 * i) / Object.keys(skills).length);
          const labelY = 50 - 48 * Math.cos((Math.PI * 2 * i) / Object.keys(skills).length);
          
          return (
            <div
              key={skill}
              className="radar-label"
              style={{
                left: `${labelX}%`,
                top: `${labelY}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {skill.charAt(0).toUpperCase() + skill.slice(1).replace('_', ' ')}
            </div>
          );
        })}
      </div>
      
      <div className="radar-legend">
        <div className="legend-item">
          <span className="score-high"></span>
          <span>80-100: Excellent</span>
        </div>
        <div className="legend-item">
          <span className="score-medium"></span>
          <span>60-79: Good</span>
        </div>
        <div className="legend-item">
          <span className="score-low"></span>
          <span>Below 60: Needs Work</span>
        </div>
      </div>
    </div>
  );
}; 