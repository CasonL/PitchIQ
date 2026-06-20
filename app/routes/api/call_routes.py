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


def save_turn_audio(session_id: str, turn_id: str, audio_file):
    """Save a single turn audio file to disk."""
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    filename = secure_filename(f"{session_id}_{turn_id}_{timestamp}.webm")
    upload_dir = get_upload_dir()
    file_path = os.path.join(upload_dir, filename)
    audio_file.save(file_path)
    return file_path


@call_bp.route('/api/calls/timeline', methods=['POST'])
def upload_timeline():
    """
    Upload a complete call timeline with per-turn audio.
    
    Expected multipart/form-data:
    - metadata: JSON string { session_id, duration_seconds, transcript? }
    - turns: JSON string array of { turn_id, speaker, text, start_ms, end_ms, metrics, word_timestamps }
    - audio_<turn_id>: audio file for each turn
    """
    try:
        metadata_str = request.form.get('metadata', '{}')
        turns_str = request.form.get('turns', '[]')
        
        try:
            metadata = json.loads(metadata_str)
            turns = json.loads(turns_str)
        except json.JSONDecodeError as e:
            return jsonify({'error': 'Invalid JSON metadata or turns', 'details': str(e)}), 400
        
        session_id = metadata.get('session_id', '').strip()
        if not session_id:
            return jsonify({'error': 'session_id is required'}), 400
        
        duration_seconds = metadata.get('duration_seconds')
        transcript = metadata.get('transcript', '')
        
        # Create or update call recording
        recording = CallRecording.query.filter_by(session_id=session_id).first()
        if not recording:
            recording = CallRecording(
                session_id=session_id,
                duration_seconds=duration_seconds,
                transcript=transcript,
                status='ready'
            )
            db.session.add(recording)
        else:
            recording.duration_seconds = duration_seconds
            recording.transcript = transcript
            recording.status = 'ready'
        
        db.session.commit()
        
        # Save turn audio and create CallTurn records
        saved_turns = []
        for turn in turns:
            turn_id = turn.get('turn_id', '').strip()
            if not turn_id:
                continue
            
            audio_path = None
            file_key = f"audio_{turn_id}"
            if file_key in request.files:
                audio_file = request.files[file_key]
                if audio_file.filename != '':
                    audio_path = save_turn_audio(session_id, turn_id, audio_file)
            
            # Check if turn already exists
            existing_turn = CallTurn.query.filter_by(
                call_recording_id=recording.id,
                turn_id=turn_id
            ).first()
            
            if existing_turn:
                existing_turn.speaker = turn.get('speaker', 'user')
                existing_turn.text = turn.get('text', '')
                existing_turn.start_ms = turn.get('start_ms')
                existing_turn.end_ms = turn.get('end_ms')
                existing_turn.metrics = json.dumps(turn.get('metrics') or {}) if turn.get('metrics') else None
                existing_turn.word_timestamps = json.dumps(turn.get('word_timestamps') or []) if turn.get('word_timestamps') else None
                if audio_path:
                    existing_turn.audio_path = audio_path
                saved_turns.append(existing_turn)
            else:
                new_turn = CallTurn(
                    call_recording_id=recording.id,
                    turn_id=turn_id,
                    speaker=turn.get('speaker', 'user'),
                    text=turn.get('text', ''),
                    audio_path=audio_path,
                    start_ms=turn.get('start_ms'),
                    end_ms=turn.get('end_ms'),
                    metrics=json.dumps(turn.get('metrics') or {}) if turn.get('metrics') else None,
                    word_timestamps=json.dumps(turn.get('word_timestamps') or []) if turn.get('word_timestamps') else None
                )
                db.session.add(new_turn)
                saved_turns.append(new_turn)
        
        db.session.commit()
        
        logger.info(f"Saved timeline {recording.id} with {len(saved_turns)} turns for session {session_id}")
        
        return jsonify({
            'success': True,
            'recording': recording.to_dict()
        })
        
    except Exception as e:
        logger.exception(f"Error uploading timeline: {str(e)}")
        db.session.rollback()
        return jsonify({
            'error': 'Failed to upload timeline',
            'details': str(e)
        }), 500


@call_bp.route('/api/calls/timeline/<session_id>', methods=['GET'])
def get_timeline(session_id):
    """Get the full call timeline for a session."""
    try:
        recording = CallRecording.query.filter_by(session_id=session_id).first()
        if not recording:
            return jsonify({'error': 'Timeline not found'}), 404
        
        return jsonify({
            'recording': recording.to_dict()
        })
        
    except Exception as e:
        logger.exception(f"Error fetching timeline: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch timeline',
            'details': str(e)
        }), 500


@call_bp.route('/api/calls/turns/<int:turn_id>/audio', methods=['GET'])
def serve_turn_audio(turn_id):
    """Serve the audio file for a single turn."""
    try:
        turn = CallTurn.query.get(turn_id)
        if not turn or not turn.audio_path:
            return jsonify({'error': 'Turn audio not found'}), 404
        
        if not os.path.exists(turn.audio_path):
            return jsonify({'error': 'Audio file not found'}), 404
        
        directory = os.path.dirname(turn.audio_path)
        filename = os.path.basename(turn.audio_path)
        
        return send_from_directory(
            directory,
            filename,
            mimetype='audio/webm'
        )
        
    except Exception as e:
        logger.exception(f"Error serving turn audio: {str(e)}")
        return jsonify({
            'error': 'Failed to serve turn audio',
            'details': str(e)
        }), 500


