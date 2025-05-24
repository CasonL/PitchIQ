# Voice Orb Integration Steps

This document provides a detailed step-by-step guide for integrating the voice orb into your main PitchIQ codebase.

## Step 1: Copy Core Files

Copy these files to your main project:

| Source | Destination |
|--------|-------------|
| `src/components/VoiceOrb.tsx` | `app/frontend/components/VoiceOrb.tsx` |
| `src/components/ChatInterface.tsx` | `app/frontend/components/ChatInterface.tsx` |
| `src/pages/Chat.tsx` | `app/frontend/pages/Chat.tsx` |

## Step 2: Add Required Dependencies

Make sure your project has these dependencies in package.json:

```json
"dependencies": {
  "lucide-react": "^0.x.x",
  "@radix-ui/react-dialog": "^1.x.x",
  "@radix-ui/react-sheet": "^1.x.x"
}
```

Install with:

```bash
npm install lucide-react @radix-ui/react-dialog @radix-ui/react-sheet
# or
yarn add lucide-react @radix-ui/react-dialog @radix-ui/react-sheet
```

## Step 3: Add Tailwind Configuration

Add these color definitions to your Tailwind config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          700: '#1e3a8a',
          600: '#2563eb',
          500: '#3b82f6'
        },
        red: {
          600: '#dc2626',
          700: '#b91c1c'
        }
      }
    }
  }
}
```

## Step 4: Update Routes

Add the Chat route to your routes configuration:

```jsx
// In your router file
import Chat from '../pages/Chat';

// Add this to your routes
<Route path="/chat" element={<Chat />} />
```

## Step 5: Add API Endpoint

Set up an API endpoint to handle chat requests. Add this to your Flask routes:

```python
# In app/training/routes.py or similar

@app.route('/api/chat', methods=['POST'])
def chat_api():
    """Handle chat messages from the voice orb interface"""
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing message in request body'
            }), 400
        
        user_message = data['message']
        
        # Use your existing roleplay service
        ai_response, completion_id = generate_roleplay_response(
            user_message=user_message,
            conversation_history=get_conversation_history(request)
        )
        
        # Add the messages to your database using existing logic
        
        # Return the response with metrics
        return jsonify({
            'status': 'success',
            'response': ai_response,
            'metrics': {
                'clarity': 0.8,
                'confidence': 0.7,
                'engagement': 0.75,
                'keyPointsHit': 4
            }
        })
        
    except Exception as e:
        app.logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500
```

## Step 6: Update API Path in Component

Change the API endpoint in ChatInterface.tsx to match your actual endpoint:

```typescript
// In ChatInterface.tsx
// Find this code:
const response = await fetch('/api/chat', {
  // ...
});

// Change to your actual endpoint:
const response = await fetch('/api/training/roleplay/message', {
  // ...
});
```

## Step 7: Add Link to Voice Chat

Add a link to the voice interface from your main application:

```jsx
// In your main app navigation
import { Link } from 'react-router-dom';

<Link 
  to="/chat" 
  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
>
  Practice with Voice
</Link>
```

## Step 8: Testing the Integration

1. Start your application
2. Navigate to the `/chat` route
3. Click the microphone button to test voice input
4. Verify that the orb responds to audio input
5. Check that responses from your API are displayed and read aloud

## Troubleshooting

### Voice Recognition Not Working

- Make sure you're using HTTPS or localhost (required for Web Speech API)
- Check browser compatibility (Chrome and Edge work best)
- Verify microphone permissions are granted

### Orb Animation Issues

- Check for JavaScript errors in the console
- Verify the container size is large enough for the orb
- Ensure CSS is properly loaded

### API Connection Problems

- Verify the endpoint URL is correct
- Check for CORS issues if APIs are on different domains
- Ensure the JSON response format matches what the component expects

## Need Help?

If you encounter any issues during integration, please refer to:

- Web Speech API documentation: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API 