import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['clsx', 'tailwind-merge', 'date-fns'],
          icons: ['lucide-react'],
        },
      }
    }
  },
  server: {
    hmr: {
      overlay: false
    },
    proxy: {
      '/api/comfy': {
        target: 'http://127.0.0.1:8188',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/comfy/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://127.0.0.1:8188');
            proxyReq.setHeader('referer', 'http://127.0.0.1:8188/');
            proxyReq.setHeader('host', '127.0.0.1:8188');
          });
        }
      }
    }
  }
});
