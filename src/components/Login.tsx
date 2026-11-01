import { useState } from 'react'
import type { Role, Session } from '../types'
import { isCloudMode, store } from '../lib/store'

interface Props {
  onJoined: (session: Session) => void
}

export function Login({ onJoined }: Props) {
  const [code, setCode] = useState('')
  const [role, setRole] = useState<Role>('trabalhador')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return setError('Escreve o código da família.')
    if (!name.trim()) return setError('Escreve o teu nome.')
    setBusy(true)
    setError(null)
    try {
      const session = await store.join(code, role, name)
      onJoined(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="panel">
        <div className="logo">
          <img src="/favicon.svg" alt="" />
          <h1>FlowTask</h1>
          <p>As tarefas de casa, o valor de cada uma e o pagamento no fim da semana.</p>
        </div>

        {!isCloudMode && (
          <div className="demo-banner">
            <b>Modo demonstração.</b> Os dados ficam só neste aparelho. Usa o código{' '}
            <b>FAMILIA</b> para entrar. Para sincronizar com o telemóvel da tua mãe, segue o
            README e liga o Supabase.
          </div>
        )}

        <form className="card" onSubmit={submit}>
          <div className="field">
            <label htmlFor="code">Código da família</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex.: FAMILIA"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label>Quem és tu?</label>
            <div className="role-picker">
              <button
                type="button"
                className={`role ${role === 'chefe' ? 'on' : ''}`}
                onClick={() => setRole('chefe')}
              >
                <span className="emoji">💼</span>
                Chefe
              </button>
              <button
                type="button"
                className={`role ${role === 'trabalhador' ? 'on' : ''}`}
                onClick={() => setRole('trabalhador')}
              >
                <span className="emoji">🧑</span>
                Trabalhador
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="name">O teu nome</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'chefe' ? 'Ex.: Mãe' : 'Ex.: João'}
              autoComplete="given-name"
            />
          </div>

          <p className="code-hint" style={{ marginBottom: 12, textAlign: 'left' }}>
            <b>Chefe</b> cria as tarefas e paga. <b>Trabalhador</b> faz as tarefas e recebe.
          </p>

          <button className="btn block" type="submit" disabled={busy}>
            {busy ? 'A entrar…' : 'Entrar'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>

        <p className="code-hint">
          O código é o mesmo em todos os aparelhos da família. Podes vê-lo na app da tua mãe, no
          topo do ecrã.
        </p>
      </div>
    </div>
  )
}
