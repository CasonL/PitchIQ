import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, lazy, Suspense } from 'react';
import ScrollToTop from "./utils/ScrollToTop";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResendVerificationRequestPage from './pages/ResendVerificationRequestPage';
import PersonalizeCoachPage from './pages/PersonalizeCoachPage';
import AuthGuard from "./components/auth/AuthGuard";

// Lazy load heavy pages to reduce initial bundle size
const AnimatedLandingPage = lazy(() => import('./pages/AnimatedLandingPage'));
const SamOrchestratorPage = lazy(() => import('./pages/SamOrchestratorPage'));
const MarcusDemoPage = lazy(() => import('./pages/MarcusDemoPage'));
const IntegratedMarcusDemo = lazy(() => import('./pages/IntegratedMarcusDemo'));
const PostCallReviewPage = lazy(() => import('./pages/PostCallReviewPage'));
const PostCallAnalysisPage = lazy(() => import('./pages/PostCallAnalysisPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const AdminSignups = lazy(() => import('./pages/AdminSignups'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));

// Loading fallback for lazy routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-cream">
    <div className="animate-pulse flex flex-col items-center">
      <div className="w-12 h-12 rounded-full bg-brand-orange/20 mb-4" />
      <div className="text-brand-orange font-medium">Loading...</div>
    </div>
  </div>
);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://pitchiq-8enf.onrender.com';

const App = () => {
  useEffect(() => {
    const wakeUpBackend = async () => {
      try {
        console.log('🌅 Waking up backend on app load...');
        await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        console.log('✅ Backend is awake');
      } catch (error) {
        console.log('⚠️ Backend wake-up call failed (may already be awake):', error);
      }
    };

    wakeUpBackend();
  }, []);

  return (
  <HelmetProvider>
    <TooltipProvider>
      <ScrollToTop />
      <Toaster />
      <Sonner />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Main Landing - eagerly loaded for fast initial paint */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Integrated Marcus Demo - Kimi UI + Full Backend AI */}
          <Route path="/demo" element={<IntegratedMarcusDemo />} />
          
          {/* Backend-Connected Marcus Demo (Original UI) */}
          <Route path="/demo/live" element={<MarcusDemoPage />} />
          
          {/* Alternative Voice Agent Demo */}
          <Route path="/demo/voice-agent" element={<AnimatedLandingPage />} />

          {/* Sam Orchestrator - Coach Testing */}
          <Route path="/sam-orchestrator" element={<SamOrchestratorPage />} />

          {/* Blog */}
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />

          {/* Admin */}
          <Route path="/admin/signups" element={<AdminSignups />} />

          {/* Onboarding */}
          <Route path="/personalize" element={<AuthGuard><PersonalizeCoachPage /></AuthGuard>} />
          <Route path="/personalize-coach" element={<AuthGuard><PersonalizeCoachPage /></AuthGuard>} />

          {/* Authentication - eagerly loaded */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/register" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          <Route path="/resend-verification-request" element={<ResendVerificationRequestPage />} />
          
          {/* Post-Call Review (Kimi Demo) */}
          <Route path="/post-call-review" element={<PostCallReviewPage />} />
          
          {/* Post-Call Analysis */}
          <Route path="/post-call-analysis" element={<PostCallAnalysisPage />} />
          
          {/* Legal */}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </TooltipProvider>
  </HelmetProvider>
  );
};

export default App;
