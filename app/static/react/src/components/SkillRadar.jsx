import React, { useRef, useEffect } from 'react';
import './SkillRadar.css';

const SkillRadar = ({ skillsData }) => {
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!skillsData || Object.keys(skillsData).length === 0) return;
    
    drawRadarChart();
  }, [skillsData]);
  
  const formatSkillName = (name) => {
    return name.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const drawRadarChart = () => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    const skillsCount = Object.keys(skillsData).length;
    
    // Clear previous content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    // Define dimensions and center
    const size = Math.min(svg.clientWidth, svg.clientHeight);
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.38; // Leave room for labels
    
    // Create circles for the radar levels
    const levels = 5;
    for (let i = 1; i <= levels; i++) {
      const levelRadius = (radius / levels) * i;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', centerX);
      circle.setAttribute('cy', centerY);
      circle.setAttribute('r', levelRadius);
      circle.setAttribute('class', 'radar-level');
      svg.appendChild(circle);
    }
    
    // Create axis lines and labels
    const skills = Object.keys(skillsData);
    const points = [];
    
    skills.forEach((skill, i) => {
      const angle = (Math.PI * 2 * i) / skillsCount - Math.PI / 2;
      const skillValue = skillsData[skill] / 100; // Normalize to 0-1
      
      // Calculate axis end points
      const axisX = centerX + radius * Math.cos(angle);
      const axisY = centerY + radius * Math.sin(angle);
      
      // Draw axis line
      const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      axisLine.setAttribute('x1', centerX);
      axisLine.setAttribute('y1', centerY);
      axisLine.setAttribute('x2', axisX);
      axisLine.setAttribute('y2', axisY);
      axisLine.setAttribute('class', 'radar-axis');
      svg.appendChild(axisLine);
      
      // Add label
      const labelX = centerX + (radius + 20) * Math.cos(angle);
      const labelY = centerY + (radius + 20) * Math.sin(angle);
      
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', labelX);
      label.setAttribute('y', labelY);
      label.setAttribute('text-anchor', Math.abs(angle) < 0.1 || Math.abs(angle - Math.PI) < 0.1 ? 'middle' : 
                      angle < 0 || angle > Math.PI ? 'start' : 'end');
      label.setAttribute('dominant-baseline', Math.abs(angle + Math.PI/2) < 0.1 || Math.abs(angle - Math.PI/2) < 0.1 ? 'middle' : 
                      angle < -Math.PI/2 || angle > Math.PI/2 ? 'hanging' : 'auto');
      label.setAttribute('class', 'radar-label');
      label.textContent = formatSkillName(skill);
      svg.appendChild(label);
      
      // Calculate data points
      const pointX = centerX + radius * skillValue * Math.cos(angle);
      const pointY = centerY + radius * skillValue * Math.sin(angle);
      points.push({ x: pointX, y: pointY, skill, value: skillsData[skill] });
    });
    
    // Create polygon for data area
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const pointsAttr = points.map(p => `${p.x},${p.y}`).join(' ');
    polygon.setAttribute('points', pointsAttr);
    polygon.setAttribute('class', 'radar-area');
    svg.appendChild(polygon);
    
    // Add dots for each data point
    points.forEach(point => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', point.x);
      dot.setAttribute('cy', point.y);
      dot.setAttribute('r', 5);
      dot.setAttribute('class', 'radar-point');
      
      // Add tooltip functionality
      dot.setAttribute('data-skill', point.skill);
      dot.setAttribute('data-value', point.value);
      
      svg.appendChild(dot);
    });
  };
  
  const getAverageScore = () => {
    if (!skillsData || Object.keys(skillsData).length === 0) return 0;
    
    const sum = Object.values(skillsData).reduce((acc, val) => acc + val, 0);
    return Math.round(sum / Object.keys(skillsData).length);
  };
  
  if (!skillsData || Object.keys(skillsData).length === 0) {
    return (
      <div className="skill-radar card">
        <div className="radar-loading">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="skill-radar card">
      <div className="radar-header">
        <div className="radar-score">
          <span className="score-number">{getAverageScore()}</span>
          <span className="score-label">Overall</span>
        </div>
      </div>
      
      <div className="radar-container">
        <svg 
          ref={svgRef} 
          viewBox="0 0 300 300" 
          className="radar-chart"
        ></svg>
      </div>
      
      <div className="radar-legend">
        {Object.entries(skillsData).map(([skill, value]) => (
          <div key={skill} className="legend-item">
            <div className="legend-name">{formatSkillName(skill)}</div>
            <div className="legend-bar">
              <div className="legend-value" style={{ width: `${value}%` }}></div>
            </div>
            <div className="legend-score">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkillRadar; 