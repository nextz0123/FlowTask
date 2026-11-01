import type { Session, Task } from '../types'
import { formatDate, formatEuro, toISODate } from '../lib/week'

/** Texto do prazo: "até hoje", "até 5 de nov." ou "atrasada". */
function dueInfo(due: string): { text: string; late: boolean } {
  const today = toISODate(new Date())
  const [y, m, d] = due.split('-').map(Number)
  const label = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' }).format(
    new Date(y, m - 1, d),
  )
  if (due < today) return { text: `atrasada (era ${label})`, late: true }
  if (due === today) return { text: 'até hoje', late: false }
  return { text: `até ${label}`, late: false }
}

interface Props {
  task: Task
  session: Session
  onComplete: (task: Task) => void
  onUndo: (task: Task) => void
  onDelete: (task: Task) => void
  /** Só o trabalhador pode recusar. */
  onDecline?: (task: Task) => void
}

export function TaskRow({ task, session, onComplete, onUndo, onDelete, onDecline }: Props) {
  const isChefe = session.role === 'chefe'
  const done = task.status === 'feita'
  const paid = task.status === 'paga'
  const declined = task.status === 'recusada'
  const canDecline = !isChefe && Boolean(onDecline) && task.status === 'pendente'

  return (
    <div className={`task ${done ? 'done' : ''} ${paid ? 'paid' : ''} ${declined ? 'declined' : ''}`}>
      {isChefe ? (
        <div className={`check ${done || paid ? 'on' : ''} ${declined ? 'off' : ''}`} aria-hidden>
          {paid ? '€' : done ? '✓' : declined ? '✕' : ''}
        </div>
      ) : (
        <button
          className={`check ${done || paid ? 'on' : ''} ${declined ? 'off' : ''}`}
          onClick={() => (done ? onUndo(task) : onComplete(task))}
          disabled={paid}
          title={paid ? 'Já paga' : done ? 'Desmarcar' : 'Marcar como feita'}
        >
          {paid ? '€' : done ? '✓' : declined ? '✕' : ''}
        </button>
      )}

      <div className="body">
        <div className="title">{task.title}</div>
        {task.description && <div className="desc">{task.description}</div>}
        <div className="meta">
          {paid && <span className="badge">Paga</span>}{' '}
          {done && <span className="badge gold">Feita</span>}{' '}
          {declined && <span className="badge red">Não feita</span>}{' '}
          {task.status === 'pendente' && <span className="badge grey">Por fazer</span>}
          {task.completed_at && <> · {formatDate(task.completed_at)}</>}
        </div>
        {declined && task.declined_reason && (
          <div className="reason">
            <b>Motivo:</b> {task.declined_reason}
          </div>
        )}
        {task.due_date && task.status === 'pendente' && (
          <div className={`due ${dueInfo(task.due_date).late ? 'late' : ''}`}>
            ⏱ {dueInfo(task.due_date).text}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'right' }}>
        <div className="price">{formatEuro(task.price_cents)}</div>
        {isChefe && task.status !== 'paga' && (
          <button className="link-btn" onClick={() => onDelete(task)}>
            apagar
          </button>
        )}
        {canDecline && (
          <div style={{ marginTop: 6 }}>
            <button className="btn ghost small" onClick={() => onDecline?.(task)}>
              Não fazer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
