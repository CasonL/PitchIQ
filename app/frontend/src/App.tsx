import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./utils/ScrollToTop";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import ApiTest from "./pages/ApiTest";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import ChatTestPage from './pages/ChatTestPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PreReleaseLandingPage from './pages/PreReleaseLandingPage';
import AboutPage from './pages/AboutPage';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ScrollToTop />
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/api-test" element={<ApiTest />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat-test" element={<ChatTestPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/pre-release" element={<PreReleaseLandingPage />} />
        <Route path="/about-us" element={<AboutPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
