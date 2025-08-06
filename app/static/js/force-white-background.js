/**
 * Force White Background - React Component Style Injector
 * This script injects pure white background styles directly into React components
 */

// Execute immediately when loaded
(function() {
    console.log('⚪ Force White Background script loaded');
    
    // Create style element with aggressive white background rules
    const styleEl = document.createElement('style');
    styleEl.id = 'force-white-background-styles';
    styleEl.innerHTML = `
        /* Global CSS Variables Override */
        :root {
            --pitchiq-white: #FFFFFF !important;
            --pitchiq-light-gray: #FFFFFF !important;
            --background-color: #FFFFFF !important;
            --bs-body-bg: #FFFFFF !important;
            --bs-light-rgb: 255,255,255 !important;
            --bs-gray-100: #FFFFFF !important;
            --bs-gray-200: #FFFFFF !important;
        }
        
        /* Force white on ALL elements */
        html, body, #main-content, #root, [id*="react"], [id*="voice"], 
        .container, .container-fluid, .row, .col, div, section, main,
        .card, .card-body, .card-header, .py-10, .py-3, .py-5,
        [class*="bg-"], [class*="react-"], [class*="voice-"],
        [data-testid*="voice"], [data-testid*="react"],
        .transcript-display, .system-log, .status-badge {
            background-color: #FFFFFF !important;
            background: #FFFFFF !important;
            background-image: none !important;
        }
        
        /* Target specific Tailwind classes */
        .bg-gray-50, .bg-gray-100, .bg-gray-200, .bg-light {
            background-color: #FFFFFF !important;
            background: #FFFFFF !important;
        }
        
        /* Target React Portal containers */
        div[id^="react-"], div[id*="-portal"], div[class*="ReactModal"] {
            background-color: #FFFFFF !important;
            background: #FFFFFF !important;
        }
        
        /* Fix any ::before and ::after pseudo-elements */
        *::before, *::after {
            background-color: transparent !important;
            background: transparent !important;
        }
        
        /* Special exception for status indicators */
        .status-green {
            background-color: #28a745 !important;
        }
        .status-red {
            background-color: #dc3545 !important;
        }
    `;
    
    // Add to document head
    document.head.appendChild(styleEl);
    
    // Create a white background overlay div
    const overlayDiv = document.createElement('div');
    overlayDiv.id = 'force-white-background-overlay';
    overlayDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; background: #FFFFFF; z-index: -999; pointer-events: none;';
    document.body.appendChild(overlayDiv);
    
    // Recursive function to force white backgrounds on all elements
    function makeEverythingWhite() {
        document.documentElement.style.backgroundColor = '#FFFFFF';
        document.body.style.backgroundColor = '#FFFFFF';
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.backgroundColor = '#FFFFFF';
            mainContent.style.background = '#FFFFFF';
        }
        
        // Target React components specifically
        document.querySelectorAll('[id*="react"],[class*="react-"],[data-testid*="react"],[id*="voice"],[class*="voice-"],[data-testid*="voice"]').forEach(el => {
            el.style.backgroundColor = '#FFFFFF';
            el.style.background = '#FFFFFF';
        });
        
        // Target all divs that might be containers
        document.querySelectorAll('div, section, main, .container, .container-fluid, .card, .card-body').forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const bg = computedStyle.backgroundColor;
            
            // If background is not transparent and not already white
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && bg !== 'rgb(255, 255, 255)') {
                el.style.backgroundColor = '#FFFFFF';
                el.style.background = '#FFFFFF';
                console.log('🔄 Forced white background on:', el);
            }
        });
    }
    
    // Function to monitor and correct any changes to the DOM
    function setupBackgroundObserver() {
        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            
            mutations.forEach(mutation => {
                // If nodes were added, check them
                if (mutation.addedNodes.length > 0) {
                    needsUpdate = true;
                }
                
                // If attributes changed, especially style or class
                if (mutation.type === 'attributes' && 
                   (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    needsUpdate = true;
                }
            });
            
            if (needsUpdate) {
                makeEverythingWhite();
            }
        });
        
        // Start observing the entire document
        observer.observe(document.documentElement, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['style', 'class']
        });
        
        return observer;
    }
    
    // Run immediately
    makeEverythingWhite();
    
    // Run again after a delay to catch any dynamic content
    setTimeout(makeEverythingWhite, 500);
    setTimeout(makeEverythingWhite, 1000);
    
    // Set up the observer to catch any future changes
    const observer = setupBackgroundObserver();
    
    // Also run periodically as a final safety measure
    const interval = setInterval(makeEverythingWhite, 2000);
    
    // Specifically target the voice session start button
    setTimeout(() => {
        const startButton = document.getElementById('startButton');
        if (startButton) {
            startButton.addEventListener('click', function() {
                console.log('🎤 Voice session starting - enforcing white backgrounds');
                setTimeout(makeEverythingWhite, 100);
                setTimeout(makeEverythingWhite, 500);
                setTimeout(makeEverythingWhite, 1000);
            });
        }
    }, 1000);
    
    // Log completion
    console.log('⚪ Force White Background script initialized and running');
})();
