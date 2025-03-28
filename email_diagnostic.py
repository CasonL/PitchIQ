import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Enhanced Logging Configuration
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("email_diagnostic_log.txt"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def diagnose_email_configuration():
    """
    Comprehensive diagnostic function to check email configuration
    and sending capabilities
    """
    # Hardcoded configuration from .env
    config = {
        'SMTP_SERVER': 'smtp.gmail.com',
        'SMTP_PORT': 587,
        'SMTP_USERNAME': 'casonlamothe@gmail.com',
        'SMTP_PASSWORD': 'afgb xivt mkaw zrka',
        'FROM_EMAIL': 'casonlamothe@gmail.com'
    }

    # Diagnostic Information Collection
    diagnostics = {
        "Environment Variables": {},
        "SMTP Connection": None,
        "Authentication": None,
        "Email Sending": None
    }

    try:
        # Collect Configuration Details
        for var, value in config.items():
            diagnostics['Environment Variables'][var] = {
                'value': value,
                'is_set': bool(value)
            }
            logger.info(f"{var}: {'SET' if value else 'NOT SET'}")

        # SMTP Connection Test
        try:
            logger.info(f"Attempting to connect to {config['SMTP_SERVER']}:{config['SMTP_PORT']}")
            server = smtplib.SMTP(config['SMTP_SERVER'], config['SMTP_PORT'])
            server.set_debuglevel(1)  # Detailed SMTP protocol logging
            server.starttls()
            diagnostics['SMTP Connection'] = "Successful"
            logger.info("SMTP Connection established successfully")

            # Authentication Test
            try:
                server.login(config['SMTP_USERNAME'], config['SMTP_PASSWORD'])
                diagnostics['Authentication'] = "Successful"
                logger.info("SMTP Authentication successful")

                # Email Sending Test
                try:
                    msg = MIMEMultipart()
                    msg['From'] = config['FROM_EMAIL']
                    msg['To'] = config['SMTP_USERNAME']  # Send to self
                    msg['Subject'] = "Sales Training AI - Email Diagnostic Test"

                    body = """
                    This is a diagnostic email to test the email configuration 
                    for the Sales Training AI application.

                    If you receive this email, your SMTP configuration is working correctly.
                    """
                    msg.attach(MIMEText(body, 'plain'))

                    server.send_message(msg)
                    diagnostics['Email Sending'] = "Successful"
                    logger.info("Test email sent successfully")

                except Exception as send_error:
                    diagnostics['Email Sending'] = f"Failed: {str(send_error)}"
                    logger.error(f"Email sending failed: {send_error}")

            except smtplib.SMTPAuthenticationError as auth_error:
                diagnostics['Authentication'] = f"Failed: {str(auth_error)}"
                logger.error(f"SMTP Authentication failed: {auth_error}")

        except Exception as conn_error:
            diagnostics['SMTP Connection'] = f"Failed: {str(conn_error)}"
            logger.error(f"SMTP Connection failed: {conn_error}")
            
            # Additional network troubleshooting info
            import socket
            try:
                socket.create_connection(('smtp.gmail.com', 587), timeout=5)
                logger.info("Network connection to Gmail SMTP server successful")
            except Exception as network_error:
                logger.error(f"Network connection failed: {network_error}")

        finally:
            try:
                server.quit()
            except:
                pass

    except Exception as e:
        logger.error(f"Unexpected error in email diagnostics: {e}")
        diagnostics['Unexpected Error'] = str(e)

    return diagnostics

def main():
    """
    Run comprehensive email configuration diagnostics
    """
    print("Starting Email Configuration Diagnostics...")
    results = diagnose_email_configuration()
    
    print("\n--- Diagnostic Results ---")
    for key, value in results.items():
        print(f"{key}: {value}")

if __name__ == "__main__":
    main()
    