#!/usr/bin/env python3
"""
Test script for the persona service to verify consumer vs business logic is working.
"""

import requests
import json
import sys

def test_persona_service():
    """Test the persona service with outdoor TV example."""
    
    url = "http://localhost:8080/api/test-persona"
    
    # Test data - outdoor TVs for wealthy homeowners (should be consumer, not business)
    test_data = {
        'core_q1_product': '3D outdoor TVs for patios and backyards',
        'core_q2_audience': 'wealthy homeowners looking to spruce up their backyards',
        'core_q5_goal': 'better conversations'
    }
    
    try:
        print("🧪 Testing persona service...")
        print(f"📤 Input: {json.dumps(test_data, indent=2)}")
        
        response = requests.post(url, json=test_data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success!")
            print(f"📥 Generated Persona:")
            print("-" * 50)
            print(result.get('generated_persona', 'No persona generated'))
            print("-" * 50)
            
            # Check for inappropriate business language
            persona_text = result.get('generated_persona', '').lower()
            
            issues = []
            if 'i see you\'re selling' in persona_text:
                issues.append("❌ Using 'selling' language for consumer product")
            if 'business impact' in persona_text:
                issues.append("❌ Using 'business impact' for consumer product")
            if 'prospects' in persona_text and 'consumer' not in persona_text:
                issues.append("❌ Using 'prospects' instead of 'consumers'")
                
            if issues:
                print("🚨 Issues found:")
                for issue in issues:
                    print(f"  {issue}")
            else:
                print("✅ Language appears appropriate for consumer product!")
                
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Is it running on localhost:8080?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_persona_service() 