import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Eye,
  Crown,
  Shield,
  ArrowRight,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface BusinessProfile {
  id?: number;
  company_name: string;
  industry: string;
  company_size: string;
  target_market: string;
  sales_process: string;
  key_challenges: string;
  goals: string;
  current_tools: string;
  additional_info: string;
}

interface BusinessDocument {
  id: number;
  filename: string;
  file_type: string;
  upload_date: string;
  ai_analysis?: string;
}

interface BusinessInsight {
  id: number;
  insight_type: string;
  title: string;
  content: string;
  created_at: string;
}

const BusinessOnboardingPage: React.FC = () => {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile>({
    company_name: '',
    industry: '',
    company_size: '',
    target_market: '',
    sales_process: '',
    key_challenges: '',
    goals: '',
    current_tools: '',
    additional_info: ''
  });
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  useEffect(() => {
    loadBusinessProfile();
    loadDocuments();
    loadInsights();
  }, []);

  const loadBusinessProfile = async () => {
    try {
      const response = await fetch('/api/business-onboarding/profile', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/business-onboarding/documents', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(Array.isArray(data.documents) ? data.documents : []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await fetch('/api/business-onboarding/insights', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setInsights(Array.isArray(data.insights) ? data.insights : []);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      setInsights([]);
    }
  };

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/business-onboarding/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        toast({
          title: "Profile Saved",
          description: "Your business profile has been successfully saved.",
        });
        setActiveTab('documents');
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save business profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/business-onboarding/upload-document', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        toast({
          title: "Document Uploaded",
          description: "Your document has been uploaded and is being analyzed.",
        });
        loadDocuments();
        setUploadProgress(100);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setAnalysisProgress(0);

    try {
      const response = await fetch('/api/business-onboarding/analyze-profile', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Analysis Complete",
          description: "AI insights have been generated for your business.",
        });
        loadInsights();
        setActiveTab('insights');
        setAnalysisProgress(100);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setAnalysisProgress(0);
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/business-onboarding/complete-onboarding', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Onboarding Complete",
          description: "Welcome to PitchIQ Enterprise! Redirecting to dashboard...",
        });
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        throw new Error('Failed to complete onboarding');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/api/business-onboarding/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Document Deleted",
          description: "Document has been removed successfully.",
        });
        loadDocuments();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      toast({
        title: "Delete Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = () => {
    let completed = 0;
    const total = 3;

    if (profile.company_name && profile.industry) completed++;
    if (documents.length > 0) completed++;
    if (insights.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <h1 className="text-4xl font-bold text-black mr-3">
              Pitch<span className="text-red-600">IQ</span>
            </h1>
            <Crown className="h-8 w-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-semibold text-black mb-4">
            Enterprise Onboarding
          </h2>
          
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Set up your business profile and let our AI analyze your sales process
          </p>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>Business Profile</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>AI Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Business Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-red-600" />
                  <span>Business Information</span>
                </CardTitle>
                <CardDescription>
                  Tell us about your business to customize your PitchIQ experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Company Name *
                    </label>
                    <Input
                      value={profile.company_name}
                      onChange={(e) => setProfile({...profile, company_name: e.target.value})}
                      placeholder="Enter your company name"
                      className="border-gray-300 focus:border-red-600 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Industry *
                    </label>
                    <Input
                      value={profile.industry}
                      onChange={(e) => setProfile({...profile, industry: e.target.value})}
                      placeholder="e.g., SaaS, Healthcare, Finance"
                      className="border-gray-300 focus:border-red-600 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Company Size
                    </label>
                    <select
                      value={profile.company_size}
                      onChange={(e) => setProfile({...profile, company_size: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:border-red-600 focus:ring-red-600"
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-1000">201-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Target Market
                    </label>
                    <Input
                      value={profile.target_market}
                      onChange={(e) => setProfile({...profile, target_market: e.target.value})}
                      placeholder="Who are your customers?"
                      className="border-gray-300 focus:border-red-600 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Sales Process
                  </label>
                  <Textarea
                    value={profile.sales_process}
                    onChange={(e) => setProfile({...profile, sales_process: e.target.value})}
                    placeholder="Describe your current sales process..."
                    rows={3}
                    className="border-gray-300 focus:border-red-600 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Key Challenges
                  </label>
                  <Textarea
                    value={profile.key_challenges}
                    onChange={(e) => setProfile({...profile, key_challenges: e.target.value})}
                    placeholder="What are your biggest sales challenges?"
                    rows={3}
                    className="border-gray-300 focus:border-red-600 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Goals
                  </label>
                  <Textarea
                    value={profile.goals}
                    onChange={(e) => setProfile({...profile, goals: e.target.value})}
                    placeholder="What do you want to achieve with PitchIQ?"
                    rows={3}
                    className="border-gray-300 focus:border-red-600 focus:ring-red-600"
                  />
                </div>

                <Button 
                  onClick={handleProfileSave}
                  disabled={isLoading || !profile.company_name || !profile.industry}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save Profile
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-red-600" />
                  <span>Business Documents</span>
                </CardTitle>
                <CardDescription>
                  Upload documents for AI analysis (sales scripts, processes, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:border-gray-400 transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-black mb-2">Upload Documents</h3>
                  <p className="text-gray-600 mb-4">
                    Drag and drop files here, or click to select
                  </p>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.txt,.csv"
                  />
                  <label
                    htmlFor="file-upload"
                    className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 cursor-pointer inline-block transition-colors"
                  >
                    Select Files
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Supported: PDF, DOC, DOCX, TXT, CSV
                  </p>
                </div>

                {/* Document List */}
                {documents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-black">Uploaded Documents</h4>
                    {documents.map((doc) => (
                      <div key={doc.id || Math.random()} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-black">{doc.filename || 'Unknown file'}</p>
                            <p className="text-sm text-gray-600">
                              Uploaded {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {doc.ai_analysis && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Analyzed
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {documents.length > 0 && (
                  <Button 
                    onClick={() => setActiveTab('insights')}
                    className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Continue to AI Insights
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-red-600" />
                  <span>AI Business Analysis</span>
                </CardTitle>
                <CardDescription>
                  AI-powered insights based on your business profile and documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-black mb-2">Generate AI Insights</h3>
                    <p className="text-gray-600 mb-6">
                      Let our AI analyze your business profile and documents to provide personalized recommendations.
                    </p>
                    <Button 
                      onClick={handleGenerateInsights}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          Generate AI Insights
                          <Brain className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {insights.map((insight) => (
                      <div key={insight.id || Math.random()} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-red-100 rounded-lg">
                            <Brain className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-black mb-2">{insight.title || 'Untitled Insight'}</h4>
                            <p className="text-gray-700 leading-relaxed">{insight.content || 'No content available'}</p>
                            <p className="text-sm text-gray-500 mt-3">
                              Generated {insight.created_at ? new Date(insight.created_at).toLocaleDateString() : 'Unknown date'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="text-center pt-6">
                      <Button 
                        onClick={handleCompleteOnboarding}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white px-8 py-3"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          <>
                            Complete Setup
                            <CheckCircle className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Security Notice */}
        <div className="mt-12">
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Shield className="h-6 w-6 text-green-600" />
                  <Lock className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-black mb-3">Enterprise Security & Privacy Protection</h3>
                <div className="max-w-2xl mx-auto space-y-3 text-sm text-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-left">
                      <p><strong>• AES-128 encryption:</strong> Bank-level data protection</p>
                      <p><strong>• Zero access:</strong> Only you can view your information</p>
                    </div>
                    <div className="text-left">
                      <p><strong>• Private by design:</strong> Your data stays confidential</p>
                      <p><strong>• Secure by default:</strong> No technical setup required</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BusinessOnboardingPage; 