"""
Business Onboarding API Routes
Handles business profile creation, document upload, and AI analysis.
"""
import json
import logging
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from werkzeug.utils import secure_filename
from app.extensions import db, csrf
from app.models.business import BusinessProfile, BusinessDocument
from app.services.business_analysis_service import business_analysis_service
import os
from datetime import datetime

logger = logging.getLogger(__name__)

business_onboarding_bp = Blueprint('business_onboarding', __name__)

# File upload configuration
ALLOWED_EXTENSIONS = {
    'txt', 'pdf', 'doc', 'docx', 'csv', 'md', 'html'
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@business_onboarding_bp.route('/profile', methods=['GET'])
@login_required
def get_business_profile():
    """Get the current user's business profile."""
    try:
        business_profile = current_user.business_profile
        if not business_profile:
            return jsonify({
                'exists': False,
                'message': 'No business profile found'
            }), 404
        
        # Return profile data (without sensitive information by default)
        profile_data = business_profile.to_dict(include_sensitive=False)
        profile_data['exists'] = True
        
        # Include document summaries
        documents = []
        for doc in business_profile.documents:
            doc_data = doc.to_dict(include_content=False)
            documents.append(doc_data)
        profile_data['documents'] = documents
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        logger.error(f"Error fetching business profile for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to fetch business profile'}), 500


@business_onboarding_bp.route('/profile', methods=['POST'])
@csrf.exempt
@login_required
def create_or_update_business_profile():
    """Create or update business profile with basic information."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get or create business profile
        business_profile = current_user.business_profile
        if not business_profile:
            business_profile = BusinessProfile(user_id=current_user.id)
            db.session.add(business_profile)
        
        # Update basic information
        if 'company_name' in data:
            business_profile.company_name = data['company_name']
        if 'industry' in data:
            business_profile.industry = data['industry']
        if 'company_size' in data:
            business_profile.company_size = data['company_size']
        if 'business_type' in data:
            business_profile.business_type = data['business_type']
        
        # Update sensitive information (encrypted)
        if 'business_description' in data:
            business_profile.business_description = data['business_description']
        if 'target_customers' in data:
            business_profile.target_customers = data['target_customers']
        if 'sales_process' in data:
            business_profile.sales_process = data['sales_process']
        if 'compliance_requirements' in data:
            business_profile.compliance_requirements = data['compliance_requirements']
        if 'competitive_landscape' in data:
            business_profile.competitive_landscape = data['competitive_landscape']
        if 'pricing_strategy' in data:
            business_profile.pricing_strategy = data['pricing_strategy']
        if 'sales_scripts' in data:
            business_profile.sales_scripts = data['sales_scripts']
        if 'objection_handling' in data:
            business_profile.objection_handling = data['objection_handling']
        
        business_profile.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Business profile updated for user {current_user.id}")
        
        return jsonify({
            'success': True,
            'message': 'Business profile updated successfully',
            'profile': business_profile.to_dict(include_sensitive=False)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating business profile for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to update business profile'}), 500


@business_onboarding_bp.route('/upload-document', methods=['POST'])
@csrf.exempt
@login_required
def upload_document():
    """Upload and analyze a business document."""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                'error': f'File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB'
            }), 400
        
        # Get or create business profile
        business_profile = current_user.business_profile
        if not business_profile:
            business_profile = BusinessProfile(user_id=current_user.id)
            db.session.add(business_profile)
            db.session.flush()  # Get the ID
        
        # Read file content
        file_content = file.read()
        
        # Determine content type
        content_type = file.content_type or 'application/octet-stream'
        
        # Get document type from form data
        document_type = request.form.get('document_type', 'general')
        
        # Create document record
        document = BusinessDocument(
            business_profile_id=business_profile.id,
            original_filename=secure_filename(file.filename),
            file_size=file_size,
            content_type=content_type,
            document_type=document_type
        )
        
        # Explicitly set the relationship to ensure encryption works
        document.business_profile = business_profile
        
        # Store encrypted content
        document.content = file_content
        
        db.session.add(document)
        db.session.commit()
        
        logger.info(f"Document uploaded: {file.filename} for user {current_user.id}")
        
        # Start AI analysis in the background (for now, do it synchronously)
        try:
            analysis_result = business_analysis_service.analyze_document(document)
            
            return jsonify({
                'success': True,
                'message': 'Document uploaded and analyzed successfully',
                'document': document.to_dict(include_content=False),
                'analysis': analysis_result
            }), 200
            
        except Exception as analysis_error:
            logger.error(f"Error analyzing document {document.id}: {analysis_error}")
            return jsonify({
                'success': True,
                'message': 'Document uploaded successfully, but analysis failed',
                'document': document.to_dict(include_content=False),
                'analysis_error': str(analysis_error)
            }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error uploading document for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to upload document'}), 500


@business_onboarding_bp.route('/documents', methods=['GET'])
@login_required
def get_documents():
    """Get all uploaded documents for the user's business profile."""
    try:
        business_profile = current_user.business_profile
        if not business_profile:
            return jsonify({'documents': []}), 200
        
        documents = []
        for doc in business_profile.documents:
            doc_data = doc.to_dict(include_content=False)
            documents.append(doc_data)
        
        return jsonify({'documents': documents}), 200
        
    except Exception as e:
        logger.error(f"Error fetching documents for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to fetch documents'}), 500


@business_onboarding_bp.route('/documents/<int:document_id>', methods=['DELETE'])
@csrf.exempt
@login_required
def delete_document(document_id):
    """Delete a specific document."""
    try:
        business_profile = current_user.business_profile
        if not business_profile:
            return jsonify({'error': 'No business profile found'}), 404
        
        document = BusinessDocument.query.filter_by(
            id=document_id,
            business_profile_id=business_profile.id
        ).first()
        
        if not document:
            return jsonify({'error': 'Document not found'}), 404
        
        db.session.delete(document)
        db.session.commit()
        
        logger.info(f"Document {document_id} deleted for user {current_user.id}")
        
        return jsonify({
            'success': True,
            'message': 'Document deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting document {document_id} for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to delete document'}), 500


@business_onboarding_bp.route('/analyze-profile', methods=['POST'])
@csrf.exempt
@login_required
def analyze_business_profile():
    """Generate comprehensive business insights based on profile and documents."""
    try:
        business_profile = current_user.business_profile
        if not business_profile:
            return jsonify({'error': 'No business profile found'}), 404
        
        # Generate comprehensive insights
        result = business_analysis_service.generate_business_profile_insights(business_profile)
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'message': 'Business analysis completed successfully',
                'insights': result['insights']
            }), 200
        else:
            return jsonify({
                'error': result.get('error', 'Analysis failed')
            }), 500
            
    except Exception as e:
        logger.error(f"Error analyzing business profile for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to analyze business profile'}), 500


@business_onboarding_bp.route('/complete-onboarding', methods=['POST'])
@csrf.exempt
@login_required
def complete_business_onboarding():
    """Mark business onboarding as complete and generate final insights."""
    try:
        business_profile = current_user.business_profile
        if not business_profile:
            return jsonify({'error': 'No business profile found'}), 404
        
        # Generate final insights if not already done
        if not business_profile.document_analysis_complete:
            result = business_analysis_service.generate_business_profile_insights(business_profile)
            if not result.get('success'):
                logger.warning(f"Failed to generate final insights for user {current_user.id}")
        
        # Mark onboarding as complete
        business_profile.business_onboarding_complete = True
        business_profile.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Business onboarding completed for user {current_user.id}")
        
        return jsonify({
            'success': True,
            'message': 'Business onboarding completed successfully',
            'profile': business_profile.to_dict(include_sensitive=False)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error completing business onboarding for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to complete business onboarding'}), 500


@business_onboarding_bp.route('/insights', methods=['GET'])
@login_required
def get_business_insights():
    """Get AI-generated business insights."""
    try:
        business_profile = current_user.business_profile
        if not business_profile:
            return jsonify({'error': 'No business profile found'}), 404
        
        insights = {
            'business_summary': business_profile.ai_business_summary,
            'sales_recommendations': json.loads(business_profile.ai_sales_recommendations) if business_profile.ai_sales_recommendations else [],
            'training_focus_areas': json.loads(business_profile.ai_training_focus_areas) if business_profile.ai_training_focus_areas else [],
            'analysis_complete': business_profile.document_analysis_complete
        }
        
        return jsonify({
            'success': True,
            'insights': insights
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching business insights for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to fetch business insights'}), 500 