import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development the Vite dev server proxies API and Socket.IO
// traffic to the backend, so the app can always use same-origin relative URLs
// (`/api`, `/socket.io`). In the dockerized build, nginx fills the same role.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
