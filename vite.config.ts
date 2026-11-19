import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const phpLoader = fileURLToPath(new URL('./src/lib/php/loader-8-2.ts', import.meta.url));
const empty = fileURLToPath(new URL('./src/lib/php/empty-asset.ts', import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  resolve: {
    alias: [
      // PHP w przegladarce: tylko 8.2 asyncify, bez intl/icu (oszczedza setki MB)
      { find: /^@php-wasm\/web-\d+-\d+$/, replacement: phpLoader },
      { find: /^\.\/shared\/icu\.dat$/, replacement: empty },
    ],
  },
  optimizeDeps: { exclude: ['@php-wasm/web'] },
});
