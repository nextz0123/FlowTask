import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Ação a correr quando o utilizador puxa. Deve devolver uma Promise. */
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

/** Distância (px) que é preciso puxar para disparar a atualização. */
const TRIGGER = 68
/** Limite máximo de deslocamento visual. */
const MAX_PULL = 110

/**
 * Puxar para atualizar — gesto típico de app de telemóvel.
 * Arrastar o ecrã para baixo a partir do topo sincroniza com a nuvem.
 *
 * Só reage quando a página já está no topo, para não interferir
 * com a rolagem normal da lista.
 */
export function PullToRefresh({ onRefresh, children }: Props) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const startY = useRef<number | null>(null)
  const active = useRef(false)

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (busy) return
      // Só começa se a página estiver no topo
      if (window.scrollY > 2) return
      startY.current = e.touches[0].clientY
      active.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current || startY.current === null) return
      const delta = e.touches[0].clientY - startY.current

      // Para cima: não é este gesto
      if (delta <= 0) {
        setPull(0)
        return
      }

      // Resistência: quanto mais puxa, mais custa (sensação nativa)
      const resisted = Math.min(MAX_PULL, delta * 0.5)
      setPull(resisted)
    }

    function onTouchEnd() {
      if (!active.current) return
      active.current = false
      startY.current = null

      setPull((current) => {
        if (current >= TRIGGER * 0.5 && !busy) {
          setBusy(true)
          void onRefresh().finally(() => {
            setBusy(false)
            setPull(0)
          })
          return TRIGGER * 0.6
        }
        return 0
      })
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh, busy])

  const ready = pull >= TRIGGER * 0.5

  return (
    <>
      {/* Indicador que aparece ao puxar */}
      <div
        className="ptr"
        style={{
          height: busy ? 52 : pull,
          opacity: pull > 4 || busy ? 1 : 0,
        }}
        aria-hidden={pull < 4 && !busy}
      >
        <div className={`ptr-inner ${busy ? 'spinning' : ready ? 'ready' : ''}`}>
          <span className="ptr-icon">{busy ? '⏳' : ready ? '↻' : '↓'}</span>
          <span className="ptr-text">
            {busy ? 'A sincronizar…' : ready ? 'Larga para atualizar' : 'Puxa para atualizar'}
          </span>
        </div>
      </div>

      <div
        style={{
          transform: pull > 0 ? `translateY(${pull * 0.35}px)` : undefined,
          transition: pull > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {children}
      </div>
    </>
  )
}
