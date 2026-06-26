import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Умный Бюджет',
        short_name: 'Бюджет',
        description: 'Личный финансовый учёт',
        theme_color: '#2C2C2C',
        background_color: '#1E1E1E',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/(accounts|categories)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-static',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/transactions/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-transactions',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 }
            }
          },
          {
            urlPattern: /^https?:\/\/.*\/api\/stats/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-stats',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
