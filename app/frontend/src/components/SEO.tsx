import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  tags?: string[];
  url?: string;
  image?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  type = 'website',
  author,
  publishedTime,
  tags,
  url,
  image = 'https://pitchiq.com/og-image.png', // Default OG image
}) => {
  const fullTitle = `${title} | PitchIQ`;
  const siteUrl = url || `https://pitchiq.com${window.location.pathname}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="PitchIQ" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={siteUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Article specific tags */}
      {type === 'article' && author && (
        <>
          <meta property="article:author" content={author} />
          {publishedTime && (
            <meta property="article:published_time" content={publishedTime} />
          )}
          {tags && tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={siteUrl} />
    </Helmet>
  );
};

// Structured Data for Blog Posts
export const BlogPostStructuredData: React.FC<{
  title: string;
  description: string;
  author: string;
  publishedDate: string;
  url: string;
  image?: string;
}> = ({ title, description, author, publishedDate, url, image }) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "author": {
      "@type": "Person",
      "name": author
    },
    "datePublished": publishedDate,
    "url": url,
    "publisher": {
      "@type": "Organization",
      "name": "PitchIQ",
      "logo": {
        "@type": "ImageObject",
        "url": "https://pitchiq.com/logo.png"
      }
    },
    ...(image && {
      "image": {
        "@type": "ImageObject",
        "url": image
      }
    })
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};
