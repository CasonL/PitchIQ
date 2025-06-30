"""
Business Analysis Service for processing uploaded documents and extracting business insights.
Uses AI to analyze documents and generate personalized sales training recommendations.
"""
import json
import logging
from typing import Dict, List, Optional, Tuple
from flask import current_app
from app.services.openai_service import openai_service
from app.models.business import BusinessProfile, BusinessDocument
from app.extensions import db
import re
import PyPDF2
import docx
from io import BytesIO

logger = logging.getLogger(__name__)


class BusinessAnalysisService:
    """Service for analyzing business documents and generating insights."""
    
    @staticmethod
    def extract_text_from_document(document: BusinessDocument) -> str:
        """
        Extract text content from various document types.
        
        Args:
            document: BusinessDocument instance
            
        Returns:
            Extracted text content
        """
        try:
            content = document.content
            content_type = document.content_type.lower()
            
            if content_type == 'text/plain':
                return content.decode('utf-8')
            
            elif content_type == 'application/pdf':
                return BusinessAnalysisService._extract_pdf_text(content)
            
            elif content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
                return BusinessAnalysisService._extract_docx_text(content)
            
            elif content_type in ['text/csv', 'text/html', 'text/markdown']:
                return content.decode('utf-8')
            
            else:
                logger.warning(f"Unsupported content type: {content_type}")
                return ""
                
        except Exception as e:
            logger.error(f"Error extracting text from document {document.id}: {e}")
            return ""
    
    @staticmethod
    def _extract_pdf_text(content: bytes) -> str:
        """Extract text from PDF content."""
        try:
            pdf_reader = PyPDF2.PdfReader(BytesIO(content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            logger.error(f"Error extracting PDF text: {e}")
            return ""
    
    @staticmethod
    def _extract_docx_text(content: bytes) -> str:
        """Extract text from DOCX content."""
        try:
            doc = docx.Document(BytesIO(content))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {e}")
            return ""
    
    @staticmethod
    def analyze_document(document: BusinessDocument) -> Dict:
        """
        Analyze a single document and extract insights.
        
        Args:
            document: BusinessDocument instance
            
        Returns:
            Dictionary containing analysis results
        """
        try:
            # Update processing status
            document.processing_status = 'processing'
            db.session.commit()
            
            # Extract text content
            text_content = BusinessAnalysisService.extract_text_from_document(document)
            document.ai_extracted_text = text_content[:10000]  # Store first 10k chars
            
            if not text_content:
                document.processing_status = 'error'
                document.processing_error = 'Could not extract text from document'
                db.session.commit()
                return {'error': 'Could not extract text from document'}
            
            # Analyze content with AI
            analysis_prompt = f"""
            Analyze the following business document and extract key insights:

            Document Type: {document.document_type or 'Unknown'}
            Filename: {document.original_filename}

            Content:
            {text_content[:8000]}  # Limit content to avoid token limits

            Please provide a comprehensive analysis in the following JSON format:
            {{
                "document_summary": "Brief summary of the document's purpose and main content",
                "key_insights": [
                    "List of 3-5 key insights extracted from the document",
                    "Focus on sales-relevant information",
                    "Include specific processes, strategies, or requirements mentioned"
                ],
                "business_information": {{
                    "products_services": ["List of products/services mentioned"],
                    "target_customers": ["Customer types or segments mentioned"],
                    "sales_process": "Description of any sales processes mentioned",
                    "pricing_info": "Any pricing strategies or information",
                    "compliance_requirements": ["Any compliance or regulatory requirements"],
                    "competitive_advantages": ["Unique selling points or advantages mentioned"],
                    "objection_handling": ["Common objections or handling strategies mentioned"]
                }},
                "training_recommendations": [
                    "Specific sales training recommendations based on this document",
                    "Areas where role-play scenarios could be beneficial",
                    "Skills that should be emphasized in training"
                ]
            }}

            Ensure the response is valid JSON format.
            """
            
            # Get AI analysis
            ai_response = openai_service.generate_response(
                messages=[{"role": "user", "content": analysis_prompt}],
                max_tokens=2000,
                temperature=0.3
            )
            
            if ai_response and ai_response.get('content'):
                try:
                    # Parse AI response as JSON
                    analysis_result = json.loads(ai_response['content'])
                    
                    # Store results in document
                    document.ai_document_summary = analysis_result.get('document_summary', '')
                    document.ai_key_insights = json.dumps(analysis_result.get('key_insights', []))
                    document.analysis_complete = True
                    document.processing_status = 'completed'
                    
                    db.session.commit()
                    
                    return {
                        'success': True,
                        'analysis': analysis_result,
                        'extracted_text_length': len(text_content)
                    }
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing AI response as JSON: {e}")
                    # Store raw response as summary if JSON parsing fails
                    document.ai_document_summary = ai_response['content'][:1000]
                    document.analysis_complete = True
                    document.processing_status = 'completed'
                    db.session.commit()
                    
                    return {
                        'success': True,
                        'analysis': {'raw_response': ai_response['content']},
                        'extracted_text_length': len(text_content)
                    }
            else:
                document.processing_status = 'error'
                document.processing_error = 'AI analysis failed'
                db.session.commit()
                return {'error': 'AI analysis failed'}
                
        except Exception as e:
            logger.error(f"Error analyzing document {document.id}: {e}")
            document.processing_status = 'error'
            document.processing_error = str(e)
            db.session.commit()
            return {'error': str(e)}
    
    @staticmethod
    def generate_business_profile_insights(business_profile: BusinessProfile) -> Dict:
        """
        Generate comprehensive business insights based on all documents and profile data.
        
        Args:
            business_profile: BusinessProfile instance
            
        Returns:
            Dictionary containing comprehensive business insights
        """
        try:
            # Gather all available information
            profile_data = business_profile.to_dict(include_sensitive=True)
            documents_data = []
            
            for doc in business_profile.documents:
                if doc.analysis_complete:
                    doc_data = doc.to_dict()
                    doc_data['extracted_text_sample'] = doc.ai_extracted_text[:500] if doc.ai_extracted_text else ""
                    documents_data.append(doc_data)
            
            # Create comprehensive analysis prompt
            analysis_prompt = f"""
            Based on the following business profile and analyzed documents, generate comprehensive business insights and sales training recommendations:

            BUSINESS PROFILE:
            Company: {profile_data.get('company_name', 'Not specified')}
            Industry: {profile_data.get('industry', 'Not specified')}
            Business Type: {profile_data.get('business_type', 'Not specified')}
            Company Size: {profile_data.get('company_size', 'Not specified')}

            BUSINESS DETAILS:
            Description: {profile_data.get('business_description', 'Not provided')[:1000]}
            Target Customers: {profile_data.get('target_customers', 'Not provided')[:1000]}
            Sales Process: {profile_data.get('sales_process', 'Not provided')[:1000]}
            Pricing Strategy: {profile_data.get('pricing_strategy', 'Not provided')[:500]}

            ANALYZED DOCUMENTS ({len(documents_data)} documents):
            {json.dumps(documents_data, indent=2)[:3000]}

            Please provide a comprehensive analysis in the following JSON format:
            {{
                "business_summary": "Executive summary of the business and its sales approach",
                "sales_recommendations": [
                    "Specific recommendations for improving sales effectiveness",
                    "Based on the business model and documented processes",
                    "Focus on actionable strategies"
                ],
                "training_focus_areas": [
                    "Key areas where sales training should focus",
                    "Skills that are most critical for this business",
                    "Common challenges that should be addressed"
                ],
                "roleplay_scenarios": [
                    "Specific roleplay scenarios that would be valuable",
                    "Based on the actual sales process and customer types",
                    "Include objection handling scenarios"
                ],
                "competitive_advantages": [
                    "Key competitive advantages to emphasize in sales",
                    "Unique value propositions to highlight"
                ],
                "compliance_considerations": [
                    "Any compliance or regulatory considerations for sales",
                    "Industry-specific requirements to be aware of"
                ],
                "customer_personas": [
                    "Detailed customer personas based on target customers",
                    "Include decision-making factors and pain points"
                ]
            }}

            Ensure the response is valid JSON format and highly specific to this business.
            """
            
            # Get AI analysis
            ai_response = openai_service.generate_response(
                messages=[{"role": "user", "content": analysis_prompt}],
                max_tokens=3000,
                temperature=0.3
            )
            
            if ai_response and ai_response.get('content'):
                try:
                    # Parse AI response as JSON
                    insights = json.loads(ai_response['content'])
                    
                    # Update business profile with insights
                    business_profile.ai_business_summary = insights.get('business_summary', '')
                    business_profile.ai_sales_recommendations = json.dumps(insights.get('sales_recommendations', []))
                    business_profile.ai_training_focus_areas = json.dumps(insights.get('training_focus_areas', []))
                    business_profile.document_analysis_complete = True
                    
                    db.session.commit()
                    
                    return {
                        'success': True,
                        'insights': insights
                    }
                    
                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing business insights JSON: {e}")
                    return {'error': 'Failed to parse AI insights'}
            else:
                return {'error': 'AI analysis failed'}
                
        except Exception as e:
            logger.error(f"Error generating business insights: {e}")
            return {'error': str(e)}
    
    @staticmethod
    def classify_document_type(filename: str, content: str) -> str:
        """
        Classify document type based on filename and content.
        
        Args:
            filename: Original filename
            content: Document content (first few hundred characters)
            
        Returns:
            Document type classification
        """
        filename_lower = filename.lower()
        content_lower = content.lower()[:500]
        
        # Check filename patterns
        if any(term in filename_lower for term in ['script', 'pitch', 'presentation']):
            return 'sales_script'
        elif any(term in filename_lower for term in ['process', 'workflow', 'procedure']):
            return 'process_doc'
        elif any(term in filename_lower for term in ['compliance', 'regulation', 'policy']):
            return 'compliance'
        elif any(term in filename_lower for term in ['price', 'pricing', 'cost']):
            return 'pricing'
        elif any(term in filename_lower for term in ['competitor', 'competitive', 'market']):
            return 'competitive_analysis'
        elif any(term in filename_lower for term in ['customer', 'persona', 'segment']):
            return 'customer_info'
        
        # Check content patterns
        if any(term in content_lower for term in ['hello', 'good morning', 'thank you for', 'pitch', 'presentation']):
            return 'sales_script'
        elif any(term in content_lower for term in ['step 1', 'process', 'workflow', 'procedure']):
            return 'process_doc'
        elif any(term in content_lower for term in ['compliance', 'regulation', 'must', 'required']):
            return 'compliance'
        elif any(term in content_lower for term in ['price', '$', 'cost', 'pricing']):
            return 'pricing'
        elif any(term in content_lower for term in ['competitor', 'vs', 'compared to']):
            return 'competitive_analysis'
        
        return 'general'


# Create service instance
business_analysis_service = BusinessAnalysisService() 