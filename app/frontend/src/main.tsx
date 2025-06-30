import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Assuming App is your root component
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { NavbarHeightProvider } from './context/NavbarHeightContext'; // ADDED
import { MessageProcessor } from './lib/messageProcessor'; // Import message processor
// Polyfill Buffer for Deepgram SDK in browser
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;

// Initialize global message processor
console.log('Initializing global message processor...');

// This setup is now handled within App.tsx with <BrowserRouter>
// const router = createBrowserRouter(
//   [
//     {
//       path: '*',
//       element: <App />
//     }
//   ]
// );

// Create a client
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NavbarHeightProvider>
            <App />
          </NavbarHeightProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)