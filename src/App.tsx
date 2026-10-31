import { useState } from 'react'
import type { Session } from './types'
import { loadSession, saveSession } from './lib/store'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())

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
