import React from "react";
import { Check, X } from "lucide-react";

const ComparisonSection: React.FC = () => {
  const comparisons = [
    {
      feature: "Setup Time",
      chatgpt: "1 min (prompting)",
      enterprise: "Days/weeks",
      pitchiq: "0 seconds"
    },
    {
      feature: "Monthly Cost",
      chatgpt: "$20",
      enterprise: "$10,000+",
      pitchiq: "$79"
    },
    {
      feature: "Voice Calls",
      chatgpt: "Basic",
      enterprise: "Yes",
      pitchiq: "Real-time"
    },
    {
      feature: "Challenging Prospects",
      chatgpt: false,
      enterprise: "Custom",
      pitchiq: true
    },
    {
      feature: "Specific Coaching",
      chatgpt: "Generic",
      enterprise: "Team reports",
      pitchiq: "Personal"
    },
    {
      feature: "Built for Consultants",
      chatgpt: false,
      enterprise: false,
      pitchiq: true
    },
    {
      feature: "No Team Required",
      chatgpt: true,
      enterprise: false,
      pitchiq: true
    }
  ];

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 font-outfit text-gray-900">
            Why PitchIQ?
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Not another chatbot. Not another enterprise tool. Built for solo sellers who need to practice.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border border-black rounded-lg">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 border-b border-black">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-600 border-b border-black">ChatGPT</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-600 border-b border-black">Enterprise Tools</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-pitchiq-red border-b border-black bg-red-50">PitchIQ</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-b border-gray-200">
                      {item.feature}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600 border-b border-gray-200">
                      {typeof item.chatgpt === "boolean" ? (
                        item.chatgpt ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 mx-auto" />
                        )
                      ) : (
                        item.chatgpt
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center text-gray-600 border-b border-gray-200">
                      {typeof item.enterprise === "boolean" ? (
                        item.enterprise ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 mx-auto" />
                        )
                      ) : (
                        item.enterprise
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold border-b border-gray-200 bg-red-50">
                      {typeof item.pitchiq === "boolean" ? (
                        item.pitchiq ? (
                          <Check className="w-5 h-5 text-pitchiq-red mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 mx-auto" />
                        )
                      ) : (
                        <span className="text-pitchiq-red">{item.pitchiq}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-6">
            {comparisons.map((item, index) => (
              <div key={index} className="bg-white border border-black rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-3">{item.feature}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ChatGPT:</span>
                    <span className="text-sm font-medium">
                      {typeof item.chatgpt === "boolean" ? (
                        item.chatgpt ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )
                      ) : (
                        item.chatgpt
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Enterprise:</span>
                    <span className="text-sm font-medium">
                      {typeof item.enterprise === "boolean" ? (
                        item.enterprise ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )
                      ) : (
                        item.enterprise
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-red-50 -mx-4 px-4 py-2 rounded">
                    <span className="text-sm font-bold text-pitchiq-red">PitchIQ:</span>
                    <span className="text-sm font-bold text-pitchiq-red">
                      {typeof item.pitchiq === "boolean" ? (
                        item.pitchiq ? (
                          <Check className="w-4 h-4 text-pitchiq-red" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )
                      ) : (
                        item.pitchiq
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            <strong>The bottom line:</strong> If you're a solo consultant selling to small businesses or individuals, 
            you don't need a $10K enterprise tool. You need PitchIQ.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
