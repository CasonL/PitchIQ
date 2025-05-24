# Script to fix encoding issues in Python files

def fix_file(filename):
    print(f"Fixing file: {filename}")
    
    # Read the file in binary mode
    with open(filename, 'rb') as f:
        content = f.read()
    
    # Check for BOM and other invalid UTF-8 characters
    # Skip any non-ASCII characters at the beginning
    # Look for the first valid character (likely '#' for a comment)
    start_pos = 0
    for i, byte in enumerate(content):
        if byte == ord('#'):  # Found the start of a proper Python comment
            start_pos = i
            break
    
    # If we found a valid start position, keep only from that point
    if start_pos > 0:
        print(f"Removing {start_pos} bytes from the beginning of the file")
        clean_content = content[start_pos:]
    else:
        print("No invalid bytes found at the beginning")
        clean_content = content
    
    # Write back the cleaned content
    with open(filename, 'wb') as f:
        f.write(clean_content)
    
    print(f"File cleaned and saved")

if __name__ == "__main__":
    fix_file("app/training/__init__.py")
    print("Done!") 