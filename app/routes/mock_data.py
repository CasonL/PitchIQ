"""
Mock Data for Dashboard APIs

This module provides mock data generators for all dashboard API endpoints.
Used during development to provide consistent test data for the React dashboard.
"""

import random
from datetime import datetime, timedelta
import uuid

def get_mock_user_profile(user_id):
    """Get mock user profile data."""
    return {
        'id': user_id,
        'username': 'demo_user',
        'email': 'demo@example.com',
        'name': 'Demo User',
        'role': 'Sales Representative',
        'company': 'Acme Corp',
        'avatar_url': 'https://ui-avatars.com/api/?name=Demo+User&background=4A6DF5&color=fff',
        'member_since': (datetime.now() - timedelta(days=90)).isoformat(),
        'subscription_tier': 'professional',
        'subscription_status': 'active'
    }

def get_mock_metrics(user_id):
    """Get mock user performance metrics."""
    return {
        'sessions_count': random.randint(15, 30),
        'training_time_hours': round(random.uniform(10.0, 50.0), 1),
        'overall_score': random.randint(65, 85),
        'skills': {
            'rapport': random.randint(60, 90),
            'discovery': random.randint(50, 85),
            'presentation': random.randint(65, 95),
            'objection_handling': random.randint(55, 80),
            'closing': random.randint(50, 75)
        },
        'progress': {
            'last_week': random.randint(-5, 15),
            'last_month': random.randint(5, 25)
        },
        'badges_earned': random.randint(3, 12),
        'rank': {
            'current': 'Silver',
            'progress_to_next': random.randint(60, 95)
        }
    }

def get_mock_sessions(user_id, limit=5, offset=0):
    """Get mock training sessions."""
    sessions = []
    
    for i in range(limit):
        session_date = datetime.now() - timedelta(days=i*3 + random.randint(0, 2))
        duration_minutes = random.randint(15, 45)
        
        session = {
            'id': 1000 + offset + i,
            'start_time': session_date.isoformat(),
            'end_time': (session_date + timedelta(minutes=duration_minutes)).isoformat(),
            'duration': duration_minutes * 60,
            'title': f"Sales Call {1000 + offset + i}",
            'scenario': random.choice([
                'Discovery Call', 
                'Product Demo', 
                'Negotiation', 
                'Objection Handling',
                'Follow-up Call'
            ]),
            'status': random.choice(['completed', 'completed', 'completed', 'in_progress']),
            'score': random.randint(65, 95),
            'progress': {
                'current_phase': random.choice(['rapport', 'discovery', 'presentation', 'objection_handling', 'closing']),
                'completed_phases': random.randint(1, 5)
            }
        }
        sessions.append(session)
    
    return sessions

def get_mock_session_details(session_id):
    """Get detailed information about a mock session."""
    session_date = datetime.now() - timedelta(days=random.randint(1, 10))
    duration_minutes = random.randint(15, 45)
    
    user_messages = random.randint(8, 20)
    ai_messages = user_messages + random.randint(-2, 2)
    
    return {
        'id': session_id,
        'start_time': session_date.isoformat(),
        'end_time': (session_date + timedelta(minutes=duration_minutes)).isoformat(),
        'duration': duration_minutes * 60,
        'title': f"Sales Call {session_id}",
        'scenario': random.choice([
            'Discovery Call', 
            'Product Demo', 
            'Negotiation', 
            'Objection Handling',
            'Follow-up Call'
        ]),
        'status': 'completed',
        'score': random.randint(65, 95),
        'metrics': {
            'user_messages': user_messages,
            'ai_messages': ai_messages,
            'total_messages': user_messages + ai_messages,
            'talk_ratio': round(user_messages / (user_messages + ai_messages) * 100),
            'questions_asked': random.randint(3, 10),
            'objections_handled': random.randint(1, 4)
        },
        'strengths': [
            'Clear value proposition',
            'Effective questioning technique',
            'Good rapport building'
        ],
        'areas_to_improve': [
            'Handling price objections',
            'Call control',
            'Closing techniques'
        ],
        'phases': [
            {'name': 'Rapport', 'duration': random.randint(2, 5) * 60, 'score': random.randint(70, 90)},
            {'name': 'Discovery', 'duration': random.randint(5, 10) * 60, 'score': random.randint(60, 85)},
            {'name': 'Presentation', 'duration': random.randint(5, 15) * 60, 'score': random.randint(65, 95)},
            {'name': 'Objection Handling', 'duration': random.randint(3, 8) * 60, 'score': random.randint(55, 80)},
            {'name': 'Closing', 'duration': random.randint(2, 7) * 60, 'score': random.randint(50, 75)}
        ]
    }

def get_mock_transcript(session_id):
    """Get a mock transcript for a session."""
    messages = []
    
    scenarios = {
        'discovery': [
            ('user', "Hi there! I'm interested in learning more about your product."),
            ('assistant', "Great to meet you! I'd be happy to tell you about our solution. Before we dive in, could you tell me a bit about your current challenges?"),
            ('user', "We're struggling with efficiency in our sales process. Our team is spending too much time on administrative tasks."),
            ('assistant', "That's a common challenge. How many sales reps do you have on your team?"),
            ('user', "We have about 50 reps across 3 different regions."),
            ('assistant', "Thanks for sharing that. And approximately how much time would you say they're spending on admin tasks versus actual selling?"),
            ('user', "Probably 30-40% of their time is spent on admin work, which is way too high."),
            ('assistant', "That is significant. What have you tried so far to address this issue?"),
            ('user', "We've tried a couple of different CRM systems, but they weren't user-friendly enough, so adoption was low."),
            ('assistant', "I understand. User adoption is crucial. Based on what you've shared, our platform could help streamline those administrative tasks through automation. Would you like me to show you how specifically it could save your team time?"),
            ('user', "Yes, that would be helpful."),
            ('assistant', "Great! Let me walk you through how our solution works for teams of your size...")
        ],
        'objection': [
            ('user', "I've been looking at your software, but honestly, it seems a bit expensive compared to others."),
            ('assistant', "I understand price is an important factor. May I ask what other solutions you're comparing us with?"),
            ('user', "We're looking at CompetitorX and CompetitorY, which are both about 20% cheaper."),
            ('assistant', "Thank you for sharing that. You're right that our initial price point is higher than those options. Many of our customers had the same concern initially. What they found, however, was that our total cost of ownership over 12 months is actually lower due to three key factors. Would it be helpful if I explained those?"),
            ('user', "Yes, please explain."),
            ('assistant', "First, our implementation time is 60% faster, which means your team gets value sooner. Second, our automation capabilities reduce admin time by up to 40%, which your team is currently struggling with. And third, we include all updates and support at no extra cost, while CompetitorX charges separately for premium support. Would you like me to show you an ROI calculation based on your team of 50 reps?"),
            ('user', "That makes sense, but we're really trying to keep costs down this quarter."),
            ('assistant', "I completely understand budget constraints. We do offer flexible payment options, including a quarterly billing option that might help with your immediate budget situation. We also have a phased implementation approach where you could start with the core features your team needs most urgently. Would either of those options be helpful to explore?"),
            ('user', "The phased approach might work. What would that look like?"),
            ('assistant', "Great question. We could start with just the core automation features for your 50 reps, which would address your immediate pain point of administrative overhead. That would reduce the initial investment by about 30%. Then in Q2, when you have new budget available, we could add the advanced analytics and coaching features. How does that sound?")
        ]
    }
    
    scenario_type = random.choice(list(scenarios.keys()))
    timestamp = datetime.now() - timedelta(days=random.randint(1, 10))
    
    for i, (role, content) in enumerate(scenarios[scenario_type]):
        message_time = timestamp + timedelta(minutes=i*2)
        messages.append({
            'id': f"{session_id}-{i}",
            'role': role,
            'content': content,
            'timestamp': message_time.isoformat()
        })
    
    return {
        'session_id': session_id,
        'transcript': messages,
        'scenario_type': scenario_type
    }

def get_mock_insights():
    """Generate mock AI insights for dashboard cards."""
    return {
        'skills': {
            'id': f"skill-insight-{uuid.uuid4().hex[:8]}",
            'skillArea': random.choice(['discovery', 'objection_handling', 'closing', 'rapport', 'presentation']),
            'explanation': "Your discovery questions have improved, but you could ask more open-ended questions to gather deeper information.",
            'detailedExplanation': "I've analyzed your recent calls and noticed that while your discovery questions have improved by 23%, you're still asking primarily closed-ended questions that result in simple yes/no answers. Open-ended questions would help you gather richer information about customer needs.",
            'score': random.randint(60, 85),
            'trend': random.choice(['improving', 'declining', 'steady']),
            'actions': [
                {
                    'id': 'action-1',
                    'label': 'View Examples',
                    'icon': '📊'
                },
                {
                    'id': 'action-2',
                    'label': 'Practice Now',
                    'icon': '🎙️'
                },
                {
                    'id': 'action-3',
                    'label': 'Learn Framework',
                    'icon': '📚'
                }
            ]
        },
        'objections': {
            'id': f"objection-insight-{uuid.uuid4().hex[:8]}",
            'skillArea': 'objection_handling',
            'explanation': "You're effectively addressing pricing objections, but spending too much time on technical objections.",
            'detailedExplanation': "When faced with pricing objections, you're clearly articulating value and ROI, which has led to a 28% improvement in close rates for these scenarios. However, you're spending an average of 4.5 minutes on technical objections, which is twice the recommended time and may be causing prospect disengagement.",
            'score': random.randint(65, 80),
            'trend': random.choice(['improving', 'steady']),
            'actions': [
                {
                    'id': 'action-1',
                    'label': 'Practice Techincal Objections',
                    'icon': '🔄'
                }
            ]
        },
        'closing': {
            'id': f"closing-insight-{uuid.uuid4().hex[:8]}",
            'skillArea': 'closing',
            'explanation': "Your closing success rate has improved by 15% this month through better timing and stronger value statements.",
            'detailedExplanation': "Your closing success rate has increased from 62% to 77% over the past month. The key improvements are: 1) You're timing your closes better, waiting until all major objections are addressed, 2) You're summarizing value points more effectively before asking for the sale, and 3) You're using more confident language in your closing statements.",
            'score': random.randint(70, 90),
            'trend': 'improving',
            'actions': [
                {
                    'id': 'action-1',
                    'label': 'Advanced Closing Techniques',
                    'icon': '🎓'
                }
            ]
        },
        'rapport': {
            'id': f"rapport-insight-{uuid.uuid4().hex[:8]}",
            'skillArea': 'rapport',
            'explanation': "You establish strong initial rapport but could improve your active listening throughout the call.",
            'detailedExplanation': "Your opening statements and personalized approaches are creating excellent first impressions, with prospects rating their initial comfort at 4.7/5. However, active listening scores decrease as calls progress, with fewer instances of paraphrasing and acknowledging prospect statements in the middle and end sections of calls.",
            'score': random.randint(75, 95),
            'trend': random.choice(['steady', 'declining']),
            'actions': [
                {
                    'id': 'action-1',
                    'label': 'Active Listening Workshop',
                    'icon': '👂'
                }
            ]
        },
        'discovery': {
            'id': f"discovery-insight-{uuid.uuid4().hex[:8]}",
            'skillArea': 'discovery',
            'explanation': "Your discovery process is thorough but could be more strategic and time-efficient.",
            'detailedExplanation': "You're asking a good number of discovery questions (average 11.3 per call), but the structure could be improved. You often revisit topics that were already covered, and sometimes miss logical follow-up opportunities. Implementing a more systematic discovery framework could reduce discovery time by 30% while gathering more relevant information.",
            'score': random.randint(60, 85),
            'trend': random.choice(['improving', 'steady']),
            'actions': [
                {
                    'id': 'action-1',
                    'label': 'SPIN Selling Framework',
                    'icon': '🔄'
                }
            ]
        }
    }

def generate_mock_coaching_response(insight_type, message):
    """Generate a mock coaching response for interactive chat."""
    responses = {
        'discovery': [
            "Based on your recent calls, try using more open-ended questions that start with 'What,' 'How,' or 'Why' to get deeper insights from prospects.",
            "I noticed you're asking good questions, but sometimes not following up effectively. When a prospect mentions a pain point, try the 'What, So What, Now What' framework to explore it fully.",
            "Your discovery questions are improving! One technique to try: after a prospect answers, pause for 3 seconds before responding. This often encourages them to elaborate further."
        ],
        'objection_handling': [
            "When handling pricing objections, remember to first acknowledge, then explore, then respond. You're doing well with acknowledgment, but could spend more time exploring the underlying concerns.",
            "Try the 'feel, felt, found' technique with competitive objections: 'I understand how you feel, others have felt the same way, but they found that our solution provides X advantage.'",
            "Your objection handling has improved by 18% this month. Keep focusing on turning objections into questions that help you better understand the prospect's needs."
        ],
        'closing': [
            "I've noticed you sometimes miss buying signals. Watch for phrases like 'That sounds interesting' or 'How would implementation work?' as opportunities to move toward closing.",
            "Try using more assumptive language in your closes: Instead of 'Would you be interested in moving forward?' try 'Should we start with the standard package or the premium option?'",
            "Your closing success rate increases by 23% when you summarize the agreed-upon value points before asking for the sale. Make this a consistent part of your closing technique."
        ],
        'general': [
            "Looking at your overall performance trends, you've made significant improvements in discovery and rapport, while closing techniques represent your biggest opportunity for growth.",
            "Your call-to-close ratio is 15% above team average. The area with greatest potential for improvement is shortening your discovery phase without sacrificing quality of information gathered.",
            "Analyzing your most successful calls, there's a strong correlation between the quality of your discovery questions and your closing success. The more specific needs you uncover, the more effectively you can position value."
        ]
    }
    
    response_type = insight_type if insight_type in responses else 'general'
    
    return {
        'message': random.choice(responses[response_type]),
        'timestamp': datetime.now().isoformat(),
        'insight_type': insight_type
    }

def get_mock_skills_radar():
    """Get mock skills radar chart data."""
    
    current_skills = {
        'discovery': random.randint(60, 90),
        'objection_handling': random.randint(50, 85),
        'closing': random.randint(45, 80),
        'rapport_building': random.randint(70, 95),
        'presentation': random.randint(55, 90),
        'active_listening': random.randint(60, 85),
        'needs_analysis': random.randint(50, 80)
    }
    
    previous_skills = {}
    for skill, value in current_skills.items():
        # Previous values with some variation
        previous_skills[skill] = max(0, min(100, value + random.randint(-15, 10)))
    
    return {
        'current': current_skills,
        'previous': previous_skills,
        'benchmark': {
            'discovery': 75,
            'objection_handling': 70,
            'closing': 65,
            'rapport_building': 80,
            'presentation': 75,
            'active_listening': 75,
            'needs_analysis': 70
        }
    }

def get_mock_practice_recommendations():
    """Get mock practice recommendations."""
    scenarios = [
        {
            'id': f"scenario-{uuid.uuid4().hex[:8]}",
            'title': 'Handling Budget Objections',
            'description': 'Practice addressing common budget-related objections with effective value-based responses.',
            'difficulty': 'intermediate',
            'duration_minutes': 15,
            'skill_focus': ['objection_handling', 'value_articulation'],
            'recommendation_reason': 'Based on your recent calls, budget objections reduced your close rate by 35%.'
        },
        {
            'id': f"scenario-{uuid.uuid4().hex[:8]}",
            'title': 'Effective Discovery Questioning',
            'description': 'Improve your discovery process with strategic questioning techniques.',
            'difficulty': 'beginner',
            'duration_minutes': 20,
            'skill_focus': ['discovery', 'active_listening'],
            'recommendation_reason': 'Your discovery phase could be more thorough, with 30% fewer needs identified than top performers.'
        },
        {
            'id': f"scenario-{uuid.uuid4().hex[:8]}",
            'title': 'Closing Techniques for Enterprise Deals',
            'description': 'Master advanced closing techniques for complex, multi-stakeholder sales.',
            'difficulty': 'advanced',
            'duration_minutes': 25,
            'skill_focus': ['closing', 'stakeholder_management'],
            'recommendation_reason': 'Your enterprise deal close rate is 22%, compared to a team average of 35%.'
        },
        {
            'id': f"scenario-{uuid.uuid4().hex[:8]}",
            'title': 'Competitor Comparison Handling',
            'description': 'Practice addressing competition questions without disparaging competitors while highlighting your unique value.',
            'difficulty': 'intermediate',
            'duration_minutes': 15,
            'skill_focus': ['competitive_positioning', 'objection_handling'],
            'recommendation_reason': 'Competitive mentions in your calls have increased by 45% this quarter.'
        },
        {
            'id': f"scenario-{uuid.uuid4().hex[:8]}",
            'title': 'Building Executive Rapport',
            'description': 'Learn techniques for quickly establishing credibility with C-level executives.',
            'difficulty': 'advanced',
            'duration_minutes': 20,
            'skill_focus': ['rapport_building', 'executive_communication'],
            'recommendation_reason': 'Your upcoming pipeline includes 3 opportunities with C-level decision makers.'
        }
    ]
    
    return scenarios 