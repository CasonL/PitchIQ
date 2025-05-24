
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      description: "For individuals just getting started",
      priceMonthly: 19,
      priceAnnual: 15,
      features: [
        "5 AI practice sessions / month",
        "Basic feedback analysis",
        "3 AI personas",
        "Email support"
      ],
      cta: "Start Free Trial",
      highlight: false,
    },
    {
      name: "Professional",
      description: "For serious sales professionals",
      priceMonthly: 49,
      priceAnnual: 39,
      features: [
        "25 AI practice sessions / month",
        "Advanced feedback analysis",
        "10 AI personas",
        "Priority email support",
        "Performance tracking"
      ],
      cta: "Start Free Trial",
      highlight: true,
    },
    {
      name: "Team",
      description: "For small teams and businesses",
      priceMonthly: 99,
      priceAnnual: 79,
      features: [
        "Unlimited AI practice sessions",
        "Comprehensive feedback analysis",
        "All AI personas",
        "Priority support",
        "Team performance analytics",
        "Custom scenarios"
      ],
      cta: "Contact Sales",
      highlight: false,
    }
  ];

  return (
    <section id="pricing" className="py-16 bg-gray-50">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">Simple</span> Pricing for Everyone
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Choose the plan that works best for you or your team.
          </p>

          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center p-1 bg-gray-100 rounded-full">
              <button
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  isAnnual
                    ? "bg-white shadow-sm text-gray-800"
                    : "text-gray-600"
                }`}
                onClick={() => setIsAnnual(true)}
              >
                Annual <span className="text-pitchiq-teal-600">(Save 20%)</span>
              </button>
              <button
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  !isAnnual
                    ? "bg-white shadow-sm text-gray-800"
                    : "text-gray-600"
                }`}
                onClick={() => setIsAnnual(false)}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl overflow-hidden border ${
                plan.highlight
                  ? "border-pitchiq-blue-500 shadow-lg shadow-blue-100"
                  : "border-gray-200 shadow-sm"
              } transition-all hover:shadow-md`}
            >
              {plan.highlight && (
                <div className="bg-pitchiq-blue-600 text-white text-sm font-medium text-center py-1">
                  Most Popular
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-gray-500 mb-4">{plan.description}</p>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl md:text-4xl font-bold">
                    ${isAnnual ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  <span className="text-gray-500 ml-2">/mo</span>
                </div>
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center">
                      <Check className="h-5 w-5 text-pitchiq-teal-600 mr-3 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className={`w-full ${
                    plan.highlight
                      ? "bg-pitchiq-blue-600 hover:bg-pitchiq-blue-700"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <Link to="/chat">{plan.cta}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
