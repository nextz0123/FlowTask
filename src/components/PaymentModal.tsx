import { useState } from 'react'
import type { PaymentMethod, Session } from '../types'
import { formatEuro, formatWeekLabel } from '../lib/week'
import { PAYMENT_LABELS } from '../lib/week'
import { store } from '../lib/store'

interface Props {
  session: Session
  weekStart: string
  taskIds: string[]
  amountCents: number
  onDone: () => void
  onClose: () => void
}

const OPTIONS: { method: PaymentMethod; emoji: string; hint: string }[] = [
  { method: 'mbway', emoji: '📱', hint: 'Transferência pelo telemóvel' },
  { method: 'dinheiro', emoji: '💶', hint: 'Entrega em mão' },
  { method: 'outro', emoji: '🏦', hint: 'Transferência, cartão, prenda…' },
]

export function PaymentModal({ session, weekStart, taskIds, amountCents, onDone, onClose }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('mbway')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Passo 2: pedir confirmação antes de gravar. */
  const [asking, setAsking] = useState(false)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await store.payWeek(session, {
        weekStart,
        taskIds,
        amountCents,
        method,
        note: note.trim() || null,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registar o pagamento.')
    } finally {
      setBusy(false)
    }
  }

  if (asking) {
    return (
      <div className="modal-backdrop" onClick={() => !busy && setAsking(false)}>
        <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-icon">💸</div>
          <h3>Confirmas o pagamento?</h3>
          <p className="lead">Esta ação não pode ser desfeita.</p>

          <div className="confirm-task">
            <span className="confirm-task-title">Pagar com {PAYMENT_LABELS[method]}</span>
            <span className="confirm-task-price">{formatEuro(amountCents)}</span>
          </div>

          <p className="confirm-note">
            {taskIds.length} tarefa{taskIds.length === 1 ? '' : 's'} da semana de{' '}
            {formatWeekLabel(weekStart)} vão ficar marcadas como <b>pagas</b>.
            {note.trim() ? ` Nota: “${note.trim()}”.` : ''}
          </p>

          <div className="row">
            <button className="btn ghost" type="button" onClick={() => setAsking(false)} disabled={busy}>
              Voltar
            </button>
            <button className="btn gold" type="button" onClick={confirm} disabled={busy}>
              {busy ? 'A registar…' : `Sim, pagar ${formatEuro(amountCents)}`}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Pagar semana</h3>
        <p className="lead">
          {formatWeekLabel(weekStart)} · <b>{formatEuro(amountCents)}</b>
        </p>

        <div className="pay-options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.method}
              type="button"
              className={`pay-option ${method === opt.method ? 'on' : ''}`}
              onClick={() => setMethod(opt.method)}
            >
              <span className="emoji">{opt.emoji}</span>
              <span>
                <b>{PAYMENT_LABELS[opt.method]}</b>
                <span>{opt.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="note">Nota (opcional)</label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: pago a 15/03 às 20h"
          />
        </div>

        <div className="row">
          <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn" type="button" onClick={() => setAsking(true)} disabled={busy}>
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
