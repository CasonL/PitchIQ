import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Mail, Send, CheckCircle, AlertCircle } from "lucide-react";

// API_BASE_URL is no longer needed for Netlify Forms submission for this component
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; 

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasEarlyAccess?: boolean; // User already signed up for early access
  hasUpdates?: boolean; // User already signed up for updates
}

const FORM_NAME = "contact"; // Define your form name for Netlify

const ContactModal = ({ isOpen, onClose, hasEarlyAccess = false, hasUpdates = false }: ContactModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    earlyAccess: hasEarlyAccess, // Pre-fill if already selected
    getUpdates: hasUpdates // Pre-fill if already selected
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Update form data when props change
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      earlyAccess: hasEarlyAccess,
      getUpdates: hasUpdates
    }));
  }, [hasEarlyAccess, hasUpdates]);

  // Check if we should show the email signup section
  const showEmailSignup = !hasEarlyAccess || !hasUpdates;

  const encode = (data: {[key: string]: any}) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
      .join("&");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/", { // POST to your site's path (e.g., root)
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: encode({ "form-name": FORM_NAME, ...formData }), // Netlify needs form-name
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          setIsSubmitted(false);
          setFormData({
            name: "",
            email: "",
            subject: "",
            message: "",
            earlyAccess: hasEarlyAccess, 
            getUpdates: hasUpdates 
          });
          onClose();
        }, 3000);
      } else {
        const errorData = await response.text(); // Get more info on error
        console.error("Netlify Forms submission error response:", errorData);
        setError('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error("Network error submitting to Netlify Forms:", error);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 lg:p-8 border-b border-gray-100">
          <div>
            <h2 className="text-2xl lg:text-3xl font-semibold text-gray-900">Get in Touch</h2>
            <p className="text-base lg:text-lg text-gray-600 mt-2">Send us a message or join the waitlist</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isSubmitted ? (
            <div className="text-center py-12 lg:py-16">
              <CheckCircle className="h-20 w-20 lg:h-24 lg:w-24 text-green-600 mx-auto mb-6" />
              <h3 className="text-xl lg:text-2xl font-semibold text-gray-900 mb-3">Message Sent!</h3>
              <p className="text-gray-600 text-lg lg:text-xl">Thanks for reaching out. We'll get back to you soon!</p>
            </div>
          ) : (
            <form 
              name={FORM_NAME} 
              method="POST" 
              data-netlify="true" 
              data-netlify-honeypot="bot-field" // Optional: for basic spam protection
              action="/thank-you.html"
              onSubmit={handleSubmit} 
              className="space-y-6 lg:space-y-8"
            >
              {/* Hidden field for Netlify spam protection (optional) */}
              <input type="hidden" name="bot-field" />
              {/* Hidden field for Netlify to identify the form */}
              <input type="hidden" name="form-name" value={FORM_NAME} />

              {/* Desktop Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
                
                {/* Left Column - Contact Form Fields */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <Input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Your name"
                        required
                        className="text-base lg:text-lg py-3 lg:py-4"
                      />
                    </div>
                    <div>
                      <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        required
                        className="text-base lg:text-lg py-3 lg:py-4"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <Input
                      type="text"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="What's this about?"
                      className="text-base lg:text-lg py-3 lg:py-4"
                    />
                  </div>

                  <div>
                    <label className="block text-base lg:text-lg font-medium text-gray-700 mb-2">
                      Message *
                    </label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Your message..."
                      rows={5}
                      className="text-base lg:text-lg min-h-[120px] lg:min-h-[160px]"
                      required
                    />
                  </div>
                </div>

                {/* Right Column - Email Signup Options & Submit */}
                <div className="space-y-6 lg:space-y-8">
                  {/* Email Signup Options */}
                  {showEmailSignup && (
                    <div className="bg-gray-50 rounded-xl p-6 lg:p-8">
                      <h4 className="text-lg lg:text-xl font-semibold text-gray-800 mb-4 lg:mb-6">While you're here...</h4>
                      <div className="space-y-4 lg:space-y-6">
                        {!hasEarlyAccess && (
                          <label className="flex items-start gap-3 lg:gap-4 cursor-pointer group">
                            <input
                              type="checkbox"
                              name="earlyAccess"
                              checked={formData.earlyAccess}
                              onChange={handleInputChange}
                              className="w-5 h-5 lg:w-6 lg:h-6 mt-0.5 text-pitchiq-red bg-gray-100 border-gray-300 rounded focus:ring-pitchiq-red focus:ring-2"
                            />
                            <div>
                              <span className="text-base lg:text-lg text-gray-700 font-medium group-hover:text-pitchiq-red transition-colors">
                                Get Early Access to PitchIQ
                              </span>
                              <p className="text-sm lg:text-base text-gray-500 mt-1">
                                Be among the first to try our AI-powered sales training platform
                              </p>
                            </div>
                          </label>
                        )}

                        {!hasUpdates && (
                          <label className="flex items-start gap-3 lg:gap-4 cursor-pointer group">
                            <input
                              type="checkbox"
                              name="getUpdates"
                              checked={formData.getUpdates}
                              onChange={handleInputChange}
                              className="w-5 h-5 lg:w-6 lg:h-6 mt-0.5 text-pitchiq-red bg-gray-100 border-gray-300 rounded focus:ring-pitchiq-red focus:ring-2"
                            />
                            <div>
                              <span className="text-base lg:text-lg text-gray-700 font-medium group-hover:text-pitchiq-red transition-colors">
                                Get Updates on our progress
                              </span>
                              <p className="text-sm lg:text-base text-gray-500 mt-1">
                                Stay informed about new features and launch updates
                              </p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Already Signed Up Confirmation */}
                  {(hasEarlyAccess || hasUpdates) && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 lg:p-8">
                      <h4 className="text-lg lg:text-xl font-semibold text-green-800 mb-4">Thanks for signing up!</h4>
                      <div className="space-y-2">
                        {hasEarlyAccess && (
                          <p className="text-base lg:text-lg text-green-700 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6" />
                            You're on the Early Access list
                          </p>
                        )}
                        {hasUpdates && (
                          <p className="text-base lg:text-lg text-green-700 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6" />
                            You'll receive progress updates
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-base lg:text-lg bg-red-50 p-4 rounded-lg">
                      <AlertCircle className="h-5 w-5 lg:h-6 lg:w-6 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90 flex items-center justify-center gap-2 lg:gap-3 text-base lg:text-lg py-4 lg:py-6 font-semibold"
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="h-5 w-5 lg:h-6 lg:w-6" />
                        Send Message
                      </>
                    )}
                  </Button>

                  {/* Footer Note */}
                  <div className="text-center">
                    <p className="text-sm lg:text-base text-gray-500">
                      <Mail className="h-4 w-4 lg:h-5 lg:w-5 inline mr-1" />
                      No spam, ever | Unsubscribe anytime
                    </p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactModal; 