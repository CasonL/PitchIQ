
import { MessageCircle, Clock, BadgeCheck } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <Clock className="w-10 h-10 text-pitchiq-blue-600" />,
      title: "Practice Anytime",
      description: "No need to schedule. Practice your sales pitch whenever you have time, day or night."
    },
    {
      icon: <MessageCircle className="w-10 h-10 text-pitchiq-teal-600" />,
      title: "Realistic AI Personas",
      description: "Interact with AI characters that behave like real prospects in various industries."
    },
    {
      icon: <BadgeCheck className="w-10 h-10 text-pitchiq-orange-500" />,
      title: "Actionable Feedback",
      description: "Get personalized insights on your performance and clear steps to improve."
    }
  ];

  return (
    <section id="features" className="py-16 bg-gray-50">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">Features</span> to Boost Your Sales Skills
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Our platform is designed to help you improve your sales skills through practice and feedback.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
