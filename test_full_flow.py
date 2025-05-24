import requests
import json
import time

# Test URL
url = "http://localhost:8081/paraphrase"

# Chemical product context
chemical_product = "I have a chemical distribution company that supplies products such as glycol, and various products for anti freeze, dust control on roads and coal plants, and more."
chemical_audience = "Industrial manufacturers, road maintenance contractors, and energy companies with coal plants"
sales_environment = "B2B, a month, and around 1 hour"
methodology = "consultative"
goal = "I want to improve my ability to handle objections from industrial clients about product pricing"

# Step 1: Test core_q1_product_value
print("Step 1: Testing core_q1_product_value...")
data = {
    "stage": "core_q1_product_value",
    "userInput": chemical_product
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")
time.sleep(1)  # Pause between requests

# Step 2: Test core_q2_audience
print("Step 2: Testing core_q2_audience...")
data = {
    "stage": "core_q2_audience",
    "userInput": chemical_audience,
    "answer_q1_product_value": chemical_product
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")
time.sleep(1)  # Pause between requests

# Step 3: Test core_q4_style (sales environment)
print("Step 3: Testing core_q4_style...")
data = {
    "stage": "core_q4_style",
    "userInput": sales_environment,
    "answer_q1_product_value": chemical_product,
    "answer_q2_audience": chemical_audience
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")
time.sleep(1)  # Pause between requests

# Step 4: Test core_q4_methodology
print("Step 4: Testing core_q4_methodology...")
data = {
    "stage": "core_q4_methodology",
    "userInput": methodology,
    "answer_q1_product_value": chemical_product,
    "answer_q2_audience": chemical_audience,
    "answer_q4_style": sales_environment,
    "suggested_style": "Consultative"
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")
time.sleep(1)  # Pause between requests

# Step 5: Test core_q5_goal
print("Step 5: Testing core_q5_goal...")
data = {
    "stage": "core_q5_goal",
    "userInput": goal,
    "answer_q1_product_value": chemical_product,
    "answer_q2_audience": chemical_audience,
    "answer_q4_style": sales_environment,
    "answer_q4_methodology": methodology
}
response = requests.post(url, json=data)
result = response.json()
print(f"Response: {json.dumps(result, indent=2)}\n")

print("End-to-end test complete!") 