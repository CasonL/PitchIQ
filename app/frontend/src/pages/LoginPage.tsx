import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import api from '@/lib/axios';
import axios from 'axios';

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

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, checkAuthStatus, isLoading: authIsLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('/api/auth/login', { email, password });

      if (response.data?.status === 'success' && response.data.user) {
        login(response.data.user);
        const redirectUrl = response.data.redirect || '/';
        navigate(redirectUrl);
      } else {
        setError(response.data.error || 'Login failed: Invalid response from server.');
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'An error occurred.');
      } else {
        setError(err.message || 'An unknown error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = authIsLoading || isSubmitting;

  const inputBase =
    'w-full px-5 py-3.5 rounded-full bg-white border text-sm text-[#1A1A1A] placeholder:text-[#A0A0A0] outline-none transition-all duration-200';
  const inputNormal = 'border-cream-deep focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10';
  const inputError = 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100';

  return (
    <div className="min-h-screen bg-cream bg-noise flex flex-col">
      {/* Top bar */}
      <nav className="w-full border-b border-cream-deep/60 bg-cream/80 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/fox-mascot.webp" alt="PitchIQ" className="w-8 h-8 object-contain" />
            <span className="font-display text-xl font-bold text-[#1A1A1A]">PitchIQ</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#5A5A5A] hidden sm:inline">New here?</span>
            <Link
              to="/signup"
              className="px-5 py-2 rounded-full border-2 border-brand-orange/40 text-brand-orange text-sm font-semibold hover:bg-brand-orange/5 hover:border-brand-orange transition-all"
            >
              Create Account
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-[1200px] mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Branded content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="hidden lg:block"
          >
            <motion.span
              variants={itemVariants}
              className="inline-block px-3 py-1 rounded-full border border-brand-orange/30 text-brand-orange text-xs font-mono font-medium tracking-widest uppercase mb-6"
            >
              WELCOME BACK
            </motion.span>

            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl xl:text-5xl font-bold text-[#1A1A1A] leading-[1.1] mb-6"
            >
              Your Next Deal Starts{" "}
              <em className="text-gradient">Here.</em>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg text-[#5A5A5A] leading-relaxed mb-10 max-w-[460px]"
            >
              Pick up where you left off. Every rep who logs in today is one step closer to their best call ever.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl border border-cream-deep p-6 shadow-sm max-w-[420px]"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-brand-orange" />
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm mb-1">Daily Streak</p>
                  <p className="text-sm text-[#5A5A5A] leading-relaxed">
                    Reps who practice 3+ times per week close 34% more deals. Your streak is waiting.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Form card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="bg-white rounded-2xl border border-cream-deep shadow-sm p-8 sm:p-10">
              {/* Mobile-only headline */}
              <div className="lg:hidden text-center mb-8">
                <h2 className="font-display text-2xl font-bold text-[#1A1A1A] mb-2">Welcome Back</h2>
                <p className="text-[#5A5A5A] text-sm">Sign in to continue practicing.</p>
              </div>

              <div className="hidden lg:block mb-8">
                <h2 className="font-display text-2xl font-bold text-[#1A1A1A] mb-1">Sign In</h2>
                <p className="text-[#5A5A5A] text-sm">Enter your details to access your account.</p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@company.com"
                      className={`${inputBase} ${error ? inputError : inputNormal} pl-11`}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                      className={`${inputBase} ${error ? inputError : inputNormal} pl-11`}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[#8A8A8A] hover:text-brand-orange transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className="w-full mt-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isSubmitting ? (
                    'Signing in...'
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-[#5A5A5A]">
                  Don't have an account?{' '}
                  <Link
                    to="/signup"
                    className="font-semibold text-brand-orange hover:text-brand-amber transition-colors"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
