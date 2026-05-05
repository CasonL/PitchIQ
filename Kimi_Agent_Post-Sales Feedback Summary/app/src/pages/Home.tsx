import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "../components/Navbar";
import SummaryScreen from "../components/SummaryScreen";
import TimelineScreen from "../components/TimelineScreen";
import ReviewEndScreen from "../components/ReviewEndScreen";

export type Screen = "summary" | "timeline" | "completion";

export interface MomentData {
  id: number;
  time: string;
  label: string;
  type: "mistake" | "turning" | "win";
  turnLabel: string;
  turnNumber: string;
  youSaid: string;
  prospectSaid: string;
  youAnswer?: string;
  prospectFinal?: string;
  talkRatio: string;
  prospectTone: string;
  sentiment: {
    trust: { value: number; label: string; color: string };
    curiosity: { value: number; label: string; color: string };
    urgency: { value: number; label: string; color: string };
  };
  beforeSentiment: {
    trust: { value: number; label: string };
    curiosity: { value: number; label: string };
    urgency: { value: number; label: string };
  };
  whatWorked: string;
  sharpenThis: string;
  sharpenBold: string;
  quoteTag: string;
  quoteText: string;
  beforeScore: number;
  beforeContext: string;
  afterScore: number;
  afterContext: string;
  quiz: {
    question: string;
    options: { text: string; correct: boolean }[];
    explanation: string;
    howResponse: string;
  };
}

export const MOMENTS: MomentData[] = [
  {
    id: 1,
    time: "0:31",
    label: "Objection",
    type: "mistake",
    turnLabel: "Turn 1",
    turnNumber: "1 / 3",
    youSaid: "Hey, Marcus. It's Kayson from PitchIQ. I noticed that many sales teams struggle to achieve a 15% close rate, and I'd love to share how our advanced AI training has helped teams like yours increase their close rates by up to 20%. Do you have five minutes to discuss this?",
    prospectSaid: "Hey Kayson, I appreciate the call, but we're pretty happy with our current sales training methods at the moment. Thanks for reaching out though.",
    talkRatio: "85% you, 15% Marcus",
    prospectTone: "dismissive, closed",
    sentiment: {
      trust: { value: 25, label: "Low", color: "#D9382E" },
      curiosity: { value: 20, label: "Low", color: "#D9382E" },
      urgency: { value: 45, label: "Moderate", color: "#D97706" },
    },
    beforeSentiment: {
      trust: { value: 45, label: "Moderate" },
      curiosity: { value: 40, label: "Moderate" },
      urgency: { value: 25, label: "Low" },
    },
    whatWorked: "Marcus told you the real objection: his team is 'happy with current methods.' That's rare intel. But you made the conversation about YOU (your 20% feature) instead of HIM. When you talk about yourself, he has spare brain space to think 'this is a sales pitch.'",
    sharpenThis: "People can't multitask. When you talk about HIS problems, his brain is too busy to think 'this person wants to sell me something.' You made it about",
    sharpenBold: "you instead of him",
    quoteTag: "Try this instead",
    quoteText: "Marcus, I saw your team hit 15% close rates. What happens to your Q4 pipeline if that drops to 10% and you don't see it coming?",
    beforeScore: 4.2,
    beforeContext: "led with features",
    afterScore: 7.8,
    afterContext: "led with risk",
    quiz: {
      question: "Marcus knows you're a sales rep. Why did talking about your 20% feature make him reject you?",
      options: [
        { text: "People trust you less when you brag about your product", correct: false },
        { text: "When you talk about HIS problems, his brain is too busy to think 'sales pitch'", correct: true },
        { text: "He doesn't care about your product's numbers until he likes you first", correct: false },
      ],
      explanation: "People can't multitask. When you talk about Marcus's problems, his brain is fully occupied with his own world. He doesn't have spare mental bandwidth to keep thinking 'this person is selling to me.' But when you talk about yourself, his brain has room to categorize you as 'just another sales rep' and shut down.",
      howResponse: "Don't lead with your product. Lead with a gap in his world that keeps him awake. Try: 'Marcus, I saw your team hit 15% close rates. What happens to your Q4 pipeline if that drops to 10%?' This makes his brain work on HIS problem, not on evaluating you.",
    },
  },
  {
    id: 2,
    time: "0:48",
    label: "Discovery",
    type: "turning",
    turnLabel: "Turn 2",
    turnNumber: "2 / 3",
    youSaid: "Totally understand, Marcus. Before I let you go — quick question. I saw NexaCorp had a Q4 outage that cost about six hours of pipeline visibility. How did your team recover from that?",
    prospectSaid: "Oh, that was... yeah, that was rough. We had to manually reconcile everything on Monday. Took the team almost a full day. Why do you ask?",
    talkRatio: "40% you, 60% Marcus",
    prospectTone: "curious, opening up",
    sentiment: {
      trust: { value: 55, label: "Rising", color: "#2563EB" },
      curiosity: { value: 70, label: "High", color: "#22A559" },
      urgency: { value: 60, label: "Growing", color: "#E8892A" },
    },
    beforeSentiment: {
      trust: { value: 25, label: "Low" },
      curiosity: { value: 20, label: "Low" },
      urgency: { value: 45, label: "Moderate" },
    },
    whatWorked: "Marcus said 'we're pretty happy with our current methods' — that's not a real evaluation, it's a protective social move. He was trying to end the call politely. Instead of fighting it, you made him mentally re-enter a real operational wound. Once he was thinking about consequences, his canned objection crumbled.",
    sharpenThis: "You asked how his team recovered — that's good because it lets him stay the competent guy who managed the mess. But you stopped at the pain description. If you make him picture who suffers next time, you own the conversation. You could have",
    sharpenBold: "named the CEO risk",
    quoteTag: "Even sharper",
    quoteText: "I saw the Q4 outage cost NexaCorp about six hours of pipeline visibility. If that happens again during your next board review, what's the conversation with the CEO look like?",
    beforeScore: 6.1,
    beforeContext: "pivoted to consequences",
    afterScore: 8.4,
    afterContext: "named who suffers",
    quiz: {
      question: "Marcus tried to brush you off. Why did asking about the Q4 outage work better than arguing against his 'we're happy' line?",
      options: [
        { text: "People fear loss more than they want gain — reminding him of past pain woke him up", correct: false },
        { text: "You replaced a conversation about beliefs with a conversation about consequences", correct: true },
        { text: "Doing your homework proves you aren't randomly spraying a script", correct: false },
      ],
      explanation: "'We're happy with current methods' is a belief statement — easy to defend. 'Lost a full day reconciling' is a consequence statement — harder to dismiss. You made Marcus revisit a real pain point before he could reassert the brush-off. Reality beats abstractions.",
      howResponse: "After Marcus admits the outage was rough, don't bridge yet. Ask: 'If that happens again during your next board review, who's in the room when you explain why the numbers were off?' Make him picture that conversation. Once he feels it, bridge: 'That's exactly the gap our AI closes.'",
    },
  },
  {
    id: 3,
    time: "1:15",
    label: "Close",
    type: "win",
    turnLabel: "Turn 3",
    turnNumber: "3 / 3",
    youSaid: "Great question — so the platform uses NLP to analyze call transcripts in real-time, identifies objection patterns, then generates custom roleplay scenarios based on your actual conversation history. It also integrates with your CRM to pull deal context, and the coaching modules adapt based on rep performance over time. We have about 40 different modules covering everything from discovery to negotiation, and —",
    prospectSaid: "Interesting. What exactly does the simulation look like?",
    prospectFinal: "Okay, okay. I got it. Does Tuesday afternoon work for a demo?",
    talkRatio: "65% you, 35% Marcus",
    prospectTone: "interrupted, ready to commit",
    sentiment: {
      trust: { value: 75, label: "High", color: "#22A559" },
      curiosity: { value: 80, label: "High", color: "#22A559" },
      urgency: { value: 70, label: "Strong", color: "#22A559" },
    },
    beforeSentiment: {
      trust: { value: 55, label: "Rising" },
      curiosity: { value: 70, label: "High" },
      urgency: { value: 60, label: "Growing" },
    },
    whatWorked: "Marcus asked 'what exactly does the simulation look like?' That wasn't a feature request. It was a legitimacy check: 'Is this real or just AI vaporware?' Your answer — transcripts, pattern detection, CRM integration, adaptive coaching — gave him enough concrete mechanism to conclude 'this is worth a meeting.' Specificity built credibility, not persuasion.",
    sharpenThis: "But you kept explaining after he already believed you. Marcus interrupted you because he reached sufficiency — he had what he needed. Once a prospect crosses 'this is real,' more detail reduces momentum instead of creating it. You should have",
    sharpenBold: "stopped at credibility and moved to logistics",
    quoteTag: "Try this",
    quoteText: "It simulates real conversations using your reps' actual call patterns and deal context. It spots where objections break down, then generates targeted roleplays based on that rep's weak spots. Does Tuesday at 2pm work? I'll bring the exact simulation — 20 minutes.",
    beforeScore: 7.8,
    beforeContext: "talked past the buying signal",
    afterScore: 9.1,
    afterContext: "stopped at credibility",
    quiz: {
      question: "Marcus asked what the simulation looks like. Your long, specific answer worked — but why did he interrupt you with 'okay, I got it'?",
      options: [
        { text: "He got annoyed by all the technical jargon and wanted you to stop talking", correct: false },
        { text: "He reached 'sufficiency' — he heard enough credible detail to believe it was real and wanted to move to logistics", correct: true },
        { text: "He finally understood the product fully and didn't need more explanation", correct: false },
      ],
      explanation: "People don't need full comprehension to move forward. They need enough to believe it's real, relevant, and may matter. Marcus interrupted because your specificity had already crossed the threshold from 'interesting idea' to 'credible system.' More explanation at that point is usually worse than a calendar invite.",
      howResponse: "Once Marcus is leaning in, answer with mechanism not outcomes: 'It simulates real conversations using your reps' actual call patterns and deal context. It spots where objections break down, then generates targeted roleplays.' Then stop. If he wants more he'll ask. If not, move to logistics before human attention collapses under feature narration.",
    },
  },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("summary");

  return (
    <div className="min-h-screen bg-pitch-cream">
      <Navbar activeTab={screen} onTabChange={setScreen} />

      <main className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {screen === "summary" ? (
              <SummaryScreen onReview={() => setScreen("timeline")} />
            ) : screen === "timeline" ? (
              <TimelineScreen onComplete={() => setScreen("completion")} />
            ) : (
              <ReviewEndScreen onBack={() => setScreen("summary")} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
