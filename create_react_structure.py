"""
Create directory structure for React dashboard application
"""
import os

# Base directories
directories = [
    'app/static/react',
    'app/static/react/src',
    'app/static/react/src/components',
    'app/static/react/src/components/dashboard',
    'app/static/react/src/components/dashboard/cards',
    'app/static/react/src/components/dashboard/charts',
    'app/static/react/src/components/dashboard/timeline',
    'app/static/react/src/components/common',
    'app/static/react/src/hooks',
    'app/static/react/src/services',
    'app/static/react/src/context',
    'app/static/react/dist',
]

# Create directories
for directory in directories:
    os.makedirs(directory, exist_ok=True)
    print(f"Created directory: {directory}")

# Create __init__.py files to make these Python packages
for directory in directories:
    init_file = os.path.join(directory, '__init__.py')
    if not os.path.exists(init_file):
        with open(init_file, 'w') as f:
            f.write('# React dashboard component package\n')
        print(f"Created __init__.py in {directory}")

print("React application directory structure created successfully!") 