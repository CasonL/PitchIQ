import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Target, TrendingUp, ArrowRight } from "lucide-react";

const FinalThoughtSection = () => {
  return (
    <section id="movement" className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <Flame className="h-8 w-8 text-primary mr-3" />
            <h2 className="text-4xl font-bold text-foreground">
              Ready to <span className="gradient-text">Transform Your Skills</span>?
            </h2>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Card className="border border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-12">
              <div className="text-center space-y-8">
                <blockquote className="text-2xl font-medium text-foreground leading-relaxed">
                  "Sales is the most transferable skill you can master. Whether you're starting a business, 
                  advancing your career, or simply want to <span className="gradient-text font-semibold">communicate with confidence</span> — 
                  the ability to persuade and influence <span className="font-semibold text-primary">opens every door</span>."
                </blockquote>
                
                <div className="grid md:grid-cols-3 gap-8 my-12">
                  <div className="text-center">
                    <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-4">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Practical</h3>
                    <p className="text-sm text-muted-foreground">
                      Skills you can use immediately in real conversations
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Measurable</h3>
                    <p className="text-sm text-muted-foreground">
                      Track your improvement with detailed analytics
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center mx-auto mb-4">
                      <Flame className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Personalized</h3>
                    <p className="text-sm text-muted-foreground">
                      AI adapts to your industry and experience level
                    </p>
                  </div>
                </div>
                
                <div className="bg-primary/10 p-8 rounded-xl border border-primary/20">
                  <p className="text-lg font-medium text-foreground mb-6">
                    Start practicing today and see results in your next conversation.
                    <br />
                    Join thousands of professionals who are <span className="text-primary font-semibold">already closing more deals</span> with PitchIQ.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" className="gradient-bg text-white font-semibold group">
                      Start Practicing Now
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                      See How It Works
                    </Button>
                  </div>
                </div>
                
                <p className="text-muted-foreground italic">
                  Try PitchIQ risk-free for 7 days. Practice with real scenarios, get instant feedback, 
                  and see measurable improvement in your sales conversations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FinalThoughtSection;