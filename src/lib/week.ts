import type { PaymentMethod, Task } from '../types'

/** Devolve a segunda-feira (00:00 local) da semana de uma data, como "YYYY-MM-DD". */
export function weekStartOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0 = domingo
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toISODate(d)
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Converte "YYYY-MM-DD" numa Date local (sem deslocamento de fuso). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** Início da semana seguinte (segunda-feira seguinte). */
export function nextWeekStart(iso: string): string {
  return addDays(iso, 7)
}

export function currentWeekStart(now = new Date()): string {
  return weekStartOf(now)
}

/** É fim de semana? (sábado ou domingo) */
export function isWeekend(now = new Date()): boolean {
  const day = now.getDay()
  return day === 0 || day === 6
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export function formatWeekLabel(weekStart: string): string {
  const start = fromISODate(weekStart)
  const end = fromISODate(addDays(weekStart, 6))
  const fmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' })
  return `${fmt.format(start)} – ${fmt.format(end)}`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  mbway: 'MB Way',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
}

export interface WeekSummary {
  weekStart: string
  /** Tarefas concluídas nesta semana (feitas ou pagas). */
  tasks: Task[]
  /** Total ganho nesta semana. */
  totalCents: number
  /** Ainda por pagar nesta semana. */
  pendingCents: number
  /** Já pago nesta semana. */
  paidCents: number
}

/**
 * Agrupa tarefas concluídas por semana (com base em completed_at) e calcula totais.
 * Devolve as semanas da mais recente para a mais antiga.
 */
export function summarizeWeeks(tasks: Task[]): WeekSummary[] {
  const byWeek = new Map<string, Task[]>()

  for (const task of tasks) {
    if (task.status === 'pendente' || !task.completed_at) continue
    const week = weekStartOf(new Date(task.completed_at))
    const list = byWeek.get(week) ?? []
    list.push(task)
    byWeek.set(week, list)
  }

  return [...byWeek.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([weekStart, weekTasks]) => {
      const totalCents = weekTasks.reduce((sum, t) => sum + t.price_cents, 0)
      const paidCents = weekTasks
        .filter((t) => t.status === 'paga')
        .reduce((sum, t) => sum + t.price_cents, 0)
      return {
        weekStart,
        tasks: weekTasks,
        totalCents,
        paidCents,
        pendingCents: totalCents - paidCents,
      }
    })
}

/** Saldo total acumulado por pagar (todas as semanas). */
export function totalUnpaid(tasks: Task[]): number {
  return tasks
    .filter((t) => t.status === 'feita')
    .reduce((sum, t) => sum + t.price_cents, 0)
}

/**
 * A que semana pertence uma tarefa.
 * Se já está feita, conta para a semana em que foi concluída.
 * Se ainda está por fazer, conta para a semana em que foi criada.
 */
export function taskWeekStart(task: Task): string {
  const stamp = task.completed_at ?? task.created_at
  return weekStartOf(new Date(stamp))
}

/** Tarefas que pertencem a uma semana (ver taskWeekStart). */
export function tasksInWeek(tasks: Task[], weekStart: string): Task[] {
  return tasks.filter((t) => taskWeekStart(t) === weekStart)
}

/** Saldo já recebido (todas as semanas). */
export function totalReceived(tasks: Task[]): number {
  return tasks
    .filter((t) => t.status === 'paga')
    .reduce((sum, t) => sum + t.price_cents, 0)
}
