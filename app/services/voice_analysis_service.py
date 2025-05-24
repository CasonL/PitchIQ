import os
import logging
import librosa
import numpy as np
from flask import current_app
import json
from datetime import datetime

# Configure logging
logger = logging.getLogger(__name__)

class VoiceAnalysisService:
    """Service for analyzing voice tone and emotion from audio files."""
    
    def __init__(self):
        """Initialize the VoiceAnalysisService."""
        self.logger = logging.getLogger(__name__)
        # No app context needed here, so init is simple
        self.initialized = True 
        self.logger.info("Voice Analysis Service initialized.")
        # Filler words list
        self.filler_words = [
            "um", "uh", "like", "actually", "basically", "literally", 
            "you know", "kind of", "sort of", "i mean", "right", "okay",
            "so", "well", "hmm", "er"
        ]

    def init_app(self, app):
        """Optional init_app method for consistency, currently does nothing."""
        # Add future app-context dependent initialization here if needed
        self.logger.info("VoiceAnalysisService init_app called (no actions taken).")
        pass
        
    def analyze_audio_tone(self, audio_path, transcript=None):
        """
        Analyze the tone of an audio file.
        
        Args:
            audio_path (str): Path to the audio file
            transcript (str, optional): Transcript of the audio
            
        Returns:
            dict: A dictionary containing tone analysis results
        """
        try:
            self.logger.info(f"Analyzing audio tone from {audio_path}")
            
            # Basic audio features extraction using librosa
            try:
                # Load the audio file
                y, sr = librosa.load(audio_path, sr=None)
                
                # Extract features
                # RMS energy (volume/intensity)
                rms = np.mean(librosa.feature.rms(y=y)[0])
                
                # Spectral centroid (brightness/sharpness)
                centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0])
                
                # Zero crossing rate (noisiness/clarity)
                zcr = np.mean(librosa.feature.zero_crossing_rate(y=y)[0])
                
                # Speech rate estimation (rough approximation)
                if transcript:
                    word_count = len(transcript.split())
                    duration = librosa.get_duration(y=y, sr=sr)
                    speech_rate = word_count / (duration / 60) if duration > 0 else 0
                else:
                    speech_rate = 0
                
                # Determine confidence level based on features
                confidence_score = min(100, max(0, int((1 - 0.5 * zcr) * 100)))
                
                # Determine pace based on speech rate
                if speech_rate == 0:
                    pace = "Unknown"
                    pace_score = 50
                elif speech_rate < 120:
                    pace = "Slow"
                    pace_score = 30
                elif speech_rate < 160:
                    pace = "Moderate"
                    pace_score = 50
                else:
                    pace = "Fast"
                    pace_score = 80
                
                return {
                    "confidence": {
                        "score": confidence_score,
                        "level": "High" if confidence_score > 75 else "Medium" if confidence_score > 50 else "Low"
                    },
                    "pace": {
                        "score": pace_score,
                        "level": pace,
                        "words_per_minute": round(speech_rate, 1) if speech_rate > 0 else None
                    },
                    "audio_features": {
                        "volume": round(float(rms), 4),
                        "clarity": round(float(1 - zcr), 4),
                        "pitch": round(float(centroid), 4)
                    }
                }
                
            except Exception as e:
                self.logger.error(f"Error extracting audio features: {str(e)}")
                # Fallback to simple analysis without librosa
                return {
                    "confidence": {"score": 60, "level": "Medium"},
                    "pace": {"score": 50, "level": "Moderate", "words_per_minute": None},
                    "audio_features": {"volume": 0.5, "clarity": 0.5, "pitch": 0.5},
                    "error": f"Limited analysis due to: {str(e)}"
                }
                
        except Exception as e:
            self.logger.error(f"Error analyzing audio tone: {str(e)}")
            return {
                "confidence": {"score": 50, "level": "Unknown"},
                "pace": {"score": 50, "level": "Unknown", "words_per_minute": None},
                "error": f"Failed to analyze audio: {str(e)}"
            }
    
    def analyze_with_deepgram(self, audio_path=None, audio_buffer=None, transcript=None, deepgram_response=None):
        """
        Analyze voice using Deepgram's advanced features for more nuanced confidence detection.
        
        Args:
            audio_path (str, optional): Path to the audio file
            audio_buffer (bytes, optional): Audio data buffer
            transcript (dict, optional): Pre-existing Deepgram transcript
            deepgram_response (dict, optional): Full Deepgram API response if already available
            
        Returns:
            dict: Comprehensive voice analysis results
        """
        try:
            self.logger.info(f"Analyzing audio using Deepgram advanced features")
            
            # Use provided transcript or analyze audio
            if deepgram_response:
                result = deepgram_response
            elif transcript:
                result = transcript
            else:
                # Process the audio with Deepgram (requires Deepgram service)
                try:
                    from app.services.deepgram_service import deepgram_service
                    import asyncio
                    
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    if audio_path:
                        # Process file
                        result = loop.run_until_complete(deepgram_service.transcribe_file(audio_path, {
                            "punctuate": True,
                            "diarize": True,
                            "utterances": True,
                            "detect_topics": True,
                            "detect_entities": True,
                            "summarize": True
                        }))
                    elif audio_buffer:
                        # Process buffer
                        result = loop.run_until_complete(deepgram_service.transcribe_buffer(audio_buffer, {
                            "punctuate": True,
                            "diarize": True,
                            "utterances": True,
                            "detect_topics": True,
                            "detect_entities": True,
                            "summarize": True
                        }))
                    else:
                        raise ValueError("Either audio_path or audio_buffer must be provided")
                        
                except Exception as e:
                    self.logger.error(f"Error transcribing with Deepgram: {str(e)}")
                    # Fall back to basic analysis
                    return self.analyze_audio_tone(audio_path, transcript)
            
            # Initialize analysis results
            analysis = {
                "confidence": {
                    "score": 0,
                    "factors": {}
                },
                "pace": {
                    "score": 0,
                    "words_per_minute": 0,
                    "variation": 0
                },
                "speech_patterns": {
                    "filler_words": {
                        "count": 0,
                        "percentage": 0,
                        "instances": []
                    },
                    "hesitations": {
                        "count": 0,
                        "instances": []
                    },
                    "interruptions": {
                        "count": 0,
                        "instances": []
                    }
                },
                "word_analysis": {
                    "low_confidence_words": [],
                    "uncertain_phrases": []
                },
                "emotional_indicators": {}
            }
            
            # Extract utterances if available
            utterances = result.get("results", {}).get("utterances", [])
            
            # Extract alternatives
            alternatives = result.get("results", {}).get("channels", [{}])[0].get("alternatives", [])
            if not alternatives:
                self.logger.warning("No transcription alternatives found in Deepgram response")
                return self.analyze_audio_tone(audio_path, transcript)
                
            # Get primary transcript
            transcript_data = alternatives[0]
            
            # Get words with confidence scores
            words = transcript_data.get("words", [])
            
            # Calculate word-level confidence
            if words:
                # Track low confidence words
                low_confidence_threshold = 0.75
                low_confidence_words = []
                word_confidences = []
                
                for word in words:
                    confidence = word.get("confidence", 0)
                    word_confidences.append(confidence)
                    
                    if confidence < low_confidence_threshold:
                        low_confidence_words.append({
                            "word": word.get("word"),
                            "confidence": confidence,
                            "start": word.get("start"),
                            "end": word.get("end")
                        })
                
                # Average word confidence
                avg_word_confidence = sum(word_confidences) / len(word_confidences) if word_confidences else 0
                confidence_variability = np.std(word_confidences) if len(word_confidences) > 1 else 0
                
                analysis["confidence"]["factors"]["word_confidence"] = {
                    "average": avg_word_confidence,
                    "variability": confidence_variability
                }
                
                analysis["word_analysis"]["low_confidence_words"] = low_confidence_words[:10]  # Limit to top 10
            
            # Analyze filler words
            total_words = len(words)
            filler_count = 0
            filler_instances = []
            
            for word in words:
                word_text = word.get("word", "").lower()
                for filler in self.filler_words:
                    if filler == word_text or (filler.count(" ") > 0 and filler in word_text):
                        filler_count += 1
                        filler_instances.append({
                            "word": word_text,
                            "start": word.get("start"),
                            "end": word.get("end")
                        })
                        break
            
            filler_percentage = (filler_count / total_words) * 100 if total_words > 0 else 0
            analysis["speech_patterns"]["filler_words"]["count"] = filler_count
            analysis["speech_patterns"]["filler_words"]["percentage"] = filler_percentage
            analysis["speech_patterns"]["filler_words"]["instances"] = filler_instances[:10]  # Limit to top 10
            
            # Analyze pauses/hesitations from utterance data
            if utterances:
                pause_threshold = 0.5  # Seconds
                pauses = []
                
                for i in range(1, len(utterances)):
                    prev_end = utterances[i-1].get("end")
                    current_start = utterances[i].get("start")
                    
                    if prev_end is not None and current_start is not None:
                        pause_duration = current_start - prev_end
                        if pause_duration > pause_threshold:
                            pauses.append({
                                "start": prev_end,
                                "end": current_start,
                                "duration": pause_duration
                            })
                
                analysis["speech_patterns"]["hesitations"]["count"] = len(pauses)
                analysis["speech_patterns"]["hesitations"]["instances"] = pauses[:10]  # Limit to top 10
            
            # Calculate speech rate (words per minute)
            if words and len(words) > 1:
                first_word = words[0]
                last_word = words[-1]
                
                duration_sec = last_word.get("end", 0) - first_word.get("start", 0)
                if duration_sec > 0:
                    wpm = (len(words) / duration_sec) * 60
                    analysis["pace"]["words_per_minute"] = wpm
                    
                    # Determine pace category
                    if wpm < 130:
                        pace_level = "Slow"
                        pace_score = max(30, min(50, int(wpm / 130 * 50)))
                    elif wpm < 170:
                        pace_level = "Moderate"
                        pace_score = max(50, min(70, int(50 + (wpm - 130) / 40 * 20)))
                    else:
                        pace_level = "Fast"
                        pace_score = max(70, min(90, int(70 + (wpm - 170) / 50 * 20)))
                    
                    analysis["pace"]["score"] = pace_score
                    analysis["pace"]["level"] = pace_level
                    
                    # Calculate pace variation if we have utterances
                    if utterances and len(utterances) > 1:
                        utterance_rates = []
                        
                        for utterance in utterances:
                            utt_words = utterance.get("words", [])
                            if len(utt_words) > 1:
                                utt_duration = utt_words[-1].get("end", 0) - utt_words[0].get("start", 0)
                                if utt_duration > 0:
                                    utt_wpm = (len(utt_words) / utt_duration) * 60
                                    utterance_rates.append(utt_wpm)
                        
                        if utterance_rates:
                            pace_variation = np.std(utterance_rates)
                            analysis["pace"]["variation"] = pace_variation
            
            # Calculate overall confidence score based on multiple factors
            confidence_factors = {
                "word_confidence": 0.4,
                "filler_words": 0.2,
                "hesitations": 0.2,
                "pace": 0.2
            }
            
            # Word confidence factor (higher is better)
            word_confidence_score = avg_word_confidence * 100 if 'avg_word_confidence' in locals() else 70
            
            # Filler words factor (lower is better)
            max_filler_percent = 15  # Anything above 15% is considered poor
            filler_score = max(0, 100 - (filler_percentage / max_filler_percent * 100))
            
            # Hesitations factor (lower is better)
            max_hesitations = 10  # More than 10 significant hesitations is considered poor
            hesitation_count = len(pauses) if 'pauses' in locals() else 0
            hesitation_score = max(0, 100 - (hesitation_count / max_hesitations * 100))
            
            # Pace factor (moderate is better)
            pace_score = analysis["pace"]["score"] if "score" in analysis["pace"] else 50
            
            # Calculate weighted confidence score
            confidence_score = (
                word_confidence_score * confidence_factors["word_confidence"] +
                filler_score * confidence_factors["filler_words"] +
                hesitation_score * confidence_factors["hesitations"] +
                pace_score * confidence_factors["pace"]
            )
            
            # Update confidence score and level
            analysis["confidence"]["score"] = int(confidence_score)
            analysis["confidence"]["level"] = "High" if confidence_score > 75 else "Medium" if confidence_score > 50 else "Low"
            
            # Store individual factor scores for transparency
            analysis["confidence"]["factors"]["word_confidence"]["score"] = word_confidence_score
            analysis["confidence"]["factors"]["filler_words"] = {
                "score": filler_score,
                "percentage": filler_percentage
            }
            analysis["confidence"]["factors"]["hesitations"] = {
                "score": hesitation_score,
                "count": hesitation_count
            }
            analysis["confidence"]["factors"]["pace"] = {
                "score": pace_score
            }
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error in Deepgram analysis: {str(e)}")
            # Fall back to basic analysis
            return self.analyze_audio_tone(audio_path, transcript)

    def detect_key_moments(self, audio_path, transcript):
        """
        Detect key moments in the audio based on the transcript.
        
        Args:
            audio_path (str): Path to the audio file
            transcript (str): Transcript of the audio
            
        Returns:
            list: A list of key moments detected in the audio
        """
        try:
            self.logger.info(f"Detecting key moments from {audio_path}")
            
            # Define keywords for different types of moments
            moment_patterns = {
                "value_proposition": [
                    "benefit", "advantage", "solution", "solve", "improve", "increase", "decrease",
                    "enhance", "optimize", "save", "reduce", "boost", "value"
                ],
                "objection_handling": [
                    "concern", "worry", "issue", "problem", "challenge", "obstacle", "however",
                    "but", "although", "understand", "perspective", "viewpoint", "alternative"
                ],
                "closing_attempt": [
                    "next steps", "move forward", "decision", "agreement", "proceed", "implement",
                    "start", "begin", "schedule", "plan", "proposal", "contract", "deal"
                ],
                "rapport_building": [
                    "appreciate", "thank", "understand", "feel", "share", "common", "similar",
                    "agree", "relationship", "trust", "partner", "work together", "collaborate"
                ]
            }
            
            # Initialize key moments
            key_moments = []
            
            # Simple keyword-based detection
            words = transcript.lower().split()
            
            for i, word in enumerate(words):
                for moment_type, keywords in moment_patterns.items():
                    for keyword in keywords:
                        if keyword in word or (i < len(words) - 1 and keyword == f"{word} {words[i+1]}"):
                            # Create a context snippet (before and after the keyword)
                            start_idx = max(0, i - 5)
                            end_idx = min(len(words), i + 6)
                            context = " ".join(words[start_idx:end_idx])
                            
                            # Avoid duplicate moments close to each other
                            if not key_moments or all(abs(i - m.get("word_position", 0)) > 10 for m in key_moments):
                                key_moments.append({
                                    "type": moment_type,
                                    "timestamp": datetime.utcnow().isoformat(),
                                    "word_position": i,
                                    "keyword": keyword,
                                    "context": context,
                                    "confidence": 0.7  # Fixed confidence for now
                                })
            
            # Sort moments by their position in the transcript
            key_moments.sort(key=lambda m: m.get("word_position", 0))
            
            # Limit to 5 most significant moments
            return key_moments[:5]
            
        except Exception as e:
            self.logger.error(f"Error detecting key moments: {str(e)}")
            return []

# --- Global Instance --- 
# Create an instance but don't initialize fully here.
# Initialization needs app context via init_app().
voice_analysis_service = VoiceAnalysisService()

# --- REMOVED get_voice_analysis_service() function ---
# def get_voice_analysis_service():
#     """
#     Get the voice analysis service singleton instance.
#     
#     Returns:
#         VoiceAnalysisService: The voice analysis service instance
#     """
#     global _voice_analysis_service
#     
#     if _voice_analysis_service is None:
#         _voice_analysis_service = VoiceAnalysisService()
#         
def get_voice_analysis_service():
    """
    Get the voice analysis service singleton instance.
    
    Returns:
        VoiceAnalysisService: The voice analysis service instance
    """
    global _voice_analysis_service
    
    if _voice_analysis_service is None:
        _voice_analysis_service = VoiceAnalysisService()
        
    return _voice_analysis_service 