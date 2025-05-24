/**
 * Sessions List and Visualization
 * 
 * This script fetches and displays session data from the API.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the sessions list
    fetchSessionsData();
    
    // Fetch sessions data from the API
    function fetchSessionsData() {
        fetch('/api/sessions?limit=10')
            .then(response => response.json())
            .then(data => {
                if (data && data.sessions && data.sessions.length > 0) {
                    renderSessionsList(data.sessions);
                    renderSessionsChart(data.sessions);
                } else {
                    showNoSessions();
                }
            })
            .catch(error => {
                console.error('Error fetching sessions data:', error);
                showError('Failed to load sessions data');
            });
    }
    
    // Render the sessions list
    function renderSessionsList(sessions) {
        const container = document.getElementById('sessions-list-container');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create sessions list
        const listElement = document.createElement('div');
        listElement.className = 'sessions-list';
        
        // Add sessions
        sessions.forEach(session => {
            const sessionCard = createSessionCard(session);
            listElement.appendChild(sessionCard);
        });
        
        container.appendChild(listElement);
    }
    
    // Create a session card
    function createSessionCard(session) {
        const card = document.createElement('div');
        card.className = 'session-card';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'session-header';
        
        const title = document.createElement('div');
        title.className = 'session-title';
        title.textContent = session.title || 'Untitled Session';
        
        const date = document.createElement('div');
        date.className = 'session-date';
        date.textContent = formatDate(session.date || session.created_at);
        
        header.appendChild(title);
        header.appendChild(date);
        
        // Create session type badge
        const typeBadge = document.createElement('div');
        typeBadge.className = `session-type ${session.type ? session.type.toLowerCase().replace(/\\s+/g, '-') : 'default'}`;
        typeBadge.textContent = session.type || 'Practice';
        
        // Create score display
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'session-score';
        
        const scoreLabel = document.createElement('span');
        scoreLabel.className = 'score-label';
        scoreLabel.textContent = 'Score: ';
        
        const scoreValue = document.createElement('span');
        scoreValue.className = 'score-value';
        scoreValue.textContent = `${session.overall_score || '?'}%`;
        
        scoreDisplay.appendChild(scoreLabel);
        scoreDisplay.appendChild(scoreValue);
        
        // Create progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'progress-container';
        
        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'progress';
        
        const progressValue = document.createElement('div');
        progressValue.className = 'progress-bar';
        progressValue.style.width = `${session.overall_score || 0}%`;
        progressValue.setAttribute('role', 'progressbar');
        progressValue.setAttribute('aria-valuenow', session.overall_score || 0);
        progressValue.setAttribute('aria-valuemin', 0);
        progressValue.setAttribute('aria-valuemax', 100);
        
        progressBar.appendChild(progressValue);
        progressContainer.appendChild(progressBar);
        
        // Create footer with action buttons
        const footer = document.createElement('div');
        footer.className = 'session-footer';
        
        const viewDetailsBtn = document.createElement('button');
        viewDetailsBtn.className = 'btn btn-sm btn-outline-primary';
        viewDetailsBtn.textContent = 'View Details';
        viewDetailsBtn.onclick = function() {
            alert(`View details for session ${session.id} (functionality to be implemented)`);
        };
        
        const practiceAgainBtn = document.createElement('button');
        practiceAgainBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
        practiceAgainBtn.textContent = 'Practice Again';
        practiceAgainBtn.onclick = function() {
            alert(`Start new practice session based on ${session.id} (functionality to be implemented)`);
        };
        
        footer.appendChild(viewDetailsBtn);
        footer.appendChild(practiceAgainBtn);
        
        // Assemble the card
        card.appendChild(header);
        card.appendChild(typeBadge);
        card.appendChild(scoreDisplay);
        card.appendChild(progressContainer);
        card.appendChild(footer);
        
        return card;
    }
    
    // Render sessions performance chart
    function renderSessionsChart(sessions) {
        const container = document.getElementById('sessions-chart-container');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create canvas for chart
        const canvas = document.createElement('canvas');
        canvas.id = 'sessionsChart';
        container.appendChild(canvas);
        
        // Extract data for chart
        const labels = sessions.map(session => formatDateShort(session.date || session.created_at));
        const scores = sessions.map(session => session.overall_score || 0);
        
        // Create chart context
        const ctx = canvas.getContext('2d');
        
        // Draw simple line chart using native canvas
        const width = canvas.width = container.clientWidth;
        const height = canvas.height = 200;
        const padding = 30;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // Draw background grid
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 1;
        
        // Horizontal lines (0%, 25%, 50%, 75%, 100%)
        for (let i = 0; i <= 4; i++) {
            const y = padding + chartHeight - (chartHeight * (i / 4));
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
            
            // Draw scale labels
            ctx.fillStyle = '#999';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`${i * 25}%`, padding - 5, y + 4);
        }
        
        // Draw data line
        if (scores.length > 0) {
            ctx.strokeStyle = '#4A6DF5';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            scores.forEach((score, i) => {
                const x = padding + (i / (scores.length - 1 || 1)) * chartWidth;
                const y = padding + chartHeight - (score / 100) * chartHeight;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                // Draw data point
                ctx.fillStyle = '#4A6DF5';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Draw label
                ctx.fillStyle = '#666';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(labels[i], x, height - 10);
            });
            
            ctx.stroke();
        }
    }
    
    // Show message when no sessions are available
    function showNoSessions() {
        const container = document.getElementById('sessions-list-container');
        if (!container) return;
        
        container.innerHTML = '<div class="alert alert-info">No training sessions found. Start practicing to see your sessions here.</div>';
    }
    
    // Format date for display
    function formatDate(dateString) {
        if (!dateString) return 'Unknown Date';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Format date (short version) for chart labels
    function formatDateShort(dateString) {
        if (!dateString) return '?';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
        });
    }
    
    // Display error message
    function showError(message) {
        const container = document.getElementById('sessions-section');
        if (!container) return;
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = message;
        
        container.appendChild(errorDiv);
    }
}); 