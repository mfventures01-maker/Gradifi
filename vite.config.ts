import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/core': {
          target: 'https://api.core.ac.uk',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/core/, '/v3'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const apiKey = process.env.VITE_CORE_API_KEY || 'sRU3yEdahxcPbC0M9fuBGXko1jD6m7qO';
              proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
            });
          }
        }
      }
    },
  };
});
