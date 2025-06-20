import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, User, Clock, Search, Filter, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import EmailSignupModal from '@/components/EmailSignupModal';

const blogPosts = [
  {
    title: "10 AI Sales Training Techniques That Boost Close Rates by 40%",
    excerpt: "Discover how enterprise sales teams are using AI-powered training to dramatically improve their performance and revenue outcomes. Learn the specific techniques that top-performing organizations implement.",
    author: "Cason Lamothe",
    date: "January 15, 2024",
    readTime: "8 min read",
    category: "Sales Training",
    tags: ["AI Training", "Close Rates", "Performance"],
    slug: "ai-sales-training-techniques-boost-close-rates",
    featured: true
  },
  {
    title: "Enterprise Sales Coaching: The Complete Guide for 2024",
    excerpt: "Everything you need to know about implementing scalable sales coaching programs that deliver measurable ROI for large organizations. From setup to execution.",
    author: "Cason Lamothe",
    date: "January 12, 2024",
    readTime: "12 min read",
    category: "Enterprise",
    tags: ["Enterprise", "Coaching", "ROI"],
    slug: "enterprise-sales-coaching-complete-guide-2024",
    featured: true
  },
  {
    title: "B2B Sales Training vs Traditional Methods: ROI Comparison",
    excerpt: "A comprehensive analysis of AI-powered sales training platforms versus traditional coaching methods, with real performance data from 500+ organizations.",
    author: "Cason Lamothe",
    date: "January 10, 2024",
    readTime: "6 min read",
    category: "Analysis",
    tags: ["B2B", "ROI", "Comparison"],
    slug: "b2b-sales-training-vs-traditional-methods-roi",
    featured: false
  },
  {
    title: "How to Scale Sales Training for Remote Teams",
    excerpt: "Master the art of training distributed sales teams with AI-powered coaching. Learn best practices for maintaining consistency and quality across locations.",
    author: "Cason Lamothe",
    date: "January 8, 2024",
    readTime: "10 min read",
    category: "Remote Work",
    tags: ["Remote", "Scaling", "Team Management"],
    slug: "scale-sales-training-remote-teams",
    featured: false
  },
  {
    title: "The Psychology of Sales Objections: AI-Powered Insights",
    excerpt: "Understanding buyer psychology through AI analysis. Discover how machine learning reveals patterns in objection handling that human coaches miss.",
    author: "Cason Lamothe",
    date: "January 5, 2024",
    readTime: "9 min read",
    category: "Psychology",
    tags: ["Psychology", "Objections", "AI Insights"],
    slug: "psychology-sales-objections-ai-insights",
    featured: false
  },
  {
    title: "Building a Sales Training ROI Dashboard: Essential Metrics",
    excerpt: "Track what matters most in sales training. Learn how to build comprehensive dashboards that prove training impact and guide strategic decisions.",
    author: "Cason Lamothe",
    date: "January 3, 2024",
    readTime: "7 min read",
    category: "Analytics",
    tags: ["ROI", "Metrics", "Dashboard"],
    slug: "sales-training-roi-dashboard-metrics",
    featured: false
  }
];

const categories = ["All", "Sales Training", "Enterprise", "Analysis", "Remote Work", "Psychology", "Analytics"];

const BlogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPosts = filteredPosts.filter(post => post.featured);
  const regularPosts = filteredPosts.filter(post => !post.featured);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
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
    <div className="min-h-screen bg-white">
      <Navbar onOpenEmailModal={() => setIsEmailModalOpen(true)} />
      
      {/* Header */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-white" style={{ paddingTop: '120px' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 font-outfit text-gray-900">
              Sales Training <span className="text-pitchiq-red">Insights</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Expert insights, proven strategies, and actionable advice to transform your sales training programs and drive measurable results.
            </p>
            
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-3 text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-pitchiq-red"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold mb-8 font-outfit text-gray-900 flex items-center">
                <span className="bg-pitchiq-red text-white px-3 py-1 rounded-lg text-lg mr-3">Featured</span>
                Must-Read Articles
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {featuredPosts.map((post, index) => (
                  <motion.article 
                    key={post.slug}
                    className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary" className="bg-pitchiq-red/10 text-pitchiq-red hover:bg-pitchiq-red hover:text-white">
                          {post.category}
                        </Badge>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Clock className="h-4 w-4 mr-1" />
                          {post.readTime}
                        </div>
                      </div>
                      
                      <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 group-hover:text-pitchiq-red transition-colors duration-200">
                        <a href={`/blog/${post.slug}`} className="line-clamp-2">
                          {post.title}
                        </a>
                      </h3>
                      
                      <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {post.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-600">{post.author}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {post.date}
                        </div>
                      </div>
                    </div>
                    
                    <div className="px-8 pb-8">
                      <Button 
                        className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90 text-white group-hover:shadow-lg transition-all duration-200"
                        asChild
                      >
                        <a href={`/blog/${post.slug}`}>
                          Read Full Article <ArrowRight className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 font-outfit text-gray-900">
              All Articles ({filteredPosts.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularPosts.map((post, index) => (
                <motion.article 
                  key={post.slug}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
                  variants={itemVariants}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-pitchiq-red border-pitchiq-red">
                        {post.category}
                      </Badge>
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="h-4 w-4 mr-1" />
                        {post.readTime}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-pitchiq-red transition-colors duration-200">
                      <a href={`/blog/${post.slug}`} className="line-clamp-2">
                        {post.title}
                      </a>
                    </h3>
                    
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {post.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 2 && (
                        <span className="text-xs text-gray-400">+{post.tags.length - 2} more</span>
                      )}
                    </div>
                    
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
            </div>
            
            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No articles found matching your criteria.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("All");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </motion.div>
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
              Ready to Transform Your Sales Training?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Get started with PitchIQ's AI-powered sales training platform and see results in weeks, not months.
            </p>
            <Button 
              size="lg"
              className="bg-white text-pitchiq-red hover:bg-gray-100 font-semibold"
              asChild
            >
              <a href="/">
                Start Free Trial <ArrowRight className="h-5 w-5 ml-2" />
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
      
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
      />
    </div>
  );
};

export default BlogPage; 