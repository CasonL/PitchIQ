import asyncio
import json
import logging
import websockets
import base64
import subprocess
import tempfile
import os
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class OpenAIRealtimeService:
    """OpenAI Real-Time API service for voice-to-voice conversations"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.sessions = {}
        
    async def start_conversation(self, session_id: str) -> str:
        """Start a new conversation session"""
        self.sessions[session_id] = {
            'created_at': datetime.now(),
            'active': True,
            'conversation_history': []
        }
        
        logger.info(f"🎬 Started OpenAI Real-Time conversation for session {session_id}")
        return session_id
    
    def _convert_webm_to_pcm16_24khz(self, webm_base64: str) -> Optional[str]:
        """Convert WebM audio to PCM16 at 24kHz for OpenAI Real-Time API"""
        try:
            # Decode base64 to bytes
            webm_bytes = base64.b64decode(webm_base64)
            
            # Create temporary files
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as webm_file:
                webm_file.write(webm_bytes)
                webm_path = webm_file.name
            
            with tempfile.NamedTemporaryFile(suffix='.raw', delete=False) as pcm_file:
                pcm_path = pcm_file.name
            
            try:
                # Use ffmpeg to convert WebM to PCM16 mono at 24kHz
                cmd = [
                    'ffmpeg', '-i', webm_path,
                    '-f', 's16le',      # PCM16 format
                    '-ar', '24000',     # 24kHz sample rate
                    '-ac', '1',         # Mono (1 channel)
                    '-y',               # Overwrite output
                    pcm_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                
                if result.returncode != 0:
                    logger.error(f"❌ FFmpeg conversion failed: {result.stderr}")
                    return None
                
                # Read the converted PCM data
                with open(pcm_path, 'rb') as f:
                    pcm_bytes = f.read()
                
                # Convert to base64
                pcm_base64 = base64.b64encode(pcm_bytes).decode('utf-8')
                
                logger.info(f"✅ Converted WebM ({len(webm_bytes)} bytes) to PCM16 ({len(pcm_bytes)} bytes)")
                return pcm_base64
                
            finally:
                # Clean up temporary files
                if os.path.exists(webm_path):
                    os.unlink(webm_path)
                if os.path.exists(pcm_path):
                    os.unlink(pcm_path)
                    
        except Exception as e:
            logger.error(f"❌ Error converting WebM to PCM16: {e}")
            return None
    
    async def process_audio_simple(self, session_id: str, audio_data: str) -> List[Dict[str, Any]]:
        """Process audio using a simple one-shot connection approach"""
        if session_id not in self.sessions:
            logger.error(f"❌ Session {session_id} not found")
            return []
        
        # Convert WebM to PCM16 at 24kHz
        pcm_audio = self._convert_webm_to_pcm16_24khz(audio_data)
        if not pcm_audio:
            logger.error(f"❌ Failed to convert audio format for session {session_id}")
            return [{
                'type': 'error',
                'text': 'Failed to convert audio format. Please ensure ffmpeg is installed.',
                'role': 'system'
            }]
        
        try:
            # Create a fresh connection for this request
            uri = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            logger.info("🔌 Connecting to OpenAI Real-Time API...")
            
            async with websockets.connect(uri, extra_headers=headers) as websocket:
                logger.info("✅ Connected to OpenAI Real-Time API")
                
                # Configure session
                await self._configure_session(websocket)
                
                # Send converted PCM audio data
                audio_event = {
                    "type": "input_audio_buffer.append",
                    "audio": pcm_audio
                }
                await websocket.send(json.dumps(audio_event))
                
                # Commit audio buffer
                commit_event = {
                    "type": "input_audio_buffer.commit"
                }
                await websocket.send(json.dumps(commit_event))
                
                logger.info(f"🎵 Sent audio to OpenAI Real-Time API (session: {session_id})")
                
                # Collect responses with faster exit conditions
                responses = []
                timeout_count = 0
                max_timeouts = 5  # Reduced from 10 to 5 (10 seconds total)
                transcription_received = False
                response_received = False
                
                while timeout_count < max_timeouts:
                    try:
                        # Wait for response with shorter timeout
                        response_raw = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=1.0  # Reduced from 2.0 to 1.0 seconds
                        )
                        
                        response = json.loads(response_raw)
                        response_type = response.get('type')
                        
                        logger.info(f"📨 Received OpenAI event: {response_type}")
                        
                        # Process different response types
                        processed_response = self._process_response(response)
                        if processed_response:
                            responses.append(processed_response)
                            
                            # Track what we've received
                            if processed_response.get('type') == 'transcription':
                                transcription_received = True
                            elif processed_response.get('type') == 'response':
                                response_received = True
                        
                        # Exit early if we have both transcription and response
                        if transcription_received and response_received:
                            logger.info("🚀 Got transcription and response, exiting early for speed")
                            break
                            
                        # Also exit on response.done for safety
                        if response_type == 'response.done':
                            logger.info("✅ Response complete, exiting")
                            break
                        
                        timeout_count = 0  # Reset timeout counter on successful response
                        
                    except asyncio.TimeoutError:
                        timeout_count += 1
                        logger.debug(f"⏱️ Timeout {timeout_count}/{max_timeouts} waiting for OpenAI response")
                        
                        # If we have any meaningful responses, return them
                        if responses and timeout_count >= 2:
                            logger.info("⚡ Returning early due to timeout with existing responses")
                            break
                        continue
                    except Exception as e:
                        logger.error(f"❌ Error receiving OpenAI response: {e}")
                        break
                
                logger.info(f"✅ Collected {len(responses)} responses from OpenAI Real-Time API")
                return responses
                
        except Exception as e:
            logger.error(f"❌ Error in OpenAI Real-Time processing: {e}")
            return []
    
    async def process_audio_ultra_fast(self, session_id: str, audio_data: str) -> List[Dict[str, Any]]:
        """Ultra-fast audio processing targeting 200ms response time"""
        if session_id not in self.sessions:
            logger.error(f"❌ Session {session_id} not found")
            return []
        
        # Convert WebM to PCM16 at 24kHz
        pcm_audio = self._convert_webm_to_pcm16_24khz(audio_data)
        if not pcm_audio:
            logger.error(f"❌ Failed to convert audio format for session {session_id}")
            return [{
                'type': 'error',
                'text': 'Failed to convert audio format. Please ensure ffmpeg is installed.',
                'role': 'system'
            }]
        
        start_time = datetime.now()
        logger.info("⚡ Ultra-fast OpenAI connection...")
        
        try:
            # Create a completely fresh connection for each request
            uri = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            async with websockets.connect(uri, extra_headers=headers) as websocket:
                logger.info("✅ Ultra-fast connected to OpenAI Real-Time API")
                
                # Configure session for speed
                await self._configure_session_fast(websocket)
                
                # Send audio immediately
                audio_event = {
                    "type": "input_audio_buffer.append",
                    "audio": pcm_audio
                }
                await websocket.send(json.dumps(audio_event))
                
                # Commit audio buffer
                commit_event = {"type": "input_audio_buffer.commit"}
                await websocket.send(json.dumps(commit_event))
                
                logger.info(f"⚡ Sent audio to OpenAI Real-Time API (session: {session_id})")
                
                # Ultra-fast response collection
                responses = []
                max_wait_time = 8.0  # Maximum 8 seconds total
                start_collect = datetime.now()
                has_transcription = False
                has_response = False
                
                while (datetime.now() - start_collect).total_seconds() < max_wait_time:
                    try:
                        # Very short timeout for ultra-fast response
                        response_raw = await asyncio.wait_for(
                            websocket.recv(),
                            timeout=0.5  # 500ms timeout per message
                        )
                        
                        response = json.loads(response_raw)
                        response_type = response.get('type')
                        
                        logger.info(f"⚡ Received OpenAI event: {response_type}")
                        
                        # Process response
                        processed_response = self._process_response(response)
                        if processed_response:
                            responses.append(processed_response)
                            
                            # Track completion
                            if processed_response.get('type') == 'transcription':
                                has_transcription = True
                            elif processed_response.get('type') == 'response':
                                has_response = True
                        
                        # Exit conditions for ultra-fast processing
                        if response_type == 'response.done':
                            logger.info("⚡ Response complete")
                            break
                        
                        # Don't exit early - wait for full conversation to complete
                        # The user transcription often arrives after the AI response starts
                        
                    except asyncio.TimeoutError:
                        # Check if we have any responses to return
                        if responses:
                            processing_time = (datetime.now() - start_time).total_seconds() * 1000
                            logger.info(f"⚡ Ultra-fast timeout exit with {len(responses)} responses in {processing_time:.0f}ms")
                            break
                        continue
                    except Exception as e:
                        logger.error(f"❌ Error receiving response: {e}")
                        break
                
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                logger.info(f"⚡ Ultra-fast collected {len(responses)} responses in {processing_time:.0f}ms")
                return responses
                
        except Exception as e:
            logger.error(f"❌ Error in ultra-fast processing: {e}")
            return []
    
    async def _configure_session_fast(self, websocket):
        """Configure the real-time session for ultra-fast responses"""
        config = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": """You are a skilled sales professional. Be conversational and concise. 
                Respond quickly with short, natural responses. Keep responses under 20 words for speed.""",
                "voice": "alloy",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.3,  # Lower threshold for faster detection
                    "prefix_padding_ms": 100,  # Reduced padding for speed
                    "silence_duration_ms": 200  # Very short silence for speed
                },
                "temperature": 0.7,  # Slightly lower for more predictable, faster responses
                "max_response_output_tokens": 50  # Very short responses for speed
            }
        }
        
        await websocket.send(json.dumps(config))
        logger.info("⚡ Configured ultra-fast OpenAI Real-Time session")
    
    async def _configure_session(self, websocket):
        """Configure the real-time session"""
        config = {
            "type": "session.update",
            "session": {
                "modalities": ["text", "audio"],
                "instructions": """You are a skilled sales professional having a conversation with a prospect. 
                Be conversational, engaging, and handle objections naturally. Ask follow-up questions to understand their needs.
                Keep responses concise and natural for voice conversation.""",
                "voice": "alloy",
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1"
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.5,
                    "prefix_padding_ms": 300,
                    "silence_duration_ms": 500
                },
                "temperature": 0.8,
                "max_response_output_tokens": 1000
            }
        }
        
        await websocket.send(json.dumps(config))
        logger.info("🔧 Configured OpenAI Real-Time session")
    
    def _process_response(self, response: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process and normalize OpenAI Real-Time API responses"""
        response_type = response.get('type')
        
        # Log the full response for debugging
        logger.debug(f"🔍 Processing response type: {response_type}")
        
        if response_type == 'conversation.item.input_audio_transcription.completed':
            # User speech transcription complete
            transcript = response.get('transcript', '')
            logger.info(f"📝 User transcription complete: '{transcript}'")
            if transcript.strip():
                return {
                    'type': 'transcription',
                    'text': transcript,
                    'role': 'user'
                }
        
        elif response_type == 'conversation.item.input_audio_transcription.delta':
            # Streaming user transcription
            delta = response.get('delta', '')
            if delta.strip():
                logger.debug(f"📝 User transcription delta: '{delta}'")
                return {
                    'type': 'transcription_partial',
                    'text': delta,
                    'role': 'user'
                }
        
        elif response_type == 'response.audio_transcript.delta':
            # Streaming AI audio transcript - this is the main AI response
            delta = response.get('delta', '')
            if delta.strip():
                logger.info(f"🤖 AI response delta: '{delta}'")
                return {
                    'type': 'response_partial',
                    'text': delta,
                    'role': 'assistant'
                }
        
        elif response_type == 'response.audio_transcript.done':
            # AI audio transcript complete
            transcript = response.get('transcript', '')
            logger.info(f"🤖 AI response complete: '{transcript}'")
            if transcript.strip():
                return {
                    'type': 'response',
                    'text': transcript,
                    'role': 'assistant'
                }
        
        elif response_type == 'response.text.done':
            # AI text response (alternative format)
            text = response.get('text', '')
            logger.info(f"🤖 AI text response: '{text}'")
            if text.strip():
                return {
                    'type': 'response',
                    'text': text,
                    'role': 'assistant'
                }
        
        elif response_type == 'response.audio.done':
            # Audio response complete
            logger.info("🔊 Audio response complete")
            return {
                'type': 'audio_complete',
                'role': 'assistant'
            }
        
        elif response_type == 'error':
            # Error handling
            error = response.get('error', {})
            logger.error(f"❌ OpenAI Real-Time API error: {error}")
            return {
                'type': 'error',
                'text': f"Error: {error.get('message', 'Unknown error')}",
                'role': 'system'
            }
        
        # Log unhandled response types for debugging
        elif response_type not in ['session.created', 'session.updated', 'input_audio_buffer.speech_started', 
                                  'input_audio_buffer.speech_stopped', 'input_audio_buffer.committed',
                                  'conversation.item.created', 'response.created', 'response.done',
                                  'response.output_item.added', 'response.content_part.added']:
            logger.debug(f"🔍 Unhandled response type: {response_type}")
        
        return None
    
    async def end_conversation(self, session_id: str):
        """End a conversation session"""
        if session_id in self.sessions:
            self.sessions[session_id]['active'] = False
            logger.info(f"🛑 Ended OpenAI Real-Time session: {session_id}")
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information"""
        return self.sessions.get(session_id)
    
    @property
    def active_sessions(self) -> int:
        """Get count of active sessions"""
        return len([s for s in self.sessions.values() if s.get('active', False)]) 