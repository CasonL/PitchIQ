import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/context/AuthContext';
import api from '@/lib/axios'; // Import the centralized api instance
import axios from 'axios'; // Import axios for error handling

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, checkAuthStatus, isLoading: authIsLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Local submission state

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      if (response.data && response.data.status === 'success' && response.data.user) {
        login(response.data.user);
        
        const redirectUrl = response.data.redirect || '/';
        navigate(redirectUrl);
      } else {
        setError(response.data.error || 'Login failed: Invalid response from server.');
      }
    } catch (err: any) {
        if (axios.isAxiosError(err) && err.response) {
            setError(err.response.data.error || 'An error occurred.');
        } else {
            setError(err.message || 'An unknown error occurred.');
        }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // The main submit button should be disabled if the auth context is loading OR
  // if the form is currently being submitted.
  const isButtonDisabled = authIsLoading || isSubmitting;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-md rounded-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isButtonDisabled}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage; 