import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  getUser,
  handleAuthCallback,
  onAuthChange,
  type User,
} from '@netlify/identity'
import { Landmark } from 'lucide-react'
import { AuthPortal } from '@/components/AuthPortal'
import { RecoveryDashboard } from '@/components/RecoveryDashboard'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthChange((_event, nextUser) => {
      if (active) setUser(nextUser)
    })

    const establishSession = async () => {
      try {
        await handleAuthCallback()
        const currentUser = await getUser()
        if (active) setUser(currentUser)
      } catch {
        if (active) setUser(null)
      } finally {
        if (active) setCheckingSession(false)
      }
    }

    void establishSession()
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (checkingSession) {
    return (
      <div className="loading-screen">
        <div className="loading-wordmark wordmark">
          <span className="wordmark-mark"><Landmark size={18} /></span>
          DIABITRAGE
        </div>
        <div className="loading-line"><span /></div>
        <p>Validating secure desk credentials</p>
      </div>
    )
  }

  if (!user) return <AuthPortal onAuthenticated={setUser} />

  return <RecoveryDashboard user={user} onSignedOut={() => setUser(null)} />
}
