import { defineConfig } from 'vite';

// Relativní cesty, aby hra fungovala i na GitHub Pages pod /<repo>/.
export default defineConfig({
  base: './',
  // Phaser sám má ~1,2 MB, varování o velikosti proto posouváme.
  build: { outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 1500 },
});
