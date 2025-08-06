import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowDown, Users, Lightbulb, Shield } from "lucide-react";

const MissionSection = () => {
  return (
    <section id="mission" className="py-20 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 text-foreground">
            Breaking Down <span className="gradient-text">Systemic Barriers</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Here's how PitchIQ can meaningfully help reverse systemic decay through democratized access to economic power.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          <Card className="border border-border bg-card hover:shadow-lg transition-shadow">
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Lowering Barriers to Economic Power
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Sales skill is transferable across industries, classes, and education levels
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Most people never get access to world-class training — it's locked away
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    PitchIQ cracks that open for anyone, anywhere
                  </span>
                </li>
              </ul>
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  People without degrees, connections, or generational wealth now have a shot to build something real.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border bg-card hover:shadow-lg transition-shadow">
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center mb-4">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Teaching Value Creation
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    In decaying economies, people feel powerless and unable to communicate their worth
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    PitchIQ gives them tools to sell their ideas, themselves, and ethically
                  </span>
                </li>
              </ul>
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  You're teaching how to move within — and eventually transcend — extractive systems.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-border bg-card hover:shadow-lg transition-shadow">
            <CardContent className="p-8">
              <div className="mb-6">
                <div className="w-12 h-12 gradient-bg rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Replacing Snake Oil with Real Practice
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    The sales training world is full of overpriced, manipulative fluff
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">
                    PitchIQ offers iterative, personalized, high-quality practice that scales
                  </span>
                </li>
              </ul>
              <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium text-primary">
                  That's economic justice: giving people mastery, not just mindset.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default MissionSection;