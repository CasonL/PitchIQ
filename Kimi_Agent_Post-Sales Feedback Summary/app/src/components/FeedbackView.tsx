import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ChevronDown,
  Play,
} from "lucide-react";
import CircularGauge from "./CircularGauge";

interface Badge {
  id: string;
  type: "success" | "warning" | "tip";
  message: string;
  tooltip: string;
}

interface Message {
  id: string;
  speaker: "ai" | "user";
  text: string;
  time: string;
  badges?: Badge[];
}

const MESSAGES: Message[] = [
  {
    id: "1",
    speaker: "ai",
    text: "Hi, thanks for reaching out. I'm Sarah Chen, VP of Operations at NexaCorp. I've heard your platform can help with our reporting workflow?",
    time: "00:04",
  },
  {
    id: "2",
    speaker: "user",
    text: "Hi Sarah, great to meet you. Yes, absolutely — we specialize in automating complex reporting pipelines. I'd love to learn more about what your team is handling today.",
    time: "00:12",
    badges: [
      { id: "b1", type: "success", message: "Strong opener", tooltip: "You opened with relevance and immediately pivoted to discovery." },
    ],
  },
  {
    id: "3",
    speaker: "ai",
    text: "Honestly, it's a mess. Three different tools, manual CSV exports every Friday, and my team spends about 12 hours a week just compiling reports.",
    time: "00:28",
  },
  {
    id: "4",
    speaker: "user",
    text: "That sounds frustrating. Is the 12 hours mostly data cleaning or also distribution?",
    time: "00:36",
    badges: [
      { id: "b2", type: "success", message: "Good follow-up", tooltip: "You quantified the pain and asked a clarifying question." },
    ],
  },
  {
    id: "5",
    speaker: "ai",
    text: "Both, really. But the bigger issue is accuracy — last month we sent a report with outdated numbers to the board. That was embarrassing.",
    time: "00:48",
  },
  {
    id: "6",
    speaker: "user",
    text: "I understand. So speed and accuracy are both critical. Our platform auto-syncs data in real-time and generates board-ready reports. Would that eliminate the Friday crunch?",
    time: "01:04",
    badges: [
      { id: "b3", type: "warning", message: "Premature pitch", tooltip: "You jumped to solution mode before fully exploring the pain. Try asking 1-2 more discovery questions." },
    ],
  },
  {
    id: "7",
    speaker: "ai",
    text: "Maybe... but I'm concerned about the integration timeline. We just migrated to a new ERP six months ago and I don't want another disruption.",
    time: "01:18",
  },
  {
    id: "8",
    speaker: "user",
    text: "That's a valid concern. Most of our enterprise clients have similar histories. We typically run a phased integration — starting with a read-only connection so there's zero disruption to your ERP. What's your current stack beyond the new ERP?",
    time: "01:32",
    badges: [
      { id: "b4", type: "success", message: "Objection handled well", tooltip: "You acknowledged, provided social proof, and pivoted back to discovery." },
      { id: "b5", type: "tip", message: "Stack discovery", tooltip: "Great instinct to map the full tech stack for integration planning." },
    ],
  },
  {
    id: "9",
    speaker: "ai",
    text: "Salesforce, Snowflake, and we just added Tableau for visualization. The ERP is SAP S/4HANA.",
    time: "01:50",
  },
  {
    id: "10",
    speaker: "user",
    text: "Perfect — we have native connectors for all three. Based on what you've shared, I think we can cut that 12-hour reporting cycle down to under an hour. I'd like to schedule a 20-minute demo with your BI lead to show the SAP integration specifically. Does next Tuesday work?",
    time: "02:08",
    badges: [
      { id: "b6", type: "success", message: "Strong close", tooltip: "Quantified value, proposed specific next step with role and time." },
    ],
  },
  {
    id: "11",
    speaker: "ai",
    text: "Tuesday could work. Let me check with my team and get back to you. Can you send over a one-pager in the meantime?",
    time: "02:22",
  },
  {
    id: "12",
    speaker: "user",
    text: "I'll send the one-pager today. And I'll block 2pm Tuesday — if it doesn't work, just reply and we'll shuffle. Sound good?",
    time: "02:30",
    badges: [
      { id: "b7", type: "warning", message: "Soft close", tooltip: "You accepted 'I'll get back to you' instead of securing a firm commitment. Try: 'What time Tuesday works best for you and your BI lead?'" },
    ],
  },
];

const KEY_MOMENTS = [
  { time: "01:04", label: "Premature pitch" },
  { time: "01:32", label: "Objection handled" },
  { time: "02:30", label: "Soft close" },
];

export default function FeedbackView() {
  const [activeAccordion, setActiveAccordion] = useState<string | null>("worked");
  const [highlightedTime, setHighlightedTime] = useState<string | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToMessage = (time: string) => {
    const message = MESSAGES.find((m) => m.time === time);
    if (message && messageRefs.current[message.id]) {
      messageRefs.current[message.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedTime(time);
      setTimeout(() => setHighlightedTime(null), 2000);
    }
  };

  const BadgeIcon = ({ type }: { type: Badge["type"] }) => {
    switch (type) {
      case "success":
        return <Star className="w-3.5 h-3.5 text-pitch-green" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-pitch-red" />;
      case "tip":
        return <Lightbulb className="w-3.5 h-3.5 text-pitch-orange" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Hero Score Card */}
      <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column */}
          <div className="flex-1 lg:max-w-[60%]">
            <span className="inline-block px-3 py-1 rounded-full bg-pitch-orange-light text-pitch-orange text-xs font-mono font-medium uppercase tracking-wider mb-4">
              Post-Call Analysis
            </span>

            <h1 className="font-display text-3xl sm:text-4xl font-bold text-pitch-text mb-2">
              Discovery Call with{" "}
              <span className="italic text-pitch-orange">Sarah Chen</span>
            </h1>

            <p className="text-pitch-tertiary text-sm mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recorded 14 Feb 2026 &bull; 4m 32s
            </p>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-pitch-muted rounded-xl p-3">
                <p className="text-xs text-pitch-tertiary mb-1">Talk Ratio</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-pitch-border overflow-hidden">
                    <div className="h-full bg-pitch-orange rounded-full" style={{ width: "62%" }} />
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs font-medium text-pitch-text">62%</span>
                  <span className="text-xs text-pitch-tertiary">38%</span>
                </div>
              </div>

              <div className="bg-pitch-muted rounded-xl p-3">
                <p className="text-xs text-pitch-tertiary mb-1">Pace</p>
                <p className="text-lg font-semibold text-pitch-text">142</p>
                <p className="text-xs text-pitch-green">Steady</p>
              </div>

              <div className="bg-pitch-muted rounded-xl p-3">
                <p className="text-xs text-pitch-tertiary mb-1">Sentiment</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-pitch-green" />
                  <span className="text-sm font-medium text-pitch-text">Positive</span>
                </div>
              </div>

              <div className="bg-pitch-muted rounded-xl p-3">
                <p className="text-xs text-pitch-tertiary mb-1">Filler Words</p>
                <p className="text-lg font-semibold text-pitch-text">4</p>
                <p className="text-xs text-pitch-orange">Instances</p>
              </div>
            </div>
          </div>

          {/* Right Column - Gauge */}
          <div className="flex flex-col items-center justify-center lg:min-w-[200px]">
            <CircularGauge value={82} size={160} strokeWidth={10} />
            <p className="text-sm text-pitch-secondary mt-3 font-medium">Call IQ Score</p>
          </div>
        </div>
      </div>

      {/* Transcript & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Transcript Panel */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-pitch-text">Transcript</h2>
            <button className="flex items-center gap-1.5 text-sm text-pitch-secondary hover:text-pitch-orange transition-smooth px-3 py-1.5 rounded-lg hover:bg-pitch-orange-light">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-hide pr-1">
            {MESSAGES.map((msg) => (
              <div
                key={msg.id}
                ref={(el) => { messageRefs.current[msg.id] = el; }}
                className={`transition-colors duration-500 rounded-xl p-3 ${
                  highlightedTime === msg.time ? "bg-pitch-orange-light ring-1 ring-pitch-orange" : ""
                }`}
              >
                <div
                  className={`flex gap-3 ${msg.speaker === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      msg.speaker === "ai"
                        ? "bg-pitch-orange text-white"
                        : "bg-pitch-green text-white"
                    }`}
                  >
                    {msg.speaker === "ai" ? "SC" : "You"}
                  </div>

                  <div className={`flex-1 ${msg.speaker === "user" ? "text-right" : ""}`}>
                    <div
                      className={`inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.speaker === "ai"
                          ? "bg-pitch-muted text-pitch-text rounded-tl-none"
                          : "bg-pitch-green-light text-pitch-text rounded-tr-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <p className="text-xs text-pitch-tertiary mt-1 font-mono">{msg.time}</p>

                    {/* Inline Badges */}
                    {msg.badges && msg.badges.length > 0 && (
                      <div
                        className={`flex flex-wrap gap-2 mt-2 ${
                          msg.speaker === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.badges.map((badge) => (
                          <div
                            key={badge.id}
                            className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${
                              badge.type === "success"
                                ? "bg-pitch-green-light text-pitch-green border border-pitch-green/20"
                                : badge.type === "warning"
                                ? "bg-pitch-red-light text-pitch-red border border-pitch-red/20"
                                : "bg-pitch-orange-light text-pitch-orange border border-pitch-orange/20"
                            }`}
                          >
                            <BadgeIcon type={badge.type} />
                            {badge.message}

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-pitch-text text-white text-xs rounded-lg px-3 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none shadow-lg">
                              {badge.tooltip}
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-pitch-text" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-pitch-text mb-4">Coaching Insights</h2>

          <div className="space-y-2">
            {/* What Worked */}
            <div className="border border-pitch-border rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveAccordion(activeAccordion === "worked" ? null : "worked")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-pitch-muted/50 transition-smooth"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-pitch-green" />
                  <span className="font-medium text-pitch-text">What Worked</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-pitch-tertiary transition-transform duration-200 ${
                    activeAccordion === "worked" ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {activeAccordion === "worked" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {[
                        "Opened with a relevant insight about reporting automation",
                        "Used the prospect's name naturally in conversation",
                        "Closed with a clear next step and specific time proposal",
                        "Handled the ERP integration objection with social proof",
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-pitch-green mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-pitch-secondary">{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* What to Improve */}
            <div className="border border-pitch-border rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveAccordion(activeAccordion === "improve" ? null : "improve")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-pitch-muted/50 transition-smooth"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-pitch-red" />
                  <span className="font-medium text-pitch-text">What to Improve</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-pitch-tertiary transition-transform duration-200 ${
                    activeAccordion === "improve" ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {activeAccordion === "improve" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {[
                        "Asked 2 closed questions early in discovery (00:36, 01:04)",
                        "Rushed past budget discussion — missed qualification signal",
                        "Accepted a soft close instead of securing firm commitment",
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-pitch-orange mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-pitch-secondary">{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Key Moments */}
            <div className="border border-pitch-border rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveAccordion(activeAccordion === "moments" ? null : "moments")}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-pitch-muted/50 transition-smooth"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-pitch-orange" />
                  <span className="font-medium text-pitch-text">Key Moments</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-pitch-tertiary transition-transform duration-200 ${
                    activeAccordion === "moments" ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {activeAccordion === "moments" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {KEY_MOMENTS.map((moment) => (
                        <button
                          key={moment.time}
                          onClick={() => scrollToMessage(moment.time)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-pitch-orange-light transition-smooth text-left"
                        >
                          <span className="font-mono text-xs text-pitch-orange bg-pitch-orange-light px-2 py-0.5 rounded">
                            {moment.time}
                          </span>
                          <span className="text-sm text-pitch-secondary">{moment.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
