import React from 'react';

// Assuming interfaces from Dashboard.tsx are accessible or redefined here if necessary
// For simplicity, let's redefine them or use a more generic structure for the placeholder

interface InsightAction {
  id: string;
  label: string;
  icon: string;
}

interface BaseInsightCardData {
  id: string;
  explanation: string;
  detailedExplanation?: string;
  actions: InsightAction[];
  score?: number;
  trend?: string;
}

interface SkillsInsightData extends BaseInsightCardData {
  skillArea: string;
}

interface CallInsightData extends BaseInsightCardData {
  callId?: number;
  callSegment?: { start: string; end: string; transcript: string; };
}

interface ChallengeInsightData extends BaseInsightCardData {
  challengeType: string;
  difficulty?: string;
  estimatedTime?: string;
}

interface AIInsightsApiResponse {
  skills_insights: SkillsInsightData | null;
  call_insights: CallInsightData | null;
  challenge_insights: ChallengeInsightData | null;
  priority_card: string | null;
}

interface AICardSystemProps {
  data: AIInsightsApiResponse | null;
  loading: boolean;
  error: string | null;
}

const AICard: React.FC<{ title: string; insight: BaseInsightCardData | null; type: string }> = ({ title, insight, type }) => {
  if (!insight) {
    return (
      <div className="p-3 border rounded-md bg-gray-100">
        <h3 className="text-md font-semibold text-gray-600">{title}</h3>
        <p className="text-sm text-gray-500">No {type} insight available at the moment.</p>
      </div>
    );
  }
  return (
    <div className="p-3 border rounded-md bg-white shadow-sm">
      <h3 className="text-md font-semibold text-indigo-700">{title} ({type})</h3>
      <p className="text-sm text-gray-700 mt-1">{insight.explanation}</p>
      {insight.detailedExplanation && <p className="text-xs text-gray-500 mt-1">{insight.detailedExplanation}</p>}
      {insight.score && <p className="text-sm mt-1">Score: {insight.score} {insight.trend && `(${insight.trend})`}</p>}
      <div className="mt-2 space-x-2">
        {insight.actions.map(action => (
          <button key={action.id} className="px-2 py-1 text-xs bg-indigo-500 text-white rounded hover:bg-indigo-600">
            {action.icon} {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const AICardSystem: React.FC<AICardSystemProps> = ({ data, loading, error }) => {
  if (loading) return <div className="p-4 border rounded-lg shadow bg-gray-50 text-gray-700">Loading AI Insights...</div>;
  if (error) return <div className="p-4 border rounded-lg shadow bg-red-50 text-red-700">Error loading AI Insights: {error}</div>;
  if (!data) return <div className="p-4 border rounded-lg shadow bg-yellow-50 text-yellow-700">No AI Insights data available.</div>;

  // Determine which card is the priority
  let priorityInsight: React.ReactNode = null;
  if (data.priority_card === 'skills' && data.skills_insights) {
    priorityInsight = <AICard title="🌟 Priority: Skills Focus" insight={data.skills_insights} type="Skills" />;
  } else if (data.priority_card === 'calls' && data.call_insights) {
    priorityInsight = <AICard title="🌟 Priority: Call Insight" insight={data.call_insights} type="Call" />;
  } else if (data.priority_card === 'challenges' && data.challenge_insights) {
    priorityInsight = <AICard title="🌟 Priority: Next Challenge" insight={data.challenge_insights} type="Challenge" />;
  }

  return (
    <div className="p-4 border rounded-lg shadow bg-white">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">AI Card System</h2>
      <div className="space-y-3">
        {priorityInsight && <div className="mb-4 p-2 bg-indigo-50 rounded-lg">{priorityInsight}</div>}
        
        <AICard title="Skills Focus" insight={data.skills_insights} type="Skills" />
        <AICard title="Call Insight" insight={data.call_insights} type="Call" />
        <AICard title="Next Challenge" insight={data.challenge_insights} type="Challenge" />
      </div>
      <p className="mt-3 text-sm text-gray-500 text-center">Displaying placeholder AI insight cards. Interactive features coming soon.</p>
    </div>
  );
};

export default AICardSystem; 