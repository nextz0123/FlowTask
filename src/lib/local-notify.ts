import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

/** Estamos dentro do APK? (avisos locais só existem lá) */
function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export interface DailyReminderConfig {
  /** Ligado ou desligado. */
  enabled: boolean
  /** Hora do aviso, de 0 a 23. */
  hour: number
  /** Minuto do aviso, de 0 a 59. */
  minute: number
}

export const DEFAULT_REMINDER: DailyReminderConfig = {
  enabled: false,
  hour: 18,
  minute: 0,
}

const CONFIG_KEY = 'flowtask-daily-reminder'
const NOTIFICATION_ID = 1001

/* ------------------------------------------------------------------ */
/*                        Guardar preferências                         */
/* ------------------------------------------------------------------ */

export function readReminderConfig(): DailyReminderConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return DEFAULT_REMINDER
    return { ...DEFAULT_REMINDER, ...(JSON.parse(raw) as Partial<DailyReminderConfig>) }
  } catch {
    return DEFAULT_REMINDER
  }
}

function writeReminderConfig(cfg: DailyReminderConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
  } catch {}
}

/* ------------------------------------------------------------------ */
/*                       Agendar o aviso diário                        */
/* ------------------------------------------------------------------ */

/**
 * Pede permissão e agenda (ou cancela) o aviso diário.
 * Devolve o estado final — a UI mostra-o ao utilizador.
 */
export async function applyDailyReminder(
  cfg: DailyReminderConfig,
  message: string,
): Promise<{ ok: boolean; reason?: string }> {
  writeReminderConfig(cfg)

  if (!isNative()) {
    // No browser não há avisos locais agendados — fica só guardado.
    return { ok: true }
  }

  try {
    // Cancela o anterior (se existir) antes de agendar de novo
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] })

    if (!cfg.enabled) return { ok: true }

    let perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      perm = await LocalNotifications.requestPermissions()
    }
    if (perm.display !== 'granted') {
      return { ok: false, reason: 'Precisas de permitir notificações para receber o aviso.' }
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_ID,
          title: 'FlowTask',
          body: message,
          schedule: {
            // Repete todos os dias à mesma hora
            on: { hour: cfg.hour, minute: cfg.minute },
            allowWhileIdle: true,
            repeats: true,
          },
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#007aff',
        },
      ],
    })

    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Não foi possível agendar.' }
  }
}

/** Cancela o aviso diário. */
export async function cancelDailyReminder(): Promise<void> {
  if (!isNative()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] })
  } catch {}
}

/** Hora em texto: 18:00 */
export function formatHour(cfg: DailyReminderConfig): string {
  return `${String(cfg.hour).padStart(2, '0')}:${String(cfg.minute).padStart(2, '0')}`
}
