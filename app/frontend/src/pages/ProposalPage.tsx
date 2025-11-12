import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const ProposalPage = () => {
  const { proposalId } = useParams<{ proposalId?: string }>();

  return (
    <>
      <Helmet>
        <title>Early-Stage Sales Insight Pilot - PitchIQ</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto px-8 py-16">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-black mb-3">
              PitchIQ: Early-Stage Sales Insight Pilot
            </h1>
            <div className="h-1 w-24 bg-red-600 rounded-full" />
          </div>

          {/* Problem Statement */}
          <div className="mb-10">
            <p className="text-lg text-gray-800 leading-relaxed mb-4">
              <span className="font-bold">The Reality</span><br />
              Founders spend most of their early days explaining what they're building and convincing early users to try something unfinished.
            </p>
            <p className="text-lg text-gray-800 leading-relaxed mb-6">
              <span className="font-bold">The Emotional Cost</span><br />
              These conversations are high-stakes and unpredictable by nature. Confidence swings. Messaging wobbles. The story shifts day to day.
            </p>
            <p className="text-lg text-gray-800 leading-relaxed mb-6">
              <span className="font-bold">What We're Testing</span><br />
              We're studying what happens when founders get to rehearse those conversations in a safe container, where they can experiment, recalibrate, and learn without embarrassment.
            </p>
            <div className="bg-gray-50 border-l-4 border-black p-6 rounded-r-lg">
              <p className="text-lg text-gray-900 leading-relaxed font-medium">
                PitchIQ isn't just software. It's practice, stability, and clarity <span className="font-bold">before the real conversations matter.</span>
              </p>
            </div>
          </div>

          {/* Overview */}
          <div className="mb-12">
            <p className="text-lg text-gray-800 leading-relaxed mb-6">
              We'd like to run a small pilot with a select group of FRV portfolio companies to understand:
            </p>
            <ul className="space-y-2 text-gray-800 mb-6 ml-6">
              <li className="flex items-start">
                <span className="text-red-600 font-bold mr-3 mt-1">•</span>
                <span>How founders are currently handling their early sales conversations</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 font-bold mr-3 mt-1">•</span>
                <span>Where deals tend to stall or fall apart</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 font-bold mr-3 mt-1">•</span>
                <span>What practical training patterns actually improve outcomes</span>
              </li>
            </ul>
              <p className="text-gray-900 font-semibold">
                The focus is shared learning, not software evaluation.
              </p>
           </div>

          {/* What Participation Looks Like */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-black mb-6">
              What Participation Looks Like
            </h2>
            
            <div className="space-y-6">
              <div className="border-l-4 border-black pl-6">
                <h3 className="font-bold text-black mb-2">
                  1. Initial Interview <span className="text-gray-500 font-normal">(20 minutes)</span>
                </h3>
                <p className="text-gray-700 mb-2">A short conversation exploring:</p>
                <ul className="space-y-1 text-gray-700 text-sm">
                  <li>• Current sales approach and confidence</li>
                  <li>• Typical objections or sticking points</li>
                  <li>• Where founders feel most uncertain in the selling process</li>
                </ul>
              </div>

              <div className="border-l-4 border-black pl-6">
                <h3 className="font-bold text-black mb-2">
                  2. Guided Trial <span className="text-gray-500 font-normal">(15 days)</span>
                </h3>
                <p className="text-gray-700 text-sm">
                  Founders are given access to PitchIQ, with customized practice scenarios designed based on the interview insights.
                </p>
              </div>

              <div className="border-l-4 border-black pl-6">
                <h3 className="font-bold text-black mb-2">
                  3. Results Conversation <span className="text-gray-500 font-normal">(20 minutes)</span>
                </h3>
                <p className="text-gray-700 mb-2">We look at:</p>
                <ul className="space-y-1 text-gray-700 text-sm">
                  <li>• Changes in confidence</li>
                  <li>• Clarity in communication</li>
                  <li>• Any early movement in conversion or qualification quality</li>
                </ul>
              </div>
            </div>
          </div>

          {/* What We Ask */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-black mb-4">
              What We Ask
            </h2>
            <div className="bg-black text-white p-6 rounded-lg">
              <p className="text-xl font-semibold mb-4">
                A small time commitment and real participation:
              </p>
              <ul className="space-y-2 text-white">
                <li className="flex items-start">
                  <span className="font-bold mr-3">•</span>
                  <span>20 minutes to start</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-3">•</span>
                  <span>15 days to practice</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-3">•</span>
                  <span>20 minutes to reflect together</span>
                </li>
              </ul>
            </div>
          </div>

          {/* What You Receive */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-black mb-4">
              What FRV & Founders Receive
            </h2>
            <ul className="space-y-3 text-gray-800">
              <li className="flex items-start">
                <span className="text-red-600 font-bold mr-3 mt-1">•</span>
                <span>Early access to a training approach tailored for first-time sellers</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 font-bold mr-3 mt-1">•</span>
                <span>Insight into what works (and what does not) across multiple founders</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 font-bold mr-3 mt-1">•</span>
                <span>A short insights brief FRV can share across future cohorts, identifying recurring patterns in early-stage sales struggles and what reduced them</span>
              </li>
            </ul>
          </div>

          {/* Next Step */}
          <div className="border-t-2 border-gray-200 pt-8">
            <h2 className="text-2xl font-bold text-black mb-4">
              Next Step
            </h2>
            <p className="text-lg text-gray-800 leading-relaxed">
              If you're open to the pilot, I'll send a shortlist of 8–10 FRV companies who are early in market conversations. You can simply select <span className="font-bold text-black">3–5</span> to participate.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>PitchIQ © 2025</p>
            <p className="mt-1">Confidential — For FRV Review</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProposalPage;
