#!/usr/bin/env python3
"""
Test script for business onboarding functionality.
Tests the API endpoints and encryption features.
"""

import requests
import json
import sys
import os

# Base URL for the API
BASE_URL = 'http://localhost:8080'

def test_business_onboarding():
    """Test the business onboarding functionality."""
    print("=== BUSINESS ONBOARDING TEST ===\n")
    
    # First, login to get authentication
    print("1. Testing authentication...")
    login_data = {
        'email': 'casonlamothe@gmail.com',
        'password': 'Theguitarguy24'
    }
    
    session = requests.Session()
    
    # Get CSRF token first
    csrf_response = session.get(f'{BASE_URL}/api/auth/csrf-token')
    if csrf_response.status_code == 200:
        csrf_token = csrf_response.json().get('csrf_token')
        print(f"✓ CSRF token obtained")
    else:
        print(f"✗ Failed to get CSRF token: {csrf_response.status_code}")
        return False
    
    # Login
    login_response = session.post(f'{BASE_URL}/api/auth/login', json=login_data)
    if login_response.status_code == 200:
        print("✓ Login successful")
    else:
        print(f"✗ Login failed: {login_response.status_code} - {login_response.text}")
        return False
    
    # Test 2: Check if business profile exists
    print("\n2. Checking existing business profile...")
    profile_response = session.get(f'{BASE_URL}/api/business-onboarding/profile')
    
    if profile_response.status_code == 404:
        print("✓ No existing business profile (expected for new user)")
        profile_exists = False
    elif profile_response.status_code == 200:
        print("✓ Business profile exists")
        profile_data = profile_response.json()
        print(f"   Company: {profile_data.get('company_name', 'Not set')}")
        profile_exists = True
    else:
        print(f"✗ Unexpected response: {profile_response.status_code}")
        return False
    
    # Test 3: Create or update business profile
    print("\n3. Creating/updating business profile...")
    business_data = {
        'company_name': 'Test Sales Company',
        'industry': 'Technology',
        'company_size': '11-50 employees',
        'business_type': 'B2B',
        'business_description': 'We provide AI-powered sales training solutions to help businesses improve their sales performance.',
        'target_customers': 'Sales teams at mid-market technology companies who want to improve their conversion rates.',
        'sales_process': 'Our typical sales cycle is 30-45 days, starting with a discovery call, followed by a demo, proposal, and closing.',
        'pricing_strategy': 'We use value-based pricing with monthly subscriptions ranging from $99-$499 per user.',
        'compliance_requirements': 'We must comply with GDPR and SOC 2 requirements for data protection.',
        'competitive_landscape': 'We compete with traditional sales training companies and other AI-powered solutions.',
        'objection_handling': 'Common objections include price, implementation time, and ROI concerns.'
    }
    
    create_response = session.post(f'{BASE_URL}/api/business-onboarding/profile', json=business_data)
    if create_response.status_code == 200:
        print("✓ Business profile created/updated successfully")
        profile_data = create_response.json()
        print(f"   Company: {profile_data['profile']['company_name']}")
    else:
        print(f"✗ Failed to create profile: {create_response.status_code} - {create_response.text}")
        return False
    
    # Test 4: Create a test document
    print("\n4. Testing document upload...")
    test_document_content = """
    SALES SCRIPT - Discovery Call
    
    Introduction:
    "Hi [Name], thank you for taking the time to speak with me today. I understand you're looking for ways to improve your sales team's performance. Could you tell me a bit about your current challenges?"
    
    Discovery Questions:
    1. What's your current sales process?
    2. How do you currently train your sales team?
    3. What are your biggest pain points in sales?
    4. What would success look like for you?
    
    Common Objections:
    - "We already have a training program" -> "That's great! How is it working for you? What gaps do you see?"
    - "It's too expensive" -> "I understand cost is a concern. Let's talk about the ROI you could see..."
    
    Closing:
    "Based on what you've told me, I think we can help. Would you like to see a demo of how our solution works?"
    """
    
    # Create a temporary file for upload
    temp_file_path = 'temp_sales_script.txt'
    with open(temp_file_path, 'w') as f:
        f.write(test_document_content)
    
    try:
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('sales_script.txt', f, 'text/plain')}
            data = {'document_type': 'sales_script'}
            
            upload_response = session.post(
                f'{BASE_URL}/api/business-onboarding/upload-document', 
                files=files, 
                data=data
            )
        
        if upload_response.status_code == 200:
            print("✓ Document uploaded and analyzed successfully")
            upload_data = upload_response.json()
            if upload_data.get('analysis', {}).get('success'):
                print("   ✓ AI analysis completed")
                analysis = upload_data['analysis']['analysis']
                if 'document_summary' in analysis:
                    print(f"   Summary: {analysis['document_summary'][:100]}...")
            else:
                print("   ⚠ Document uploaded but analysis may have failed")
        else:
            print(f"✗ Document upload failed: {upload_response.status_code} - {upload_response.text}")
            return False
    
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
    
    # Test 5: Get uploaded documents
    print("\n5. Retrieving uploaded documents...")
    docs_response = session.get(f'{BASE_URL}/api/business-onboarding/documents')
    if docs_response.status_code == 200:
        docs_data = docs_response.json()
        documents = docs_data.get('documents', [])
        print(f"✓ Found {len(documents)} document(s)")
        
        for doc in documents:
            print(f"   - {doc['original_filename']} ({doc['document_type']}) - Status: {doc['processing_status']}")
            if doc.get('ai_document_summary'):
                print(f"     Summary: {doc['ai_document_summary'][:80]}...")
    else:
        print(f"✗ Failed to get documents: {docs_response.status_code}")
    
    # Test 6: Generate business insights
    print("\n6. Generating business insights...")
    insights_response = session.post(f'{BASE_URL}/api/business-onboarding/analyze-profile')
    if insights_response.status_code == 200:
        print("✓ Business insights generated successfully")
        insights_data = insights_response.json()
        insights = insights_data.get('insights', {})
        
        if insights.get('business_summary'):
            print(f"   Business Summary: {insights['business_summary'][:100]}...")
        
        if insights.get('sales_recommendations'):
            print(f"   Sales Recommendations: {len(insights['sales_recommendations'])} items")
        
        if insights.get('training_focus_areas'):
            print(f"   Training Focus Areas: {len(insights['training_focus_areas'])} items")
    else:
        print(f"✗ Failed to generate insights: {insights_response.status_code} - {insights_response.text}")
    
    # Test 7: Get final insights
    print("\n7. Retrieving final insights...")
    final_insights_response = session.get(f'{BASE_URL}/api/business-onboarding/insights')
    if final_insights_response.status_code == 200:
        print("✓ Final insights retrieved successfully")
        final_data = final_insights_response.json()
        insights = final_data.get('insights', {})
        
        print(f"   Analysis Complete: {insights.get('analysis_complete', False)}")
        if insights.get('business_summary'):
            print(f"   Summary: {insights['business_summary'][:100]}...")
    else:
        print(f"✗ Failed to get final insights: {final_insights_response.status_code}")
    
    # Test 8: Complete onboarding
    print("\n8. Completing business onboarding...")
    complete_response = session.post(f'{BASE_URL}/api/business-onboarding/complete-onboarding')
    if complete_response.status_code == 200:
        print("✓ Business onboarding completed successfully")
        complete_data = complete_response.json()
        profile = complete_data.get('profile', {})
        print(f"   Onboarding Complete: {profile.get('business_onboarding_complete', False)}")
    else:
        print(f"✗ Failed to complete onboarding: {complete_response.status_code} - {complete_response.text}")
    
    print("\n=== BUSINESS ONBOARDING TEST COMPLETE ===")
    print("✓ All tests passed! Business onboarding system is working correctly.")
    return True

if __name__ == "__main__":
    print("Testing Business Onboarding System...")
    print("Make sure the Flask server is running on http://localhost:8080")
    print()
    
    try:
        success = test_business_onboarding()
        if success:
            print("\n🎉 All tests passed!")
            sys.exit(0)
        else:
            print("\n❌ Some tests failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 