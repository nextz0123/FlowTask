import { formatEuro } from './week'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export type PushTarget = 'chefe' | 'trabalhador' | 'ambos'

interface NotifyInput {
  code: string
  title: string
  body: string
  target?: PushTarget
  tag?: string
  url?: string
}

/**
 * Pede à Edge Function "send-push" para enviar uma notificação.
 * Falha em silêncio: notificações nunca devem bloquear uma ação principal.
 */
export async function notify(input: NotifyInput): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  try {
    await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(input),
    })
  } catch {
    // sem rede ou função não publicada — ignora
  }
}

/* ---------------- Mensagens prontas ---------------- */

export function notifyNewTask(code: string, title: string, priceCents: number) {
  return notify({
    code,
    target: 'trabalhador',
    title: '📋 Tarefa nova',
    body: `${title} — ${formatEuro(priceCents)}`,
    tag: 'nova-tarefa',
    url: '/',
  })
}

export function notifyTaskDone(code: string, title: string) {
  return notify({
    code,
    target: 'chefe',
    title: '✅ Tarefa feita',
    body: `O trabalhador marcou "${title}" como feita.`,
    tag: 'tarefa-feita',
    url: '/',
  })
}

export function notifyTaskDeclined(code: string, title: string, reason: string) {
  return notify({
    code,
    target: 'chefe',
    title: '✕ Tarefa não feita',
    body: `"${title}" — motivo: ${reason}`,
    tag: 'tarefa-recusada',
    url: '/',
  })
}

export function notifyPaymentRequest(code: string, amountCents: number) {
  return notify({
    code,
    target: 'chefe',
    title: '📣 Pedido de pagamento',
    body: `O trabalhador pede ${formatEuro(amountCents)}.`,
    tag: 'pedido-pagamento',
    url: '/',
  })
}

export function notifyWeekendReminder(code: string) {
  return notify({
    code,
    target: 'ambos',
    title: '🔔 É fim de semana',
    body: 'Hora de acertar as contas da semana.',
    tag: 'fim-de-semana',
    url: '/',
  })
}

export function notifyDueSoon(code: string, title: string) {
  return notify({
    code,
    target: 'trabalhador',
    title: '⏱ Prazo a chegar',
    body: `"${title}" tem de estar feita hoje.`,
    tag: 'prazo',
    url: '/',
  })
}
