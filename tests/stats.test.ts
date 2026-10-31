import { describe, expect, it } from 'vitest'
import { buildAdminStats } from '../src/lib/stats'
import type { Payment, Task } from '../src/types'

function task(partial: Partial<Task>): Task {
  return {
    id: Math.random().toString(36),
    household_id: 'h',
    title: 'T',
    description: null,
    price_cents: 500,
    status: 'pendente',
    created_by: null,
    completed_by: null,
    completed_at: null,
    payment_id: null,
    created_at: new Date().toISOString(),
    ...partial,
  }
}

function payment(partial: Partial<Payment>): Payment {
  return {
    id: Math.random().toString(36),
    household_id: 'h',
    amount_cents: 1000,
    method: 'mbway',
    note: null,
    week_start: '2026-10-26',
    paid_at: new Date().toISOString(),
    ...partial,
  }
}

// 2026-10-28 é quarta-feira da semana de 2026-10-26
const now = new Date(2026, 9, 28, 12)

describe('buildAdminStats', () => {
  it('calcula ganho, pago e variação da semana', () => {
    const tasks = [
      task({ status: 'feita', price_cents: 500, completed_at: new Date(2026, 9, 27, 10).toISOString() }),
      task({ status: 'paga', price_cents: 500, completed_at: new Date(2026, 9, 28, 10).toISOString() }),
      task({ status: 'feita', price_cents: 400, completed_at: new Date(2026, 9, 20, 10).toISOString() }),
      task({ status: 'pendente', price_cents: 999 }),
    ]
    const stats = buildAdminStats(tasks, [], now)

    expect(stats.earned.value).toBe(1000)
    expect(stats.earned.previous).toBe(400)
    expect(stats.earned.deltaPct).toBeCloseTo(150)
    expect(stats.paid.value).toBe(500)
    // "Por pagar" soma todas as semanas: 500 desta + 400 da anterior
    expect(stats.unpaid).toBe(900)
    expect(stats.pendingCount).toBe(1)
    expect(stats.completed.value).toBe(2)
    expect(stats.completed.previous).toBe(1)
  })

  it('devolve série de 8 semanas terminando na atual', () => {
    const tasks = [
      task({ status: 'feita', price_cents: 300, completed_at: new Date(2026, 9, 27, 10).toISOString() }),
    ]
    const stats = buildAdminStats(tasks, [], now)
    expect(stats.series).toHaveLength(8)
    expect(stats.series[7].weekStart).toBe('2026-10-26')
    expect(stats.series[7].earned).toBe(3)
    expect(stats.series[6].weekStart).toBe('2026-10-19')
    expect(stats.series[0].weekStart).toBe('2026-09-07')
  })

  it('agrupa tarefas mais rentáveis', () => {
    const tasks = [
      task({ title: 'Lavar a louça', status: 'feita', price_cents: 300, completed_at: new Date(2026, 9, 27).toISOString() }),
      task({ title: 'lavar a louça', status: 'paga', price_cents: 300, completed_at: new Date(2026, 9, 20).toISOString() }),
      task({ title: 'Aspirar', status: 'feita', price_cents: 200, completed_at: new Date(2026, 9, 21).toISOString() }),
    ]
    const stats = buildAdminStats(tasks, [], now)
    expect(stats.topTasks[0]).toEqual({ title: 'Lavar a louça', count: 2, total: 600 })
    expect(stats.topTasks[1]).toEqual({ title: 'Aspirar', count: 1, total: 200 })
  })

  it('agrega pagamentos por método e ordena os recentes', () => {
    const payments = [
      payment({ method: 'mbway', amount_cents: 1000, paid_at: '2026-10-20T10:00:00Z' }),
      payment({ method: 'mbway', amount_cents: 500, paid_at: '2026-10-27T10:00:00Z' }),
      payment({ method: 'dinheiro', amount_cents: 200, paid_at: '2026-10-26T10:00:00Z' }),
    ]
    const stats = buildAdminStats([], payments, now)
    const mbway = stats.byMethod.find((m) => m.method === 'mbway')
    expect(mbway).toEqual({ method: 'mbway', total: 1500, count: 2 })
    expect(stats.byMethod.find((m) => m.method === 'outro')).toBeUndefined()
    expect(stats.recentPayments[0].paid_at).toBe('2026-10-27T10:00:00Z')
  })

  it('sem dados não rebenta', () => {
    const stats = buildAdminStats([], [], now)
    expect(stats.earned.value).toBe(0)
    expect(stats.earned.deltaPct).toBe(0)
    expect(stats.topTasks).toEqual([])
    expect(stats.recentPayments).toEqual([])
  })
})
