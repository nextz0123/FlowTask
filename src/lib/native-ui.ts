import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

/** Estamos dentro do APK? (no browser não há sensações nativas) */
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/* ------------------------------------------------------------------ */
/*                          Vibração (háptica)                         */
/* ------------------------------------------------------------------ */

/** Toque leve — usar em botões e seleções. */
export async function tapLight(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // o telemóvel pode não ter motor de vibração
  }
}

/** Toque médio — usar em ações com mais peso (marcar tarefa feita). */
export async function tapMedium(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {}
}

/** Sinal de sucesso (duplo toque) — tarefa concluída, pagamento feito. */
export async function tapSuccess(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.notification({ type: NotificationType.Success })
  } catch {}
}

/** Sinal de aviso — recusar uma tarefa, erro. */
export async function tapWarning(): Promise<void> {
  if (!isNative()) return
  try {
    await Haptics.notification({ type: NotificationType.Warning })
  } catch {}
}

/* ------------------------------------------------------------------ */
/*                        Barra de estado e splash                     */
/* ------------------------------------------------------------------ */

/**
 * Prepara a app para parecer nativa:
 *  - a barra de estado acompanha o tema (claro/escuro)
 *  - o fundo da app estica até ao topo
 *  - o ecrã de abertura desaparece suavemente
 */
export async function setupNativeChrome(): Promise<void> {
  if (!isNative()) return

  try {
    // O conteúdo pode passar por baixo da barra de estado (as vistas já têm margem)
    await StatusBar.setOverlaysWebView({ overlay: true })
    await applyStatusBarTheme()
    // Acompanha o tema quando o sistema muda
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      void applyStatusBarTheme()
    })
  } catch {}

  try {
    // Deixa o ecrã de abertura desvanecer em vez de saltar
    await SplashScreen.hide({ fadeOutDuration: 280 })
  } catch {}
}

/** Ajusta os ícones da barra de estado ao tema em uso. */
async function applyStatusBarTheme(): Promise<void> {
  try {
    const theme = document.documentElement.dataset.theme
    const dark =
      theme === 'dark' ||
      (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
  } catch {}
}

/**
 * Liga a vibração aos botões da app automaticamente.
 * Um toque leve em cada botão — dá a sensação de app nativa.
 * (delegação de eventos: apanha botões criados depois)
 */
export function enableTapFeedback(): void {
  if (!isNative()) return
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      const btn = el.closest('button, .role, .pay-option, .task')
      if (!btn) return
      if ((btn as HTMLButtonElement).disabled) return
      void tapLight()
    },
    { passive: true },
  )
}
