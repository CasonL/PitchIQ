from flask import Blueprint, jsonify, current_app, request
import os
import json
from pathlib import Path

# Create a Blueprint for company routes
company_bp = Blueprint('company', __name__)

# Get the project root directory (app directory)
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent

# Define the business profiles directory
PROFILE_DIR = PROJECT_ROOT / 'business_profiles'

# Ensure the directory exists
os.makedirs(PROFILE_DIR, exist_ok=True)

# Debug info
current_dir = os.path.dirname(os.path.abspath(__file__))
print(f"\n=== Company Routes Debug ===")
print(f"Current directory: {current_dir}")
print(f"Project root: {PROJECT_ROOT}")
print(f"Profile directory: {PROFILE_DIR}")
print(f"Directory exists: {os.path.exists(PROFILE_DIR)}")
print("==========================\n")

@company_bp.route('/company/<company_id>', methods=['GET'])
def get_company(company_id):
    print(f"\n=== GET /company/{company_id} ===")
    print(f"Request URL: {request.url}")
    
    try:
        # Log debug information
        print(f"Current working directory: {os.getcwd()}")
        print(f"PROJECT_ROOT: {PROJECT_ROOT}")
        print(f"PROFILE_DIR: {PROFILE_DIR}")
        print(f"Directory exists: {os.path.exists(PROFILE_DIR)}")
        
        # List files in the directory
        if os.path.exists(PROFILE_DIR):
            try:
                files = [f for f in os.listdir(PROFILE_DIR) if f.endswith('.json')]
                print(f"Found {len(files)} JSON files in {PROFILE_DIR}:")
                for f in files:
                    print(f"  - {f}")
            except Exception as e:
                print(f"Error listing files: {str(e)}")
        
        # Remove .json extension if it's included in the company_id
        company_id = company_id.replace('.json', '')
        file_name = f"{company_id}.json"
        file_path = os.path.join(PROFILE_DIR, file_name)
        
        print(f"Looking for company file: {file_path}")
        print(f"Absolute path: {os.path.abspath(file_path)}")
        
        if not os.path.exists(file_path):
            error_msg = f"Company file not found: {file_path}"
            print(error_msg)
            return jsonify({
                "error": f"Company not found: {company_id}",
                "path_checked": os.path.abspath(file_path),
                "files_in_directory": os.listdir(PROFILE_DIR) if os.path.exists(PROFILE_DIR) else []
            }), 404
            
        print(f"Found company file, loading: {file_path}")
        with open(file_path, 'r', encoding='utf-8') as f:
            company_data = json.load(f)
            
        print(f"Successfully loaded company data for: {company_id}")
        return jsonify(company_data)
        
    except json.JSONDecodeError as e:
        error_msg = f"Error parsing company data: {str(e)}"
        print(error_msg)
        return jsonify({"error": "Invalid company data format", "details": str(e)}), 500
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(error_msg)
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
