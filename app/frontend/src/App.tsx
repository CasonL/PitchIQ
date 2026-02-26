import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
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

import AnimatedLandingPage from './pages/AnimatedLandingPage';
import SamOrchestratorPage from './pages/SamOrchestratorPage';
import MarcusDemoPage from './pages/MarcusDemoPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import AdminSignups from './pages/AdminSignups';

const App = () => (
  <HelmetProvider>
    <TooltipProvider>
      <ScrollToTop />
      <Toaster />
      <Sonner />
      <Routes>
      {/* Main Landing */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<AnimatedLandingPage />} />

      {/* Marcus Demo - Main Demo Flow */}
      <Route path="/demo/marcus" element={<MarcusDemoPage />} />

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

      {/* Authentication */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/resend-verification-request" element={<ResendVerificationRequestPage />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </TooltipProvider>
  </HelmetProvider>
);

export default App;
