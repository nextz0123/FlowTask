import type { Payment, PaymentMethod, Task } from '../types'
import { addDays, currentWeekStart, fromISODate, summarizeWeeks, weekStartOf } from './week'

export interface Kpi {
  /** Total desta semana. */
  value: number
  /** Total da semana anterior. */
  previous: number
  /** Variação percentual (null quando não há base de comparação). */
  deltaPct: number | null
}

function pctDelta(value: number, previous: number): number | null {
  if (previous === 0) return value === 0 ? 0 : null
  return ((value - previous) / previous) * 100
}

function sumCents(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + t.price_cents, 0)
}

/** Tarefas concluídas (feitas ou pagas) cuja semana é `weekStart`. */
function tasksOfWeek(tasks: Task[], weekStart: string): Task[] {
  return tasks.filter(
    (t) => t.status !== 'pendente' && t.completed_at && weekStartOf(new Date(t.completed_at)) === weekStart,
  )
}

export interface AdminStats {
  /** Valor acumulado esta semana (feito + pago). */
  earned: Kpi
  /** Valor pago esta semana. */
  paid: Kpi
  /** Valor por pagar (todas as semanas). */
  unpaid: number
  /** Tarefas concluídas esta semana. */
  completed: Kpi
  /** Tarefas ainda por fazer. */
  pendingCount: number
  /** Tarefas recusadas pelo trabalhador (com motivo). */
  declined: Task[]
  declinedCount: number
  /** Valor das tarefas recusadas (não será pago). */
  declinedCents: number
  /** Total já pago desde sempre. */
  totalPaid: number
  /** Total ganho desde sempre. */
  totalEarned: number
  /** Série das últimas 8 semanas (inclui a atual). */
  series: { weekStart: string; label: string; earned: number; paid: number }[]
  /** Tarefas mais rentáveis (todas as semanas). */
  topTasks: { title: string; count: number; total: number }[]
  /** Distribuição dos pagamentos por método. */
  byMethod: { method: PaymentMethod; total: number; count: number }[]
  /** Últimos pagamentos registados. */
  recentPayments: Payment[]
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function shortLabel(weekStart: string): string {
  const d = fromISODate(weekStart)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function buildAdminStats(tasks: Task[], payments: Payment[], now = new Date()): AdminStats {
  const thisWeek = currentWeekStart(now)
  const lastWeek = addDays(thisWeek, -7)

  const thisWeekTasks = tasksOfWeek(tasks, thisWeek)
  const lastWeekTasks = tasksOfWeek(tasks, lastWeek)

  const thisWeekPaid = thisWeekTasks.filter((t) => t.status === 'paga')
  const lastWeekPaid = lastWeekTasks.filter((t) => t.status === 'paga')

  const earnedValue = sumCents(thisWeekTasks)
  const earnedPrev = sumCents(lastWeekTasks)
  const paidValue = sumCents(thisWeekPaid)
  const paidPrev = sumCents(lastWeekPaid)

  const completedValue = thisWeekTasks.length
  const completedPrev = lastWeekTasks.length

  const weeks = summarizeWeeks(tasks)
  const byWeek = new Map(weeks.map((w) => [w.weekStart, w]))

  const series = Array.from({ length: 8 }, (_, i) => {
    const ws = addDays(thisWeek, -7 * (7 - i))
    const w = byWeek.get(ws)
    return {
      weekStart: ws,
      label: shortLabel(ws),
      earned: (w?.totalCents ?? 0) / 100,
      paid: (w?.paidCents ?? 0) / 100,
    }
  })

  const declined = tasks
    .filter((t) => t.status === 'recusada')
    .sort((a, b) => ((a.declined_at ?? '') < (b.declined_at ?? '') ? 1 : -1))

  const groups = new Map<string, { count: number; total: number }>()
  for (const t of tasks) {
    if (t.status === 'pendente') continue
    const key = t.title.trim().toLowerCase()
    const g = groups.get(key) ?? { count: 0, total: 0 }
    g.count += 1
    g.total += t.price_cents
    groups.set(key, g)
  }
  const topTasks = [...groups.entries()]
    .map(([key, g]) => ({ title: key.charAt(0).toUpperCase() + key.slice(1), count: g.count, total: g.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const methods: PaymentMethod[] = ['mbway', 'dinheiro', 'outro']
  const byMethod = methods
    .map((method) => {
      const list = payments.filter((p) => p.method === method)
      return { method, total: list.reduce((s, p) => s + p.amount_cents, 0), count: list.length }
    })
    .filter((m) => m.count > 0)

  return {
    earned: { value: earnedValue, previous: earnedPrev, deltaPct: pctDelta(earnedValue, earnedPrev) },
    paid: { value: paidValue, previous: paidPrev, deltaPct: pctDelta(paidValue, paidPrev) },
    unpaid: tasks.filter((t) => t.status === 'feita').reduce((s, t) => s + t.price_cents, 0),
    completed: { value: completedValue, previous: completedPrev, deltaPct: pctDelta(completedValue, completedPrev) },
    pendingCount: tasks.filter((t) => t.status === 'pendente').length,
    declined,
    declinedCount: declined.length,
    declinedCents: declined.reduce((s, t) => s + t.price_cents, 0),
    totalPaid: tasks.filter((t) => t.status === 'paga').reduce((s, t) => s + t.price_cents, 0),
    totalEarned: tasks.filter((t) => t.status !== 'pendente').reduce((s, t) => s + t.price_cents, 0),
    series,
    topTasks,
    byMethod,
    recentPayments: [...payments].sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1)).slice(0, 5),
  }
}
