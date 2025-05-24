import requests
import json

# Test URL
url = "http://localhost:8081/paraphrase"

# Chemical product context for test
chemical_product = "I have a chemical distribution company that supplies products such as glycol, and various products for anti freeze, dust control on roads and coal plants, and more."
chemical_audience = "Industrial manufacturers, road maintenance contractors, and energy companies with coal plants"
sales_environment = "B2B, a month, and around 1 hour"
methodology = "Consultative"

# Test data for core_q5_goal with all context passed
data = {
    "stage": "core_q5_goal",
    "userInput": "I want to improve my ability to handle objections from my industrial clients about product pricing",
    "answer_q1_product_value": chemical_product,
    "answer_q2_audience": chemical_audience,
    "answer_q4_style": sales_environment,
    "answer_q4_methodology": methodology
}

# Make the request
print(f"Sending request to {url} with data:")
print(json.dumps(data, indent=2))
response = requests.post(url, json=data)

# Display results
print(f"Status code: {response.status_code}")
print(f"Response JSON: {json.dumps(response.json(), indent=2)}") 