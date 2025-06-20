import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { NovaSonicInterface } from '../voice/NovaSonicInterface';

interface FloatingDemoBarProps {
  onDemoSubmit: (product: string) => void;
  onOpenEmailModal?: () => void;
}

interface ChatMessage {
  id: number;
  text: string;
  isAI: boolean;
  isTyping?: boolean;
}

interface DemoScenario {
  context: string;
  prospectMessage: string;
  coachingPrompt: string;
  fallbackCoaching: string;
  learningPoint: string;
  technique?: {
    name: string;
    description: string;
    example: string;
  };
  excellentResponseExample?: string;
}

const FloatingDemoBar: React.FC<FloatingDemoBarProps> = ({ onDemoSubmit, onOpenEmailModal }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [product, setProduct] = useState('');
  const [showCard, setShowCard] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [submittedProduct, setSubmittedProduct] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [demoStep, setDemoStep] = useState(0);
  const [currentScenario, setCurrentScenario] = useState<DemoScenario | null>(null);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [hasSubmittedEmail, setHasSubmittedEmail] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [savedProgress, setSavedProgress] = useState<{
    product: string;
    messages: ChatMessage[];
    step: number;
    scenario: DemoScenario | null;
    voiceMode: boolean;
    emailSubmitted: boolean;
  } | null>(null);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [novaSonicStatus, setNovaSonicStatus] = useState<any>(null);

  // Check Nova Sonic status on component mount
  useEffect(() => {
    const checkNovaSonicStatus = async () => {
      try {
        const response = await fetch('/api/nova-sonic/status');
        if (response.ok) {
          const status = await response.json();
          setNovaSonicStatus(status);
        }
      } catch (error) {
        console.log('Nova Sonic not available:', error);
      }
    };
    
    checkNovaSonicStatus();
  }, []);

  // Handle voice input from Nova Sonic
  const handleVoiceInput = (transcript: string) => {
    if (transcript.trim()) {
      setUserInput(transcript);
      // Auto-submit the voice input
      setTimeout(() => {
        handleUserMessage();
      }, 500);
    }
  };

  // Get demo scenario based on product type
  const getDemoScenario = (productName: string): DemoScenario => {
    const productLower = productName.toLowerCase();
    
    // Art/Creative Services
    if (productLower.includes('art') || productLower.includes('design') || 
        productLower.includes('creative') || productLower.includes('graphic') ||
        productLower.includes('illustration') || productLower.includes('painting')) {
      return {
        context: "Gallery owner meeting! You're pitching commissioned artwork to a boutique hotel chain owner who's been burned by unreliable artists before...",
        prospectMessage: "Your portfolio is impressive, I'll give you that. But I've been down this road before with artists. We commissioned a series for our lobby last year - the artist was three months late, the style wasn't what we discussed, and when we asked for revisions, they got defensive and said it was their 'artistic vision.' I ended up having to hire someone else to finish the project. How do I know you won't leave me hanging when I have a grand opening deadline?",
        coachingPrompt: "The prospect is a hotel owner who had a terrible experience with an unreliable artist. They mentioned specific issues: 3 months late, wrong style, defensive about revisions, and abandoning the project. They're worried about being left hanging with a deadline. The user's response was: '{userResponse}'. Did they address the reliability concerns and project management issues, or did they just talk about their artistic abilities?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey mentioned being **3 months late**, **wrong style**, and **defensive about revisions**. These are project management and communication issues, not artistic talent issues.\n\n**Address their reliability concerns first.**",
        learningPoint: "## 🎯 Key Learning\n\n**When selling creative services,** prospects often worry more about reliability and communication than pure talent. Address the business concerns first.",
        technique: {
          name: "Process Transparency",
          description: "When prospects have been burned by unreliable service providers, show them your specific process and accountability measures.",
          example: "I completely understand your concern - that sounds like a nightmare scenario for any business owner. Let me share exactly how I handle projects to prevent that. I use a detailed project timeline with milestone check-ins, provide style mockups for approval before starting, and build revision rounds into the contract. Can I walk you through my process so you can see how I ensure we stay on track and aligned?"
        },
        excellentResponseExample: "That sounds absolutely frustrating - being left hanging with a grand opening deadline would be my worst nightmare too. I've actually built my entire business process around preventing exactly that scenario. I use detailed contracts with milestone payments, provide style mockups for approval before starting any work, and build revision rounds into the timeline. I also send weekly progress updates with photos. Would it help if I showed you my project management system and connected you with my last three clients so you can hear directly how I handle deadlines and communication?"
      };
    }

    // Fintech/Financial Services
    if (productLower.includes('fintech') || productLower.includes('financial') || 
        productLower.includes('accounting') || productLower.includes('payroll') ||
        productLower.includes('banking') || productLower.includes('payment')) {
      return {
        context: "CFO boardroom meeting! You're presenting to a financial services company that just went through a regulatory audit nightmare...",
        prospectMessage: "Look, your compliance features look comprehensive on paper, but we just survived a regulatory audit that nearly cost us our license. The auditors found gaps in our transaction monitoring that our previous fintech vendor assured us were 'bank-grade secure.' We had to hire external consultants, pay hefty fines, and I spent three months explaining to the board why our 'cutting-edge' system failed basic compliance requirements. Before I even consider another vendor, I need to know: what happens when the regulators come knocking and find issues with your system?",
        coachingPrompt: "The prospect is a CFO who just survived a regulatory audit nightmare. Their previous fintech vendor promised 'bank-grade security' but failed basic compliance, resulting in fines, external consultants, and board explanations. They're asking about regulatory accountability. The user's response was: '{userResponse}'. Did they address the regulatory risk and vendor accountability concerns, or did they just make more compliance promises?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey just told you they **nearly lost their license** because a vendor made compliance promises that failed! Making more promises won't work.\n\n**Address vendor accountability and regulatory risk-sharing.**",
        learningPoint: "## 🎯 Key Learning\n\n**In regulated industries,** prospects need to know what happens when things go wrong, not just promises that they won't.",
        technique: {
          name: "Risk Partnership",
          description: "When prospects have regulatory concerns, show how you share the risk and provide accountability, not just promises.",
          example: "That's exactly the kind of scenario that keeps CFOs up at night, and I completely understand your concern. Here's what sets us apart: we provide regulatory liability insurance that covers our clients, we have a dedicated compliance team that works directly with your auditors, and we maintain detailed audit trails that satisfy regulatory requirements. Can I show you our regulatory partnership agreement and connect you with a CFO who went through an audit using our system?"
        },
        excellentResponseExample: "That's exactly the kind of scenario that keeps CFOs up at night, and I completely understand your concern. Here's what sets us apart: we provide regulatory liability insurance that covers our clients, we have a dedicated compliance team that works directly with your auditors, and we maintain detailed audit trails that satisfy regulatory requirements. More importantly, we stand behind our compliance with contractual guarantees - if regulators find gaps in our system, we cover the remediation costs. Can I show you our regulatory partnership agreement and connect you with a CFO who went through an audit using our system?"
      };
    }
    
    // Software/SaaS/Technology  
    if (productLower.includes('software') || productLower.includes('saas') || 
        productLower.includes('platform') || productLower.includes('app') ||
        productLower.includes('crm') || productLower.includes('erp')) {
      return {
        context: "VP of Operations crisis call! They're dealing with a current software disaster and considering replacements...",
        prospectMessage: "I'm going to be brutally honest with you - we're currently in month 4 of what was supposed to be a 6-week implementation with another vendor. Our team is working overtime to maintain our old system while trying to learn the new one, our customers are complaining about delayed responses, and I just had to explain to the CEO why our productivity is down 30%. The vendor keeps saying 'it's normal implementation challenges' and 'trust the process.' I'm starting to think all software companies are the same - overpromise on the demo, underdeliver on reality. Why should I believe you're any different?",
        coachingPrompt: "The prospect is currently living through a software implementation disaster - 4 months vs 6 weeks promised, team working overtime, 30% productivity drop, customer complaints, and a vendor that's dismissive of their concerns. They're expressing deep cynicism about all software vendors. The user's response was: '{userResponse}'. Did they acknowledge the current crisis and differentiate their implementation approach, or did they fall into the same vendor pattern?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey're **currently living through a software nightmare** - 30% productivity drop, customer complaints, team burnout. They don't need another pitch, they need rescue.\n\n**Acknowledge their current crisis first.**",
        learningPoint: "## 🎯 Key Learning\n\n**When prospects are in crisis mode,** they need immediate help and proof of different approach, not another sales pitch.",
        technique: {
          name: "Crisis Intervention",
          description: "When prospects are currently suffering from a vendor failure, focus on immediate help and demonstrable differences in approach.",
          example: "That sounds like an absolute nightmare - 30% productivity drop would have me panicking too. Before we even talk about our platform, can I help you with your current situation? I have some strategies that might help salvage your current implementation or at least minimize the damage. And if you do decide to make a change, I can show you exactly how our implementation process is different - including penalty clauses if we miss our timeline."
        },
        excellentResponseExample: "That sounds like an absolute nightmare - 30% productivity drop and customer complaints would have me in crisis mode too. Before we even talk about our platform, can I help you with your current situation? I have some strategies that might help salvage your current implementation or at least minimize the damage. More importantly, if you do decide to make a change, I can show you exactly how our implementation process is different - including penalty clauses if we miss our timeline and dedicated crisis support. Would it help if I connected you with someone who was in a similar situation and how we handled their transition?"
      };
    }

    // Marketing/Advertising Services
    if (productLower.includes('marketing') || productLower.includes('advertising') || 
        productLower.includes('seo') || productLower.includes('social media') ||
        productLower.includes('digital marketing') || productLower.includes('content')) {
      return {
        context: "Marketing Director under pressure! Their last campaign failed spectacularly and the CEO is questioning the entire marketing budget...",
        prospectMessage: "I'll be straight with you - our last marketing agency promised us a 300% ROI and 'viral-ready content that would transform our brand.' We spent $50K over six months and got a 0.2% engagement rate and three qualified leads. The CEO is now questioning every marketing dollar we spend, and I'm fighting to keep my budget from being slashed. The agency kept showing us 'industry benchmarks' and saying our expectations were unrealistic. I need results I can actually show to the board, not more creative concepts and engagement metrics. How do I know you won't just burn through our budget with pretty campaigns that don't drive revenue?",
        coachingPrompt: "The prospect is a Marketing Director under pressure after a failed campaign - $50K spent for 0.2% engagement and 3 leads, CEO questioning marketing budget, agency blamed 'unrealistic expectations.' They need board-presentable results, not creative concepts. The user's response was: '{userResponse}'. Did they focus on measurable ROI and revenue impact, or did they fall into typical agency language about creativity and engagement?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey just told you they got **3 leads for $50K** and the **CEO is questioning the marketing budget**. They need revenue results, not creative concepts.\n\n**Focus on measurable business impact.**",
        learningPoint: "## 🎯 Key Learning\n\n**When marketing budgets are under scrutiny,** prospects need revenue-focused results they can defend to executives, not engagement metrics.",
        technique: {
          name: "Revenue Accountability",
          description: "When prospects have been burned by agencies focused on vanity metrics, lead with revenue impact and financial accountability.",
          example: "That's exactly why I focus on revenue impact, not engagement rates. I understand you need results you can present to the board. Let me show you how I structure campaigns with clear revenue targets and provide weekly ROI reports. I also offer performance guarantees - if we don't hit our lead generation targets, you don't pay the full fee. Can I walk you through a case study where we turned around a similar situation?"
        },
        excellentResponseExample: "That's exactly why I focus on revenue impact, not engagement rates. I completely understand the pressure you're under with the CEO questioning every marketing dollar. Let me show you how I structure campaigns with clear revenue targets, provide weekly ROI reports with actual pipeline impact, and offer performance guarantees - if we don't hit our lead generation targets, you don't pay the full fee. More importantly, I can show you a case study where we turned around a similar situation and helped the Marketing Director actually increase their budget based on results. Would that be helpful?"
      };
    }

    // Consulting Services
    if (productLower.includes('consulting') || productLower.includes('strategy') || 
        productLower.includes('advisory') || productLower.includes('coach') ||
        productLower.includes('training') || productLower.includes('development')) {
      return {
        context: "CEO strategy session! They've been burned by consultants who created beautiful decks but no real change...",
        prospectMessage: "I've worked with consultants before, and frankly, I'm skeptical. The last firm we hired spent three months interviewing everyone, created a beautiful 200-slide presentation with lots of frameworks and buzzwords, charged us $200K, and then left us with a binder of recommendations that my team couldn't actually implement. Six months later, nothing had changed except our bank account was lighter. They kept saying we needed to 'embrace the transformation journey' when we asked for concrete next steps. I need someone who can actually help us execute, not just diagnose problems we already know we have. How do I know you won't just give me another expensive PowerPoint deck?",
        coachingPrompt: "The prospect is a CEO burned by consultants who created a $200K PowerPoint deck with no implementation support. They mentioned 'beautiful presentation,' 'frameworks and buzzwords,' but 'nothing had changed' after 6 months. They need execution help, not more diagnosis. The user's response was: '{userResponse}'. Did they focus on implementation and concrete results, or did they sound like another consultant with frameworks?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey spent **$200K on a PowerPoint deck** that changed nothing! They need **execution support**, not more analysis and frameworks.\n\n**Focus on implementation and hands-on results.**",
        learningPoint: "## 🎯 Key Learning\n\n**Executives are tired of consultants who diagnose and disappear.** They need partners who stay and help implement real change.",
        technique: {
          name: "Implementation Partnership",
          description: "When prospects have been burned by consultants who don't implement, focus on hands-on execution and measurable outcomes.",
          example: "I completely understand your frustration - that's exactly why I work differently. Instead of creating recommendations and leaving, I stay and help implement them. I work directly with your team, provide hands-on training, and we measure progress weekly with concrete metrics. My fee is tied to actual results achieved, not deliverables created. Can I show you how I helped another CEO implement similar changes and the specific outcomes we achieved?"
        },
        excellentResponseExample: "I completely understand your frustration - that's exactly why I work differently. Instead of creating recommendations and leaving, I stay and help implement them. I work directly with your team, provide hands-on training, and we measure progress weekly with concrete metrics. My fee is tied to actual results achieved, not deliverables created. I also provide a 90-day implementation guarantee - if we don't see measurable progress, I'll continue working at no additional cost until we do. Can I show you how I helped another CEO implement similar changes and the specific outcomes we achieved?"
      };
    }

    // Default scenario for other products - make it more dynamic
    const genericScenarios = [
      {
        context: "Procurement meeting! Your prospect is dealing with budget constraints and vendor fatigue...",
        prospectMessage: `I'll be honest with you - we've been through this evaluation process three times in the past two years. Each time, we get excited about a solution, go through lengthy demos and negotiations, and then either the budget gets cut or the vendor overpromises and underdelivers. Our team is exhausted from change initiatives that don't stick, and frankly, I'm not sure I have the political capital to push through another ${productName} implementation. The last vendor promised it would 'pay for itself in 6 months' - we're still waiting 18 months later. What makes you think this time will be different?`,
        coachingPrompt: "The prospect has been through 3 failed evaluations in 2 years, dealing with budget cuts, vendor overpromises, team exhaustion from failed change initiatives, and loss of political capital. They mentioned a vendor who promised ROI in 6 months but delivered nothing in 18 months. The user's response was: '{userResponse}'. Did they acknowledge the evaluation fatigue and focus on reducing risk, or did they make more promises?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey've been through **3 failed evaluations** and lost **political capital** from failed implementations. They don't need more promises.\n\n**Address their evaluation fatigue and risk concerns.**",
        technique: {
          name: "Risk Mitigation",
          description: "When prospects are exhausted from failed vendor evaluations, focus on reducing their risk and proving value quickly.",
          example: "I completely understand the evaluation fatigue - three failed attempts would exhaust anyone. Instead of another lengthy evaluation, what if we started with a small pilot project that proves value in 30 days? That way you can show concrete results before making any major commitment or spending political capital."
        }
      },
      {
        context: "Department head meeting! They're under pressure to improve results with limited resources...",
        prospectMessage: `Look, I'm interested in ${productName}, but I need to be realistic about our situation. My team is already stretched thin, we're being asked to do more with less, and any new initiative needs to show immediate impact. We tried implementing a new solution last year - it took 4 months to get everyone trained, productivity dipped during the transition, and by the time we saw benefits, leadership had moved on to the next priority. I can't afford another project that disrupts operations without guaranteed results. How do you ensure this won't become another time-consuming distraction?`,
        coachingPrompt: "The prospect is a department head under pressure with a stretched team. They mentioned a previous implementation that took 4 months training, caused productivity dips, and leadership moved on before seeing benefits. They need immediate impact without operational disruption. The user's response was: '{userResponse}'. Did they address the operational disruption concerns and focus on quick wins, or did they ignore the resource constraints?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey're **stretched thin** and can't afford **operational disruption**. They need solutions that work with their constraints, not against them.\n\n**Focus on minimal disruption and quick wins.**",
        technique: {
          name: "Constraint-Based Selling",
          description: "When prospects have resource constraints and operational pressures, design solutions that work within their limitations.",
          example: "I completely understand the resource constraints - disrupting operations isn't an option when you're already stretched thin. What if we implemented this in phases, starting with your biggest pain point, so you see immediate results without overwhelming your team? We can design the rollout around your operational schedule."
        }
      }
    ];

    const randomScenario = genericScenarios[Math.floor(Math.random() * genericScenarios.length)];
    
    return {
      context: randomScenario.context,
      prospectMessage: randomScenario.prospectMessage,
      coachingPrompt: randomScenario.coachingPrompt,
      fallbackCoaching: randomScenario.fallbackCoaching,
      learningPoint: "## 🎯 Key Learning\n\n**Every prospect has been burned before.** Understanding their specific pain points and constraints is more valuable than pitching features.",
      technique: randomScenario.technique,
      excellentResponseExample: "That's exactly the kind of experience that makes anyone cautious about new vendors. I appreciate you sharing that context - it helps me understand what you need to see to feel confident moving forward. Before we even discuss our solution, can you help me understand what specifically went wrong with the previous implementation? I want to make sure we're addressing the root issues, not just adding another layer of complexity."
    };
  };

  // Call AI API for coaching feedback
  const getAICoaching = async (userResponse: string, scenario: DemoScenario): Promise<string> => {
    try {
      setIsAIResponding(true);
      const prompt = `You are an expert sales coach analyzing a salesperson's response to a challenging prospect scenario.

SCENARIO CONTEXT: ${scenario.coachingPrompt.replace('{userResponse}', userResponse)}

USER'S ACTUAL RESPONSE: "${userResponse}"

EXCELLENT BENCHMARK RESPONSE: "${scenario.excellentResponseExample}"

DEEP ANALYSIS REQUIRED:
1. Did they acknowledge the prospect's emotional state and specific pain points?
2. Did they avoid making typical vendor promises or pitches?
3. Did they ask diagnostic questions to understand root causes?
4. Did they differentiate their approach from failed vendors?
5. Did they focus on risk mitigation and proof over promises?

COACHING EVALUATION:
- EXCELLENT (90-100%): Demonstrates advanced sales psychology, addresses emotional core, asks powerful questions, completely avoids vendor traps
- GOOD (70-89%): Shows solid understanding but missed 1-2 key elements or fell into minor vendor patterns  
- NEEDS_WORK (0-69%): Fell into vendor traps, made promises instead of asking questions, ignored emotional context

Provide specific coaching feedback with:
- What they did RIGHT (even if needs work)
- What they MISSED or did wrong
- Specific improvement suggestions
- Example of better phrasing

Format: Use appropriate header (🎉 EXCELLENT / ✅ GOOD EFFORT / ⚠️ NEEDS WORK), **bold** key points, > blockquotes for examples. Keep under 150 words.`;
      
      const response = await fetch('/api/chat/coaching-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          maxTokens: 200
        }),
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();
      return data.response || scenario.fallbackCoaching;
    } catch (error) {
      console.log('AI coaching failed, using fallback:', error);
      return scenario.fallbackCoaching;
    } finally {
      setIsAIResponding(false);
    }
  };

  // Call AI API for retry feedback
  const getRetryFeedback = async (userResponse: string, scenario: DemoScenario): Promise<string> => {
    try {
      setIsAIResponding(true);
      const prompt = `The user is practicing the ${scenario.technique?.name} technique after receiving coaching. 

ORIGINAL SCENARIO: ${scenario.context}
TECHNIQUE BEING PRACTICED: ${scenario.technique?.name} - ${scenario.technique?.description}
USER'S RETRY RESPONSE: "${userResponse}"

Analyze their improvement and provide encouraging feedback focusing on:
- What specific elements of the technique they used correctly
- How their approach was better than typical vendor responses
- What they did right in addressing the prospect's concerns
- Any remaining areas for refinement

Format: Use ## ✅ MUCH BETTER! header, **bold** key improvements, > blockquotes for good phrases they used. Keep encouraging and specific about the improvement. Under 120 words.`;
      
      const response = await fetch('/api/chat/coaching-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          maxTokens: 150
        }),
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();
      return data.response || "## ✅ MUCH BETTER!\n\n**Great improvement!** You focused on understanding their experience rather than pushing features. That's exactly what the **Mirror & Validate** technique is about!";
    } catch (error) {
      console.log('AI retry feedback failed, using fallback:', error);
      return "## ✅ MUCH BETTER!\n\n**Great improvement!** You focused on understanding their experience rather than pushing features. That's exactly what the **Mirror & Validate** technique is about!";
    } finally {
      setIsAIResponding(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      const threshold = windowHeight * 0.15; // Show after 15% scroll
      
      const shouldBeVisible = scrolled > threshold;
      setIsVisible(shouldBeVisible);
      
      // Trigger fade-in animation when first becoming visible
      if (shouldBeVisible && !hasAnimatedIn) {
        setTimeout(() => setHasAnimatedIn(true), 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasAnimatedIn]);

  // Prevent body scroll when demo card is open
  useEffect(() => {
    if (showCard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCard]);

  const saveProgress = () => {
    setSavedProgress({
      product: submittedProduct,
      messages: messages,
      step: demoStep,
      scenario: currentScenario,
      voiceMode: isVoiceMode,
      emailSubmitted: hasSubmittedEmail
    });
  };

  const restoreProgress = () => {
    if (savedProgress) {
      setSubmittedProduct(savedProgress.product);
      setMessages(savedProgress.messages);
      setDemoStep(savedProgress.step);
      setCurrentScenario(savedProgress.scenario);
      setIsVoiceMode(savedProgress.voiceMode);
      setHasSubmittedEmail(savedProgress.emailSubmitted);
      setShowCard(true);
      setIsChatClosed(false);
    }
  };

  const closeChat = () => {
    saveProgress();
    setIsChatClosed(true);
    setShowCard(false);
  };

  const typeMessage = (text: string, isAI: boolean) => {
    return new Promise<void>((resolve) => {
      const messageId = Date.now();
      setMessages(prev => [...prev, { id: messageId, text: '', isAI, isTyping: true }]);
      
      let currentText = '';
      let index = 0;
      
      const typeInterval = setInterval(() => {
        if (index < text.length) {
          currentText += text[index];
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, text: currentText } : msg
          ));
          index++;
        } else {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, isTyping: false } : msg
          ));
          clearInterval(typeInterval);
          resolve();
        }
      }, 10);
    });
  };

  // Add user message instantly without typing animation
  const addUserMessage = (text: string) => {
    const messageId = Date.now();
    setMessages(prev => [...prev, { 
      id: messageId, 
      text: text, 
      isAI: false, 
      isTyping: false 
    }]);
  };

  const startDemo = async (productName: string) => {
    const scenario = getDemoScenario(productName);
    setMessages([]);
    setDemoStep(0);
    
    // Start with AI's first message (intro)
    await new Promise(resolve => setTimeout(resolve, 300));
    await typeMessage(scenario.context, true);
    
    // Wait a bit, then automatically show the second message (conversation starter)
    await new Promise(resolve => setTimeout(resolve, 500));
            // Don't show prospect message as text in voice mode - it will be spoken via ElevenLabs
        if (!isVoiceMode) {
          await typeMessage(scenario.prospectMessage, true);
        }
    setDemoStep(1);
    setCurrentScenario(scenario);
  };

  const handleUserMessage = async () => {
    if (!userInput.trim()) return;
    
    const currentMessage = userInput.trim();
    setUserInput('');
    
    // Add user message instantly (no typing animation for user messages)
    addUserMessage(currentMessage);
    
    // Wait a bit before AI responds
    await new Promise(resolve => setTimeout(resolve, 400));
    
    if (demoStep === 1 && currentScenario) {
      // First user response - get AI coaching
      const coachingResponse = await getAICoaching(currentMessage, currentScenario);
      await typeMessage(coachingResponse, true);
      
      // Check if the response was excellent (contains celebration emojis)
      const isExcellentResponse = coachingResponse.includes('🎉') || 
                                 coachingResponse.toLowerCase().includes('excellent') ||
                                 coachingResponse.toLowerCase().includes('perfect') ||
                                 coachingResponse.toLowerCase().includes('nailed it');
      
      if (isExcellentResponse) {
        // For excellent responses, skip technique teaching and go straight to advanced tips
        await new Promise(resolve => setTimeout(resolve, 800));
        await typeMessage("## 🚀 OUTSTANDING!\n\nYou clearly understand **advanced sales psychology!** You naturally used the right approach without needing coaching. That's the kind of emotional intelligence that separates **top performers** from average salespeople.", true);
        await new Promise(resolve => setTimeout(resolve, 800));
        await typeMessage("## 🎯 Ready for More?\n\n**Ready to master even more advanced techniques like this?** PitchIQ has dozens of scenarios and techniques to help you become a sales superstar!", true);
        setDemoStep(4); // Skip to completion
      } else {
        // For responses that need work, teach the technique
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (currentScenario.technique) {
          const techniqueMessage = `## 🎯 ${currentScenario.technique.name} Technique

${currentScenario.technique.description}

### Here's how you could have responded:

> "${currentScenario.technique.example}"

**Want to try again with this technique?** Type "restart" to practice!

**Want a deeper breakdown of this technique?** Type "deep dive" for advanced analysis!`;
          await typeMessage(techniqueMessage, true);
          setDemoStep(2); // Move to retry phase
        }
      }
    } else if (demoStep === 2 && currentScenario) {
      // Check if they want to restart or deep dive
      if (currentMessage.toLowerCase().includes('restart') || currentMessage.toLowerCase().includes('try again')) {
        await typeMessage("## 🔄 Awesome! Let's Practice More\n\n**To unlock unlimited practice scenarios and advanced coaching,** let's get you signed up first!", true);
        await new Promise(resolve => setTimeout(resolve, 800));
        onDemoSubmit(submittedProduct); // Trigger waitlist signup
        setHasSubmittedEmail(true);
        setDemoStep(4); // Move to completion
      } else if (currentMessage.toLowerCase().includes('deep dive') || currentMessage.toLowerCase().includes('breakdown') || currentMessage.includes('analysis') || currentMessage.includes('more details') || currentMessage.includes('explain more')) {
        await typeMessage("## 🧠 Deep Dive Analysis\n\n**Great choice!** Advanced technique breakdowns, psychology insights, and detailed coaching are available in the full **PitchIQ** experience.", true);
        await new Promise(resolve => setTimeout(resolve, 800));
        await typeMessage("## 🚀 Ready to Master Sales Psychology?\n\nLet's get you access to **dozens of techniques, scenarios, and deep-dive analyses** that will transform your sales conversations!", true);
        await new Promise(resolve => setTimeout(resolve, 500));
        onDemoSubmit(submittedProduct); // Trigger waitlist signup
        setHasSubmittedEmail(true);
        setDemoStep(4); // Move to completion
      } else {
        // Second response - show learning point and wrap up
        await typeMessage(currentScenario.learningPoint, true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await typeMessage("## 🎉 Great Job!\n\nThis is just a taste of what **PitchIQ** can teach you. Ready to improve your sales conversations?", true);
        setDemoStep(4);
      }
    } else if (demoStep === 3 && currentScenario) {
      // Retry attempt - provide encouraging feedback
      const retryFeedback = await getRetryFeedback(currentMessage, currentScenario);
      await typeMessage(retryFeedback, true);
      await new Promise(resolve => setTimeout(resolve, 800));
      await typeMessage("## 🎉 Much Better!\n\nYou can see how using **specific techniques** transforms your conversations. Ready to master more sales skills with **PitchIQ**?", true);
      setDemoStep(4);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim()) return;
    
    setSubmittedProduct(product);
    setIsExpanding(true);
    
    // Trigger expansion animation to show mode selection
    setTimeout(() => {
      setShowModeSelection(true);
      setIsExpanding(false);
    }, 300);
    
    // Don't call onDemoSubmit here - only call it when demo is complete
  };

  const handleModeSelection = (voiceMode: boolean) => {
    setIsVoiceMode(voiceMode);
    setShowModeSelection(false);
    setShowCard(true);
    
    // Generate the scenario for both modes
    const scenario = getDemoScenario(submittedProduct);
    setCurrentScenario(scenario);
    
    if (!voiceMode) {
      // For text mode, start the demo flow with typing animations
      startDemo(submittedProduct);
    }
    // For voice mode, just show the interface with the scenario set
  };

  if (!isVisible) return null;

  return (
    <React.Fragment>
      {/* Background overlay with blur when demo is active */}
      {(showCard || showModeSelection) && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          style={{ backdropFilter: 'blur(8px)' }}
        />
      )}
      
      <div className={`fixed bottom-8 left-0 right-0 z-50 pointer-events-none transition-opacity duration-700 ${hasAnimatedIn ? 'opacity-100' : 'opacity-0'}`}>
        <div className="mx-auto pointer-events-auto">
          {isChatClosed && savedProgress ? (
            // Continue button when chat is closed
            <div className="flex justify-center">
              <button
                onClick={restoreProgress}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-semibold hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
              >
                Continue Demo
              </button>
            </div>
          ) : showModeSelection ? (
            // Mode selection card
            <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">Choose Your Demo Mode</h3>
                    <p className="text-white/90 text-sm">Product: {submittedProduct}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowModeSelection(false);
                      setShowCard(false);
                      setProduct('');
                      setSubmittedProduct('');
                    }}
                    className="ml-2 p-1 hover:bg-red-400/20 rounded-full transition-colors"
                    title="Close modal"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-600 text-center mb-6">
                  How would you like to practice your sales conversation?
                </p>
                
                <div className="space-y-3">
                  {/* Text Mode Option */}
                  <button
                    onClick={() => handleModeSelection(false)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                        <svg className="w-6 h-6 text-blue-600 group-hover:text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-gray-900 group-hover:text-red-600">💬 Text Chat</h4>
                        <p className="text-sm text-gray-600">Type your responses and get instant coaching feedback</p>
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Voice Mode Option */}
                  <button
                    onClick={() => handleModeSelection(true)}
                    disabled={!novaSonicStatus?.available}
                    className={`w-full p-5 border-2 rounded-2xl transition-all duration-200 group ${
                      novaSonicStatus?.available 
                        ? 'border-gray-200 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-lg' 
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                        novaSonicStatus?.available 
                          ? 'bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 group-hover:scale-110' 
                          : 'bg-gray-100'
                      }`}>
                        <svg className={`w-7 h-7 transition-colors ${
                          novaSonicStatus?.available 
                            ? 'text-blue-600 group-hover:text-blue-700' 
                            : 'text-gray-400'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        {/* Voice indicator waves */}
                        {novaSonicStatus?.available && (
                          <div className="absolute -inset-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-full h-full rounded-full border-2 border-blue-300 animate-ping"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`font-bold text-lg transition-colors ${
                            novaSonicStatus?.available 
                              ? 'text-gray-900 group-hover:text-blue-700' 
                              : 'text-gray-500'
                          }`}>
                            🎤 Voice Chat
                          </h4>
                          {novaSonicStatus?.available ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Unavailable
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${
                          novaSonicStatus?.available 
                            ? 'text-gray-600 group-hover:text-gray-700' 
                            : 'text-gray-400'
                        }`}>
                          {novaSonicStatus?.available 
                            ? 'Speak naturally and get real-time AI coaching with voice responses powered by Amazon Nova Sonic' 
                            : 'Voice mode requires AWS Nova Sonic configuration. Using text mode instead.'
                          }
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          novaSonicStatus?.available 
                            ? 'bg-blue-100 group-hover:bg-blue-200' 
                            : 'bg-gray-100'
                        }`}>
                          <svg className={`w-4 h-4 transition-colors ${
                            novaSonicStatus?.available 
                              ? 'text-blue-600 group-hover:text-blue-700' 
                              : 'text-gray-400'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : !showCard ? (
            // Floating input bar
            <div className={`transition-all duration-300 ${isExpanding ? 'transform scale-110 opacity-0' : ''}`}>
              <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
                <form onSubmit={handleSubmit}>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="What are you selling?"
                    className="w-full px-4 py-2 rounded-full bg-white border border-black/20 shadow-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-black/30 transition-all duration-200"
                  />
                </form>
                <div className="text-center mt-1.5">
                  <div className="inline-block px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs text-black font-medium border border-black/10">
                    Press Enter for instant demo • Sign up free
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Demo card
            <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">AI Sales Coach Demo</h3>
                    <p className="text-white/90 text-sm">Product: {submittedProduct}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isAIResponding && (
                      <div className="text-white text-sm">
                        AI thinking...
                      </div>
                    )}
                    <div className="text-white/90 text-sm">
                      {isVoiceMode ? '🎤 Voice Mode' : '💬 Text Mode'}
                    </div>
                    <button
                      onClick={closeChat}
                      className="ml-2 p-1 hover:bg-red-400/20 rounded-full transition-colors"
                      title="Close chat"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="h-[500px] flex flex-col">
                {isVoiceMode && novaSonicStatus?.available ? (
                  <div className="flex flex-col h-full">
                    {/* Single context message at the top */}
                    <div className="px-6 pt-4 pb-2">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                            <span className="text-blue-700 text-sm">🎯</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Sales Training Scenario</p>
                            <p className="text-sm text-blue-800 leading-relaxed">
                              {currentScenario?.context || "Sales call in progress! Your prospect just shared a concern that reveals deeper issues..."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Main voice interface - takes remaining space */}
                    <div className="flex-1 px-6 pb-4">
                      <NovaSonicInterface 
                        onTranscript={handleVoiceInput}
                        isListening={isListening}
                        onListeningChange={setIsListening}
                        scenario={currentScenario}
                        compact={true}
                        hideContext={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto p-6 space-y-4 h-full">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.isAI 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {message.isTyping ? (
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          ) : (
                            <div className="text-sm prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                  li: ({ children }) => <li className="mb-1">{children}</li>,
                                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                  code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                  blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 mb-2">{children}</blockquote>
                                }}
                              >
                                {message.text}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {demoStep > 0 && demoStep < 4 && !isVoiceMode && (
                <div className="border-t border-gray-200 p-4">
                  <form onSubmit={(e) => { e.preventDefault(); handleUserMessage(); }} className="flex space-x-3">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your response..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={isAIResponding}
                    />
                    <button
                      type="submit"
                      disabled={!userInput.trim() || isAIResponding}
                      className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
              
              {demoStep === 4 && (
                <div className="border-t border-gray-200 p-4 text-center">
                  <button
                    onClick={() => {
                      if (onOpenEmailModal) {
                        onOpenEmailModal();
                      } else {
                        // Fallback to original behavior if modal function not provided
                        onDemoSubmit(submittedProduct);
                      }
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-semibold hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105"
                  >
                    Get Early Access
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
};

export default FloatingDemoBar; 