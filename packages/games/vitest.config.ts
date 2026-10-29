import { defineConfig } from 'vitest/config';

// Sem @vitejs/plugin-react de propósito: o vitest embute a própria versão do vite e o plugin
// da web usa outra. O esbuild já compila JSX com o runtime automático.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    css: false,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
