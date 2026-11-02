/// <reference lib="webworker" />
/**
 * Service worker do FlowTask.
 * - Precache da app (gerado pelo vite-plugin-pwa via injectManifest)
 * - Recebe notificações push e mostra-as
 * - Ao clicar, abre a app
 */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

/* ---------------- Notificações push ---------------- */

interface PushPayload {
  title?: string
  body?: string
  tag?: string
  url?: string
}

self.addEventListener('push', (event: PushEvent) => {
  let data: PushPayload = {
    title: 'FlowTask',
    body: 'Tens uma novidade.',
  }

  if (event.data) {
    try {
      data = { ...data, ...(event.data.json() as PushPayload) }
    } catch {
      data.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'FlowTask', {
      body: data.body ?? '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag ?? 'flowtask',
      data: { url: data.url ?? '/' },
      vibrate: [120, 60, 120],
    } as NotificationOptions),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/'

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus()
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})
