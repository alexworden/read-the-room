/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  cacheDir: '../node_modules/.vite/web',
  server: {
    port: parseInt(process.env.RTR_WEB_PORT || '4200'),
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: `${process.env.RTR_API_PROTOCOL || 'http'}://${process.env.RTR_API_HOST || 'localhost'}:${process.env.RTR_API_PORT || '3000'}`,
        changeOrigin: true,
        secure: false,
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
    port: parseInt(process.env.RTR_WEB_PORT || '4200'),
    host: '0.0.0.0',
    cors: true,
    strictPort: true,
  },
  plugins: [
    react(),
    nxViteTsPaths(),
  ],
  build: {
    target: 'es2015',
    outDir: '../dist/web',
    reportCompressedSize: true,
    commonjsOptions: { transformMixedEsModules: true },
  },
  define: {
    'import.meta.env.RTR_API_PROTOCOL': JSON.stringify(process.env.RTR_API_PROTOCOL || 'http'),
    'import.meta.env.RTR_API_HOST': JSON.stringify(process.env.RTR_API_HOST || 'localhost'),
    'import.meta.env.RTR_API_PORT': JSON.stringify(process.env.RTR_API_PORT || '3000'),
    'import.meta.env.RTR_WEB_PROTOCOL': JSON.stringify(process.env.RTR_WEB_PROTOCOL || 'http'),
    'import.meta.env.RTR_WEB_HOST': JSON.stringify(process.env.RTR_WEB_HOST || 'localhost'),
    'import.meta.env.RTR_WEB_PORT': JSON.stringify(process.env.RTR_WEB_PORT || '4200'),
  },
});
