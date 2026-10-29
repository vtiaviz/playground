import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Página de teste do Office sem API nem login: npm run dev -w @playground/office
export default defineConfig({
  root: 'demo',
  plugins: [react()],
  server: { host: true, port: 5174 },
});
