import { defineConfig } from 'vite';

// Relative base so the built app works from any sub-path (e.g. /webdesigner/).
export default defineConfig({
  base: './',
  server: { port: 5180, strictPort: true },
  // GrapesJS + CodeMirror make one ~550 kB (gzip) bundle; that is expected.
  build: { chunkSizeWarningLimit: 2500 },
});
