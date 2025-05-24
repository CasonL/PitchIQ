/**
 * Dashboard JavaScript for Sales Training AI
 * Handles dashboard UI interactions and data visualization
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize skill progress bars with animation
    initializeSkillBars();
    
    // Setup conversation card hover effects
    setupConversationCards();
    
    // Handle profile statistics animations
    animateStatistics();
});

/**
 * Initialize skill progress bars with animation
 */
function initializeSkillBars() {
    const skillBars = document.querySelectorAll('.skill-progress-bar');
    
    if (skillBars.length === 0) return;
    
    // Animate skill bars on load
    setTimeout(() => {
        skillBars.forEach(bar => {
            const targetWidth = bar.getAttribute('data-progress') + '%';
            bar.style.width = targetWidth;
        });
    }, 300);
    
    // Add tooltips to skill bars if needed
    skillBars.forEach(bar => {
        const skillName = bar.closest('.skill-card').querySelector('h3').textContent;
        const skillValue = bar.getAttribute('data-progress');
        bar.setAttribute('title', `${skillName}: ${skillValue}%`);
    });
}

/**
 * Setup conversation card hover effects
 */
function setupConversationCards() {
    const conversationCards = document.querySelectorAll('.conversation-card');
    
    if (conversationCards.length === 0) return;
    
    conversationCards.forEach(card => {
        // Add hover animation
        card.addEventListener('mouseenter', function() {
            const arrow = this.querySelector('.conversation-arrow i');
            if (arrow) {
                arrow.style.transform = 'translateX(4px)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const arrow = this.querySelector('.conversation-arrow i');
            if (arrow) {
                arrow.style.transform = 'translateX(0)';
            }
        });
    });
}

/**
 * Animate statistics counters
 */
function animateStatistics() {
    const statValues = document.querySelectorAll('.stat-value');
    
    if (statValues.length === 0) return;
    
    statValues.forEach(stat => {
        const targetValue = parseInt(stat.textContent, 10);
        
        // Only animate if it's a number
        if (!isNaN(targetValue) && targetValue > 0) {
            // Start from 0
            let currentValue = 0;
            
            // Calculate animation duration based on value (faster for smaller numbers)
            const duration = Math.min(1500, Math.max(500, targetValue * 10));
            const interval = Math.max(5, Math.floor(duration / targetValue));
            
            // Create counter animation
            const counter = setInterval(() => {
                currentValue += 1;
                stat.textContent = currentValue;
                
                if (currentValue >= targetValue) {
                    clearInterval(counter);
                    stat.textContent = targetValue;
                }
            }, interval);
        }
    });
}

/**
 * Handle viewing and deleting history
 */
document.addEventListener('click', function(e) {
    // Delete conversation button
    if (e.target.matches('.delete-conversation-btn') || e.target.closest('.delete-conversation-btn')) {
        e.preventDefault();
        const button = e.target.closest('.delete-conversation-btn');
        const conversationId = button.getAttribute('data-id');
        
        if (confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
            deleteConversation(conversationId);
        }
    }
    
    // View feedback button
    if (e.target.matches('.view-feedback-btn') || e.target.closest('.view-feedback-btn')) {
        e.preventDefault();
        const button = e.target.closest('.view-feedback-btn');
        const conversationId = button.getAttribute('data-id');
        
        viewFeedback(conversationId);
    }
});

/**
 * Delete a conversation from the server
 * @param {string} conversationId - ID of conversation to delete
 */
async function deleteConversation(conversationId) {
    try {
        // Get CSRF token
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        // Show loading state on the card
        const card = document.querySelector(`.conversation-card[data-id="${conversationId}"]`);
        if (card) {
            card.classList.add('deleting');
        }
        
        // Send delete request
        const response = await fetch(`/chat/${conversationId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Remove the card with animation
            if (card) {
                card.classList.add('fade-out');
                setTimeout(() => {
                    card.remove();
                    
                    // Check if there are no conversations left
                    const remainingCards = document.querySelectorAll('.conversation-card');
                    if (remainingCards.length === 0) {
                        const emptyState = document.querySelector('.empty-conversations');
                        if (emptyState) {
                            emptyState.style.display = 'block';
                        }
                    }
                }, 300);
            }
        } else {
            // Remove loading state and show error
            if (card) {
                card.classList.remove('deleting');
            }
            alert(data.error || 'Failed to delete conversation');
        }
    } catch (err) {
        console.error('Error deleting conversation:', err);
        alert('An error occurred while deleting the conversation');
        
        // Remove loading state
        const card = document.querySelector(`.conversation-card[data-id="${conversationId}"]`);
        if (card) {
            card.classList.remove('deleting');
        }
    }
}

/**
 * View feedback for a conversation
 * @param {string} conversationId - ID of conversation to view feedback for
 */
async function viewFeedback(conversationId) {
    try {
        // Show loading state
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-overlay';
        loadingIndicator.innerHTML = '<div class="loading-spinner"></div>';
        document.body.appendChild(loadingIndicator);
        
        // Fetch feedback
        const response = await fetch(`/chat/${conversationId}/feedback`);
        const data = await response.json();
        
        // Remove loading indicator
        loadingIndicator.remove();
        
        if (response.ok) {
            // Create modal to display feedback
            const modal = document.createElement('div');
            modal.className = 'modal active';
            
            // Format the feedback content
            let formattedFeedback = data.feedback
                .replace(/### (.*?)( ###)?/g, '<h3>$1</h3>')
                .replace(/- (.*?)(\n|$)/g, '<li>$1</li>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>');
                
            // Wrap lists
            if (formattedFeedback.includes('<li>')) {
                formattedFeedback = formattedFeedback.replace(/<li>(.*?)<\/li>/g, function(match) {
                    return '<ul>' + match + '</ul>';
                }).replace(/<\/ul><ul>/g, '');
            }
            
            modal.innerHTML = `
                <div class="modal-background"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Performance Feedback</h3>
                        <button class="modal-close">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="feedbackContent">${formattedFeedback}</div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-close-btn">Close</button>
                        <button class="btn btn-primary download-feedback-btn">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.body.classList.add('modal-open');
            
            // Setup modal close buttons
            modal.querySelector('.modal-close').addEventListener('click', () => {
                closeModal(modal);
            });
            
            modal.querySelector('.modal-close-btn').addEventListener('click', () => {
                closeModal(modal);
            });
            
            // Setup download button
            modal.querySelector('.download-feedback-btn').addEventListener('click', () => {
                downloadFeedback(data.feedback);
            });
            
            // Close when clicking background
            modal.querySelector('.modal-background').addEventListener('click', () => {
                closeModal(modal);
            });
        } else {
            alert(data.error || 'Failed to load feedback');
        }
    } catch (err) {
        console.error('Error viewing feedback:', err);
        alert('An error occurred while loading the feedback');
        
        // Remove loading indicator if it exists
        const loadingIndicator = document.querySelector('.loading-overlay');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
}

/**
 * Close a modal
 * @param {HTMLElement} modal - Modal element to close
 */
function closeModal(modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    
    // Remove after animation
    setTimeout(() => {
        if (modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }, 300);
}

/**
 * Download feedback as a text file
 * @param {string} feedback - Feedback content
 */
function downloadFeedback(feedback) {
    // Create a sanitized version of the feedback (remove markdown)
    const sanitizedFeedback = feedback
        .replace(/### (.*?) ###/g, '$1\n')
        .replace(/\*/g, '');
    
    // Create a blob with the feedback
    const blob = new Blob([sanitizedFeedback], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-feedback-${new Date().toISOString().slice(0, 10)}.txt`;
    
    // Trigger download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}