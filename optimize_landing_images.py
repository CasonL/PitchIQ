#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Optimize Landing Page Images

Compresses large PNG images to reduce file sizes while maintaining quality.
Converts large PNGs to WebP format for better compression.
"""

import os
from PIL import Image
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

KIMI_PUBLIC_DIR = r"Kimi_Agent_PitchIQ Interactive Storytelling Upgrade (2)\app\public"
TARGET_LANDING_DIR = r"app\static\landing"

IMAGES_TO_OPTIMIZE = [
    "pain-hesitation.png",
    "pain-practice.png", 
    "pain-script.png",
    "step-analytics.png",
    "step-buyers.png",
    "step-practice.png",
    "step-upload.png",
    "fox-mascot.png",
    "fox-peeking.png",
    "marcus-avatar.png"
]

def optimize_image(image_path, output_path, quality=85, convert_to_webp=True):
    """Optimize a single image by compressing or converting to WebP."""
    try:
        with Image.open(image_path) as img:
            original_size = os.path.getsize(image_path)
            
            if convert_to_webp and image_path.endswith('.png'):
                webp_path = output_path.replace('.png', '.webp')
                img.save(webp_path, 'WEBP', quality=quality, method=6)
                new_size = os.path.getsize(webp_path)
                reduction = ((original_size - new_size) / original_size) * 100
                logger.info(f"Converted {os.path.basename(image_path)} to WebP: {original_size/1024:.1f}KB → {new_size/1024:.1f}KB ({reduction:.1f}% reduction)")
                return webp_path
            else:
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                img.save(output_path, optimize=True, quality=quality)
                new_size = os.path.getsize(output_path)
                reduction = ((original_size - new_size) / original_size) * 100
                logger.info(f"Optimized {os.path.basename(image_path)}: {original_size/1024:.1f}KB → {new_size/1024:.1f}KB ({reduction:.1f}% reduction)")
                return output_path
                
    except Exception as e:
        logger.error(f"Error optimizing {image_path}: {e}")
        return None

def optimize_all_images():
    """Optimize all landing page images."""
    logger.info("Starting image optimization...")
    
    if not os.path.exists(KIMI_PUBLIC_DIR):
        logger.error(f"Source directory not found: {KIMI_PUBLIC_DIR}")
        return False
    
    if not os.path.exists(TARGET_LANDING_DIR):
        os.makedirs(TARGET_LANDING_DIR)
        logger.info(f"Created target directory: {TARGET_LANDING_DIR}")
    
    total_original = 0
    total_optimized = 0
    
    for image_name in IMAGES_TO_OPTIMIZE:
        source_path = os.path.join(KIMI_PUBLIC_DIR, image_name)
        target_path = os.path.join(TARGET_LANDING_DIR, image_name)
        
        if not os.path.exists(source_path):
            logger.warning(f"Image not found: {source_path}")
            continue
        
        original_size = os.path.getsize(source_path)
        total_original += original_size
        
        result_path = optimize_image(source_path, target_path, quality=85, convert_to_webp=True)
        
        if result_path:
            total_optimized += os.path.getsize(result_path)
    
    if total_original > 0:
        total_reduction = ((total_original - total_optimized) / total_original) * 100
        logger.info(f"\nTotal optimization: {total_original/1024/1024:.2f}MB → {total_optimized/1024/1024:.2f}MB ({total_reduction:.1f}% reduction)")
    
    logger.info("Image optimization complete!")
    return True

if __name__ == "__main__":
    optimize_all_images()
