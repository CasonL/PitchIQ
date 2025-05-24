import requests
import json
import re

# Test URL
url = "http://localhost:8081/paraphrase"

# Chemical product context for test
product_description = "I have a chemical distribution company that supplies products such as glycol, and various products for anti freeze, dust control on roads and coal plants, and more. We never say no to our customers. We go above and beyond, providing amazing support that keeps them coming back"
sales_environment = "B2B, a month, and 1 hour"

# Test data for core_q4_methodology with all context passed
data = {
    "stage": "core_q4_methodology",
    "userInput": "solution selling",
    "answer_q1_product_value": product_description,
    "answer_q4_style": sales_environment,
    "suggested_style": "Solution Selling"
}

# Make the request
print(f"Testing methodology selection with: {data['userInput']}")
response = requests.post(url, json=data)

# Print the result
if response.ok:
    result = response.json()
    print(f"✓ Response: {result['content']}")
else:
    print(f"✗ Failed with status code: {response.status_code}")
    print(response.text)

def test_methodology_matching(user_input):
    # Normalize the input
    normalized = user_input.strip().lower()
    
    # Define exact methodology names for direct matches
    exact_methodologies = {
        "spin": "SPIN",
        "challenger": "Challenger",
        "consultative": "Consultative",
        "solution selling": "Solution Selling", 
        "value selling": "Value Selling",
        "general practice": "General Practice"
    }
    
    # First check for exact matches
    exact_match_found = False
    for exact_name, proper_name in exact_methodologies.items():
        # Check if the exact name appears as a whole word
        if re.search(r'\b' + re.escape(exact_name) + r'\b', normalized):
            result = f"EXACT MATCH: '{exact_name}' -> '{proper_name}'"
            exact_match_found = True
            break
    
    # Only if no exact match, try partial keyword matching
    if not exact_match_found:
        # Map common methodology keywords to their proper names
        methodology_mapping = {
            "consult": "Consultative",
            "consultive": "Consultative",
            "challenge": "Challenger", 
            "spin": "SPIN",
            "solution": "Solution Selling",
            "value": "Value Selling",
            "general": "General Practice",
            "mix": "General Practice"
        }
        
        match_found = False
        for keyword, proper_name in methodology_mapping.items():
            if keyword in normalized:
                result = f"PARTIAL MATCH: '{keyword}' -> '{proper_name}'"
                match_found = True
                break
        
        if not match_found:
            result = "NO MATCH: Defaulting to 'General Practice'"
    
    # Remove uncertainty words
    uncertainty_words = ["maybe", "perhaps", "probably", "i think", "possibly", "ill go with", "go with"]
    cleaned = normalized
    for word in uncertainty_words:
        cleaned = cleaned.replace(word, "").strip()
    
    # Remove punctuation
    cleaned = cleaned.replace("?", "").replace("!", "").strip()
    
    return f"Input: '{user_input}'\nNormalized: '{normalized}'\nCleaned: '{cleaned}'\nResult: {result}"

# Test cases
test_inputs = [
    "I think ill go with SPIN",
    "maybe consultive?",
    "I prefer Challenger",
    "solution selling sounds good",
    "probably some mix of approaches",
    "I'm not sure, maybe some value-based"
]

for test_input in test_inputs:
    print("\n" + "="*50)
    print(test_methodology_matching(test_input))
    print("="*50)

# Special test for the case in the bug report
print("\n" + "="*50 + "\nSPECIAL TEST CASE:")
print(test_methodology_matching("I think ill go with SPIN"))
print("="*50)

# Test input
test_input = "I think ill go with SPIN"
normalized = test_input.lower()
print(f"Input: {test_input}")
print(f"Normalized: {normalized}")

# Test regex matching
match = re.search(r'\bspin\b', normalized)
if match:
    print(f"Exact match found: '{match.group()}'")
    print("Would normalize to: 'SPIN'")
else:
    print("No exact match found")
    
    # Try keyword matching fallback
    if "spin" in normalized:
        print("Keyword 'spin' found in text")
        print("Would normalize to: 'SPIN'")
    else:
        print("No 'spin' keyword found")

# Test with various uncertainty word removals
uncertainty_words = ["maybe", "perhaps", "probably", "i think", "possibly", "ill go with", "go with"]
cleaned = normalized
print("\nCleaning steps:")
for word in uncertainty_words:
    if word in cleaned:
        print(f"Removing '{word}'")
        cleaned = cleaned.replace(word, "").strip()
        print(f"Result: '{cleaned}'")

print(f"\nFinal cleaned result: '{cleaned}'")

# Final check on cleaned text
if re.search(r'\bspin\b', cleaned):
    print("SUCCESS: Exact match 'spin' found in cleaned text")
else:
    print("WARNING: Exact match 'spin' NOT found in cleaned text") 