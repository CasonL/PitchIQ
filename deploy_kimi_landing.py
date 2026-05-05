#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Deploy Optimized Kimi Landing Page

This script builds the Kimi landing page with optimizations and deploys it
to replace the current landing page in app/static/landing.
"""

import os
import sys
import shutil
import subprocess
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

KIMI_DIR = r"Kimi_Agent_PitchIQ Interactive Storytelling Upgrade (2)\app"
TARGET_DIR = r"app\static\landing"

def run_command(command, cwd=None):
    """Run a shell command and return success status."""
    logger.info(f"Running: {command}")
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            text=True, 
            capture_output=True,
            cwd=cwd
        )
        logger.info("✓ Command completed")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"✗ Command failed: {e.stderr}")
        return False

def build_landing_page():
    """Build the Kimi landing page with Vite."""
    logger.info("Building Kimi landing page...")
    
    if not os.path.exists(KIMI_DIR):
        logger.error(f"Kimi directory not found: {KIMI_DIR}")
        return False
    
    # Install dependencies if needed
    if not os.path.exists(os.path.join(KIMI_DIR, "node_modules")):
        logger.info("Installing dependencies...")
        if not run_command("npm install", cwd=KIMI_DIR):
            return False
    
    # Build the project
    if not run_command("npm run build", cwd=KIMI_DIR):
        return False
    
    logger.info("✓ Build completed successfully")
    return True

def deploy_to_flask():
    """Deploy built files to Flask static directory."""
    logger.info("Deploying to Flask static directory...")
    
    build_dir = os.path.join(KIMI_DIR, "dist")
    
    if not os.path.exists(build_dir):
        logger.error(f"Build directory not found: {build_dir}")
        return False
    
    # Ensure target directory exists
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)
    
    # Remove old files
    if os.path.exists(TARGET_DIR):
        for item in os.listdir(TARGET_DIR):
            item_path = os.path.join(TARGET_DIR, item)
            try:
                if os.path.isfile(item_path):
                    os.unlink(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
            except Exception as e:
                logger.warning(f"Could not remove {item_path}: {e}")
    
    # Copy new files
    try:
        for item in os.listdir(build_dir):
            src = os.path.join(build_dir, item)
            dst = os.path.join(TARGET_DIR, item)
            
            if os.path.isfile(src):
                shutil.copy2(src, dst)
            elif os.path.isdir(src):
                shutil.copytree(src, dst)
        
        logger.info("✓ Files deployed successfully")
        return True
    except Exception as e:
        logger.error(f"Deployment failed: {e}")
        return False

def main():
    """Main deployment function."""
    logger.info("="*60)
    logger.info("  Kimi Landing Page Deployment")
    logger.info("="*60)
    
    if not build_landing_page():
        logger.error("Build failed!")
        return 1
    
    if not deploy_to_flask():
        logger.error("Deployment failed!")
        return 1
    
    logger.info("="*60)
    logger.info("  ✓ Landing page deployed successfully!")
    logger.info(f"  Location: {TARGET_DIR}")
    logger.info("="*60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
