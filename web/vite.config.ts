/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: __dirname,
  cacheDir: '../node_modules/.vite/web',
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src/app')
    }
  },
  server: {
    host: process.env.RTR_WEB_HOST || '0.0.0.0',
    port: process.env.RTR_WEB_PORT ? parseInt(process.env.RTR_WEB_PORT) : undefined,
    proxy: {
      '/api': {
        target: `${process.env.RTR_API_PROTOCOL || 'http'}://${process.env.RTR_API_HOST || 'localhost'}:${process.env.RTR_API_PORT || '3000'}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/socket.io': {
        target: `${process.env.RTR_API_PROTOCOL || 'http'}://${process.env.RTR_API_HOST || 'localhost'}:${process.env.RTR_API_PORT || '3000'}`,
        ws: true,
        changeOrigin: true,
      },
    },
    cors: true,
    strictPort: true,
  },
  preview: {
    port: process.env.RTR_WEB_PORT ? parseInt(process.env.RTR_WEB_PORT) : undefined,
    host: '0.0.0.0',
    cors: true,
    strictPort: true,
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
  define: {
    'import.meta.env.RTR_API_PROTOCOL': JSON.stringify(process.env.RTR_API_PROTOCOL || 'http'),
    'import.meta.env.RTR_API_HOST': JSON.stringify(process.env.RTR_API_HOST || 'localhost'),
    'import.meta.env.RTR_API_PORT': JSON.stringify(process.env.RTR_API_PORT || '3000'),
    'import.meta.env.RTR_WEB_PROTOCOL': JSON.stringify(process.env.RTR_WEB_PROTOCOL || 'http'),
    'import.meta.env.RTR_WEB_HOST': JSON.stringify(process.env.RTR_WEB_HOST || 'localhost'),
    'import.meta.env.RTR_WEB_PORT': JSON.stringify(process.env.RTR_WEB_PORT),
  },
});
