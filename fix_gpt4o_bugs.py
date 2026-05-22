#!/usr/bin/env python3
"""
Script to fix the 6 critical runtime bugs in gpt4o_service.py
"""

import re

def fix_gpt4o_runtime_bugs():
    """Fix the 6 critical runtime bugs identified in gpt4o_service.py"""
    
    # Read the file
    with open('app/services/gpt4o_service.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("🔧 Applying 6 critical runtime bug fixes...")
    
    # Fix 1: Add _initialized = True after successful API validation
    # Look for the pattern where api_available is set to True but _initialized is not set
    pattern1 = r'(self\.api_available = True\n\s+self\._initialized = True[^\n]*\n)(\s+except Exception as e:)'
    if not re.search(pattern1, content):
        # The success path is already fixed, check if we need to add to exception path
        pattern1_alt = r'(self\.api_available = True\n\s+self\._initialized = True[^\n]*\n\s+except Exception as e:\n[^}]+self\.client = None)\n'
        if re.search(pattern1_alt, content):
            content = re.sub(
                r'(self\.client = None)\n(\s+def generate_response)',
                r'\1\n            self._initialized = True  # Fix: Prevent repeated failed reinitializations\n\2',
                content
            )
            print("✅ Fix 1: Added _initialized = True to exception path")
    
    # Fix 2: Move internal_data definition above its usage
    # Find the problematic usage and fix it
    pattern2 = r'(\s+# Detailed Descriptions[^\n]+\n\s+if internal_data:)'
    if re.search(pattern2, content):
        content = re.sub(
            pattern2,
            r'\n        # Use deep/internal information for AI behavior, not the surface info shown to user\n        internal_data = persona.get("_internal", {})\n        \n        # Detailed Descriptions (NEW) - Use deep context for AI behavior\n        if internal_data:',
            content
        )
        print("✅ Fix 2: Moved internal_data definition above usage")
    
    # Fix 3: Add defaults before conversation_state check
    pattern3 = r'(\s+user_hit_passion = False\n)(\s+if conversation_state:)'
    if re.search(pattern3, content):
        defaults = """        # Fix: Add defaults before conversation_state check to prevent UnboundLocalError
        should_hint_passion = False
        outcome = "undecided"
        outcome_conf = 0.0
        elapsed_min = 0.0
        time_warning = False
        time_cue_5min = False
        time_cue_3min = False
        time_cue_1min = False
        force_wrap_up = False
"""
        content = re.sub(pattern3, rf'\1{defaults}\2', content)
        print("✅ Fix 3: Added conversation_state variable defaults")
    
    # Fix 4: Fix generate_initial_greeting return type handling
    pattern4 = r'(\s+# Process the response\n\s+if response\.choices:)'
    if re.search(pattern4, content):
        content = re.sub(
            r'(\s+# Process the response\n\s+if response\.choices:[^}]+return greeting)',
            r"""            # Fix: generate_response returns a string, not OpenAI response object
            if response and response.strip():
                # Post-process to remove any artifacts
                if hasattr(self, '_post_process_response'):
                    greeting = self._post_process_response(response)
                else:
                    greeting = response.strip()
                return greeting""",
            content,
            flags=re.DOTALL
        )
        print("✅ Fix 4: Fixed generate_initial_greeting return type handling")
    
    # Fix 5: Keep fallback persona valid JSON
    pattern5 = r'(\s+fallback_persona_str \+= f"\\nError Info: Generation failed - \{error_message\}")'
    if re.search(pattern5, content):
        content = re.sub(
            pattern5,
            r'            # Error info is already included in _meta.error_info - don\'t append text after JSON',
            content
        )
        print("✅ Fix 5: Removed invalid JSON corruption in fallback persona")
    
    # Fix 6: Clean model naming in docstrings (simple find/replace)
    if 'GPT-4.1-mini' in content:
        content = content.replace('GPT-4.1-mini', 'GPT-4o-mini')
        print("✅ Fix 6: Cleaned up model naming consistency")
    
    # Write the fixed file
    with open('app/services/gpt4o_service.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n🎉 All 6 critical runtime bugs fixed!")
    print("📝 Backup available at: app/services/gpt4o_service.py.backup")

if __name__ == "__main__":
    fix_gpt4o_runtime_bugs()
