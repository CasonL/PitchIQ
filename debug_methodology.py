import re

def test_methodology_extraction(input_text):
    print(f"Original input: '{input_text}'")
    
    # Normalize to lowercase
    normalized = input_text.lower()
    print(f"Normalized: '{normalized}'")
    
    # Try exact regex matching first
    exact_match = re.search(r'\bspin\b', normalized)
    if exact_match:
        print(f"✓ EXACT MATCH found: '{exact_match.group()}' -> 'SPIN'")
    else:
        print("✗ No exact match for 'spin'")
    
    # Try cleaning uncertainty words
    uncertainty_words = ["maybe", "perhaps", "probably", "i think", "possibly", "ill go with", "go with"]
    cleaned = normalized
    for word in uncertainty_words:
        if word in cleaned:
            cleaned = cleaned.replace(word, "").strip()
            print(f"Removed '{word}', result: '{cleaned}'")
    
    # Check again after cleaning
    cleaned_match = re.search(r'\bspin\b', cleaned)
    if cleaned_match:
        print(f"✓ MATCH in cleaned text: '{cleaned_match.group()}' -> 'SPIN'")
    else:
        print(f"✗ No match in cleaned text: '{cleaned}'")
    
    # Final result
    if exact_match or cleaned_match:
        print("Final result: 'SPIN'")
    else:
        print("Final result: No clear methodology detected")

# Test the problematic case
print("="*50)
test_methodology_extraction("I think ill go with SPIN")
print("="*50)

# Test a few other cases
test_methodology_extraction("maybe consultive?")
print("="*50)
test_methodology_extraction("I prefer consultative selling")
print("="*50) 