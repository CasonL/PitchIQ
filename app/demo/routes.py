from flask import render_template, request, jsonify
from flask_login import login_required
from . import demo
import json
import time

@demo.route('/streaming-demo')
def streaming_demo():
    """Demo route for showing the StreamingTextDirect component in action"""
    return render_template('demo/streaming_demo.html')

@demo.route('/voice-agent')
@demo.route('/voice-agent/<white_background>')
@login_required
def voice_agent_demo(white_background=None):
    """Demo route for the working Deepgram Voice Agent implementation"""
    # Check if the white_background parameter is set to 'true'
    force_white = white_background == 'white'
    
    # Use the original template but with white background parameter
    return render_template('demo/voice_agent_demo.html', force_white_background=force_white)

@demo.route('/api/demo/generate-persona', methods=['POST'])
def generate_persona():
    """API endpoint for generating AI prospect personas based on user's product/service"""
    try:
        data = request.get_json()
        product_service = data.get('product_service', '')
        target_market = data.get('target_market', '')
        
        if not product_service:
            return jsonify({
                'success': False,
                'error': 'Product/service description is required'
            }), 400
        
        # Simulate persona generation processing time
        time.sleep(2)
        
        # Generate a realistic persona based on the product/service
        persona = {
            'name': 'Sarah Mitchell',
            'title': 'VP of Sales',
            'company': 'TechFlow Solutions',
            'industry': 'Software',
            'company_size': '150-500 employees',
            'pain_points': [
                'Struggling with inconsistent sales performance across team',
                'Need better training tools for new sales reps',
                'Looking to improve conversion rates'
            ],
            'goals': [
                'Increase team quota attainment by 25%',
                'Reduce onboarding time for new hires',
                'Implement scalable training solutions'
            ],
            'personality': 'Results-driven, analytical, values efficiency',
            'communication_style': 'Direct but friendly, appreciates data-driven solutions',
            'budget_authority': 'Can approve purchases up to $50K',
            'decision_timeline': '2-3 months for major purchases',
            'voice_characteristics': {
                'tone': 'professional',
                'pace': 'moderate',
                'style': 'business-focused'
            }
        }
        
        # Customize persona based on user's product
        if 'sales training' in product_service.lower():
            persona['pain_points'] = [
                'Sales team lacks consistent training methodology',
                'New reps take too long to become productive',
                'Need role-play practice but limited resources'
            ]
            persona['goals'] = [
                'Implement scalable sales training program',
                'Reduce ramp time for new sales hires',
                'Improve overall team performance'
            ]
        
        return jsonify({
            'success': True,
            'persona': persona
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate persona: {str(e)}'
        }), 500