"""API routes for call recordings and audio analysis."""

import os
import json
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import CallRecording
from app import api_manager
from flask import g

logger = logging.getLogger(__name__)

call_bp = Blueprint('call', __name__)


def get_upload_dir():
    """Get the upload directory for recordings."""
    upload_dir = os.path.join(current_app.instance_path, 'recordings')
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


@call_bp.route('/api/calls/recording', methods=['POST'])
def upload_recording():
    """
    Upload a call recording audio file.
    
    Expected multipart/form-data:
    - audio: audio file blob
    - session_id: unique call session id
    - duration_seconds: call duration
    """
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        session_id = request.form.get('session_id', '').strip()
        duration_seconds = request.form.get('duration_seconds', type=float)
        
        if not session_id:
            return jsonify({'error': 'session_id is required'}), 400
        
        if audio_file.filename == '':
            return jsonify({'error': 'Empty audio file'}), 400
        
        # Save file with timestamped filename
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = secure_filename(f"{session_id}_{timestamp}.webm")
        upload_dir = get_upload_dir()
        file_path = os.path.join(upload_dir, filename)
        audio_file.save(file_path)
        
        # Create or update recording record
        recording = CallRecording.query.filter_by(session_id=session_id).first()
        if not recording:
            recording = CallRecording(
                session_id=session_id,
                audio_path=file_path,
                duration_seconds=duration_seconds
            )
            db.session.add(recording)
        else:
            recording.audio_path = file_path
            recording.duration_seconds = duration_seconds
            recording.status = 'uploaded'
        
        db.session.commit()
        
        logger.info(f"Saved recording {recording.id} for session {session_id}")
        
        return jsonify({
            'success': True,
            'recording': recording.to_dict()
        })
        
    except Exception as e:
        logger.exception(f"Error uploading recording: {str(e)}")
        db.session.rollback()
        return jsonify({
            'error': 'Failed to upload recording',
            'details': str(e)
        }), 500


@call_bp.route('/api/calls/recordings/<session_id>', methods=['GET'])
def get_recording(session_id):
    """Get recording metadata for a session."""
    try:
        recording = CallRecording.query.filter_by(session_id=session_id).first()
        if not recording:
            return jsonify({'error': 'Recording not found'}), 404
        
        return jsonify({
            'recording': recording.to_dict()
        })
        
    except Exception as e:
        logger.exception(f"Error fetching recording: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch recording',
            'details': str(e)
        }), 500


@call_bp.route('/api/calls/recordings/<session_id>/audio', methods=['GET'])
def serve_audio(session_id):
    """Serve the audio file for a recording."""
    try:
        recording = CallRecording.query.filter_by(session_id=session_id).first()
        if not recording or not recording.audio_path:
            return jsonify({'error': 'Recording not found'}), 404
        
        if not os.path.exists(recording.audio_path):
            return jsonify({'error': 'Audio file not found'}), 404
        
        directory = os.path.dirname(recording.audio_path)
        filename = os.path.basename(recording.audio_path)
        
        return send_from_directory(
            directory,
            filename,
            mimetype='audio/webm'
        )
        
    except Exception as e:
        logger.exception(f"Error serving audio: {str(e)}")
        return jsonify({
            'error': 'Failed to serve audio',
            'details': str(e)
        }), 500


@call_bp.route('/api/calls/recordings/<session_id>/analyze-emotion', methods=['POST'])
def analyze_emotion(session_id):
    """
    Analyze emotions in a recorded call using Hume AI.
    """
    try:
        recording = CallRecording.query.filter_by(session_id=session_id).first()
        if not recording:
            return jsonify({'error': 'Recording not found'}), 404
        
        if not recording.audio_path or not os.path.exists(recording.audio_path):
            return jsonify({'error': 'Audio file not found'}), 404
        
        # Get API key from environment
        api_key = os.environ.get('HUME_API_KEY')
        if not api_key:
            return jsonify({
                'error': 'Hume API key not configured',
                'details': 'Set HUME_API_KEY environment variable'
            }), 500
        
        recording.status = 'analyzing'
        db.session.commit()
        
        try:
            # Import Hume SDK here to avoid startup dependency
            from hume import HumeBatchClient
            from hume.models.config import ProsodyConfig
            
            client = HumeBatchClient(api_key)
            
            # Start batch job with prosody (voice expression) models
            job = client.submit_job(
                urls=[],
                configs=[ProsodyConfig()],
                files=[recording.audio_path]
            )
            
            job.await_complete()
            
            # Get predictions
            predictions = job.get_predictions()
            
            if predictions and len(predictions) > 0:
                emotion_data = predictions[0]
                recording.emotion_analysis = json.dumps(emotion_data)
                recording.status = 'analyzed'
            else:
                recording.status = 'error'
                recording.emotion_analysis = json.dumps({'error': 'No predictions returned'})
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'recording': recording.to_dict()
            })
            
        except Exception as e:
            recording.status = 'error'
            recording.emotion_analysis = json.dumps({'error': str(e)})
            db.session.commit()
            logger.exception(f"Error analyzing emotion with Hume: {str(e)}")
            return jsonify({
                'error': 'Hume analysis failed',
                'details': str(e)
            }), 500
        
    except Exception as e:
        logger.exception(f"Error in analyze_emotion: {str(e)}")
        db.session.rollback()
        return jsonify({
            'error': 'Failed to analyze emotion',
            'details': str(e)
        }), 500
