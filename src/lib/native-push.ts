import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import type { Session } from '../types'
import { store } from './store'

/** Estamos a correr dentro do APK Android? */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export type NativePushResult = 'on' | 'denied' | 'unsupported' | 'error'

/**
 * Ativa as notificações nativas (Android/FCM).
 * Devolve o token FCM que fica guardado na base de dados.
 */
export async function enableNativePush(session: Session): Promise<NativePushResult> {
  if (!isNativeApp()) return 'unsupported'

  try {
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') return 'denied'

    return await new Promise<NativePushResult>((resolve) => {
      let settled = false

      void PushNotifications.addListener('registration', (token) => {
        if (settled) return
        settled = true
        void store
          .saveNativePushToken(session, token.value)
          .then(() => resolve('on'))
          .catch(() => resolve('error'))
      })

      void PushNotifications.addListener('registrationError', () => {
        if (settled) return
        settled = true
        resolve('error')
      })

      // O token só chega pelo evento "registration"
      void PushNotifications.register()

      // Rede de segurança: não deixar a UI pendurada
      setTimeout(() => {
        if (settled) return
        settled = true
        resolve('error')
      }, 15000)
    })
  } catch {
    return 'error'
  }
}

/** Desliga as notificações nativas neste aparelho. */
export async function disableNativePush(session: Session): Promise<void> {
  if (!isNativeApp()) return
  try {
    await PushNotifications.removeAllListeners()
    await store.removeNativePushToken(session)
  } catch {
    // ignora
  }
}

/**
 * Trata um toque na notificação: abre a app.
 * Chamar uma vez no arranque da app.
 */
export async function setupNativePushHandlers(): Promise<void> {
  if (!isNativeApp()) return

  await PushNotifications.addListener('pushNotificationActionPerformed', () => {
    // A app já abre; não é preciso navegar para lado nenhum.
  })

  // Com a app aberta, mostra a notificação na mesma (foreground)
  await PushNotifications.addListener('pushNotificationReceived', () => {
    // O sistema Android mostra sozinho quando a app está em background.
  })
}
