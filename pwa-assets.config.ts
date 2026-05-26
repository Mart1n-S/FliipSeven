import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

/**
 * Source SVG for every PWA icon.
 *
 * Replace `public/logo.svg` with the actual logo and regenerate the
 * raster icons with `npm run generate-pwa-assets`. The generator
 * outputs `public/pwa-192x192.png`, `public/pwa-512x512.png`,
 * `public/pwa-maskable-512x512.png`, `public/favicon.ico` and
 * `public/apple-touch-icon-180x180.png` - all committed to git so the
 * CI build doesn't need to regenerate them.
 */
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
