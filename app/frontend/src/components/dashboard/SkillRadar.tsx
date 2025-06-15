import React from 'react';

interface SkillRadarData {
  rapport: number;
  discovery: number;
  presentation: number;
  objection_handling: number;
  closing: number;
}

interface SkillRadarProps {
  data: SkillRadarData | null;
  loading: boolean;
  error: string | null;
}

const SkillRadar: React.FC<SkillRadarProps> = ({ data, loading, error }) => {
  if (loading) return <div className="p-4 border rounded-lg shadow bg-gray-50 text-gray-700">Loading Skill Radar...</div>;
  if (error) return <div className="p-4 border rounded-lg shadow bg-red-50 text-red-700">Error loading Skill Radar: {error}</div>;
  if (!data) return <div className="p-4 border rounded-lg shadow bg-yellow-50 text-yellow-700">No Skill Radar data available.</div>;

  const skills = Object.entries(data).map(([skill, score]) => ({
    name: skill.charAt(0).toUpperCase() + skill.slice(1).replace('_', ' '),
    score: score,
  }));

  return (
    <div className="p-4 border rounded-lg shadow bg-white">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">Skill Radar</h2>
      <ul className="space-y-2">
        {skills.map(skill => (
          <li key={skill.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-gray-700 font-medium">{skill.name}</span>
            <span className="text-lg font-semibold text-indigo-600">{skill.score}/100</span>
          </li>
        ))}
      </ul>
      {/* Placeholder for actual radar chart visualization */}
      <p className="mt-3 text-sm text-gray-500 text-center">Radar chart visualization coming soon!</p>
    </div>
  );
};

export default SkillRadar; 