/**
 * Tailwind Theme Override
 * This script directly modifies Tailwind's theme variables at runtime
 */
(function() {
    console.log('🎨 Tailwind Theme Override loaded');
    
    // Function to override Tailwind CSS variables for background colors
    function overrideTailwindBackgroundColors() {
        // Create a style element for our overrides
        const styleEl = document.createElement('style');
        styleEl.id = 'tailwind-theme-overrides';
        
        // Add specific overrides for Tailwind theme variables
        styleEl.textContent = `
            :root {
                --tw-bg-opacity: 1 !important;
                --background: 255, 255, 255 !important;
                --card: 255, 255, 255 !important;
                --popover: 255, 255, 255 !important;
                --muted: 255, 255, 255 !important;
                --accent: 255, 255, 255 !important;
                
                /* Override React component's specific class */
                --tw-bg-background: #FFFFFF !important;
            }
            
            /* Target the exact component structure */
            .flex.flex-col.justify-center.items-center.w-full.min-h-screen.bg-background {
                background-color: #FFFFFF !important;
                background: #FFFFFF !important;
                background-image: none !important;
            }
            
            .bg-background {
                background-color: #FFFFFF !important;
                background: #FFFFFF !important;
                background-image: none !important;
            }
            
            .bg-card {
                background-color: #FFFFFF !important;
                background: #FFFFFF !important;
            }
            
            /* Force any element with deepgram in its class to have white background */
            [class*="deepgram"] {
                background-color: #FFFFFF !important;
                background: #FFFFFF !important;
            }
        `;
        
        // Add to document head with highest priority
        document.head.insertBefore(styleEl, document.head.firstChild);
        
        // Special handling for React components
        function forceWhiteOnReactComponents() {
            // Target the specific component structure we identified
            const reactComponents = document.querySelectorAll('.bg-background, .min-h-screen, .deepgram-voice-agent');
            
            reactComponents.forEach(el => {
                el.style.backgroundColor = '#FFFFFF';
                el.style.background = '#FFFFFF';
                
                // Also check all children
                el.querySelectorAll('*:not(button):not(.bg-green-500):not(.bg-green-600):not([class*="rounded-full"])').forEach(child => {
                    child.style.backgroundColor = '#FFFFFF';
                    child.style.background = '#FFFFFF';
                });
            });
        }
        
        // Create an observer to watch for React component rendering
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                forceWhiteOnReactComponents();
            });
        });
        
        // Start observing with a delay to ensure React has rendered
        setTimeout(() => {
            observer.observe(document.body, { 
                childList: true, 
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style'] 
            });
            forceWhiteOnReactComponents();
        }, 500);
        
        // Run periodically as well
        setInterval(forceWhiteOnReactComponents, 1000);
        
        // Also run when the Start Voice Chat button is clicked
        document.addEventListener('click', function(e) {
            if (e.target && (
                e.target.textContent.includes('Start Voice Chat') || 
                e.target.classList.contains('bg-green-500') ||
                (e.target.parentElement && e.target.parentElement.textContent.includes('Start Voice Chat'))
            )) {
                console.log('🎤 Start Voice Chat clicked - enforcing white backgrounds');
                setTimeout(forceWhiteOnReactComponents, 100);
                setTimeout(forceWhiteOnReactComponents, 500);
                setTimeout(forceWhiteOnReactComponents, 1000);
            }
        }, true);
    }
    
    // Wait for DOM to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', overrideTailwindBackgroundColors);
    } else {
        overrideTailwindBackgroundColors();
    }
    
    console.log('🎨 Tailwind Theme Override initialized');
})();
