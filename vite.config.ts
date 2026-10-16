import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = 'http://localhost:8787';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2020' },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': target,
      '/health': target,
      '/ws': { target: target.replace('http', 'ws'), ws: true },
    },
  },
});
