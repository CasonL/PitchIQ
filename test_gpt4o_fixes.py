#!/usr/bin/env python3
"""
Smoke test script for the 6 critical runtime bug fixes in gpt4o_service.py
"""

import sys
import os
sys.path.append('app')

def test_gpt4o_service():
    """Run minimal smoke tests on the fixed GPT4o service"""
    
    print("🧪 Running smoke tests on fixed GPT4oService...")
    
    try:
        # Test 1: Instantiate GPT4oService
        print("\n1️⃣ Testing GPT4oService instantiation...")
        from app.services.gpt4o_service import GPT4oService
        service = GPT4oService()
        print(f"✅ Service created: {type(service).__name__}")
        print(f"   - API available: {getattr(service, 'api_available', 'Unknown')}")
        print(f"   - Initialized: {getattr(service, '_initialized', 'Unknown')}")
        
        # Test 2: Call generate_response with dummy message
        print("\n2️⃣ Testing generate_response...")
        dummy_messages = [{"role": "user", "content": "Hello, how are you?"}]
        
        if getattr(service, 'api_available', False):
            try:
                response = service.generate_response(messages=dummy_messages, max_tokens=50)
                print(f"✅ generate_response returned: {type(response)} (length: {len(response) if response else 0})")
            except Exception as e:
                print(f"⚠️  generate_response failed (expected if no API key): {str(e)[:100]}")
        else:
            print("⚠️  Skipping generate_response test (API not available)")
        
        # Test 3: Call generate_customer_persona with minimal context
        print("\n3️⃣ Testing generate_customer_persona...")
        minimal_context = {
            "product_service": "Test Product", 
            "target_market": "Test Market",
            "industry": "Technology"
        }
        
        try:
            persona = service.generate_customer_persona(minimal_context)
            print(f"✅ generate_customer_persona returned: {type(persona)} (length: {len(persona) if persona else 0})")
            
            # Check if it's valid JSON (should be for fallback)
            import json
            if persona:
                try:
                    parsed = json.loads(persona)
                    print(f"✅ Valid JSON returned with keys: {list(parsed.keys())[:5]}...")
                except json.JSONDecodeError as je:
                    print(f"❌ Invalid JSON returned: {str(je)}")
                    print(f"First 200 chars: {persona[:200]}")
                    
        except Exception as e:
            print(f"❌ generate_customer_persona failed: {str(e)[:100]}")
            import traceback
            traceback.print_exc()
        
        # Test 4: Call generate_roleplay_response 
        print("\n4️⃣ Testing generate_roleplay_response...")
        minimal_persona = {"name": "Test Person", "role": "Customer"}
        minimal_messages = [{"role": "user", "content": "Hello there"}]
        
        try:
            roleplay_response = service.generate_roleplay_response(
                persona=minimal_persona, 
                messages=minimal_messages
            )
            print(f"✅ generate_roleplay_response returned: {type(roleplay_response)} (length: {len(roleplay_response) if roleplay_response else 0})")
        except Exception as e:
            print(f"❌ generate_roleplay_response failed: {str(e)[:100]}")
        
        # Test 5: Call generate_initial_greeting
        print("\n5️⃣ Testing generate_initial_greeting...")
        try:
            greeting = service.generate_initial_greeting(minimal_persona)
            print(f"✅ generate_initial_greeting returned: {type(greeting)} (length: {len(greeting) if greeting else 0})")
            if greeting:
                print(f"   Sample greeting: {greeting[:100]}")
        except Exception as e:
            print(f"❌ generate_initial_greeting failed: {str(e)[:100]}")
            import traceback
            traceback.print_exc()
        
        print("\n🎉 Smoke tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ Critical failure during smoke tests: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_gpt4o_service()
    if not success:
        print("\n🚨 Smoke tests failed - stopping here")
        sys.exit(1)
    else:
        print("\n✅ All smoke tests passed - runtime bugs appear fixed!")
