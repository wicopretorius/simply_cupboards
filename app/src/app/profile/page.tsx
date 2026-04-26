'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readMe } from '@directus/sdk'
import { StatusBar, BottomNav, Spinner } from '@/components/SharedUI'

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    directus.request(readMe())
      .then((me) => setEmail((me as { email: string }).email ?? ''))
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    await directus.logout()
    router.replace('/login')
  }

  if (loading) return <><StatusBar /><Spinner /><BottomNav /></>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <StatusBar />

      <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Avatar */}
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
            background: 'linear-gradient(135deg,#C8A96E,#A07840)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700, color: '#0F0F0E',
          }}>
            {email[0]?.toUpperCase()}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#F2EDE6' }}>{email}</div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            marginTop: 'auto', padding: '15px', borderRadius: 12, border: '1px solid #3A3835',
            background: '#1A1917', color: '#E05C5C', fontSize: 14, fontWeight: 600,
          }}
        >
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
