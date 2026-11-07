import { APP_VERSION, APP_VERSION_DATE } from '../lib/version'

interface Props {
  /** Variante compacta (só a linha de versão, sem data). */
  compact?: boolean
}

/**
 * Mostra a versão da app.
 * Aparece no Login e no fundo dos ecrãs principais.
 */
export function VersionTag({ compact = false }: Props) {
  return (
    <p className={`version-tag ${compact ? 'compact' : ''}`} title={`Versão de ${APP_VERSION_DATE}`}>
      FlowTask <b>v{APP_VERSION}</b>
      {!compact && <span> · {APP_VERSION_DATE}</span>}
    </p>
  )
}
