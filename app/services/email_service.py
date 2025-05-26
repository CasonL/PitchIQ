"""
Improved Email service for Sales Training AI.

This module provides email sending functionality with enhanced error handling and logging.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.config_manager import config
from flask import current_app, render_template

# Configure more detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("email_debug.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """
    Send an email using SMTP with enhanced error handling.
    """
    try:
        # Get email config from config manager instead of direct environment variables
        smtp_server = config.get('SMTP_SERVER')
        smtp_port = int(config.get('SMTP_PORT', 587))
        smtp_username = config.get('SMTP_USERNAME')
        smtp_password = config.get('SMTP_PASSWORD')
        from_email = config.get('FROM_EMAIL')
        email_enabled = config.get('EMAIL_ENABLED', False)
        
        # Check if email is enabled
        if not email_enabled:
            logger.warning("Email is disabled in configuration (EMAIL_ENABLED=false)")
            return False
        
        # Validate configuration
        missing = []
        if not smtp_server: missing.append("SMTP_SERVER")
        if not smtp_username: missing.append("SMTP_USERNAME")
        if not smtp_password: missing.append("SMTP_PASSWORD")
        if not from_email: missing.append("FROM_EMAIL")
        
        if missing:
            error_msg = f"Email configuration missing: {', '.join(missing)}"
            logger.error(error_msg)
            logger.error("To fix this, create a .env file with the following settings:")
            logger.error("EMAIL_ENABLED=true")
            logger.error("SMTP_SERVER=smtp.gmail.com")
            logger.error("SMTP_PORT=587")
            logger.error("SMTP_USERNAME=your_email@gmail.com")
            logger.error("SMTP_PASSWORD=your_app_password")
            logger.error("FROM_EMAIL=your_email@gmail.com")
            return False
        
        # Create message
        logger.debug("Creating email message")
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email
        msg['Content-Type'] = 'text/html; charset=utf-8'
        
        # Add text part if provided
        if text_content:
            logger.debug("Adding plain text content")
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        
        # Add HTML part
        logger.debug("Adding HTML content")
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        # Send email with detailed logging
        logger.info(f"Connecting to SMTP server: {smtp_server}:{smtp_port}")
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.set_debuglevel(1) # Print SMTP conversation to stdout/stderr
            logger.debug("Starting TLS encryption")
            server.starttls()
            
            # Enhanced DEBUG logging for password
            password_to_log = smtp_password if smtp_password else ""
            masked_password = password_to_log[:2] + '*' * (len(password_to_log) - 4) + password_to_log[-2:] if len(password_to_log) > 4 else "[short_or_no_password]"
            logger.info(f"DEBUG EMAIL_SERVICE: Attempting SMTP login. Username: '{smtp_username}', Password (masked): '{masked_password}', Password Length: {len(password_to_log)}")

            logger.debug("Logging in to SMTP server")
            server.login(smtp_username, smtp_password)
            
            logger.info(f"Sending email to {to_email}")
            server.send_message(msg)
            logger.info("Email sent successfully")
        
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication failed: {str(e)}")
        logger.error("This usually means:")
        logger.error("1. Wrong username/password")
        logger.error("2. For Gmail: You need an 'App Password', not your regular password")
        logger.error("3. Go to: Google Account > Security > 2-Step Verification > App passwords")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email: {str(e)}", exc_info=True)
        return False

def send_password_reset_email(to_email: str, reset_url: str) -> bool:
    """
    Send a password reset email.
    
    Args:
        to_email: Recipient email address
        reset_url: Password reset URL
            
    Returns:
        True if email was sent successfully, False otherwise
    """
    logger.info(f"Preparing password reset email for {to_email}")
    
    # Define subject for the email
    subject = "Reset Your Sales Training AI Password"
    
    html_content = f"""
    <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>You requested to reset your Sales Training AI password. Click the link below to set a new password:</p>
            <p><a href="{reset_url}">Reset Password</a></p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>This link will expire in 1 hour.</p>
        </body>
    </html>
    """
    
    text_content = f"""
    Password Reset Request
    
    You requested to reset your Sales Training AI password. Follow the link below to set a new password:
    
    {reset_url}
    
    If you did not request a password reset, please ignore this email.
    
    This link will expire in 1 hour.
    """
    
    result = send_email(to_email, subject, html_content, text_content)
    if result:
        logger.info(f"Password reset email sent successfully to {to_email}")
    else:
        logger.error(f"Failed to send password reset email to {to_email}")
    
    return result