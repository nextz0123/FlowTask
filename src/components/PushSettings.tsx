import { useEffect, useState } from 'react'
import type { Session } from '../types'
import { disablePush, enablePush, getPushState, sendTestNotification } from '../lib/push'
import { disableNativePush, enableNativePush, isNativeApp } from '../lib/native-push'

interface Props {
  session: Session
}

/** Estado unificado, seja browser (Web Push) ou APK (FCM). */
type UiState = 'loading' | 'on' | 'off' | 'denied' | 'unsupported' | 'not-configured' | 'demo' | 'error'

export function PushSettings({ session }: Props) {
  const native = isNativeApp()
  const [state, setState] = useState<UiState>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tested, setTested] = useState(false)

  useEffect(() => {
    let alive = true

    async function load() {
      // No APK nativo, o estado é simples: ligado ou desligado.
      if (native) {
        const token = localStorage.getItem('flowtask-fcm-token')
        if (alive) setState(token ? 'on' : 'off')
        return
      }
      const s = await getPushState(session)
      if (alive) setState(s === 'on' ? 'on' : s === 'off' ? 'off' : (s as UiState))
    }

    void load()
    return () => {
      alive = false
    }
  }, [session, native])

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      if (native) {
        if (state === 'on') {
          await disableNativePush(session)
          setState('off')
        } else {
          const res = await enableNativePush(session)
          if (res === 'on') setState('on')
          else if (res === 'denied') {
            setState('denied')
            setError('Recusaste as notificações. Ativa-as nas definições do telemóvel.')
          } else {
            setError('Não foi possível ativar. Confirma a ligação à internet e tenta outra vez.')
          }
        }
      } else {
        const next = state === 'on' ? await disablePush(session) : await enablePush(session)
        setState(next as UiState)
        if (next === 'denied') {
          setError('Bloqueaste as notificações. Para ativar, vai às definições do browser.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível alterar as notificações.')
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setTested(false)
    if (native) {
      // No APK o teste real chega pelo Firebase; mostramos confirmação imediata.
      setTested(true)
      return
    }
    await sendTestNotification()
    setTested(true)
  }

  if (state === 'loading') return null

  if (state === 'demo') {
    return (
      <div className="push-box">
        <div className="push-head">
          <span className="push-icon">🔔</span>
          <div>
            <b>Notificações desligadas</b>
            <p>
              A app está em <b>modo demonstração</b> — faltam as chaves da Supabase. Depois de as
              configurar, esta opção fica disponível.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'not-configured') {
    return (
      <div className="push-box">
        <div className="push-head">
          <span className="push-icon">⚙️</span>
          <div>
            <b>Notificações por configurar</b>
            <p>
              Falta a chave <code>VITE_VAPID_PUBLIC_KEY</code> no build. Adiciona-a nas variáveis de
              ambiente da Vercel e faz um deploy novo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'unsupported' && !native) {
    return (
      <div className="push-box">
        <div className="push-head">
          <span className="push-icon">🔕</span>
          <div>
            <b>Este browser não suporta notificações</b>
            <p>
              No iPhone tens de instalar a app: <b>Safari → Partilhar → Adicionar ao Ecrã
              Principal</b> e abrir pelo ícone. No PC, usa Chrome ou Edge.
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
          {native
            ? 'Recusaste as notificações. Abre as Definições do telemóvel → Apps → FlowTask → Notificações → Permitir.'
            : 'Bloqueaste as notificações. Abre as definições do browser (cadeado ao lado do link) e permite notificações.'}
        </p>
      )}
      {error && <p className="push-error">{error}</p>}
    </div>
  )
}
