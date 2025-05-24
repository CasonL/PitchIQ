"""
Standalone Server for AI Coach Testing

This server implements the necessary endpoints for the AI Coach dashboard component
without depending on the app package (which has an indentation error).
"""
from flask import Flask, send_from_directory, jsonify, request, Response, render_template
import logging
import os

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create a simple Flask app
app = Flask(__name__, static_folder='app/static')

# Add CORS headers to all responses
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Mock authentication endpoint."""
    return jsonify({
        "authenticated": True,
        "user": {
            "id": 1,
            "name": "Demo User",
            "email": "demo@example.com"
        }
    })

@app.route('/api/dashboard/coach', methods=['GET', 'POST'])
def coach_conversation():
    """Handle conversation flow with the AI Coach."""
    if request.method == 'GET':
        # Handle initial GET request if necessary
        logger.info("Received GET request for /coach")
        initial_message = "Welcome! What product or service are you selling today?"
        return jsonify({"messages": [{"role": "assistant", "content": initial_message}]})

    elif request.method == 'POST':
        logger.info("Received POST request to /api/dashboard/coach")
        try:
            data = request.get_json()
            if not data or 'message' not in data:
                logger.warning("Invalid POST data: Missing 'message' field.")
                return jsonify({'error': 'Invalid request data. Message required.'}), 400

            user_message = data.get('message', '')
            context = data.get('context', {})
            current_stage = context.get('current_stage', 'product')
            
            logger.info(f"User message: {user_message}")
            logger.info(f"Current stage: {current_stage}")
            
            # Custom responses based on the current stage
            if current_stage == 'product':
                # Remove hardcoded assumption about "AI training program"
                response = "Thanks for sharing about your product. Could you tell me who typically makes the purchasing decision for this solution?"
                summary = "Product information received" # Generic summary until we get real input
                next_stage = "buyer"
            elif current_stage == 'buyer':
                response = "Great! Now I'd like to understand who typically makes the purchasing decision for your solution. What roles or job titles are your primary buyers?"
                summary = None
                next_stage = "current"
                
                # If user has already shared buyer info
                if any(keyword in user_message.lower() for keyword in ['sales manager', 'director', 'vp', 'head of', 'chief', 'ceo', 'hr']):
                    response = "Thanks for that information about your target market. It helps to understand who makes the purchasing decisions. Who experiences the pain points that your product addresses?"
                    summary = "Sales leaders and training managers at mid to large sized companies."
                    next_stage = "pain_point"
            elif current_stage == 'pain_point':
                response = "Now I'd like to understand the main pain point your product solves. What problem do your customers face that drives them to seek your solution?"
                summary = None
                next_stage = "current"
                
                # If user has already shared pain point info
                if any(keyword in user_message.lower() for keyword in ['cost', 'expensive', 'waste', 'ineffective', 'turnover', 'retention', 'practical', 'experience']):
                    response = "That's a significant pain point your product addresses. Thank you for sharing this information with me."
                    summary = "High costs of ineffective traditional solutions and staff turnover due to lack of practical experience."
                    next_stage = "complete"
            elif current_stage == 'complete':
                response = "Great! Based on what you've shared, we now have a clear picture of your product, buyers, and the pain points you address. Would you like to start a roleplay scenario where I play a potential buyer and you can practice your sales pitch?"
                summary = None
                next_stage = "current"
            else:
                # Default fallback
                response = "I understand. Let's continue our conversation about your product. Can you tell me more about what specific features or aspects you'd like to focus on?"
                summary = None
                next_stage = "current"
            
            return jsonify({
                'content': response,
                'summary': summary,
                'next_stage': next_stage
            }), 200
            
        except Exception as e:
            logger.error(f"Error in coach_conversation POST: {str(e)}", exc_info=True)
            return jsonify({'error': 'An internal server error occurred'}), 500

@app.route('/')
def index():
    """Serve the landing page."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AI Coach Test Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            h1 { color: #333; }
            .button {
                display: inline-block;
                background-color: #4a6df5;
                color: white;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                margin-right: 10px;
                margin-bottom: 10px;
            }
            .button.fix {
                background-color: #10b981;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>AI Coach Test Server</h1>
            <p>This standalone server implements the necessary API endpoints for testing the AI Coach dashboard component.</p>
            
            <h2>Dashboard Options:</h2>
            <div style="margin-bottom: 20px;">
                <a href="/dashboard" class="button">Original Dashboard</a>
                <a href="/fixed-dashboard" class="button fix">Fixed Dashboard ✓</a>
            </div>
            
            <h2>Available Endpoints:</h2>
            <ul>
                <li><code>/api/auth/status</code> - Mock authentication endpoint</li>
                <li><code>/api/dashboard/coach</code> - AI Coach conversation endpoint</li>
            </ul>
            
            <h3>Testing Instructions:</h3>
            <ol>
                <li>Use the <b>Fixed Dashboard</b> button above for the version with CSS fixes</li>
                <li>The Reset Coach button is now always visible and properly positioned</li>
                <li>The content has additional padding to prevent header overlap</li>
            </ol>
        </div>
    </body>
    </html>
    """
    return Response(html, mimetype='text/html')

@app.route('/dashboard')
def dashboard():
    """Serve the React dashboard."""
    return send_from_directory('app/static/react/dist', 'index.html')

@app.route('/fixed-dashboard')
def fixed_dashboard():
    """Serve the fixed React dashboard with CSS fixes."""
    return render_template('dashboard/fixed_standalone.html')

# Serve static files
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory('app/static/react/dist/assets', filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('app/static', filename)

if __name__ == '__main__':
    logger.info("Starting standalone AI Coach server on http://localhost:8080")
    print("\n" + "=" * 60)
    print("STANDALONE AI COACH SERVER")
    print("Access the server at: http://localhost:8080")
    print("=" * 60 + "\n")
    
    app.run(debug=True, port=8080, threaded=False) 