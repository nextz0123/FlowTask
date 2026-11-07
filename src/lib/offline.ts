import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'

/** Estamos dentro do APK? */
function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export type ConnectionState = 'online' | 'offline'

/**
 * A app está ligada à internet?
 * No browser usa o estado do próprio browser; no APK pergunta ao Android.
 */
export async function isOnline(): Promise<boolean> {
  if (isNative()) {
    try {
      const status = await Network.getStatus()
      return status.connected
    } catch {
      return navigator.onLine
    }
  }
  return navigator.onLine
}

/**
 * Avisa sempre que a ligação muda.
 * Devolve uma função para cancelar a subscrição.
 */
export function onConnectionChange(cb: (state: ConnectionState) => void): () => void {
  if (isNative()) {
    let remove: (() => void) | null = null
    void Network.addListener('networkStatusChange', (status) => {
      cb(status.connected ? 'online' : 'offline')
    }).then((handle) => {
      remove = () => void handle.remove()
    })
    return () => remove?.()
  }

  const up = () => cb('online')
  const down = () => cb('offline')
  window.addEventListener('online', up)
  window.addEventListener('offline', down)
  return () => {
    window.removeEventListener('online', up)
    window.removeEventListener('offline', down)
  }
}

/* ------------------------------------------------------------------ */
/*                  Cópia local dos dados (offline)                    */
/* ------------------------------------------------------------------ */

const CACHE_KEY = 'flowtask-cache-v1'

/** Estrutura guardada: os últimos dados vistos + quando foram vistos. */
interface Cache {
  data: unknown
  savedAt: number
}

/** Guarda a última cópia boa dos dados, para usar sem internet. */
export function saveCache(data: unknown): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }))
  } catch {
    // sem espaço ou modo privado — não é crítico
  }
}

/** Vai buscar a cópia local. Devolve null se nunca houve. */
export function readCache<T>(): { data: T; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cache
    return { data: parsed.data as T, savedAt: parsed.savedAt }
  } catch {
    return null
  }
}

/** Há quanto tempo foi guardada a cópia (texto curto para mostrar). */
export function cacheAge(savedAt: number): string {
  const mins = Math.floor((Date.now() - savedAt) / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins === 1) return 'há 1 minuto'
  if (mins < 60) return `há ${mins} minutos`
  const hours = Math.floor(mins / 60)
  if (hours === 1) return 'há 1 hora'
  if (hours < 24) return `há ${hours} horas`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}
