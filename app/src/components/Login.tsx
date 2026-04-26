'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'

export default function Login() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await directus.login({ email, password })
      router.replace('/discover')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    background: '#1A1917', border: '1px solid #3A3835',
    color: '#F2EDE6', fontSize: 14, outline: 'none',
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px' }}>

      {/* Header */}
      <div style={{ paddingTop: 64, paddingBottom: 40, textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
          background: 'linear-gradient(135deg,#C8A96E,#A07840)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0F0F0E" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#F2EDE6', marginBottom: 6 }}>
          Simply Cupboards
        </div>
        <div style={{ fontSize: 13, color: '#6A6560' }}>
          Design your dream kitchen
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            style={inp}
          />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={inp}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#E05C5C', textAlign: 'center', padding: '8px 0' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8, padding: '15px 0', borderRadius: 12, border: 'none',
            background: loading ? '#5A4A30' : 'linear-gradient(135deg,#C8A96E,#A07840)',
            color: '#0F0F0E', fontSize: 15, fontWeight: 700,
            transition: 'opacity 0.15s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#2A2825' }} />
        <span style={{ fontSize: 12, color: '#4A4845' }}>or continue with</span>
        <div style={{ flex: 1, height: 1, background: '#2A2825' }} />
      </div>

      {/* Social buttons (decorative) */}
      <div style={{ display: 'flex', gap: 12 }}>
        {['G', 'f', 'in'].map(label => (
          <button
            key={label}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 12,
              background: '#1A1917', border: '1px solid #3A3835',
              color: '#6A6560', fontSize: 14, fontWeight: 600,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingBottom: 40, textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: '#4A4845' }}>Don't have an account? </span>
        <button style={{ background: 'none', border: 'none', color: '#C8A96E', fontSize: 13, fontWeight: 600 }}>
          Sign up
        </button>
      </div>
    </div>
  )
}
