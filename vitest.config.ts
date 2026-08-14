import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Die getestete Logik in src/domain ist bewusst frei von DOM und React.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: 'dot',
  },
});
