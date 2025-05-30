import React from 'react';
import { Link } from 'react-router-dom'; // Assuming react-router-dom for navigation

const AboutPitchIQ = () => {
  return (
    <section id="about-pitchiq" className="py-16 md:py-20 lg:py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-outfit font-bold text-gray-800 mb-10 md:mb-12">
          About PitchIQ
        </h2>

        <div className="space-y-8 text-left">
          <div>
            <h3 className="text-xl sm:text-2xl font-outfit font-semibold text-gray-700 mb-3">
              What is PitchIQ?
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed font-outfit">
              PitchIQ is a cutting-edge AI-powered platform designed to revolutionize sales training. We provide hyper-personalized coaching and realistic buyer simulations to help sales professionals master their craft, uncover deep pain points, and close more deals.
            </p>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-outfit font-semibold text-gray-700 mb-3">
              From the Founder
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed font-outfit">
              As the founder, my vision is to empower every sales professional with the skills and confidence to excel. PitchIQ is born from a passion for leveraging technology to unlock human potential.
            </p>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-outfit font-semibold text-gray-700 mb-3">
              Investment Opportunity
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed font-outfit">
              PitchIQ represents a unique and compelling investment opportunity. We are proud of our lean operations, achieving a <strong className="text-pitchiq-red">0% burn rate</strong> while demonstrating significant market traction and growth potential in the rapidly expanding EdTech and SalesTech industries.
            </p>
          </div>
        </div>

        <div className="mt-12 md:mt-16">
          <Link
            to="/opportunities"
            className="inline-block bg-pitchiq-red hover:bg-red-700 text-white font-outfit font-semibold py-3 md:py-4 px-8 md:px-10 rounded-lg text-base sm:text-lg transition duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            Learn More About Opportunities
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AboutPitchIQ; 