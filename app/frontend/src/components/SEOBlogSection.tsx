import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const blogPosts = [
  {
    title: "Why You Freeze When a Prospect Says 'No' (And How to Fix It)",
    excerpt: "That moment when your mind goes blank after an objection? You're not alone. Here's why it happens and what to say instead of panicking.",
    author: "Cason Lamothe",
    date: "June 15, 2025",
    readTime: "5 min read",
    category: "Objection Handling",
    slug: "why-you-freeze-when-prospect-says-no"
  },
  {
    title: "5 Objections That Kill Deals—And What to Say Instead",
    excerpt: "\"I need to think about it.\" \"It's too expensive.\" \"Send me some info.\" Learn the real responses that keep conversations alive.",
    author: "Cason Lamothe",
    date: "June 12, 2025",
    readTime: "6 min read",
    category: "Practical Tips",
    slug: "five-objections-that-kill-deals"
  },
  {
    title: "How to Practice Sales Calls When You're Flying Solo",
    excerpt: "No team, no manager, no problem. Here's how to get real practice and build confidence when you're on your own.",
    author: "Cason Lamothe",
    date: "June 8, 2025",
    readTime: "4 min read",
    category: "Solo Sellers",
    slug: "practice-sales-calls-flying-solo"
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
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Background Images */}
      {/* Desktop/Landscape Background */}
      <div 
        className="absolute inset-0 hidden md:block bg-cover bg-center bg-no-repeat opacity-35 z-0"
        style={{ backgroundImage: 'url(/BlogBackgroundlandscape.png)' }}
      ></div>
      
      {/* Mobile/Portrait Background */}
      <div 
        className="absolute inset-0 md:hidden bg-cover bg-center bg-no-repeat opacity-35 z-0"
        style={{ backgroundImage: 'url(/BlogBackgroundportrait.png)' }}
      ></div>

      {/* Gradient Fade at Bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-[1]"
      ></div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          className="text-center mb-12"
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 font-outfit text-gray-900">
            Real Talk About Selling
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Practical advice for solo sellers and small business owners. No corporate jargon, just what actually works.
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
                
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-pitchiq-red transition-colors duration-200">
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