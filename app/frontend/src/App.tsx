import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import ScrollToTop from "./utils/ScrollToTop";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import ApiTest from "./pages/ApiTest";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import ChatTestPage from './pages/ChatTestPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PreReleaseLandingPage from './pages/PreReleaseLandingPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResendVerificationRequestPage from './pages/ResendVerificationRequestPage';
import PersonalizeCoachPage from './pages/PersonalizeCoachPage';
import MeetYourCoachPage from './pages/MeetYourCoachPage';
import EnhanceCoachPage from './pages/EnhanceCoachPage';
import BusinessOnboardingPage from './pages/BusinessOnboardingPage';
import OnboardingTierSelectionPage from './pages/OnboardingTierSelectionPage';
import OnboardingGuard from './components/auth/OnboardingGuard';
import AuthGuard from "./components/auth/AuthGuard";
import UserDetailsGate from "./components/common/UserDetailsGate";
import DemoLandingPage from './pages/DemoLandingPage';
import DemoSessionPage from './pages/DemoSessionPage';
import VoiceDebugPage from './pages/VoiceDebugPage';

import AnimatedLandingPage from './pages/AnimatedLandingPage';
import SamOrchestratorPage from './pages/SamOrchestratorPage';
import MarcusDemoPage from './pages/MarcusDemoPage';
import ProposalPage from './pages/ProposalPage';

const App = () => (
  <HelmetProvider>
    <TooltipProvider>
      <ScrollToTop />
      <Toaster />
      <Sonner />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<AnimatedLandingPage />} />

      <Route 
        path="/demo/session" 
        element={
          <UserDetailsGate>
            <DemoSessionPage />
          </UserDetailsGate>
        } 
      />
      <Route path="/pre-release" element={<PreReleaseLandingPage />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/api-test" element={<ApiTest />} />
      <Route 
        path="/dashboard" 
        element={
          <OnboardingGuard>
            <Dashboard />
          </OnboardingGuard>
        } 
      />
      <Route path="/personalize" element={<AuthGuard><PersonalizeCoachPage /></AuthGuard>} />
      <Route path="/personalize-coach" element={<AuthGuard><PersonalizeCoachPage /></AuthGuard>} />
      <Route path="/meet-your-coach" element={<AuthGuard><MeetYourCoachPage /></AuthGuard>} />
      <Route path="/personalize/enhance" element={<AuthGuard><EnhanceCoachPage /></AuthGuard>} />
      <Route path="/business-onboarding" element={<AuthGuard><BusinessOnboardingPage /></AuthGuard>} />
      <Route path="/select-plan" element={<AuthGuard><OnboardingTierSelectionPage /></AuthGuard>} />
      <Route path="/chat-test" element={<ChatTestPage />} />
      <Route path="/voice-debug" element={<VoiceDebugPage />} />
      <Route path="/sam-orchestrator" element={<SamOrchestratorPage />} />
      <Route path="/demo/marcus" element={<MarcusDemoPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />

      {/* Unlisted proposal page - accessible only via direct URL */}
      <Route path="/proposal/:proposalId?" element={<ProposalPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/resend-verification-request" element={<ResendVerificationRequestPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </TooltipProvider>
  </HelmetProvider>
);

export default App;
