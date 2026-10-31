import { describe, expect, it } from 'vitest'
import { addDays, isWeekend, summarizeWeeks, totalReceived, totalUnpaid, weekStartOf } from '../src/lib/week'
import type { Task } from '../src/types'

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

describe('weekStartOf', () => {
  it('devolve a segunda-feira da semana', () => {
    // 2026-10-31 é sábado
    expect(weekStartOf(new Date(2026, 9, 31))).toBe('2026-10-26')
    // domingo pertence à semana anterior
    expect(weekStartOf(new Date(2026, 10, 1))).toBe('2026-10-26')
    // segunda-feira é ela própria
    expect(weekStartOf(new Date(2026, 9, 26))).toBe('2026-10-26')
  })
})

describe('isWeekend', () => {
  it('deteta sábado e domingo', () => {
    expect(isWeekend(new Date(2026, 9, 31))).toBe(true)
    expect(isWeekend(new Date(2026, 10, 1))).toBe(true)
    expect(isWeekend(new Date(2026, 9, 30))).toBe(false)
  })
})

describe('summarizeWeeks', () => {
  it('agrupa por semana e soma pendente/pago', () => {
    const tasks = [
      task({ status: 'feita', price_cents: 300, completed_at: new Date(2026, 9, 28, 10).toISOString() }),
      task({ status: 'paga', price_cents: 700, completed_at: new Date(2026, 9, 29, 10).toISOString() }),
      task({ status: 'feita', price_cents: 1000, completed_at: new Date(2026, 9, 21, 10).toISOString() }),
      task({ status: 'pendente', price_cents: 9999 }),
    ]
    const weeks = summarizeWeeks(tasks)
    expect(weeks).toHaveLength(2)
    expect(weeks[0].weekStart).toBe('2026-10-26')
    expect(weeks[0].totalCents).toBe(1000)
    expect(weeks[0].paidCents).toBe(700)
    expect(weeks[0].pendingCents).toBe(300)
    expect(weeks[1].weekStart).toBe('2026-10-19')
    expect(weeks[1].pendingCents).toBe(1000)
  })

  it('ignora tarefas pendentes', () => {
    expect(summarizeWeeks([task({ status: 'pendente' })])).toHaveLength(0)
  })
})

describe('totais', () => {
  it('soma por pagar e já recebido', () => {
    const tasks = [
      task({ status: 'feita', price_cents: 300 }),
      task({ status: 'paga', price_cents: 700 }),
      task({ status: 'pendente', price_cents: 5000 }),
    ]
    expect(totalUnpaid(tasks)).toBe(300)
    expect(totalReceived(tasks)).toBe(700)
  })
})

describe('addDays', () => {
  it('atravessa meses', () => {
    expect(addDays('2026-10-26', 7)).toBe('2026-11-02')
  })
})
