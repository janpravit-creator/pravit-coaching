import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Netlify liefert die App unter der Wurzel aus.
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // Firebase und die Diagramm-Bibliothek sind groß und ändern sich
        // selten – als eigene Bündel bleiben sie über Veröffentlichungen
        // hinweg im Browser-Cache liegen.
        manualChunks(id) {
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'firebase';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'charts';
          }
          return undefined;
        },
      },
    },
  },
  server: { port: 5174 },
});
