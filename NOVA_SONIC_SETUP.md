# Amazon Nova Sonic Setup Guide for Sales Training AI

## Overview

This guide will help you set up **real** Amazon Nova Sonic voice-to-voice conversations in your sales training application. Nova Sonic is AWS's flagship conversational AI that provides true real-time speech-to-speech interactions.

## What Nova Sonic Provides

✅ **Real-time bidirectional streaming** - Natural conversation flow  
✅ **Sub-200ms latency** - Feels completely natural  
✅ **Natural interruptions (barge-in)** - Users can interrupt the AI  
✅ **Tool use & function calling** - Integrate with your sales training logic  
✅ **Knowledge base integration** - Access your sales scenarios and coaching data  
✅ **Multiple voices** - Masculine and feminine options  
✅ **Context preservation** - Maintains conversation flow  

## Prerequisites

### 1. AWS Account Setup
- AWS account with Bedrock access
- **Region**: Must use `us-east-1` (Nova Sonic only available there)
- Enable Nova Sonic model in Bedrock console

### 2. AWS Credentials
Configure AWS credentials with Bedrock permissions:

```bash
# Option 1: AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

### 3. Required IAM Permissions
Your AWS user/role needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithBidirectionalStream",
                "bedrock:GetModel",
                "bedrock:ListModels"
            ],
            "Resource": [
                "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-sonic-v1:0"
            ]
        }
    ]
}
```

## Installation Steps

### 1. Install Nova Sonic Python SDK (Experimental)

The standard boto3 doesn't fully support Nova Sonic's bidirectional streaming yet. Install the experimental SDK:

```bash
# Install experimental Nova Sonic SDK
pip install git+https://github.com/aws-samples/amazon-nova-samples.git#subdirectory=speech-to-speech/python-sdk

# Or if available via pip:
pip install amazon-nova-sonic-sdk
```

### 2. Update Environment Variables

Add to your `instance/.env` file:

```env
# Nova Sonic Configuration
AWS_REGION=us-east-1
NOVA_SONIC_MODEL_ID=amazon.nova-sonic-v1:0
NOVA_SONIC_VOICE_TYPE=feminine
NOVA_SONIC_MAX_TOKENS=1024
NOVA_SONIC_TEMPERATURE=0.7

# Sales Training Prompts
NOVA_SONIC_SYSTEM_PROMPT="You are a realistic sales prospect. Engage naturally in sales conversations, ask relevant questions, and provide appropriate objections to help salespeople practice their skills."
```

### 3. Enable Nova Sonic in Bedrock Console

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to "Model access" in the left sidebar
3. Find "Amazon Nova Sonic" and click "Enable"
4. Wait for approval (usually immediate)

## Implementation Architecture

### Current Implementation Status

The codebase now includes:

✅ **Real Nova Sonic Service** (`app/services/nova_sonic_service.py`)  
✅ **Bidirectional Streaming API** - Session management and audio processing  
✅ **Updated Routes** (`app/routes/api/nova_sonic_routes.py`)  
✅ **Sales Training Tools** - Integration with your existing coaching logic  

### New API Endpoints

#### 1. Start Conversation Session
```http
POST /api/nova-sonic/start-conversation
Authorization: Bearer <token>
Content-Type: application/json

{
    "voice_type": "feminine",
    "system_prompt": "You are a sales prospect..."
}
```

#### 2. Stream Audio (Real-time)
```http
POST /api/nova-sonic/stream-audio
Content-Type: application/json

{
    "session_id": "session-uuid",
    "audio": "base64-encoded-audio-data"
}
```

#### 3. End Session
```http
POST /api/nova-sonic/end-session
Authorization: Bearer <token>
Content-Type: application/json

{
    "session_id": "session-uuid"
}
```

## Frontend Integration

### Update Your Voice Interface

Replace the current mock implementation with real Nova Sonic calls:

```typescript
// Start Nova Sonic session
const startNovaSession = async () => {
    const response = await fetch('/api/nova-sonic/start-conversation', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            voice_type: 'feminine',
            system_prompt: 'You are a realistic sales prospect...'
        })
    });
    
    const session = await response.json();
    return session.session_id;
};

// Send audio to Nova Sonic
const sendAudioToNova = async (sessionId: string, audioData: Blob) => {
    const base64Audio = await blobToBase64(audioData);
    
    const response = await fetch('/api/nova-sonic/stream-audio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            session_id: sessionId,
            audio: base64Audio
        })
    });
    
    return await response.json();
};
```

## Testing Nova Sonic

### 1. Test Service Status
```bash
curl -X GET http://localhost:8080/api/nova-sonic/status
```

Expected response:
```json
{
    "available": true,
    "region": "us-east-1",
    "model_id": "amazon.nova-sonic-v1:0",
    "initialized": true,
    "active_sessions": 0,
    "voices": {
        "feminine": "Available",
        "masculine": "Available"
    },
    "status": "ready"
}
```

### 2. Test Session Creation
```bash
curl -X POST http://localhost:8080/api/nova-sonic/start-conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"voice_type": "feminine"}'
```

## Advanced Configuration

### Custom Sales Training Prompts

Customize the system prompt for different sales scenarios:

```python
# Cold calling scenario
cold_call_prompt = """
You are a busy business owner who receives many cold calls. 
You're initially skeptical but can be convinced if the salesperson 
demonstrates clear value. Ask tough questions about ROI and implementation.
"""

# Demo scenario  
demo_prompt = """
You are an interested prospect evaluating solutions. 
Ask detailed questions about features, pricing, and implementation. 
Raise realistic concerns about budget and timeline.
"""
```

### Tool Integration

Nova Sonic can call your existing sales training functions:

```python
# In nova_sonic_service.py
class SalesTrainingTools:
    @staticmethod
    async def get_sales_scenario(scenario_type: str):
        # Your existing scenario logic
        return await get_training_scenario(scenario_type)
    
    @staticmethod
    async def evaluate_performance(transcript: str):
        # Your existing evaluation logic
        return await analyze_sales_call(transcript)
```

## Troubleshooting

### Common Issues

1. **"Nova Sonic not available"**
   - Check AWS credentials
   - Verify region is `us-east-1`
   - Ensure model is enabled in Bedrock console

2. **"Session creation failed"**
   - Check IAM permissions
   - Verify internet connectivity
   - Check AWS service status

3. **"Audio streaming errors"**
   - Ensure audio is 16kHz, mono, PCM format
   - Check base64 encoding
   - Verify session is active

### Debug Mode

Enable debug logging:

```python
import logging
logging.getLogger('app.services.nova_sonic_service').setLevel(logging.DEBUG)
```

## Next Steps

1. **Test the status endpoint** - Verify Nova Sonic is available
2. **Create a test session** - Start with simple text prompts
3. **Implement audio streaming** - Connect your voice interface
4. **Add sales scenarios** - Integrate with your training logic
5. **Deploy and test** - Run end-to-end voice conversations

## Resources

- [AWS Nova Sonic Documentation](https://docs.aws.amazon.com/nova/latest/userguide/speech.html)
- [Nova Sonic GitHub Samples](https://github.com/aws-samples/amazon-nova-samples/tree/main/speech-to-speech)
- [Bedrock Model Access](https://console.aws.amazon.com/bedrock/home#/modelaccess)

---

**Ready to implement true voice-to-voice sales training with Nova Sonic!** 🚀

This implementation provides the foundation for natural, real-time voice conversations that will make your sales training incredibly engaging and effective. 