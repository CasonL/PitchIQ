// voice_test.js - React app for voice testing with real microphone functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get the root element
    const rootElement = document.getElementById('react-root');
    
    // Simple error display function
    const createErrorDisplay = (message) => {
        rootElement.innerHTML = `
            <div style="padding: 20px; margin: 20px; background-color: #ffeeee; border: 1px solid #ff6666; border-radius: 5px;">
                <h3>Voice Test Interface</h3>
                <p>${message}</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
    };

    try {
        // Check if React and ReactDOM are available
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
            console.error('React or ReactDOM not loaded');
            createErrorDisplay('Could not load React. Make sure React and ReactDOM are included in the page.');
            return;
        }

        // Voice state management
        const VoiceState = {
            isListening: false,
            isSpeaking: false,
            audioLevel: 0,
            
            // Audio context and nodes
            audioContext: null,
            analyzer: null,
            mediaStream: null,
            source: null,
            animationFrame: null,
            
            // Initialize audio context
            setupAudioContext() {
                try {
                    // Create audio context
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // Set up analyzer for audio levels
                    this.analyzer = this.audioContext.createAnalyser();
                    this.analyzer.fftSize = 256;
                    this.analyzer.smoothingTimeConstant = 0.8;
                    
                    console.log('Audio context initialized successfully');
                    return true;
                } catch (error) {
                    console.error('Error setting up AudioContext', error);
                    return false;
                }
            },
            
            // Start microphone
            async startListening() {
                try {
                    if (this.isListening) return true;
                    
                    // Initialize audio context if needed
                    if (!this.audioContext) {
                        if (!this.setupAudioContext()) return false;
                    }
                    
                    // Resume audio context if suspended (browser policy)
                    if (this.audioContext?.state === 'suspended') {
                        await this.audioContext.resume();
                    }
                    
                    // Request microphone access
                    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    
                    // Create and connect audio source
                    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
                    this.source.connect(this.analyzer);
                    
                    // Start analyzing audio levels
                    this.isListening = true;
                    this.startAnalyzing();
                    
                    console.log('Microphone started successfully');
                    return true;
                } catch (error) {
                    console.error('Error starting microphone', error);
                    return false;
                }
            },
            
            // Stop microphone
            stopListening() {
                if (!this.isListening) return;
                
                // Cancel animation frame if active
                if (this.animationFrame) {
                    cancelAnimationFrame(this.animationFrame);
                    this.animationFrame = null;
                }
                
                // Stop and release microphone
                if (this.mediaStream) {
                    this.mediaStream.getTracks().forEach(track => track.stop());
                    this.mediaStream = null;
                }
                
                // Disconnect audio source
                if (this.source) {
                    this.source.disconnect();
                    this.source = null;
                }
                
                // Reset state
                this.isListening = false;
                this.audioLevel = 0;
                console.log('Microphone stopped');
            },
            
            // Analyze audio levels
            startAnalyzing() {
                if (!this.analyzer || !this.isListening) return;
                
                // Create data array for frequency analysis
                const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
                
                // Self reference for closure
                const self = this;
                
                // Recursive function to analyze audio
                const analyze = function() {
                    if (!self.isListening || !self.analyzer) return;
                    
                    // Get frequency data
                    self.analyzer.getByteFrequencyData(dataArray);
                    
                    // Calculate audio level (0-1)
                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / dataArray.length;
                    self.audioLevel = Math.min(1, average / 128);
                    
                    // Update UI if component is mounted
                    if (self.updateUI) {
                        self.updateUI();
                    }
                    
                    // Continue analyzing in next animation frame
                    self.animationFrame = requestAnimationFrame(analyze);
                };
                
                // Start analysis loop
                this.animationFrame = requestAnimationFrame(analyze);
            },
            
            // Clean up resources
            dispose() {
                this.stopListening();
                
                if (this.audioContext && this.audioContext.state !== 'closed') {
                    this.audioContext.close();
                    this.audioContext = null;
                }
                
                this.analyzer = null;
            }
        };

        // Create a VoiceOrb component
        class VoiceOrb extends React.Component {
            render() {
                const { size, audioLevel } = this.props;
                
                // Calculate the orb size based on audio level
                const orbScale = 0.8 + (audioLevel * 0.2);
                const innerSize = size * orbScale;
                
                // Calculate color based on audio level (blue to purple)
                const r = Math.floor(50 + (audioLevel * 100));
                const g = Math.floor(100 + (audioLevel * 20));
                const b = 255;
                const color = `rgb(${r}, ${g}, ${b})`;
                
                return React.createElement('div', {
                    style: {
                        position: 'relative',
                        width: `${size}px`,
                        height: `${size}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }
                }, 
                    // Background pulse
                    React.createElement('div', {
                        style: {
                            position: 'absolute',
                            width: `${innerSize}px`,
                            height: `${innerSize}px`,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(200, 210, 255, 0.2)',
                            transition: 'all 0.1s ease-out',
                            transform: `scale(${1.2 + audioLevel * 0.5})`,
                            opacity: 0.4 + (audioLevel * 0.6)
                        }
                    }),
                    
                    // Main orb
                    React.createElement('div', {
                        style: {
                            width: `${innerSize}px`,
                            height: `${innerSize}px`,
                            borderRadius: '50%',
                            backgroundColor: color,
                            boxShadow: `0 0 ${10 + audioLevel * 20}px rgba(120, 150, 255, ${0.4 + audioLevel * 0.6})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.1s ease-out'
                        }
                    })
                );
            }
        }

        // Create a VoiceTestPage component
        class VoiceTestPage extends React.Component {
            constructor(props) {
                super(props);
                this.state = {
                    isListening: false,
                    audioLevel: 0
                };
                
                // Bind methods
                this.toggleMicrophone = this.toggleMicrophone.bind(this);
                this.updateAudioLevel = this.updateAudioLevel.bind(this);
                
                // Set update UI function in VoiceState
                VoiceState.updateUI = this.updateAudioLevel;
            }
            
            componentWillUnmount() {
                // Clean up resources
                VoiceState.dispose();
                VoiceState.updateUI = null;
            }
            
            updateAudioLevel() {
                // Update state with current audio level from VoiceState
                this.setState({
                    audioLevel: VoiceState.audioLevel
                });
            }
            
            async toggleMicrophone() {
                if (VoiceState.isListening) {
                    // Stop listening
                    VoiceState.stopListening();
                    this.setState({ isListening: false });
                } else {
                    // Start listening
                    const success = await VoiceState.startListening();
                    if (success) {
                        this.setState({ isListening: true });
                    } else {
                        alert('Failed to access microphone. Please check permissions.');
                    }
                }
            }
            
            render() {
                const { isListening, audioLevel } = this.state;
                
                return React.createElement('div', {
                    className: 'h-screen flex flex-col'
                }, [
                    // Header
                    React.createElement('header', {
                        className: 'bg-slate-800 text-white p-4',
                        key: 'header'
                    }, 
                        React.createElement('h1', {
                            className: 'text-xl font-semibold'
                        }, 'Voice Interface Test')
                    ),
                    
                    // Main content
                    React.createElement('main', {
                        className: 'flex-1 overflow-hidden',
                        key: 'main'
                    }, 
                        React.createElement('div', {
                            className: 'flex flex-col items-center justify-center h-full bg-slate-50'
                        }, [
                            // Voice Visualization
                            React.createElement('div', {
                                className: 'flex-1 flex items-center justify-center',
                                key: 'viz'
                            }, 
                                React.createElement(VoiceOrb, {
                                    size: 300,
                                    audioLevel: audioLevel
                                })
                            ),
                            
                            // Controls
                            React.createElement('div', {
                                className: 'p-6',
                                key: 'controls'
                            }, [
                                React.createElement('button', {
                                    className: `rounded-full h-16 w-16 flex items-center justify-center shadow-md transition-all ${
                                        isListening 
                                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                                            : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                                    }`,
                                    onClick: this.toggleMicrophone,
                                    key: 'mic-button'
                                }, 
                                    React.createElement('i', {
                                        className: isListening ? 'fas fa-stop' : 'fas fa-microphone'
                                    })
                                ),
                                React.createElement('div', {
                                    className: 'mt-4 text-center text-sm text-slate-500',
                                    key: 'status'
                                }, isListening 
                                    ? 'Listening... Speak now (Audio Level: ' + Math.round(audioLevel * 100) + '%)'
                                    : 'Click the microphone to start speaking'
                                )
                            ])
                        ])
                    ),
                    
                    // Footer
                    React.createElement('footer', {
                        className: 'bg-slate-100 p-3 text-center text-sm text-slate-500',
                        key: 'footer'
                    }, 'Voice interface implementation - Version 0.2')
                ]);
            }
        }

        // Render the component to the DOM
        ReactDOM.render(
            React.createElement(VoiceTestPage, null),
            rootElement
        );
        
        // Add some basic styling
        const style = document.createElement('style');
        style.textContent = `
            .h-screen { height: 100vh; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .flex-1 { flex: 1; }
            .items-center { align-items: center; }
            .justify-center { justify-content: center; }
            .text-center { text-align: center; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .bg-slate-800 { background-color: #1e293b; }
            .text-white { color: white; }
            .bg-red-600 { background-color: #dc2626; }
            .hover\\:bg-red-700:hover { background-color: #b91c1c; }
            .text-slate-500 { color: #64748b; }
            .text-slate-700 { color: #334155; }
            .text-xl { font-size: 1.25rem; }
            .text-sm { font-size: 0.875rem; }
            .p-3 { padding: 0.75rem; }
            .p-4 { padding: 1rem; }
            .p-6 { padding: 1.5rem; }
            .mt-4 { margin-top: 1rem; }
            .font-semibold { font-weight: 600; }
            .rounded-full { border-radius: 9999px; }
            .h-16 { height: 4rem; }
            .w-16 { width: 4rem; }
            .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .border { border-width: 1px; }
            .border-slate-200 { border-color: #e2e8f0; }
            .overflow-hidden { overflow: hidden; }
            .hover\\:bg-slate-100:hover { background-color: #f1f5f9; }
            .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
        `;
        document.head.appendChild(style);
    } catch (error) {
        console.error('Error initializing Voice Test app:', error);
        createErrorDisplay('Error initializing the Voice Test interface.');
    }
}); 