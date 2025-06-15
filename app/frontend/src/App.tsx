import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route } from "react-router-dom";
import ScrollToTop from "./utils/ScrollToTop";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import ApiTest from "./pages/ApiTest";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import ChatTestPage from './pages/ChatTestPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PreReleaseLandingPage from './pages/PreReleaseLandingPage';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ResendVerificationRequestPage from './pages/ResendVerificationRequestPage';
import PersonalizeCoachPage from './pages/PersonalizeCoachPage';
import MeetYourCoachPage from './pages/MeetYourCoachPage';
import EnhanceCoachPage from './pages/EnhanceCoachPage';
import OnboardingGuard from './components/auth/OnboardingGuard';
import AuthGuard from "./components/auth/AuthGuard";

const App = () => (
  <TooltipProvider>
    <ScrollToTop />
    <Toaster />
    <Sonner />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<LandingPage />} />
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
      <Route path="/chat-test" element={<ChatTestPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/pre-release" element={<PreReleaseLandingPage />} />

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
);

export default App;
