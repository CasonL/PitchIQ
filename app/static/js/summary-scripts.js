document.addEventListener('DOMContentLoaded', function() {
    // Tab Navigation
    initializeTabs();
    
    // Setup Buyer Willingness Graph
    initializeWillingnessChart();
    
    // Setup event listeners for buttons
    initializeButtons();
    
    // Add interactivity to grid cards
    initializeGridCards();

    console.log("Session Summary page loaded and interactive elements initialized.");
});

/**
 * Initializes tab navigation system
 */
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to current tab and content
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Initializes the buyer willingness chart
 */
function initializeWillingnessChart() {
    const chartCanvas = document.getElementById('buyerWillingnessChart');
    if (!chartCanvas) return;
    
    const ctx = chartCanvas.getContext('2d');
    
    // Get stages from the data attribute or use defaults
    const stagesAttr = chartCanvas.getAttribute('data-stages');
    const stages = stagesAttr ? JSON.parse(stagesAttr) : ["Introduction", "Discovery", "Presentation", "Objection", "Closing"];
    
    // Get scores from data attributes or use defaults
    const trustScore = Number(chartCanvas.getAttribute('data-trust-score') || 50);
    const persuasionScore = Number(chartCanvas.getAttribute('data-persuasion-score') || 50);
    const confidenceScore = Number(chartCanvas.getAttribute('data-confidence-score') || 50);
    
    // Simplified stage labeling - only use the stage names
    const labels = stages;
    
    // Generate buyer willingness data based on stages and metrics
    const willingnessData = generateWillingnessData(stages, trustScore, persuasionScore, confidenceScore);
    
    // Ensure willingness data aligns with our labels
    while (willingnessData.length > labels.length) {
        willingnessData.pop();
    }
    
    // Add threshold annotation
    const annotations = {};
    
    // Add critical threshold line with better visibility
    annotations['thresholdLine'] = {
        type: 'line',
        xMin: 0,
        xMax: labels.length - 1,
        yMin: 20,
        yMax: 20,
        borderColor: 'rgba(220, 53, 69, 0.8)',
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
            content: 'Critical Threshold',
            enabled: true,
            position: 'start',
            backgroundColor: 'rgba(220, 53, 69, 0.9)',
            color: 'white',
            padding: 5,
            borderRadius: 4
        }
    };
    
    // Create the chart with a simpler design
    const buyerWillingnessChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Willingness to Buy',
                data: willingnessData,
                borderColor: '#d01e3b',
                backgroundColor: 'rgba(208, 30, 59, 0.05)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#d01e3b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 13
                        },
                        color: '#333'
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            size: 12
                        },
                        stepSize: 20
                    },
                    grid: {
                        color: 'rgba(200, 200, 200, 0.2)'
                    }
                }
            },
            plugins: {
                annotation: {
                    annotations: annotations
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 8,
                    callbacks: {
                        label: function(context) {
                            const value = Math.round(context.raw);
                            let status = value < 20 ? 'Not Interested' : 
                                         value < 40 ? 'Skeptical' : 
                                         value < 60 ? 'Somewhat Interested' : 
                                         value < 80 ? 'Interested' : 'Highly Interested';
                            
                            return `Willingness: ${value}% (${status})`;
                        }
                    }
                },
                legend: {
                    display: false,
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/**
 * Generates willingness to buy data based on stages and metrics
 * Considers rapport, product fit, and objection handling
 * Now uses deterministic calculation with minimal variation
 */
function generateWillingnessData(stages, trustScore, persuasionScore, confidenceScore) {
    const willingnessData = [];
    
    // Factor weights - can be adjusted for different scenarios
    const rapportWeight = 0.4;  // How important rapport/trust is
    const productWeight = 0.4;  // How important product fit/utility is
    const objectionWeight = 0.2; // How important handling objections is
    
    // Base values keyed by stage
    const stageBaseValues = {
        'Introduction': { 
            rapport: 20,
            product: 10,
            objection: 5
        },
        'Small Talk': {
            rapport: 30,
            product: 10,
            objection: 5
        },
        'Discovery': {
            rapport: 40,
            product: 30,
            objection: 20
        },
        'Presentation': {
            rapport: 50,
            product: 60,
            objection: 30
        },
        'Pitch': {
            rapport: 60,
            product: 70,
            objection: 40
        },
        'Objection': {
            rapport: 60,
            product: 50,
            objection: 60
        },
        'Closing': {
            rapport: 70,
            product: 80,
            objection: 70
        },
        'Default': {
            rapport: 40,
            product: 40,
            objection: 30
        }
    };
    
    // Influence factors from performance scores (0-100)
    const rapportFactor = trustScore / 100;
    const productFactor = persuasionScore / 100;
    const objectionFactor = confidenceScore / 100;
    
    // Calculate overall score to check for extremely poor performance
    const overallScore = (trustScore + persuasionScore + confidenceScore) / 3;
    
    // If the overall score is extremely poor (below 20), generate a flat, low willingness curve
    if (overallScore < 20) {
        // Return flat, low curve that stays below 20% willingness for extremely poor performance
        return stages.map((_, index) => 5 + (index * 2)); // Start at 5%, very slowly increase to max ~15%
    }
    
    // Create data for beginning, middle and end of each stage
    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageValues = stageBaseValues[stage] || stageBaseValues['Default'];
        
        // Calculate willingness components
        const rapportComponent = stageValues.rapport * rapportFactor;
        const productComponent = stageValues.product * productFactor;
        const objectionComponent = stageValues.objection * objectionFactor;
        
        // Calculate weighted willingness - now without random variation
        const willingness = (
            (rapportComponent * rapportWeight) + 
            (productComponent * productWeight) + 
            (objectionComponent * objectionWeight)
        );
        
        // Small fixed variation based on stage position
        const fixedVariation = (i / stages.length) * 3 - 1.5;
        const value = Math.min(Math.max(willingness + fixedVariation, 0), 100);
        
        willingnessData.push(value);
        
        // Add mid-stage point for smoother curve if not the last stage
        if (i < stages.length - 1) {
            const nextStage = stages[i+1];
            const nextValues = stageBaseValues[nextStage] || stageBaseValues['Default'];
            
            const nextRapportComponent = nextValues.rapport * rapportFactor;
            const nextProductComponent = nextValues.product * productFactor;
            const nextObjectionComponent = nextValues.objection * objectionFactor;
            
            const nextWillingness = (
                (nextRapportComponent * rapportWeight) + 
                (nextProductComponent * productWeight) + 
                (nextObjectionComponent * objectionWeight)
            );
            
            // Create deterministic mid-point
            const midValue = Math.min(Math.max(
                (willingness + nextWillingness) / 2 + ((i / stages.length) * 2 - 1), 
                0
            ), 100);
            
            willingnessData.push(midValue);
        }
    }
    
    // Add final point with slight adjustment from last stage
    const finalStage = stages[stages.length - 1];
    const finalValues = stageBaseValues[finalStage] || stageBaseValues['Default'];
    
    const finalRapportComponent = finalValues.rapport * rapportFactor;
    const finalProductComponent = finalValues.product * productFactor;
    const finalObjectionComponent = finalValues.objection * objectionFactor;
    
    const finalWillingness = (
        (finalRapportComponent * rapportWeight) + 
        (finalProductComponent * productWeight) + 
        (finalObjectionComponent * objectionWeight)
    );
    
    // Fixed adjustment for final point
    const finalAdjustment = -2;  // Slight decline at end
    const finalValue = Math.min(Math.max(finalWillingness + finalAdjustment, 0), 100);
    
    willingnessData.push(finalValue);
    
    // If scores are very low, ensure the willingness reflects that
    if (trustScore < 30 || persuasionScore < 30 || confidenceScore < 30) {
        // Scale down all values proportionally based on how low the scores are
        const minScore = Math.min(trustScore, persuasionScore, confidenceScore);
        const scaleFactor = Math.max(minScore / 100, 0.1); // At least 10% of original values
        return willingnessData.map(val => val * scaleFactor);
    }
    
    return willingnessData;
}

/**
 * Initializes button event listeners
 */
function initializeButtons() {
    document.getElementById('dashboardBtn')?.addEventListener('click', function() {
        window.location.href = this.getAttribute('data-url') || '/training/dashboard';
    });
    
    document.getElementById('newRoleplayBtn')?.addEventListener('click', function() {
        window.location.href = this.getAttribute('data-url') || '/training/roleplay';
    });
}

/**
 * Initializes hover effects for grid cards
 */
function initializeGridCards() {
    const gridCards = document.querySelectorAll('.grid-card');
    gridCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
} 