from flask import Blueprint, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
from datetime import datetime
import os
from app.extensions import csrf
from app.services.email_service import send_email

# Create blueprint
contact_bp = Blueprint('contact', __name__)

# Set up logging
logger = logging.getLogger(__name__)

@contact_bp.route('/contact', methods=['POST'])
@csrf.exempt
def submit_contact():
    """Handle contact form submissions"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['name', 'email', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field.title()} is required'}), 400
        
        # Extract form data
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        subject = data.get('subject', '').strip()
        message = data.get('message', '').strip()
        early_access = data.get('earlyAccess', False)
        get_updates = data.get('getUpdates', False)
        
        # Get client info
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        
        # Log the contact submission
        logger.info(f"Contact form submission from {name} ({email})")
        logger.info(f"Subject: {subject}")
        logger.info(f"Message: {message[:100]}...")
        logger.info(f"Early Access: {early_access}, Updates: {get_updates}")
        logger.info(f"IP: {ip_address}, User Agent: {user_agent[:50]}...")
        
        # Send email notification to Cason
        email_subject = f"PitchIQ Contact Form: {subject}" if subject else f"PitchIQ Contact Form from {name}"
        
        # Create HTML email content
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">
                        New Contact Form Submission
                    </h2>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Contact Information</h3>
                        <p><strong>Name:</strong> {name}</p>
                        <p><strong>Email:</strong> <a href="mailto:{email}">{email}</a></p>
                        <p><strong>Subject:</strong> {subject if subject else 'No subject provided'}</p>
                    </div>
                    
                    <div style="background-color: #fff; padding: 20px; border-left: 4px solid #d32f2f; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Message</h3>
                        <p style="white-space: pre-wrap;">{message}</p>
                    </div>
                    
                    {f'''
                    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2e7d32;">Email Signup Requests</h3>
                        <p><strong>Early Access:</strong> {'✅ Yes' if early_access else '❌ No'}</p>
                        <p><strong>Get Updates:</strong> {'✅ Yes' if get_updates else '❌ No'}</p>
                    </div>
                    ''' if early_access or get_updates else ''}
                    
                    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 12px; color: #666;">
                        <h4 style="margin-top: 0;">Technical Details</h4>
                        <p><strong>IP Address:</strong> {ip_address}</p>
                        <p><strong>User Agent:</strong> {user_agent}</p>
                        <p><strong>Timestamp:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 14px;">
                            This email was sent from the PitchIQ contact form.
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        # Create plain text version
        text_content = f"""
        New Contact Form Submission - PitchIQ
        
        Contact Information:
        Name: {name}
        Email: {email}
        Subject: {subject if subject else 'No subject provided'}
        
        Message:
        {message}
        
        {f'''
        Email Signup Requests:
        Early Access: {'Yes' if early_access else 'No'}
        Get Updates: {'Yes' if get_updates else 'No'}
        ''' if early_access or get_updates else ''}
        
        Technical Details:
        IP Address: {ip_address}
        User Agent: {user_agent}
        Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
        
        ---
        This email was sent from the PitchIQ contact form.
        """
        
        # Send email to Cason
        email_sent = send_email(
            to_email="Casonlamothe@gmail.com",
            subject=email_subject,
            html_content=html_content,
            text_content=text_content
        )
        
        if not email_sent:
            logger.error("Failed to send contact form email")
            # Still return success to user, but log the failure
        
        # If email signup checkboxes are checked, you could also add to your email list
        if early_access or get_updates:
            # TODO: Add to email signup system
            logger.info(f"User {email} also requested email signup")
        
        return jsonify({
            'success': True,
            'message': 'Thank you for your message! I\'ll get back to you soon.'
        }), 200
        
    except Exception as e:
        logger.error(f"Error processing contact form: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500 