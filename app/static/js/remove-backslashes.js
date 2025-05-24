/**
 * Remove Backslashes Fix
 * 
 * This script removes unwanted backslash characters that appear in the DOM
 * between the main-content opening tag and the actual content.
 * It specifically targets the pattern '\ \ \' that was found in the page.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Backslash removal script starting...');
    
    // Target the main content area
    const mainContent = document.getElementById('main-content');
    
    if (mainContent) {
        console.log('Found main-content element');
        
        // Get all child nodes
        const childNodes = Array.from(mainContent.childNodes);
        
        // Look specifically for the '\ \ \' pattern
        childNodes.forEach((node, index) => {
            // Target text nodes
            if (node.nodeType === 3) {
                const text = node.textContent;
                // Check for backslash with space pattern
                if (text.includes('\\') && /\\\s+\\\s+\\/.test(text)) {
                    console.log('Found backslash pattern, removing node');
                    mainContent.removeChild(node);
                } else if (text.trim() === '') {
                    // Also remove empty text nodes (whitespace only) for cleanup
                    mainContent.removeChild(node);
                }
            }
        });
        
        // Also look for comments with dashes
        const allNodes = document.createNodeIterator(
            mainContent,
            NodeFilter.SHOW_COMMENT,
            null,
            false
        );
        
        let commentNode;
        while (commentNode = allNodes.nextNode()) {
            if (commentNode.nodeValue.includes('---')) {
                console.log('Found comment with dashes, removing');
                commentNode.parentNode.removeChild(commentNode);
            }
        }
        
        console.log('Backslash removal completed');
    }
}); 