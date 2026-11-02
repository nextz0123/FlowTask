import { isCloudMode, store } from './store'
import type { Session } from '../types'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushState =
  | 'unsupported' // browser não suporta
  | 'denied' // utilizador recusou
  | 'off' // suportado, mas desligado
  | 'on' // ativo
  | 'demo' // modo demonstração (sem nuvem)

/** O browser suporta notificações push? */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Converte a chave VAPID (base64url) para o formato que o PushManager espera. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

/** Estado atual das notificações neste aparelho. */
export async function getPushState(session: Session): Promise<PushState> {
  if (!isCloudMode) return 'demo'
  if (!pushSupported() || !VAPID_PUBLIC) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'

  const reg = await getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return 'off'

  try {
    const active = await store.pushStatus(session, sub.endpoint)
    return active ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

/** Pede permissão e ativa as notificações neste aparelho. */
export async function enablePush(session: Session): Promise<PushState> {
  if (!isCloudMode) return 'demo'
  if (!pushSupported() || !VAPID_PUBLIC) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'

  const reg = await getRegistration()
  if (!reg) throw new Error('A app ainda não está pronta. Recarrega a página e tenta outra vez.')

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    }))

  const json = sub.toJSON()
  const keys = json.keys ?? {}
  if (!keys.p256dh || !keys.auth) throw new Error('Subscrição inválida. Tenta noutro browser.')

  await store.savePushSubscription(session, {
    endpoint: sub.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  })
  return 'on'
}

/** Desliga as notificações neste aparelho. */
export async function disablePush(session: Session): Promise<PushState> {
  const reg = await getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    try {
      await store.removePushSubscription(session, sub.endpoint)
    } catch {
      // mesmo que falhe na nuvem, cancelamos localmente
    }
    await sub.unsubscribe()
  }
  return 'off'
}

/** Envia uma notificação de teste para este aparelho. */
export async function sendTestNotification(): Promise<void> {
  const reg = await getRegistration()
  if (!reg) return
  await reg.showNotification('FlowTask 🎉', {
    body: 'As notificações estão a funcionar neste aparelho!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'flowtask-test',
  })
}
