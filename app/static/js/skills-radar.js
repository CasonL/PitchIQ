/**
 * Skills Radar Chart Visualization
 * 
 * This script creates and renders an SVG radar chart to visualize skills data
 * from the API in the dashboard.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the skills visualization
    fetchSkillsData();
    
    // Fetch skills data from the API
    function fetchSkillsData() {
        fetch('/api/skills/radar')
            .then(response => response.json())
            .then(data => {
                if (data && data.skills) {
                    renderSkillsRadar(data.skills);
                    renderSkillsBars(data.skills);
                } else {
                    showError('Skills data not available');
                }
            })
            .catch(error => {
                console.error('Error fetching skills data:', error);
                showError('Failed to load skills data');
            });
    }
    
    // Render the radar chart
    function renderSkillsRadar(skills) {
        const container = document.getElementById('skills-radar-chart');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Get skill names and values
        const skillNames = Object.keys(skills);
        const skillValues = Object.values(skills);
        
        // Calculate radar chart parameters
        const numSkills = skillNames.length;
        if (numSkills === 0) return;
        
        // SVG dimensions
        const width = 300;
        const height = 300;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 30;
        
        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('class', 'radar-chart');
        
        // Draw radar levels (circles)
        const levels = 5; // 5 levels: 20%, 40%, 60%, 80%, 100%
        for (let i = 1; i <= levels; i++) {
            const levelRadius = radius * (i / levels);
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', centerX);
            circle.setAttribute('cy', centerY);
            circle.setAttribute('r', levelRadius);
            circle.setAttribute('class', 'radar-level');
            svg.appendChild(circle);
        }
        
        // Calculate points for each skill
        const skillPoints = [];
        for (let i = 0; i < numSkills; i++) {
            const angle = (i * 2 * Math.PI / numSkills) - Math.PI / 2;
            const value = skillValues[i] / 100; // Normalize to 0-1
            const x = centerX + radius * value * Math.cos(angle);
            const y = centerY + radius * value * Math.sin(angle);
            skillPoints.push({ x, y });
            
            // Draw axis for each skill
            const axisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            axisLine.setAttribute('x1', centerX);
            axisLine.setAttribute('y1', centerY);
            axisLine.setAttribute('x2', centerX + radius * Math.cos(angle));
            axisLine.setAttribute('y2', centerY + radius * Math.sin(angle));
            axisLine.setAttribute('class', 'radar-axis');
            svg.appendChild(axisLine);
            
            // Add skill label
            const labelX = centerX + (radius + 15) * Math.cos(angle);
            const labelY = centerY + (radius + 15) * Math.sin(angle);
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', labelX);
            label.setAttribute('y', labelY);
            label.setAttribute('class', 'radar-label');
            // Adjust text-anchor based on position
            if (Math.abs(angle) < 0.1 || Math.abs(angle - Math.PI) < 0.1) {
                label.setAttribute('text-anchor', 'middle');
            } else if (angle > -Math.PI / 2 && angle < Math.PI / 2) {
                label.setAttribute('text-anchor', 'start');
            } else {
                label.setAttribute('text-anchor', 'end');
            }
            label.textContent = formatSkillName(skillNames[i]);
            svg.appendChild(label);
        }
        
        // Create the skill area (polygon)
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('class', 'radar-area');
        const points = skillPoints.map(point => `${point.x},${point.y}`).join(' ');
        polygon.setAttribute('points', points);
        svg.appendChild(polygon);
        
        // Add points at each vertex
        skillPoints.forEach((point, i) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', 5);
            circle.setAttribute('class', 'radar-point');
            
            // Add a tooltip
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${formatSkillName(skillNames[i])}: ${skillValues[i]}%`;
            circle.appendChild(title);
            
            svg.appendChild(circle);
        });
        
        container.appendChild(svg);
    }
    
    // Render skill bars for easier comparison
    function renderSkillsBars(skills) {
        const container = document.getElementById('skills-breakdown');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create skill list
        const skillList = document.createElement('div');
        skillList.className = 'skills-list';
        
        // Sort skills by value (ascending)
        const sortedSkills = Object.entries(skills)
            .sort((a, b) => a[1] - b[1]);
        
        // Create a bar for each skill
        sortedSkills.forEach(([skill, value]) => {
            const skillItem = document.createElement('div');
            skillItem.className = 'skill-item';
            
            const nameSpan = document.createElement('div');
            nameSpan.className = 'skill-name';
            nameSpan.textContent = formatSkillName(skill);
            
            const barContainer = document.createElement('div');
            barContainer.className = 'skill-bar-container';
            
            const bar = document.createElement('div');
            bar.className = 'skill-bar';
            bar.style.width = `${value}%`;
            
            // Color coding based on value
            if (value < 60) {
                bar.style.backgroundColor = '#f5a742';
            } else if (value >= 80) {
                bar.style.backgroundColor = '#42f584';
            }
            
            const valueSpan = document.createElement('div');
            valueSpan.className = 'skill-value';
            valueSpan.textContent = `${value}%`;
            
            barContainer.appendChild(bar);
            
            skillItem.appendChild(nameSpan);
            skillItem.appendChild(barContainer);
            skillItem.appendChild(valueSpan);
            
            skillList.appendChild(skillItem);
        });
        
        container.appendChild(skillList);
    }
    
    // Format skill name for display (convert from camelCase or snake_case)
    function formatSkillName(skill) {
        return skill
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, function(str) { return str.toUpperCase(); })
            .trim();
    }
    
    // Display error message
    function showError(message) {
        const container = document.getElementById('skills-section');
        if (!container) return;
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = message;
        
        container.appendChild(errorDiv);
    }
}); 