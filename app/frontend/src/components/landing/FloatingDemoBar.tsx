import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// import { NovaSonicInterface } from '../voice/NovaSonicInterface'; // Removed - using Deepgram Voice Agent only

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

    // Healthcare/Medical
    if (productLower.includes('healthcare') || productLower.includes('medical') || 
        productLower.includes('hospital') || productLower.includes('clinic') ||
        productLower.includes('patient') || productLower.includes('emr') || productLower.includes('ehr')) {
      return {
        context: "Chief Medical Officer emergency meeting! They're dealing with a patient safety crisis from their current system...",
        prospectMessage: "I'll be direct with you - we just had a near-miss incident where our current system failed to flag a critical drug interaction. The patient is fine, but it could have been fatal. Our medical staff is losing confidence in the technology, nurses are going back to paper charts for safety, and the board is demanding answers. The vendor keeps saying it's a 'configuration issue' and that we need more training. I can't risk patient safety on another system that might have gaps. How do you guarantee this won't put our patients at risk?",
        coachingPrompt: "The prospect is a CMO dealing with a patient safety crisis. Their current system failed to flag a critical drug interaction, staff is reverting to paper charts, and the vendor is blaming configuration. Patient safety is the ultimate concern. The user's response was: '{userResponse}'. Did they address patient safety as the top priority and provide concrete safety guarantees, or did they just pitch features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey mentioned a **near-fatal drug interaction** and **patient safety crisis**. This isn't about features - it's about life and death.\n\n**Lead with patient safety guarantees.**",
        learningPoint: "## 🎯 Key Learning\n\n**In healthcare, patient safety trumps everything.** Address safety concerns with concrete guarantees before discussing any other benefits.",
        technique: {
          name: "Safety-First Approach",
          description: "In healthcare sales, always lead with patient safety guarantees and risk mitigation before discussing features or benefits.",
          example: "Patient safety is absolutely our top priority, and I completely understand your concern after that near-miss. Let me show you our safety protocols: we have FDA validation for drug interaction checking, real-time clinical decision support, and we provide safety guarantees with liability coverage. Before we discuss any features, can I show you our safety validation process and connect you with another CMO who went through a similar situation?"
        },
        excellentResponseExample: "Patient safety is absolutely our top priority, and I completely understand your concern after that near-miss incident. That's exactly why we built our system with multiple safety layers: FDA validation for drug interaction checking, real-time clinical decision support, and we provide safety guarantees with liability coverage. More importantly, we'll conduct a full safety audit of your current gaps before implementation. Can I show you our safety validation process and connect you with another CMO who went through a similar transition without any safety incidents?"
      };
    }

    // Real Estate
    if (productLower.includes('real estate') || productLower.includes('property') || 
        productLower.includes('mls') || productLower.includes('realtor') ||
        productLower.includes('listing') || productLower.includes('rental')) {
      return {
        context: "Brokerage owner crisis meeting! They're losing top agents to competitors with better technology...",
        prospectMessage: "I'm going to be honest - I'm desperate. I've lost three of my top producers this quarter to competing brokerages that have better technology. My agents are complaining that our current system is slow, the mobile app crashes during showings, and they're losing deals because they can't access property information quickly. The last tech vendor promised 'cutting-edge tools' but delivered a system that's actually worse than what we had before. My remaining agents are threatening to leave, and I can't afford to lose any more revenue. How do I know your system won't drive away the rest of my team?",
        coachingPrompt: "The prospect is a brokerage owner in crisis - lost 3 top producers due to bad technology, current system crashes during showings, agents threatening to leave, previous vendor delivered worse system than before. They're desperate but scared of another failure. The user's response was: '{userResponse}'. Did they address the agent retention crisis and provide proof of agent satisfaction, or did they just pitch technology features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey're **losing top producers** and agents are **threatening to leave**. This is about agent retention and revenue survival, not technology features.\n\n**Focus on agent satisfaction and retention.**",
        learningPoint: "## 🎯 Key Learning\n\n**In real estate, agent satisfaction directly impacts brokerage survival.** Address retention concerns with agent testimonials and satisfaction guarantees.",
        technique: {
          name: "Agent Retention Focus",
          description: "When brokerages are losing agents due to technology issues, focus on agent satisfaction metrics and retention guarantees.",
          example: "I completely understand the panic of losing top producers - that's a revenue crisis. Let me show you our agent satisfaction scores: 94% of agents report increased productivity, and we have a 98% agent retention rate post-implementation. More importantly, we offer a satisfaction guarantee - if your agents aren't happy within 60 days, we'll make it right or you don't pay. Can I connect you with three brokers who were in similar situations and how we helped them retain and attract top talent?"
        },
        excellentResponseExample: "I completely understand the panic of losing top producers - that's a revenue crisis that threatens your entire business. Let me show you our agent satisfaction scores: 94% of agents report increased productivity, and we have a 98% agent retention rate post-implementation. More importantly, we offer a satisfaction guarantee - if your agents aren't happy within 60 days, we'll make it right or you don't pay. Can I connect you with three brokers who were in similar situations and how we helped them not only retain agents but actually attract top talent from competitors?"
      };
    }

    // Legal Services
    if (productLower.includes('legal') || productLower.includes('law') || 
        productLower.includes('attorney') || productLower.includes('lawyer') ||
        productLower.includes('court') || productLower.includes('litigation')) {
      return {
        context: "Managing Partner emergency meeting! They're facing a malpractice risk from document management failures...",
        prospectMessage: "We have a serious problem. Last month, we nearly missed a statute of limitations deadline because our document management system failed to properly track case dates. We caught it at the last minute, but it could have been a malpractice claim worth millions. Our malpractice insurance carrier is now requiring us to upgrade our systems or face higher premiums. The IT vendor we used last year promised 'bulletproof document security' but we've had three data breaches and compliance violations. I can't risk another system that might expose us to liability. How do you guarantee this won't create legal exposure for our firm?",
        coachingPrompt: "The prospect is a Managing Partner facing malpractice risk from system failures. They nearly missed a statute of limitations deadline, had 3 data breaches, and insurance carrier is demanding upgrades. Legal liability and compliance are paramount concerns. The user's response was: '{userResponse}'. Did they address legal liability and compliance guarantees, or did they just discuss document management features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey mentioned **malpractice risk** and **millions in liability**. This isn't about document management - it's about legal exposure and professional survival.\n\n**Lead with liability protection and compliance guarantees.**",
        learningPoint: "## 🎯 Key Learning\n\n**In legal services, liability protection is everything.** Address malpractice risk and compliance first, features second.",
        technique: {
          name: "Liability Protection First",
          description: "When selling to law firms, always lead with liability protection, compliance guarantees, and malpractice risk mitigation.",
          example: "Malpractice risk is absolutely unacceptable, and I understand your concern after that close call. We provide comprehensive liability protection: automated deadline tracking with multiple alerts, bank-level security with compliance guarantees, and we carry professional liability insurance that covers our clients. Before discussing features, let me show you our compliance certifications and connect you with another managing partner who eliminated their malpractice risk using our system."
        },
        excellentResponseExample: "Malpractice risk is absolutely unacceptable, and I understand your concern after that close call with the statute of limitations. We provide comprehensive liability protection: automated deadline tracking with multiple alerts, bank-level security with compliance guarantees, and we carry professional liability insurance that covers our clients. More importantly, we'll conduct a full risk audit of your current processes and provide a written compliance guarantee. Can I show you our malpractice prevention protocols and connect you with another managing partner who eliminated their risk exposure?"
      };
    }

    // Manufacturing/Industrial
    if (productLower.includes('manufacturing') || productLower.includes('factory') || 
        productLower.includes('industrial') || productLower.includes('production') ||
        productLower.includes('supply chain') || productLower.includes('inventory')) {
      return {
        context: "Plant Manager crisis call! They're dealing with production downtime costing millions...",
        prospectMessage: "We're hemorrhaging money. Our current system went down for 8 hours last week, costing us $2.3 million in lost production and delayed shipments. Our biggest customer is threatening to find alternative suppliers if we can't guarantee reliability. The previous vendor assured us their system had '99.9% uptime' but we've had six major outages this year. My operations team is working around the clock to manually track everything, which is creating safety risks and quality issues. I can't afford another system that might fail during peak production. How do you guarantee this won't shut down our operations?",
        coachingPrompt: "The prospect is a Plant Manager dealing with production downtime crisis - $2.3M lost from 8-hour outage, customer threatening to leave, 6 major outages this year, manual tracking creating safety risks. Operational reliability is critical. The user's response was: '{userResponse}'. Did they address uptime guarantees and operational reliability, or did they just pitch system features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey lost **$2.3 million** from downtime and have **safety risks** from manual processes. This is about operational survival, not system features.\n\n**Lead with uptime guarantees and reliability.**",
        learningPoint: "## 🎯 Key Learning\n\n**In manufacturing, downtime equals lost revenue and safety risks.** Address uptime guarantees and operational reliability first.",
        technique: {
          name: "Uptime Guarantee Focus",
          description: "When selling to manufacturers, lead with uptime guarantees, redundancy systems, and operational reliability metrics.",
          example: "Production downtime is unacceptable when you're losing millions per hour. We guarantee 99.95% uptime with financial penalties if we don't meet it. We have redundant systems, 24/7 monitoring, and instant failover capabilities. More importantly, we'll provide a backup plan during implementation so you never have operational risk. Can I show you our uptime track record and connect you with another plant manager who eliminated their downtime issues?"
        },
        excellentResponseExample: "Production downtime is absolutely unacceptable when you're losing millions per hour. We guarantee 99.95% uptime with financial penalties if we don't meet it - we actually pay you for any downtime we cause. We have redundant systems, 24/7 monitoring, and instant failover capabilities. More importantly, we'll provide a complete backup plan during implementation so you never have operational risk. Can I show you our uptime track record and connect you with another plant manager who went from 6 outages per year to zero?"
      };
    }

    // Education/Schools
    if (productLower.includes('education') || productLower.includes('school') || 
        productLower.includes('university') || productLower.includes('student') ||
        productLower.includes('learning') || productLower.includes('academic')) {
      return {
        context: "Superintendent emergency meeting! They're facing parent backlash over student data privacy breaches...",
        prospectMessage: "We're in crisis mode. Our current student information system was hacked last month, exposing personal data of 15,000 students and families. Parents are furious, the school board is demanding answers, and we're facing potential lawsuits. The vendor claimed their system was 'FERPA compliant' but clearly the security wasn't adequate. Teachers are afraid to use any technology now, and we're back to paper records for sensitive information. I can't implement another system that might expose our students to privacy risks. How do you guarantee student data will be protected?",
        coachingPrompt: "The prospect is a Superintendent dealing with a student data breach crisis - 15,000 students exposed, parent backlash, potential lawsuits, teachers refusing to use technology. Student privacy and FERPA compliance are critical. The user's response was: '{userResponse}'. Did they address student privacy protection and FERPA compliance guarantees, or did they just discuss system features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey exposed **15,000 students' data** and are facing **lawsuits**. This is about student privacy protection, not system capabilities.\n\n**Lead with privacy guarantees and FERPA compliance.**",
        learningPoint: "## 🎯 Key Learning\n\n**In education, student privacy is sacred.** Address data protection and FERPA compliance before discussing any other features.",
        technique: {
          name: "Privacy Protection First",
          description: "When selling to schools, always lead with student privacy protection, FERPA compliance, and data security guarantees.",
          example: "Student privacy is absolutely sacred, and I understand your crisis after that data breach. We provide comprehensive privacy protection: end-to-end encryption, FERPA certification, and we carry cyber liability insurance that covers our school clients. Before discussing any features, let me show you our security protocols and connect you with another superintendent who strengthened their privacy protection after a similar incident."
        },
        excellentResponseExample: "Student privacy is absolutely sacred, and I understand the crisis you're facing after that data breach. We provide comprehensive privacy protection: end-to-end encryption, FERPA certification, and we carry cyber liability insurance that covers our school clients. More importantly, we'll conduct a full security audit and provide written privacy guarantees. Can I show you our security protocols and connect you with another superintendent who went from a data breach to becoming a model for student privacy protection?"
      };
    }

    // Nonprofit/Charity
    if (productLower.includes('nonprofit') || productLower.includes('charity') || 
        productLower.includes('donation') || productLower.includes('fundraising') ||
        productLower.includes('volunteer') || productLower.includes('foundation')) {
      return {
        context: "Executive Director funding crisis! They're facing donor fatigue and declining donations...",
        prospectMessage: "We're in a funding crisis. Donations are down 40% this year, our major donors are giving less due to 'economic uncertainty,' and our current donor management system is so outdated that we're losing track of donor relationships. We just lost a $500K grant because we missed the application deadline - our system didn't send the reminder alerts. Our development team is spending more time fighting the technology than cultivating donors. The board is questioning every expense, and I can't justify spending money on another system that might not work. How do you guarantee this will actually help us raise more money?",
        coachingPrompt: "The prospect is an Executive Director in funding crisis - 40% donation decrease, lost $500K grant due to system failure, donor relationship tracking problems, board scrutinizing expenses. ROI and fundraising effectiveness are critical. The user's response was: '{userResponse}'. Did they focus on fundraising ROI and donor relationship improvement, or did they just pitch nonprofit software features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey lost a **$500K grant** due to system failure and donations are **down 40%**. This is about fundraising survival, not software features.\n\n**Focus on fundraising ROI and donor relationship improvement.**",
        learningPoint: "## 🎯 Key Learning\n\n**In nonprofits, every dollar spent must directly impact fundraising success.** Address donation increase and donor retention first.",
        technique: {
          name: "Mission Impact Focus",
          description: "When selling to nonprofits, focus on how the solution directly impacts their mission through improved fundraising and donor relationships.",
          example: "Losing major donors and grants threatens your entire mission. Let me show you how we've helped similar nonprofits increase donations by 25% through better donor relationship management and automated grant tracking. We also offer nonprofit pricing and ROI guarantees - if you don't see increased donations within 12 months, we'll refund your investment. Can I show you a case study of another nonprofit that turned around their funding crisis?"
        },
        excellentResponseExample: "Losing major donors and grants absolutely threatens your entire mission and the people you serve. Let me show you how we've helped similar nonprofits increase donations by 25% through better donor relationship management, automated grant tracking, and donor retention programs. More importantly, we offer nonprofit pricing and ROI guarantees - if you don't see increased donations within 12 months, we'll refund your investment. Can I show you a case study of another nonprofit that went from a funding crisis to record-breaking fundraising?"
      };
    }

    // Government/Public Sector
    if (productLower.includes('government') || productLower.includes('public sector') || 
        productLower.includes('municipal') || productLower.includes('federal') ||
        productLower.includes('state') || productLower.includes('city')) {
      return {
        context: "City Manager transparency crisis! They're facing public backlash over service delivery failures...",
        prospectMessage: "We're under intense public scrutiny. Our current system failed during the last snowstorm, leaving residents without updates on road clearing for 12 hours. The mayor is getting angry calls, city council meetings are packed with frustrated citizens, and local media is questioning our competence. Our previous vendor promised 'government-grade reliability' but the system crashes whenever we need it most. Citizens are demanding transparency and real-time updates, but our current technology makes us look incompetent. I can't implement another system that might fail during a crisis and make us look even worse. How do you guarantee this won't embarrass us publicly?",
        coachingPrompt: "The prospect is a City Manager facing public accountability crisis - system failed during emergency, angry citizens, media scrutiny, mayor pressure. Public trust and transparency are critical. The user's response was: '{userResponse}'. Did they address public accountability and crisis reliability, or did they just pitch government software features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey faced **public embarrassment** during a crisis and have **angry citizens** demanding accountability. This is about public trust, not software features.\n\n**Focus on crisis reliability and public transparency.**",
        learningPoint: "## 🎯 Key Learning\n\n**In government, system failures become public embarrassments.** Address crisis reliability and public accountability first.",
        technique: {
          name: "Public Accountability Focus",
          description: "When selling to government, focus on public accountability, crisis reliability, and transparency that builds citizen trust.",
          example: "Public embarrassment during a crisis can end political careers and damage citizen trust. We guarantee 99.9% uptime during emergencies with redundant systems and real-time citizen communication tools. We also provide crisis support and public communication assistance. Can I show you how we helped another city maintain public trust during their last major emergency?"
        },
        excellentResponseExample: "Public embarrassment during a crisis can absolutely end political careers and permanently damage citizen trust. We guarantee 99.9% uptime during emergencies with redundant systems, real-time citizen communication tools, and automated public updates. More importantly, we provide crisis support and public communication assistance to maintain transparency. Can I show you how we helped another city not only maintain public trust during their last major emergency but actually increase citizen satisfaction scores?"
      };
    }

    // Energy/Utilities
    if (productLower.includes('energy') || productLower.includes('utility') || 
        productLower.includes('power') || productLower.includes('electric') ||
        productLower.includes('gas') || productLower.includes('water')) {
      return {
        context: "Utility Operations Director crisis! They're facing regulatory fines for service reliability failures...",
        prospectMessage: "We're facing a regulatory nightmare. The state utility commission just fined us $15 million for excessive service outages, and we're under investigation for grid reliability violations. Our current monitoring system failed to predict three major outages this summer, leaving 200,000 customers without power for hours. Customers are demanding rate reductions, politicians are calling for investigations, and our shareholders are furious about the fines. The previous vendor promised 'smart grid capabilities' but we're more reactive than ever. I can't risk another system that might cause more outages and regulatory violations. How do you guarantee this won't create more reliability problems?",
        coachingPrompt: "The prospect is a Utility Operations Director facing regulatory crisis - $15M fine for outages, 200K customers affected, political pressure, shareholder anger. Grid reliability and regulatory compliance are critical. The user's response was: '{userResponse}'. Did they address regulatory compliance and grid reliability, or did they just pitch utility software features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey were fined **$15 million** for outages affecting **200,000 customers**. This is about regulatory survival and public safety.\n\n**Focus on grid reliability and regulatory compliance.**",
        learningPoint: "## 🎯 Key Learning\n\n**In utilities, reliability failures affect public safety and trigger massive fines.** Address regulatory compliance first.",
        technique: {
          name: "Reliability Assurance",
          description: "When selling to utilities, focus on grid reliability, regulatory compliance, and public safety guarantees.",
          example: "Regulatory fines and service outages affect both public safety and your financial survival. We guarantee improved grid reliability with predictive analytics that prevent outages before they happen. We also provide regulatory compliance support and liability protection. Can I show you how we helped another utility eliminate their regulatory violations and improve customer satisfaction?"
        },
        excellentResponseExample: "Regulatory fines and service outages absolutely affect both public safety and your financial survival. We guarantee improved grid reliability with predictive analytics that prevent outages before they happen, automated regulatory reporting, and compliance monitoring. More importantly, we provide regulatory compliance support and liability protection for any system-related issues. Can I show you how we helped another utility go from regulatory violations to becoming a model for grid reliability?"
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

    // E-commerce/Retail
    if (productLower.includes('ecommerce') || productLower.includes('e-commerce') || 
        productLower.includes('retail') || productLower.includes('online store') ||
        productLower.includes('shopping') || productLower.includes('commerce')) {
      return {
        context: "E-commerce Director panic mode! They're losing millions during peak season due to website crashes...",
        prospectMessage: "We're in full crisis mode. Our website crashed three times during Black Friday weekend, costing us an estimated $4.2 million in lost sales. Customers are leaving negative reviews about our 'unreliable' platform, and our conversion rate has dropped 30% since the crashes. The previous e-commerce vendor promised their platform could 'handle any traffic spike' but it failed spectacularly when we needed it most. Peak holiday season is coming again, and I can't afford another disaster. How do you guarantee your platform won't crash when we need it most?",
        coachingPrompt: "The prospect is an E-commerce Director dealing with website crash crisis - $4.2M lost during Black Friday, 30% conversion drop, negative customer reviews, another peak season approaching. Platform reliability during high traffic is critical. The user's response was: '{userResponse}'. Did they address traffic handling and uptime guarantees during peak periods, or did they just pitch e-commerce features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey lost **$4.2 million** during peak sales period and have **another holiday season coming**. This is about revenue survival during critical periods.\n\n**Focus on traffic handling and peak season reliability.**",
        learningPoint: "## 🎯 Key Learning\n\n**In e-commerce, platform reliability during peak traffic directly impacts revenue.** Address high-traffic performance first.",
        technique: {
          name: "Peak Performance Guarantee",
          description: "When selling to e-commerce, focus on traffic handling capabilities and uptime guarantees during peak sales periods.",
          example: "Revenue loss during peak season is devastating, and I understand your panic about the upcoming holidays. We guarantee 99.99% uptime during peak traffic with auto-scaling that handles 10x traffic spikes. We also provide revenue protection - if our platform causes lost sales, we compensate you. Can I show you our Black Friday performance data and connect you with another e-commerce director who went from crashes to record-breaking sales?"
        },
        excellentResponseExample: "Revenue loss during peak season is absolutely devastating, and I understand your panic about the upcoming holidays. We guarantee 99.99% uptime during peak traffic with auto-scaling that handles 10x traffic spikes. More importantly, we provide revenue protection - if our platform causes lost sales during peak periods, we compensate you for the revenue loss. Can I show you our Black Friday performance data and connect you with another e-commerce director who went from crashes to record-breaking sales?"
      };
    }

    // Insurance
    if (productLower.includes('insurance') || productLower.includes('claims') || 
        productLower.includes('underwriting') || productLower.includes('policy') ||
        productLower.includes('actuarial') || productLower.includes('risk')) {
      return {
        context: "Insurance CEO regulatory meeting! They're facing massive fines for claims processing delays...",
        prospectMessage: "We're facing a regulatory nightmare. The state insurance commissioner just fined us $8.5 million for delayed claims processing, and we're under investigation for potential bad faith practices. Our current system is so slow that we're missing regulatory deadlines for claim responses, and customers are filing complaints daily. The previous vendor promised 'streamlined claims processing' but we're actually slower than before implementation. Our agents are manually tracking everything to avoid more violations, which is creating errors and more delays. I can't risk another system that might make our compliance problems worse. How do you guarantee this won't create more regulatory issues?",
        coachingPrompt: "The prospect is an Insurance CEO facing regulatory crisis - $8.5M fine for delayed claims, bad faith investigation, missing regulatory deadlines, customer complaints. Regulatory compliance and claims speed are critical. The user's response was: '{userResponse}'. Did they address regulatory compliance and claims processing speed guarantees, or did they just pitch insurance features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey were fined **$8.5 million** for regulatory violations and are under **bad faith investigation**. This is about regulatory survival, not system features.\n\n**Lead with compliance guarantees and regulatory protection.**",
        learningPoint: "## 🎯 Key Learning\n\n**In insurance, regulatory compliance is everything.** Address compliance guarantees and claims processing speed before features.",
        technique: {
          name: "Regulatory Compliance First",
          description: "When selling to insurance companies, always lead with regulatory compliance guarantees and claims processing speed metrics.",
          example: "Regulatory fines and bad faith investigations are company-threatening issues. We guarantee compliance with all state regulations and provide automated tracking for regulatory deadlines. We also carry errors and omissions insurance that covers our clients. Before discussing features, let me show you our compliance track record and connect you with another CEO who eliminated their regulatory risks."
        },
        excellentResponseExample: "Regulatory fines and bad faith investigations are absolutely company-threatening issues. We guarantee compliance with all state regulations, provide automated tracking for regulatory deadlines, and carry errors and omissions insurance that covers our clients. More importantly, we'll conduct a full compliance audit and provide written regulatory guarantees. Can I show you our compliance track record and connect you with another CEO who went from regulatory violations to becoming a compliance model?"
      };
    }

    // Nonprofit/Charity
    if (productLower.includes('nonprofit') || productLower.includes('charity') || 
        productLower.includes('donation') || productLower.includes('fundraising') ||
        productLower.includes('volunteer') || productLower.includes('foundation')) {
      return {
        context: "Executive Director funding crisis! They're facing donor fatigue and declining donations...",
        prospectMessage: "We're in a funding crisis. Donations are down 40% this year, our major donors are giving less due to 'economic uncertainty,' and our current donor management system is so outdated that we're losing track of donor relationships. We just lost a $500K grant because we missed the application deadline - our system didn't send the reminder alerts. Our development team is spending more time fighting the technology than cultivating donors. The board is questioning every expense, and I can't justify spending money on another system that might not work. How do you guarantee this will actually help us raise more money?",
        coachingPrompt: "The prospect is an Executive Director in funding crisis - 40% donation decrease, lost $500K grant due to system failure, donor relationship tracking problems, board scrutinizing expenses. ROI and fundraising effectiveness are critical. The user's response was: '{userResponse}'. Did they focus on fundraising ROI and donor relationship improvement, or did they just pitch nonprofit software features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey lost a **$500K grant** due to system failure and donations are **down 40%**. This is about fundraising survival, not software features.\n\n**Focus on fundraising ROI and donor relationship improvement.**",
        learningPoint: "## 🎯 Key Learning\n\n**In nonprofits, every dollar spent must directly impact fundraising success.** Address donation increase and donor retention first.",
        technique: {
          name: "Mission Impact Focus",
          description: "When selling to nonprofits, focus on how the solution directly impacts their mission through improved fundraising and donor relationships.",
          example: "Losing major donors and grants threatens your entire mission. Let me show you how we've helped similar nonprofits increase donations by 25% through better donor relationship management and automated grant tracking. We also offer nonprofit pricing and ROI guarantees - if you don't see increased donations within 12 months, we'll refund your investment. Can I show you a case study of another nonprofit that turned around their funding crisis?"
        },
        excellentResponseExample: "Losing major donors and grants absolutely threatens your entire mission and the people you serve. Let me show you how we've helped similar nonprofits increase donations by 25% through better donor relationship management, automated grant tracking, and donor retention programs. More importantly, we offer nonprofit pricing and ROI guarantees - if you don't see increased donations within 12 months, we'll refund your investment. Can I show you a case study of another nonprofit that went from a funding crisis to record-breaking fundraising?"
      };
    }

    // Transportation/Logistics
    if (productLower.includes('transportation') || productLower.includes('logistics') || 
        productLower.includes('shipping') || productLower.includes('freight') ||
        productLower.includes('delivery') || productLower.includes('fleet')) {
      return {
        context: "Logistics Director crisis call! They're losing major clients due to delivery tracking failures...",
        prospectMessage: "We're hemorrhaging clients. Our biggest customer just terminated a $12 million annual contract because our tracking system failed to provide accurate delivery updates, and they missed critical shipments to their customers. Three other major clients are threatening to leave if we can't guarantee reliable tracking and on-time delivery. Our current system shows packages as 'delivered' when they're still in transit, and drivers are spending hours on the phone explaining delays instead of making deliveries. The previous vendor promised 'real-time visibility' but we're more blind than ever. I can't afford to lose any more clients. How do you guarantee accurate tracking and delivery performance?",
        coachingPrompt: "The prospect is a Logistics Director losing clients - lost $12M contract due to tracking failures, 3 more clients threatening to leave, inaccurate delivery status, drivers wasting time on calls. Tracking accuracy and delivery performance are critical. The user's response was: '{userResponse}'. Did they address tracking accuracy and delivery performance guarantees, or did they just pitch logistics features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey lost a **$12 million contract** due to tracking failures and have **3 more clients threatening to leave**. This is about client retention and delivery accuracy.\n\n**Focus on tracking accuracy and delivery performance guarantees.**",
        learningPoint: "## 🎯 Key Learning\n\n**In logistics, tracking accuracy directly impacts client retention.** Address delivery performance and tracking reliability first.",
        technique: {
          name: "Delivery Performance Guarantee",
          description: "When selling to logistics companies, focus on tracking accuracy, delivery performance metrics, and client retention guarantees.",
          example: "Losing major clients due to tracking failures is devastating for a logistics business. We guarantee 99.5% tracking accuracy with real-time GPS updates and automated customer notifications. We also provide client retention support - if our system causes delivery issues that lose clients, we help with client recovery efforts. Can I show you our tracking accuracy data and connect you with another logistics director who improved their client retention?"
        },
        excellentResponseExample: "Losing major clients due to tracking failures is absolutely devastating for a logistics business. We guarantee 99.5% tracking accuracy with real-time GPS updates, automated customer notifications, and delivery performance monitoring. More importantly, we provide client retention support - if our system causes delivery issues that lose clients, we help with client recovery efforts and performance improvement plans. Can I show you our tracking accuracy data and connect you with another logistics director who went from losing clients to winning new business?"
      };
    }

    // Energy/Utilities
    if (productLower.includes('energy') || productLower.includes('utility') || 
        productLower.includes('power') || productLower.includes('electric') ||
        productLower.includes('gas') || productLower.includes('water')) {
      return {
        context: "Utility Operations Director crisis! They're facing regulatory fines for service reliability failures...",
        prospectMessage: "We're facing a regulatory nightmare. The state utility commission just fined us $15 million for excessive service outages, and we're under investigation for grid reliability violations. Our current monitoring system failed to predict three major outages this summer, leaving 200,000 customers without power for hours. Customers are demanding rate reductions, politicians are calling for investigations, and our shareholders are furious about the fines. The previous vendor promised 'smart grid capabilities' but we're more reactive than ever. I can't risk another system that might cause more outages and regulatory violations. How do you guarantee this won't create more reliability problems?",
        coachingPrompt: "The prospect is a Utility Operations Director facing regulatory crisis - $15M fine for outages, 200K customers affected, political pressure, shareholder anger. Grid reliability and regulatory compliance are critical. The user's response was: '{userResponse}'. Did they address regulatory compliance and grid reliability, or did they just pitch utility software features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey were fined **$15 million** for outages affecting **200,000 customers**. This is about regulatory survival and public safety.\n\n**Focus on grid reliability and regulatory compliance.**",
        learningPoint: "## 🎯 Key Learning\n\n**In utilities, reliability failures affect public safety and trigger massive fines.** Address regulatory compliance first.",
        technique: {
          name: "Reliability Assurance",
          description: "When selling to utilities, focus on grid reliability, regulatory compliance, and public safety guarantees.",
          example: "Regulatory fines and service outages affect both public safety and your financial survival. We guarantee improved grid reliability with predictive analytics that prevent outages before they happen. We also provide regulatory compliance support and liability protection. Can I show you how we helped another utility eliminate their regulatory violations and improve customer satisfaction?"
        },
        excellentResponseExample: "Regulatory fines and service outages absolutely affect both public safety and your financial survival. We guarantee improved grid reliability with predictive analytics that prevent outages before they happen, automated regulatory reporting, and compliance monitoring. More importantly, we provide regulatory compliance support and liability protection for any system-related issues. Can I show you how we helped another utility go from regulatory violations to becoming a model for grid reliability?"
      };
    }

    // Food Service/Restaurant
    if (productLower.includes('restaurant') || productLower.includes('food service') || 
        productLower.includes('kitchen') || productLower.includes('menu') ||
        productLower.includes('dining') || productLower.includes('hospitality')) {
      return {
        context: "Restaurant Owner survival meeting! They're losing customers due to order management failures...",
        prospectMessage: "I'm desperate. Our current POS system crashed during our busiest dinner service last Saturday, and we had to turn away 200+ customers because we couldn't process orders or payments. The kitchen was in chaos, servers were writing orders on napkins, and customers were walking out furious. We've lost half our weekend reservations since then because word spread on social media about the disaster. The previous vendor promised their system was 'restaurant-tested' but it clearly can't handle our volume. With razor-thin margins, I can't afford another system failure that drives away customers. How do you guarantee this won't destroy my business during a busy service?",
        coachingPrompt: "The prospect is a Restaurant Owner in crisis - POS crashed during peak service, turned away 200+ customers, lost weekend reservations, social media backlash, razor-thin margins. System reliability during peak service is critical for survival. The user's response was: '{userResponse}'. Did they address peak service reliability and customer retention, or did they just pitch POS features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey **turned away 200+ customers** and lost weekend reservations due to system failure. This is about business survival during peak service.\n\n**Focus on peak service reliability and customer experience.**",
        learningPoint: "## 🎯 Key Learning\n\n**In restaurants, system failures during peak service can destroy the business.** Address service reliability and customer experience first.",
        technique: {
          name: "Peak Service Reliability",
          description: "When selling to restaurants, focus on system reliability during peak service times and customer experience protection.",
          example: "System failures during peak service can destroy a restaurant's reputation overnight. We guarantee 99.9% uptime during service hours with instant backup systems. We also provide customer experience protection - if our system causes service disruptions, we help with customer recovery efforts. Can I show you our peak service performance data and connect you with another restaurant owner who eliminated their service disruptions?"
        },
        excellentResponseExample: "System failures during peak service can absolutely destroy a restaurant's reputation overnight. We guarantee 99.9% uptime during service hours with instant backup systems and offline mode capabilities. More importantly, we provide customer experience protection - if our system causes service disruptions, we help with customer recovery efforts and reputation management. Can I show you our peak service performance data and connect you with another restaurant owner who went from service disasters to smooth operations?"
      };
    }

    // Construction/Architecture
    if (productLower.includes('construction') || productLower.includes('architecture') || 
        productLower.includes('building') || productLower.includes('contractor') ||
        productLower.includes('project management') || productLower.includes('engineering')) {
      return {
        context: "General Contractor emergency meeting! They're facing project delays costing millions in penalties...",
        prospectMessage: "We're in serious trouble. Our current project management system failed to track critical path dependencies, and now we're 6 weeks behind on a $50 million hospital project. The delay penalties are $100,000 per day, and we've already lost $4.2 million. The client is threatening to terminate our contract and hire another contractor to finish the job. Our project managers are back to using Excel and whiteboards because they don't trust the system, which is creating more coordination failures. I can't afford another software implementation that might delay projects further. How do you guarantee this won't cause more project delays?",
        coachingPrompt: "The prospect is a General Contractor facing project delay crisis - 6 weeks behind on $50M project, $100K daily penalties, $4.2M lost, client threatening termination, team using Excel. Project timeline accuracy is critical. The user's response was: '{userResponse}'. Did they address project timeline guarantees and delay prevention, or did they just pitch project management features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey're losing **$100,000 per day** in penalties and facing **contract termination**. This is about project survival and timeline accuracy.\n\n**Focus on timeline guarantees and delay prevention.**",
        learningPoint: "## 🎯 Key Learning\n\n**In construction, delays equal massive financial penalties and contract loss.** Address timeline accuracy and delay prevention first.",
        technique: {
          name: "Timeline Accuracy Guarantee",
          description: "When selling to construction companies, focus on project timeline accuracy, delay prevention, and penalty protection.",
          example: "Project delays with those kinds of penalties can bankrupt a contractor. We guarantee accurate timeline tracking with early warning systems for potential delays. We also provide delay prevention consulting and penalty protection - if our system causes project delays, we help cover the penalties. Can I show you our timeline accuracy data and connect you with another general contractor who eliminated their delay issues?"
        },
        excellentResponseExample: "Project delays with those kinds of penalties can absolutely bankrupt a contractor. We guarantee accurate timeline tracking with early warning systems for potential delays and critical path monitoring. More importantly, we provide delay prevention consulting and penalty protection - if our system causes project delays, we help cover the associated penalties. Can I show you our timeline accuracy data and connect you with another general contractor who went from chronic delays to finishing projects early?"
      };
    }

    // Automotive/Dealership
    if (productLower.includes('automotive') || productLower.includes('dealership') || 
        productLower.includes('car dealer') || productLower.includes('auto') ||
        productLower.includes('vehicle') || productLower.includes('showroom')) {
      return {
        context: "Dealership General Manager crisis! They're losing sales due to inventory management failures...",
        prospectMessage: "We're bleeding money. Our inventory management system showed we had 12 Honda Accords in stock when a customer wanted to buy one, but when we went to the lot, we had zero. The customer walked out and bought from our competitor across the street. This happens daily - we're promising cars we don't have and disappointing customers who never come back. Our sales team has lost trust in the system and spends half their time physically checking the lot instead of selling. Last month we lost $300K in sales because of inventory discrepancies. The manufacturer is threatening to reduce our allocation if we can't get our act together. How do you guarantee your system won't show phantom inventory?",
        coachingPrompt: "The prospect is a Dealership GM facing inventory crisis - promising cars they don't have, customers walking out, $300K lost sales, manufacturer threatening allocation reduction, sales team wasting time checking lots. Inventory accuracy is critical for sales and relationships. The user's response was: '{userResponse}'. Did they address inventory accuracy and sales recovery, or did they just pitch dealership software features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey lost **$300K in sales** due to phantom inventory and the **manufacturer is threatening** their allocation. This is about sales survival and relationships.\n\n**Focus on inventory accuracy and sales recovery.**",
        learningPoint: "## 🎯 Key Learning\n\n**In automotive, inventory accuracy directly impacts sales and manufacturer relationships.** Address accuracy guarantees first.",
        technique: {
          name: "Accuracy Assurance",
          description: "When selling to dealerships, focus on inventory accuracy, sales recovery, and manufacturer relationship protection.",
          example: "Phantom inventory kills sales and damages manufacturer relationships. We guarantee 99.8% inventory accuracy with real-time lot tracking and automated reconciliation. We also provide sales recovery support - if our system causes lost sales due to inventory errors, we help with customer follow-up and compensation. Can I show you our accuracy data and connect you with another GM who eliminated their inventory discrepancies?"
        },
        excellentResponseExample: "Phantom inventory absolutely kills sales and damages critical manufacturer relationships. We guarantee 99.8% inventory accuracy with real-time lot tracking, automated reconciliation, and instant alerts for discrepancies. More importantly, we provide sales recovery support - if our system causes lost sales due to inventory errors, we help with customer follow-up and compensation programs. Can I show you our accuracy data and connect you with another GM who went from inventory chaos to record sales months?"
      };
    }

    // Media/Publishing
    if (productLower.includes('media') || productLower.includes('publishing') || 
        productLower.includes('newspaper') || productLower.includes('magazine') ||
        productLower.includes('content') || productLower.includes('editorial')) {
      return {
        context: "Publisher emergency meeting! They're facing advertiser exodus due to content management failures...",
        prospectMessage: "We're in a full-scale crisis. Our content management system crashed during our biggest advertising campaign launch, and we couldn't update our website for 6 hours. Three major advertisers pulled their campaigns because their ads weren't displaying properly, costing us $400K in lost revenue. Our editorial team is back to emailing Word documents because they don't trust the system, which is creating version control nightmares and missed deadlines. Readers are complaining about broken links and outdated content. The previous vendor promised 'media-grade reliability' but we've had more downtime than a startup blog. How do you guarantee this won't kill what's left of our advertising revenue?",
        coachingPrompt: "The prospect is a Publisher in crisis - system crashed during major campaign, lost $400K from advertiser pullouts, 6-hour website downtime, editorial team using email, broken links, missed deadlines. Content reliability and advertiser confidence are critical. The user's response was: '{userResponse}'. Did they address content reliability and advertiser retention, or did they just pitch publishing features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey lost **$400K from advertisers** due to system failure and have **editorial chaos**. This is about revenue survival and content reliability.\n\n**Focus on uptime guarantees and advertiser confidence.**",
        learningPoint: "## 🎯 Key Learning\n\n**In media, content failures directly impact advertiser confidence and revenue.** Address reliability and advertiser retention first.",
        technique: {
          name: "Content Reliability Assurance",
          description: "When selling to publishers, focus on content reliability, advertiser confidence, and revenue protection.",
          example: "Content failures destroy advertiser confidence and kill revenue. We guarantee 99.95% uptime with instant failover and content backup systems. We also provide advertiser confidence protection - if our system causes campaign failures, we help with advertiser retention and compensation. Can I show you our uptime data and connect you with another publisher who rebuilt advertiser trust after similar issues?"
        },
        excellentResponseExample: "Content failures absolutely destroy advertiser confidence and kill revenue streams. We guarantee 99.95% uptime with instant failover, content backup systems, and real-time monitoring. More importantly, we provide advertiser confidence protection - if our system causes campaign failures, we help with advertiser retention, compensation programs, and trust rebuilding. Can I show you our uptime data and connect you with another publisher who went from advertiser exodus to record advertising revenue?"
      };
    }

    // Telecommunications
    if (productLower.includes('telecom') || productLower.includes('telecommunications') || 
        productLower.includes('phone') || productLower.includes('wireless') ||
        productLower.includes('network') || productLower.includes('cellular')) {
      return {
        context: "Telecom Operations Director emergency! They're facing massive customer churn due to service outages...",
        prospectMessage: "We're hemorrhaging customers. Our network monitoring system failed to detect a critical outage that left 50,000 customers without service for 8 hours. By the time we realized what happened, social media was exploding with angry customers threatening to switch carriers. We've lost 12,000 customers this month alone, and our customer service team is overwhelmed with complaints and cancellation requests. The regulatory commission is investigating us for service reliability violations. Our previous vendor promised 'carrier-grade monitoring' but we're more blind to network issues than ever. I can't afford another system that might miss critical outages. How do you guarantee we'll catch problems before customers do?",
        coachingPrompt: "The prospect is a Telecom Operations Director facing customer exodus - 50K customers lost service for 8 hours, 12K customers left, social media backlash, regulatory investigation, overwhelmed customer service. Network reliability and customer retention are critical. The user's response was: '{userResponse}'. Did they address network monitoring and customer retention, or did they just pitch telecom features?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey lost **12,000 customers** due to an 8-hour outage and face **regulatory investigation**. This is about customer retention and network reliability.\n\n**Focus on proactive monitoring and customer retention.**",
        learningPoint: "## 🎯 Key Learning\n\n**In telecom, network failures directly cause customer churn and regulatory issues.** Address proactive monitoring first.",
        technique: {
          name: "Proactive Network Assurance",
          description: "When selling to telecom, focus on proactive network monitoring, customer retention, and regulatory compliance.",
          example: "Network outages cause immediate customer churn and regulatory problems. We guarantee proactive monitoring that detects issues before customers experience them, with automated alerts and instant response protocols. We also provide customer retention support during outages. Can I show you our detection speed data and connect you with another operations director who eliminated their customer churn from outages?"
        },
        excellentResponseExample: "Network outages absolutely cause immediate customer churn and regulatory problems. We guarantee proactive monitoring that detects issues before customers experience them, with automated alerts, instant response protocols, and predictive failure analysis. More importantly, we provide customer retention support during outages and regulatory compliance assistance. Can I show you our detection speed data and connect you with another operations director who went from massive churn to industry-leading customer satisfaction?"
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
                    <h3 className="text-white font-semibold">AI Sales Coach</h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="bg-white/20 text-white border-transparent">Demo</Badge>
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
                <div className="flex-1 p-6 flex items-center justify-center">
                  <div className="w-full grid grid-cols-3 gap-4">
                    {/* Card 1 */}
                    <Card className="bg-gray-50 border-gray-200 shadow-md">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <span>Icon 1</span>
                          <span className="text-sm font-medium">Card One</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-600">
                          Brief description for the first feature card.
                        </p>
                      </CardContent>
                    </Card>
                    {/* Card 2 */}
                    <Card className="bg-gray-50 border-gray-200 shadow-md">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <span>Icon 2</span>
                          <span className="text-sm font-medium">Card Two</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-600">
                          Brief description for the second feature card.
                        </p>
                      </CardContent>
                    </Card>
                    {/* Card 3 */}
                    <Card className="bg-gray-50 border-gray-200 shadow-md">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <span>Icon 3</span>
                          <span className="text-sm font-medium">Card Three</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-gray-600">
                          Brief description for the third feature card.
                            </p>
                      </CardContent>
                    </Card>
                        </div>
                      </div>
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