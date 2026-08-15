import { defineConfig } from 'vite'

// Relatieve basis: dan werkt de site zowel op http://localhost/ als op
// https://tijsm.github.io/phaedra-30/ zonder dat je hier iets hoeft aan te passen.
export default defineConfig(() => ({
  base: './',
  server: { open: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // three apart houden, dan hoeft de browser die niet opnieuw te halen
        // als er alleen iets aan de wereld of de tekst verandert
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
        },
      },
    },
  },
}))
