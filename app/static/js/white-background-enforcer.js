/**
 * White Background Enforcer
 * Aggressively enforces white backgrounds on all elements, targeting React components
 */
(function() {
    console.log('🔄 White Background Enforcer loaded');
    
    // Function to recursively force white backgrounds on all elements
    function forceWhiteBackgrounds() {
        // Set the root variables directly
        document.documentElement.style.setProperty('--pitchiq-white', '#FFFFFF', 'important');
        document.documentElement.style.setProperty('--pitchiq-light-gray', '#FFFFFF', 'important');
        document.documentElement.style.setProperty('--background-color', '#FFFFFF', 'important');
        document.documentElement.style.setProperty('--bs-body-bg', '#FFFFFF', 'important');
        
        // Force white on body and main containers
        document.body.style.backgroundColor = '#FFFFFF';
        document.body.style.background = '#FFFFFF';
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.backgroundColor = '#FFFFFF';
            mainContent.style.background = '#FFFFFF';
        }
        
        // Target all React and voice agent related elements
        const targetSelectors = [
            // React components
            '[id*="react"]', '[class*="react"]',
            // Voice components
            '[id*="voice"]', '[class*="voice"]', 
            // Demo components
            '[id*="demo"]', '[class*="demo"]',
            // Transcript components
            '.transcript-display', '.system-log',
            // Bootstrap components
            '.container', '.container-fluid', '.row', '.col',
            '.card', '.card-body', '.card-header',
            // Tailwind background classes
            '.bg-gray-50', '.bg-gray-100', '.bg-gray-200',
            '.bg-light', '.bg-white'
        ].join(',');
        
        // Apply to all matching elements
        document.querySelectorAll(targetSelectors).forEach(el => {
            el.style.backgroundColor = '#FFFFFF';
            el.style.background = '#FFFFFF';
            el.style.backgroundImage = 'none';
        });
        
        // Find any non-white backgrounds and change them
        document.querySelectorAll('div, section, main, article').forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const bg = computedStyle.backgroundColor;
            
            // If background is not transparent and not white
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
                el.style.backgroundColor = '#FFFFFF';
                el.style.background = '#FFFFFF';
                console.log(`Changed background on ${el.tagName}${el.id ? '#'+el.id : ''} from ${bg} to white`);
            }
        });
    }
    
    // Wait for DOM to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnforcer);
    } else {
        initEnforcer();
    }
    
    function initEnforcer() {
        // Run immediately
        forceWhiteBackgrounds();
        
        // Run after a short delay to catch React components
        setTimeout(forceWhiteBackgrounds, 100);
        setTimeout(forceWhiteBackgrounds, 500);
        setTimeout(forceWhiteBackgrounds, 1000);
        
        // Set up MutationObserver to catch dynamically added elements
        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0 || 
                   (mutation.type === 'attributes' && 
                   (mutation.attributeName === 'style' || mutation.attributeName === 'class'))) {
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                forceWhiteBackgrounds();
            }
        });
        
        // Start observing the entire document
        observer.observe(document.documentElement, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['style', 'class']
        });
        
        // Also run periodically as a safety measure
        setInterval(forceWhiteBackgrounds, 2000);
        
        // Watch for voice session start
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', function() {
                console.log('🎤 Voice session starting - enforcing white backgrounds');
                // Force white backgrounds multiple times during session startup
                setTimeout(forceWhiteBackgrounds, 100);
                setTimeout(forceWhiteBackgrounds, 500);
                setTimeout(forceWhiteBackgrounds, 1000);
                setTimeout(forceWhiteBackgrounds, 2000);
                setTimeout(forceWhiteBackgrounds, 5000);
            });
        }
        
        console.log('⚪ White Background Enforcer initialized');
    }
})();
