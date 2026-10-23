import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/print_flow/',
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-pdf': ['pdf-lib'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react', 'qrcode.react']
        }
      }
    }
  }
});
