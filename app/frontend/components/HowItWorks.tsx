import React from 'react';
// Using Phosphor icons again for consistency
import { UserCircle, Chats, ChartBar } from "@phosphor-icons/react";

const steps = [
  {
    icon: <UserCircle size={32} className="text-red-600 mb-3" weight="light" />,
    title: "1. Build Your Profile",
    description: "Personalize your AI trainer with your unique goals & sales context.",
    gridPosition: "md:col-start-1 md:row-start-1 md:justify-self-end",
  },
  {
    icon: <Chats size={32} className="text-red-600 mb-3" weight="light" />,
    title: "2. Practice Roleplays",
    description: "Engage in dynamic, realistic scenarios with AI buyers.",
    gridPosition: "md:col-start-2 md:row-start-2 md:justify-self-center",
  },
  {
    icon: <ChartBar size={32} className="text-red-600 mb-3" weight="light" />,
    title: "3. Get Actionable Feedback",
    description: "Receive instant insights, identify key moments & track growth.",
    gridPosition: "md:col-start-1 md:row-start-3 md:justify-self-end",
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Ready in <span className="text-red-600">3 Simple Steps</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Go from setup to skills mastery with our intuitive process.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 md:grid-rows-3 gap-x-16 gap-y-8 items-center md:min-h-[400px]">
          
          <svg 
            className="hidden md:block absolute top-0 left-0 w-full h-full" 
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
            style={{ zIndex: 0 }} 
          >
            <path 
              d="M 40 20 C 60 20, 70 40, 65 55 S 50 80, 40 75 C 30 70, 30 50, 45 50"
              stroke="#F87171"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              fill="none" 
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`relative z-10 flex-1 max-w-sm bg-white rounded-lg p-6 shadow-xl text-center flex flex-col items-center border border-gray-200 transform transition duration-300 ease-in-out hover:scale-105 hover:shadow-2xl ${step.gridPosition} opacity-0 animate-fade-in`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="mb-3">
                {step.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">{step.title}</h3>
              <p className="text-base text-gray-600 flex-grow">{step.description}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-700 mt-16 font-medium">
          Start mastering your pitch today!
        </p>
      </div>
    </section>
  );
};

export default HowItWorks; 