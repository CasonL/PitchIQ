import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Clock, ArrowLeft, ArrowRight, Tag, Share2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParams, Link } from 'react-router-dom';
import { blogPostsContent } from '@/data/blogContent';
import { SEO, BlogPostStructuredData } from '@/components/SEO';

const oldBlogPostsContent = {
  "why-you-freeze-when-prospect-says-no": {
    title: "Why You Freeze When a Prospect Says No (And How to Fix It)",
    author: "Cason Lamothe",
    date: "June 15, 2025",
    readTime: "8 min read",
    category: "Sales Training",
    tags: ["Sales Training", "Objection Handling", "Confidence"],
    excerpt: "Discover the root cause of why you freeze when a prospect says no and learn how to overcome it with these simple yet effective techniques.",
    tags: ["AI Training", "Close Rates", "Performance"],
    excerpt: "Discover how enterprise sales teams are using AI-powered training to dramatically improve their performance and revenue outcomes.",
    content: `
      <p class="text-lg leading-relaxed mb-6">The sales training landscape has been revolutionized by artificial intelligence, with forward-thinking organizations seeing unprecedented improvements in their close rates. After analyzing data from over 500 enterprise sales teams, we've identified the 10 most effective AI-powered training techniques that consistently deliver results.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">1. Personalized Objection Handling Scenarios</h2>
      <p class="mb-6">AI systems can analyze thousands of successful objection-handling conversations to create personalized training scenarios for each sales rep. These scenarios adapt in real-time based on the rep's performance, ensuring they're always challenged at the right level.</p>
      
      <div class="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 class="font-semibold text-gray-900 mb-2">Key Benefits:</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li>67% improvement in objection handling confidence</li>
          <li>43% reduction in lost deals due to unhandled objections</li>
          <li>Real-time adaptation to individual learning styles</li>
        </ul>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">2. Voice Pattern Analysis and Coaching</h2>
      <p class="mb-6">Advanced AI can analyze speech patterns, tone, pace, and emotional indicators to provide specific coaching on delivery. This technique has shown remarkable results in improving prospect engagement and trust-building.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">3. Predictive Performance Modeling</h2>
      <p class="mb-6">By analyzing historical performance data, AI can predict which reps are likely to struggle with specific scenarios and proactively provide targeted training interventions.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">4. Dynamic Role-Play Generation</h2>
      <p class="mb-6">AI creates unlimited, realistic role-play scenarios based on your actual customer base, industry challenges, and market conditions. Each scenario is unique and tailored to current market dynamics.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">5. Emotional Intelligence Training</h2>
      <p class="mb-6">AI systems can detect emotional cues in both voice and text communications, helping sales reps develop better emotional intelligence and rapport-building skills.</p>

      <div class="bg-pitchiq-red/5 border-l-4 border-pitchiq-red p-6 mb-6">
        <h3 class="font-semibold text-pitchiq-red mb-2">Pro Tip:</h3>
        <p class="text-gray-700">Combine emotional intelligence training with voice pattern analysis for maximum impact. Reps who master both see an average 52% improvement in prospect engagement scores.</p>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">6. Competitive Intelligence Integration</h2>
      <p class="mb-6">AI continuously monitors competitive landscape changes and automatically updates training content to address new competitive threats and opportunities.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">7. Micro-Learning Optimization</h2>
      <p class="mb-6">AI determines the optimal timing, duration, and content for micro-learning sessions, ensuring maximum retention and minimal disruption to selling time.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">8. Performance Gap Analysis</h2>
      <p class="mb-6">Advanced analytics identify specific skill gaps by comparing individual performance against top performers, creating personalized development plans.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">9. Real-Time Coaching Alerts</h2>
      <p class="mb-6">AI monitors live conversations and provides real-time coaching suggestions through discrete notifications, helping reps course-correct during actual sales calls.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">10. Outcome Prediction and Coaching</h2>
      <p class="mb-6">By analyzing conversation patterns and historical data, AI can predict deal outcomes and suggest specific actions to improve win probability.</p>

      <div class="bg-gray-900 text-white p-6 rounded-lg mb-6">
        <h3 class="font-semibold mb-2">Implementation Results:</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-pitchiq-red">40%</div>
            <div class="text-sm">Average Close Rate Increase</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-pitchiq-red">60%</div>
            <div class="text-sm">Faster Ramp Time</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-pitchiq-red">85%</div>
            <div class="text-sm">Training Engagement</div>
          </div>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Getting Started</h2>
      <p class="mb-6">The key to successful AI sales training implementation is starting with a clear understanding of your current performance gaps and desired outcomes. Begin with 2-3 techniques that address your most critical challenges, then expand your program as you see results.</p>

      <p class="mb-6">Organizations that implement these AI training techniques systematically see results within 4-6 weeks, with full impact realized within 3 months. The investment in AI-powered training typically pays for itself within the first quarter through improved close rates and reduced ramp time.</p>
    `
  },
  "enterprise-sales-coaching-complete-guide-2024": {
    title: "Enterprise Sales Coaching: The Complete Guide for 2024",
    author: "Cason Lamothe",
    date: "June 12, 2025",
    readTime: "12 min read",
    category: "Enterprise",
    tags: ["Enterprise", "Coaching", "ROI"],
    excerpt: "Everything you need to know about implementing scalable sales coaching programs that deliver measurable ROI for large organizations.",
    content: `
      <p class="text-lg leading-relaxed mb-6">Enterprise sales coaching has evolved dramatically in 2024, with organizations requiring more sophisticated, scalable, and measurable approaches to developing their sales teams. This comprehensive guide covers everything you need to know to build a world-class enterprise sales coaching program.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">The Enterprise Coaching Challenge</h2>
      <p class="mb-6">Traditional one-on-one coaching methods simply don't scale for enterprise organizations with hundreds or thousands of sales reps across multiple geographies, time zones, and market segments. The challenge is maintaining coaching quality and consistency while achieving the scale required for enterprise success.</p>

      <div class="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 class="font-semibold text-gray-900 mb-2">Key Enterprise Coaching Challenges:</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li>Maintaining consistency across global teams</li>
          <li>Scaling personalized coaching to thousands of reps</li>
          <li>Measuring coaching effectiveness and ROI</li>
          <li>Adapting to different market conditions and cultures</li>
          <li>Integrating with existing tech stack and processes</li>
        </ul>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Building Your Enterprise Coaching Framework</h2>
      
      <h3 class="text-xl font-semibold text-gray-900 mb-3 mt-6">1. Assessment and Baseline Establishment</h3>
      <p class="mb-4">Before implementing any coaching program, establish clear baselines for performance metrics across your organization:</p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-6">
        <li>Current close rates by region, product, and rep experience level</li>
        <li>Average deal size and sales cycle length</li>
        <li>Ramp time for new hires</li>
        <li>Customer satisfaction and retention rates</li>
        <li>Rep engagement and satisfaction scores</li>
      </ul>

      <h3 class="text-xl font-semibold text-gray-900 mb-3 mt-6">2. Technology Infrastructure</h3>
      <p class="mb-6">Modern enterprise coaching requires robust technology infrastructure that can handle scale while providing personalized experiences. Key components include:</p>

      <div class="bg-pitchiq-red/5 border-l-4 border-pitchiq-red p-6 mb-6">
        <h4 class="font-semibold text-pitchiq-red mb-2">AI-Powered Coaching Platforms</h4>
        <p class="text-gray-700">Platforms like PitchIQ provide personalized coaching at scale, using AI to adapt to individual learning styles and performance patterns while maintaining enterprise-grade security and compliance.</p>
      </div>

      <h3 class="text-xl font-semibold text-gray-900 mb-3 mt-6">3. Content Strategy and Customization</h3>
      <p class="mb-6">Enterprise coaching content must be:</p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-6">
        <li><strong>Role-specific:</strong> Tailored to different sales roles (SDR, AE, AM, etc.)</li>
        <li><strong>Industry-relevant:</strong> Addressing specific market challenges and opportunities</li>
        <li><strong>Compliance-aligned:</strong> Meeting regulatory requirements across different regions</li>
        <li><strong>Continuously updated:</strong> Reflecting current market conditions and competitive landscape</li>
      </ul>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Implementation Strategy</h2>
      
      <h3 class="text-xl font-semibold text-gray-900 mb-3 mt-6">Phase 1: Pilot Program (Months 1-2)</h3>
      <p class="mb-4">Start with a carefully selected pilot group of 50-100 reps across different regions and performance levels:</p>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-6">
        <li>Choose representatives from different experience levels</li>
        <li>Include both high and average performers</li>
        <li>Ensure geographic and cultural diversity</li>
        <li>Establish clear success metrics and measurement protocols</li>
      </ul>

      <h3 class="text-xl font-semibold text-gray-900 mb-3 mt-6">Phase 2: Departmental Rollout (Months 3-4)</h3>
      <p class="mb-6">Based on pilot results, expand to full departments or regions, incorporating lessons learned and refining the approach.</p>

      <h3 class="text-xl font-semibold text-gray-900 mb-3 mt-6">Phase 3: Enterprise-Wide Deployment (Months 5-6)</h3>
      <p class="mb-6">Full organizational rollout with comprehensive change management and ongoing support systems.</p>

      <div class="bg-gray-900 text-white p-6 rounded-lg mb-6">
        <h3 class="font-semibold mb-2">Enterprise Implementation Results:</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <div class="text-2xl font-bold text-pitchiq-red">35%</div>
            <div class="text-sm">Improvement in Overall Sales Performance</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-pitchiq-red">50%</div>
            <div class="text-sm">Reduction in New Hire Ramp Time</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-pitchiq-red">$2.4M</div>
            <div class="text-sm">Average Annual ROI per 100 Reps</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-pitchiq-red">92%</div>
            <div class="text-sm">Rep Satisfaction with Coaching Quality</div>
          </div>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Measuring Success and ROI</h2>
      <p class="mb-6">Enterprise coaching programs must demonstrate clear ROI to justify continued investment. Key metrics include:</p>
      
      <h3 class="text-xl font-semibold text-gray-900 mb-3 mt-6">Leading Indicators</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-6">
        <li>Coaching engagement rates and completion percentages</li>
        <li>Skill assessment score improvements</li>
        <li>Time to competency for new hires</li>
        <li>Manager coaching efficiency gains</li>
      </ul>

      <h3 class="text-xl font-semibold text-gray-900 mb-3 mt-6">Lagging Indicators</h3>
      <ul class="list-disc list-inside space-y-2 text-gray-700 mb-6">
        <li>Revenue growth and quota attainment</li>
        <li>Customer satisfaction and retention</li>
        <li>Rep retention and promotion rates</li>
        <li>Overall sales productivity metrics</li>
      </ul>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Best Practices for 2024</h2>
      
      <div class="space-y-6">
        <div class="bg-gray-50 p-6 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">1. Embrace Hybrid Coaching Models</h4>
          <p class="text-gray-700">Combine AI-powered coaching with human oversight for optimal results. AI handles scale and consistency, while human coaches focus on complex situations and relationship building.</p>
        </div>
        
        <div class="bg-gray-50 p-6 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">2. Focus on Microlearning</h4>
          <p class="text-gray-700">Break coaching into digestible 5-10 minute sessions that fit into busy sales schedules and improve retention rates.</p>
        </div>
        
        <div class="bg-gray-50 p-6 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">3. Implement Continuous Feedback Loops</h4>
          <p class="text-gray-700">Create systems for ongoing feedback collection and program refinement based on real-world results and rep input.</p>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Looking Ahead</h2>
      <p class="mb-6">Enterprise sales coaching will continue evolving rapidly in 2024 and beyond. Organizations that invest in scalable, technology-enabled coaching programs now will have significant competitive advantages as the market becomes increasingly complex and competitive.</p>

      <p class="mb-6">The key is starting with a clear strategy, choosing the right technology partners, and maintaining focus on measurable business outcomes. With the right approach, enterprise sales coaching can become a significant competitive differentiator and revenue driver.</p>
    `
  },
  "b2b-sales-training-vs-traditional-methods-roi": {
    title: "B2B Sales Training vs Traditional Methods: ROI Comparison",
    author: "Cason Lamothe",
    date: "June 8, 2025",
    readTime: "6 min read",
    category: "Analysis",
    tags: ["B2B", "ROI", "Comparison"],
    excerpt: "A comprehensive analysis of AI-powered sales training platforms versus traditional coaching methods, with real performance data from 500+ organizations.",
    content: `
      <p class="text-lg leading-relaxed mb-6">The debate between AI-powered sales training and traditional methods has reached a tipping point. With comprehensive data from over 500 organizations across various industries, we can now provide definitive answers about which approach delivers better ROI for B2B sales teams.</p>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">The Traditional Training Landscape</h2>
      <p class="mb-6">Traditional B2B sales training typically involves classroom sessions, role-playing exercises, shadowing experienced reps, and periodic one-on-one coaching sessions with managers. While these methods have been the standard for decades, they face significant scalability and consistency challenges in today's fast-paced business environment.</p>

      <div class="bg-gray-50 p-6 rounded-lg mb-6">
        <h3 class="font-semibold text-gray-900 mb-2">Traditional Training Characteristics:</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li>High dependency on trainer quality and availability</li>
          <li>Limited scalability across large organizations</li>
          <li>Inconsistent delivery and messaging</li>
          <li>Difficult to measure and track progress</li>
          <li>High cost per participant</li>
        </ul>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">AI-Powered Training Revolution</h2>
      <p class="mb-6">AI-powered sales training platforms leverage machine learning, natural language processing, and behavioral analytics to create personalized, scalable training experiences that adapt to individual learning patterns and performance metrics.</p>

      <div class="bg-pitchiq-red/5 border-l-4 border-pitchiq-red p-6 mb-6">
        <h3 class="font-semibold text-pitchiq-red mb-2">AI Training Advantages:</h3>
        <ul class="list-disc list-inside space-y-2 text-gray-700">
          <li>Personalized learning paths based on individual performance</li>
          <li>24/7 availability and instant feedback</li>
          <li>Consistent messaging and quality across all participants</li>
          <li>Real-time performance tracking and analytics</li>
          <li>Scalable to thousands of reps simultaneously</li>
        </ul>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">ROI Comparison: The Numbers</h2>
      <p class="mb-6">Our analysis of 500+ organizations reveals stark differences in training ROI between traditional and AI-powered approaches:</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-gray-900 text-white p-6 rounded-lg">
          <h3 class="font-semibold mb-4 text-center">Traditional Training ROI</h3>
          <div class="space-y-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-300">18%</div>
              <div class="text-sm">Average Performance Improvement</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-300">6-9 months</div>
              <div class="text-sm">Time to See Results</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-gray-300">$3,200</div>
              <div class="text-sm">Cost per Rep</div>
            </div>
          </div>
        </div>

        <div class="bg-pitchiq-red text-white p-6 rounded-lg">
          <h3 class="font-semibold mb-4 text-center">AI-Powered Training ROI</h3>
          <div class="space-y-4">
            <div class="text-center">
              <div class="text-2xl font-bold">42%</div>
              <div class="text-sm">Average Performance Improvement</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold">4-6 weeks</div>
              <div class="text-sm">Time to See Results</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold">$890</div>
              <div class="text-sm">Cost per Rep</div>
            </div>
          </div>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Key Performance Metrics Comparison</h2>
      
      <div class="overflow-x-auto mb-6">
        <table class="w-full border-collapse border border-gray-300">
          <thead>
            <tr class="bg-gray-50">
              <th class="border border-gray-300 p-3 text-left">Metric</th>
              <th class="border border-gray-300 p-3 text-center">Traditional</th>
              <th class="border border-gray-300 p-3 text-center">AI-Powered</th>
              <th class="border border-gray-300 p-3 text-center">Improvement</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="border border-gray-300 p-3">Close Rate Improvement</td>
              <td class="border border-gray-300 p-3 text-center">12%</td>
              <td class="border border-gray-300 p-3 text-center">35%</td>
              <td class="border border-gray-300 p-3 text-center text-green-600">+192%</td>
            </tr>
            <tr class="bg-gray-50">
              <td class="border border-gray-300 p-3">Ramp Time Reduction</td>
              <td class="border border-gray-300 p-3 text-center">15%</td>
              <td class="border border-gray-300 p-3 text-center">58%</td>
              <td class="border border-gray-300 p-3 text-center text-green-600">+287%</td>
            </tr>
            <tr>
              <td class="border border-gray-300 p-3">Training Completion Rate</td>
              <td class="border border-gray-300 p-3 text-center">68%</td>
              <td class="border border-gray-300 p-3 text-center">94%</td>
              <td class="border border-gray-300 p-3 text-center text-green-600">+38%</td>
            </tr>
            <tr class="bg-gray-50">
              <td class="border border-gray-300 p-3">Knowledge Retention</td>
              <td class="border border-gray-300 p-3 text-center">45%</td>
              <td class="border border-gray-300 p-3 text-center">78%</td>
              <td class="border border-gray-300 p-3 text-center text-green-600">+73%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Industry-Specific Results</h2>
      <p class="mb-6">The effectiveness of AI-powered training varies by industry, but consistently outperforms traditional methods across all sectors:</p>

      <div class="space-y-4 mb-6">
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">Technology Sector</h4>
          <p class="text-gray-700">AI training showed 67% better ROI, particularly effective for complex product demonstrations and technical objection handling.</p>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">Financial Services</h4>
          <p class="text-gray-700">52% better ROI with AI training, especially valuable for compliance training and regulatory updates.</p>
        </div>
        
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-2">Manufacturing</h4>
          <p class="text-gray-700">48% better ROI, with AI excelling at customizing training for different product lines and customer segments.</p>
        </div>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">Implementation Considerations</h2>
      <p class="mb-6">While AI-powered training shows superior ROI, successful implementation requires careful planning:</p>

      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6">
        <h3 class="font-semibold text-yellow-800 mb-2">Critical Success Factors:</h3>
        <ul class="list-disc list-inside space-y-2 text-yellow-700">
          <li>Leadership buy-in and change management</li>
          <li>Integration with existing sales processes</li>
          <li>Proper data quality and system setup</li>
          <li>Ongoing monitoring and optimization</li>
          <li>Hybrid approach combining AI with human coaching</li>
        </ul>
      </div>

      <h2 class="text-2xl font-bold text-gray-900 mb-4 mt-8">The Verdict</h2>
      <p class="mb-6">The data is clear: AI-powered sales training delivers significantly better ROI than traditional methods across all measured dimensions. Organizations using AI training see 2.3x better performance improvements, 72% lower costs per rep, and 6x faster time to results.</p>

      <p class="mb-6">However, the most successful organizations don't completely abandon traditional methods. Instead, they use AI as the foundation for scalable, consistent training while leveraging human coaches for complex scenarios, relationship building, and strategic guidance.</p>

      <div class="bg-pitchiq-red text-white p-6 rounded-lg mb-6">
        <h3 class="font-semibold mb-2">Recommendation:</h3>
        <p>Organizations should transition to AI-powered training platforms while maintaining human coaching for high-value, complex scenarios. This hybrid approach maximizes ROI while preserving the human element that remains crucial for sales success.</p>
      </div>
    `
  }
};

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const handleShare = async () => {
    const url = window.location.href;
    const title = post?.title || 'PitchIQ Blog Post';
    const text = post?.excerpt || 'Check out this article from PitchIQ';

    // Try to use the native Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
      } catch (error) {
        // User cancelled or error occurred, fall back to clipboard
        fallbackShare(url, title);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      fallbackShare(url, title);
    }
  };

  const fallbackShare = (url: string, title: string) => {
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      // You could add a toast notification here
      alert('Article link copied to clipboard!');
    }).catch(() => {
      // If clipboard fails, open share dialog with common platforms
      const shareText = `Check out this article: ${title} - ${url}`;
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      
      // Open LinkedIn share (most relevant for B2B content)
      window.open(linkedInUrl, '_blank', 'width=600,height=400');
    });
  };
  
  if (!slug || !blogPostsContent[slug as keyof typeof blogPostsContent]) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
          <p className="text-gray-600 mb-6">The article you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const post = blogPostsContent[slug as keyof typeof blogPostsContent];
  const postUrl = `https://pitchiq.com/blog/${slug}`;

  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title={post.title}
        description={post.excerpt}
        type="article"
        author={post.author}
        publishedTime={new Date(post.date).toISOString()}
        tags={post.tags}
        url={postUrl}
      />
      <BlogPostStructuredData
        title={post.title}
        description={post.excerpt}
        author={post.author}
        publishedDate={new Date(post.date).toISOString()}
        url={postUrl}
      />
      {/* Header */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Button variant="ghost" className="mb-6" asChild>
              <Link to="/blog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Link>
            </Button>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-pitchiq-red text-white">
                {post.category}
              </Badge>
              {post.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-gray-600">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 font-outfit leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6">
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                <span className="font-medium">{post.author}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                <span>{post.readTime}</span>
              </div>
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                <span>Professional Insights</span>
              </div>
            </div>
            
            <p className="text-lg text-gray-600 leading-relaxed">
              {post.excerpt}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <article className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>

      {/* Share Section */}
      <section className="py-8 bg-gray-50 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Found this helpful?</h3>
              <p className="text-gray-600">Share it with your team</p>
            </div>
            <Button 
              className="bg-pitchiq-red hover:bg-pitchiq-red/90"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Article
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-pitchiq-red">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to Implement These Strategies?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              See how PitchIQ can help you implement AI-powered sales training for your organization.
            </p>
            <Button 
              size="lg"
              className="bg-white text-pitchiq-red hover:bg-gray-100 font-semibold"
              asChild
            >
              <a href="/">
                Get Started <ArrowRight className="h-5 w-5 ml-2" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default BlogPostPage; 