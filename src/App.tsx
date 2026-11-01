import { lazy, Suspense, useState } from 'react'
import type { Session } from './types'
import { loadSession, saveSession } from './lib/store'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'

// Demonstração do tema iOS — só carrega em /demo
const IosDemo = lazy(() => import('./pages/IosDemo'))

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())

  // Rota de demonstração (não afeta a app)
  if (window.location.pathname === '/demo') {
    return (
      <Suspense fallback={null}>
        <IosDemo />
      </Suspense>
    )
  }

  function handleJoined(next: Session) {
    saveSession(next)
    setSession(next)
  }

  function handleLogout() {
    saveSession(null)
    setSession(null)
  }

  if (!session) return <Login onJoined={handleJoined} />
  return <Dashboard session={session} onLogout={handleLogout} />
}
