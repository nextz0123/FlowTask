import { useEffect, useState } from 'react'
import {
  applyDailyReminder,
  formatHour,
  readReminderConfig,
  type DailyReminderConfig,
} from '../lib/local-notify'
import { isNativeApp } from '../lib/native-push'
import { tapLight } from '../lib/native-ui'

interface Props {
  /** Quantas tarefas estão por fazer (usado na mensagem do aviso). */
  pendingCount: number
}

/** Horas sugeridas para o aviso diário. */
const HOUR_OPTIONS = [8, 9, 12, 14, 17, 18, 19, 20, 21]

/**
 * Definições próprias de app de telemóvel: aviso diário à hora escolhida.
 * Só aparece dentro do APK — no browser não há avisos agendados.
 */
export function AppSettings({ pendingCount }: Props) {
  const [cfg, setCfg] = useState<DailyReminderConfig>(() => readReminderConfig())
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const native = isNativeApp()

  useEffect(() => {
    // Se a app foi reinstalada mas o aviso estava ligado, volta a agendar.
    if (cfg.enabled && native) {
      void applyDailyReminder(cfg, buildMessage(pendingCount))
    }
    // Só na primeira montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function buildMessage(count: number): string {
    if (count === 0) return 'Não tens tarefas por fazer. Bom trabalho! 🎉'
    return count === 1
      ? 'Tens 1 tarefa por fazer. Vê na app.'
      : `Tens ${count} tarefas por fazer. Vê na app.`
  }

  async function toggle() {
    setBusy(true)
    setNote(null)
    void tapLight()
    const next = { ...cfg, enabled: !cfg.enabled }
    const res = await applyDailyReminder(next, buildMessage(pendingCount))
    if (res.ok) {
      setCfg(next)
      setNote(next.enabled ? `Aviso diário ligado para as ${formatHour(next)}.` : 'Aviso diário desligado.')
    } else {
      setNote(res.reason ?? 'Não foi possível ativar.')
    }
    setBusy(false)
  }

  async function changeHour(hour: number) {
    const next = { ...cfg, hour }
    setCfg(next)
    void tapLight()
    if (next.enabled) {
      const res = await applyDailyReminder(next, buildMessage(pendingCount))
      if (!res.ok) setNote(res.reason ?? 'Não foi possível alterar a hora.')
      else setNote(`Aviso diário passou para as ${formatHour(next)}.`)
    }
  }

  // No browser: mostra apenas a explicação.
  if (!native) {
    return (
      <div className="push-box">
        <div className="push-head">
          <span className="push-icon">⏰</span>
          <div>
            <b>Aviso diário</b>
            <p>
              Os avisos à hora marcada funcionam na <b>app instalada</b> (APK). No browser recebes
              avisos quando há novidades, mas não a horas fixas.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`push-box ${cfg.enabled ? 'on' : ''}`}>
      <div className="push-head">
        <span className="push-icon">⏰</span>
        <div style={{ flex: 1 }}>
          <b>Aviso diário</b>
          <p>
            {cfg.enabled
              ? `Todos os dias às ${formatHour(cfg)}.`
              : 'Um lembrete por dia, à hora que escolheres.'}
          </p>
        </div>
      </div>

      <div className="push-actions">
        <button className={`btn ${cfg.enabled ? 'ghost' : ''} small`} onClick={() => void toggle()} disabled={busy}>
          {busy ? 'A alterar…' : cfg.enabled ? 'Desligar' : '⏰ Ligar aviso diário'}
        </button>
      </div>

      {cfg.enabled && (
        <>
          <p className="settings-label">A que horas?</p>
          <div className="hour-grid">
            {HOUR_OPTIONS.map((h) => (
              <button
                key={h}
                className={`hour-chip ${cfg.hour === h ? 'on' : ''}`}
                onClick={() => void changeHour(h)}
              >
                {String(h).padStart(2, '0')}:00
              </button>
            ))}
          </div>
        </>
      )}

      {note && <p className="settings-note">{note}</p>}
    </div>
  )
}
