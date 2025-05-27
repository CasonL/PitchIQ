import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, X, Eye, EyeOff, Download, Users, Mail, Clock } from "lucide-react";
import ContactModal from "./ContactModal";

const Footer = () => {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch('/api/admin/email-signups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: adminPassword }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setAdminPassword("");
        await loadAdminData();
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const response = await fetch('/api/admin/email-signups');
      if (response.ok) {
        const data = await response.json();
        setAdminData(data);
      } else {
        setError('Failed to load admin data');
      }
    } catch (error) {
      setError('Failed to load admin data');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsAuthenticated(false);
    setAdminData(null);
    setAdminPassword("");
  };

  const closeModal = () => {
    setShowAdminModal(false);
    setIsAuthenticated(false);
    setAdminData(null);
    setAdminPassword("");
    setError("");
  };

  const exportData = () => {
    if (!adminData?.signups) return;
    
    const csvContent = [
      ['Email', 'Early Access', 'Get Updates', 'Created At', 'IP Address'].join(','),
      ...adminData.signups.map((signup: any) => [
        signup.email,
        signup.early_access ? 'Yes' : 'No',
        signup.get_updates ? 'Yes' : 'No',
        new Date(signup.created_at).toLocaleString(),
        signup.ip_address || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-signups-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
    <footer className="py-12 md:py-16 px-6 md:px-10 lg:px-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="text-2xl mb-6">
              <span className="font-outfit font-bold text-white">Pitch</span><span className="font-saira font-medium text-pitchiq-red">IQ</span>
            </div>
            <p className="text-white/70 mb-6">
              AI-powered sales training that helps professionals practice, improve, and close more deals.
            </p>
              <p className="text-white/50 text-sm">
                Coming soon. Join our early access list to be the first to experience the future of sales training.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-center">
              <h3 className="font-semibold mb-4 text-lg">Built by</h3>
              <div className="text-center">
                <p className="text-white/90 font-medium mb-2">Cason Lamothe</p>
                <p className="text-white/70 text-sm mb-4">Founder & Developer</p>
                <p className="text-white/60 text-xs mb-4 max-w-xs">
                  Passionate about helping sales professionals succeed through innovative AI technology.
                </p>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="text-white/70 hover:text-pitchiq-red text-sm transition-colors"
                >
                  Get in touch →
                </button>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end">
              <h3 className="font-semibold mb-4 text-lg">Stay Connected</h3>
              <p className="text-white/70 text-sm mb-4 md:text-right">
                Follow our journey as we build the future of sales training.
              </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-white/70 text-sm mb-1">
              &copy; 2025 <span className="font-outfit">Pitch</span><span className="font-saira font-medium text-pitchiq-red">IQ</span>. All rights reserved.
            </p>
            <p className="text-white/50 text-xs">
              App and landing page built by Cason Lamothe
            </p>
          </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setShowAdminModal(true)}
                className="text-white/30 hover:text-white/50 transition-colors"
                title="Admin"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      </footer>

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Email Signup Admin</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {!isAuthenticated ? (
                <form onSubmit={handleAdminLogin} className="max-w-md mx-auto">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter admin password"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="mb-4 text-red-600 text-sm">{error}</div>
                  )}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90"
                  >
                    {loading ? "Authenticating..." : "Login"}
                  </Button>
                </form>
              ) : (
                <div>
                  {/* Stats Cards */}
                  {adminData && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">Total Signups</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{adminData.total_signups}</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-orange-600" />
                          <span className="text-sm font-medium text-orange-600">Early Access</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-900">{adminData.early_access_count}</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Updates</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">{adminData.updates_count}</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-purple-600" />
                          <span className="text-sm font-medium text-purple-600">Remaining</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-900">{adminData.remaining_early_access}</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Email Signups</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={exportData}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        size="sm"
                      >
                        Logout
                      </Button>
                    </div>
                  </div>

                  {/* Data Table */}
                  {adminData?.signups && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Early Access</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Updates</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Created At</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">IP Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminData.signups.map((signup: any) => (
                            <tr key={signup.id} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2">{signup.email}</td>
                              <td className="border border-gray-300 px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  signup.early_access 
                                    ? 'bg-orange-100 text-orange-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {signup.early_access ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  signup.get_updates 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {signup.get_updates ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {new Date(signup.created_at).toLocaleString()}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {signup.ip_address || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      </div>
      )}
      
      {/* Contact Modal */}
      <ContactModal 
        isOpen={showContactModal} 
        onClose={() => setShowContactModal(false)} 
      />
    </>
  );
};

export default Footer;
