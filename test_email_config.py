#!/usr/bin/env python3
"""
Email Configuration Test Script for PitchIQ

This script helps you test and debug email configuration.
Run this to see what email settings are loaded and test sending.
"""

import os
import sys
from dotenv import load_dotenv

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_email_config():
    """Test email configuration and attempt to send a test email"""
    
    print("🔍 Testing Email Configuration for PitchIQ")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Check for .env file
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_file):
        print("✅ .env file found")
    else:
        print("❌ .env file not found")
        print("\n📝 Create a .env file with these settings:")
        print("EMAIL_ENABLED=true")
        print("SMTP_SERVER=smtp.gmail.com")
        print("SMTP_PORT=587")
        print("SMTP_USERNAME=Casonlamothe@gmail.com")
        print("SMTP_PASSWORD=your_gmail_app_password")
        print("FROM_EMAIL=Casonlamothe@gmail.com")
        return False
    
    # Check email settings
    print("\n📧 Email Configuration:")
    email_enabled = os.environ.get('EMAIL_ENABLED', 'false').lower() in ('true', '1', 'yes')
    smtp_server = os.environ.get('SMTP_SERVER')
    smtp_port = os.environ.get('SMTP_PORT', '587')
    smtp_username = os.environ.get('SMTP_USERNAME')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    from_email = os.environ.get('FROM_EMAIL')
    
    print(f"EMAIL_ENABLED: {email_enabled}")
    print(f"SMTP_SERVER: {smtp_server}")
    print(f"SMTP_PORT: {smtp_port}")
    print(f"SMTP_USERNAME: {smtp_username}")
    print(f"SMTP_PASSWORD: {'*' * len(smtp_password) if smtp_password else 'Not set'}")
    print(f"FROM_EMAIL: {from_email}")
    
    # Check for missing settings
    missing = []
    if not email_enabled:
        missing.append("EMAIL_ENABLED (set to true)")
    if not smtp_server:
        missing.append("SMTP_SERVER")
    if not smtp_username:
        missing.append("SMTP_USERNAME")
    if not smtp_password:
        missing.append("SMTP_PASSWORD")
    if not from_email:
        missing.append("FROM_EMAIL")
    
    if missing:
        print(f"\n❌ Missing configuration: {', '.join(missing)}")
        return False
    
    print("\n✅ All email settings are configured!")
    
    # Test email sending
    print("\n📤 Testing email sending...")
    try:
        from app.services.email_service import send_email
        
        test_result = send_email(
            to_email="Casonlamothe@gmail.com",
            subject="PitchIQ Email Test",
            html_content="""
            <html>
                <body>
                    <h2>Email Test Successful! 🎉</h2>
                    <p>Your PitchIQ email configuration is working correctly.</p>
                    <p>Contact forms will now be delivered to your inbox.</p>
                </body>
            </html>
            """,
            text_content="Email Test Successful! Your PitchIQ email configuration is working correctly."
        )
        
        if test_result:
            print("✅ Test email sent successfully!")
            print("📬 Check your inbox at Casonlamothe@gmail.com")
            return True
        else:
            print("❌ Failed to send test email")
            print("📋 Check the logs above for error details")
            return False
            
    except Exception as e:
        print(f"❌ Error testing email: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_email_config()
    if success:
        print("\n🎉 Email configuration is working! Contact forms will be delivered.")
    else:
        print("\n🔧 Please fix the configuration issues above.")
        print("\n💡 For Gmail, you need an 'App Password':")
        print("   1. Go to your Google Account settings")
        print("   2. Security > 2-Step Verification")
        print("   3. App passwords > Generate new password")
        print("   4. Use that password in SMTP_PASSWORD") 