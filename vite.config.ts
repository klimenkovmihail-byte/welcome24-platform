import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Вендоры — в отдельные стабильные чанки: кэшируются между деплоями
        // и не тянут recharts/framer в стартовый бандл.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'recharts';
          if (id.includes('framer-motion')) return 'framer';
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (id.includes('react-router')) return 'router';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react';
          return 'vendor';
        },
      },
    },
  },
})
