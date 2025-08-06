import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Users, Filter, MessageSquare } from "lucide-react";

const ConditionsSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-primary mr-3" />
            <h2 className="text-4xl font-bold text-foreground">
              What Makes <span className="gradient-text">PitchIQ Different</span>
            </h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Real practice, personalized feedback, and skills that translate to any industry or role.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border border-border bg-card">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">
                Practice With Real Scenarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Stop rehearsing generic scripts. Practice with industry-specific scenarios that 
                  mirror real conversations you'll have with prospects and clients.
                </p>
                <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
                  <p className="text-sm font-medium text-foreground">
                    From cold outreach to closing deals, master the conversations 
                    that matter most in your field.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border bg-card">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">
                Get Instant, Actionable Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  No more wondering if you're improving. Get detailed analysis on your tone, 
                  pacing, objection handling, and closing techniques after every practice session.
                </p>
                <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
                  <p className="text-sm font-medium text-foreground">
                    Track your progress over time and see exactly where to focus 
                    your improvement efforts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border bg-card md:col-span-2 lg:col-span-1">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl text-foreground">
                Build Confidence Through Repetition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  The best salespeople aren't born—they're made through deliberate practice. 
                  Rehearse difficult conversations until they become second nature.
                </p>
                <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
                  <p className="text-sm font-medium text-foreground">
                    Walk into every real conversation with the confidence that comes from practice.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ConditionsSection;