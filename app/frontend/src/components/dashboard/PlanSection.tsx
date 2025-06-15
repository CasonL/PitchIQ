import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, BarChart3, Users, Check, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface SubscriptionStatus {
  tier: string;
  is_premium: boolean;
  monthly_roleplays_used: number;
  monthly_roleplay_limit: number | string;
  can_use_roleplays: boolean;
  total_roleplays: number;
  premium_features: {
    advanced_coaching: boolean;
    unlimited_roleplays: boolean;
    detailed_analytics: boolean;
  };
}

interface PlanSectionProps {
  className?: string;
}

const PlanSection: React.FC<PlanSectionProps> = ({ className = "" }) => {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get('/auth/api/subscription/status');
      if (response.data.success) {
        setSubscription(response.data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const response = await axios.post('/auth/api/subscription/upgrade');
      if (response.data.success) {
        setSubscription(response.data.subscription);
      }
    } catch (error) {
      console.error('Error upgrading subscription:', error);
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const isPremium = subscription.is_premium;
  const usagePercentage = subscription.monthly_roleplay_limit !== 'unlimited' 
    ? (subscription.monthly_roleplays_used / (subscription.monthly_roleplay_limit as number)) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`${className} ${isPremium ? 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50' : 'border-gray-200'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPremium ? (
                <Crown className="h-6 w-6 text-yellow-600" />
              ) : (
                <Zap className="h-6 w-6 text-blue-600" />
              )}
              <div>
                <CardTitle className="text-lg">
                  {isPremium ? 'Premium Plan' : 'Free Plan'}
                </CardTitle>
                <CardDescription>
                  {isPremium ? 'Unlimited access to all features' : 'Basic access with monthly limits'}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isPremium ? "default" : "secondary"} className={isPremium ? "bg-yellow-600" : ""}>
              {isPremium ? '$19/month' : 'Free'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Usage Stats */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Monthly Roleplays</span>
              <span>
                {subscription.monthly_roleplays_used} / {subscription.monthly_roleplay_limit}
              </span>
            </div>
            {!isPremium && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usagePercentage > 80 ? 'bg-red-500' : usagePercentage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Features</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Check className={`h-4 w-4 ${subscription.premium_features.unlimited_roleplays ? 'text-green-500' : 'text-gray-400'}`} />
                <span>Unlimited Roleplays</span>
                {!subscription.premium_features.unlimited_roleplays && <Badge variant="outline" className="text-xs">Premium</Badge>}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className={`h-4 w-4 ${subscription.premium_features.advanced_coaching ? 'text-green-500' : 'text-gray-400'}`} />
                <span>Advanced AI Coaching</span>
                {!subscription.premium_features.advanced_coaching && <Badge variant="outline" className="text-xs">Premium</Badge>}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className={`h-4 w-4 ${subscription.premium_features.detailed_analytics ? 'text-green-500' : 'text-gray-400'}`} />
                <span>Detailed Analytics</span>
                {!subscription.premium_features.detailed_analytics && <Badge variant="outline" className="text-xs">Premium</Badge>}
              </div>
            </div>
          </div>
        </CardContent>

        {!isPremium && (
          <CardFooter>
            <Button 
              onClick={handleUpgrade}
              disabled={upgrading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {upgrading ? (
                "Upgrading..."
              ) : (
                <>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Upgrade to Premium - $19/month
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
};

export default PlanSection; 