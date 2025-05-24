import requests
import json
import time

# Test URL
url = "http://localhost:8081/paraphrase"

# Chemical product context - combined with audience information
combined_product_value = "I have a chemical distribution company that supplies products such as glycol, and various products for anti freeze, dust control on roads and coal plants, and more. Our main value is providing reliable, high-quality chemicals to industrial clients with fast delivery and expert handling."
sales_environment = "B2B, a month, and around 1 hour"
methodology = "Solution Selling"
goal = "I want to improve my ability to handle objections from industrial clients about product pricing"

# Step 1: Test core_q1_combined
print("Step 1: Testing core_q1_combined...")
data = {
    "stage": "core_q1_combined",
    "userInput": combined_product_value
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")
time.sleep(1)  # Pause between requests

# Step 2: Test core_q4_style (sales environment) - skip audience question
print("Step 2: Testing core_q4_style...")
data = {
    "stage": "core_q4_style",
    "userInput": sales_environment,
    "answer_q1_product_value": combined_product_value
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")
time.sleep(1)  # Pause between requests

# Step 3: Test core_q4_methodology
print("Step 3: Testing core_q4_methodology...")
data = {
    "stage": "core_q4_methodology",
    "userInput": methodology,
    "answer_q1_product_value": combined_product_value,
    "answer_q4_style": sales_environment,
    "suggested_style": "Consultative"
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")
time.sleep(1)  # Pause between requests

# Step 4: Test core_q5_goal
print("Step 4: Testing core_q5_goal...")
data = {
    "stage": "core_q5_goal",
    "userInput": goal,
    "answer_q1_product_value": combined_product_value,
    "answer_q4_style": sales_environment,
    "answer_q4_methodology": methodology
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")

print("Combined flow test complete!") 