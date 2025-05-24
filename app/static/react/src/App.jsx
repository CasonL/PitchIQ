/**
 * Main App Component
 * 
 * This is the root component for the React dashboard application.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = ({ initialData, page }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(initialData?.user || {});
  const [metrics, setMetrics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [skillsData, setSkillsData] = useState(null);

  // Configure axios to include credentials
  axios.defaults.withCredentials = true;
  axios.defaults.baseURL = initialData?.appConfig?.apiBaseUrl || '/api';

  useEffect(() => {
    // Only load dashboard data if we're on the dashboard page
    if (page === 'dashboard') {
      loadDashboardData();
    }
  }, [page]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch data in parallel
      const [metricsRes, sessionsRes, insightsRes, skillsRes] = await Promise.all([
        axios.get('/user/metrics'),
        axios.get('/sessions?limit=5'),
        axios.get('/insights/generate'),
        axios.get('/skills/radar')
      ]);
      
      setMetrics(metricsRes.data);
      setSessions(sessionsRes.data.sessions || []);
      setInsights(insightsRes.data);
      setSkillsData(skillsRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle API errors
  if (error) {
    return (
      <div className="dashboard-container">
        <div className="alert alert-danger">
          <h4>Error</h4>
          <p>{error}</p>
          <button className="btn btn-primary mt-3" onClick={loadDashboardData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="ms-3">Loading your dashboard...</span>
        </div>
      </div>
    );
  }
  
  // Different page handling
  if (page !== 'dashboard') {
    return (
      <div className="dashboard-container">
        <h1>Unknown page: {page}</h1>
        <p>This page is not implemented yet.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="dashboard-welcome">
            Welcome back, {userData.name}
          </h1>
          <p className="dashboard-subtitle">
            Here's your personalized insight for today.
          </p>
        </div>
      </div>
      
      {/* We've removed the three card system and other dashboard components */}
      {/* The custom focus card is rendered by our dashboard-focus-card.js script */}
      <div className="focus-card-container">
        {/* Our custom focus card will be rendered here by external JS */}
      </div>
    </div>
  );
};

export default App; 