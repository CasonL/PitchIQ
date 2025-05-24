#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
OpenAI Compatibility Fix Script

This script fixes compatibility issues between the installed OpenAI SDK
and how it's being used in the application. It specifically addresses the
'proxies' parameter issue that's causing 500 errors in the voice chat feature.
"""

import os
import sys
import re
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openai_fix")

# Files to check and fix
TARGET_FILES = [
    "app/services/openai_service.py",
    "app/openai_service.py", 
    "app/services/gpt4o_service.py",
    "app/services/claude_service.py",
    "app/services/vector_persona_service.py"
]

def fix_openai_client_init(file_path):
    """
    Fix OpenAI client initialization in the given file by removing
    incompatible parameters like 'proxies'.
    """
    if not os.path.exists(file_path):
        logger.warning(f"File not found: {file_path}")
        return False
    
    logger.info(f"Checking file: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for client initializations with proxies
    if 'httpx.Client(' in content and 'proxies=' in content:
        logger.info(f"Found httpx.Client with proxies parameter in {file_path}")
        
        # Fix httpx client creation
        modified_content = re.sub(
            r'httpx\.Client\(([^)]*proxies=[^,)]*,)([^)]*)\)',
            r'httpx.Client(\2)',
            content
        )
        
        # Fix general httpx client options without using regex for cleaner replacements
        modified_content = modified_content.replace("proxies=proxies,", "")
        modified_content = modified_content.replace("proxies=proxies", "")
        
        if content != modified_content:
            # Backup original file
            backup_path = f"{file_path}.bak"
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"Created backup at {backup_path}")
            
            # Write fixed content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(modified_content)
            logger.info(f"Fixed httpx.Client initialization in {file_path}")
            return True
        else:
            logger.info(f"No changes needed for {file_path}")
    else:
        logger.info(f"No httpx.Client with proxies parameter found in {file_path}")
    
    return False

def fix_indentation_issues(file_path):
    """Fix indentation issues in the given file."""
    if not os.path.exists(file_path):
        logger.warning(f"File not found: {file_path}")
        return False
    
    if not file_path.endswith('gpt4o_service.py'):
        return False
    
    logger.info(f"Checking for indentation issues in: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixed = False
    for i, line in enumerate(lines):
        # Fix specific indentation issues in gpt4o_service.py
        if "self.api_key = current_app.config.get" in line and lines[i-1].strip().startswith("logger.debug"):
            indent = lines[i-1].split("logger")[0]
            if not line.startswith(indent):
                lines[i] = indent + line.lstrip()
                fixed = True
                logger.info(f"Fixed indentation at line {i+1}")
        
        # Look for other indentation issues with API key from environment
        if "self.api_key = os.environ.get('OPENAI_API_KEY')" in line and i > 0:
            prev_indent = len(lines[i-1]) - len(lines[i-1].lstrip())
            current_indent = len(line) - len(line.lstrip())
            
            # If significant mismatch in indentation with previous line
            if abs(prev_indent - current_indent) > 4 and "if not self.api_key" not in lines[i-1]:
                proper_indent = " " * prev_indent
                lines[i] = proper_indent + line.lstrip()
                fixed = True
                logger.info(f"Fixed indentation at line {i+1}")
    
    if fixed:
        # Backup original file
        backup_path = f"{file_path}.bak"
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        logger.info(f"Created backup at {backup_path}")
        
        # Write fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        logger.info(f"Fixed indentation issues in {file_path}")
    else:
        logger.info(f"No indentation issues found in {file_path}")
    
    return fixed

def ensure_traceback_import(file_path):
    """Ensure traceback is imported in files that need it."""
    if not os.path.exists(file_path):
        logger.warning(f"File not found: {file_path}")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if traceback is used but not imported
    if "traceback.format_exc()" in content and "import traceback" not in content:
        logger.info(f"Adding missing traceback import to {file_path}")
        
        # Find the import block
        import_block_end = 0
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # Find where imports end
        in_imports = False
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith('from '):
                in_imports = True
                import_block_end = i
            elif in_imports and line.strip() and not (line.startswith('import ') or line.startswith('from ')):
                break
        
        # Insert traceback import after the last import
        import_line = "import traceback\n"
        lines.insert(import_block_end + 1, import_line)
        
        # Backup original file
        backup_path = f"{file_path}.bak"
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        logger.info(f"Created backup at {backup_path}")
        
        # Write fixed content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        logger.info(f"Added traceback import to {file_path}")
        return True
    
    return False

def main():
    """Run all fixes on target files."""
    logger.info("Starting OpenAI compatibility fixes...")
    
    fixed_files = []
    
    for file_path in TARGET_FILES:
        if os.path.exists(file_path):
            client_fixed = fix_openai_client_init(file_path)
            indent_fixed = fix_indentation_issues(file_path)
            traceback_fixed = ensure_traceback_import(file_path)
            
            if client_fixed or indent_fixed or traceback_fixed:
                fixed_files.append(file_path)
        else:
            logger.warning(f"File not found: {file_path}")
    
    if fixed_files:
        logger.info(f"Fixed issues in {len(fixed_files)} files: {', '.join(fixed_files)}")
        logger.info("\nPlease restart your application for the changes to take effect.")
    else:
        logger.info("No issues found that needed fixing.")

if __name__ == "__main__":
    main() 