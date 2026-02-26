import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Mail, Lock, LogOut, Users, TrendingUp } from 'lucide-react';

interface Signup {
  id: number;
  email: string;
  early_access: boolean;
  get_updates: boolean;
  created_at: string;
}

interface AdminData {
  total_signups: number;
  early_access_count: number;
  updates_count: number;
  remaining_early_access: number;
  signups: Signup[];
}

const AdminSignups = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/email-signup/admin/email-signups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/email-signup/admin/email-signups`, {
        credentials: 'include',
      });

      if (response.ok) {
        const adminData = await response.json();
        setData(adminData);
      } else {
        setError('Failed to fetch data');
        setIsAuthenticated(false);
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/email-signup/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setIsAuthenticated(false);
    setData(null);
    setPassword('');
  };

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(fetchData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-pitchiq-red rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
            <p className="text-gray-600 text-sm mt-2">View email signups</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-base py-6"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-pitchiq-red hover:bg-pitchiq-red/90 text-lg py-6"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Access Dashboard'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Signups</h1>
            <p className="text-gray-600 mt-1">PitchIQ Waitlist Dashboard</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Signups</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {data.total_signups}
                  </p>
                </div>
                <Users className="w-10 h-10 text-pitchiq-red opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Early Access</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {data.early_access_count}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Want Updates</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {data.updates_count}
                  </p>
                </div>
                <Mail className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">EA Remaining</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {data.remaining_early_access}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-600 opacity-20" />
              </div>
            </Card>
          </div>
        )}

        {/* Signups Table */}
        <Card className="p-6 bg-white">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Signups</h2>
          
          {data && data.signups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Early Access
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Updates
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Signed Up
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.signups.map((signup) => (
                    <tr key={signup.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {signup.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            signup.early_access
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {signup.early_access ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            signup.get_updates
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {signup.get_updates ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatDate(signup.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No signups yet</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminSignups;
