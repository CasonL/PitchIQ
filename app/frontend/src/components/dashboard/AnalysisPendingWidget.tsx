import React from 'react';
import { Loader2 } from 'lucide-react';

interface AnalysisPendingWidgetProps {
  message?: string;
}

const AnalysisPendingWidget: React.FC<AnalysisPendingWidgetProps> = ({
  message = "Your AI-powered analysis is being generated...",
}) => {
  return (
    <div className="bg-white p-8 rounded-xl shadow-lg text-center my-6 w-full max-w-md mx-auto border border-gray-200/80">
      <Loader2 size={36} className="mx-auto mb-5 text-blue-500 animate-spin" />
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        Processing Your Insights
      </h3>
      <p className="text-gray-600 text-sm leading-relaxed">
        {message}
      </p>
    </div>
  );
};

export default AnalysisPendingWidget; 