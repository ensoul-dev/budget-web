import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isGhPages = process.env.GITHUB_PAGES === '1'
const base = isGhPages ? '/budget-web/' : '/'

export default defineConfig({
  base,
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
        start_url: isGhPages ? '/budget-web/' : '/',
        scope: isGhPages ? '/budget-web/' : '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      }
    })
  ],
})
