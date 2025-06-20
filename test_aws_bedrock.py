#!/usr/bin/env python3
"""
Test script to verify AWS Bedrock permissions
"""
import boto3
import os
from botocore.exceptions import ClientError

def test_bedrock_permissions():
    """Test if we can access AWS Bedrock"""
    print("Testing AWS Bedrock permissions...")
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv('instance/.env')
    
    # Get AWS credentials
    aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_region = os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
    
    print(f"AWS Region: {aws_region}")
    print(f"AWS Access Key: {aws_access_key[:10]}..." if aws_access_key else "AWS Access Key: Not found")
    print(f"AWS Secret Key: {'*' * 10}..." if aws_secret_key else "AWS Secret Key: Not found")
    
    if not aws_access_key or not aws_secret_key:
        print("❌ AWS credentials not found in environment")
        return False
    
    try:
        # Create Bedrock client
        bedrock_client = boto3.client(
            'bedrock',
            region_name=aws_region,
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key
        )
        
        print("\n🔍 Testing ListFoundationModels...")
        response = bedrock_client.list_foundation_models()
        
        models = response.get('modelSummaries', [])
        print(f"✅ Success! Found {len(models)} foundation models")
        
        # Look for Nova Sonic specifically
        nova_models = [m for m in models if 'nova' in m.get('modelId', '').lower()]
        if nova_models:
            print(f"🎤 Found {len(nova_models)} Nova models:")
            for model in nova_models:
                print(f"  - {model.get('modelId')}")
        else:
            print("⚠️ No Nova models found (might need model access approval)")
        
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"❌ AWS Error: {error_code}")
        print(f"   Message: {error_message}")
        
        if error_code == 'AccessDeniedException':
            print("\n🔧 Troubleshooting steps:")
            print("1. Verify the Bedrock policy is attached to your IAM user")
            print("2. Wait 5-10 minutes for policy changes to propagate")
            print("3. Check if you're using the correct AWS region (us-east-1)")
            
        return False
        
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    test_bedrock_permissions() 