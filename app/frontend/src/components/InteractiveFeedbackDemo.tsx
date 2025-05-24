import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, BarChart, Smile } from 'lucide-react';

// Placeholder feedback data
const feedbackStates = {
  start: { title: "Feedback Appears Here", icon: null, content: "Scroll down to see feedback based on the conversation." },
  painPoint: { title: "Pain Point Analysis", icon: <Lightbulb className="h-5 w-5 text-yellow-500" />, content: "You effectively identified and emphasized the customer's headache. Great job digging into their challenges!" },
  toneCheck: { title: "Tone Check", icon: <Smile className="h-5 w-5 text-blue-500" />, content: "Your tone remained positive and confident throughout the initial objection handling. Keep it up!" },
  metrics: { title: "Key Metrics", icon: <BarChart className="h-5 w-5 text-green-500" />, content: "Pacing: 140 WPM (Good). Filler words: 3 (Low). Talk/Listen Ratio: 60/40." },
  suggestion: { title: "Suggestion", icon: <Lightbulb className="h-5 w-5 text-yellow-500" />, content: "When they mentioned 'budget concerns', consider pivoting to value reinforcement before discussing price tiers." },
};

// Placeholder conversation snippets - Updated to use template literals
const conversationSnippets = [
  { id: 'snippet-1', text: `Sales Rep: "...so our platform integrates directly with your existing CRM, which typically eliminates the double data entry that's been causing headaches for your team."`, feedbackKey: 'painPoint' },
  { id: 'snippet-2', text: `Customer: "That sounds helpful, but the price seems quite high compared to other solutions we've looked at."`, feedbackKey: 'toneCheck' },
  { id: 'snippet-3', text: `Sales Rep: "I understand the budget concerns. Let's revisit the time savings and efficiency gains we discussed earlier – how much is that current headache costing you per week?"`, feedbackKey: 'metrics' },
  { id: 'snippet-4', text: `Customer: "That's a fair point, but justifying the upfront cost is still tricky for us right now."`, feedbackKey: 'suggestion' },
  // Add more snippets as needed
];

const InteractiveFeedbackDemo = () => {
  const [activeFeedback, setActiveFeedback] = useState(feedbackStates.start);
  const snippetRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Use IntersectionObserver for more reliable scroll detection
  useEffect(() => {
    const observerOptions = {
      root: null, // Use the viewport as the root
      rootMargin: '-40% 0px -40% 0px', // Trigger when element is closer to the vertical center
      threshold: 0 // Trigger as soon as any part is visible within the margin
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Find the index of the intersecting element
          const index = snippetRefs.current.findIndex(ref => ref === entry.target);
          if (index !== -1) {
            const feedbackKey = conversationSnippets[index].feedbackKey;
            console.log("Intersecting:", feedbackKey); // Debug log
            setActiveFeedback(feedbackStates[feedbackKey as keyof typeof feedbackStates] || feedbackStates.start);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe each snippet
    snippetRefs.current.forEach(ref => {
      if (ref) {
        observer.observe(ref);
      }
    });

    // Cleanup function
    return () => {
       snippetRefs.current.forEach(ref => {
         if (ref) {
           observer.unobserve(ref);
         }
       });
      observer.disconnect();
    };

  }, []); // Empty dependency array means this runs once on mount


  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Get Actionable Insights, Instantly
        </h2>
        <p className="text-lg md:text-xl text-foreground/80 text-center mb-12 max-w-3xl mx-auto">
          As you navigate the conversation, PitchIQ provides real-time feedback and analysis to guide your performance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column: Scrollable Conversation */}
          <div className="md:col-span-2 space-y-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Example Conversation Flow:</h3>
            {conversationSnippets.map((snippet, index) => (
              <div
                key={snippet.id}
                // Assign ref to the corresponding index
                ref={el => { snippetRefs.current[index] = el; }}
                id={snippet.id} // Add id for potential linking/debugging
                className="p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm min-h-[150px]" // Added min-height
              >
                <p className="text-foreground/90 leading-relaxed">{snippet.text}</p>
              </div>
            ))}
            {/* Add padding at the bottom to ensure the last item can trigger observer */}
            <div className="h-screen/2"></div> {/* Use viewport height fraction */}
          </div>

          {/* Right Column: Sticky Feedback Card */}
          <div className="md:col-span-1 relative">
            <div className="sticky top-24"> {/* Adjust top value as needed */}
              <Card className="shadow-lg transition-all duration-300 ease-in-out"> {/* Added transition */}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {activeFeedback.icon}
                    {activeFeedback.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80">{activeFeedback.content}</p>
                   {/* Potential area for mini-visualizations later */}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveFeedbackDemo; 