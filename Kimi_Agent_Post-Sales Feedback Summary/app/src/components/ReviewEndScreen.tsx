import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, RotateCcw, TrendingUp, Star, Send } from "lucide-react";
import CircularGauge from "./CircularGauge";
import { MOMENTS } from "../pages/Home";

interface ReviewEndScreenProps {
  onBack: () => void;
  onTryAgain?: () => void;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#22A559";
  if (score >= 60) return "#D97706";
  return "#D9382E";
}

export default function ReviewEndScreen({ onBack, onTryAgain }: ReviewEndScreenProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const overallStart = 68;
  const overallEnd = 80;
  const totalImprovement = MOMENTS.reduce(
    (sum, m) => sum + (m.afterScore - m.beforeScore),
    0
  );

  // Staggered delays: overall plays first, then each moment circle one by one
  const momentDelays = [2200, 3000, 3800];

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-6 pb-24 pt-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-[0.2em] mb-3">
          Review Complete
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-pitch-text leading-tight">
          Three moments. One pattern.
        </h1>
      </motion.div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center mb-16"
      >
        <CircularGauge
          value={overallEnd}
          startValue={overallStart}
          size={200}
          strokeWidth={14}
          delay={800}
          color="#a8a29e"
          textColor={scoreColor(overallEnd)}
        />
        <div className="mt-4 text-center">
          <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-[0.15em]">
            Overall Readiness
          </p>
          <p className="text-[11px] font-semibold text-pitch-green mt-1 flex items-center gap-1 justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
            +{totalImprovement.toFixed(1)} across all moments
          </p>
        </div>
      </motion.div>

      {/* Moment Progress Circles */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mb-16"
      >
        <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-[0.15em] mb-8 text-center">
          Moment Breakdown
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-12">
          {MOMENTS.map((moment, i) => {
            const start = Math.round(moment.beforeScore * 10);
            const end = Math.round(moment.afterScore * 10);
            return (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.2, duration: 0.4 }}
                className="flex flex-col items-center text-center"
              >
                <p className="text-sm font-semibold text-pitch-text mb-1">
                  {moment.label}
                </p>
                <p className="text-[10px] text-pitch-secondary mb-3">
                  {moment.time}
                </p>
                <CircularGauge
                  value={end}
                  startValue={start}
                  size={130}
                  strokeWidth={10}
                  color="#a8a29e"
                  delay={momentDelays[i]}
                  textColor={scoreColor(end)}
                />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Constructive Mindset */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="bg-white border border-pitch-border rounded-xl p-5 sm:p-6 mb-12"
      >
        <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-[0.15em] mb-4">
          Your Pattern
        </p>
        <p className="text-sm text-pitch-text leading-relaxed mb-3">
          The spine running through all three moments: Marcus moved forward
          whenever the conversation helped him answer a question about{" "}
          <strong>his own reality</strong>, instead of forcing him to manage{" "}
          <strong>your sales intent</strong>.
        </p>
        <p className="text-sm text-pitch-text leading-relaxed mb-3">
          In the first turn, Marcus was processing who you are, what PitchIQ
          does, and how to exit. His attention stayed on{" "}
          <strong>you</strong> — so he defended. In the second turn, he was
          processing that outage, the recovery pain, and what it cost. His
          attention stayed on <strong>his own operational reality</strong> — so
          he engaged.
        </p>
        <p className="text-sm text-pitch-text leading-relaxed mb-4">
          Even the third turn follows the same rule. Marcus asked &quot;What
          exactly does the simulation look like?&quot; — which was really: is
          this real? is this worth my time? When you answered with concrete
          mechanics, you helped him resolve <em>his</em> uncertainty. Pain and
          credibility are different doors into the same house: they both make
          Marcus evaluate something meaningful to him, instead of evaluating{" "}
          <em>you</em>.
        </p>
        <div className="bg-pitch-orange-light/40 border border-pitch-orange/20 rounded-lg p-4">
          <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">
            The Whole Game
          </p>
          <p className="text-sm text-pitch-text font-medium leading-relaxed">
            The prospect moves when their internal question becomes &quot;is
            this relevant?&quot; instead of &quot;how do I get rid of this
            person?&quot; Control the attention, control the outcome.
          </p>
        </div>
      </motion.div>

      {/* Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="bg-white border border-pitch-border rounded-xl p-5 sm:p-6 mb-12"
      >
        {!submitted ? (
          <form
            name="demo-feedback"
            method="POST"
            action="/"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
            onSubmit={(e) => {
              e.preventDefault();
              fetch("/.netlify/functions/feedback", {
                method: "POST",
                body: new FormData(e.currentTarget),
              })
                .then((res) => {
                  if (!res.ok) throw new Error("Submission failed");
                  return res.json();
                })
                .then(() => setSubmitted(true))
                .catch((err) => {
                  console.error("Form submission error:", err);
                  alert("Something went wrong. Please try again.");
                });
            }}
          >
            <input type="hidden" name="form-name" value="demo-feedback" />
            <input type="hidden" name="bot-field" />
            <input type="hidden" name="rating" value={rating} />

            <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-[0.15em] mb-4">
              How was this experience?
            </p>

            {/* Star Rating */}
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-smooth"
                >
                  <Star
                    className={`w-6 h-6 transition-smooth ${
                      star <= (hoverRating || rating)
                        ? "fill-pitch-orange text-pitch-orange"
                        : "text-pitch-border"
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs text-pitch-secondary ml-2">
                {rating > 0
                  ? ["", "Needs work", "Okay", "Good", "Great", "Excellent"][rating]
                  : "Tap to rate"}
              </span>
            </div>

            {/* Extra Details */}
            <div className="mb-4">
              <label className="text-xs font-medium text-pitch-text mb-1.5 block">
                What stood out? What would make this better?
              </label>
              <textarea
                name="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="w-full bg-pitch-cream/50 border border-pitch-border rounded-lg px-3 py-2.5 text-sm text-pitch-text placeholder:text-pitch-tertiary focus:outline-none focus:ring-2 focus:ring-pitch-orange/30 focus:border-pitch-orange transition-smooth resize-none"
                placeholder="Share anything — a bug, a feature idea, or what clicked for you..."
              />
            </div>

            {/* Email */}
            <div className="mb-5">
              <label className="text-xs font-medium text-pitch-text mb-1.5 block">
                Want product updates?
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-pitch-cream/50 border border-pitch-border rounded-lg px-3 py-2.5 text-sm text-pitch-text placeholder:text-pitch-tertiary focus:outline-none focus:ring-2 focus:ring-pitch-orange/30 focus:border-pitch-orange transition-smooth"
                placeholder="you@company.com"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Send className="w-4 h-4" />
              Send Feedback
            </button>
          </form>
        ) : (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-pitch-green/10 flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-pitch-green fill-pitch-green" />
            </div>
            <p className="text-sm font-semibold text-pitch-text mb-1">
              Thanks for the feedback
            </p>
            <p className="text-xs text-pitch-secondary">
              {rating >= 4
                ? "Glad this resonated. We'll keep building."
                : "Noted. Every honest rating makes this better."}
            </p>
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7, duration: 0.4 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
      >
        <button
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          Back to Summary
          <ArrowRight className="w-4 h-4" />
        </button>
        {onTryAgain && (
          <button
            onClick={onTryAgain}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-pitch-tertiary hover:text-pitch-orange transition-smooth rounded-xl hover:bg-pitch-muted/50"
          >
            <RotateCcw className="w-4 h-4" />
            Try Another Call
          </button>
        )}
      </motion.div>
    </div>
  );
}
