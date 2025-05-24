import requests
import json

"""
Example response format with numbered questions:

Okay, focusing on Health-conscious Urban Dwellers, Restaurants and Cafes, and Eco-conscious Communities and Local Institutions makes sense.

Given this, I'd anticipate a few things about your sales process:

It's likely a mix of B2B and B2C sales model.
The sales cycle might typically be longer due to building relationships and educating on sustainability.
Interactions could involve detailed product demonstrations and multi-stakeholder meetings.
To help confirm this and understand your sales world even better, please tell me about the following:
To tailor our roleplays effectively, let's understand your sales environment better.

Please tell me about the following:

1. Do you primarily sell to other businesses (B2B), directly to consumers (B2C), or a mix of both?
2. What's your average sales cycle length (e.g., a few days, several weeks, multiple months)?
3. How long is a typical sales call or main interaction (e.g., 15-30 minutes, 1 hour, multiple meetings)?
"""

# Test URL
url = "http://localhost:8081/paraphrase"

# Chemical product context
chemical_product = "I have a chemical distribution company that supplies products such as glycol, and various products for anti freeze, dust control on roads and coal plants, and more."
chemical_audience = "Industrial manufacturers, road maintenance contractors, and energy companies with coal plants."

# Test data - core_q2_audience stage to test Q3 generation formatting
data = {
    "stage": "core_q2_audience",
    "userInput": "Sales professionals, business owners, and managers",
    "context": {
        "answer_q1_product_value": "PitchIQ is a sales training software that leverages AI-powered roleplays and personalized coaching",
        "previous_ai_message_text": "Based on your focus on PitchIQ, a sales training software that leverages AI-powered roleplays and personalized coaching, who are your primary customers or target audience?\n\nFrom what I understand, it could be:\n\n1. **Sales Professionals** - Typically aged 25-45, these individuals are looking to enhance their skills\n2. **Small to Medium Business Owners** - Usually 30-55 years old\n3. **Corporate Training Managers** - Generally aged 35-50\n\nOr would you describe them differently?"
    }
}

# Make request
print(f"Sending request to {url} with data: {data}")
response = requests.post(url, json=data)

# Display results
print(f"Status code: {response.status_code}")
print(f"Response JSON: {json.dumps(response.json(), indent=2)}")

# Detailed debugging
response_data = response.json()
print(f"Response next_stage: {response_data.get('next_stage')}")
print(f"Response content type: {type(response_data.get('content'))}")
print(f"Response content length: {len(response_data.get('content', ''))}")
print(f"Raw content (no JSON formatting): {response_data.get('content')}") 