import { useMemo, useState } from 'react'
import type { Task, TaskStatus } from '../../types'
import { formatDate, formatEuro } from '../../lib/week'

type Filter = 'todas' | TaskStatus

interface Props {
  tasks: Task[]
  onDelete: (task: Task) => void
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendente', label: 'Por fazer' },
  { key: 'feita', label: 'Feitas' },
  { key: 'recusada', label: 'Recusadas' },
  { key: 'paga', label: 'Pagas' },
]

function statusPill(status: TaskStatus) {
  if (status === 'paga') return <span className="pill ok">● Paga</span>
  if (status === 'feita') return <span className="pill warn">● Feita</span>
  if (status === 'recusada') return <span className="pill bad">✕ Recusada</span>
  return <span className="pill idle">○ Por fazer</span>
}

export function TasksTable({ tasks, onDelete }: Props) {
  const [filter, setFilter] = useState<Filter>('todas')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter((t) => {
      if (filter !== 'todas' && t.status !== filter) return false
      if (q && !t.title.toLowerCase().includes(q)) return false
      return true
    })
  }, [tasks, filter, query])

  return (
    <>
      <div className="panel-head">
        <div>
          <h3>Tarefas</h3>
          <p>
            {rows.length} de {tasks.length} tarefas
          </p>
        </div>
        <div className="filters">
          <input
            className="input-sm"
            placeholder="Procurar tarefa…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="seg">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? 'on' : ''}
                onClick={() => setFilter(f.key)}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Tarefa</th>
              <th>Estado</th>
              <th>Motivo / Concluída</th>
              <th className="num">Valor</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-admin">
                    <span className="big">🗂️</span>
                    Nenhuma tarefa encontrada.
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div className="cell-title">
                      <span
                        className="dot"
                        style={
                          task.status === 'recusada'
                            ? { background: 'var(--down)' }
                            : undefined
                        }
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{task.title}</div>
                        {task.description && (
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{task.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{statusPill(task.status)}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12.5, maxWidth: 260 }}>
                    {task.status === 'recusada' ? (
                      <span className="reason" style={{ display: 'inline-block', marginTop: 0 }}>
                        {task.declined_reason ?? 'Sem motivo indicado'}
                      </span>
                    ) : task.completed_at ? (
                      <span style={{ whiteSpace: 'nowrap' }}>{formatDate(task.completed_at)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {formatEuro(task.price_cents)}
                  </td>
                  <td className="num">
                    {task.status !== 'paga' && (
                      <button className="abtn sm" onClick={() => onDelete(task)}>
                        Apagar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
