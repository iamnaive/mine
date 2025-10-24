import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { 
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          // Группируем React в один chunk (должен загружаться первым)
          react: ['react', 'react-dom'],
          // Группируем React Query в один chunk
          query: ['@tanstack/react-query'],
          // Группируем Wagmi в один chunk
          wagmi: ['wagmi', 'viem'],
          // Группируем RainbowKit в один chunk
          rainbowkit: ['@rainbow-me/rainbowkit']
        }
      }
    },
    // Увеличиваем лимит размера chunk
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query', 'wagmi', 'viem', '@rainbow-me/rainbowkit']
  }
});
