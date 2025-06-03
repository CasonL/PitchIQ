import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // optimizeDeps: { // Temporarily comment out optimizeDeps for lottie-react
  //   include: [], // Ensure it's an empty array if section is kept
  // },
  build: {
    rollupOptions: {
      external: []
    }
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
}); 