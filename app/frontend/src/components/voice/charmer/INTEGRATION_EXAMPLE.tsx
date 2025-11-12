/**
 * INTEGRATION_EXAMPLE.tsx
 * Shows how to integrate CharmerController into existing routes
 */

import React from 'react';
import { CharmerController } from './index';

/**
 * Example 1: Dedicated Marcus Demo Page
 */
export function MarcusDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto py-12">
        <CharmerController 
          onCallEnd={() => console.log('Marcus demo ended')}
          onCallComplete={(data) => {
            console.log('Call completed:', data);
            // Could redirect to dashboard or show insights
          }}
        />
      </div>
    </div>
  );
}

/**
 * Example 2: Add to DualVoiceAgentFlow as a demo option
 */
export function DemoFlowWithMarcus() {
  const [demoMode, setDemoMode] = React.useState<'standard' | 'marcus'>('standard');
  
  return (
    <div>
      {/* Demo mode selector */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setDemoMode('standard')}
          className={`px-4 py-2 rounded ${
            demoMode === 'standard' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Standard Demo
        </button>
        
        <button
          onClick={() => setDemoMode('marcus')}
          className={`px-4 py-2 rounded ${
            demoMode === 'marcus' 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          Marcus Stindle Demo ⭐
        </button>
      </div>
      
      {/* Render appropriate demo */}
      {demoMode === 'marcus' ? (
        <CharmerController autoStart={false} />
      ) : (
        // Your existing DualVoiceAgentFlow component
        <div>Standard demo here...</div>
      )}
    </div>
  );
}

/**
 * Example 3: Add to dashboard as featured demo
 */
export function DashboardWithMarcus() {
  const [showMarcusDemo, setShowMarcusDemo] = React.useState(false);
  
  return (
    <div>
      {!showMarcusDemo ? (
        <div className="grid gap-6">
          {/* Featured demo card */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border-2 border-red-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    Experience Marcus Stindle
                  </h3>
                  <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                    PREMIUM DEMO
                  </span>
                </div>
                
                <p className="text-gray-700 mb-4">
                  Watch world-class sales technique in action. Marcus demonstrates 
                  perfect selling while you pitch to him. In 4 minutes, you'll 
                  experience what mastery feels like.
                </p>
                
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  <li>✓ Natural coaching embedded in conversation</li>
                  <li>✓ Models detachment and confidence</li>
                  <li>✓ Aspiration over instruction</li>
                  <li>✓ You'll want to BE him, not just learn from him</li>
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => setShowMarcusDemo(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Start Marcus Demo →
            </button>
          </div>
          
          {/* Other dashboard content */}
          <div>Your existing dashboard cards...</div>
        </div>
      ) : (
        <div>
          {/* Back button */}
          <button
            onClick={() => setShowMarcusDemo(false)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
          
          <CharmerController 
            onCallEnd={() => setShowMarcusDemo(false)}
            autoStart={true}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Example 4: Add route in App.tsx or router config
 */
export const marcusRoute = {
  path: '/demo/marcus',
  element: <MarcusDemoPage />,
  meta: {
    title: 'Marcus Stindle Demo',
    description: 'Experience world-class sales technique',
    premium: true
  }
};

/**
 * Example 5: Add to navigation
 */
export function NavigationWithMarcus() {
  return (
    <nav>
      <ul>
        <li>
          <a href="/dashboard">Dashboard</a>
        </li>
        <li>
          <a href="/practice">Practice</a>
        </li>
        <li>
          <a 
            href="/demo/marcus"
            className="text-red-600 font-bold"
          >
            Marcus Demo ⭐
          </a>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Example 6: Post-call insights modal
 */
export function MarcusWithInsights() {
  const [callData, setCallData] = React.useState<any>(null);
  const [showInsights, setShowInsights] = React.useState(false);
  
  return (
    <div>
      <CharmerController
        onCallComplete={(data) => {
          setCallData(data);
          setShowInsights(true);
        }}
      />
      
      {/* Insights modal */}
      {showInsights && callData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4">
              How Did You Do?
            </h2>
            
            <div className="space-y-4">
              {/* Phase summary */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Call Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2 font-medium">
                      {callData.duration}s
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phases completed:</span>
                    <span className="ml-2 font-medium">
                      {callData.phaseSummary.currentPhase}/5
                    </span>
                  </div>
                </div>
              </div>
              
              {/* What Marcus noticed */}
              {callData.finalContext.identifiedIssue && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-medium text-gray-900 mb-2">
                    What Marcus Noticed
                  </h3>
                  <p className="text-sm text-gray-700">
                    <strong>Issue:</strong> {callData.finalContext.identifiedIssue}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>What worked:</strong> {callData.finalContext.whatWorked}
                  </p>
                </div>
              )}
              
              {/* Next steps */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-gray-900 mb-2">
                  Want to Sell Like Marcus?
                </h3>
                <p className="text-sm text-gray-700 mb-3">
                  That feeling you just experienced? That's what PitchIQ training 
                  teaches. Not just theory—actual technique you can feel.
                </p>
                <button className="w-full bg-blue-600 text-white py-2 rounded font-medium">
                  Start Training Program
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setShowInsights(false)}
              className="mt-4 w-full bg-gray-200 py-2 rounded font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Example 7: Backend API route (for OpenAI proxy)
 */
/*
// In app/api/routes.py or similar:

@app.route('/api/openai/chat', methods=['POST'])
@login_required
def openai_chat():
    """Proxy OpenAI requests for Marcus"""
    data = request.json
    
    # Validate request
    if not data.get('messages'):
        return jsonify({'error': 'Missing messages'}), 400
    
    # Call OpenAI
    import openai
    openai.api_key = os.getenv('OPENAI_API_KEY')
    
    try:
        response = openai.ChatCompletion.create(
            model=data.get('model', 'gpt-4o'),
            messages=data['messages'],
            temperature=data.get('temperature', 0.85),
            max_tokens=data.get('max_tokens', 500)
        )
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
*/
