import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, MapPin, Send, MessageSquare, Clock, CheckCircle } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate submission — replace with actual endpoint when ready
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    setSubmitted(true);
  };

  const inputBase =
    'w-full px-5 py-3.5 rounded-full bg-white border text-sm text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-all duration-200 border-cream-deep focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10';
  const textareaBase =
    'w-full px-5 py-3.5 rounded-2xl bg-white border text-sm text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-all duration-200 border-cream-deep focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 resize-none';

  return (
    <div className="min-h-screen bg-cream bg-noise flex flex-col">
      {/* Nav */}
      <nav className="w-full border-b border-cream-deep/60 bg-cream/80 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/fox-mascot.webp" alt="PitchIQ" className="w-8 h-8 object-contain" />
            <span className="font-display text-xl font-bold text-[#1A1A1A]">PitchIQ</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-[#5A5A5A] hover:text-brand-orange transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-[1200px] mx-auto w-full grid lg:grid-cols-2 gap-16 items-start">
          {/* Left */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pt-8"
          >
            <motion.span
              variants={itemVariants}
              className="inline-block px-3 py-1 rounded-full border border-brand-orange/30 text-brand-orange text-xs font-mono font-medium tracking-widest uppercase mb-6"
            >
              GET IN TOUCH
            </motion.span>

            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl xl:text-5xl font-bold text-[#1A1A1A] leading-[1.1] mb-6"
            >
              Let&apos;s Talk About{" "}
              <em className="text-gradient">Your Pipeline.</em>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg text-[#5A5A5A] leading-relaxed mb-10 max-w-[460px]"
            >
              Whether you want a demo, have a question about pricing, or just want to say hello — we read every message.
            </motion.p>

            <motion.div variants={containerVariants} className="space-y-5 max-w-[400px]">
              <motion.div variants={itemVariants} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-brand-orange" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">Email</p>
                  <a
                    href="mailto:support@pitchiq.ca"
                    className="text-sm text-[#5A5A5A] hover:text-brand-orange transition-colors"
                  >
                    support@pitchiq.ca
                  </a>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-brand-orange" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">Location</p>
                  <p className="text-sm text-[#5A5A5A]">Edmonton, Alberta, Canada</p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-brand-orange" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">Response Time</p>
                  <p className="text-sm text-[#5A5A5A]">Usually within 24 hours</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="pt-8"
          >
            <div className="bg-white rounded-2xl border border-cream-deep shadow-sm p-8 sm:p-10">
              {submitted ? (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-5"
                  >
                    <CheckCircle className="w-8 h-8 text-brand-orange" />
                  </motion.div>
                  <h3 className="font-display text-xl font-bold text-[#1A1A1A] mb-2">
                    Message Sent
                  </h3>
                  <p className="text-[#5A5A5A] text-sm">
                    Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-2xl font-bold text-[#1A1A1A] mb-1">
                    Send a Message
                  </h2>
                  <p className="text-[#5A5A5A] text-sm mb-8">
                    Fill out the form and we&apos;ll get back to you shortly.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name"
                          required
                          className={inputBase}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="you@company.com"
                          required
                          className={inputBase}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Subject
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="What is this about?"
                          required
                          className={`${inputBase} pl-11`}
                        />
                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Message
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us what's on your mind..."
                        required
                        rows={5}
                        className={textareaBase}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      {isLoading ? (
                        'Sending...'
                      ) : (
                        <>
                          Send Message
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
