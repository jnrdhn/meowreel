// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],

//   // GitHub Pages base path — change 'MeowReel' to your repo name
//   base: '/MeowReel/',

//   server: {
//     // Inject required COOP/COEP headers in local dev
//     // (The service worker handles this in production)
//     headers: {
//       'Cross-Origin-Opener-Policy': 'same-origin',
//       'Cross-Origin-Embedder-Policy': 'require-corp',
//     },
//   },

//   optimizeDeps: {
//     // Prevent Vite from pre-bundling ffmpeg (it's WASM-based)
//     exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
//   },
// });


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/MeowReel/',

  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  // ← ADD THIS
  assetsInclude: ['**/*.wasm'],

  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});