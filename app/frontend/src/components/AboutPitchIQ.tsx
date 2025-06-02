import React from 'react';

const AboutPitchIQ = () => {
  return (
    <section id="about-pitchiq" className="py-16 md:py-20 lg:py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-outfit font-bold text-gray-800 mb-10 md:mb-12">
          What is PitchIQ?
        </h2>

        <div className="space-y-6 text-left sm:text-center">
          <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed font-outfit">
            PitchIQ is your AI-powered sales coach, designed for entrepreneurs, startups, and freelancers. Stop sales guesswork and start practicing realistic sales scenarios 24/7. Get instant, personalized feedback to uncover deep buyer needs, refine your pitch, and close more deals.
          </p>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed font-outfit font-semibold">
            Be among the first to transform your sales approach. <span className="text-pitchiq-red">Join the PitchIQ waitlist today</span> for early access and to lock in founder-only benefits.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutPitchIQ; 