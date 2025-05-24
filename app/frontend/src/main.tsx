import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Assuming App is your root component
import './index.css'
import { BrowserRouter, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { MessageProcessor } from './lib/messageProcessor'; // Import message processor

// Initialize global message processor
console.log('Initializing global message processor...');

// Create router with future flags
const router = createBrowserRouter(
  [
    {
      path: '*',
      element: <App />
    }
  ]
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider> {/* Wrap App with AuthProvider */}
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)
