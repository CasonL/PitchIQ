from flask import Blueprint, Response, request, jsonify
from datetime import datetime
import xml.etree.ElementTree as ET

seo_bp = Blueprint('seo', __name__)

@seo_bp.route('/sitemap.xml')
def sitemap():
    """Generate XML sitemap for SEO"""
    
    # Define all pages with their priorities and change frequencies
    pages = [
        {
            'url': '/',
            'priority': '1.0',
            'changefreq': 'weekly',
            'lastmod': datetime.now().strftime('%Y-%m-%d')
        },
        {
            'url': '/demo',
            'priority': '0.9',
            'changefreq': 'monthly',
            'lastmod': datetime.now().strftime('%Y-%m-%d')
        },
        {
            'url': '/how-it-works',
            'priority': '0.8',
            'changefreq': 'monthly',
            'lastmod': datetime.now().strftime('%Y-%m-%d')
        },
        {
            'url': '/login',
            'priority': '0.6',
            'changefreq': 'yearly',
            'lastmod': datetime.now().strftime('%Y-%m-%d')
        },
        {
            'url': '/signup',
            'priority': '0.7',
            'changefreq': 'yearly',
            'lastmod': datetime.now().strftime('%Y-%m-%d')
        }
    ]
    
    # Blog posts for SEO content
    blog_posts = [
        'ai-sales-training-techniques-boost-close-rates',
        'enterprise-sales-coaching-complete-guide-2024',
        'b2b-sales-training-vs-traditional-methods-roi',
        'sales-objection-handling-ai-training-guide',
        'enterprise-sales-enablement-best-practices-2024',
        'ai-sales-coaching-roi-case-studies'
    ]
    
    for post in blog_posts:
        pages.append({
            'url': f'/blog/{post}',
            'priority': '0.7',
            'changefreq': 'monthly',
            'lastmod': datetime.now().strftime('%Y-%m-%d')
        })
    
    # Create XML structure
    urlset = ET.Element('urlset')
    urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    
    base_url = request.host_url.rstrip('/')
    
    for page in pages:
        url_elem = ET.SubElement(urlset, 'url')
        
        loc = ET.SubElement(url_elem, 'loc')
        loc.text = f"{base_url}{page['url']}"
        
        lastmod = ET.SubElement(url_elem, 'lastmod')
        lastmod.text = page['lastmod']
        
        changefreq = ET.SubElement(url_elem, 'changefreq')
        changefreq.text = page['changefreq']
        
        priority = ET.SubElement(url_elem, 'priority')
        priority.text = page['priority']
    
    # Convert to string
    xml_str = ET.tostring(urlset, encoding='unicode', method='xml')
    xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'
    
    return Response(xml_declaration + xml_str, mimetype='application/xml')

@seo_bp.route('/robots.txt')
def robots():
    """Generate robots.txt for SEO"""
    
    robots_content = f"""User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /login
Disallow: /signup
Disallow: /reset-password/
Disallow: /verify-email/

# Sitemap
Sitemap: {request.host_url}sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1
"""
    
    return Response(robots_content, mimetype='text/plain')

@seo_bp.route('/api/seo/meta-tags')
def get_meta_tags():
    """API endpoint to get dynamic meta tags for different pages"""
    
    page = request.args.get('page', 'home')
    
    meta_tags = {
        'home': {
            'title': 'PitchIQ - AI Sales Training Platform | Practice with Realistic AI Buyers',
            'description': 'Transform your sales performance with PitchIQ\'s AI-powered training platform. Practice with hyper-realistic AI buyers, get instant feedback, and close more deals. Try our enterprise sales training solution today.',
            'keywords': 'AI sales training, sales practice platform, enterprise sales training, sales coaching software, AI buyers, sales performance, sales skills training, B2B sales training, sales simulation, sales enablement',
            'og_title': 'PitchIQ - AI Sales Training Platform | Practice with Realistic AI Buyers',
            'og_description': 'Transform your sales performance with PitchIQ\'s AI-powered training platform. Practice with hyper-realistic AI buyers, get instant feedback, and close more deals.',
        },
        'demo': {
            'title': 'PitchIQ Demo - Try AI Sales Training Free | Interactive Sales Practice',
            'description': 'Experience PitchIQ\'s AI sales training platform with our interactive demo. Practice with AI buyers, get real-time feedback, and see how enterprise sales teams improve performance.',
            'keywords': 'AI sales training demo, sales practice demo, enterprise sales training trial, AI buyer simulation, sales coaching demo, interactive sales training',
            'og_title': 'Try PitchIQ\'s AI Sales Training Demo - Free Interactive Experience',
            'og_description': 'Experience our AI sales training platform firsthand. Practice with realistic AI buyers and see immediate results.',
        },
        'how-it-works': {
            'title': 'How PitchIQ Works - AI Sales Training Process | Enterprise Sales Coaching',
            'description': 'Learn how PitchIQ\'s AI sales training platform works. Discover our proven process for enterprise sales coaching, AI buyer interactions, and performance improvement methodology.',
            'keywords': 'how AI sales training works, enterprise sales coaching process, AI buyer training methodology, sales performance improvement, AI sales coaching platform',
            'og_title': 'How PitchIQ\'s AI Sales Training Platform Works',
            'og_description': 'Discover our proven AI sales training methodology that helps enterprise teams improve performance and close more deals.',
        }
    }
    
    return jsonify(meta_tags.get(page, meta_tags['home']))

@seo_bp.route('/api/seo/schema')
def get_schema_markup():
    """Generate JSON-LD structured data for different page types"""
    
    page_type = request.args.get('type', 'organization')
    
    schemas = {
        'organization': {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "PitchIQ",
            "url": "https://pitchiq.com",
            "logo": "https://pitchiq.com/logo.png",
            "description": "AI-powered sales training platform that helps sales professionals practice with realistic AI buyers and improve their performance.",
            "foundingDate": "2024",
            "industry": "Sales Training Software",
            "sameAs": [
                "https://linkedin.com/company/pitchiq",
                "https://twitter.com/pitchiq"
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "Sales",
                "email": "sales@pitchiq.com"
            }
        },
        'software': {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "PitchIQ",
            "description": "AI-powered sales training platform for enterprise teams",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web Browser",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "priceValidUntil": "2025-12-31",
                "availability": "https://schema.org/InStock"
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "127"
            }
        },
        'faq': {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "What is AI sales training?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "AI sales training uses artificial intelligence to create realistic buyer scenarios, providing sales professionals with practice opportunities and instant feedback to improve their performance."
                    }
                },
                {
                    "@type": "Question",
                    "name": "How does PitchIQ improve sales performance?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "PitchIQ provides personalized AI buyers that adapt to your sales methodology, offering realistic practice scenarios with instant feedback and performance analytics."
                    }
                },
                {
                    "@type": "Question",
                    "name": "Is PitchIQ suitable for enterprise teams?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes, PitchIQ is designed for enterprise sales teams with features like compliance requirements, standardized training protocols, and comprehensive analytics."
                    }
                }
            ]
        }
    }
    
    return jsonify(schemas.get(page_type, schemas['organization'])) 