"""
Bias Monitoring API Routes

Provides endpoints to monitor and analyze bias patterns in persona generation.
"""

from flask import Blueprint, jsonify, request
from app.services.comprehensive_bias_prevention import ComprehensiveBiasPrevention
from app.utils.logger import get_smart_logger

logger = get_smart_logger(__name__)

bias_monitoring_bp = Blueprint('bias_monitoring', __name__)

@bias_monitoring_bp.route('/api/bias-report', methods=['GET'])
def get_bias_report():
    """
    Get a comprehensive bias analysis report.
    
    Returns:
        JSON response with bias analysis data
    """
    try:
        report = ComprehensiveBiasPrevention.get_bias_report()
        
        # Add additional insights
        if report.get("bias_detected"):
            report["recommendations"] = [
                "Bias patterns detected - review recent persona generations",
                "Consider adjusting weights in cultural/demographic distribution",
                "Monitor for AI model drift toward common patterns"
            ]
        else:
            report["recommendations"] = [
                "Good diversity detected in recent generations",
                "Continue monitoring for emerging bias patterns",
                "Maintain current anti-bias strategies"
            ]
        
        return jsonify({
            "success": True,
            "data": report
        })
        
    except Exception as e:
        logger.error(f"Error generating bias report: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to generate bias report"
        }), 500

@bias_monitoring_bp.route('/api/test-persona-diversity', methods=['POST'])
def test_persona_diversity():
    """
    Generate multiple test personas to analyze diversity patterns.
    
    Expects JSON body:
    {
        "count": 10,  // Number of personas to generate
        "industry_context": "technology",  // Optional
        "target_market": "B2B"  // Optional
    }
    """
    try:
        data = request.get_json() or {}
        count = min(data.get('count', 5), 20)  # Cap at 20 for performance
        industry_context = data.get('industry_context')
        target_market = data.get('target_market')
        
        # Generate test personas
        test_personas = []
        for i in range(count):
            framework = ComprehensiveBiasPrevention.generate_bias_free_persona_framework(
                industry_context=industry_context,
                target_market=target_market
            )
            
            # Extract key diversity metrics
            persona_summary = {
                "name": framework["name"],
                "cultural_background": framework["cultural_background"],
                "gender": framework["gender"],
                "role": framework["role"],
                "age_range": framework["age_range"],
                "industry": framework["industry"],
                "personality_traits": framework["personality_traits"],
                "decision_authority": framework["decision_authority"]
            }
            test_personas.append(persona_summary)
        
        # Analyze diversity in the generated set
        diversity_analysis = _analyze_test_set_diversity(test_personas)
        
        return jsonify({
            "success": True,
            "data": {
                "generated_personas": test_personas,
                "diversity_analysis": diversity_analysis,
                "generation_count": count
            }
        })
        
    except Exception as e:
        logger.error(f"Error in test persona diversity: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to generate test personas"
        }), 500

def _analyze_test_set_diversity(personas):
    """Analyze diversity patterns in a set of generated personas."""
    from collections import Counter
    
    analysis = {}
    
    # Analyze each dimension
    for field in ["cultural_background", "gender", "role", "age_range", "industry"]:
        values = [persona[field] for persona in personas if field in persona]
        if values:
            distribution = Counter(values)
            total = len(values)
            percentages = {k: round((v/total)*100, 1) for k, v in distribution.items()}
            
            # Calculate diversity score (lower is more diverse)
            # Perfect diversity would be equal distribution
            expected_percentage = 100 / len(distribution)
            diversity_score = sum(abs(pct - expected_percentage) for pct in percentages.values()) / len(percentages)
            
            analysis[field] = {
                "distribution": percentages,
                "unique_values": len(distribution),
                "diversity_score": round(diversity_score, 2),
                "most_common": distribution.most_common(1)[0] if distribution else None
            }
    
    # Overall diversity assessment
    avg_diversity_score = sum(field_data["diversity_score"] for field_data in analysis.values()) / len(analysis)
    
    analysis["overall"] = {
        "average_diversity_score": round(avg_diversity_score, 2),
        "assessment": "Excellent" if avg_diversity_score < 10 else "Good" if avg_diversity_score < 20 else "Needs Improvement"
    }
    
    return analysis

@bias_monitoring_bp.route('/api/reset-bias-tracking', methods=['POST'])
def reset_bias_tracking():
    """
    Reset bias tracking data (for testing/development).
    """
    try:
        # Clear tracking data
        ComprehensiveBiasPrevention._generation_history.clear()
        ComprehensiveBiasPrevention._usage_tracker.clear()
        
        logger.info("Bias tracking data reset")
        
        return jsonify({
            "success": True,
            "message": "Bias tracking data has been reset"
        })
        
    except Exception as e:
        logger.error(f"Error resetting bias tracking: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to reset bias tracking"
        }), 500 