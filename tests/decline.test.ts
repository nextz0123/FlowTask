import { describe, expect, it } from 'vitest'
import { summarizeWeeks, totalReceived, totalUnpaid } from '../src/lib/week'
import { buildAdminStats } from '../src/lib/stats'
import type { Task } from '../src/types'

function task(partial: Partial<Task>): Task {
  return {
    id: Math.random().toString(36),
    household_id: 'h',
    title: 'Tarefa',
    description: null,
    price_cents: 500,
    status: 'pendente',
    created_by: null,
    completed_by: null,
    completed_at: null,
    declined_reason: null,
    declined_at: null,
    payment_id: null,
    created_at: new Date().toISOString(),
    ...partial,
  }
}

const now = new Date(2026, 9, 28, 12)

describe('tarefas recusadas', () => {
  it('não contam para o saldo a pagar nem para o total da semana', () => {
    const tasks = [
      task({ status: 'feita', price_cents: 500, completed_at: new Date(2026, 9, 27).toISOString() }),
      task({
        status: 'recusada',
        price_cents: 900,
        declined_reason: 'Não me sinto bem',
        declined_at: new Date(2026, 9, 27).toISOString(),
      }),
    ]
    expect(totalUnpaid(tasks)).toBe(500)
    expect(totalReceived(tasks)).toBe(0)
    const weeks = summarizeWeeks(tasks)
    expect(weeks[0].totalCents).toBe(500)
    expect(weeks[0].tasks).toHaveLength(1)
  })

  it('aparecem nas estatísticas do chefe com motivo e valor', () => {
    const tasks = [
      task({
        title: 'Lavar o carro',
        status: 'recusada',
        price_cents: 700,
        declined_reason: 'Falta-me material',
        declined_at: new Date(2026, 9, 27).toISOString(),
      }),
      task({
        title: 'Aspirar',
        status: 'recusada',
        price_cents: 300,
        declined_reason: 'Não tenho tempo hoje',
        declined_at: new Date(2026, 9, 28).toISOString(),
      }),
    ]
    const stats = buildAdminStats(tasks, [], now)
    expect(stats.declinedCount).toBe(2)
    expect(stats.declinedCents).toBe(1000)
    // mais recente primeiro
    expect(stats.declined[0].title).toBe('Aspirar')
    expect(stats.declined[0].declined_reason).toBe('Não tenho tempo hoje')
    // recusadas não contam como ganho
    expect(stats.earned.value).toBe(0)
    expect(stats.unpaid).toBe(0)
  })

  it('sem recusas devolve lista vazia', () => {
    const stats = buildAdminStats([task({ status: 'pendente' })], [], now)
    expect(stats.declined).toEqual([])
    expect(stats.declinedCount).toBe(0)
    expect(stats.declinedCents).toBe(0)
  })
})
