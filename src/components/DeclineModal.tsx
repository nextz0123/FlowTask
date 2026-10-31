import { useState } from 'react'
import type { Session, Task } from '../types'
import { formatEuro } from '../lib/week'
import { store } from '../lib/store'

interface Props {
  session: Session
  task: Task
  onDone: () => void
  onClose: () => void
}

const PRESETS = [
  { emoji: '⏰', label: 'Não tenho tempo hoje' },
  { emoji: '🤒', label: 'Não me sinto bem' },
  { emoji: '🎒', label: 'Tenho compromissos (escola/trabalho)' },
  { emoji: '🧰', label: 'Falta-me material/ferramenta' },
  { emoji: '💪', label: 'É demasiado pesado para mim' },
  { emoji: '🙅', label: 'Não sei fazer esta tarefa' },
]

const OTHER = '__outro__'

export function DeclineModal({ session, task, onDone, onClose }: Props) {
  const [choice, setChoice] = useState<string>('')
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOther = choice === OTHER
  const reason = isOther ? custom.trim() : choice
  const canConfirm = reason.length > 0

  async function confirm() {
    if (!canConfirm) return
    setBusy(true)
    setError(null)
    try {
      await store.declineTask(session, task.id, reason)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível recusar a tarefa.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Não fazer esta tarefa</h3>
        <p className="lead">
          <b>{task.title}</b> · {formatEuro(task.price_cents)}
        </p>

        <div className="field">
          <label>Porque não podes fazer? (obrigatório)</label>
          <div className="pay-options" style={{ margin: '4px 0 0' }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`pay-option ${choice === p.label ? 'on' : ''}`}
                onClick={() => setChoice(p.label)}
              >
                <span className="emoji">{p.emoji}</span>
                <span>
                  <b>{p.label}</b>
                </span>
              </button>
            ))}
            <button
              type="button"
              className={`pay-option ${isOther ? 'on' : ''}`}
              onClick={() => setChoice(OTHER)}
            >
              <span className="emoji">✍️</span>
              <span>
                <b>Outro motivo…</b>
                <span>Escreve tu o motivo</span>
              </span>
            </button>
          </div>
        </div>

        {isOther && (
          <div className="field">
            <label htmlFor="reason">Escreve o motivo</label>
            <textarea
              id="reason"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Ex.: Só volto a casa depois das 22h."
              rows={3}
              maxLength={280}
              autoFocus
            />
            <span className="small muted">{custom.trim().length}/280</span>
          </div>
        )}

        <div className="row">
          <button className="btn ghost" type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn danger" type="button" onClick={confirm} disabled={busy || !canConfirm}>
            {busy ? 'A enviar…' : 'Recusar tarefa'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
