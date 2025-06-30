"""
Business onboarding models for secure storage of company information.
Includes encryption capabilities for sensitive business data.
"""
import json
import secrets
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, LargeBinary
from sqlalchemy.ext.hybrid import hybrid_property
from app.extensions import db
from cryptography.fernet import Fernet
from flask import current_app
import base64
import os


class BusinessProfile(db.Model):
    """
    Business profile containing company information for sales training customization.
    Sensitive data is encrypted at rest.
    """
    __tablename__ = 'business_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Basic business information (non-sensitive)
    company_name = db.Column(db.String(200), nullable=True)
    industry = db.Column(db.String(100), nullable=True)
    company_size = db.Column(db.String(50), nullable=True)  # e.g., "1-10", "11-50", "51-200", etc.
    business_type = db.Column(db.String(50), nullable=True)  # B2B, B2C, B2B2C
    
    # Encrypted sensitive business data
    _business_description_encrypted = db.Column(db.LargeBinary, nullable=True)
    _target_customers_encrypted = db.Column(db.LargeBinary, nullable=True)
    _sales_process_encrypted = db.Column(db.LargeBinary, nullable=True)
    _compliance_requirements_encrypted = db.Column(db.LargeBinary, nullable=True)
    _competitive_landscape_encrypted = db.Column(db.LargeBinary, nullable=True)
    _pricing_strategy_encrypted = db.Column(db.LargeBinary, nullable=True)
    _sales_scripts_encrypted = db.Column(db.LargeBinary, nullable=True)
    _objection_handling_encrypted = db.Column(db.LargeBinary, nullable=True)
    
    # AI-generated insights (non-sensitive summaries)
    ai_business_summary = db.Column(db.Text, nullable=True)
    ai_sales_recommendations = db.Column(db.Text, nullable=True)
    ai_training_focus_areas = db.Column(db.Text, nullable=True)
    
    # Onboarding status
    business_onboarding_complete = db.Column(db.Boolean, default=False)
    document_analysis_complete = db.Column(db.Boolean, default=False)
    
    # Encryption key reference (stored separately for security)
    encryption_key_id = db.Column(db.String(100), nullable=True)
    
    # Relationship
    user = db.relationship('User', backref=db.backref('business_profile', uselist=False, lazy=True))
    
    def _get_encryption_key(self):
        """Get or create encryption key for this business profile."""
        if not self.encryption_key_id:
            # Generate new encryption key
            key = Fernet.generate_key()
            self.encryption_key_id = secrets.token_urlsafe(32)
            
            # Store key securely (in production, use a proper key management service)
            key_storage_path = os.path.join(current_app.instance_path, 'keys')
            os.makedirs(key_storage_path, exist_ok=True, mode=0o700)
            
            key_file_path = os.path.join(key_storage_path, f"{self.encryption_key_id}.key")
            with open(key_file_path, 'wb') as key_file:
                key_file.write(key)
            os.chmod(key_file_path, 0o600)  # Read/write for owner only
            
            return key
        else:
            # Load existing key
            key_file_path = os.path.join(current_app.instance_path, 'keys', f"{self.encryption_key_id}.key")
            if os.path.exists(key_file_path):
                with open(key_file_path, 'rb') as key_file:
                    return key_file.read()
            else:
                raise ValueError(f"Encryption key not found for business profile {self.id}")
    
    def _encrypt_data(self, data):
        """Encrypt sensitive data."""
        if data is None:
            return None
        
        key = self._get_encryption_key()
        fernet = Fernet(key)
        
        if isinstance(data, str):
            data = data.encode('utf-8')
        
        return fernet.encrypt(data)
    
    def _decrypt_data(self, encrypted_data):
        """Decrypt sensitive data."""
        if encrypted_data is None:
            return None
        
        key = self._get_encryption_key()
        fernet = Fernet(key)
        
        decrypted_bytes = fernet.decrypt(encrypted_data)
        return decrypted_bytes.decode('utf-8')
    
    # Encrypted field properties
    @hybrid_property
    def business_description(self):
        """Get decrypted business description."""
        return self._decrypt_data(self._business_description_encrypted)
    
    @business_description.setter
    def business_description(self, value):
        """Set encrypted business description."""
        self._business_description_encrypted = self._encrypt_data(value)
    
    @hybrid_property
    def target_customers(self):
        """Get decrypted target customers information."""
        return self._decrypt_data(self._target_customers_encrypted)
    
    @target_customers.setter
    def target_customers(self, value):
        """Set encrypted target customers information."""
        self._target_customers_encrypted = self._encrypt_data(value)
    
    @hybrid_property
    def sales_process(self):
        """Get decrypted sales process information."""
        return self._decrypt_data(self._sales_process_encrypted)
    
    @sales_process.setter
    def sales_process(self, value):
        """Set encrypted sales process information."""
        self._sales_process_encrypted = self._encrypt_data(value)
    
    @hybrid_property
    def compliance_requirements(self):
        """Get decrypted compliance requirements."""
        return self._decrypt_data(self._compliance_requirements_encrypted)
    
    @compliance_requirements.setter
    def compliance_requirements(self, value):
        """Set encrypted compliance requirements."""
        self._compliance_requirements_encrypted = self._encrypt_data(value)
    
    @hybrid_property
    def competitive_landscape(self):
        """Get decrypted competitive landscape information."""
        return self._decrypt_data(self._competitive_landscape_encrypted)
    
    @competitive_landscape.setter
    def competitive_landscape(self, value):
        """Set encrypted competitive landscape information."""
        self._competitive_landscape_encrypted = self._encrypt_data(value)
    
    @hybrid_property
    def pricing_strategy(self):
        """Get decrypted pricing strategy."""
        return self._decrypt_data(self._pricing_strategy_encrypted)
    
    @pricing_strategy.setter
    def pricing_strategy(self, value):
        """Set encrypted pricing strategy."""
        self._pricing_strategy_encrypted = self._encrypt_data(value)
    
    @hybrid_property
    def sales_scripts(self):
        """Get decrypted sales scripts."""
        return self._decrypt_data(self._sales_scripts_encrypted)
    
    @sales_scripts.setter
    def sales_scripts(self, value):
        """Set encrypted sales scripts."""
        self._sales_scripts_encrypted = self._encrypt_data(value)
    
    @hybrid_property
    def objection_handling(self):
        """Get decrypted objection handling information."""
        return self._decrypt_data(self._objection_handling_encrypted)
    
    @objection_handling.setter
    def objection_handling(self, value):
        """Set encrypted objection handling information."""
        self._objection_handling_encrypted = self._encrypt_data(value)
    
    def to_dict(self, include_sensitive=False):
        """Convert business profile to dictionary."""
        data = {
            'id': self.id,
            'company_name': self.company_name,
            'industry': self.industry,
            'company_size': self.company_size,
            'business_type': self.business_type,
            'ai_business_summary': self.ai_business_summary,
            'ai_sales_recommendations': self.ai_sales_recommendations,
            'ai_training_focus_areas': self.ai_training_focus_areas,
            'business_onboarding_complete': self.business_onboarding_complete,
            'document_analysis_complete': self.document_analysis_complete,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        
        if include_sensitive:
            data.update({
                'business_description': self.business_description,
                'target_customers': self.target_customers,
                'sales_process': self.sales_process,
                'compliance_requirements': self.compliance_requirements,
                'competitive_landscape': self.competitive_landscape,
                'pricing_strategy': self.pricing_strategy,
                'sales_scripts': self.sales_scripts,
                'objection_handling': self.objection_handling,
            })
        
        return data
    
    def __repr__(self):
        return f'<BusinessProfile {self.company_name or "Unnamed"} for User {self.user_id}>'


class BusinessDocument(db.Model):
    """
    Uploaded business documents for AI analysis.
    Documents are encrypted and stored securely.
    """
    __tablename__ = 'business_documents'
    
    id = db.Column(db.Integer, primary_key=True)
    business_profile_id = db.Column(db.Integer, db.ForeignKey('business_profiles.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Document metadata
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    content_type = db.Column(db.String(100), nullable=False)
    document_type = db.Column(db.String(50), nullable=True)  # 'sales_script', 'process_doc', 'compliance', etc.
    
    # Encrypted document content
    _content_encrypted = db.Column(db.LargeBinary, nullable=False)
    
    # AI analysis results
    ai_extracted_text = db.Column(db.Text, nullable=True)
    ai_document_summary = db.Column(db.Text, nullable=True)
    ai_key_insights = db.Column(db.Text, nullable=True)  # JSON string
    analysis_complete = db.Column(db.Boolean, default=False)
    
    # Processing status
    processing_status = db.Column(db.String(20), default='uploaded')  # uploaded, processing, completed, error
    processing_error = db.Column(db.Text, nullable=True)
    
    # Relationship
    business_profile = db.relationship('BusinessProfile', backref=db.backref('documents', lazy=True))
    
    def _get_encryption_key(self):
        """Use the same encryption key as the parent business profile."""
        return self.business_profile._get_encryption_key()
    
    def _encrypt_content(self, content):
        """Encrypt document content."""
        key = self._get_encryption_key()
        fernet = Fernet(key)
        
        if isinstance(content, str):
            content = content.encode('utf-8')
        
        return fernet.encrypt(content)
    
    def _decrypt_content(self):
        """Decrypt document content."""
        if self._content_encrypted is None:
            return None
        
        key = self._get_encryption_key()
        fernet = Fernet(key)
        
        return fernet.decrypt(self._content_encrypted)
    
    @hybrid_property
    def content(self):
        """Get decrypted document content as bytes."""
        return self._decrypt_content()
    
    @content.setter
    def content(self, value):
        """Set encrypted document content."""
        self._content_encrypted = self._encrypt_content(value)
    
    def get_content_as_text(self):
        """Get document content as text (for text documents)."""
        content_bytes = self.content
        if content_bytes:
            try:
                return content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                return None
        return None
    
    def to_dict(self, include_content=False):
        """Convert document to dictionary."""
        data = {
            'id': self.id,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'content_type': self.content_type,
            'document_type': self.document_type,
            'ai_document_summary': self.ai_document_summary,
            'ai_key_insights': json.loads(self.ai_key_insights) if self.ai_key_insights else None,
            'analysis_complete': self.analysis_complete,
            'processing_status': self.processing_status,
            'processing_error': self.processing_error,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        
        if include_content:
            data['content_text'] = self.get_content_as_text()
        
        return data
    
    def __repr__(self):
        return f'<BusinessDocument {self.original_filename} for BusinessProfile {self.business_profile_id}>' 