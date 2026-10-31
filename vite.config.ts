import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FlowTask',
        short_name: 'FlowTask',
        description: 'Tarefas de casa com preço, saldo semanal e pagamento no fim de semana.',
        lang: 'pt-PT',
        theme_color: '#1f7a5a',
        background_color: '#f4f6f4',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallbackDenylist: [/^\/api/],
        // Ativa a versão nova imediatamente, sem esperar que o utilizador feche a app
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // O index.html nunca deve vir da cache (é ele que aponta para os ficheiros novos)
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'flowtask-pages',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
})
