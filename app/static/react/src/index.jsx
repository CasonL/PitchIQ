/**
 * React Application Entry Point
 * 
 * This file serves as the entry point for the React application.
 * It renders the App component into the DOM.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Function to initialize the React app
const initializeReactApp = () => {
  const rootElement = document.getElementById('dashboard-root');
  
  if (rootElement) {
    // Retrieve initial data passed from the server
    const initialData = window.INITIAL_DATA || {};
    const page = window.REACT_PAGE || 'dashboard';

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <BrowserRouter>
          <App initialData={initialData} page={page} />
        </BrowserRouter>
      </React.StrictMode>
    );
  } else {
    console.error("Failed to find the root element #dashboard-root. React app could not be mounted.");
  }
};

// Wait for the DOM to be fully loaded before initializing the app
if (document.readyState === 'loading') { // Loading hasn't finished yet
  document.addEventListener('DOMContentLoaded', initializeReactApp);
} else { // DOMContentLoaded has already fired
  initializeReactApp();
} 