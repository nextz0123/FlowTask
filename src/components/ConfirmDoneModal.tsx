import type { Task } from '../types'
import { formatEuro } from '../lib/week'

interface Props {
  task: Task
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Confirmação antes de marcar uma tarefa como feita.
 * Evita marcar por engano — só depois de confirmar é que o valor conta.
 */
export function ConfirmDoneModal({ task, busy, onConfirm, onCancel }: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">✅</div>
        <h3>Tudo foi feito direito?</h3>
        <p className="lead">
          Confirma que terminaste <b>{task.title}</b>.
        </p>

        <div className="confirm-task">
          <span className="confirm-task-title">{task.title}</span>
          <span className="confirm-task-price">{formatEuro(task.price_cents)}</span>
        </div>

        <p className="confirm-note">
          Só depois de confirmares é que estes {formatEuro(task.price_cents)} entram no valor a receber.
        </p>

        <div className="row">
          <button className="btn ghost" type="button" onClick={onCancel} disabled={busy}>
            Ainda não
          </button>
          <button className="btn" type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'A guardar…' : 'Sim, já está feita'}
          </button>
        </div>
      </div>
    </div>
  )
}
