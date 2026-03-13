/**
 * MomentCoachingPanel.tsx
 * Interactive coaching panel for deep-diving on a specific moment
 */

import React, { useState, useEffect, useRef } from 'react';
import { KeyMoment, MomentClassification } from './MomentExtractor';
import ReactMarkdown from 'react-markdown';
import { Send, MessageSquare, X } from 'lucide-react';

interface MomentCoachingPanelProps {
  moment: KeyMoment | null;
  callDuration: number;
  onClose?: () => void;
  allMoments?: KeyMoment[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

interface ChatMessage {
  role: 'coach' | 'user';
  content: string;
}

interface CoachingBrief {
  // For wins
  whyItWorked?: string;
  
  // For losses - mechanical explanation
  whyItDidntWork?: string;       // Mechanics of why the response failed
  
  // Legacy fields for backwards compatibility
  strategicAnalysis?: string;
  alternativeApproach?: string;
  openingQuestion?: string;
}

const getClassificationLabel = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return 'Best Moment';
    case 'strong_move': return 'Strong Move';
    case 'turning_point': return 'Turning Point';
    case 'missed_opportunity': return 'Missed Opportunity';
    case 'mistake': return 'Mistake';
    case 'blunder': return 'Blunder';
  }
};

const getClassificationDotColor = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return '#10b981'; // emerald-500
    case 'strong_move': return '#4ade80'; // green-400
    case 'turning_point': return '#3b82f6'; // blue-500
    case 'missed_opportunity': return '#fbbf24'; // amber-400
    case 'mistake': return '#fb923c'; // orange-400
    case 'blunder': return '#ef4444'; // red-500
  }
};

export const MomentCoachingPanel: React.FC<MomentCoachingPanelProps> = ({ 
  moment, 
  callDuration, 
  onClose, 
  allMoments, 
  currentIndex, 
  onNavigate 
}) => {
  const [coachingBrief, setCoachingBrief] = useState<CoachingBrief | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const briefCacheRef = useRef<Map<string, CoachingBrief>>(new Map());
  
  useEffect(() => {
    if (moment) {
      setChatMessages([]);
      
      // Check cache first
      const cached = briefCacheRef.current.get(moment.id);
      if (cached) {
        console.log('📦 Using cached coaching brief for moment:', moment.id);
        setCoachingBrief(cached);
        setChatMessages([{
          role: 'coach',
          content: cached.openingQuestion
        }]);
      } else {
        setCoachingBrief(null);
        generateCoachingBrief(moment);
      }
    }
  }, [moment?.id]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  
  const generateCoachingBrief = async (moment: KeyMoment) => {
    setIsLoading(true);
    
    try {
      const prompt = `You are a strategic sales coach analyzing a pivotal call moment. Be direct, grounded, and specific. No generic advice.

THE MOMENT:
Turn ${moment.turnNumber} - Marcus said: "${moment.marcusResponse}"
You responded: "${moment.userMessage}"

CONTEXT:
- ${moment.whatChanged}
- Marcus's state: Trust ${moment.marcusState.trust}, Curiosity ${moment.marcusState.curiosity}, Urgency ${moment.marcusState.urgency}
- Moment type: ${moment.classification}

${['strong_move', 'best_moment', 'turning_point'].includes(moment.classification) ? `This was a WIN. Explain what MECHANICALLY made this work:

TONE: Strategic coach who sees the board position. Use "you" naturally. Focus on the specific mechanics that made this land.

FORMAT RULES - CRITICAL FOR READABILITY:
- Start with 1 sentence on what you did right
- Use markdown headers (###) for each section
- Use bullet points (-) for breakdown items
- Add blank lines (\\n\\n) between sections
- Use **bold** for key concepts

Structure your response like this:

### What You Did
Brief explanation of the strategic move (what you addressed and how)

### Why It Landed
- Specific reason tied to Marcus's state
- Timing element (if relevant)
- Language/approach that worked

### The Key Mechanic
- The underlying principle that made this effective
- How it moved Marcus's state in the right direction

Example output:
{
  "whyItWorked": "You addressed Marcus's **skepticism** by making it concrete instead of abstract.\\n\\n### What You Did\\nYou shifted from talking about personalization as a feature to showing how it works in practice. Instead of defending the concept, you offered a relatable scenario he could visualize.\\n\\n### Why It Landed\\n- Marcus was at moderate trust/curiosity - ready to engage but needed substance\\n- The word \\\"actual\\\" signaled you're grounded, not pitching fluff\\n- You moved from generic to personalized, matching his need for clarity\\n\\n### The Key Mechanic\\nWhen a buyer expresses doubt at moderate trust, **concrete examples** build credibility faster than feature explanations. You gave him something he could mentally test, which moved his curiosity up and reduced resistance."
}

Now generate YOUR coaching based on the actual moment above.` : `Explain what MECHANICALLY would work here instead:

TONE: Solution-focused mechanical coaching. Explain the mismatch briefly, then focus on what approach would land based on Marcus's state and timing.

FORMAT RULES - CRITICAL FOR READABILITY:
- Start with 1 sentence on the core issue
- Use markdown headers (###) for each section
- Use bullet points (-) for breakdown items
- Add blank lines (\\n\\n) between sections
- Use **bold** for key concepts

Structure your response like this:

### The Core Issue
Brief explanation of the mechanical mismatch (what Marcus needed vs what you gave)

### What Would Work Here
- Specific approach that matches his state
- Why this approach works mechanically
- Example language or technique

### The Key Mechanic
- The underlying principle that makes the working approach effective
- How it addresses Marcus's actual need at this point in the call

Example output:
{
  "whyItDidntWork": "Marcus needed **concrete proof**, but you gave him a **discovery question**.\\n\\n### The Core Issue\\nHe'd already signaled the blocker (\\\"unproven for teams\\\"), but your response tried to reopen discovery instead of addressing it. At moderate trust/curiosity, he's willing to engage but needs substance, not another question.\\n\\n### What Would Work Here\\n- **Accept and pivot**: \\\"Fair point - we're early with teams. Let me send you a brief overview and you decide if it's worth revisiting.\\\"\\n- **Get clarity**: \\\"Got it. Was the main blocker the lack of proof, or is timing just not right?\\\"\\n- This works because it **acknowledges his concern** rather than sidestepping it\\n\\n### The Key Mechanic\\nWhen a buyer signals a blocker at moderate trust, **addressing it directly** shows you're listening. Discovery questions work earlier in the call; at this stage, he needs you to either provide what he asked for or gracefully close the loop."
}

Now generate YOUR coaching based on the actual moment above.`}

STYLE RULES:
- Strategic and grounded in Marcus's state and call dynamics
- Short paragraphs (1-3 sentences)
- Use "you" not "the rep"
- **Bold** key strategic concepts
- > blockquotes for exact alternative responses
- NO generic sales advice - ground everything in THIS moment
- NO motivational fluff - be direct about what worked or didn't`;

      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a sales coach. Output only valid JSON. CRITICAL: When providing alternative responses in markdown, you MUST use the > character (blockquote syntax) at the start of each alternative line. Example: > "Alternative response here". Do NOT just use plain quotes.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      });
      
      if (!response.ok) throw new Error('Failed to generate coaching brief');
      
      const data = await response.json();
      let content = data.choices[0].message.content;
      
      console.log('🤖 Raw LLM output:', content);
      
      // Extract JSON from markdown code fences if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      
      // Remove any leading/trailing whitespace
      content = content.trim();
      
      // Sanitize JSON: replace unescaped newlines and control characters
      // This handles cases where LLM didn't properly escape them
      let brief;
      try {
        brief = JSON.parse(content);
        console.log('✅ Successfully parsed coaching brief');
      } catch (parseError) {
        console.warn('⚠️ Initial JSON parse failed, attempting sanitization...', parseError);
        // Fix common JSON issues: escape newlines, tabs, and other control characters
        content = content
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        
        brief = JSON.parse(content);
        console.log('✅ Successfully parsed coaching brief after sanitization');
      }
      
      // Post-process markdown to fix common LLM formatting issues
      const fixMarkdown = (text: string): string => {
        if (!text) return text;
        
        // Fix standalone quoted lines - add > character for blockquote syntax
        // Pattern: lines that start with " but don't have > before them
        let fixed = text.replace(/\n"([^"]+)"/g, '\n\n> "$1"');
        
        // Also fix if it's at the start of the text
        if (fixed.startsWith('"') && !fixed.startsWith('> "')) {
          fixed = '> ' + fixed;
        }
        
        console.log('🔧 Fixed markdown formatting');
        return fixed;
      };
      
      // Apply markdown fixes to the coaching content
      if (brief.whyItWorked) {
        brief.whyItWorked = fixMarkdown(brief.whyItWorked);
      }
      if (brief.alternativeApproach) {
        brief.alternativeApproach = fixMarkdown(brief.alternativeApproach);
      }
      
      // Cache the brief
      briefCacheRef.current.set(moment.id, brief);
      console.log('💾 Cached coaching brief for moment:', moment.id);
      
      setCoachingBrief(brief);
      
      // Only set initial chat message for losses (wins don't have chat)
      if (!['strong_move', 'best_moment', 'turning_point'].includes(moment.classification)) {
        // For losses, start with practice prompt
        const practicePrompt = `Try rewriting your response to address Marcus's concern more directly.\n\nMarcus: "${moment.marcusResponse}"`;
        
        setChatMessages([{
          role: 'coach',
          content: practicePrompt
        }]);
      } else {
        // Wins don't have chat
        setChatMessages([]);
      }
      
    } catch (error) {
      console.error('Error generating coaching brief:', error);
      setCoachingBrief({
        alternativeApproach: 'Unable to generate coaching brief. Please try again.',
        openingQuestion: 'What questions do you have about this moment?'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!userInput.trim() || !moment) return;
    
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userInput.trim()
    };
    
    setChatMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);
    
    try {
      const conversationHistory = [...chatMessages, newUserMessage].map(msg => ({
        role: msg.role === 'coach' ? 'assistant' : 'user',
        content: msg.content
      }));
      
      // User is submitting an alternative response - evaluate it and simulate Marcus
      const systemPrompt = `You are a sales coach evaluating a rewrite of the user's response.

ORIGINAL EXCHANGE:
Marcus said: "${moment.marcusResponse}"
User originally said: "${moment.userMessage}"

MARCUS'S STATE:
Trust: ${moment.marcusState.trust} | Curiosity: ${moment.marcusState.curiosity} | Urgency: ${moment.marcusState.urgency}

CONTEXT: ${moment.whatChanged}

The user just submitted a REWRITE. Your job:
1. Briefly evaluate it (1-2 sentences on what's better/worse)
2. Simulate how Marcus would likely respond based on his state and the moment dynamics

Format:
**Evaluation:** [your assessment]

**Marcus likely responds:** "[simulated Marcus response]"

Be grounded and specific. If the rewrite is weak, say so directly. If it's stronger, explain why based on Marcus's state.`;

      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });
      
      if (!response.ok) throw new Error('Failed to get coaching response');
      
      const data = await response.json();
      const coachResponse = data.choices?.[0]?.message?.content || 'Sorry, I encountered an error. Please try again.';
      
      setChatMessages(prev => [...prev, {
        role: 'coach',
        content: coachResponse
      }]);
      
    } catch (error) {
      console.error('Error in coaching chat:', error);
      setChatMessages(prev => [...prev, {
        role: 'coach',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const summarizeContext = (exchanges: Array<{speaker: string; text: string}>): string => {
    if (exchanges.length === 0) return '';
    
    const topics: string[] = [];
    exchanges.forEach(ex => {
      const text = ex.text.toLowerCase();
      if (text.includes('price') || text.includes('cost')) topics.push('pricing');
      else if (text.includes('time') || text.includes('when')) topics.push('timing');
      else if (text.includes('how') || text.includes('work')) topics.push('process');
      else if (text.includes('proof') || text.includes('evidence')) topics.push('proof');
      else if (text.includes('trust') || text.includes('believe')) topics.push('trust');
    });
    
    const uniqueTopics = [...new Set(topics)];
    if (uniqueTopics.length > 0) {
      return `Discussing ${uniqueTopics.join(', ')}`;
    }
    
    return exchanges[0].speaker === 'user' 
      ? 'You were asking questions'
      : 'Marcus was responding to your questions';
  };
  
  const calculateCallProgress = (timestamp: number, callDuration: number): number => {
    return Math.min(100, (timestamp / callDuration) * 100);
  };
  
  if (!moment) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a moment to begin coaching
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Coaching Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 border-b border-white/10">
        {/* Marcus's State */}
        <div className="flex gap-3 text-xs mb-6">
          <div className="flex-1 bg-white/5 rounded-lg p-2">
            <div className="text-gray-500 mb-1">Trust</div>
            <div className="text-white font-medium capitalize">{moment.marcusState.trust}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-lg p-2">
            <div className="text-gray-500 mb-1">Curiosity</div>
            <div className="text-white font-medium capitalize">{moment.marcusState.curiosity}</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-lg p-2">
            <div className="text-gray-500 mb-1">Urgency</div>
            <div className="text-white font-medium capitalize">{moment.marcusState.urgency}</div>
          </div>
        </div>
        
        {/* Why This Worked - For strong moves and best moments (GREEN) */}
        {coachingBrief && coachingBrief.whyItWorked && ['strong_move', 'best_moment'].includes(moment.classification) && (
          <div className="mb-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
              <h3 className="text-green-400 font-bold text-base uppercase tracking-wide">Why This Worked</h3>
            </div>
            <div className="text-white text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className="text-green-300 font-bold text-xs uppercase tracking-wide mt-6 mb-3 first:mt-0" {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                  li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className="text-green-400 mt-0.5">•</span><span className="flex-1">{props.children}</span></li>,
                  strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                }}
              >{coachingBrief.whyItWorked}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* Why This Worked - For turning points (BLUE) */}
        {coachingBrief && coachingBrief.whyItWorked && moment.classification === 'turning_point' && (
          <div className="mb-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">↻</div>
              <h3 className="text-blue-400 font-bold text-base uppercase tracking-wide">Why This Worked</h3>
            </div>
            <div className="text-white text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className="text-blue-300 font-bold text-xs uppercase tracking-wide mt-6 mb-3 first:mt-0" {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                  li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className="text-blue-400 mt-0.5">•</span><span className="flex-1">{props.children}</span></li>,
                  strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                }}
              >{coachingBrief.whyItWorked}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* Why This Didn't Work - For mistakes/missed opportunities */}
        {coachingBrief && coachingBrief.whyItDidntWork && (
          <div className="mb-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-2 border-orange-500/30 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold">!</div>
              <h3 className="text-orange-400 font-bold text-base uppercase tracking-wide">Why This Didn't Work</h3>
            </div>
            <div className="text-white text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h3: ({node, ...props}) => <h3 className="text-orange-300 font-bold text-xs uppercase tracking-wide mt-6 mb-3 first:mt-0" {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="my-2 space-y-1 list-none pl-0" {...props} />,
                  li: ({node, ...props}) => <li className="flex items-start gap-2" {...props}><span className="text-orange-400 mt-0.5">•</span><span className="flex-1">{props.children}</span></li>,
                  strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                }}
              >{coachingBrief.whyItDidntWork}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {/* Legacy fallback for old format */}
        {coachingBrief && coachingBrief.alternativeApproach && !coachingBrief.strategicAnalysis && (
          <div className="mb-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
              <h3 className="text-blue-400 font-bold text-base uppercase tracking-wide">Better Response</h3>
            </div>
            <div className="text-white text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{coachingBrief.alternativeApproach}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      
      {/* Practice Button - Only for losses */}
      {!['strong_move', 'best_moment', 'turning_point'].includes(moment.classification) && (
        <div className="px-6 pb-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-full py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-400 font-medium transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} />
            Practice This Moment
          </button>
        </div>
      )}
      
      {/* Practice Chat Sidebar */}
      {!['strong_move', 'best_moment', 'turning_point'].includes(moment.classification) && isSidebarOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[#1a1a1a] border-l border-white/10 shadow-2xl z-50 flex flex-col animate-slide-in">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-400" />
              <h3 className="text-white font-bold text-sm uppercase tracking-wide">Practice This Moment</h3>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`
                    rounded-xl p-4 text-sm leading-relaxed max-w-[85%]
                    ${msg.role === 'coach' 
                      ? 'bg-white/5 text-gray-300' 
                      : 'bg-blue-500/20 text-white'
                    }
                  `}
                >
                  {msg.role === 'coach' ? (
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p className="mb-4 leading-relaxed last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="my-4 space-y-2 list-disc list-inside" {...props} />,
                        ol: ({node, ...props}) => <ol className="my-4 space-y-2 list-decimal list-inside" {...props} />,
                        li: ({node, ...props}) => <li className="ml-2" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="my-4 pl-4 border-l-2 border-white/30 italic text-gray-400" {...props} />,
                      }}
                    >{msg.content}</ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-500">
                  Coach is typing...
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                placeholder="Type your alternative response..."
                disabled={isLoading}
                className="
                  flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2
                  text-white placeholder-gray-500 text-sm
                  focus:outline-none focus:border-white/30
                  disabled:opacity-50
                "
              />
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isLoading}
                className="
                  bg-blue-500 hover:bg-blue-600
                  disabled:bg-gray-600 disabled:cursor-not-allowed
                  text-white rounded-lg px-4 py-2 transition-colors
                  flex items-center gap-2
                "
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MomentCoachingPanel;
