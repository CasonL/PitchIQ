import { Button } from "@/components/ui/button";
import { ArrowRight, Users, TrendingUp, Target } from "lucide-react";
import heroSphere from "@/assets/hero-sphere.jpg";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-foreground">Democratizing</span>
                <br />
                <span className="gradient-text">Elite Sales Training</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                PitchIQ has the potential to help — not just in a business sense, but in a systemic one. 
                By staying laser-focused on democratizing access to elite sales training and economic mobility.
              </p>
              
              <div className="bg-card p-6 rounded-xl border border-border">
                <blockquote className="text-lg font-medium text-foreground italic">
                  "Sales skill is one of the most transferable forms of economic leverage — 
                  across industries, classes, and education levels."
                </blockquote>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="gradient-bg text-white font-semibold group">
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                Learn More
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-primary mr-1" />
                  <span className="text-2xl font-bold text-foreground">40%</span>
                </div>
                <p className="text-sm text-muted-foreground">Faster ramp</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-primary mr-1" />
                  <span className="text-2xl font-bold text-foreground">85%</span>
                </div>
                <p className="text-sm text-muted-foreground">Success rate</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Target className="h-5 w-5 text-primary mr-1" />
                  <span className="text-2xl font-bold text-foreground">10K+</span>
                </div>
                <p className="text-sm text-muted-foreground">Lives changed</p>
              </div>
            </div>
          </div>
          
          {/* Right Visual */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              <img 
                src={heroSphere} 
                alt="Abstract sphere representing economic mobility"
                className="w-96 h-96 object-contain animate-float"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent rounded-full blur-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;