import re

# Read the original file
with open('paraphrase_service.py', 'r') as file:
    content = file.read()

# Find the problematic section and fix its indentation
pattern = r'(                )response_payload = \{\n([ ]{16,24})\'id\': str\(uuid\.uuid4\(\)\),'
replacement = r'                response_payload = {\n                    \'id\': str(uuid.uuid4()),'

# Apply the fix
fixed_content = re.sub(pattern, replacement, content)

# Find and fix the indent in the goal section
goal_pattern = r'([ ]{16,32})response_payload = \{\n([ ]{16,24})\'id\': str\(uuid\.uuid4\(\)\),'
goal_replacement = r'                response_payload = {\n                    \'id\': str(uuid.uuid4()),'

# Apply the fix
fixed_content = re.sub(goal_pattern, goal_replacement, fixed_content)

# Write the fixed content back to the file
with open('paraphrase_service.py', 'w') as file:
    file.write(fixed_content)

print("Fixed indentation issues in paraphrase_service.py") 