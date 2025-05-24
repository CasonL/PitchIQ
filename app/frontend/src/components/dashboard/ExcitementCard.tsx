import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Users, Building, Brain, ShieldCheck, Clock, BarChart3, ChevronRight } from 'lucide-react';

interface ExcitementCardProps {
  userName: string;
  productInfo?: string;
  audienceInfo?: string;
  salesStyle?: string;
  salesEnvironment?: string;
  userAccountStatus: 'free' | 'premium';
  onExploreDashboard: () => void;
}

const SectionWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`py-6 px-2 md:px-0 ${className || ''}`}>
    {children}
  </div>
);

const SectionTitle: React.FC<{ icon: React.ElementType, title: string, iconColorClass?: string }> = ({ icon: Icon, title, iconColorClass = 'text-primary' }) => (
  <div className="flex items-center justify-center mb-5">
    <Icon size={28} className={`mr-3 ${iconColorClass}`} />
    <h3 className="text-2xl font-semibold text-gray-800 tracking-tight">{title}</h3>
  </div>
);

const DetailItem: React.FC<{ icon: React.ElementType, title: string, description: string }> = ({ icon: Icon, title, description }) => (
  <div className="flex items-start space-x-3 p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow">
    <Icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
    <div>
      <h5 className="font-medium text-gray-700 text-md">{title}</h5>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

const ExcitementCard: React.FC<ExcitementCardProps> = ({
  userName,
  productInfo,
  audienceInfo,
  salesStyle,
  salesEnvironment,
  userAccountStatus,
  onExploreDashboard
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full px-2"
    >
      <Card className="w-full max-w-3xl mx-auto shadow-2xl overflow-hidden border-0">
        <CardHeader className="text-center py-6 px-4 bg-blue-600">
          <div className="flex items-center justify-center mb-3">
            <Sparkles className="h-10 w-10 text-yellow-400 mr-3" />
            <CardTitle className="text-3xl md:text-4xl font-bold text-white">Welcome, {userName}!</CardTitle>
          </div>
          <CardDescription className="text-md md:text-lg text-blue-100 pt-1 max-w-lg mx-auto">
            Your PitchIQ journey is uniquely personalized. Let's see how!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0 md:p-0 divide-y divide-gray-200">
          
          <SectionWrapper className="bg-slate-50">
            <SectionTitle icon={Zap} title="How PitchIQ Crafts Your Scenarios" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto px-4">
              {productInfo && (
                <DetailItem 
                  icon={Brain}
                  title="Your Product/Service" 
                  description={`AI personas will engage about solutions like '${productInfo}', asking relevant questions and raising specific objections.`} 
                />
              )}
              {audienceInfo && (
                <DetailItem 
                  icon={Users}
                  title="Your Target Audience" 
                  description={`You'll interact with AI reflecting the distinct needs, roles, and characteristics of '${audienceInfo}'.`} 
                />
              )}
              {salesEnvironment && (
                <DetailItem 
                  icon={Building}
                  title="Your Sales Environment" 
                  description={`Scenarios unfold in a realistic '${salesEnvironment}' context, influencing conversation dynamics and professional expectations.`} 
                />
              )}
              {salesStyle && (
                <DetailItem 
                  icon={BarChart3}
                  title="Your Sales Style" 
                  description={`The AI adapts to your '${salesStyle}' approach, providing targeted practice and feedback on your chosen methodology.`} 
                />
              )}
            </div>
          </SectionWrapper>

          <SectionWrapper className="bg-white">
            <SectionTitle icon={ShieldCheck} title="What to Expect in Roleplays" iconColorClass="text-emerald-600" />
            <div className="text-center max-w-xl mx-auto px-4 space-y-3">
              <p className="text-md text-gray-700 leading-relaxed">Prepare for dynamic, unscripted interactions where AI personas have unique objectives, ask insightful questions, and present realistic challenges directly relevant to your field.</p>
              <p className="text-md text-gray-700 leading-relaxed">Sessions are crafted for comprehensive practice, typically lasting <strong className="text-blue-600 font-semibold">5-10 minutes</strong>, ensuring meaningful engagement and actionable feedback.</p>
            </div>
          </SectionWrapper>

          <SectionWrapper className="bg-blue-50">
            <SectionTitle icon={Clock} title="Your Access & The Path Ahead" iconColorClass="text-blue-600" />
            <div className="text-center max-w-lg mx-auto px-4">
            {userAccountStatus === 'free' && (
              <p className="text-md text-gray-700 leading-relaxed">
                On our <strong className="font-semibold">Free Plan</strong>, you get <strong className="font-semibold text-blue-600">5 full personalized roleplays each month</strong>. It's a great way to hone key skills! For unlimited access, longer scenarios, and advanced features, consider <a href="/pricing" className="text-blue-600 hover:text-blue-700 font-semibold underline">upgrading to Premium</a>.
              </p>
            )}
            {userAccountStatus === 'premium' && (
              <p className="text-md text-gray-700 leading-relaxed">
                As a <strong className="font-semibold text-blue-600">Premium Member</strong>, you enjoy <strong className="font-semibold">unlimited access</strong> to our full suite of personalized roleplays. Dive deep, explore diverse scenarios, and master every conversation!
              </p>
            )}
            </div>
          </SectionWrapper>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-4 p-6 md:p-8 bg-gray-100 border-t border-gray-200">
          <Button onClick={onExploreDashboard} size="lg" className="w-full sm:w-auto sm:min-w-[280px] text-lg py-4 shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <ChevronRight className="mr-2.5 h-6 w-6" /> Continue to My Dashboard
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ExcitementCard; 