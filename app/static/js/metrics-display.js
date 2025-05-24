/**
 * Metrics Display 
 * 
 * This script fetches and displays key performance metrics from the API.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the metrics display
    fetchMetricsData();
    
    // Fetch metrics data from the API
    function fetchMetricsData() {
        fetch('/api/user/metrics')
            .then(response => response.json())
            .then(data => {
                if (data) {
                    renderMetricsCards(data);
                    renderMetricsCharts(data);
                } else {
                    showError('Metrics data not available');
                }
            })
            .catch(error => {
                console.error('Error fetching metrics data:', error);
                showError('Failed to load metrics data');
            });
    }
    
    // Render key metrics cards
    function renderMetricsCards(data) {
        const container = document.getElementById('key-metrics-container');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create metrics grid
        const metricsGrid = document.createElement('div');
        metricsGrid.className = 'metrics-grid';
        
        // Define metrics to display (with fallbacks if data is missing)
        const metrics = [
            {
                label: 'Total Sessions',
                value: data.total_sessions || 0,
                icon: 'fas fa-headset',
                color: '#4A6DF5'
            },
            {
                label: 'Practice Hours',
                value: formatHours(data.total_hours || 0),
                icon: 'fas fa-clock',
                color: '#42c5f5'
            },
            {
                label: 'Average Score',
                value: `${data.average_score || 0}%`,
                icon: 'fas fa-star',
                color: '#f5a742'
            },
            {
                label: 'Overall Progress',
                value: `${data.progress || 0}%`,
                icon: 'fas fa-chart-line',
                color: '#42f584'
            }
        ];
        
        // Create a card for each metric
        metrics.forEach(metric => {
            const card = createMetricCard(metric);
            metricsGrid.appendChild(card);
        });
        
        container.appendChild(metricsGrid);
    }
    
    // Create a single metric card
    function createMetricCard(metric) {
        const card = document.createElement('div');
        card.className = 'metric-card';
        
        const iconContainer = document.createElement('div');
        iconContainer.className = 'metric-icon';
        iconContainer.style.backgroundColor = `${metric.color}20`; // 20% opacity
        iconContainer.style.color = metric.color;
        
        const icon = document.createElement('i');
        icon.className = metric.icon;
        iconContainer.appendChild(icon);
        
        const content = document.createElement('div');
        content.className = 'metric-content';
        
        const value = document.createElement('div');
        value.className = 'metric-value';
        value.textContent = metric.value;
        
        const label = document.createElement('div');
        label.className = 'metric-label';
        label.textContent = metric.label;
        
        content.appendChild(value);
        content.appendChild(label);
        
        card.appendChild(iconContainer);
        card.appendChild(content);
        
        return card;
    }
    
    // Render metrics charts
    function renderMetricsCharts(data) {
        renderProgressChart(data);
        renderCategoryBreakdown(data);
    }
    
    // Render the progress chart
    function renderProgressChart(data) {
        const container = document.getElementById('progress-chart-container');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create title
        const title = document.createElement('div');
        title.className = 'chart-title';
        title.textContent = 'Progress Over Time';
        container.appendChild(title);
        
        // Get weekly progress data (or create demo data if not available)
        const progressData = data.weekly_progress || createDemoWeeklyProgress();
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'progressChart';
        container.appendChild(canvas);
        
        // Create chart context
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        const width = canvas.width = container.clientWidth;
        const height = canvas.height = 200;
        
        // Draw progress chart (simple area chart)
        const padding = 30;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        // Draw data area
        if (progressData.length > 0) {
            // Extract values
            const labels = progressData.map(item => item.label);
            const values = progressData.map(item => item.value);
            
            // Draw area
            ctx.fillStyle = 'rgba(74, 109, 245, 0.2)';
            ctx.beginPath();
            ctx.moveTo(padding, height - padding);
            
            values.forEach((value, i) => {
                const x = padding + (i / (values.length - 1)) * chartWidth;
                const y = padding + chartHeight - (value / 100) * chartHeight;
                ctx.lineTo(x, y);
            });
            
            ctx.lineTo(width - padding, height - padding);
            ctx.closePath();
            ctx.fill();
            
            // Draw line
            ctx.strokeStyle = '#4A6DF5';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            values.forEach((value, i) => {
                const x = padding + (i / (values.length - 1)) * chartWidth;
                const y = padding + chartHeight - (value / 100) * chartHeight;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                // Add data point
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#4A6DF5';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            
            ctx.stroke();
            
            // Add labels
            ctx.fillStyle = '#666';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            
            labels.forEach((label, i) => {
                const x = padding + (i / (labels.length - 1)) * chartWidth;
                ctx.fillText(label, x, height - padding + 15);
            });
        }
    }
    
    // Render category performance breakdown
    function renderCategoryBreakdown(data) {
        const container = document.getElementById('category-breakdown-container');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create title
        const title = document.createElement('div');
        title.className = 'chart-title';
        title.textContent = 'Category Performance';
        container.appendChild(title);
        
        // Get category data (or create demo data if not available)
        const categoryData = data.categories || createDemoCategories();
        
        // Create category list
        const categoryList = document.createElement('div');
        categoryList.className = 'category-list';
        
        // Sort categories by score (descending)
        const sortedCategories = [...categoryData].sort((a, b) => b.score - a.score);
        
        // Create a bar for each category
        sortedCategories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'category-name';
            nameLabel.textContent = category.name;
            
            const scoreContainer = document.createElement('div');
            scoreContainer.className = 'category-score-container';
            
            const scoreBar = document.createElement('div');
            scoreBar.className = 'category-score-bar';
            scoreBar.style.width = `${category.score}%`;
            
            // Color the bar based on score
            if (category.score < 60) {
                scoreBar.style.backgroundColor = '#f5a742';
            } else if (category.score >= 80) {
                scoreBar.style.backgroundColor = '#42f584';
            }
            
            scoreContainer.appendChild(scoreBar);
            
            const scoreValue = document.createElement('div');
            scoreValue.className = 'category-score-value';
            scoreValue.textContent = `${category.score}%`;
            
            categoryItem.appendChild(nameLabel);
            categoryItem.appendChild(scoreContainer);
            categoryItem.appendChild(scoreValue);
            
            categoryList.appendChild(categoryItem);
        });
        
        container.appendChild(categoryList);
    }
    
    // Format hours (e.g., 1.5 => "1h 30m")
    function formatHours(hours) {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        
        if (h === 0) {
            return `${m}m`;
        } else if (m === 0) {
            return `${h}h`;
        } else {
            return `${h}h ${m}m`;
        }
    }
    
    // Create demo weekly progress data
    function createDemoWeeklyProgress() {
        return [
            { label: 'Week 1', value: 45 },
            { label: 'Week 2', value: 52 },
            { label: 'Week 3', value: 58 },
            { label: 'Week 4', value: 65 },
            { label: 'Week 5', value: 72 },
            { label: 'Week 6', value: 68 },
            { label: 'Week 7', value: 75 },
            { label: 'Week 8', value: 82 }
        ];
    }
    
    // Create demo category data
    function createDemoCategories() {
        return [
            { name: 'Cold Calling', score: 78 },
            { name: 'Objection Handling', score: 65 },
            { name: 'Product Knowledge', score: 92 },
            { name: 'Need Discovery', score: 86 },
            { name: 'Closing Techniques', score: 70 }
        ];
    }
    
    // Display error message
    function showError(message) {
        const container = document.getElementById('metrics-section');
        if (!container) return;
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = message;
        
        container.appendChild(errorDiv);
    }
}); 