import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const blogPosts = [
  {
    title: "10 AI Sales Training Techniques That Boost Close Rates by 40%",
    excerpt: "Discover how enterprise sales teams are using AI-powered training to dramatically improve their performance and revenue outcomes.",
    author: "Sarah Chen",
    date: "January 15, 2024",
    readTime: "8 min read",
    category: "Sales Training",
    slug: "ai-sales-training-techniques-boost-close-rates"
  },
  {
    title: "Enterprise Sales Coaching: The Complete Guide for 2024",
    excerpt: "Everything you need to know about implementing scalable sales coaching programs that deliver measurable ROI for large organizations.",
    author: "Mike Rodriguez",
    date: "January 12, 2024",
    readTime: "12 min read",
    category: "Enterprise",
    slug: "enterprise-sales-coaching-complete-guide-2024"
  },
  {
    title: "B2B Sales Training vs Traditional Methods: ROI Comparison",
    excerpt: "A comprehensive analysis of AI-powered sales training platforms versus traditional coaching methods, with real performance data.",
    author: "Emma Thompson",
    date: "January 10, 2024",
    readTime: "6 min read",
    category: "Analysis",
    slug: "b2b-sales-training-vs-traditional-methods-roi"
  }
];

const SEOBlogSection: React.FC = () => {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 font-outfit text-gray-900">
            Sales Training Insights & Best Practices
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Expert insights on AI sales training, enterprise coaching strategies, and proven techniques to maximize your team's performance.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {blogPosts.map((post, index) => (
            <motion.article 
              key={post.slug}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group"
              variants={itemVariants}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-3 py-1 text-xs font-semibold text-pitchiq-red bg-red-50 rounded-full">
                    {post.category}
                  </span>
                  <div className="flex items-center text-gray-500 text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {post.readTime}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-pitchiq-red transition-colors duration-200">
                  <a href={`/blog/${post.slug}`} className="line-clamp-2">
                    {post.title}
                  </a>
                </h3>
                
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">{post.author}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {post.date}
                  </div>
                </div>
              </div>
              
              <div className="px-6 pb-6">
                <Button 
                  variant="outline" 
                  className="w-full group-hover:bg-pitchiq-red group-hover:text-white group-hover:border-pitchiq-red transition-colors duration-200"
                  asChild
                >
                  <a href={`/blog/${post.slug}`}>
                    Read More <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </motion.article>
          ))}
        </motion.div>

        <motion.div 
          className="text-center mt-12"
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <Button 
            variant="default"
            size="lg"
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white"
            asChild
          >
            <a href="/blog">
              View All Articles <ArrowRight className="h-5 w-5 ml-2" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default SEOBlogSection; 