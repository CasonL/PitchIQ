import React from 'react';

interface KeyMetricsData {
  sessions_count: number;
  training_time_hours: number;
  overall_score: number;
}

interface KeyMetricsProps {
  data: KeyMetricsData | null;
  loading: boolean;
  error: string | null;
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ data, loading, error }) => {
  if (loading) return <div className="p-4 border rounded-lg shadow bg-gray-50 text-gray-700">Loading Key Metrics...</div>;
  if (error) return <div className="p-4 border rounded-lg shadow bg-red-50 text-red-700">Error loading Key Metrics: {error}</div>;
  if (!data) return <div className="p-4 border rounded-lg shadow bg-yellow-50 text-yellow-700">No Key Metrics data available.</div>;

  return (
    <div className="p-4 border rounded-lg shadow bg-white">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">Key Metrics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-600 font-medium">Total Calls</p>
          <p className="text-2xl font-bold text-blue-800">{data.sessions_count}</p>
        </div>
        <div className="p-3 bg-green-50 rounded-md">
          <p className="text-sm text-green-600 font-medium">Training Time (hrs)</p>
          <p className="text-2xl font-bold text-green-800">{data.training_time_hours}</p>
        </div>
        <div className="p-3 bg-purple-50 rounded-md">
          <p className="text-sm text-purple-600 font-medium">Overall Score</p>
          <p className="text-2xl font-bold text-purple-800">{data.overall_score}/100</p>
        </div>
      </div>
    </div>
  );
};

export default KeyMetrics; 