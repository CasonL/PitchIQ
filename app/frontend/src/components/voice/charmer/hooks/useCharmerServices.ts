/**
 * useCharmerServices - Hook for accessing Charmer service instances
 * 
 * Provides centralized access to all Charmer services with proper lifecycle management
 */

import { useContext } from 'react';
import { CharmerServicesContext } from '../context/CharmerServicesContext';

export function useCharmerServices() {
  const context = useContext(CharmerServicesContext);
  
  if (!context) {
    throw new Error('useCharmerServices must be used within CharmerServicesProvider');
  }
  
  return context;
}
