import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { 
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Группируем RainbowKit в один chunk
          rainbowkit: ['@rainbow-me/rainbowkit'],
          // Группируем Wagmi в один chunk
          wagmi: ['wagmi', 'viem'],
          // Группируем React в один chunk
          react: ['react', 'react-dom'],
          // Группируем React Query в один chunk
          query: ['@tanstack/react-query']
        }
      }
    },
    // Увеличиваем лимит размера chunk
    chunkSizeWarningLimit: 1000
  }
});
