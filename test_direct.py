#!/usr/bin/env python3
"""
Direct test of persona service without web API
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.persona_service import generate_coach_persona

def test_direct():
    """Test persona service directly."""
    
    # Test the exact case the user reported as problematic
    test_data = {
        'core_q1_product': 'I create websites for companies that convert into sales',
        'core_q2_audience': 'small to medium sized businesses dependant on their website for sales',
        'core_q5_goal': 'better conversations'
    }
    
    print("🧪 Testing persona service with user's problematic example...")
    print(f"📤 Input: {test_data}")
    print()
    
    # Create Flask app context
    app = create_app('dev')
    
    with app.app_context():
        try:
            result = generate_coach_persona(test_data)
            
            print("📥 Generated Persona:")
            print("-" * 60)
            print(result)
            print("-" * 60)
            
            # Check for issues
            result_lower = result.lower()
            
            issues = []
            if 'i create websites' in result_lower:
                issues.append("❌ Still using raw 'I create websites' instead of paraphrasing")
            if 'for companies that convert into sales' in result_lower:
                issues.append("❌ Still using raw 'convert into sales' instead of paraphrasing")
            if 'dependant on their website' in result_lower:
                issues.append("❌ Still using raw 'dependant' spelling error")
                
            if issues:
                print("🚨 Issues found:")
                for issue in issues:
                    print(f"  {issue}")
            else:
                print("✅ Text processing worked - no raw input text found!")
                
            # Check for positive indicators of good paraphrasing
            good_signs = []
            if 'conversion-focused websites' in result_lower or 'business websites' in result_lower:
                good_signs.append("✅ Product properly paraphrased")
            if 'small and medium businesses' in result_lower or 'smbs' in result_lower:
                good_signs.append("✅ Audience properly paraphrased")
            if 'working with' in result_lower:
                good_signs.append("✅ Uses appropriate interaction language")
                
            if good_signs:
                print("🎉 Good signs:")
                for sign in good_signs:
                    print(f"  {sign}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_direct() 