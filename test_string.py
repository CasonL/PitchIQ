"""
Test script to debug string handling in paraphrase_service.py
This script checks different string formats to identify issues with quote handling
"""

# Test various string formats and startswith() behavior
def test_quotes():
    # Test single quotes
    s1 = "''Okay, this is a test with leading and trailing single quotes.'' "
    print(f"Original (single quotes): {repr(s1)}")
    s1_stripped = s1.strip()
    print(f"Stripped (single quotes): {repr(s1_stripped)}")
    print("Original starts with ': " + str(s1.startswith("'")))
    print("Stripped starts with ': " + str(s1_stripped.startswith("'")))
    
    print("-" * 20)
    
    # Test double quotes
    s2 = '"Okay, this is a test with leading and trailing double quotes."'
    print(f"Original (double quotes): {repr(s2)}")
    s2_stripped = s2.strip()
    print(f"Stripped (double quotes): {repr(s2_stripped)}")
    print('Original starts with ": ' + str(s2.startswith('"')))
    print('Stripped starts with ": ' + str(s2_stripped.startswith('"')))

# Test problematic string from logs
def test_problematic_string():
    problematic = "''Okay, let's find the perfect target audience for your innovative water bottle products. To start, could you tell me a bit more about the primary customers you envision for these bottles? For example, are they aimed at athletes, students, office workers, or perhaps a different group?''"
    print(f"Problematic string: {problematic[:100]}")
    print(f"Problematic string: {problematic[:200]}")
    print(f"Problematic string: {problematic}")
    
    # Initial strip
    temp_stripped = problematic.strip()
    print(f"After initial strip: {temp_stripped[:100]}")
    print(f"After initial strip: {temp_stripped[:200]}")
    print(f"After initial strip: {temp_stripped}")
    
    print("Starts with ' after initial strip: " + str(temp_stripped.startswith("'")))
    print('Starts with " after initial strip: ' + str(temp_stripped.startswith('"')))
    
    # Attempt to strip quotes
    if temp_stripped.startswith("'"):
        print("Stripping single quotes")
        content = temp_stripped[1:]
        if content.endswith("'"):
            content = content[:-1]
        print(f"Final content: {content[:100]}")
        print(f"Final content: {content[:200]}")
        print(f"Final content: {content}")

# Test another problematic case
def test_another_problematic():
    s = "''Okay...''"
    print(f"Another problematic string: {repr(s)}")
    temp_stripped = s.strip()
    print(f"temp_stripped: {repr(temp_stripped)}")
    print("temp_stripped.startswith(\"'\"): " + str(temp_stripped.startswith("'")))
    print("temp_stripped.startswith('''): " + str(temp_stripped.startswith("'")))
    
    # First layer of quotes
    if temp_stripped.startswith("'"):
        first_layer = temp_stripped[1:]
        if first_layer.endswith("'"):
            first_layer = first_layer[:-1]
        print(f"After first layer strip: {repr(first_layer)}")
        
        # Second layer of quotes
        if first_layer.startswith("'"):
            second_layer = first_layer[1:]
            if second_layer.endswith("'"):
                second_layer = second_layer[:-1]
            print(f"After second layer strip: {repr(second_layer)}")
            print(f"Final for another: {second_layer}")

# Test Unicode handling
def test_unicode():
    # Test with non-breaking space
    s = "\xa0'Test with nbsp'\xa0"
    print(f"Unicode string: {repr(s)}")
    s_stripped = s.strip()
    print(f"Stripped Unicode: {s_stripped}")
    print("Original NBSP starts with ': " + str(s.startswith("'")))
    print("Original NBSP starts with non-breaking space: " + str(s.startswith("\xa0")))

# Test real example from OpenAI
def test_openai_example():
    content = "''Here are three potential target audiences for your AI-powered sales training software, tailored for freelancers and entrepreneurs:\n\n1.  **Solo Freelancers & Consultants:** Individuals who are experts in their craft (e.g., writing, design, development) but may lack formal sales training. They often handle their own client acquisition and could benefit from structured sales techniques to close more deals and increase their income. They're likely looking for practical, actionable advice they can implement immediately.\n\n2.  **Early-Stage Startup Founders:** Entrepreneurs who have a great product/service idea but are now facing the challenge of building a sales process from scratch. They might be new to sales themselves or leading a very small team. They'd value training that helps them establish effective sales strategies, understand customer psychology, and scale their initial sales efforts.\n\n3.  **Independent Coaches & Trainers (in other fields):** Professionals who already run their own coaching or training businesses (e.g., life coaches, business coaches for non-sales areas, skill trainers) and want to improve their own sales and marketing funnels to attract more clients. They understand the value of coaching and might be open to AI tools that can help them practice and refine their sales pitch for their own services.''"
    for i in range(1, 14):
        print(f"Content from log: {content[:i*100]}")

    c = content.strip()
    for i in range(1, 14):
        print(f"After strip: {c[:i*100]}")
    
    print("c.startswith(\"'\"): " + str(c.startswith("'")))
    print("c.endswith(\"'\"): " + str(c.endswith("'")))
    
    if c.startswith("'") and c.endswith("'"):
        print("Stripped outer single quotes")
        c = c[1:-1]
        for i in range(1, 14):
            print(f"Final c: {c[:i*100]}")

# Test basic startswith for quotes
def test_basic_startswith():
    s = "''Okay..."
    print(f"String s: {repr(s)}")
    print("s[0]: " + repr(s[0]) + ", is it a quote? " + str(s[0] == "'"))
    print("s.startswith(\"'\"): " + str(s.startswith("'")))
    
    s2 = '"Okay..."'
    print(f"String s2: {repr(s2)}")
    print("s2[0]: " + repr(s2[0]) + ", is it a quote? " + str(s2[0] == '"'))
    print("s2.startswith('\"'): " + str(s2.startswith('"')))

# Simulate the exact process in paraphrase_service.py
def test_service_process():
    raw_content_from_api = "''Okay, let's find the perfect target audience for your innovative water bottle products. To start, could you tell me a bit more about the primary customers you envision for these bottles? For example, are they aimed at athletes, students, office workers, or perhaps a different group?''"
    
    print(f"OpenAI example: {raw_content_from_api[:100]}")
    print(f"OpenAI example: {raw_content_from_api[:200]}")
    print(f"OpenAI example: {raw_content_from_api}")
    
    # Simple check
    print("Starts with ' ? : " + str(raw_content_from_api.startswith("'")))
    
    # Before strip
    for i in range(1, 4):
        print(f"Before strip: {raw_content_from_api[:i*100]}")
    
    # After strip
    content_to_check = raw_content_from_api.strip()
    for i in range(1, 4):
        print(f"After strip: {content_to_check[:i*100]}")
    
    # Check startswith after strip
    print("content_to_check.startswith(\"'\"): " + str(content_to_check.startswith("'")))
    print("content_to_check.startswith('\"'): " + str(content_to_check.startswith('"')))
    
    # Attempt to strip quotes
    if content_to_check.startswith("'"):
        print("Attempting to strip single quotes")
        content_to_check = content_to_check[1:]
        if content_to_check.endswith("'"):
            content_to_check = content_to_check[:-1]
        for i in range(1, 4):
            print(f"After quote strip attempt 1: {content_to_check[:i*100]}")
        
        # Check for another layer of quotes
        if content_to_check.startswith("'"):
            print("Attempting to strip second layer of single quotes")
            content_to_check = content_to_check[1:]
            if content_to_check.endswith("'"):
                content_to_check = content_to_check[:-1]
    
    # Final result
    for i in range(1, 4):
        print(f"Final content_to_check: {content_to_check[:i*100]}")
    
    # Simulate the condition that might be causing problems
    print(f"CRITICAL CHECK: content_to_check is truthy: {bool(content_to_check)}")
    print(f"CRITICAL CHECK: content_to_check.strip() is truthy: {bool(content_to_check.strip())}")
    print(f"CRITICAL CHECK: (content_to_check and content_to_check.strip()): {bool(content_to_check and content_to_check.strip())}")
    
    # Simulate the condition that likely leads to the error
    content_is_empty = not content_to_check or not content_to_check.strip()
    print(f"CRITICAL CHECK: final_condition_for_if (leading to error): {content_is_empty}")
    
    if content_is_empty:
        print("ERROR: The problematic 'if' condition was met.")
    else:
        print("SUCCESS: The problematic 'if' condition was NOT met.")

# Test the exact API response string from the logs
def test_actual_api_response():
    print("\n--- Testing actual API response string from logs ---")
    
    # This is the exact content from the log that triggered the issue
    raw_content_from_api = "''Okay, for your AI-powered sales training software... some potential audiences are:  \n1. Freelancers seeking to enhance their client acquisition skills.  \n2. Entrepreneurs launching new products and needing effective sales strategies.  \n3. Small business owners looking to train their teams in sales techniques.  \n\nDo these fit, or who is your primary audience?''"
    
    print(f"Raw API response: {repr(raw_content_from_api)}")
    
    # First simple check
    print("Raw starts with ' ? : " + str(raw_content_from_api.startswith("'")))
    print("Raw starts with '' ? : " + str(raw_content_from_api.startswith("''")))
    
    # Let's try basic string processing
    content_to_check = raw_content_from_api.strip()
    
    # Check the stripping was correct
    print(f"After strip: {repr(content_to_check)}")
    
    # Check if we can identify quotes
    print("content_to_check.startswith(\"'\"): " + str(content_to_check.startswith("'")))
    print("content_to_check.startswith(\"''\"): " + str(content_to_check.startswith("''")))
    
    # Print the first few characters to examine
    print(f"First chars: {repr(content_to_check[:10])}")
    print(f"Each char individually: {[repr(c) for c in content_to_check[:10]]}")
    
    # Do our planned strip operation
    if content_to_check.startswith("'"):
        print("Found single quote - stripping...")
        content_to_check = content_to_check[1:]
        if content_to_check.endswith("'"):
            content_to_check = content_to_check[:-1]
    else:
        print("NOTE: Did not find leading single quote!")
    
    # Check result after first strip
    print(f"After first quote strip: {repr(content_to_check[:50])}")
    
    # Handle nested quotes
    if content_to_check.startswith("'"):
        print("Found another quote - stripping again...")
        content_to_check = content_to_check[1:]
        if content_to_check.endswith("'"):
            content_to_check = content_to_check[:-1]
    else:
        print("No second layer of quotes found")
        
    # Final check for expected content
    print(f"Final content (first 50 chars): {repr(content_to_check[:50])}")
    
    # Is it empty?
    content_is_empty = not content_to_check or not content_to_check.strip()
    print(f"final_condition_for_if (leading to error): {content_is_empty}")
    
    if content_is_empty:
        print("ERROR: The problematic condition was met.")
    else:
        print("SUCCESS: The problematic condition was NOT met.")

if __name__ == "__main__":
    test_quotes()
    test_problematic_string()
    test_another_problematic()
    test_unicode()
    test_openai_example()
    test_basic_startswith()
    test_service_process()
    test_actual_api_response() 