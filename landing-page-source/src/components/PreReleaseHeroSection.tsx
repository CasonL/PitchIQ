import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, CheckCircle } from "lucide-react";

const PreReleaseHeroSection = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/email-signup/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, early_access: true }),
      });

      if (response.ok) {
        console.log("Email successfully submitted to Flask API");
        setIsSubmitted(true);
        setTimeout(() => {
          setIsSubmitted(false);
          setEmail("");
        }, 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Submission failed. Please try again.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <section className="pt-32 pb-16 md:pt-40 md:pb-24 px-6 md:px-10 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4 text-red-600">
              Stop Guessing,<br />Start Closing.
            </h1>
            <p className="text-xl md:text-2xl text-foreground/70 mb-8">
              Practice smarter with AI roleplay. Build confidence, master objections, and win more deals.
            </p>
            
            {/* Email Signup Form */}
            <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-100">
              <div className="flex items-center mb-4">
                <Mail className="w-6 h-6 text-pitchiq-purple mr-2" />
                <h3 className="text-lg font-semibold">Get Early Access</h3>
              </div>
              
              {!isSubmitted ? (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                    name="email"
                    disabled={isSubmitting}
                  />
                  {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                  )}
                  <Button 
                    type="submit"
                    size="lg" 
                    className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg btn-hover-effect"
                    disabled={isSubmitting || !email}
                  >
                    {isSubmitting ? "Submitting..." : "Join the Waitlist"}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <h4 className="text-lg font-semibold text-green-600 mb-1">You're on the list!</h4>
                  <p className="text-foreground/70">We'll notify you when PitchIQ launches.</p>
                </div>
              )}
              
              <p className="text-sm text-foreground/60 mt-3 text-center">
                🚀 Be among the first to experience the future of sales training
              </p>
            </div>
          </div>
          
          {/* Right side - About Section */}
          <div id="about" className="bg-gradient-to-br from-pitchiq-purple/10 to-pitchiq-red/10 p-8 rounded-lg">
            <h2 className="text-3xl font-bold mb-6 text-gradient">About PitchIQ</h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                <strong>PitchIQ</strong> is revolutionizing sales training with cutting-edge AI technology. 
                Our platform analyzes your voice, tone, and delivery to provide personalized coaching 
                that transforms average salespeople into top performers.
              </p>
              <p>
                Built by sales professionals for sales professionals, PitchIQ understands the unique 
                challenges of modern selling and provides the tools you need to overcome them.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-pitchiq-red">85%</div>
                  <div className="text-sm">Improvement in confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pitchiq-red">60%</div>
                  <div className="text-sm">Increase in close rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pitchiq-red">10k+</div>
                  <div className="text-sm">Sales pros trained</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pitchiq-red">24/7</div>
                  <div className="text-sm">AI coaching available</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PreReleaseHeroSection; 