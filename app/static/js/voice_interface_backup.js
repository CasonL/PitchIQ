// Voice Interface Script

// DOM elements
const orb = document.getElementById('voice-orb');
const transcriptContainer = document.getElementById('transcript');
const conversationStatus = document.getElementById('conversation-status');
const toggleRecordButton = document.getElementById('toggle-record');
const feedbackPanel = document.getElementById('feedback-panel');
const voiceSelectionToggle = document.getElementById('voice-selection-toggle');
const voiceSelectionModal = document.getElementById('voice-selection-modal');
const closeModalButton = document.getElementById('close-modal');
const voiceOptions = document.querySelectorAll('.voice-option');

// Voice settings
let useElevenLabs = false; // Default to false, will be set based on DOM element

// Get conversation ID from hidden field or window variable
const conversationId = document.getElementById('conversation-id')?.value || window.conversationId;

// Voice selection state
let selectedVoice = {
    id: 'rachel',
    name: 'Rachel',
    description: 'Clear and professional female voice'
};

// Speech recognition setup
let recognition;
let isRecognizing = false;
let transcript = "";
let isUserTurn = true;
let isAISpeaking = false;

// Add pause detection variables
let pauseDetectionTimeout = null;
let warningTimeout = null;
let pendingText = '';
let isProcessing = false;

// Add a variable to track if we're showing the "about to send" indicator
let sendIndicatorShown = false;
let sendIndicatorTimer = null;

// Add Deepgram integration for better turn detection
let deepgramSocket = null;
let isDeepgramAvailable = false;
let isEndOfUtterance = false;
let audioContext = null;
let mediaStream = null;
let sourceNode = null;
let processorNode = null;

// Add interruption constants
// const INTERRUPTION_THRESHOLD = 0.4; // Remove static threshold

// Add adaptive threshold variables
let baseNoiseLevel = 0.05; // Starting estimate, will be calibrated
let interruptionThreshold = 0.35; // Starting threshold, will be adjusted
let noiseCalibrationSamples = []; // Array to store noise samples
const MIN_THRESHOLD = 0.15; // Lowest acceptable threshold
const MAX_THRESHOLD = 0.6; // Highest acceptable threshold
const CALIBRATION_SAMPLE_COUNT = 100; // Number of samples to collect
let isCalibrating = false;
let calibrationInterval = null;

// Add a variable to track the current audio playing
let currentAudioElement = null;
let interruptionDetected = false; // Flag to track if interruption occurred

// Add at the top of the file, with other state variables
let interruptionCount = 0;
let awkwardnessQueue = []; // Queue to track when we should add awkwardness to responses
let lastInterruptionTime = 0;

// Add continuous mode flag
let isContinuousMode = false;

// Add after voice settings near the top

// Define buyer persona types with trait RANGES instead of fixed values
const buyerPersonaTypes = {
    skeptical: {
        name: "Skeptical Buyer",
        traitRanges: {
            trust: { min: 0.2, max: 0.4 },         // Low initial trust
            patience: { min: 0.3, max: 0.5 },      // Low-moderate patience
            talkativeness: { min: 0.4, max: 0.6 }, // Moderate talkativeness
            technicalKnowledge: { min: 0.6, max: 0.9 }, // Moderate to high technical knowledge
            priceConsciousness: { min: 0.7, max: 0.9 }, // High price consciousness
            disfluencyRate: { min: 0.01, max: 0.03 }    // Low-moderate disfluencies
        },
        objectionStyles: ["value-focused", "proof-demanding", "comparison-oriented"],
        responseStyles: {
            greeting: [
                "Yes, hello. I've got a pretty tight schedule today, so let's get to the point.",
                "Hi there. I've heard your pitch before from other vendors. What makes yours different?",
                "Morning. I've done my research on this, so I'm going to have some specific questions."
            ],
            objections: [
                "I'm not seeing the ROI here compared to what we're currently using.",
                "Your competitors are offering something similar for less. Why should we pay more?",
                "I need to see some concrete proof that this actually works as described.",
                "The last solution we tried like this was a complete waste of time and money."
            ]
        }
    },
    analytical: {
        name: "Analytical Buyer",
        traitRanges: {
            trust: { min: 0.4, max: 0.6 },         // Moderate initial trust
            patience: { min: 0.6, max: 0.9 },      // High patience
            talkativeness: { min: 0.3, max: 0.5 }, // Below average talkativeness
            technicalKnowledge: { min: 0.7, max: 0.95 }, // Very high technical knowledge
            priceConsciousness: { min: 0.5, max: 0.8 },  // Moderate to high price consciousness
            disfluencyRate: { min: 0.005, max: 0.02 }    // Very few disfluencies
        },
        objectionStyles: ["data-focused", "specification-oriented", "logical-gaps"],
        responseStyles: {
            greeting: [
                "Hello. I've reviewed your product specs and have several questions about the technical implementation.",
                "Good morning. I'm interested in understanding the architecture behind your solution.",
                "Hi there. I'd like to discuss the specific metrics you use to measure performance."
            ],
            objections: [
                "According to my calculations, these numbers don't add up to the efficiency you're claiming.",
                "I notice your white paper doesn't address the issue of scalability under high load conditions.",
                "The integration process you described would require significant changes to our existing systems.",
                "The statistical significance of these test results seems questionable given the sample size."
            ]
        }
    },
    relationship: {
        name: "Relationship-Focused Buyer",
        traitRanges: {
            trust: { min: 0.5, max: 0.7 },         // Above average initial trust
            patience: { min: 0.6, max: 0.8 },      // Patient
            talkativeness: { min: 0.7, max: 0.9 }, // Very talkative
            technicalKnowledge: { min: 0.4, max: 0.6 }, // Average technical knowledge
            priceConsciousness: { min: 0.4, max: 0.6 }, // Moderately price conscious
            disfluencyRate: { min: 0.03, max: 0.05 }    // More conversational disfluencies
        },
        objectionStyles: ["stakeholder-oriented", "support-focused", "long-term-relationship"],
        responseStyles: {
            greeting: [
                "Hi there! Great to meet you. Tell me a bit about yourself before we dive into the business stuff.",
                "Good morning! How are you doing today? I like to get to know the people I might be working with.",
                "Hello! Before we start, I'd love to hear about your company culture and how you support your clients."
            ],
            objections: [
                "I'm concerned about the level of ongoing support we would receive after implementation.",
                "Our team has had negative experiences with vendor relationships in the past. How would you be different?",
                "I need to make sure everyone on my team feels comfortable with any new partner we bring on.",
                "We value partners who understand our specific industry challenges. What's your experience in our sector?"
            ]
        }
    },
    decisive: {
        name: "Decisive Executive",
        traitRanges: {
            trust: { min: 0.4, max: 0.6 },         // Average initial trust
            patience: { min: 0.2, max: 0.4 },      // Very impatient
            talkativeness: { min: 0.5, max: 0.7 }, // Somewhat talkative
            technicalKnowledge: { min: 0.3, max: 0.5 }, // Below average technical knowledge
            priceConsciousness: { min: 0.6, max: 0.8 }, // Moderately price conscious
            disfluencyRate: { min: 0.005, max: 0.015 }  // Few disfluencies, direct speech
        },
        objectionStyles: ["bottom-line", "time-focused", "authority-oriented"],
        responseStyles: {
            greeting: [
                "Morning. I have 30 minutes. Let's make them count.",
                "Hello. I'm looking for bottom-line impact. Can your solution deliver that?",
                "Hi. I'm evaluating three options this week and need to make a decision by Friday."
            ],
            objections: [
                "Cut to the chase - what's the implementation timeline and when will we see results?",
                "I don't need the technical details. How will this affect our quarterly numbers?",
                "My main concern is risk. What's the downside if this doesn't work as promised?",
                "I have final approval authority, but I need something compelling to take to the board."
            ]
        }
    },
    hesitant: {
        name: "Risk-Averse Buyer",
        traitRanges: {
            trust: { min: 0.2, max: 0.4 },         // Low initial trust
            patience: { min: 0.5, max: 0.7 },      // Somewhat patient
            talkativeness: { min: 0.4, max: 0.6 }, // Average talkativeness
            technicalKnowledge: { min: 0.5, max: 0.7 }, // Above average technical knowledge
            priceConsciousness: { min: 0.7, max: 0.9 }, // Highly price conscious
            disfluencyRate: { min: 0.04, max: 0.06 }    // Higher disfluencies due to uncertainty
        },
        objectionStyles: ["risk-focused", "change-resistant", "precedent-seeking"],
        responseStyles: {
            greeting: [
                "Hello... We've been using our current solution for several years, so I'm not entirely convinced we need to change.",
                "Hi there. I should mention up front that we're very cautious about implementing new systems.",
                "Good morning. I'm here to listen, but I should tell you our team is generally satisfied with what we have now."
            ],
            objections: [
                "I'm concerned about the disruption this would cause to our existing workflows.",
                "We've had negative experiences in the past when trying to implement new solutions.",
                "What happens if we invest in this and it doesn't meet our specific requirements?",
                "I'd need to see examples of companies very similar to ours who have successfully implemented this."
            ]
        }
    },
    competitive: {
        name: "Competitive Shopper",
        traitRanges: {
            trust: { min: 0.3, max: 0.5 },         // Below average trust
            patience: { min: 0.4, max: 0.6 },      // Moderate patience
            talkativeness: { min: 0.6, max: 0.8 }, // Above average talkativeness
            technicalKnowledge: { min: 0.5, max: 0.8 }, // Moderate to high technical knowledge
            priceConsciousness: { min: 0.8, max: 0.95 }, // Very price conscious
            disfluencyRate: { min: 0.01, max: 0.03 }    // Low-moderate disfluencies
        },
        objectionStyles: ["competitor-focused", "comparison-oriented", "value-seeking"],
        responseStyles: {
            greeting: [
                "Hi there. I've already spoken to three of your competitors this week. What makes your offering stand out?",
                "Hello. Before we get too far, I should tell you I'm evaluating several options right now.",
                "I'm looking at multiple solutions in this space. Why should yours be the one I choose?"
            ],
            objections: [
                "Your competitor is offering a similar feature set at a 15% lower price point.",
                "I'm not seeing anything here that I can't get from the other vendors I'm considering.",
                "Another solution I'm looking at includes this feature at no extra cost. Can you match that?",
                "What specific advantages do you have over [competitor name]? I had a demo with them yesterday."
            ]
        }
    },
    technical: {
        name: "Technical Expert",
        traitRanges: {
            trust: { min: 0.3, max: 0.5 },         // Below average trust
            patience: { min: 0.5, max: 0.7 },      // Moderate patience
            talkativeness: { min: 0.4, max: 0.6 }, // Moderate talkativeness
            technicalKnowledge: { min: 0.9, max: 1.0 }, // Very high technical knowledge
            priceConsciousness: { min: 0.5, max: 0.7 }, // Moderate price consciousness
            disfluencyRate: { min: 0.01, max: 0.02 }    // Low disfluencies, precise speech
        },
        objectionStyles: ["specification-focused", "implementation-details", "compatibility-concerned"],
        responseStyles: {
            greeting: [
                "Hello. I've reviewed your technical documentation beforehand. I have several questions about your API structure.",
                "I'm familiar with the underlying technology here. Let's discuss how your implementation handles [technical concept].",
                "Before we start, I should mention that I've worked with similar systems for over 10 years. I need specific details."
            ],
            objections: [
                "Your solution uses a relational database for this component, which concerns me regarding scalability past 10TB.",
                "I don't see any documentation about your handling of atomic transactions during network partitioning events.",
                "The latency specifications don't address performance degradation under high write loads.",
                "Your architecture diagram doesn't show redundancy for this critical component. What happens when it fails?"
            ]
        }
    },
    consensus: {
        name: "Team Consensus Builder",
        traitRanges: {
            trust: { min: 0.5, max: 0.7 },         // Moderate trust
            patience: { min: 0.6, max: 0.8 },      // Above average patience
            talkativeness: { min: 0.6, max: 0.8 }, // Above average talkativeness
            technicalKnowledge: { min: 0.4, max: 0.7 }, // Moderate technical knowledge
            priceConsciousness: { min: 0.5, max: 0.7 }, // Moderate price consciousness
            disfluencyRate: { min: 0.02, max: 0.04 }    // Moderate disfluencies
        },
        objectionStyles: ["stakeholder-concerned", "team-focused", "process-oriented"],
        responseStyles: {
            greeting: [
                "Hi there. Just so you know, I'll need to bring several team members into this decision process.",
                "Good morning. I'm evaluating this for my department, but ultimately we make technology decisions as a group.",
                "Hello. I'm the point person for our team's evaluation, but I'll need materials I can share with my colleagues."
            ],
            objections: [
                "Our IT department will have concerns about how this integrates with our existing security framework.",
                "I like what I'm hearing, but my team members from operations will need convincing on the implementation timeline.",
                "This looks promising, but I'll need to explain the ROI to our finance team in clear terms.",
                "How have other companies handled the change management process when adopting your solution?"
            ]
        }
    },
    distracted: {
        name: "Busy/Distracted Buyer",
        traitRanges: {
            trust: { min: 0.4, max: 0.6 },         // Moderate trust
            patience: { min: 0.1, max: 0.3 },      // Very low patience
            talkativeness: { min: 0.3, max: 0.5 }, // Below average talkativeness
            technicalKnowledge: { min: 0.3, max: 0.7 }, // Variable technical knowledge
            priceConsciousness: { min: 0.5, max: 0.7 }, // Moderate price consciousness
            disfluencyRate: { min: 0.04, max: 0.06 }    // Higher disfluencies due to multitasking
        },
        objectionStyles: ["time-focused", "simplicity-seeking", "quick-decision"],
        responseStyles: {
            greeting: [
                "Hi - sorry, I've got back-to-back meetings today. Can we make this quick?",
                "Hello there. I've got about 15 minutes before my next call. Let's get straight to the point.",
                "I'm juggling a few things at once here. Can you give me the high-level overview first?"
            ],
            objections: [
                "This seems too complicated. We need something that requires minimal training for our team.",
                "I don't have time to manage another complex implementation. How fast can we get this up and running?",
                "Sorry, you've lost me with all these details. Can you just tell me the bottom line?",
                "I need something that works out of the box. We don't have resources for a lot of customization."
            ]
        }
    },
    visionary: {
        name: "Visionary Leader",
        traitRanges: {
            trust: { min: 0.5, max: 0.7 },         // Moderate trust
            patience: { min: 0.3, max: 0.5 },      // Below average patience
            talkativeness: { min: 0.7, max: 0.9 }, // High talkativeness
            technicalKnowledge: { min: 0.4, max: 0.7 }, // Moderate technical knowledge
            priceConsciousness: { min: 0.3, max: 0.5 }, // Below average price consciousness
            disfluencyRate: { min: 0.02, max: 0.04 }    // Moderate disfluencies
        },
        objectionStyles: ["future-focused", "innovation-seeking", "growth-oriented"],
        responseStyles: {
            greeting: [
                "I'm looking for solutions that will position us for the next decade, not just solve today's problems.",
                "Our industry is changing rapidly. I need to know how your solution keeps us ahead of disruption.",
                "Hello. I'm interested in how your technology will evolve over time. We need a forward-thinking partner."
            ],
            objections: [
                "I don't see how this fits into our long-term strategic vision for digital transformation.",
                "Your roadmap seems focused on incremental improvements. We need more breakthrough innovations.",
                "How adaptable is this solution to emerging technologies like [latest trend]?",
                "My concern is that we'll implement this and then find it's obsolete in two years."
            ]
        }
    },
    statusQuo: {
        name: "Status Quo Defender",
        traitRanges: {
            trust: { min: 0.2, max: 0.4 },         // Low trust
            patience: { min: 0.5, max: 0.7 },      // Moderate patience
            talkativeness: { min: 0.4, max: 0.6 }, // Moderate talkativeness
            technicalKnowledge: { min: 0.4, max: 0.7 }, // Moderate technical knowledge
            priceConsciousness: { min: 0.6, max: 0.8 }, // Above average price consciousness
            disfluencyRate: { min: 0.02, max: 0.05 }    // Moderate disfluencies
        },
        objectionStyles: ["change-resistant", "risk-averse", "tradition-focused"],
        responseStyles: {
            greeting: [
                "To be honest, our current system has served us well for years. I need compelling reasons to change it.",
                "I'll listen to your pitch, but I should be clear that we have a working solution already in place.",
                "Our team is very comfortable with our existing processes. Change would need to bring substantial benefits."
            ],
            objections: [
                "We've invested years in our current solution. The switching costs seem prohibitive.",
                "Our team already knows the existing system. Retraining everyone would be disruptive.",
                "What you're proposing sounds good in theory, but our current approach is proven in practice.",
                "I'm not convinced the benefits outweigh the risks of changing our established processes."
            ]
        }
    },
    budgetFocused: {
        name: "Budget-Focused Buyer",
        traitRanges: {
            trust: { min: 0.3, max: 0.5 },         // Below average trust
            patience: { min: 0.4, max: 0.6 },      // Moderate patience
            talkativeness: { min: 0.4, max: 0.6 }, // Moderate talkativeness
            technicalKnowledge: { min: 0.3, max: 0.6 }, // Below average to moderate technical knowledge
            priceConsciousness: { min: 0.9, max: 1.0 }, // Extremely price conscious
            disfluencyRate: { min: 0.01, max: 0.03 }    // Low-moderate disfluencies
        },
        objectionStyles: ["cost-focused", "budget-constrained", "roi-demanding"],
        responseStyles: {
            greeting: [
                "Before we dive in, I should tell you our budget for this project is already set and quite limited.",
                "Hi there. I'll be evaluating this primarily on cost-effectiveness and ROI metrics.",
                "Good morning. Just to set expectations, we're looking for the most economical solution possible."
            ],
            objections: [
                "This is significantly above our allocated budget. We need to find ways to reduce the cost by at least 30%.",
                "The ongoing maintenance fees seem high compared to the initial investment. Can those be reduced?",
                "I need to see an ROI calculation showing payback within 12 months or less.",
                "What's the bare minimum configuration we could start with to keep costs down initially?"
            ]
        }
    }
};

// Store active persona and all instances
let activeBuyerPersona = null;
const personaInstances = {};

// Function to generate a persona instance with randomized traits
function generatePersonaInstance(personaType) {
    const basePersona = buyerPersonaTypes[personaType];
    if (!basePersona) return null;
    
    const instance = {
        ...basePersona,
        id: `${personaType}_${Date.now()}`, // Unique ID for this instance
        traits: {}
    };
    
    // Generate random values for each trait within the defined ranges
    for (const [trait, range] of Object.entries(basePersona.traitRanges)) {
        // Random value between min and max, with 2 decimal precision
        instance.traits[trait] = parseFloat((Math.random() * (range.max - range.min) + range.min).toFixed(2));
    }
    
    // Add some additional random variation to make each instance more unique
    // Random "quirk" - a slight exaggeration of one trait
    const traits = Object.keys(instance.traits);
    const quirkTrait = traits[Math.floor(Math.random() * traits.length)];
    
    // Exaggerate the trait slightly (increase by 10-20% or decrease by 10-20%)
    // but keep within 0-1 bounds
    const direction = Math.random() > 0.5 ? 1 : -1;
    const adjustmentFactor = 0.1 + (Math.random() * 0.1); // 10-20%
    
    const currentValue = instance.traits[quirkTrait];
    let newValue = currentValue + (direction * adjustmentFactor * currentValue);
    newValue = Math.max(0, Math.min(1, newValue)); // Keep within 0-1 bounds
    
    instance.traits[quirkTrait] = parseFloat(newValue.toFixed(2));
    
    // Add a descriptor for this specific instance
    const traitDescriptors = {
        trust: {high: "trusting", low: "distrustful"},
        patience: {high: "patient", low: "impatient"},
        talkativeness: {high: "talkative", low: "reserved"},
        technicalKnowledge: {high: "technical", low: "non-technical"},
        priceConsciousness: {high: "price-focused", low: "value-focused"}
    };
    
    // Generate a descriptor based on the quirk trait
    let descriptor = "";
    if (traitDescriptors[quirkTrait]) {
        const level = newValue > 0.6 ? "high" : "low";
        descriptor = traitDescriptors[quirkTrait][level];
    }
    
    instance.instanceName = descriptor ? `${descriptor.charAt(0).toUpperCase() + descriptor.slice(1)} ${basePersona.name}` : basePersona.name;
    
    // Log the unique traits for debugging/transparency
    console.log(`Generated persona instance: ${instance.instanceName}`, instance.traits);
    
    return instance;
}

// Helper function to detect message type - for buyer context
function detectMessageType(userMessage, aiResponse) {
    // Convert to lowercase for easier matching
    const userLower = userMessage.toLowerCase();
    const aiLower = aiResponse.toLowerCase();
    
    // Greeting detection
    if (/\b(hi|hello|hey|morning|afternoon|evening|how are you|nice to meet|pleasure)\b/.test(userLower)) {
        return 'greeting';
    }
    
    // Objection detection - look for patterns in the AI response
    if (/\b(concern|worried|expensive|cost|risk|problem|issue|not sure|competitor|alternative)\b/.test(aiLower)) {
        return 'objection';
    }
    
    // Question detection
    if (/\?/.test(aiLower)) {
        return 'question';
    }
    
    // Interest signals
    if (/\b(interested|tell me more|sounds good|like to know|intriguing)\b/.test(aiLower)) {
        return 'interest';
    }
    
    // Rejection/negative signals
    if (/\b(not interested|don't need|too expensive|not a good fit|won't work)\b/.test(aiLower)) {
        return 'rejection';
    }
    
    // Default
    return 'general';
}

// Utility function to log the current state for debugging
function logState(message) {
    console.log(`[STATE] ${message} - isRecognizing: ${isRecognizing}, isAISpeaking: ${isAISpeaking}, isProcessing: ${isProcessing}, pendingText: "${pendingText}"`);
}

// Helper function to determine if the input is unusual (for awkwardness detection)
function isUnusualInput(text) {
    // Simple heuristic: very short inputs during a conversation might be unusual
    if (text.length < 5 && transcriptContainer.querySelectorAll('.message').length > 2) {
        return true;
    }
    
    // Random chance of detecting "unusual" input to make AI occasionally awkward
    return Math.random() < 0.1;
}

// Get a natural response delay to simulate human conversation
function getNaturalResponseDelay() {
    // Base delay between 100-400ms (feels natural)
    return 100 + Math.random() * 300;
}

// Initialize Deepgram for better speech detection
async function initDeepgram() {
    try {
        console.log('Attempting to initialize Deepgram...');
        
        // Immediately set Deepgram as unavailable to use Web Speech API first
        isDeepgramAvailable = false;
        
        // Try to get token with timeout to prevent blocking
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout
        
        try {
            // Use current port from hostname instead of hardcoded port
            const currentOrigin = window.location.origin;
            const response = await fetch(`${currentOrigin}/api/get_deepgram_token`, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // If we get a 404, Deepgram is not set up on this server - gracefully disable it
            if (response.status === 404) {
                console.log('Deepgram API endpoint not found - quietly disabling Deepgram integration');
                isDeepgramAvailable = false;
                return false; // Silently fail and continue with Web Speech API
            }
            
            if (!response.ok) {
                console.warn('Failed to get Deepgram token, falling back to basic detection');
                return false;
            }
            
            const tokenData = await response.json();
            if (!tokenData || !tokenData.apiKey) {
                console.warn('Invalid Deepgram token received, falling back to basic detection');
                return false;
            }
            
            const token = tokenData.apiKey;
            
            // Initialize Deepgram connection with the token
            deepgramSocket = new WebSocket(`wss://api.deepgram.com/v1/listen?model=nova-2&endpointing=true&punctuate=true&interim_results=true`, [
                'token', token
            ]);
            
            // Set up event handlers
            deepgramSocket.onopen = () => {
                console.log('Deepgram WebSocket connection established');
                isDeepgramAvailable = true;
                
                // Set up audio capture for Deepgram if we're already supposed to be listening
                if (isRecognizing && !isAISpeaking) {
                    setupAudioForDeepgram();
                }
            };
            
            deepgramSocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                
                // Skip processing if AI is speaking
                if (isAISpeaking) return;
                
                // Check for a valid response from Deepgram
                if (data && data.type === 'Results') {
                    // Process transcript and detect turn-taking signals
                    processDeepgramResults(data);
                }
            };
            
            deepgramSocket.onerror = (error) => {
                console.error('Deepgram WebSocket error:', error);
                isDeepgramAvailable = false;
            };
            
            deepgramSocket.onclose = () => {
                console.log('Deepgram WebSocket connection closed');
                isDeepgramAvailable = false;
            };
            
            return true;
        } catch (fetchError) {
            // Handle timeout or other fetch errors
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.log('Deepgram token request timed out, continuing with Web Speech API only');
            } else {
                console.warn('Deepgram fetch failed:', fetchError);
            }
            return false;
        }
    } catch (error) {
        console.error('Error initializing Deepgram:', error);
        return false;
    }
}

// Process Deepgram results to detect natural turn-taking
function processDeepgramResults(data) {
    try {
        // Check if there's speech_final which is a definite indicator of completed speech
        if (data.speech_final === true) {
            console.log('Deepgram detected end of speech');
            isEndOfUtterance = true;
            
            // Get the final transcript
            const transcript = data.channel?.alternatives[0]?.transcript;
            if (transcript && transcript.trim().length > 0) {
                // APPEND to pending text instead of replacing it
                if (pendingText) {
                    pendingText += ' ' + transcript.trim();
                } else {
                    pendingText = transcript.trim();
                }
                console.log('Accumulated pending text:', pendingText);
                
                // CORRECT UNDERSTANDING OF SPEECH PATTERNS:
                // 1. Questions usually end with upward inflection AND question mark - these are definite endings
                // 2. Don't rely on downward inflection/volume for detecting endings
                const hasQuestionEnding = /\?$/.test(pendingText);
                const hasExplicitEndMarker = /(that's all|over to you|thanks)$/i.test(pendingText);
                
                // Only auto-send if we have a proper question or explicit end marker
                if (hasQuestionEnding || hasExplicitEndMarker) {
                    logState('Before speech_final send');
                    sendAccumulatedTranscript();
                } else {
                    // Otherwise rely on timeout - don't make assumptions about speech patterns
                    console.log('End of speech detected but waiting for timeout');
                    resetPauseTimer(pendingText);
                }
            }
            return;
        }
        
        // Process interim results for visual feedback
        if (data.is_final === false) {
            const interimTranscript = data.channel?.alternatives[0]?.transcript;
            if (interimTranscript) {
                // Show the full accumulated text + new interim text
                let displayText = pendingText ? pendingText + ' ' + interimTranscript : interimTranscript;
                updateConversationStatus('Listening: ' + displayText);
            }
            return;
        }
        
        // Process final results (but not necessarily end of utterance)
        const transcript = data.channel?.alternatives[0]?.transcript;
        if (transcript && transcript.trim().length > 0) {
            // APPEND to existing transcript instead of replacing it
            if (pendingText) {
                pendingText += ' ' + transcript.trim();
            } else {
                pendingText = transcript.trim();
            }
            
            // Display the accumulated text in the status
            updateConversationStatus('Listening: ' + pendingText);
            
            // CORRECT UNDERSTANDING OF SPEECH PATTERNS:
            // Focus primarily on question marks as definitive endings
            const hasQuestionMark = /\?$/.test(pendingText);
            
            // Only send immediately for clear questions
            if (hasQuestionMark) {
                console.log('Question mark detected - sending immediately');
                sendAccumulatedTranscript();
            } else {
                // Otherwise, use timeout system
                resetPauseTimer(pendingText);
            }
        }
    } catch (error) {
        console.error('Error processing Deepgram results:', error);
        // Reset processing in case of error
        isProcessing = false;
    }
}

// Set up audio capturing for Deepgram (higher quality analysis)
function setupAudioForDeepgram() {
    try {
        if (deepgramAudioContext) {
            return true; // Already set up
        }
        
        // Create audio context with specific options for echo cancellation
        deepgramAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Request microphone access with echo cancellation enabled
        const constraints = {
            audio: {
                echoCancellation: true,      // Enable echo cancellation
                noiseSuppression: true,      // Enable noise suppression
                autoGainControl: true,       // Enable automatic gain control
                channelCount: 1,             // Mono audio is sufficient and more efficient
                sampleRate: 16000            // 16kHz is ideal for speech recognition
            }
        };
        
        navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
                mediaStream = stream;
                deepgramStream = stream;
                deepgramSource = deepgramAudioContext.createMediaStreamSource(stream);
                
                // Create audio context and nodes
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                sourceNode = audioContext.createMediaStreamSource(mediaStream);
                
                // Use ScriptProcessor for maximum browser compatibility
                processorNode = audioContext.createScriptProcessor(4096, 1, 1);
                
                // Connect nodes
                sourceNode.connect(processorNode);
                processorNode.connect(audioContext.destination);
                
                // Set up audio processing function
                processorNode.onaudioprocess = (e) => {
                    // Only send audio when we're listening and Deepgram is connected
                    if (isRecognizing && 
                        isDeepgramAvailable && deepgramSocket && 
                        deepgramSocket.readyState === WebSocket.OPEN) {
                        
                        // Get audio data
                        const inputData = e.inputBuffer.getChannelData(0);
                        
                        // Calculate audio level for interruption detection
                        let sum = 0;
                        for (let i = 0; i < inputData.length; i++) {
                            sum += Math.abs(inputData[i]);
                        }
                        const audioLevel = Math.min(1, sum / inputData.length / 0.1);
                        
                        // Adjust for current noise level if needed
                        const normalizedLevel = Math.max(0, audioLevel - baseNoiseLevel);
                        
                        // Check for interruption if AI is speaking
                        if (isAISpeaking) {
                            // Log audio levels to help diagnose issues
                            if (normalizedLevel > 0.05) {
                                console.log(`Audio level while AI speaking: ${normalizedLevel.toFixed(3)} (threshold: ${interruptionThreshold.toFixed(3)})`);
                            }
                            
                            // Make interruption detection less sensitive by increasing the threshold
                            // Increase the minimum threshold from 0.2 to 0.3
                            const effectiveThreshold = Math.min(interruptionThreshold, 0.3);
                            
                            // Add a consecutive samples counter to avoid triggering on brief noises
                            if (normalizedLevel > effectiveThreshold) {
                                // Require the level to stay above threshold for multiple consecutive samples
                                if (!window.consecutiveHighLevels) {
                                    window.consecutiveHighLevels = 1;
                                } else {
                                    window.consecutiveHighLevels++;
                                }
                                
                                // Only trigger interruption if we've had multiple consecutive high levels
                                if (window.consecutiveHighLevels >= 3) {
                                    console.log(`Interruption detected via audio level: ${normalizedLevel.toFixed(3)} after ${window.consecutiveHighLevels} consecutive samples`);
                                    window.consecutiveHighLevels = 0;
                                    handleInterruption();
                                }
                            } else {
                                // Reset the counter when levels drop
                                window.consecutiveHighLevels = 0;
                            }
                        }
                        
                        // Only send to Deepgram if not AI speaking or if we detected an interruption
                        if (!isAISpeaking || interruptionDetected) {
                            // Convert to format Deepgram expects
                            const pcmData = convertFloat32ToInt16(inputData);
                            
                            // Send to Deepgram
                            deepgramSocket.send(pcmData);
                        }
                    }
                };
                
                console.log('Audio capture set up for Deepgram');
            })
            .catch(error => {
                console.error('Error accessing microphone with echo cancellation:', error);
            });
            
        return true;
    } catch (error) {
        console.error('Error setting up audio for Deepgram:', error);
        return false;
    }
}

// Helper function to convert Float32Array from Web Audio API to Int16Array for Deepgram
function convertFloat32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        // Convert from [-1, 1] to [-32768, 32767]
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 32768 : s * 32767;
    }
    return int16Array.buffer;
}

// Cleanup function for Deepgram and audio resources
function cleanupDeepgramAudio() {
    // Close Deepgram connection
    if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
        deepgramSocket.close();
        isDeepgramAvailable = false;
    }
    
    // Stop audio tracks
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    // Disconnect audio nodes
    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }
    
    if (processorNode) {
        processorNode.disconnect();
        processorNode = null;
    }
    
    // Close audio context
    if (audioContext) {
        audioContext.close().catch(err => console.error('Error closing audio context:', err));
        audioContext = null;
    }
}

// Initialize the speech recognition API
function initSpeechRecognition() {
    // Try to initialize Deepgram, but handle the case where it's not available
    initDeepgram().then(isAvailable => {
        console.log(`Deepgram advanced turn detection: ${isAvailable ? 'ENABLED' : 'DISABLED'}`);
        
        // We'll continue with Web Speech API regardless of Deepgram status
    }).catch(error => {
        console.error('Error setting up Deepgram - continuing with basic Web Speech API:', error);
        isDeepgramAvailable = false;
    });
    
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!window.SpeechRecognition) {
        alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
    }
    
    try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        // Add a property to track if recognition is active
        recognition.isActive = false;
        
        let finalTranscript = '';
        
        recognition.onresult = function(event) {
            // If AI is speaking, check for interruption
            if (isAISpeaking) {
                // Get an approximation of audio level from the confidence
                const latestResult = event.results[event.results.length - 1];
                const confidence = latestResult[0].confidence;
                const transcriptText = latestResult[0].transcript.trim();
                
                console.log(`AI speaking: Detected speech with confidence ${confidence} and text: "${transcriptText}"`);
                
                // Make interruption detection less sensitive - require more confident speech
                // Increase confidence threshold from 0.1 to 0.3 and require more text
                if ((confidence > 0.3 && transcriptText.length > 3) || 
                    (transcriptText.length > 5)) { // Increased from 2 to 5 chars to reduce false positives
                    
                    // Add a check for significant speech content, not just noise
                    if (!/^(um|uh|ah|oh|hmm|so|uh|and|but|or)\b/i.test(transcriptText)) {
                        console.log('Significant speech detected while AI speaking - triggering interruption');
                        handleInterruption();
                    } else {
                        console.log('Detected speech filler/non-interrupting sound, ignoring');
                    }
                } 
                
                // After interruption, we start collecting the transcript normally
                if (!interruptionDetected) {
                    return; // Skip processing results until interruption is detected
                }
            }
            
            // Normal transcript processing for when AI is not speaking or after interruption
            let interimTranscript = '';
            let finalizedText = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalizedText += transcript + ' ';
                    
                    // Only use Web Speech API results for sending if Deepgram is not available
                    if (!isDeepgramAvailable) {
                        // ACCUMULATE text rather than replacing it
                        pendingText = pendingText ? pendingText + ' ' + transcript.trim() : transcript.trim();
                        console.log('Web Speech accumulated:', pendingText);
                        
                        // Check if the accumulated text forms a complete sentence
                        const isSentenceComplete = isCompleteSentence(pendingText);
                        
                        // If we just interrupted the AI, wait for a more complete thought before sending
                        if (interruptionDetected) {
                            // Just keep accumulating text and reset the timer
                            resetPauseTimer(pendingText);
                            // Update UI with full accumulated text
                            updateConversationStatus('Listening: ' + pendingText);
                        }
                        // If we have a complete sentence, send it immediately
                        else if (isSentenceComplete) {
                            console.log('Complete sentence detected in speech results, sending immediately');
                            sendAccumulatedTranscript();
                        } else {
                            // For incomplete sentences, use pause detection with longer timeouts
                            console.log('Incomplete sentence in speech results, using pause detection');
                            resetPauseTimer(pendingText);
                            // Update UI with full accumulated text
                            updateConversationStatus('Listening: ' + pendingText);
                        }
                    }
                } else {
                    interimTranscript += transcript;
                    // Show full accumulated text plus current interim text
                    const displayText = pendingText ? pendingText + ' ' + interimTranscript : interimTranscript;
                    updateConversationStatus('Listening: ' + displayText);
                }
            }
        };
        
        recognition.onstart = () => {
            isRecognizing = true;
            recognition.isActive = true;
            orb.classList.add('listening');
            updateConversationStatus('Listening...');
            toggleRecordButton.innerText = 'Stop Recording';
            
            // Clear any existing transcript when starting a new recognition session
            pendingText = '';
            clearPauseTimer();
            isEndOfUtterance = false;
            
            // Set up Deepgram audio if available
            if (isDeepgramAvailable) {
                setupAudioForDeepgram();
            }
        };
        
        recognition.onend = () => {
            recognition.isActive = false;
            
            if (isRecognizing) { // If we're still supposed to be recording
                try {
                    // Add delay to prevent rapid restart cycles
                    setTimeout(() => {
                        try {
                            // Check if recognition is still in a state where we should restart it
                            // and hasn't been restarted by another process
                            if (isRecognizing && recognition && !recognition.isActive) {
                    recognition.start(); // Restart recognition
                    recognition.isActive = true;
                                console.log('Successfully restarted recognition after onend event');
                            } else {
                                console.log('Recognition already active or no longer needed, skipping restart');
                            }
                } catch (error) {
                            console.error('Error restarting recognition after delay:', error);
                            // Try complete reinitialization
                            reinitializeRecognition();
                        }
                    }, 300);
                } catch (error) {
                    console.error('Error scheduling recognition restart:', error);
                    orb.classList.remove('listening');
                    updateConversationStatus('Speech recognition error. Try again.');
                    toggleRecordButton.innerText = 'Start Recording';
                }
            } else {
                orb.classList.remove('listening');
                updateConversationStatus('Recording stopped');
                toggleRecordButton.innerText = 'Start Recording';
                
                // If there's accumulated transcript when stopping, send it
                if (pendingText.trim()) {
                    sendAccumulatedTranscript();
                }
                
                // Clean up Deepgram audio
                cleanupDeepgramAudio();
            }
        };
        
        recognition.onerror = (event) => {
            // Handle common errors gracefully
            if (event.error === 'no-speech') {
                // This is a common error, just log it and keep going
                console.log('No speech detected, will continue listening');
                // No need to report this to the user
            } else if (event.error === 'audio-capture') {
                console.error('Audio capture error, microphone may be disconnected');
                updateConversationStatus('Microphone error: Please check your microphone connection');
            } else if (event.error === 'not-allowed') {
                console.error('Microphone access denied');
                updateConversationStatus('Microphone access denied. Please allow microphone access.');
            } else if (event.error === 'network') {
                console.error('Network error with speech recognition');
                updateConversationStatus('Network error. Check your connection.');
            } else {
            console.error('Speech recognition error', event.error);
            updateConversationStatus('Error: ' + event.error);
            }
            
            recognition.isActive = false;
            
            // For non-fatal errors, try to restart if we should be recognizing
            if (isRecognizing && ['no-speech', 'aborted'].includes(event.error)) {
                try {
                    // Add delay to prevent rapid restart cycles
                    setTimeout(() => {
                        try {
                            // Only restart if we're still supposed to be recognizing
                            // and recognition isn't already active
                            if (isRecognizing && recognition && !recognition.isActive) {
                                recognition.start(); // Restart recognition
                                recognition.isActive = true;
                                console.log('Successfully restarted recognition after error event');
                            } else {
                                console.log('Recognition already active or no longer needed, skipping error restart');
                            }
                        } catch (restartError) {
                            console.error('Failed to restart after error:', restartError);
                            // If restart fails, try complete reinitialization
                            reinitializeRecognition();
                        }
                    }, 300);
                } catch (error) {
                    console.error('Error scheduling recognition restart after error:', error);
                }
            }
        };
    } catch (error) {
        console.error('Critical error initializing speech recognition:', error);
        updateConversationStatus('Error initializing speech. Please reload the page.');
    }
}

// Function to completely reinitialize recognition
function reinitializeRecognition() {
    try {
        // First, stop any active recognition
        if (recognition) {
            try {
                if (recognition.isActive) {
                    recognition.stop();
                    recognition.isActive = false;
                }
            } catch (e) {
                // Ignore errors when stopping
                console.log('Ignored error when stopping recognition during reinitialization:', e);
            }
        }
        
        // Clear the recognition object
        recognition = null;
        
        // Re-initialize with fresh object
        console.log('Completely reinitializing speech recognition...');
        initSpeechRecognition();
        
        // Start recognition if we're supposed to be listening
        if (isRecognizing) {
            setTimeout(() => {
                try {
                    if (recognition && !recognition.isActive) {
                        recognition.start();
                        recognition.isActive = true;
                        orb.classList.add('listening');
                    }
                } catch (e) {
                    console.error('Failed to start recognition after reinitialization:', e);
                    updateConversationStatus('Speech recognition error. Please reload the page.');
                }
            }, 500);
        }
    } catch (error) {
        console.error('Failed to reinitialize recognition:', error);
        updateConversationStatus('Speech recognition error. Please reload the page.');
    }
}

// Reset the pause timer when user speaks
function resetPauseTimer(transcript) {
    // Clear any existing timeout
    clearPauseTimer();
    
    // If in thinking mode, use much longer timeouts
    if (isThinkingMode) {
        console.log('In thinking mode, using extended timeouts');
        // Set a very long timeout when thinking
        pauseDetectionTimeout = setTimeout(() => {
            if (pendingText.trim().length > 0) {
                console.log('Thinking timeout elapsed, sending message');
                sendAccumulatedTranscript();
            }
        }, 30000); // 30 seconds when in thinking mode
        
        // Change status to indicate thinking mode
        updateConversationStatus('Thinking... (tap orb when ready to send)');
        return;
    }
    
    // Get the current text to analyze for sentence completeness
    const currentText = pendingText.trim();
    
    // Check if the current text forms a complete sentence
    const isComplete = isCompleteSentence(currentText);
    
    // Determine appropriate timeout for sales conversations
    // Use longer timeouts than the quick fixes we made earlier to allow for natural speech patterns
    let baseTimeout;
    
    if (isComplete) {
        // For complete sentences, use a moderate timeout to allow for trailing thoughts
        baseTimeout = 3000; // 3 seconds for complete sentences
        console.log('Complete sentence detected, using moderate timeout for sales context');
    } else {
        // For incomplete sentences, use a longer timeout to allow for thinking
        baseTimeout = 6000; // 6 seconds for incomplete sentences
        console.log('Incomplete sentence detected, using longer timeout for sales thinking patterns');
    }
    
    // Set pause detection timeout
    pauseDetectionTimeout = setTimeout(() => {
        const pendingTranscript = pendingText.trim();
        // Only send if there's actual content
        if (pendingTranscript.length > 0) {
            // Final check for sentence completeness before sending
            const finalIsComplete = isCompleteSentence(pendingTranscript);
            
            if (finalIsComplete) {
                console.log('Final check: Complete sentence, sending transcript');
                sendAccumulatedTranscript();
            } else if (pendingTranscript.length > 10 || pendingTranscript.split(/\s+/).length > 3) {
                // For reasonable content, even if incomplete, send it after sufficient time
                console.log('Sentence has enough content to send after sufficient pause');
                sendAccumulatedTranscript();
            } else {
                // For very short incomplete content, extend more for sales context
                console.log('Sentence is very short, extending timeout for sales context');
                
                // Additional wait for potential unfinished thoughts
                const extendedTimeout = setTimeout(() => {
                    if (pendingText.trim().length > 0) {
                        // At this point, send regardless of completeness
                        console.log('Extended timeout elapsed, sending regardless of completeness');
                        sendAccumulatedTranscript();
                    }
                }, 5000); // 5 more seconds
            }
        }
    }, baseTimeout);
    
    // Add visual indicator later in the process
    warningTimeout = setTimeout(() => {
        orb.classList.add('pending-send');
        updateConversationStatus('Continue speaking or pause to send...');
    }, baseTimeout * 0.7);
}

// Clear the pause timer
function clearPauseTimer() {
    if (pauseDetectionTimeout) {
        clearTimeout(pauseDetectionTimeout);
        pauseDetectionTimeout = null;
    }
    
    // Clear warning timeout and remove warning class
    if (warningTimeout) {
        clearTimeout(warningTimeout);
        warningTimeout = null;
    }
    document.querySelector('.voice-orb').classList.remove('pending-send');
}

// Send a message to the backend
function sendMessageToBackend(message) {
    if (!conversationId) {
        console.error('No conversation ID available');
        updateConversationStatus('Error: No conversation ID available');
        isProcessing = false; // Reset processing flag on error
        return;
    }
    
    updateConversationStatus('Sending message...');
    
    // Check for unusual input
    if (isUnusualInput(message)) {
        console.log('Unusual input detected, adding to awkwardness queue');
        awkwardnessQueue.push({
            type: 'unusual_input',
            timestamp: Date.now(),
            content: message
        });
    }
    
    // Prepare payload with awkwardness information
    const payload = {
        message: message
    };
    
    // Add awkwardness metadata if needed
    if (awkwardnessQueue.length > 0) {
        // Only include recent awkwardness events (within last minute)
        const recentAwkwardness = awkwardnessQueue.filter(
            event => (Date.now() - event.timestamp) < 60000
        );
        
        if (recentAwkwardness.length > 0) {
            payload.conversation_metadata = {
                awkwardness: {
                    interruption_count: interruptionCount,
                    recent_events: recentAwkwardness,
                    should_act_awkward: true
                }
            };
        }
        
        // Clear old items from the queue
        awkwardnessQueue = recentAwkwardness;
    }
    
    // Get current origin to ensure we use the correct host/port
    const currentOrigin = window.location.origin;
    
    // Determine the endpoint based on whether we have a conversation ID
    let endpoint = '';
    if (conversationId) {
        endpoint = `/chat/${conversationId}/message`;
        console.log(`Using conversation endpoint with ID: ${conversationId}`);
    } else {
        endpoint = '/process_message';
        console.log('Using fallback process_message endpoint');
    }
    
    // Add natural timing delay before sending to simulate a more natural conversation pace
    // Research shows 200-500ms response delays feel natural
    setTimeout(() => {
        // Send the message to the server
        fetch(`${currentOrigin}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Received response:', data);
        processAIResponse(data);
        // Don't reset isProcessing here - we're still processing the AI response
    })
    .catch(error => {
        console.error('Error sending message:', error);
        updateConversationStatus('Error sending message: ' + error.message);
        isProcessing = false; // Reset processing flag on error
    });
    }, getNaturalResponseDelay());
}

// Improved handler for when user interrupts AI
function handleInterruption() {
    if (!isAISpeaking || interruptionDetected) return;
    
    // Enhanced interruption detection with additional checks
    // Require stronger confidence before interrupting in critical moments
    const isInCriticalContent = window.currentSpeechContext === 'important' || 
                               (latestResponse && latestResponse.length < 50);
    
    // Dynamically adjust interruption threshold based on speech context
    // Higher threshold for sales context to prevent accidental interruptions
    const contextAdjustedThreshold = isInCriticalContent ? 
                                    interruptionThreshold * 1.5 : interruptionThreshold * 1.2;
    
    // Add protection against false interruptions during speech pauses
    const timeSinceLastAudio = Date.now() - (window.lastAudioPlayTime || 0);
    if (timeSinceLastAudio < 500) {
        console.log('Ignoring potential interruption during natural speech pause');
        return;
    }
    
    // Check if we're in a protected speech period
    if (window.speechInterruptionBlocked) {
        console.log('Interruption blocked - still in speech protection period');
        return;
    }
    
    // Proceed with interruption
    console.log('User is interrupting AI - stopping AI speech');
    
    // Set the interruption flag
    interruptionDetected = true;
    
    // Track interruption for awkwardness modeling
    interruptionCount++;
    awkwardnessQueue.push({
        type: 'user_interruption',
        timestamp: Date.now(),
        content: pendingText
    });
    
    // Stop any ongoing speech
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement = null;
    }
    
    // Update UI to show interruption
    updateAISpeakingState(false);
    
    // Resume recognition if needed
    if (!isRecognizing && recognition) {
        console.log('Restarting recognition after interruption');
        startListening();
    }
    
    // Add visual feedback for interruption
    if (orb) {
        orb.classList.add('user-interrupt');
        setTimeout(() => {
            orb.classList.remove('user-interrupt');
        }, 500);
    }
    
    // After interruption, set a brief protection period to avoid immediate re-interruption
    window.speechInterruptionBlocked = false;
}

/**
 * Process a user message, send to the server, and handle the response
 * @param {string} message - The message from the user to process
 * @returns {Promise} - Resolves when processing is complete
 */
function handleUserMessage(message) {
    return new Promise((resolve, reject) => {
        if (!message || message.trim() === '') {
            console.log('Empty message, ignoring');
            return resolve();
        }
        
        console.log('Handling user message:', message);
        
        // Store the current message being processed to detect duplicates
        const currentUserMessage = message.trim();
        window.lastProcessedMessage = currentUserMessage;
        
        // Update conversation status
        updateConversationStatus('Processing your request...');
        
        // Safely update UI state - check if element exists first
        const conversationOrb = document.getElementById('conversationOrb');
        if (conversationOrb) {
            conversationOrb.classList.remove('recording');
            conversationOrb.classList.add('processing');
        } else {
            console.warn('conversationOrb element not found in DOM');
        }
        
        // Handle recognition state based on mode
        if (isContinuousMode) {
            // In continuous mode, we want to keep recognition active
            if (!isRecognizing && recognition) {
                console.log('Restarting recognition in continuous mode');
                startListening();
            }
        } else {
            // In non-continuous mode, stop recognition
            if (isRecognizing && recognition) {
                console.log('Stopping recognition in non-continuous mode');
                recognition.stop();
            }
        }
        
        // Get current origin to ensure we use the correct host/port
        const currentOrigin = window.location.origin;
        
        // Determine the endpoint based on whether we have a conversation ID
        let endpoint = '';
        if (conversationId) {
            endpoint = `/chat/${conversationId}/message`;
            console.log(`Using conversation endpoint with ID: ${conversationId}`);
        } else {
            endpoint = '/process_message';
            console.log('Using fallback process_message endpoint');
        }
        
        // Begin processing, set flag to true
        isProcessing = true;
        
        // Send the message to the server
        fetch(`${currentOrigin}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                useElevenLabs: useElevenLabs,
                selectedVoice: selectedVoice || ''
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Server response:', data);
            
            // Reset processing flag
            isProcessing = false;
            
            // Update UI safely
            updateConversationStatus('');
            if (conversationOrb) {
                conversationOrb.classList.remove('processing');
                
                if (!isContinuousMode && !isRecognizing) {
                    conversationOrb.classList.add('ready');
                }
            }
            
            // Handle the response - check for either data.response or data.content
            const responseText = data.response || data.content;
            if (responseText) {
                // Apply personality enhancement to the response
                const enhancedResponse = addPersonalityToResponse(responseText, message);
                
                // Store for potential fallback
                latestResponse = enhancedResponse;
                
                // Make sure we're not showing a response to a repeated message
                if (window.lastDisplayedUserMessage !== currentUserMessage || window.lastDisplayedResponse !== enhancedResponse) {
                    console.log('Adding new message to transcript');
                    
                    // Add the AI message to the transcript
                    addMessageToTranscript('ai', enhancedResponse);
                    
                    // Update our tracking variables
                    window.lastDisplayedUserMessage = currentUserMessage;
                    window.lastDisplayedResponse = enhancedResponse;
                } else {
                    console.log('Skipping duplicate response to same user message');
                }
                
                // Speak the response based on configuration
                if (data.audio_url && useElevenLabs) {
                    // Use ElevenLabs audio if available
                    speakFromUrl(data.audio_url, enhancedResponse)
                        .then(() => resolve())
                        .catch(error => {
                            console.error('Error in text-to-speech:', error);
                            resolve();
                        });
                } else {
                    // Use browser TTS
                    speak(enhancedResponse)
                        .then(() => resolve())
                        .catch(error => {
                            console.error('Error in text-to-speech:', error);
                            resolve();
                        });
                }
            } else {
                console.error('No response in server data');
                updateConversationStatus('No response received');
                resolve();
            }
        })
        .catch(error => {
            console.error('Error processing message:', error);
            updateConversationStatus('Error: ' + error.message);
            
            // Reset processing flag on error
            isProcessing = false;
            
            // Safely update UI
            if (conversationOrb) {
                conversationOrb.classList.remove('processing');
                
                if (!isContinuousMode && !isRecognizing) {
                    conversationOrb.classList.add('ready');
                }
            }
            
            if (isContinuousMode && !isRecognizing) {
                // Try to restart recording in continuous mode
                startListening();
            }
            
            reject(error);
        });
    });
}

/**
 * Handles completion of AI speech, managing UI state and recognition
 */
function handleSpeechComplete() {
    console.log('Speech complete');
    
    // Update UI safely
    const conversationOrb = document.getElementById('conversationOrb');
    if (conversationOrb) {
        conversationOrb.classList.remove('processing');
        conversationOrb.classList.remove('speaking');
        
        // In non-continuous mode, set to ready state
        if (!isContinuousMode) {
            conversationOrb.classList.add('ready');
        }
    }
    
    // Reset speaking state
    isAISpeaking = false;
    
    // Restart recognition in continuous mode if not already active
    if (isContinuousMode && !isRecognizing && recognition) {
        console.log('Continuous mode: Restarting recognition after speech');
        startListening();
    } else if (!isContinuousMode) {
        // In non-continuous mode, update status
        updateConversationStatus('Ready. Click to speak.');
    }
}

/**
 * Synthesize speech using the browser's built-in TTS engine
 * @param {string} text - The text to synthesize
 * @param {boolean} [cancelExisting=true] - Whether to cancel any existing speech
 * @returns {Promise} - Resolves when speech completes or fails
 */
function speak(text, cancelExisting = true) {
    return new Promise((resolve, reject) => {
        if (!text || typeof text !== 'string' || text.trim() === '') {
            console.log('Speak called with empty text, skipping');
            return resolve();
        }

        console.log('Speaking:', text);
        
        // Set a flag to track that we're deliberately starting speech
        // This helps prevent false interruptions during the initial moments
        window.deliberatelySpeaking = true;
        window.speechInterruptionBlocked = true;
        
        // Cancel any existing speech
        if (cancelExisting) {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
            if (currentAudioElement) {
                currentAudioElement.pause();
                currentAudioElement = null;
            }
        }

        updateAISpeakingState(true);
        
        // Reset interruption detection
        interruptionDetected = false;
        window.consecutiveHighLevels = 0;
        
        // Set a safety timeout to ensure speech completes
        const safetyTimeout = setTimeout(() => {
            console.log('Speech safety timeout triggered after 30s');
            window.speechSynthesis.cancel();
            updateAISpeakingState(false);
            window.deliberatelySpeaking = false;
            resolve();
        }, 30000);
        
        // After a short delay, allow normal interruption behavior
        setTimeout(() => {
            console.log('Speech interruption protection period ended');
            window.speechInterruptionBlocked = false;
        }, 1500); // 1.5 second protection window
        
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Try to find the selected voice
            if (selectedVoice) {
                const voices = window.speechSynthesis.getVoices();
                const voice = voices.find(v => v.name === selectedVoice);
                if (voice) {
                    utterance.voice = voice;
                }
            }
            
            // Set properties
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            
            utterance.onend = () => {
                console.log('Speech synthesis finished');
                clearTimeout(safetyTimeout);
                updateAISpeakingState(false);
                window.deliberatelySpeaking = false;
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event);
                clearTimeout(safetyTimeout);
                updateAISpeakingState(false);
                window.deliberatelySpeaking = false;
                reject(event);
            };
            
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Error starting speech synthesis:', error);
            clearTimeout(safetyTimeout);
            updateAISpeakingState(false);
            window.deliberatelySpeaking = false;
            reject(error);
        }
    });
}

/**
 * Play audio from a URL, with fallback to TTS
 * @param {string} url - URL to the audio file
 * @param {string} fallbackText - Text to speak if audio fails
 * @returns {Promise} - Resolves when audio completes or fails
 */
function speakFromUrl(url, fallbackText) {
    return new Promise((resolve, reject) => {
        if (!url) {
            console.log('No audio URL provided, using fallback text');
            return speak(fallbackText).then(resolve).catch(reject);
        }
        
        console.log('Playing audio from URL:', url);
        
        // Cancel any existing speech
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (currentAudioElement) {
            currentAudioElement.pause();
            currentAudioElement = null;
        }
        
        updateAISpeakingState(true);
        
        // Set a safety timeout
        const safetyTimeout = setTimeout(() => {
            console.log('Audio safety timeout triggered after 30s');
            if (currentAudioElement) {
                currentAudioElement.pause();
                currentAudioElement = null;
            }
            updateAISpeakingState(false);
            resolve();
        }, 30000);
        
        try {
            const audio = new Audio(url);
            currentAudioElement = audio;
            
            audio.onended = () => {
                console.log('Audio playback finished');
                clearTimeout(safetyTimeout);
                currentAudioElement = null;
                updateAISpeakingState(false);
                resolve();
            };
            
            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                clearTimeout(safetyTimeout);
                currentAudioElement = null;
                updateAISpeakingState(false);
                
                // Try fallback to browser TTS
                if (fallbackText) {
                    console.log('Using fallback text for speech');
                    speak(fallbackText, false).then(resolve).catch(reject);
                } else {
                    reject(error);
                }
            };
            
            // Start playing
            audio.play().catch(error => {
                console.error('Error starting audio playback:', error);
                clearTimeout(safetyTimeout);
                currentAudioElement = null;
                updateAISpeakingState(false);
                
                // Try fallback to browser TTS
                if (fallbackText) {
                    console.log('Using fallback text for speech after play error');
                    speak(fallbackText, false).then(resolve).catch(reject);
    } else {
                    reject(error);
                }
            });
        } catch (error) {
            console.error('Error setting up audio playback:', error);
            clearTimeout(safetyTimeout);
    updateAISpeakingState(false);
            
            // Try fallback to browser TTS
            if (fallbackText) {
                console.log('Using fallback text for speech after setup error');
                speak(fallbackText, false).then(resolve).catch(reject);
            } else {
                reject(error);
            }
        }
    });
}

// When the page is unloaded, clean up resources
window.addEventListener('beforeunload', () => {
    cleanupDeepgramAudio();
});

// Add new functions to show/hide the "about to send" indicator
function showSendIndicator() {
    sendIndicatorShown = true;
    updateConversationStatus('About to send message... (continue speaking to cancel)');
    
    // Change the orb appearance to indicate pending message send if element exists
    if (orb) {
    orb.classList.add('pending-send');
    } else {
        console.warn('Orb element not found for showSendIndicator');
    }
}

function hideSendIndicator() {
    sendIndicatorShown = false;
    if (isRecognizing) {
        updateConversationStatus('Listening...');
    }
    
    // Remove the visual indicator if element exists
    if (orb) {
    orb.classList.remove('pending-send');
    } else {
        console.warn('Orb element not found for hideSendIndicator');
    }
}

// Add calibration button to the interface
function setupMicCalibration() {
    // Create calibration button
    const controlsDiv = document.querySelector('.voice-controls');
    if (!controlsDiv) return;
    
    const calibrateButton = document.createElement('button');
    calibrateButton.id = 'calibrate-mic';
    calibrateButton.className = 'control-button secondary-button';
    calibrateButton.innerText = 'Calibrate Mic';
    calibrateButton.style.marginTop = '8px';
    
    calibrateButton.addEventListener('click', startManualCalibration);
    
    // Insert after toggle record button
    const toggleRecordButton = document.getElementById('toggle-record');
    if (toggleRecordButton && toggleRecordButton.parentNode) {
        toggleRecordButton.parentNode.insertBefore(calibrateButton, toggleRecordButton.nextSibling);
    } else {
        controlsDiv.appendChild(calibrateButton);
    }
    
    // Start automatic calibration
    startAutoCalibration();
}

// Auto-calibrate when starting listening
function startAutoCalibration() {
    if (isCalibrating) return;
    
    console.log('Starting automatic mic calibration');
    
    // Set up automatic recalibration every 2 minutes
    if (calibrationInterval) {
        clearInterval(calibrationInterval);
    }
    
    calibrationInterval = setInterval(() => {
        // Only calibrate if we're not in the middle of a conversation
        if (!isAISpeaking && !interruptionDetected) {
            calibrateMicrophone(false); // false = automatic mode
        }
    }, 120000); // 2 minutes
    
    // Initial calibration
    calibrateMicrophone(false);
}

// Manual calibration when user clicks button
function startManualCalibration() {
    calibrateMicrophone(true); // true = manual/user-initiated
}

// Calibration process
function calibrateMicrophone(isManual) {
    if (isCalibrating) return;
    
    isCalibrating = true;
    noiseCalibrationSamples = [];
    
    // Update UI if manual calibration
    if (isManual) {
        updateConversationStatus('Calibrating microphone... Please be quiet');
        if (orb) {
        orb.classList.add('calibrating');
        }
        
        const calibrateButton = document.getElementById('calibrate-mic');
        if (calibrateButton) {
            calibrateButton.disabled = true;
            calibrateButton.innerText = 'Calibrating...';
        }
    }
    
    
    // Set up audio capture for calibration
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(2048, 1, 1);
            
            // Connect the nodes
            microphone.connect(analyser);
            analyser.connect(processor);
            processor.connect(audioContext.destination);
            
            // Configure analyser
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // Process audio samples
            let sampleCount = 0;
            
            processor.onaudioprocess = function(e) {
                // Get sound data
                analyser.getByteFrequencyData(dataArray);
                
                // Calculate average level
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                
                // Normalize to 0-1 range
                const avgLevel = sum / (bufferLength * 255);
                
                // Add to samples array
                noiseCalibrationSamples.push(avgLevel);
                sampleCount++;
                
                // Update UI for manual calibration
                if (isManual) {
                    updateConversationStatus(`Calibrating: ${Math.floor((sampleCount / CALIBRATION_SAMPLE_COUNT) * 100)}%`);
                }
                
                // Check if we have enough samples
                if (sampleCount >= CALIBRATION_SAMPLE_COUNT) {
                    // Stop listening
                    processor.disconnect();
                    analyser.disconnect();
                    microphone.disconnect();
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Calculate the new base noise level and threshold
                    calculateNoiseThreshold();
                    
                    // Update UI
                    if (isManual) {
                        updateConversationStatus(`Calibration complete. Threshold: ${interruptionThreshold.toFixed(2)}`);
                        orb.classList.remove('calibrating');
                        
                        const calibrateButton = document.getElementById('calibrate-mic');
                        if (calibrateButton) {
                            calibrateButton.disabled = false;
                            calibrateButton.innerText = 'Calibrate Mic';
                        }
                        
                        // Show result for 3 seconds, then go back to normal
                        setTimeout(() => {
                            if (!isAISpeaking && !isRecognizing) {
                                updateConversationStatus('Ready to start conversation');
                            }
                        }, 3000);
                    } else {
                        console.log(`Auto-calibration complete. New threshold: ${interruptionThreshold.toFixed(2)}`);
                    }
                    
                    isCalibrating = false;
                }
            };
        })
        .catch(err => {
            console.error('Error accessing microphone during calibration:', err);
            isCalibrating = false;
            
            if (isManual) {
                updateConversationStatus('Calibration failed. Please try again.');
                orb.classList.remove('calibrating');
                
                const calibrateButton = document.getElementById('calibrate-mic');
                if (calibrateButton) {
                    calibrateButton.disabled = false;
                    calibrateButton.innerText = 'Calibrate Mic';
                }
            }
        });
}

// Calculate the ambient noise level and set appropriate thresholds with improved analytics
function calculateNoiseThreshold() {
    // Sort samples for better statistical analysis
    noiseCalibrationSamples.sort((a, b) => a - b);
    
    // Calculate median and additional percentile points for more robust analysis
    const medianIndex = Math.floor(noiseCalibrationSamples.length / 2);
    const p25Index = Math.floor(noiseCalibrationSamples.length * 0.25);
    const p75Index = Math.floor(noiseCalibrationSamples.length * 0.75);
    const p95Index = Math.floor(noiseCalibrationSamples.length * 0.95);
    
    const medianNoise = noiseCalibrationSamples[medianIndex];
    const p25Noise = noiseCalibrationSamples[p25Index];
    const p75Noise = noiseCalibrationSamples[p75Index];
    const p95Noise = noiseCalibrationSamples[p95Index];
    
    // Calculate interquartile range for noise stability assessment
    const iqr = p75Noise - p25Noise;
    
    // Set base level using median for stability
    baseNoiseLevel = medianNoise;
    
    // Dynamically adjust threshold based on environment stability
    // More volatile environments (larger IQR) need higher thresholds
    // Use a lower multiplier to make it more sensitive for sales calls
    const volatilityFactor = Math.min(Math.max(iqr / medianNoise, 0.8), 2.0);
    
    // Calculate adaptive threshold with environment-specific adjustments
    // Use a lower threshold to improve sensitivity
    const newMinThreshold = 0.10; // Lower minimum threshold from 0.15 to 0.10
    interruptionThreshold = Math.min(
        Math.max(p95Noise * (1.2 + volatilityFactor), newMinThreshold), 
        MAX_THRESHOLD
    );
    
    // Schedule periodic recalibration based on environment stability
    // More unstable environments need more frequent recalibration
    const recalibrationInterval = iqr > 0.1 ? 60000 : 120000; // 1-2 minutes
    
    console.log(`Advanced noise analysis - Median: ${baseNoiseLevel.toFixed(3)}, P95: ${p95Noise.toFixed(3)}, IQR: ${iqr.toFixed(3)}, Volatility: ${volatilityFactor.toFixed(2)}, Threshold: ${interruptionThreshold.toFixed(3)}, Recal interval: ${recalibrationInterval/1000}s`);
    
    // If the noise level is very high, show a warning
    if (baseNoiseLevel > 0.2) {
        console.warn('High background noise detected. Voice commands may be less reliable.');
        if (document.getElementById('toggle-record')) {
            updateConversationStatus('Warning: High background noise detected');
        }
    }
    
    return recalibrationInterval;
}

// Update the conversation status
function updateConversationStatus(status) {
    if (conversationStatus) {
        conversationStatus.innerText = status;
    } else {
        console.warn('Conversation status element not found');
    }
}

// Function to stop listening
function stopListening() {
    console.log("Stopping listening...");
    isRecognizing = false;
    
    // If there's accumulated text when stopping, send it
    if (pendingText.trim()) {
        sendAccumulatedTranscript();
    }
    
    // Clear any pause detection timers
    clearPauseTimer();
    
    // Stop recognition if it's active
    if (recognition && recognition.isActive) {
        try {
            recognition.stop();
            recognition.isActive = false;
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }
    
    // Update UI safely
    if (orb) {
        orb.classList.remove('listening');
    }
    
    if (toggleRecordButton) {
        toggleRecordButton.classList.remove('listening');
        toggleRecordButton.innerText = 'Start Recording';
    }
    
    updateConversationStatus('Recording stopped');
}

// Send the accumulated transcript to the backend
function sendAccumulatedTranscript() {
    logState('Before send');
    
    // Don't send if we're already processing
    if (isProcessing) {
        console.log('BLOCKED SEND: Already processing a message');
        return;
    }
    
    let transcript = pendingText.trim();
    console.log('Preparing to send transcript:', transcript);
    
    // Don't send empty messages
    if (transcript.length === 0) {
        console.log('BLOCKED SEND: Empty message');
        return;
    }
    
    // Check for duplicate/repeat messages - using a lower similarity threshold (0.8 → 0.9)
    if (window.lastProcessedMessage && 
        (transcript === window.lastProcessedMessage || 
         transcript === window.lastProcessedMessage + '?' || 
         transcript === window.lastProcessedMessage + '.' ||
         similarity(transcript, window.lastProcessedMessage) > 0.9)) {
        
        console.log('BLOCKED SEND: Very similar to last message');
        console.log(`Similarity: ${similarity(transcript, window.lastProcessedMessage)}`);
        
        // Don't block if it's been a while since the last message
        const lastMessageTime = window.lastMessageTime || 0;
        const now = Date.now();
        if (now - lastMessageTime > 5000) { // Reduced from 15s to 5s
            console.log('But it\'s been a while, so letting it through');
        } else {
            // Clear pending text to avoid repeated attempts
            pendingText = '';
            updateConversationStatus('Listening...');
            return;
        }
    }
    
    // Record message time
    window.lastMessageTime = Date.now();
    
    // Only minimal length check, skip the sentence completeness check
    if (transcript.length < 2) {
        console.log('BLOCKED SEND: Too short');
        return;
    }
    
    // Fix punctuation if needed - but be more careful with question detection
    if (!(/[.!?]$/.test(transcript))) {
        console.log('Checking for missing end punctuation');
        
        // More sophisticated question detection - look for question structure
        const hasQuestionWords = /\b(who|what|where|when|why|how)\b/i.test(transcript);
        const hasQuestionVerbs = /\b(is|are|was|were|do|does|did|have|has|had|can|could|will|would|should|may|might)\b.*\?/i.test(transcript);
        const hasQuestionStructure = /\b(is|are|was|were|do|does|did|have|has|had|can|could|will|would|should|may|might)\b.*\b(you|he|she|it|they|we|the|this|that)\b/i.test(transcript);
        
        // Check if it's the beginning of a question but without the question mark
        const startsWithQuestionWord = /^(who|what|where|when|why|how)\b/i.test(transcript);
        const startsWithQuestionVerb = /^(is|are|was|were|do|does|did|have|has|had|can|could|will|would|should|may|might)\b/i.test(transcript);
        
        // Check for sentence fragments that shouldn't end with question marks
        const isFragment = /^(well|so|and|but|or|because|although|since|if|when|while|though|through|even|just|like|as)\b/i.test(transcript) && transcript.length < 20;
        
        // Determine appropriate punctuation
        if ((hasQuestionWords || hasQuestionVerbs || hasQuestionStructure || startsWithQuestionWord || startsWithQuestionVerb) && !isFragment) {
            console.log('Adding question mark due to question structure');
            transcript += '?';
        } else {
            console.log('Adding period as default end punctuation');
            transcript += '.';
        }
    }
    
    // Update UI to show message
    addMessageToTranscript('user', transcript);
    
    // Clear the pending text after sending
    pendingText = '';
    
    // Use the handleUserMessage function for consistent processing
    handleUserMessage(transcript);
    hideSendIndicator();
    
    logState('After send');
}

// Helper function to compare similarity between two strings
function similarity(s1, s2) {
    if (!s1 || !s2) return 0;
    
    // Convert both strings to lowercase and remove punctuation
    s1 = s1.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    s2 = s2.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    
    // Count matching words
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let matchCount = 0;
    for (const word of words1) {
        if (words2.includes(word)) {
            matchCount++;
        }
    }
    
    // Calculate Jaccard similarity
    const uniqueWords = new Set([...words1, ...words2]);
    return matchCount / uniqueWords.size;
}

// Add a message to the transcript
function addMessageToTranscript(sender, message) {
    if (!transcriptContainer) {
        console.warn('Transcript container element not found');
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    
    const nameElement = document.createElement('div');
    nameElement.className = 'message-name';
    nameElement.innerText = sender === 'user' ? 'You' : 'AI';
    
    const textElement = document.createElement('div');
    textElement.className = 'message-text';
    textElement.innerText = message;
    
    messageElement.appendChild(nameElement);
    messageElement.appendChild(textElement);
    
    transcriptContainer.appendChild(messageElement);
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

// Toggle recording
function toggleRecording() {
    if (!recognition) {
        console.log('No recognition found, initializing');
        initSpeechRecognition();
    }
    
    if (isRecognizing) {
        console.log('Stopping recording');
        stopListening();
    } else {
        console.log('Starting recording with fresh recognition');
        
        // Reset everything
        recognition = null;
        initSpeechRecognition();
        
        // Start fresh
        setTimeout(() => {
            startListening();
        }, 300);
    }
}

// Start recording
function startRecording(continuous = false) {
    // Don't try to start if already recording unless we're switching to continuous mode
    if (isRecognizing && !(continuous && !isContinuousMode)) {
        console.log('Already recording, not starting again');
        return;
    }
    
    // Set continuous mode flag based on parameter
    isContinuousMode = continuous;
    
    // Instead, log that we're starting recording even though AI is speaking
    if (isAISpeaking && isContinuousMode) {
        console.log('Starting recording while AI is speaking (continuous mode)');
    }
    
    console.log('Starting recording...');
    isRecognizing = true;
    
    // Reset state to ensure clean start
    pendingText = '';
    isProcessing = false;
    clearPauseTimer();
    
    // Handle recognition restart
    if (recognition) {
        // If it's already active, stop it first to ensure clean state
        if (recognition.isActive) {
        try {
            recognition.stop();
                // Brief pause to allow stop to complete
                setTimeout(() => {
                    try {
                        recognition.start();
                        recognition.isActive = true;
                        if (orb) {
                            orb.classList.add('listening');
                        }
        } catch (e) {
                        console.error('Error starting recognition after stop:', e);
                        reinitializeRecognition();
                    }
                }, 300);
            } catch (e) {
                console.warn('Error stopping active recognition:', e);
                reinitializeRecognition();
            }
        } else {
            // If not active, start directly
            try {
                recognition.start();
                recognition.isActive = true;
                if (orb) {
                    orb.classList.add('listening');
                }
            } catch (e) {
                console.error('Error starting inactive recognition:', e);
                reinitializeRecognition();
            }
        }
    } else {
        // If recognition doesn't exist, initialize it
        console.log('Recognition not initialized, creating now');
    initSpeechRecognition();
        // Try to start after a brief delay
    setTimeout(() => {
        if (recognition) {
            try {
                recognition.start();
                recognition.isActive = true;
                    if (orb) {
                orb.classList.add('listening');
                    }
            } catch (e) {
                    console.error('Error starting new recognition:', e);
            }
        }
    }, 500);
}

    // Update UI safely
    updateConversationStatus('Listening...');
    if (toggleRecordButton) {
        toggleRecordButton.innerText = 'Stop Recording';
    }
    
    // Keep recognition active even when AI is speaking if in continuous mode
    if (isContinuousMode) {
        // This allows us to detect interruptions
        console.log('Starting recording in continuous mode (will stay active during AI speech)');
    } else {
        console.log('Starting recording in standard mode');
    }
}

// Stop recording
function stopRecording() {
    console.log('Stopping recording - checking continuous mode first');
    
    // In continuous mode, we don't actually stop recording
    // This allows detection of interruptions during AI speech
    if (isContinuousMode) {
        console.log('Continuous mode active - maintaining recognition');
        // Just make sure UI shows the right state, but keep recognition active
        if (orb) {
            orb.classList.remove('listening');
        }
        updateConversationStatus('Processing...');
        return;
    }
    
    // Standard non-continuous mode behavior
    isRecognizing = false;
    if (recognition && recognition.isActive) {
        try {
                recognition.stop();
            recognition.isActive = false;
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }
    
    // Update UI safely
    if (orb) {
        orb.classList.remove('listening');
    }
    updateConversationStatus('Recording stopped');
}

// Add an alias for startNoiseCalibration since it's called in init() but doesn't exist
function startNoiseCalibration() {
    // Call the setup function which also starts the automatic calibration
    setupMicCalibration();
}

// Add a function to preload ElevenLabs by making a tiny request
async function preloadElevenLabs() {
    if (!useElevenLabs) return;
    
    try {
        console.log('Preloading ElevenLabs TTS to reduce first response delay...');
        const currentOrigin = window.location.origin;
        
        // Short preload text to warm up the TTS engine
        const preloadText = "I'm ready.";
        
        const requestBody = {
            text: preloadText,
            voice_id: 'EXAVITQu4vr4xnSDxMaL', // Default female voice
            model_id: 'eleven_monolingual_v1',
            stream: true,
            optimize_streaming_latency: 4,
            output_format: "mp3_44100_128"
        };
        
        // Make the preload request silently
        const preloadResponse = await fetch(`${currentOrigin}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        if (preloadResponse.ok) {
            console.log('ElevenLabs TTS system preloaded successfully');
            
            // Drain the response to complete the request
            const reader = preloadResponse.body.getReader();
            while (true) {
                const { done } = await reader.read();
                if (done) break;
            }
        } else {
            console.warn('ElevenLabs preload request failed:', preloadResponse.status);
            }
        } catch (error) {
        console.warn('Error preloading ElevenLabs:', error);
    }
}

// Function to analyze whether text contains a complete sentence
function isCompleteSentence(text) {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        return false;
    }

    text = text.trim();
    
    // Create a more detailed analysis of the text
    const analysis = {
        hasEndPunctuation: /[.!?]$/.test(text),
        isQuestion: /\?$/.test(text) || /^(who|what|where|when|why|how|is|are|was|were|do|does|did|have|has|can|could|will|would|should)/i.test(text),
        isCommand: /^(please|could you|would you|can you|let's|tell me|show me|find|search|open|close|start|stop|create|delete|update)/i.test(text),
        hasSubjectVerb: /\b(i|you|he|she|it|we|they)\b.*\b(is|am|are|was|were|will|have|has|had|do|does|did|can|could|should|would)\b/i.test(text),
        hasCompleteThought: text.split(/\s+/).length >= 2, // Even just 2 words can be a complete thought
        isNounPhrase: /^(the|a|an|this|that|these|those)\s+\w+$/i.test(text),
        isShortAnswer: text.split(/\s+/).length <= 3 && !/[.!?]$/.test(text)
    };
    
    console.log('Sentence analysis for:', JSON.stringify(text), analysis);
    
    // Rules to determine completeness - using much more lenient standards
    
    // Consider complete if:
    // 1. Has ending punctuation
    if (analysis.hasEndPunctuation) {
        return true;
    }
    
    // 2. Has more than 3 words (lowered from original threshold)
    if (text.split(/\s+/).length > 3) {
        return true;
    }
    
    // 3. Is a question form (even without question mark)
    if (analysis.isQuestion) {
        return true;
    }
    
    // 4. Is a command
    if (analysis.isCommand) {
        return true;
    }
    
    // 5. Clear subject-verb structure
    if (analysis.hasSubjectVerb) {
        return true;
    }
    
    // 6. Any statement with a meaningful length
    if (text.length > 15) {
        return true;
    }
    
    // Default - if not matched as complete, return false
    return false;
}

// Modern speech recognition handler with improved transcript management
function setupSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        updateConversationStatus('Speech recognition not supported in this browser');
        return;
    }

    // Create a new recognition instance
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

    // Configure recognition settings
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Reset variables
    isRecognizing = false;
    pendingText = '';
    lastResultTimestamp = Date.now();
    
    // Enhanced result handling
    recognition.onresult = function(event) {
        handleSpeechResults(event);
    };

    // Better error handling
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        
        // If we're in the middle of speaking, don't restart immediately
        if (isAISpeaking) {
            console.log('Error during AI speaking, not restarting recognition yet');
            updateAISpeakingState(true);
            return;
        }
        
        // Handle specific errors
        switch (event.error) {
            case 'network':
                updateConversationStatus('Network error. Check your connection');
                break;
            case 'not-allowed':
            case 'service-not-allowed':
                updateConversationStatus('Microphone access denied');
                isRecognizing = false;
                break;
            case 'aborted':
                console.log('Recognition aborted');
                break;
            default:
                // For other errors, try to recover
                setTimeout(() => {
                    if (isRecognizing && !isAISpeaking) {
                        console.log('Attempting to restart recognition after error');
                        startRecording();
                    }
                }, 1000);
                break;
        }
    };

    // Handle automatic restarts more effectively
    recognition.onend = function() {
        recognition.isActive = false;
        console.log('Speech recognition service disconnected');
        
        // Don't restart if we're speaking or processing
        if (isAISpeaking || isProcessing) {
            console.log('Not restarting recognition while AI is speaking or processing');
            return;
        }
        
        // Only restart if we should be recognizing
        if (isRecognizing) {
            console.log('Recognition ended but should be active, restarting...');
            setTimeout(() => {
                // Double-check state hasn't changed during timeout
                if (isRecognizing && !isAISpeaking && !isProcessing) {
                    try {
                        recognition.start();
                        recognition.isActive = true;
                        if (orb) {
                            orb.classList.add('listening');
                        }
                        console.log('Successfully restarted recognition');
                    } catch (e) {
                        console.error('Failed to restart recognition:', e);
                        // Try a complete reset
                        setupSpeechRecognition();
                        setTimeout(() => {
                            if (isRecognizing && !isAISpeaking && !isProcessing) {
                                try {
                                    recognition.start();
                                    recognition.isActive = true;
                                } catch (finalError) {
                                    console.error('Critical error restarting recognition:', finalError);
                                }
                            }
                        }, 500);
                    }
                }
            }, 300);
        }
    };
}

// Extract transcript text from a speech recognition event
function getTranscriptFromEvent(event) {
    let final = '';
    let interim = '';
    
    for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
        } else {
            interim += event.results[i][0].transcript;
        }
    }
    
    return { final, interim };
}

// New function to handle speech results with better transcript management
function handleSpeechResults(event) {
    // Extract transcripts
    const { final, interim } = getTranscriptFromEvent(event);
    
    // Update the last result timestamp
    lastResultTimestamp = Date.now();
    
    // Clear any pending timeouts when we get new speech
    clearTimeout(pauseTimeout);
    clearTimeout(sendTimeout);
    
    // Update the transcript display
    if (transcriptElement) {
        // Show a visual indication that we're processing speech
        transcriptElement.innerHTML = `${final}<span class="interim">${interim}</span>`;
        transcriptElement.scrollTop = transcriptElement.scrollHeight;
    }
    
    // Combine final and interim for AI interruption detection
    const currentText = (final + interim).trim();
    
    // If the AI is speaking, check for interruption - with higher threshold for sales context
    // We don't want to interrupt AI as easily in sales conversations
    if (isAISpeaking && currentText.length > 8) {
        console.log('User may be interrupting AI speech:', currentText);
        handleInterruption();
    }
    
    // If we have final results, update pending text
    if (final) {
        // Check if the final text contains a thinking phrase when not in thinking mode
        if (!isThinkingMode && containsThinkingPhrase(final)) {
            console.log('Thinking phrase detected in speech: ', final);
            
            // Enter thinking mode
            enterThinkingMode();
            
            // Add the thinking indication to the transcript - use persona-based message
            const thinkingAck = generatePersonaResponse('patience');
            addMessageToTranscript('system', thinkingAck);
            
            // Clear the thinking phrase from the pending text to avoid sending it
            pendingText = pendingText.replace(final, '').trim();
            return;
        }
        
        // If in thinking mode and user speaks anything, exit thinking mode
        if (isThinkingMode) {
            // Check if the user is responding to an impatience prompt
            const isAcknowledgment = /\b(yes|yeah|yep|still here|sorry|um|uh|trying|thinking|figuring|working on|give me|moment|second)\b/i.test(final);
            
            if (isAcknowledgment) {
                // User acknowledged, reset frustration but stay in thinking mode
                resetThinkingModeTimeout();
                
                // Increment frustration level
                frustrationLevel++;
                
                // If this is the first acknowledgment, just accept it
                if (frustrationLevel === 1) {
                    // Add AI response to transcript - use persona-based patience response
                    const aiResponse = generatePersonaResponse('patience');
                    addMessageToTranscript('ai', aiResponse);
                    speak(aiResponse, true);
                    
                    // Don't exit thinking mode, but don't add response to pendingText
                    pendingText = '';
                    return;
                } 
                // If already acknowledged once, AI gets more impatient
                else if (frustrationLevel > 1) {
                    // Exit thinking mode with impatient message
                    exitThinkingModeWithImpatience();
                    pendingText = '';
                    return;
                }
            } else {
                // Not just an acknowledgment but actual content
                console.log('User spoke while in thinking mode, exiting thinking mode');
                exitThinkingMode();
                
                // Continue processing the speech
                pendingText += final + ' ';
                startSendTimeout();
            }
        } else {
            // Normal speech processing (not in thinking mode)
            pendingText += final + ' ';
            
            // Start a timeout to send the message if the user pauses
            startSendTimeout();
        }
    }
}

// Modify startSendTimeout for sales conversations
function startSendTimeout() {
    clearTimeout(sendTimeout);
    
    // Visual indicator that we're about to send
    updateConversationStatus('Processing...');
    
    // Set a timeout to send the message after a pause - longer for sales context
    sendTimeout = setTimeout(() => {
        if (pendingText.trim()) {
            handleUserMessage(pendingText.trim());
            pendingText = '';
        }
    }, 2000); // 2 seconds pause for sales conversations
}

/**
 * Update UI when AI speaking state changes
 * @param {boolean} isSpeaking - Whether the AI is currently speaking
 */
function updateAISpeakingState(isSpeaking) {
    console.log('Updating AI speaking state:', isSpeaking);
    
    // Update global state
    isAISpeaking = isSpeaking;
    
    // Safely update UI elements
    if (orb) {
        if (isSpeaking) {
            // AI is speaking
            orb.classList.remove('processing');
            orb.classList.remove('recording');
            orb.classList.add('ai-speaking');
        } else {
            // AI stopped speaking
            orb.classList.remove('ai-speaking');
            
            // Update status based on recording state
            if (isRecognizing) {
                orb.classList.add('recording');
            } else {
                orb.classList.add('ready');
            }
        }
    } else {
        console.warn('Orb element not found for AI speaking state update');
    }
    
    // Safely update status indicators
    const indicators = document.querySelectorAll('.ai-status-indicator');
    if (indicators.length > 0) {
        indicators.forEach(el => {
            if (isSpeaking) {
                el.classList.add('speaking');
            } else {
                el.classList.remove('speaking');
            }
        });
    }
}

// Add CSS for AI speaking animation
document.head.insertAdjacentHTML('beforeend', `
<style>
.ai-speaking {
    background-color: #3b82f6 !important; /* Blue */
    animation: pulse-speaking 2s infinite ease-in-out !important;
}

@keyframes pulse-speaking {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
    50% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(59, 130, 246, 0.5); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
}

.user-interrupt {
    background-color: #ec4899 !important; /* Pink */
    animation: interrupt-flash 0.5s ease-in-out !important;
}

@keyframes interrupt-flash {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.7); }
    50% { transform: scale(1.1); box-shadow: 0 0 20px 5px rgba(236, 72, 153, 0.5); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.7); }
}
</style>
`);

// Voice selection functions
function openVoiceSelectionModal() {
    if (voiceSelectionModal) {
        voiceSelectionModal.style.display = 'flex';
    } else {
        console.warn('Voice selection modal element not found');
    }
}

function closeVoiceSelectionModal() {
    if (voiceSelectionModal) {
        voiceSelectionModal.style.display = 'none';
    } else {
        console.warn('Voice selection modal element not found');
    }
}

// Add this function to handle toggle functionality
function toggleVoiceModal() {
    if (!voiceSelectionModal) {
        console.warn('Voice selection modal element not found');
        return;
    }

    if (voiceSelectionModal.style.display === 'flex') {
        closeVoiceSelectionModal();
    } else {
        openVoiceSelectionModal();
    }
}

function selectVoice(optionElement) {
    if (!voiceOptions || !optionElement) {
        console.warn('Voice options or selected option element not found');
        return;
    }
    
    try {
        // Clear previous selection
        voiceOptions.forEach(option => {
            option.classList.remove('active');
            const checkElement = option.querySelector('.voice-check');
            if (checkElement) {
                checkElement.classList.remove('selected');
            }
        });
        
        // Set new selection
        optionElement.classList.add('active');
        const checkElement = optionElement.querySelector('.voice-check');
        if (checkElement) {
            checkElement.classList.add('selected');
        }
        
        // Update selected voice
        const nameElement = optionElement.querySelector('.voice-name');
        const descElement = optionElement.querySelector('.voice-desc');
        
        selectedVoice = {
            id: optionElement.dataset.voiceId || 'default',
            name: nameElement ? nameElement.innerText : 'Default Voice',
            description: descElement ? descElement.innerText : 'Default voice description'
        };
    
    // Update UI
        updateConversationStatus(`Voice changed to ${selectedVoice.name}`);
    } catch (error) {
        console.error('Error selecting voice:', error);
        updateConversationStatus('Error changing voice');
    }
}

// Initialize voice interface
function init() {
    console.log('Initializing voice interface...');
    
    // Initialize speech recognition API
    initSpeechRecognition();
    
    // Set up microphone calibration
    setupMicCalibration();
    
    // Start calibration process
    startAutoCalibration();
    
    // Set up buyer persona UI
    setupBuyerPersonaUI();
    
    // Set initial status
    updateConversationStatus('Ready to start conversation');
    
    // Always use continuous mode for better responsiveness
    isContinuousMode = true;
    
    // Set up event listeners - using the existing constants instead of reassigning them
    if (toggleRecordButton) {
        toggleRecordButton.addEventListener('click', toggleRecording);
    }
    
    // Set up voice selection
    if (voiceSelectionToggle) {
        voiceSelectionToggle.addEventListener('click', openVoiceSelectionModal);
    }
    
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeVoiceSelectionModal);
    }
    
    if (voiceOptions) {
        voiceOptions.forEach(option => {
            option.addEventListener('click', () => selectVoice(option));
        });
    }
    
    // Make the orb clickable to toggle thinking mode or submit in thinking mode
    const conversationOrb = document.getElementById('conversationOrb');
    if (conversationOrb) {
        conversationOrb.addEventListener('click', () => {
            if (isThinkingMode) {
                // If in thinking mode, clicking the orb will exit thinking mode
                exitThinkingMode();
            } else {
                // If not in thinking mode, clicking the orb will enter thinking mode
                enterThinkingMode();
            }
        });
    }
    
    // Pre-initialize audio components immediately on page load to reduce first message latency
    console.log('Pre-initializing audio components...');
    
    // Start recording right away in continuous mode - don't wait for button press
    setTimeout(() => {
        startRecording(true); // Start with continuous mode enabled
        
        // Also initialize speech recognition immediately
        if (!recognition) {
            initSpeechRecognition();
        }
        
        // Add second attempt to initialize Deepgram after delay
        setTimeout(() => {
            if (!isDeepgramAvailable) {
                console.log('Attempting to initialize Deepgram again...');
                initDeepgram().then(isAvailable => {
                    console.log(`Deepgram pre-initialization complete: ${isAvailable ? 'available' : 'unavailable'}`);
                }).catch(error => {
                    console.error('Error in second Deepgram initialization attempt:', error);
                });
            }
        }, 2000);
    }, 500);
}

// Function to add variety to common AI responses
function addPersonalityToResponse(text, userMessage) {
    if (!text) return text;
    
    // If no active persona, just return the original text
    if (!activeBuyerPersona) {
        return text;
    }
    
    // Message type detection
    const messageType = detectMessageType(userMessage, text);
    
    // Apply persona-specific response style
    let enhancedResponse = text;
    
    // For greetings, use persona-specific greetings if this is early in conversation
    if (messageType === 'greeting' && transcriptContainer.querySelectorAll('.message').length < 3 && 
        activeBuyerPersona.responseStyles && activeBuyerPersona.responseStyles.greeting) {
        const options = activeBuyerPersona.responseStyles.greeting;
        const index = getSeededRandom(options.length);
        enhancedResponse = options[index];
    }
    
    // For objections, introduce persona-specific objection styles
    else if (messageType === 'objection' && activeBuyerPersona.responseStyles && activeBuyerPersona.responseStyles.objections) {
        // Check if there's an appropriately matching objection
        // If not, enhance the existing objection with persona characteristics
        
        const objectionList = activeBuyerPersona.responseStyles.objections;
        const objectionMatcher = activeBuyerPersona.objectionStyles && activeBuyerPersona.objectionStyles.some(style => 
            text.toLowerCase().includes(style.split('-')[0]));
            
        if (objectionMatcher) {
            // There's a relevant objection in the response already, enhance it
            enhancedResponse = addTraitInfluence(text, activeBuyerPersona.traits);
        } else if (Math.random() < 0.3 && objectionList && objectionList.length > 0) {
            // Sometimes replace with a persona-specific objection
            const index = getSeededRandom(objectionList.length);
            enhancedResponse = objectionList[index];
        } else {
            // Apply regular trait influences
            enhancedResponse = addTraitInfluence(text, activeBuyerPersona.traits);
        }
    }
    
    // For general responses, apply persona trait influences
    else {
        enhancedResponse = addTraitInfluence(text, activeBuyerPersona.traits);
    }
    
    // If there's an ongoing conversation, check if the persona has been interrupted
    const hasBeenInterrupted = State && State.wasInterrupted;
    if (hasBeenInterrupted && Math.random() < 0.7) {
        const interruptionReactions = [
            "I wasn't finished speaking. ",
            "If you could let me finish my thought. ",
            "As I was saying. ",
            "Please don't interrupt me. "
        ];
        
        // Adjust based on persona patience
        if (activeBuyerPersona.traits.patience < 0.4) {
            interruptionReactions.push(
                "I don't appreciate being cut off. ",
                "Let me finish, please. "
            );
        }
        
        const reactionIndex = getSeededRandom(interruptionReactions.length);
        // Add as a separate sentence instead of combining
        enhancedResponse = interruptionReactions[reactionIndex] + enhancedResponse;
    }
    
    // Add appropriate disfluencies based on persona
    if (activeBuyerPersona.traits && typeof addDisfluency === "function") {
        enhancedResponse = addDisfluency(enhancedResponse, activeBuyerPersona);
    }
    
    return enhancedResponse;
}

// Attach init function to DOMContentLoaded
document.addEventListener('DOMContentLoaded', init);

// Function to start listening with a fresh recognition system
function startListening() {
    console.log("Starting listening with full system reset...");
    updateConversationStatus("Resetting recognition system...");
    
    // Full reset of state
    isRecognizing = true;
    pendingText = '';
    isProcessing = false;
    clearPauseTimer();
    
    // Make sure recognition is good to go
    if (!recognition) {
        initSpeechRecognition();
    }
    
    // Completely reset recognition to be safe
    try {
        if (recognition.isActive) {
            recognition.stop();
            recognition.isActive = false;
            
            // Brief delay before restarting
            setTimeout(() => {
                try {
                    recognition.start();
                    recognition.isActive = true;
                    orb.classList.add('listening');
                    toggleRecordButton.classList.add('listening');
                    updateConversationStatus("Listening...");
                } catch (error) {
                    console.error("Failed to restart recognition:", error);
                    // Try one more time with new instance
                    recognition = null;
                    initSpeechRecognition();
                    setTimeout(() => {
                        try {
                            recognition.start();
                            recognition.isActive = true;
                            orb.classList.add('listening');
                            toggleRecordButton.classList.add('listening');
                            updateConversationStatus("Listening...");
                        } catch (finalError) {
                            console.error("Critical error starting recognition:", finalError);
                            updateConversationStatus("Failed to start listening. Please reload page.");
                        }
                    }, 500);
                }
            }, 300);
        } else {
            // Not active, just start
            recognition.start();
            recognition.isActive = true;
            orb.classList.add('listening');
            toggleRecordButton.classList.add('listening');
            updateConversationStatus("Listening...");
        }
    } catch (error) {
        console.error("Error in startListening:", error);
        // Complete reset as fallback
        recognition = null;
        initSpeechRecognition();
        setTimeout(() => {
            try {
                recognition.start();
                recognition.isActive = true;
                orb.classList.add('listening');
                toggleRecordButton.classList.add('listening');
                updateConversationStatus("Listening...");
            } catch (e) {
                console.error("Critical failure in recognition startup:", e);
                updateConversationStatus("Microphone error. Please reload page.");
            }
        }, 500);
    }
}

// Existing ElevenLabs setting check
document.addEventListener('DOMContentLoaded', function() {
    // Check for ElevenLabs setting
    const useElevenLabsElement = document.getElementById('use-eleven-labs');
    if (useElevenLabsElement) {
        useElevenLabs = useElevenLabsElement.value === 'true';
    }
});

// Add these functions after detectMessageType

// Helper function to apply trait influences to text
function addTraitInfluence(text, traits) {
    if (!text || !traits) return text;
    
    let result = text;
    
    // Apply trust level influence
    if (traits.trust < 0.4) {
        // Low trust - add skeptical language
        result = result
            .replace(/definitely/gi, 'supposedly')
            .replace(/guaranteed/gi, 'claimed to be guaranteed')
            .replace(/\bwill\b/gi, 'might')
            .replace(/always/gi, 'supposedly always');
            
        // Add trust qualifiers occasionally
        if (Math.random() < 0.3) {
            // Don't add prefixes to sentences that start with "I'm", "I am", "I have", etc.
            // This avoids ungrammatical combinations like "I'm not convinced that I'm here"
            if (!result.match(/^I\s+(am|'m|have|'ve|will|'ll|can|would|should)/i)) {
                const lowTrustPrefixes = [
                    "I'm not convinced about this. ",
                    "I'm skeptical. ",
                    "I have my doubts. ",
                    "It remains to be seen. "
                ];
                const prefix = lowTrustPrefixes[Math.floor(Math.random() * lowTrustPrefixes.length)];
                // Add the prefix as a separate sentence instead of combining it with the original
                result = prefix + result;
            }
        }
    } else if (traits.trust > 0.7) {
        // High trust - more positive language
        result = result
            .replace(/might/gi, 'will')
            .replace(/possibly/gi, 'likely')
            .replace(/could/gi, 'can');
    }
    
    // Apply patience level influence
    if (traits.patience < 0.4) {
        // Impatient language
        result = result
            .replace(/take our time/gi, 'move quickly')
            .replace(/eventually/gi, 'soon')
            .replace(/in the future/gi, 'shortly');
            
        // Add time pressure occasionally
        if (Math.random() < 0.3 && !result.includes("time") && !result.includes("quickly") && !result.includes("soon")) {
            const timeMarkers = [
                "Let's not waste time here. ",
                "I need a quick answer on this. ",
                "I'm on a tight schedule. ",
                "Moving on quickly. "
            ];
            const marker = timeMarkers[Math.floor(Math.random() * timeMarkers.length)];
            // Add as a separate sentence rather than combining
            result = marker + result;
        }
    }
    
    // Apply technical knowledge influence
    if (traits.technicalKnowledge > 0.7) {
        // More technical language
        result = result
            .replace(/use/gi, 'implement')
            .replace(/software/gi, 'solution')
            .replace(/good/gi, 'optimal')
            .replace(/problem/gi, 'challenge');
    } else if (traits.technicalKnowledge < 0.4) {
        // Simpler language
        result = result
            .replace(/implement/gi, 'use')
            .replace(/infrastructure/gi, 'system')
            .replace(/utilize/gi, 'use')
            .replace(/functionality/gi, 'features');
            
        // Occasionally add technical confusion
        if (Math.random() < 0.2 && result.length > 50) {
            const confusionMarkers = [
                "I'm not too technical, so please explain simply. ",
                "In plain English, please. ",
                "Without the technical jargon. "
            ];
            const marker = confusionMarkers[Math.floor(Math.random() * confusionMarkers.length)];
            if (!result.includes("technical") && !result.includes("jargon")) {
                // Add as a separate sentence
                result = marker + result;
            }
        }
    }
    
    // Apply price consciousness influence
    if (traits.priceConsciousness > 0.7) {
        // More price-focused language
        result = result
            .replace(/investment/gi, 'cost')
            .replace(/value/gi, 'price-to-value ratio')
            .replace(/affordable/gi, 'cost-effective');
            
        // Occasionally add price concerns
        if (Math.random() < 0.3 && !result.includes("budget") && !result.includes("cost") && !result.includes("price")) {
            const priceMarkers = [
                "I'm keeping a close eye on costs here. ",
                "Budget is a major concern for us. ",
                "Cost is important to me. ",
                "Considering our limited budget. "
            ];
            const marker = priceMarkers[Math.floor(Math.random() * priceMarkers.length)];
            // Add as a separate sentence
            result = marker + result;
        }
    }
    
    return result;
}

// Function to get seeded random number based on date
function getSeededRandom(max) {
    const today = new Date().toDateString();
    const seed = [...today].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    let seedVal = seed;
    
    // Simple random number generator with seed
    seedVal = (seedVal * 9301 + 49297) % 233280;
    const random = seedVal / 233280;
    
    return Math.floor(random * max);
}

// Function to add personality based on buyer persona traits
function createPersonalizedResponse(text, userMessage, context = {}) {
    if (!text) return text;
    
    // If no active persona, just return the original text
    if (!activeBuyerPersona) {
        return text;
    }
    
    // Get conversation context
    const messageCount = context.messageCount || 0;
    const conversationStage = context.stage || 'middle'; // start, middle, end
    const hasBeenInterrupted = context.wasInterrupted || false;
    
    // Message type detection
    const messageType = detectMessageType(userMessage, text);
    
    // Apply persona-specific response style
    let enhancedResponse = text;
    
    // For greetings, use persona-specific greetings if this is early in conversation
    if (messageType === 'greeting' && messageCount < 3 && activeBuyerPersona.responseStyles && activeBuyerPersona.responseStyles.greeting) {
        const options = activeBuyerPersona.responseStyles.greeting;
        const index = getSeededRandom(options.length);
        enhancedResponse = options[index];
    }
    
    // For objections, introduce persona-specific objection styles
    else if (messageType === 'objection' && activeBuyerPersona.responseStyles && activeBuyerPersona.responseStyles.objections) {
        // Check if there's an appropriately matching objection
        // If not, enhance the existing objection with persona characteristics
        
        const objectionList = activeBuyerPersona.responseStyles.objections;
        const objectionMatcher = activeBuyerPersona.objectionStyles && activeBuyerPersona.objectionStyles.some(style => 
            text.toLowerCase().includes(style.split('-')[0]));
            
        if (objectionMatcher) {
            // There's a relevant objection in the response already, enhance it
            enhancedResponse = addTraitInfluence(text, activeBuyerPersona.traits);
        } else if (Math.random() < 0.3 && objectionList && objectionList.length > 0) {
            // Sometimes replace with a persona-specific objection
            const index = getSeededRandom(objectionList.length);
            enhancedResponse = objectionList[index];
        } else {
            // Apply regular trait influences
            enhancedResponse = addTraitInfluence(text, activeBuyerPersona.traits);
        }
    }
    
    // For general responses, apply persona trait influences
    else {
        enhancedResponse = addTraitInfluence(text, activeBuyerPersona.traits);
    }
    
    // If the persona has been interrupted, potentially add reactions
    if (hasBeenInterrupted && Math.random() < 0.7) {
        const interruptionReactions = [
            "I wasn't finished speaking. ",
            "If you could let me finish my thought. ",
            "As I was saying. ",
            "Please don't interrupt me. "
        ];
        
        // Adjust based on persona patience
        if (activeBuyerPersona.traits.patience < 0.4) {
            interruptionReactions.push(
                "I don't appreciate being cut off. ",
                "Let me finish, please. "
            );
        }
        
        const reactionIndex = getSeededRandom(interruptionReactions.length);
        // Add as a separate sentence instead of combining
        enhancedResponse = interruptionReactions[reactionIndex] + enhancedResponse;
    }
    
    // Add appropriate disfluencies based on persona
    if (activeBuyerPersona.traits && typeof addDisfluency === "function") {
        enhancedResponse = addDisfluency(enhancedResponse, activeBuyerPersona);
    }
    
    return enhancedResponse;
}

// Add UI for persona selection
function setupBuyerPersonaUI() {
    const controlsDiv = document.querySelector('.voice-controls');
    if (!controlsDiv) return;
    
    // Create persona type selection dropdown
    const personaTypeSelect = document.createElement('select');
    personaTypeSelect.id = 'buyer-persona-type-select';
    personaTypeSelect.className = 'control-select';
    
    // Add options for each persona type
    for (const [key, persona] of Object.entries(buyerPersonaTypes)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = persona.name;
        personaTypeSelect.appendChild(option);
    }
    
    // Create generate button
    const generateButton = document.createElement('button');
    generateButton.textContent = "Generate Unique Buyer";
    generateButton.className = 'control-button';
    
    // Create display for current persona traits
    const traitsDisplay = document.createElement('div');
    traitsDisplay.id = 'persona-traits-display';
    traitsDisplay.className = 'traits-display';
    
    // Create labels
    const personaLabel = document.createElement('label');
    personaLabel.htmlFor = 'buyer-persona-type-select';
    personaLabel.textContent = 'Buyer Type:';
    personaLabel.className = 'control-label';
    
    // Add change/click handler
    generateButton.addEventListener('click', () => {
        const selectedType = personaTypeSelect.value;
        
        // Generate a new instance
        const newInstance = generatePersonaInstance(selectedType);
        
        // Store in our instances collection
        const instanceId = newInstance.id;
        personaInstances[instanceId] = newInstance;
        
        // Set as active persona
        activeBuyerPersona = newInstance;
        
        // Update the traits display
        updateTraitsDisplay(traitsDisplay, newInstance);
        
        // Update conversation status
        updateConversationStatus(`Generated unique ${newInstance.instanceName}`);
    });
    
    // Function to update traits display
    function updateTraitsDisplay(element, persona) {
        if (!element || !persona) return;
        
        let html = `<div class="persona-header">${persona.instanceName}</div>`;
        html += '<div class="traits-grid">';
        
        for (const [trait, value] of Object.entries(persona.traits)) {
            const percentage = Math.round(value * 100);
            const formattedTrait = trait.replace(/([A-Z])/g, ' $1').toLowerCase();
            const capitalizedTrait = formattedTrait.charAt(0).toUpperCase() + formattedTrait.slice(1);
            
            html += `<div class="trait-row">
                <div class="trait-name">${capitalizedTrait}:</div>
                <div class="trait-bar-container">
                    <div class="trait-bar" style="width: ${percentage}%"></div>
                    <div class="trait-value">${percentage}%</div>
                </div>
            </div>`;
        }
        
        html += '</div>';
        element.innerHTML = html;
    }
    
    // Add CSS for traits display
    const style = document.createElement('style');
    style.textContent = `
        .traits-display {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f9f9f9;
        }
        .persona-header {
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 15px;
        }
        .traits-grid {
            display: grid;
            grid-gap: 6px;
        }
        .trait-row {
            display: grid;
            grid-template-columns: 130px 1fr;
            align-items: center;
        }
        .trait-name {
            font-size: 12px;
        }
        .trait-bar-container {
            height: 15px;
            background: #eee;
            border-radius: 3px;
            position: relative;
            overflow: hidden;
        }
        .trait-bar {
            height: 100%;
            background: #3b82f6;
            transition: width 0.3s ease;
        }
        .trait-value {
            position: absolute;
            right: 5px;
            top: 0;
            font-size: 10px;
            line-height: 15px;
            color: #fff;
            text-shadow: 0 0 2px rgba(0,0,0,0.5);
        }
    `;
    document.head.appendChild(style);
    
    // Append to controls
    controlsDiv.appendChild(personaLabel);
    controlsDiv.appendChild(personaTypeSelect);
    controlsDiv.appendChild(generateButton);
    controlsDiv.appendChild(traitsDisplay);
    
    // Generate an initial persona
    setTimeout(() => {
        generateButton.click(); // Auto-generate first persona
    }, 500);
}

// Add the disfluency function

// Smart disfluency system - adds natural speech patterns
function addDisfluency(text, persona) {
    if (!text) return text;
    
    // Early exit if no persona or very short text
    if (!persona || text.length < 10) return text;
    
    // Get disfluency rate from persona traits or use a default low value
    const disfluencyRate = persona.traits?.disfluencyRate || 0.01;
    
    // Detect complex or long responses that would naturally have disfluencies
    const isComplexResponse = text.length > 100 || 
                             text.split('.').length > 3 ||
                             /\b(however|nevertheless|furthermore|alternatively|consequently)\b/i.test(text);
    
    // Baseline disfluency chances
    let chanceOfFiller = isComplexResponse ? 0.05 : 0.01; // 5% for complex responses, 1% otherwise
    let chanceOfPause = isComplexResponse ? 0.04 : 0.01;  // 4% for complex responses, 1% otherwise
    let chanceOfRestart = isComplexResponse ? 0.02 : 0;   // 2% for complex responses, 0% otherwise
    
    // Adjust based on persona's disfluency rate
    chanceOfFiller *= (disfluencyRate / 0.03); // Scale relative to a "normal" rate of 0.03
    chanceOfPause *= (disfluencyRate / 0.03);
    chanceOfRestart *= (disfluencyRate / 0.03);
    
    // Split text into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    // Process each sentence
    const processedSentences = sentences.map(sentence => {
        if (sentence.length < 10) return sentence; // Skip very short sentences
        
        // Skip sentences that are greetings or very formulaic
        if (/^(hello|hi|hey|good morning|good afternoon|good evening|thanks|thank you)/i.test(sentence) && 
            sentence.length < 30) {
            return sentence;
        }
        
        // Split into words
        const words = sentence.split(/\s+/);
        
        // Process each word
        let result = [];
        let skipNext = false;
        
        for (let i = 0; i < words.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }
            
            const word = words[i];
            const isStartOfSentence = i === 0;
            const isAfterComma = i > 0 && words[i-1].endsWith(',');
            
            // Add word
            result.push(word);
            
            // Add filler after word with probability
            if (!isStartOfSentence && Math.random() < chanceOfFiller) {
                const fillers = ['um', 'uh', 'ah', 'you know', 'like'];
                // Use more sophisticated fillers for complex responses
                if (isComplexResponse) fillers.push('I mean', 'actually', 'basically');
                const filler = fillers[Math.floor(Math.random() * fillers.length)];
                result.push(filler);
            }
            
            // Add pause after comma or complex transition with probability
            if ((isAfterComma || /\b(but|and|or|so|because|however)\b/i.test(word)) && 
                Math.random() < chanceOfPause) {
                result.push('...');
            }
            
            // Word restart with probability (only for content words, not function words)
            if (!isStartOfSentence && word.length > 4 && 
                !/\b(the|and|but|or|in|on|at|to|for|with|by|as|of)\b/i.test(word) && 
                Math.random() < chanceOfRestart) {
                const parts = word.split('');
                const cutPoint = 1 + Math.floor(Math.random() * (parts.length * 0.7));
                const restart = parts.slice(0, cutPoint).join('') + '- ' + word;
                // Replace the word with restart version
                result[result.length - 1] = restart;
            }
        }
        
        return result.join(' ');
    });
    
    return processedSentences.join(' ');
}

// Add a global flag to indicate thinking mode
let isThinkingMode = false;

// Add a function to toggle thinking mode
function toggleThinkingMode() {
    isThinkingMode = !isThinkingMode;
    
    const thinkingButton = document.getElementById('thinking-button');
    const conversationOrb = document.getElementById('conversationOrb');
    
    if (thinkingButton) {
        if (isThinkingMode) {
            thinkingButton.classList.add('active');
            thinkingButton.innerText = 'Thinking... (click to send)';
        } else {
            thinkingButton.classList.remove('active');
            thinkingButton.innerText = 'Thinking Mode';
            
            // When exiting thinking mode, send the accumulated transcript if there is any
            if (pendingText.trim().length > 0) {
                sendAccumulatedTranscript();
            }
        }
    }
    
    if (conversationOrb) {
        if (isThinkingMode) {
            conversationOrb.classList.add('thinking-mode');
        } else {
            conversationOrb.classList.remove('thinking-mode');
        }
    }
    
    // Update status
    if (isThinkingMode) {
        updateConversationStatus('Thinking mode active. Take your time...');
    } else {
        updateConversationStatus('Listening...');
    }
}

// Add an array of phrases that indicate the user needs time to think
const thinkingPhrases = [
    "give me a sec",
    "give me a second",
    "let me think",
    "hang on",
    "hold on",
    "one moment",
    "just a moment",
    "thinking",
    "let me consider",
    "need to think",
    "wait a second",
    "hmm",
    "uh",
    "um",
    "well",
    "I need to think about this",
    "let me process that",
    "need a moment",
    "give me a minute",
    "just a minute"
];

// Function to check if text contains thinking phrases
function containsThinkingPhrase(text) {
    if (!text) return false;
    
    // Convert to lowercase for case-insensitive matching
    const lowerText = text.toLowerCase();
    
    // Check if any thinking phrase is in the text
    return thinkingPhrases.some(phrase => lowerText.includes(phrase));
}

// Function to enter thinking mode
function enterThinkingMode() {
    isThinkingMode = true;
    frustrationLevel = 0;
    
    const conversationOrb = document.getElementById('conversationOrb');
    
    if (conversationOrb) {
        conversationOrb.classList.add('thinking-mode');
    }
    
    // Update status
    updateConversationStatus('Thinking mode active. Take your time...');
    
    // Add subtle notification
    showNotification('Thinking mode activated. Take your time to form your thoughts.');
    
    // Set a timeout for silence
    resetThinkingModeTimeout();
}

// Reset the thinking mode timeout
function resetThinkingModeTimeout() {
    // Clear any existing timeouts
    if (thinkingModeTimeout) {
        clearTimeout(thinkingModeTimeout);
    }
    
    if (impatientCheckTimeout) {
        clearTimeout(impatientCheckTimeout);
    }
    
    // Set a timeout for initial check (30 seconds)
    thinkingModeTimeout = setTimeout(() => {
        if (isThinkingMode) {
            aiCheckIfUserIsPresent();
        }
    }, 30000); // 30 seconds of silence
}

// AI checks if user is still present after silence
function aiCheckIfUserIsPresent() {
    // Get a check response from persona instead of hard-coded message
    const checkMessage = generatePersonaResponse('check_silence');
    addMessageToTranscript('ai', checkMessage);
    speak(checkMessage, true);
    
    // Set a shorter timeout for next check (becoming impatient)
    const nextCheckTime = Math.floor(7000 + Math.random() * 8000); // 7-15 seconds
    
    impatientCheckTimeout = setTimeout(() => {
        if (isThinkingMode) {
            // If still in thinking mode, AI gets impatient
            exitThinkingModeWithImpatience();
        }
    }, nextCheckTime);
}

// Exit thinking mode with an impatient message
function exitThinkingModeWithImpatience() {
    // Get an impatient response from persona
    const impatientResponse = generatePersonaResponse('impatient');
    
    // Add to transcript
    addMessageToTranscript('ai', impatientResponse);
    speak(impatientResponse, true);
    
    // Exit thinking mode
    isThinkingMode = false;
    
    const conversationOrb = document.getElementById('conversationOrb');
    if (conversationOrb) {
        conversationOrb.classList.remove('thinking-mode');
    }
    
    // Update status
    updateConversationStatus('Listening...');
    
    // Clear any thinking timeouts
    if (thinkingModeTimeout) {
        clearTimeout(thinkingModeTimeout);
        thinkingModeTimeout = null;
    }
    
    if (impatientCheckTimeout) {
        clearTimeout(impatientCheckTimeout);
        impatientCheckTimeout = null;
    }
    
    // Reset frustration level
    frustrationLevel = 0;
}

// Generate response based on persona traits and context
function generatePersonaResponse(responseType) {
    // Get current persona traits if available
    const persona = window.currentPersona || {
        trust: 0.5,
        patience: 0.5,
        talkativeness: 0.5,
        technicalKnowledge: 0.5,
        priceConsciousness: 0.5,
        formality: 0.5,
        name: 'Buyer'
    };
    
    // Base responses by type and personality traits
    const responseTemplates = {
        'check_silence': [
            // Low patience, informal
            { conditions: { patience: '<0.4', formality: '<0.4' }, responses: [
                "Hey, you still there?",
                "Hello? Did I lose you?",
                "You there?",
                `${persona.name ? persona.name + '?' : 'Hello?'}`
            ]},
            // Low patience, formal
            { conditions: { patience: '<0.4', formality: '>0.6' }, responses: [
                "Excuse me, are you still available?",
                "I'm waiting for your response.",
                "Should we continue our discussion?",
                "Are we still connected?"
            ]},
            // Medium patience
            { conditions: { patience: '0.4-0.7' }, responses: [
                "Just checking if you're still there.",
                "Taking a moment?",
                "Still with me?",
                "Do you need more time?"
            ]},
            // High patience
            { conditions: { patience: '>0.7' }, responses: [
                "Take your time, just checking in.",
                "No rush, just making sure you're still here.",
                "Whenever you're ready.",
                "I'm still here when you're ready."
            ]},
            // Default (medium traits)
            { conditions: {}, responses: [
                "Still there?",
                "Are you thinking?",
                "Need more time?",
                "Should I wait?"
            ]}
        ],
        'patience': [
            // Low patience but trying
            { conditions: { patience: '<0.4' }, responses: [
                "OK, thinking...",
                "Alright.",
                "Fine.",
                "Sure."
            ]},
            // Medium patience
            { conditions: { patience: '0.4-0.7' }, responses: [
                "No worries.",
                "Take your time.",
                "All good!",
                "No problem."
            ]},
            // High patience
            { conditions: { patience: '>0.7' }, responses: [
                "Take all the time you need.",
                "Happy to wait while you think.",
                "I understand, take your time.",
                "That's perfectly fine."
            ]},
            // Default
            { conditions: {}, responses: [
                "Take your time.",
                "No rush.",
                "Sure thing.",
                "I'll wait."
            ]}
        ],
        'impatient': [
            // Very low patience
            { conditions: { patience: '<0.3' }, responses: [
                "Look, we need to move on.",
                "I don't have all day.",
                "Can we continue please?",
                "Let's get back to business."
            ]},
            // Low patience
            { conditions: { patience: '0.3-0.5' }, responses: [
                "So... what are your thoughts?",
                "Let's keep going, shall we?",
                "We should probably continue.",
                "Ready to move forward?"
            ]},
            // Medium patience
            { conditions: { patience: '0.5-0.7' }, responses: [
                "I'm wondering if we should continue our conversation?",
                "Do you have any thoughts you'd like to share now?",
                "Perhaps we should move forward with our discussion.",
                "Shall we continue when you're ready?"
            ]},
            // High patience but still needs to move on
            { conditions: { patience: '>0.7' }, responses: [
                "I've given you some space to think, but we should probably continue our conversation.",
                "When you're ready, I'd love to hear what you're thinking.",
                "I'm happy to wait, but at some point we should continue our discussion.",
                "No pressure, but did you have any thoughts to share?"
            ]},
            // Default
            { conditions: {}, responses: [
                "Should we continue?",
                "Any thoughts to share?",
                "Ready to continue?",
                "Let's move forward."
            ]}
        ]
    };
    
    // Select the appropriate response set based on personality traits
    const responseSet = responseTemplates[responseType] || responseTemplates['check_silence'];
    
    // Find matching condition set
    let matchedResponses = null;
    
    for (const template of responseSet) {
        let isMatch = true;
        
        // Check each condition
        for (const [trait, range] of Object.entries(template.conditions)) {
            if (!persona[trait]) continue; // Skip if trait doesn't exist
            
            const traitValue = persona[trait];
            
            if (range.startsWith('<') && traitValue >= parseFloat(range.substring(1))) {
                isMatch = false;
                break;
            } else if (range.startsWith('>') && traitValue <= parseFloat(range.substring(1))) {
                isMatch = false;
                break;
            } else if (range.includes('-')) {
                const [min, max] = range.split('-').map(parseFloat);
                if (traitValue < min || traitValue > max) {
                    isMatch = false;
                    break;
                }
            }
        }
        
        if (isMatch) {
            matchedResponses = template.responses;
            break;
        }
    }
    
    // Use default if no match found
    if (!matchedResponses) {
        matchedResponses = responseSet[responseSet.length - 1].responses;
    }
    
    // Select random response from the matched set
    return matchedResponses[Math.floor(Math.random() * matchedResponses.length)];
}

// Function to exit thinking mode
function exitThinkingMode() {
    if (!isThinkingMode) return;
    
    isThinkingMode = false;
    frustrationLevel = 0;
    
    const conversationOrb = document.getElementById('conversationOrb');
    
    if (conversationOrb) {
        conversationOrb.classList.remove('thinking-mode');
    }
    
    // Update status
    updateConversationStatus('Listening...');
    
    // Add subtle notification
    showNotification('Thinking mode deactivated.');
    
    // Clear any thinking timeouts
    if (thinkingModeTimeout) {
        clearTimeout(thinkingModeTimeout);
        thinkingModeTimeout = null;
    }
    
    if (impatientCheckTimeout) {
        clearTimeout(impatientCheckTimeout);
        impatientCheckTimeout = null;
    }
    
    // When exiting thinking mode, send the accumulated transcript if there is any
    if (pendingText.trim().length > 0) {
        sendAccumulatedTranscript();
    }
}

// Function to show a temporary notification
function showNotification(message) {
    // Check if notification element exists, create if not
    let notificationEl = document.getElementById('voice-notification');
    if (!notificationEl) {
        notificationEl = document.createElement('div');
        notificationEl.id = 'voice-notification';
        notificationEl.className = 'voice-notification';
        document.body.appendChild(notificationEl);
        
        // Add CSS for notification
        document.head.insertAdjacentHTML('beforeend', `
        <style>
        .voice-notification {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(99, 102, 241, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }
        
        .voice-notification.visible {
            opacity: 1;
        }
        
        .thinking-mode {
            background-color: #818cf8 !important;
            animation: thinking-pulse 2s infinite ease-in-out !important;
        }
        
        @keyframes thinking-pulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.7); }
            50% { transform: scale(1.03); box-shadow: 0 0 10px 5px rgba(129, 140, 248, 0.5); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(129, 140, 248, 0.7); }
        }
        </style>
        `);
    }
    
    // Set message and show notification
    notificationEl.textContent = message;
    notificationEl.classList.add('visible');
    
    // Hide after 3 seconds
    setTimeout(() => {
        notificationEl.classList.remove('visible');
    }, 3000);
}
