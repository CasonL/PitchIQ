/**
 * Prospect Scoring Debug Panel
 * 
 * Intelligent debugging UI for prospect scoring system.
 * Shows real-time scores, behavior tiers, events, and coaching insights.
 */

import React, { useState, useEffect, useRef } from 'react';
import { prospectScoringService, ProspectScores, BehaviorUpdate, CoachingInsights } from '../../services/ProspectScoringService';

interface DebugEvent {
  timestamp: number;
  type: string;
  description: string;
  delta: number;
  metric: string;
  scores: ProspectScores;
  behaviorTier: string;
  contextText?: string; // The sentence/paragraph that triggered this event
}

interface ProspectScoringDebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  sessionId?: string;
  personaId?: string;
}

export const ProspectScoringDebugPanel: React.FC<ProspectScoringDebugPanelProps> = ({
  isVisible,
  onToggle,
  sessionId,
  personaId
}) => {
  const [currentScores, setCurrentScores] = useState<ProspectScores | null>(null);
  const [behaviorUpdate, setBehaviorUpdate] = useState<BehaviorUpdate | null>(null);
  const [coachingInsights, setCoachingInsights] = useState<CoachingInsights | null>(null);
  const [eventHistory, setEventHistory] = useState<DebugEvent[]>([]);
  const [availableEvents, setAvailableEvents] = useState<Record<string, any>>({});
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const eventHistoryRef = useRef<HTMLDivElement>(null);

  // Auto-refresh data every 2 seconds when active
  useEffect(() => {
    const active = prospectScoringService.isSessionActive();
    if (autoRefresh && isVisible && active) {
      // Ensure an immediate refresh when session becomes active
      refreshData();
      if (!refreshInterval.current) {
        refreshInterval.current = setInterval(refreshData, 2000);
      }
    } else {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
        refreshInterval.current = null;
      }
    };
  }, [autoRefresh, isVisible, isSessionActive]);

  // Initial data load
  useEffect(() => {
    if (isVisible) {
      refreshData();
      loadAvailableEvents();
    }
  }, [isVisible]);

  const refreshData = async () => {
    try {
      setIsSessionActive(prospectScoringService.isSessionActive());
      
      if (prospectScoringService.isSessionActive()) {
        // Get current scores and behavior
        const scoresData = await prospectScoringService.getCurrentScores();
        if (scoresData) {
          setCurrentScores(scoresData.scores);
          setBehaviorUpdate(scoresData.behavior_update);
        }

        // Get coaching insights
        const insights = await prospectScoringService.getCoachingInsights();
        if (insights) {
          setCoachingInsights(insights);
          
          // Update event history with new events
          const newEvents = insights.critical_moments.concat(insights.reward_events, insights.penalty_events)
            .map(event => ({
              timestamp: Date.now(),
              type: event.event_type,
              description: event.description,
              delta: event.delta,
              metric: event.metric,
              scores: scoresData?.scores || currentScores || { rapport: 0, trust: 0, interest: 0, last_updated: 0 },
              behaviorTier: scoresData?.behavior_update.behavior_tier || 'neutral',
              contextText: event.context_text
            }));
          
          setEventHistory(prev => {
            const combined = [...prev, ...newEvents];
            return combined.slice(-50); // Keep last 50 events
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing debug data:', error);
    }
  };

  const loadAvailableEvents = async () => {
    try {
      const events = await prospectScoringService.getAvailableEvents();
      if (events) {
        setAvailableEvents(events);
      }
    } catch (error) {
      console.error('Error loading available events:', error);
    }
  };

  const handleManualEvent = async (eventType: string) => {
    try {
      await prospectScoringService.recordEvent(eventType, { manual: true, timestamp: Date.now() });
      refreshData(); // Refresh immediately after manual event
    } catch (error) {
      console.error('Error recording manual event:', error);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return '#10B981'; // Green
    if (score >= 50) return '#F59E0B'; // Yellow
    if (score >= 30) return '#EF4444'; // Red
    return '#6B7280'; // Gray
  };

  const getBehaviorTierColor = (tier: string): string => {
    switch (tier) {
      case 'enthusiastic': return '#10B981';
      case 'engaged': return '#3B82F6';
      case 'neutral': return '#F59E0B';
      case 'guarded': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const toggleEventExpansion = (eventIndex: number) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventIndex)) {
        newSet.delete(eventIndex);
      } else {
        newSet.add(eventIndex);
      }
      return newSet;
    });
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors z-50"
      >
        🐛 Debug Scoring
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold">🐛 Prospect Scoring Debug Panel</h2>
            <div className={`px-3 py-1 rounded-full text-sm ${isSessionActive ? 'bg-green-600' : 'bg-red-600'}`}>
              {isSessionActive ? '🟢 Active' : '🔴 Inactive'}
            </div>
            {sessionId && (
              <div className="text-sm text-gray-300">
                Session: {sessionId.substring(0, 8)}...
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh</span>
            </label>
            <button
              onClick={refreshData}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
            >
              🔄 Refresh
            </button>
            <button
              onClick={onToggle}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Current Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">📊 Current Scores</h3>
              {currentScores ? (
                <div className="space-y-3">
                  {Object.entries(currentScores).filter(([key]) => key !== 'last_updated').map(([metric, score]) => (
                    <div key={metric} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{metric}:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${score}%`,
                              backgroundColor: getScoreColor(score as number)
                            }}
                          />
                        </div>
                        <span
                          className="font-bold text-sm"
                          style={{ color: getScoreColor(score as number) }}
                        >
                          {(score as number).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No scoring data available</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">🎭 Behavior Tier</h3>
              {behaviorUpdate ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <div
                      className="inline-block px-4 py-2 rounded-full text-white font-bold text-lg capitalize"
                      style={{ backgroundColor: getBehaviorTierColor(behaviorUpdate.behavior_tier) }}
                    >
                      {behaviorUpdate.behavior_tier}
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Response Style:</strong> {behaviorUpdate.instructions.response_style}</p>
                    <p><strong>Engagement:</strong> {behaviorUpdate.instructions.engagement_level}</p>
                    <p><strong>Questions:</strong> {behaviorUpdate.instructions.question_frequency}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No behavior data available</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">📈 Session Stats</h3>
              {coachingInsights ? (
                <div className="space-y-2 text-sm">
                  <p><strong>Total Events:</strong> {coachingInsights.total_events}</p>
                  <p><strong>Duration:</strong> {Math.round(coachingInsights.session_duration / 60)}m</p>
                  <p><strong>Rewards:</strong> <span className="text-green-600">{coachingInsights.reward_events.length}</span></p>
                  <p><strong>Penalties:</strong> <span className="text-red-600">{coachingInsights.penalty_events.length}</span></p>
                  <p><strong>Critical:</strong> <span className="text-orange-600">{coachingInsights.critical_moments.length}</span></p>
                </div>
              ) : (
                <p className="text-gray-500">No session data available</p>
              )}
            </div>
          </div>

          {/* Manual Event Triggers */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">🎮 Manual Event Triggers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(availableEvents).map(([eventType, config]) => (
                <button
                  key={eventType}
                  onClick={() => handleManualEvent(eventType)}
                  disabled={!isSessionActive}
                  className={`p-2 rounded text-sm font-medium transition-colors ${
                    !isSessionActive
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : config.delta > 0
                      ? 'bg-green-100 text-green-800 hover:bg-green-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                  title={config.description}
                >
                  {config.delta > 0 ? '➕' : '➖'} {eventType.replace(/_/g, ' ')}
                  <div className="text-xs opacity-75">
                    {config.delta > 0 ? '+' : ''}{config.delta} {config.metric}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Event History */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">📝 Recent Events</h3>
            <div
              ref={eventHistoryRef}
              className="max-h-60 overflow-y-auto space-y-2"
            >
              {eventHistory.length > 0 ? (
                eventHistory.slice().reverse().map((event, index) => {
                  const isExpanded = expandedEvents.has(index);
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded border-l-4 ${
                        event.delta > 0
                          ? 'bg-green-50 border-green-400'
                          : 'bg-red-50 border-red-400'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm">
                              {event.delta > 0 ? '➕' : '➖'} {event.type.replace(/_/g, ' ')}
                            </div>
                            {event.contextText && (
                              <button
                                onClick={() => toggleEventExpansion(index)}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                title="Show/hide triggering text"
                              >
                                {isExpanded ? '📄 Hide Context' : '📄 Show Context'}
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {event.description}
                          </div>
                          {isExpanded && event.contextText && (
                            <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                              <div className="text-xs font-medium text-gray-700 mb-1">
                                Triggering Text:
                              </div>
                              <div className="text-xs text-gray-800 italic">
                                "{event.contextText}"
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{formatTimestamp(event.timestamp)}</div>
                          <div className="font-medium capitalize">
                            {event.behaviorTier}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-4">No events recorded yet</p>
              )}
            </div>
          </div>

          {/* Behavior Instructions */}
          {behaviorUpdate && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">🤖 Current AI Instructions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Core Instructions:</h4>
                  <ul className="space-y-1 text-gray-700">
                    <li><strong>Style:</strong> {behaviorUpdate.instructions.response_style}</li>
                    <li><strong>Questions:</strong> {behaviorUpdate.instructions.question_frequency}</li>
                    <li><strong>Engagement:</strong> {behaviorUpdate.instructions.engagement_level}</li>
                    <li><strong>Phrases:</strong> {behaviorUpdate.instructions.signature_phrases}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Score Modifiers:</h4>
                  <ul className="space-y-1 text-gray-700">
                    {behaviorUpdate.instructions.rapport_modifier && (
                      <li><strong>Rapport:</strong> {behaviorUpdate.instructions.rapport_modifier}</li>
                    )}
                    {behaviorUpdate.instructions.trust_modifier && (
                      <li><strong>Trust:</strong> {behaviorUpdate.instructions.trust_modifier}</li>
                    )}
                    {behaviorUpdate.instructions.interest_modifier && (
                      <li><strong>Interest:</strong> {behaviorUpdate.instructions.interest_modifier}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProspectScoringDebugPanel;
