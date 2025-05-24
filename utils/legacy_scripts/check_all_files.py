# Script to check for null bytes in all Python files

import os

def check_file(filename):
    try:
        # Read the file binary to identify null bytes
        with open(filename, 'rb') as f:
            content = f.read()
        
        # Count null bytes
        null_count = content.count(b'\x00')
        
        if null_count > 0:
            print(f"Found {null_count} null bytes in {filename}")
            return filename, null_count
        return None
    except Exception as e:
        print(f"Error checking {filename}: {e}")
        return None

def clean_file(filename):
    print(f"Cleaning file: {filename}")
    # Read the file binary to identify null bytes
    with open(filename, 'rb') as f:
        content = f.read()
    
    # Remove null bytes
    clean_content = content.replace(b'\x00', b'')
    
    # Write back clean content
    with open(filename, 'wb') as f:
        f.write(clean_content)
    
    print(f"File cleaned and saved")

def scan_directory(directory):
    affected_files = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                full_path = os.path.join(root, file)
                result = check_file(full_path)
                if result:
                    affected_files.append(result)
    
    return affected_files

if __name__ == "__main__":
    print("Scanning for Python files with null bytes...")
    affected_files = scan_directory(".")
    
    if affected_files:
        print(f"\nFound {len(affected_files)} files with null bytes:")
        for filename, count in affected_files:
            print(f"- {filename}: {count} null bytes")
        
        print("\nCleaning files...")
        for filename, _ in affected_files:
            clean_file(filename)
    else:
        print("No files with null bytes found!")
    
    print("Done!") 