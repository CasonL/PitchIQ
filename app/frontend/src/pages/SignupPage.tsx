import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FEATURES = [
  {
    title: 'AI-Powered Coaching',
    desc: 'Get personalized feedback on every call — tone, pacing, objection handling, and closing technique.',
  },
  {
    title: 'Realistic Buyer Simulations',
    desc: 'Practice against AI buyers with distinct personalities, objections, and buying triggers.',
  },
  {
    title: 'Performance Tracking',
    desc: 'See your readiness score improve over time. Know exactly where you are before the real call.',
  },
];

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

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const registerUrl = `${API_BASE_URL}/auth/register`;
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Account Created',
          description: 'Welcome to PitchIQ! Redirecting to plan selection...',
        });
        localStorage.clear();
        setTimeout(() => navigate('/select-plan'), 1500);
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <span className="text-sm text-[#5A5A5A] hidden sm:inline">Already have an account?</span>
            <Link
              to="/login"
              className="px-5 py-2 rounded-full border-2 border-brand-orange/40 text-brand-orange text-sm font-semibold hover:bg-brand-orange/5 hover:border-brand-orange transition-all"
            >
              Sign in
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
            <motion.span variants={itemVariants} className="inline-block px-3 py-1 rounded-full border border-brand-orange/30 text-brand-orange text-xs font-mono font-medium tracking-widest uppercase mb-6">
              START YOUR FREE TRIAL
            </motion.span>

            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl xl:text-5xl font-bold text-[#1A1A1A] leading-[1.1] mb-6"
            >
              Practice on AI Buyers.{" "}
              <em className="text-gradient">Close on Real Ones.</em>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg text-[#5A5A5A] leading-relaxed mb-10 max-w-[480px]">
              Join thousands of sales professionals who sharpen their pitch before every call — not after they lose the deal.
            </motion.p>

            <motion.div variants={containerVariants} className="space-y-5">
              {FEATURES.map((f) => (
                <motion.div key={f.title} variants={itemVariants} className="flex items-start gap-3.5">
                  <CheckCircle className="h-5 w-5 text-brand-orange mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-[#1A1A1A] text-sm">{f.title}</p>
                    <p className="text-sm text-[#5A5A5A] leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
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
                <h2 className="font-display text-2xl font-bold text-[#1A1A1A] mb-2">
                  Create Your Account
                </h2>
                <p className="text-[#5A5A5A] text-sm">
                  Start practicing smarter today.
                </p>
              </div>

              <div className="hidden lg:block mb-8">
                <h2 className="font-display text-2xl font-bold text-[#1A1A1A] mb-1">
                  Create Your Account
                </h2>
                <p className="text-[#5A5A5A] text-sm">
                  No credit card required. Cancel anytime.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className={`${inputBase} ${errors.name ? inputError : inputNormal} pl-11`}
                    />
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@company.com"
                      className={`${inputBase} ${errors.email ? inputError : inputNormal} pl-11`}
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a password"
                      className={`${inputBase} ${errors.password ? inputError : inputNormal} pl-11 pr-11`}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#5A5A5A] transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      className={`${inputBase} ${errors.confirmPassword ? inputError : inputNormal} pl-11 pr-11`}
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A0A0A0]" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0A0A0] hover:text-[#5A5A5A] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isLoading ? (
                    'Creating Account...'
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-[#8A8A8A]">
                  By creating an account, you agree to our{' '}
                  <a href="/terms" className="text-brand-orange hover:text-brand-amber transition-colors">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-brand-orange hover:text-brand-amber transition-colors">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
