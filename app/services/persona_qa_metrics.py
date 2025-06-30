"""
Persona Quality Assurance Metrics

This module provides metrics and analysis for persona effectiveness
as outlined in PERSONA_IMPROVEMENTS.md recommendations.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class PersonaQAMetrics:
    """Track and analyze persona effectiveness metrics."""
    
    def __init__(self):
        self.metrics_data = []
    
    def record_conversation_metrics(
        self,
        conversation_id: str,
        persona_data: Dict[str, Any],
        conversation_duration: float,
        message_count: int,
        user_satisfaction: Optional[int] = None,
        conversion_outcome: Optional[str] = None,
        additional_metrics: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Record metrics for a conversation with a persona.
        
        Args:
            conversation_id: Unique conversation identifier
            persona_data: The persona dictionary used
            conversation_duration: Duration in seconds
            message_count: Number of messages exchanged
            user_satisfaction: User satisfaction rating (1-5)
            conversion_outcome: 'converted', 'qualified', 'no_interest', 'follow_up'
            additional_metrics: Any additional metrics to track
        """
        metrics_record = {
            "conversation_id": conversation_id,
            "timestamp": datetime.now().isoformat(),
            "persona_shell_id": persona_data.get("shell_id", "unknown"),
            "persona_buyer_type": persona_data.get("buyer_type", "unknown"),
            "persona_emotional_state": persona_data.get("emotional_state", "unknown"),
            "persona_chattiness_level": persona_data.get("chattiness_level", "unknown"),
            "persona_industry_context": persona_data.get("industry_context", "unknown"),
            "conversation_duration_seconds": conversation_duration,
            "message_count": message_count,
            "messages_per_minute": (message_count / (conversation_duration / 60)) if conversation_duration > 0 else 0,
            "user_satisfaction": user_satisfaction,
            "conversion_outcome": conversion_outcome,
            "additional_metrics": additional_metrics or {}
        }
        
        self.metrics_data.append(metrics_record)
        logger.info(f"Recorded persona metrics for conversation {conversation_id}")
    
    def analyze_persona_effectiveness(
        self,
        time_period_days: int = 30,
        persona_filter: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Analyze persona effectiveness over a time period.
        
        Args:
            time_period_days: Number of days to analyze
            persona_filter: Filter criteria (e.g., {'buyer_type': 'Emotional'})
            
        Returns:
            Dictionary with analysis results
        """
        cutoff_date = datetime.now() - timedelta(days=time_period_days)
        
        # Filter data by time period
        filtered_data = [
            record for record in self.metrics_data
            if datetime.fromisoformat(record["timestamp"]) >= cutoff_date
        ]
        
        # Apply persona filter if provided
        if persona_filter:
            for key, value in persona_filter.items():
                filtered_data = [
                    record for record in filtered_data
                    if record.get(f"persona_{key}") == value
                ]
        
        if not filtered_data:
            return {"error": "No data found for the specified criteria"}
        
        # Calculate metrics
        total_conversations = len(filtered_data)
        avg_duration = sum(r["conversation_duration_seconds"] for r in filtered_data) / total_conversations
        avg_message_count = sum(r["message_count"] for r in filtered_data) / total_conversations
        avg_messages_per_minute = sum(r["messages_per_minute"] for r in filtered_data) / total_conversations
        
        # Satisfaction metrics (if available)
        satisfaction_scores = [r["user_satisfaction"] for r in filtered_data if r["user_satisfaction"] is not None]
        avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else None
        
        # Conversion metrics
        conversion_outcomes = [r["conversion_outcome"] for r in filtered_data if r["conversion_outcome"] is not None]
        conversion_stats = {}
        if conversion_outcomes:
            for outcome in set(conversion_outcomes):
                conversion_stats[outcome] = conversion_outcomes.count(outcome)
        
        # Persona type breakdown
        persona_breakdown = {}
        for record in filtered_data:
            buyer_type = record["persona_buyer_type"]
            if buyer_type not in persona_breakdown:
                persona_breakdown[buyer_type] = {
                    "count": 0,
                    "avg_duration": 0,
                    "avg_satisfaction": 0,
                    "satisfaction_count": 0
                }
            persona_breakdown[buyer_type]["count"] += 1
            persona_breakdown[buyer_type]["avg_duration"] += record["conversation_duration_seconds"]
            if record["user_satisfaction"]:
                persona_breakdown[buyer_type]["avg_satisfaction"] += record["user_satisfaction"]
                persona_breakdown[buyer_type]["satisfaction_count"] += 1
        
        # Calculate averages for persona breakdown
        for buyer_type in persona_breakdown:
            data = persona_breakdown[buyer_type]
            data["avg_duration"] = data["avg_duration"] / data["count"]
            if data["satisfaction_count"] > 0:
                data["avg_satisfaction"] = data["avg_satisfaction"] / data["satisfaction_count"]
            else:
                data["avg_satisfaction"] = None
        
        return {
            "time_period_days": time_period_days,
            "total_conversations": total_conversations,
            "avg_conversation_duration_seconds": avg_duration,
            "avg_conversation_duration_minutes": avg_duration / 60,
            "avg_message_count": avg_message_count,
            "avg_messages_per_minute": avg_messages_per_minute,
            "avg_user_satisfaction": avg_satisfaction,
            "conversion_outcomes": conversion_stats,
            "persona_type_breakdown": persona_breakdown,
            "engagement_score": self._calculate_engagement_score(avg_duration, avg_message_count),
            "quality_indicators": self._identify_quality_indicators(filtered_data)
        }
    
    def _calculate_engagement_score(self, avg_duration: float, avg_message_count: float) -> float:
        """
        Calculate an engagement score based on duration and message count.
        
        Higher scores indicate more engaging personas.
        """
        # Normalize duration (target: 10 minutes = 600 seconds)
        duration_score = min(avg_duration / 600, 1.0)
        
        # Normalize message count (target: 20 messages)
        message_score = min(avg_message_count / 20, 1.0)
        
        # Weighted average (duration slightly more important)
        engagement_score = (duration_score * 0.6) + (message_score * 0.4)
        return round(engagement_score, 3)
    
    def _identify_quality_indicators(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Identify quality indicators from the conversation data."""
        indicators = {
            "high_engagement_personas": [],
            "low_engagement_personas": [],
            "most_effective_buyer_types": [],
            "recommendations": []
        }
        
        # Find personas with high engagement (duration > 8 minutes)
        high_engagement = [r for r in data if r["conversation_duration_seconds"] > 480]
        if high_engagement:
            high_engagement_types = [r["persona_buyer_type"] for r in high_engagement]
            indicators["high_engagement_personas"] = list(set(high_engagement_types))
        
        # Find personas with low engagement (duration < 3 minutes)
        low_engagement = [r for r in data if r["conversation_duration_seconds"] < 180]
        if low_engagement:
            low_engagement_types = [r["persona_buyer_type"] for r in low_engagement]
            indicators["low_engagement_personas"] = list(set(low_engagement_types))
        
        # Generate recommendations
        if indicators["low_engagement_personas"]:
            indicators["recommendations"].append(
                f"Consider adjusting personas of type {indicators['low_engagement_personas']} to be more engaging"
            )
        
        if len(high_engagement) / len(data) > 0.7:
            indicators["recommendations"].append("Overall persona engagement is high - good job!")
        elif len(low_engagement) / len(data) > 0.3:
            indicators["recommendations"].append("Consider reviewing persona emotional responsiveness")
        
        return indicators
    
    def export_metrics(self, filepath: str) -> None:
        """Export metrics data to a JSON file."""
        try:
            with open(filepath, 'w') as f:
                json.dump(self.metrics_data, f, indent=2)
            logger.info(f"Exported {len(self.metrics_data)} metrics records to {filepath}")
        except Exception as e:
            logger.error(f"Error exporting metrics: {e}")
    
    def import_metrics(self, filepath: str) -> None:
        """Import metrics data from a JSON file."""
        try:
            with open(filepath, 'r') as f:
                imported_data = json.load(f)
            self.metrics_data.extend(imported_data)
            logger.info(f"Imported {len(imported_data)} metrics records from {filepath}")
        except Exception as e:
            logger.error(f"Error importing metrics: {e}")

# Global instance for easy access
persona_qa_metrics = PersonaQAMetrics()

def record_conversation_metrics(*args, **kwargs):
    """Convenience function to record metrics."""
    return persona_qa_metrics.record_conversation_metrics(*args, **kwargs)

def analyze_persona_effectiveness(*args, **kwargs):
    """Convenience function to analyze effectiveness."""
    return persona_qa_metrics.analyze_persona_effectiveness(*args, **kwargs) 