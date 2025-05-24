/**
 * Formats raw feedback text into structured HTML with proper styling
 */
function formatFeedback(feedbackText) {
    if (!feedbackText) return '';
    
    // Replace heading markers with proper HTML
    let formatted = feedbackText
        .replace(/### (.*?)(?=\n|$)/g, '<h3>$1</h3>')
        
        // Format bold text 
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        
        // Format lists (assumes proper markdown formatting)
        .replace(/^\s*- (.*?)$/gm, '<li>$1</li>')
        .replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>')
        
        // Convert consecutive lists into proper HTML lists
        .replace(/<li>(.*?)<\/li>\n<li>/g, '<li>$1</li>\n<li>')
        
        // Wrap lists in ul/ol tags
        .replace(/(<li>.*?<\/li>(\n|$))+/g, function(match) {
            // Check if this is a numbered list
            if (match.includes('1.') || match.includes('2.')) {
                return '<ol>' + match + '</ol>';
            } else {
                return '<ul>' + match + '</ul>';
            }
        })
        
        // Fix nested lists
        .replace(/<\/ul>\s*<ul>/g, '')
        .replace(/<\/ol>\s*<ol>/g, '')
        
        // Convert line breaks to paragraphs
        .replace(/\n\n+/g, '</p><p>')
        
        // Cleanup any remaining newlines
        .replace(/\n/g, '<br>');
    
    // Wrap everything in paragraphs
    if (!formatted.startsWith('<h3>') && !formatted.startsWith('<p>')) {
        formatted = '<p>' + formatted;
    }
    if (!formatted.endsWith('</p>') && !formatted.endsWith('</ul>') && !formatted.endsWith('</ol>')) {
        formatted = formatted + '</p>';
    }
    
    // Create section wrappers
    formatted = formatted.replace(/<h3>(.*?)<\/h3>/g, '</div><div class="feedback-section"><h3>$1</h3>');
    
    // Clean up the first empty div
    formatted = formatted.replace(/^<\/div>/, '');
    
    // Add final closing div
    formatted += '</div>';
    
    // Add special styling for scores
    formatted = formatted.replace(/(\d+)\/10/g, '<span class="score">$1/10</span>');
    
    return '<div class="feedback-container">' + formatted + '</div>';
}

// Attach to window for global access
window.formatFeedback = formatFeedback; 