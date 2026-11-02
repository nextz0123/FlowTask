import { useEffect, useState } from 'react'
import type { Session } from '../types'
import { disablePush, enablePush, getPushState, sendTestNotification, type PushState } from '../lib/push'

interface Props {
  session: Session
}

export function PushSettings({ session }: Props) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tested, setTested] = useState(false)

  useEffect(() => {
    let alive = true
    void getPushState(session).then((s) => {
      if (alive) setState(s)
    })
    return () => {
      alive = false
    }
  }, [session])

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      const next = state === 'on' ? await disablePush(session) : await enablePush(session)
      setState(next)
      if (next === 'denied') {
        setError('Bloqueaste as notificações. Para ativar, vai às definições do browser.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar as notificações.')
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setTested(false)
    await sendTestNotification()
    setTested(true)
  }

  if (state === null) return null

  if (state === 'demo') {
    return (
      <div className="push-box">
        <div className="push-head">
          <span className="push-icon">🔔</span>
          <div>
            <b>Notificações</b>
            <p>Só funcionam com a app ligada à nuvem (Supabase).</p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'unsupported') {
    return (
      <div className="push-box">
        <div className="push-head">
          <span className="push-icon">🔕</span>
          <div>
            <b>Notificações indisponíveis</b>
            <p>
              Este browser não suporta notificações. No iPhone, instala a app no ecrã inicial
              (Partilhar → Adicionar ao Ecrã Principal).
            </p>
          </div>
        </div>
      </div>
    )
  }

  const on = state === 'on'

  return (
    <div className={`push-box ${on ? 'on' : ''}`}>
      <div className="push-head">
        <span className="push-icon">{on ? '🔔' : '🔕'}</span>
        <div style={{ flex: 1 }}>
          <b>{on ? 'Notificações ativas' : 'Notificações desligadas'}</b>
          <p>
            {on
              ? 'Vais receber avisos neste aparelho, mesmo com a app fechada.'
              : 'Ativa para receber avisos de tarefas e pagamentos.'}
          </p>
        </div>
      </div>

      <div className="push-actions">
        <button
          className={`btn ${on ? 'ghost' : ''} small`}
          onClick={() => void toggle()}
          disabled={busy || state === 'denied'}
        >
          {busy ? 'A alterar…' : on ? 'Desligar' : '🔔 Ativar notificações'}
        </button>
        {on && (
          <button className="btn ghost small" onClick={() => void test()}>
            {tested ? '✅ Enviada' : 'Testar'}
          </button>
        )}
      </div>

      {state === 'denied' && (
        <p className="push-error">
          Bloqueaste as notificações. Abre as definições do browser (cadeado ao lado do link) e
          permite notificações.
        </p>
      )}
      {error && <p className="push-error">{error}</p>}
    </div>
  )
}
