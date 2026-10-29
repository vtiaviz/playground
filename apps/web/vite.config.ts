import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Em desenvolvimento, /api é encaminhado para a API (evita CORS).
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // escuta em 0.0.0.0: dá para abrir pelo IP da VM
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3333', changeOrigin: true },
    },
  },
});
