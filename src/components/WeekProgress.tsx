import { formatEuro } from '../lib/week'

interface Props {
  /** Total que já está concluído e por pagar nesta semana. */
  doneCents: number
  /** Total de tudo o que foi criado nesta semana (feito + por fazer). */
  totalCents: number
  doneCount: number
  totalCount: number
  /** Fundo claro (painel do chefe) em vez do fundo azul do hero. */
  onLight?: boolean
}

/**
 * Barra de progresso da semana: quanto já está feito do que foi combinado.
 * Ajuda a perceber num relance se a semana está a meio ou quase no fim.
 */
export function WeekProgress({
  doneCents,
  totalCents,
  doneCount,
  totalCount,
  onLight = false,
}: Props) {
  if (totalCount === 0) return null

  const percent = totalCents > 0 ? Math.round((doneCents / totalCents) * 100) : 0
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <div className={`week-progress ${onLight ? 'on-light' : ''}`}>
      <div className="wp-head">
        <span>
          Esta semana · {doneCount} de {totalCount} tarefa{totalCount === 1 ? '' : 's'}
        </span>
        <b>{clamped}%</b>
      </div>
      <div
        className="wp-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso das tarefas desta semana"
      >
        <div className="wp-fill" style={{ width: `${clamped}%` }} />
      </div>
      {totalCents > 0 && (
        <div className="wp-head" style={{ marginTop: 8, marginBottom: 0, opacity: 0.85 }}>
          <span>{formatEuro(doneCents)} feitos</span>
          <span>de {formatEuro(totalCents)}</span>
        </div>
      )}
    </div>
  )
}
