import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    filename: 'service-worker.js',
    injectRegister: false,
    manifest: false,
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
      globIgnores: ['test/**'],
      navigateFallback: '/index.html',
      navigateFallbackDenylist: [/^\/api\//, /^\/test\//],
      cleanupOutdatedCaches: true,
      // New releases wait until open windows close, preserving in-progress forms.
      skipWaiting: false,
      clientsClaim: true,
    },
  })],
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
