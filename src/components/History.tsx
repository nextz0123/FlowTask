import type { Payment, Task } from '../types'
import { formatDate, formatEuro, formatWeekLabel, PAYMENT_LABELS, summarizeWeeks } from '../lib/week'

interface Props {
  tasks: Task[]
  payments: Payment[]
}

export function History({ tasks, payments }: Props) {
  const weeks = summarizeWeeks(tasks)
  const paymentById = new Map(payments.map((p) => [p.id, p]))

  if (weeks.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <span className="big">📅</span>
          Ainda não há semanas fechadas. Marca tarefas como feitas para começar a acumular.
        </div>
      </div>
    )
  }

  return (
    <>
      {weeks.map((week) => (
        <div className="card" key={week.weekStart}>
          <div className="week-head">
            <div>
              <b>{formatWeekLabel(week.weekStart)}</b>
              <div className="small muted">
                {week.pendingCents > 0
                  ? `${formatEuro(week.pendingCents)} por pagar`
                  : 'Tudo pago ✓'}
              </div>
            </div>
            <div className="total">{formatEuro(week.totalCents)}</div>
          </div>

          <div className="tasks">
            {week.tasks.map((task) => {
              const payment = task.payment_id ? paymentById.get(task.payment_id) : undefined
              return (
                <div className={`task ${task.status === 'paga' ? 'paid' : 'done'}`} key={task.id}>
                  <div className={`check ${task.status === 'paga' ? 'on' : ''}`} aria-hidden>
                    {task.status === 'paga' ? '€' : '✓'}
                  </div>
                  <div className="body">
                    <div className="title">{task.title}</div>
                    <div className="meta">
                      {task.completed_at && formatDate(task.completed_at)}
                      {payment && (
                        <>
                          {' '}
                          · {PAYMENT_LABELS[payment.method]} em {formatDate(payment.paid_at)}
                          {payment.note ? ` · ${payment.note}` : ''}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="price">{formatEuro(task.price_cents)}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}
