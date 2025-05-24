# React Dashboard Migration

This document outlines the migration plan from the current Flask-rendered dashboard to a modern React-based dashboard with AI-powered insight cards.

## Vision

The new dashboard centers around an AI-powered insight card system that provides personalized, actionable coaching based on user performance. This creates a dashboard that is:

- **Actionable**: Focuses on what to improve next rather than just displaying data
- **Insightful**: Uses AI to analyze conversations and identify improvement areas
- **Motivating**: Gamifies progress and celebrates achievements
- **Adaptive**: Shows only what's relevant based on the user's current needs

## Architecture Migration

### Current Architecture (Flask)

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│    Flask App      │     │     Database      │     │     AI Services   │
│                   │     │                   │     │                   │
└───────┬───────────┘     └──────┬────────────┘     └──────┬────────────┘
        │                        │                         │
        ▼                        ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    Jinja2 Templates (Server-rendered)               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Target Architecture (React)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│   Flask API      │     │    Database      │     │   AI Services    │
│                  │     │                  │     │                  │
└──────┬───────────┘     └─────┬────────────┘     └───────┬──────────┘
       │                       │                          │
       └───────────────────────┼──────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                         React Dashboard App                         │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │             │  │             │  │             │  │             │ │
│  │  AI Cards   │  │  Analytics  │  │  Timeline   │  │  Settings   │ │
│  │             │  │             │  │             │  │             │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## AI Insight Card System

The core of the new dashboard is a system of AI-powered insight cards:

### Card Ecosystem

```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│                     │ │                     │ │                     │
│  🎯 SKILLS FOCUS    │ │  🔍 CALL INSIGHT    │ │  🚀 NEXT CHALLENGE  │
│                     │ │                     │ │                     │
│  [Dynamic content]  │ │  [Dynamic content]  │ │  [Dynamic content]  │
│                     │ │                     │ │                     │
│                     │ │                     │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### Card States

Each card has multiple states:

1. **Dormant State**: Minimized, showing only category icon and title
2. **Active State**: Expanded to show insight/recommendation with brief explanation
3. **Interactive State**: Full expanded view with chat interface and contextual tools
4. **Celebration State**: Animated feedback when user completes a recommendation

### Card Visualization

**Dormant State:**
```
┌─────────────────────┐
│                     │
│  🎯 SKILLS FOCUS    │
│                     │
└─────────────────────┘
```

**Active State:**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  🎯 SKILLS FOCUS                                │
│                                                 │
│  "Your discovery questions improved 23% in      │
│   your last session, but I noticed you're       │
│   still rushing through objection handling."    │
│                                                 │
│  Tap to discuss how to improve →                │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Interactive State:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  🎯 SKILLS FOCUS: OBJECTION HANDLING                           ✕    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  COACH: "I've noticed you're struggling with price objections.      │
│  In your last 3 calls, your handling of these dropped from          │
│  68% to 42% effectiveness. Would you like to:                       │
│                                                                     │
│  1️⃣ See examples from your recent calls                             │
│  2️⃣ Practice handling a price objection                             │
│  3️⃣ Learn the 4-step objection framework"                           │
│                                                                     │
│  YOU: "Show me examples from my calls"                              │
│                                                                     │
│  COACH: "Here are two moments from your recent calls:               │
│                                                                     │
│  [CALL #127 - May 12]                                               │
│  Customer: "Your solution is way more expensive than what           │
│  we're using now."                                                  │
│  You: "But our features are much better, so it's worth it."         │
│                                                                     │
│  [CALL #129 - May 14]                                               │
│  Customer: "We don't have budget for this right now."               │
│  You: "When do you think you might have budget?"                    │
│                                                                     │
│  Both responses missed acknowledging the concern before             │
│  responding. Would you like to see how to improve these?"           │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  📊 View Stats   🎙️ Practice Now   📚 Show Framework                │
├─────────────────────────────────────────────────────────────────────┤
│  Type your question...                                        Send  │
└─────────────────────────────────────────────────────────────────────┘
```

## Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ DASHBOARD                                                 👤 User │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───── KEY METRICS ─────┐  ┌───── SKILL RADAR ─────┐            │
│  │ CALLS: 12 this week   │  │         *            │            │
│  │ TIME: 3.2 hrs         │  │      *     *         │            │
│  │ SCORE: 72/100         │  │    *         *       │            │
│  └──────────────────────┘  └──────────────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     🎯 SKILLS FOCUS                         │ │
│  │                                                             │ │
│  │  "Your discovery questions have improved, but you're        │ │
│  │   still asking too many closed-ended questions. This        │ │
│  │   limits the information you can gather."                   │ │
│  │                                                             │ │
│  │  Tap to practice open-ended questioning →                   │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  RECENT CALL TIMELINE                       │ │
│  │  ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬  │ │
│  │  Rapport │ Discovery │ Present │ Objections │ Close         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Transition Path

#### Phase 1: API-First Refactor

Convert Flask routes to serve JSON:

```python
# Current Flask route (HTML)
@app.route('/dashboard')
@login_required
def dashboard():
    user_metrics = get_user_metrics(current_user.id)
    recent_sessions = get_recent_sessions(current_user.id)
    return render_template('dashboard.html', 
                          metrics=user_metrics, 
                          sessions=recent_sessions)

# New API route (JSON)
@app.route('/api/dashboard')
@login_required
def dashboard_api():
    user_metrics = get_user_metrics(current_user.id)
    recent_sessions = get_recent_sessions(current_user.id)
    return jsonify({
        'metrics': user_metrics,
        'recent_sessions': recent_sessions
    })
```

#### Phase 2: Component-by-Component Migration

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Flask Application                             │
│                                                                     │
│  ┌─────────────┐  ┌─────────────────────────────────────────────┐  │
│  │             │  │                                             │  │
│  │  Flask      │  │            Flask Templates                  │  │
│  │  Backend    │  │            (Gradually Replaced)             │  │
│  │  (API)      │  │                                             │  │
│  │             │  │                                             │  │
│  └─────────────┘  └───────────────────┬─────────────────────────┘  │
│                                       │                             │
└───────────────────────────────────────┼─────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                     React Components                                │
│                     (Added Incrementally)                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Phase 3: Side-by-Side Implementation

Create a new React route at `/dashboard-new` while keeping the old one:

```python
@app.route('/dashboard-new')
@login_required
def new_dashboard():
    # Return a simple page that loads the React application
    return render_template('react_wrapper.html',
                           page="dashboard",
                           initial_data=json.dumps({
                               'user_id': current_user.id,
                               'name': current_user.name
                           }))
```

#### Phase 4: Complete Transition

Once the React dashboard is fully functional, switch the routes:

```python
@app.route('/dashboard')
@login_required
def dashboard():
    # Redirect all traffic to the new React dashboard
    return redirect('/dashboard-new')

# Eventually, update to make React the default
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('react_wrapper.html', 
                           page="dashboard",
                           initial_data=json.dumps({
                               'user_id': current_user.id,
                               'name': current_user.name
                           }))
```

### API Endpoints Needed

```
GET /api/user/profile
GET /api/user/metrics
GET /api/sessions
GET /api/sessions/{id}
GET /api/sessions/{id}/transcript
GET /api/insights/generate
POST /api/insights/feedback
GET /api/skills/radar
GET /api/practice/recommendations
```

### Folder Structure 

```
/app
  /static
    /react        # New React application
      /src
        /components
          /dashboard
            /cards
              AICardSystem.jsx
              SkillsCard.jsx
              CallInsightCard.jsx
              ChallengeCard.jsx
            /charts
            /timeline
          /common
        /hooks
        /services
          api.js   # API communication
          insights.js  # Insight processing
        /context
          UserContext.jsx
          DashboardContext.jsx
        App.jsx
        index.jsx
  /templates
    react_wrapper.html  # Shell that loads React
  /routes
    api.py   # New API endpoints
    dashboard.py  # Existing dashboard routes
```

## Core Components

### AICardSystem Component

```jsx
import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../../context/UserContext';
import { SkillsCard } from './cards/SkillsCard';
import { CallInsightCard } from './cards/CallInsightCard';
import { ChallengeCard } from './cards/ChallengeCard';
import api from '../../services/api';

export const AICardSystem = () => {
  const { user } = useContext(UserContext);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(null);
  
  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      try {
        const data = await api.get('/api/insights/generate', {
          userId: user.id,
          context: 'dashboard'
        });
        setInsights(data);
        // Auto-activate highest priority card
        if (data && data.priorityCard) {
          setActiveCard(data.priorityCard);
        }
      } catch (error) {
        console.error("Failed to fetch insights:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
    // Refresh insights every 5 minutes or when sessions change
    const interval = setInterval(fetchInsights, 300000);
    return () => clearInterval(interval);
  }, [user.id, user.lastSessionTimestamp]);
  
  if (loading) return <div className="card-system-skeleton">Loading insights...</div>;
  
  return (
    <div className="ai-card-system">
      <SkillsCard 
        data={insights?.skills}
        isActive={activeCard === 'skills'}
        onActivate={() => setActiveCard('skills')}
        onClose={() => setActiveCard(null)}
      />
      <CallInsightCard 
        data={insights?.calls}
        isActive={activeCard === 'calls'}
        onActivate={() => setActiveCard('calls')}
        onClose={() => setActiveCard(null)}
      />
      <ChallengeCard 
        data={insights?.challenges}
        isActive={activeCard === 'challenges'}
        onActivate={() => setActiveCard('challenges')}
        onClose={() => setActiveCard(null)}
      />
    </div>
  );
};
```

### Individual Card Component

```jsx
import React, { useState } from 'react';
import { ChatInterface } from '../common/ChatInterface';
import { CardMetrics } from '../common/CardMetrics';
import api from '../../services/api';

export const SkillsCard = ({ data, isActive, onActivate, onClose }) => {
  const [expanded, setExpanded] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  // Determine card state
  const cardState = !isActive ? 'dormant' : 
                   (expanded ? 'interactive' : 'active');
  
  const handleCardClick = () => {
    if (!isActive) {
      onActivate();
    } else if (!expanded) {
      setExpanded(true);
      // Initialize chat with context
      setChatHistory([{
        role: 'assistant',
        content: data.detailedExplanation || data.explanation
      }]);
    }
  };
  
  const handleSendMessage = async (message) => {
    // Add user message to chat
    setChatHistory([...chatHistory, { role: 'user', content: message }]);
    
    try {
      // Get AI coaching response
      const response = await api.post('/api/insights/chat', {
        insightType: 'skills',
        insightId: data.id,
        message,
        history: chatHistory
      });
      
      // Add AI response to chat
      setChatHistory([...chatHistory, { 
        role: 'assistant', 
        content: response.content,
        additionalData: response.additionalData
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory([...chatHistory, { 
        role: 'assistant', 
        content: "I'm sorry, I had trouble generating a response. Please try again."
      }]);
    }
  };
  
  const handleClose = () => {
    setExpanded(false);
    setChatHistory([]);
    onClose();
  };
  
  // Different rendering based on card state
  if (cardState === 'dormant') {
    return (
      <div className="insight-card dormant" onClick={handleCardClick}>
        <div className="card-icon">🎯</div>
        <div className="card-title">Skills Focus</div>
      </div>
    );
  }
  
  if (cardState === 'active') {
    return (
      <div className="insight-card active" onClick={handleCardClick}>
        <div className="card-header">
          <div className="card-icon">🎯</div>
          <div className="card-title">Skills Focus</div>
          <button className="close-button" onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}>✕</button>
        </div>
        <div className="card-content">
          <p className="insight-text">{data.explanation}</p>
          <p className="action-prompt">Tap to explore this insight →</p>
        </div>
      </div>
    );
  }
  
  if (cardState === 'interactive') {
    return (
      <div className="insight-card interactive">
        <div className="card-header">
          <div className="card-icon">🎯</div>
          <div className="card-title">Skills Focus: {data.skillArea}</div>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>
        <div className="card-content expanded">
          <ChatInterface 
            messages={chatHistory}
            onSendMessage={handleSendMessage}
          />
          <div className="action-buttons">
            {data.actions.map(action => (
              <button 
                key={action.id}
                className="action-button"
                onClick={() => action.handler()}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return null; // Fallback
};
```

## Flask API Implementation

```python
@app.route('/api/insights/generate', methods=['GET'])
@login_required
def generate_insights():
    """Generate AI insights for the dashboard cards"""
    user_id = current_user.id
    
    # Get user data and recent sessions
    user_data = get_user_data(user_id)
    recent_sessions = get_recent_sessions(user_id, limit=5)
    
    # Generate insights for each card type
    skills_insights = generate_skills_insights(user_data, recent_sessions)
    call_insights = generate_call_insights(user_data, recent_sessions)
    challenge_insights = generate_challenge_insights(user_data)
    
    # Determine priority card
    priority_scores = {
        'skills': calculate_priority_score(skills_insights),
        'calls': calculate_priority_score(call_insights),
        'challenges': calculate_priority_score(challenge_insights)
    }
    priority_card = max(priority_scores.items(), key=lambda x: x[1])[0]
    
    return jsonify({
        'skills': skills_insights,
        'calls': call_insights,
        'challenges': challenge_insights,
        'priorityCard': priority_card
    })

@app.route('/api/insights/chat', methods=['POST'])
@login_required
def insight_chat():
    """Handle chat interactions with the AI coach"""
    data = request.json
    insight_type = data.get('insightType')
    insight_id = data.get('insightId')
    message = data.get('message')
    history = data.get('history', [])
    
    # Get context for this insight
    insight_data = get_insight_data(insight_id, insight_type)
    
    # Generate coaching response
    ai_response = generate_coaching_response(
        user_id=current_user.id,
        insight_data=insight_data,
        message=message,
        history=history
    )
    
    return jsonify(ai_response)
```

## CSS & Styling Implementation

```css
/* Card System */
.ai-card-system {
  display: flex;
  gap: 16px;
  transition: all 0.3s ease;
}

/* Card States */
.insight-card {
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
}

.insight-card.dormant {
  flex: 1;
  height: 100px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  display: flex;
  align-items: center;
  padding: 0 16px;
  cursor: pointer;
}

.insight-card.active {
  flex: 3;
  min-height: 160px;
  background: white;
  cursor: pointer;
}

.insight-card.interactive {
  flex: 4;
  min-height: 400px;
  background: white;
  z-index: 10;
}

/* When a card becomes interactive, shrink others */
.insight-card.interactive ~ .insight-card {
  flex: 0.5;
}

/* Card Content */
.card-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}

.card-icon {
  font-size: 24px;
  margin-right: 12px;
}

.card-title {
  font-weight: 600;
  flex: 1;
}

.close-button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.6;
}

.close-button:hover {
  opacity: 1;
}

.card-content {
  padding: 16px;
}

.card-content.expanded {
  height: calc(100% - 50px);
  display: flex;
  flex-direction: column;
}

.insight-text {
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 16px;
}

.action-prompt {
  font-size: 14px;
  color: #4a6df5;
  font-weight: 500;
}

/* Chat Interface */
.chat-interface {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.message {
  margin-bottom: 16px;
  max-width: 85%;
}

.message.assistant {
  align-self: flex-start;
}

.message.user {
  align-self: flex-end;
  background: #4a6df5;
  color: white;
}

.chat-input {
  display: flex;
  padding: 12px;
  border-top: 1px solid rgba(0,0,0,0.1);
}

.chat-input input {
  flex: 1;
  padding: 12px;
  border: 1px solid rgba(0,0,0,0.2);
  border-radius: 24px;
}

.send-button {
  background: #4a6df5;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  margin-left: 8px;
  cursor: pointer;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid rgba(0,0,0,0.1);
}

.action-button {
  flex: 1;
  padding: 10px;
  background: #f5f7fa;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-button:hover {
  background: #e4e8eb;
}
```

## Implementation Timeline

1. **Week 1-2**: API Development
   - Create all necessary API endpoints
   - Test data flow with Postman/curl

2. **Week 3-4**: Basic React Setup
   - Set up React environment
   - Create wrapper template
   - Implement basic dashboard layout

3. **Week 5-6**: Card System Development
   - Implement core card components
   - Develop state management
   - Style transitions and animations

4. **Week 7-8**: Chat Interface & AI Integration
   - Implement chat interface
   - Connect to AI backend
   - Test full interaction flow

5. **Week 9-10**: Supporting Visualizations
   - Implement analytics components
   - Create timeline visualization
   - Add skill radar chart

6. **Week 11-12**: Testing & Refinement
   - User testing
   - Performance optimization
   - Final polish & bug fixes

## Implementation Log

This section will be updated with progress as implementation proceeds.

### May 21, 2025 - Initial Setup
- Created API routes in app/routes/api/api_blueprint.py for the React dashboard
- Created a React application shell with mock components
- Set up directory structure and Vite configuration
- Created AI Card System component with initial implementation

### Current Status (June 15, 2025)
- Basic API endpoints are defined and functioning for fetching user data, metrics, sessions and insights
- React application framework is set up with component architecture
- AI Card System component is fully implemented with state transitions and interactive behavior
- The three card types (Skills Focus, Call Insight, Next Challenge) have been implemented with proper UI states
- API service is created to handle communication with the Flask backend
- Styling is implemented with responsive design considerations
- Flask route at `/dashboard-react` is available to view the React dashboard

### June 22, 2025 - UI Components Implementation
- Added KeyMetrics component for displaying key performance metrics
- Implemented SkillRadar visualization using SVG for the skills radar chart
- Created CallTimeline component for displaying recent call history
- Enhanced error handling and loading states across all components
- Improved responsive design for mobile devices
- Added proper API integrations to fetch real data from the backend
- Created global styles with a cohesive design system

### Next Steps
1. Add user settings panel for customizing dashboard preferences
2. Implement deep linking for sharing specific insights or call recordings
3. Create automated build and deployment pipeline 
4. Add unit and integration tests
5. Complete transition from Flask dashboard to React dashboard

### Technical Implementation Details

#### API Routes
- Created and updated API routes in `app/routes/api/api_blueprint.py`
- Configured proper error handling and authentication for all API endpoints
- Added helper functions for data formatting and processing

#### React Components
- Implemented AICardSystem as the core component of the dashboard
- Created three card types with different states (dormant, active, interactive)
- Implemented chat interface for interactive card state
- Added SkillRadar component with SVG-based visualization
- Created KeyMetrics component with progress bars and stats
- Implemented CallTimeline for viewing call progression
- Added loading and error states with proper UI feedback

#### Styling
- Created dedicated CSS files for components
- Implemented responsive design with mobile considerations
- Used modern UI patterns for card transitions and interactions
- Created a consistent color scheme and typography system

#### Build System
- Added build script in scripts/build_react.py
- Configured Vite for optimal bundling and performance
- Set up development proxy for API calls

## File Structure

The React dashboard implementation consists of the following key files:

### Backend (Flask)
- `app/routes/api/api_blueprint.py` - API routes for the React dashboard
- `app/templates/react_wrapper.html` - HTML template that loads the React application
- `app/__init__.py` - Updated to register the API blueprint and React dashboard route

### Frontend (React)
- `app/static/react/src/index.jsx` - Entry point for the React application
- `app/static/react/src/App.jsx` - Main React component
- `app/static/react/src/styles.css` - CSS styles for the React dashboard
- `app/static/react/src/components/dashboard/cards/AICardSystem.jsx` - AI Card System component
- `app/static/react/src/services/api.js` - Service for making API calls to the Flask backend

## How to Access

The React dashboard is available at the following URL:
```
http://localhost:5000/dashboard-react
```

You need to be logged in to access the dashboard. If you're not logged in, you'll be redirected to the login page.

## Development

To work on the React application, you'll need to:

1. Install Node.js dependencies in the `app/static/react` directory:
```
cd app/static/react
npm install
```

2. Start the React development server:
```
npm run dev
```

3. Run the Flask application to serve the API:
```
flask --app app.py run
```

The React development server will proxy API requests to the Flask application. 