#!/usr/bin/env python3
"""
Quick script to view all email signups from the database
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import EmailSignup

def view_email_signups():
    app = create_app('dev')
    
    with app.app_context():
        try:
            # Get all email signups ordered by most recent first
            signups = EmailSignup.query.order_by(EmailSignup.created_at.desc()).all()
            
            print(f"\n📧 EMAIL SIGNUPS ({len(signups)} total)")
            print("=" * 80)
            
            if not signups:
                print("No email signups found.")
                return
            
            # Count statistics
            early_access_count = sum(1 for s in signups if s.early_access)
            updates_count = sum(1 for s in signups if s.get_updates)
            
            print(f"📊 STATS:")
            print(f"   Total Signups: {len(signups)}")
            print(f"   Early Access: {early_access_count}")
            print(f"   Get Updates: {updates_count}")
            print()
            
            # Display each signup
            for i, signup in enumerate(signups, 1):
                print(f"{i:2d}. {signup.email}")
                print(f"    📅 Submitted: {signup.created_at.strftime('%Y-%m-%d %H:%M:%S UTC') if signup.created_at else 'N/A'}")
                print(f"    🚀 Early Access: {'Yes' if signup.early_access else 'No'}")
                print(f"    📬 Updates: {'Yes' if signup.get_updates else 'No'}")
                if signup.ip_address:
                    print(f"    🌐 IP: {signup.ip_address}")
                print()
                
        except Exception as e:
            print(f"❌ Error accessing database: {e}")
            print("Make sure your Flask app and database are properly configured.")

if __name__ == "__main__":
    view_email_signups() 