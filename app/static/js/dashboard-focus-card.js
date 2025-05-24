/**
 * Dashboard Focus Card - Determines the most important card to show
 * 
 * This script analyzes user performance metrics and generates the most relevant
 * focused insight card that would benefit the user the most.
 */

document.addEventListener('DOMContentLoaded', function() {
    // This code runs when the React app mounts to add additional functionality
    // Check if React app loaded correctly
    const reactRoot = document.getElementById('dashboard-root');
    
    // Listen for API data loads
    let userMetrics = null;
    let skillsRadar = null;
    let sessions = null;
    let insights = null;
    
    // Create a central function to determine the most important focus
    function determineMainFocus() {
        if (!userMetrics || !skillsRadar || !sessions) {
            return null; // Not enough data yet
        }
        
        // Find the weakest skill
        let weakestSkill = { name: '', score: 100 };
        if (skillsRadar && skillsRadar.skills) {
            for (const [skill, score] of Object.entries(skillsRadar.skills)) {
                if (score < weakestSkill.score) {
                    weakestSkill = { name: formatSkillName(skill), score: score };
                }
            }
        }
        
        // Find most recent trend
        let recentTrend = null;
        if (sessions && sessions.length >= 2) {
            const latestScore = sessions[0].overall_score;
            const previousScore = sessions[1].overall_score;
            recentTrend = {
                direction: latestScore >= previousScore ? 'positive' : 'negative',
                change: Math.abs(latestScore - previousScore),
                percentage: Math.round(Math.abs(latestScore - previousScore) / previousScore * 100)
            };
        }
        
        // Determine growth potential
        const growthPotential = calculateGrowthPotential(weakestSkill.score);
        
        // Choose the most important focus
        const focusOptions = [
            {
                type: 'improvement',
                priority: weakestSkill.score < 70 ? 1 : 3,
                title: `${weakestSkill.name} Improvement`,
                subtitle: 'Your most significant growth opportunity',
                content: `Based on your recent performance, focusing on ${weakestSkill.name.toLowerCase()} techniques could significantly improve your overall sales effectiveness. Improving in this area could boost your overall performance score.`,
                metrics: [
                    { label: 'Current Score', value: `${weakestSkill.score}%` },
                    { label: 'Growth Potential', value: `+${growthPotential}%` },
                    { label: 'Impact Level', value: weakestSkill.score < 60 ? 'High' : 'Medium' }
                ],
                primaryAction: 'Start Training',
                secondaryAction: 'View Details'
            },
            {
                type: recentTrend && recentTrend.direction === 'positive' ? 'success' : 'warning',
                priority: recentTrend && recentTrend.change > 5 ? 2 : 4,
                title: recentTrend && recentTrend.direction === 'positive' ? 'Performance Improving' : 'Performance Declining',
                subtitle: `${recentTrend && recentTrend.percentage}% ${recentTrend && recentTrend.direction === 'positive' ? 'increase' : 'decrease'} in recent sessions`,
                content: recentTrend && recentTrend.direction === 'positive' 
                    ? `Great job! Your recent performance shows significant improvement. Keep building on this momentum by continuing to practice consistently.`
                    : `Your recent performance shows a decline compared to previous sessions. This could be due to tackling more challenging scenarios or temporary factors.`,
                metrics: [
                    { label: 'Latest Score', value: `${sessions && sessions[0].overall_score}%` },
                    { label: 'Previous Score', value: `${sessions && sessions[1].overall_score}%` },
                    { label: 'Change', value: `${recentTrend && recentTrend.direction === 'positive' ? '+' : '-'}${recentTrend && recentTrend.percentage}%` }
                ],
                primaryAction: recentTrend && recentTrend.direction === 'positive' ? 'Continue Training' : 'Improvement Plan',
                secondaryAction: 'View Sessions'
            },
            {
                type: 'insight',
                priority: insights && insights.length > 0 ? 2 : 5,
                title: 'AI Insight',
                subtitle: 'Personalized recommendation',
                content: insights && insights.length > 0 ? insights[0].message : 'Keep practicing consistently to improve your sales skills across all areas.',
                metrics: [
                    { label: 'Relevance', value: 'High' },
                    { label: 'Based On', value: `${sessions ? sessions.length : 0} Sessions` },
                    { label: 'Focus Area', value: weakestSkill.name }
                ],
                primaryAction: 'Apply Insight',
                secondaryAction: 'Learn More'
            }
        ];
        
        // Sort by priority (lower number = higher priority)
        focusOptions.sort((a, b) => a.priority - b.priority);
        
        // Return the highest priority focus
        return focusOptions[0];
    }
    
    // Format skill name for display (convert from camelCase or snake_case)
    function formatSkillName(skill) {
        return skill
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, function(str) { return str.toUpperCase(); })
            .trim();
    }
    
    // Calculate growth potential based on current score
    function calculateGrowthPotential(score) {
        if (score < 50) return 25;
        if (score < 70) return 20;
        if (score < 85) return 15;
        return 10;
    }
    
    // Render the focus card with the provided data
    function renderFocusCard(focusData) {
        if (!focusData) return;
        
        const container = document.querySelector('.focus-card-container');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Create the focus card
        const card = document.createElement('div');
        card.className = `focus-card ${focusData.type}`;
        
        // Create header
        const header = document.createElement('div');
        header.className = 'focus-card-header';
        
        const type = document.createElement('div');
        type.className = 'focus-card-type';
        type.textContent = focusData.type.charAt(0).toUpperCase() + focusData.type.slice(1);
        
        const title = document.createElement('h2');
        title.textContent = focusData.title;
        
        const subtitle = document.createElement('div');
        subtitle.className = 'focus-card-subheader';
        subtitle.textContent = focusData.subtitle;
        
        header.appendChild(type);
        header.appendChild(title);
        header.appendChild(subtitle);
        
        // Create body
        const body = document.createElement('div');
        body.className = 'focus-card-body';
        
        const content = document.createElement('div');
        content.className = 'focus-card-content';
        content.textContent = focusData.content;
        
        const metrics = document.createElement('div');
        metrics.className = 'focus-card-metrics';
        
        // Add metrics
        focusData.metrics.forEach(metric => {
            const metricEl = document.createElement('div');
            metricEl.className = 'focus-metric';
            
            const value = document.createElement('div');
            value.className = 'metric-value';
            value.textContent = metric.value;
            
            const label = document.createElement('div');
            label.className = 'metric-label';
            label.textContent = metric.label;
            
            metricEl.appendChild(value);
            metricEl.appendChild(label);
            metrics.appendChild(metricEl);
        });
        
        // Create actions
        const actions = document.createElement('div');
        actions.className = 'focus-card-actions';
        
        const primaryBtn = document.createElement('button');
        primaryBtn.className = 'focus-card-button primary-action';
        primaryBtn.textContent = focusData.primaryAction;
        
        const secondaryBtn = document.createElement('button');
        secondaryBtn.className = 'focus-card-button secondary-action';
        secondaryBtn.textContent = focusData.secondaryAction;
        
        actions.appendChild(primaryBtn);
        actions.appendChild(secondaryBtn);
        
        // Assemble the card
        body.appendChild(content);
        body.appendChild(metrics);
        body.appendChild(actions);
        
        card.appendChild(header);
        card.appendChild(body);
        
        container.appendChild(card);
        
        // Add event listeners for buttons
        primaryBtn.addEventListener('click', function() {
            console.log('Primary action clicked:', focusData.primaryAction);
            // Implement actual action based on the button type
            alert(`Action: ${focusData.primaryAction} (Placeholder for actual implementation)`);
        });
        
        secondaryBtn.addEventListener('click', function() {
            console.log('Secondary action clicked:', focusData.secondaryAction);
            // Implement actual action based on the button type
            alert(`Action: ${focusData.secondaryAction} (Placeholder for actual implementation)`);
        });
    }
    
    // Watch for API data and update the focus card
    const originalFetch = window.fetch;
    window.fetch = function() {
        return originalFetch.apply(this, arguments)
            .then(response => {
                // Clone the response to inspect it without consuming it
                const clone = response.clone();
                const url = response.url;
                
                // Process based on API endpoint
                if (url.includes('/api/user/metrics')) {
                    clone.json().then(data => {
                        userMetrics = data;
                        const focus = determineMainFocus();
                        if (focus) renderFocusCard(focus);
                    });
                } else if (url.includes('/api/skills/radar')) {
                    clone.json().then(data => {
                        skillsRadar = data;
                        const focus = determineMainFocus();
                        if (focus) renderFocusCard(focus);
                    });
                } else if (url.includes('/api/sessions')) {
                    clone.json().then(data => {
                        sessions = data;
                        const focus = determineMainFocus();
                        if (focus) renderFocusCard(focus);
                    });
                } else if (url.includes('/api/insights/generate')) {
                    clone.json().then(data => {
                        insights = data;
                        const focus = determineMainFocus();
                        if (focus) renderFocusCard(focus);
                    });
                }
                
                return response;
            });
    };
    
    // Initial render with placeholder
    const initialFocus = {
        type: 'insight',
        title: 'Loading Your Focus Card',
        subtitle: 'Analyzing your performance data',
        content: 'We\'re analyzing your performance data to identify the most important area for you to focus on. This personalized recommendation will help you improve your sales skills effectively.',
        metrics: [
            { label: 'Status', value: 'Loading' },
            { label: 'Type', value: 'AI Insight' },
            { label: 'Relevance', value: 'High' }
        ],
        primaryAction: 'Please Wait',
        secondaryAction: 'Refresh Data'
    };
    
    renderFocusCard(initialFocus);
}); 