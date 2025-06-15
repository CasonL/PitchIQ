"""
Email signup API endpoints for landing page.
Handles email collection with early access and updates preferences.
"""

from flask import Blueprint, request, jsonify, session
from app.extensions import db, csrf
from app.models import EmailSignup
from datetime import datetime
import hashlib
import logging

email_signup_bp = Blueprint('email_signup_api', __name__)
logger = logging.getLogger(__name__)

# Starting count for early access (will decrement with each signup)
EARLY_ACCESS_STARTING_COUNT = 30

def get_computer_fingerprint(request):
    """Generate a computer fingerprint from request data."""
    user_agent = request.headers.get('User-Agent', '')
    ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', ''))
    accept_language = request.headers.get('Accept-Language', '')
    
    # Create a hash from these values
    fingerprint_data = f"{user_agent}|{ip_address}|{accept_language}"
    return hashlib.sha256(fingerprint_data.encode()).hexdigest()

@email_signup_bp.route('/signup', methods=['POST'])
@csrf.exempt
def handle_email_signup():
    """Submit email signup with preferences."""
    try:
        logger.info(f"EMAIL SIGNUP: Received POST request")
        logger.info(f"EMAIL SIGNUP: Content-Type: {request.content_type}")
        logger.info(f"EMAIL SIGNUP: Request data: {request.data}")
        
        data = request.get_json()
        logger.info(f"EMAIL SIGNUP: Parsed JSON data: {data}")
        
        if not data:
            logger.error("EMAIL SIGNUP: No data provided")
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        early_access = data.get('early_access', False)
        get_updates = data.get('get_updates', False)
        
        logger.info(f"EMAIL SIGNUP: Email: {email}, Early Access: {early_access}, Updates: {get_updates}")
        
        if not email:
            logger.error("EMAIL SIGNUP: Email is required")
            return jsonify({'error': 'Email is required'}), 400
        
        # Generate computer fingerprint
        computer_fingerprint = get_computer_fingerprint(request)
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.environ.get('REMOTE_ADDR', ''))
        user_agent = request.headers.get('User-Agent', '')
        
        logger.info(f"EMAIL SIGNUP: Computer fingerprint: {computer_fingerprint}")
        
        # Check if this computer has already submitted
        existing_fingerprint = EmailSignup.query.filter_by(computer_fingerprint=computer_fingerprint).first()
        if existing_fingerprint:
            logger.info("EMAIL SIGNUP: Computer fingerprint already exists")
            return jsonify({
                'error': 'This computer has already submitted an email signup',
                'already_submitted': True
            }), 409
        
        # Check if email already exists
        existing_email = EmailSignup.query.filter_by(email=email).first()
        if existing_email:
            logger.info("EMAIL SIGNUP: Email already exists")
            return jsonify({
                'error': 'This email has already been registered',
                'already_submitted': True
            }), 409
        
        # Create new signup
        signup = EmailSignup(
            email=email,
            early_access=early_access,
            get_updates=get_updates,
            computer_fingerprint=computer_fingerprint,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info("EMAIL SIGNUP: Creating new signup record")
        db.session.add(signup)
        db.session.commit()
        logger.info("EMAIL SIGNUP: Successfully committed to database")
        
        # Get current early access count
        early_access_count = EmailSignup.query.filter_by(early_access=True).count()
        remaining_count = max(0, EARLY_ACCESS_STARTING_COUNT - early_access_count)
        
        logger.info(f"New email signup: {email}, Early Access: {early_access}, Updates: {get_updates}")
        
        return jsonify({
            'success': True,
            'message': 'Email submitted successfully!',
            'remaining_early_access': remaining_count,
            'early_access_selected': early_access
        }), 201
        
    except Exception as e:
        logger.error(f"Error in email signup: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        db.session.rollback()
        return jsonify({'error': 'Internal server error'}), 500

@email_signup_bp.route('/count', methods=['GET'])
@csrf.exempt
def get_early_access_count():
    """Get the current early access count."""
    logger.info("EMAIL SIGNUP: get_early_access_count route called!")
    try:
        # Count early access signups
        early_access_count = EmailSignup.query.filter_by(early_access=True).count()
        total_signups = EmailSignup.query.count()
        remaining = max(0, EARLY_ACCESS_STARTING_COUNT - early_access_count)
        
        logger.info(f"EMAIL SIGNUP: Returning count data - early_access: {early_access_count}, total: {total_signups}, remaining: {remaining}")
        
        return jsonify({
            'early_access_signups': early_access_count,
            'total_signups': total_signups,
            'remaining_early_access': remaining
        }), 200
    except Exception as e:
        logger.error(f"EMAIL SIGNUP: Error getting count: {e}")
        return jsonify({'error': 'Failed to get count'}), 500

@email_signup_bp.route('/admin/email-signups', methods=['POST'])
@csrf.exempt
def admin_login():
    """Admin login endpoint."""
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        if password == 'Theguitarguy24':
            session['admin_authenticated'] = True
            return jsonify({'success': True, 'message': 'Admin authenticated'}), 200
        else:
            return jsonify({'error': 'Invalid password'}), 401
            
    except Exception as e:
        logger.error(f"Error in admin login: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@email_signup_bp.route('/admin/email-signups', methods=['GET'])
@csrf.exempt
def get_admin_data():
    """Get all email signup data for admin."""
    try:
        # Check admin authentication
        if not session.get('admin_authenticated'):
            return jsonify({'error': 'Admin authentication required'}), 401
        
        signups = EmailSignup.query.order_by(EmailSignup.created_at.desc()).all()
        
        data = {
            'total_signups': len(signups),
            'early_access_count': sum(1 for s in signups if s.early_access),
            'updates_count': sum(1 for s in signups if s.get_updates),
            'remaining_early_access': max(0, EARLY_ACCESS_STARTING_COUNT - sum(1 for s in signups if s.early_access)),
            'signups': [signup.to_dict() for signup in signups]
        }
        
        return jsonify(data), 200
        
    except Exception as e:
        logger.error(f"Error getting admin data: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@email_signup_bp.route('/admin/logout', methods=['POST'])
@csrf.exempt
def admin_logout():
    """Admin logout endpoint."""
    session.pop('admin_authenticated', None)
    return jsonify({'success': True, 'message': 'Logged out'}), 200 