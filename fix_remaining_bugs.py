#!/usr/bin/env python3
"""
Fix the remaining 3 critical runtime bugs in gpt4o_service.py
"""

import re

def fix_remaining_runtime_bugs():
    """Fix the remaining 3 runtime bugs identified"""
    
    # Read the file
    with open('app/services/gpt4o_service.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("🔧 Fixing remaining 3 critical runtime bugs...")
    
    # Fix 1: Add _initialized = True to exception path
    # Look for the specific exception block with the unique error message
    pattern1 = r'(\s+logger\.error\(f"Failed to initialize GPT4o API service with new SDK: \{str\(e\)\}"\)\n\s+logger\.error\(f"Full exception details: \{traceback\.format_exc\(\)\}"\)\n\s+self\.api_available = False\n\s+self\.client = None)\n'
    if re.search(pattern1, content):
        content = re.sub(
            pattern1,
            r'\1\n            self._initialized = True  # Fix: Prevent repeated failed reinitializations\n',
            content
        )
        print("✅ Fix 1: Added _initialized = True to exception path")
    else:
        print("❌ Fix 1: Could not find exception path pattern")
    
    # Fix 2: Fix user_info = None crash in _create_roleplay_system_prompt
    pattern2 = r'(\s+def _create_roleplay_system_prompt\(\n\s+self,\n\s+persona: Dict\[str, Any\],\n\s+user_info: Dict\[str, Any\],\n[^}]+?\n)(\s+salesperson_name = user_info\.get\("name", "Salesperson"\))'
    if re.search(pattern2, content, re.DOTALL):
        content = re.sub(
            pattern2,
            r'\1        user_info = user_info or {}\n\2',
            content,
            flags=re.DOTALL
        )
        print("✅ Fix 2: Added user_info = user_info or {} safety check")
    else:
        print("❌ Fix 2: Could not find user_info pattern")
    
    # Fix 3: Add missing force_wrap_up from conversation_state
    # Look for where other conversation_state values are read and add force_wrap_up
    pattern3 = r'(\s+time_cue_1min = conversation_state\.get\("time_cue_1min", False\))\n'
    if re.search(pattern3, content):
        content = re.sub(
            pattern3,
            r'\1\n            force_wrap_up = conversation_state.get("force_wrap_up", False)\n',
            content
        )
        print("✅ Fix 3: Added missing force_wrap_up from conversation_state")
    else:
        print("❌ Fix 3: Could not find time_cue_1min pattern")
    
    # Fix 4 (Optional): Change API validation model to DEFAULT_MODEL
    pattern4 = r'(\s+test_response = self\.client\.chat\.completions\.create\(\n\s+model=)"gpt-3\.5-turbo",'
    if re.search(pattern4, content):
        content = re.sub(
            pattern4,
            r'\1DEFAULT_MODEL,',
            content
        )
        print("✅ Fix 4: Changed API validation from gpt-3.5-turbo to DEFAULT_MODEL")
    else:
        print("❌ Fix 4: Could not find API validation pattern")
    
    # Write the fixed file
    with open('app/services/gpt4o_service.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n🎉 Remaining runtime bugs fixed!")

if __name__ == "__main__":
    fix_remaining_runtime_bugs()
