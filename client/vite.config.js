import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 1. Listen on 0.0.0.0 so Docker can route traffic into the container
    host: '0.0.0.0',
    port: 3000,
    
    // 2. Watcher configuration for Windows / Docker Hot Reloading
    watch: {
      usePolling: true, // Crucial for file-change detection across Windows & Linux Docker
    },
  },
});