import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { BrainCircuit, ChevronDown, User, Mail } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";

// Form Schema
const formSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  email: z.string().email("A valid email is required to start.")
});
type FormShape = z.infer<typeof formSchema>;
const STORAGE_KEY = "pitchiq:user";

// Component
const DemoLandingPage = () => {
  const [cardState, setCardState] = useState<'button' | 'form'>('button');
  const [showPrompt, setShowPrompt] = useState(false);
  const promptText = "Click to Start Your Demo";
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormShape>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    const timer = setTimeout(() => setShowPrompt(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleCardClick = () => {
    if (cardState === 'button') {
      setCardState('form');
    }
  };
  
  const onFormSubmit = (data: FormShape) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      navigate('/demo/session');
    } catch (error) {
      console.error("Failed to save user details to local storage", error);
    }
  };

  const cardVariants = {
    button: { width: 'auto', height: 'auto', borderRadius: '1rem', cursor: 'pointer' },
    form: { width: 'clamp(350px, 90vw, 480px)', height: 'auto', borderRadius: '1.5rem', cursor: 'default' }
  };

  return (
    <div className="flex flex-col justify-center items-center w-full h-screen bg-background relative overflow-hidden">
      <AnimatePresence>
        {cardState === 'button' && showPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute text-center"
            style={{ top: 'calc(50% - 120px)' }}
          >
            <div className="font-mono text-xl font-medium text-gray-800 mb-4">{promptText}</div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="flex justify-center"
            >
              <ChevronDown className="h-8 w-8 text-gray-700" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        layout
        className="ai-summary-card bg-card text-card-foreground border shadow-xl p-6"
        variants={cardVariants}
        initial="button"
        animate={cardState}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={cardState === 'button' ? handleCardClick : undefined}
      >
        <AnimatePresence mode="wait">
          {cardState === 'button' ? (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-3"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <div>
                <span className="block font-semibold text-xl bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-red-600">AI Coach</span>
                <span className="text-sm text-muted-foreground">Personalized Sales Training</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <h3 className="text-center text-2xl font-bold mb-2 text-gray-800">Start Your Demo</h3>
              <p className="text-center text-muted-foreground mb-6">Enter your details to begin.</p>
              
              <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="fullName"
                      placeholder="Jane Doe"
                      autoComplete="name"
                      className="pl-10"
                      {...register("fullName")}
                    />
                  </div>
                  {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@acme.com"
                      autoComplete="email"
                      className="pl-10"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isSubmitting} size="lg">
                  {isSubmitting ? "Starting..." : "Begin Instant Demo"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DemoLandingPage; 