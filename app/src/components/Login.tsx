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
  const [showPw, setShowPw]     = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await directus.login({ email, password })
      router.replace('/designs')
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
        <img
          src="/logo.png"
          alt="Design My Cupboards"
          style={{ width: 220, height: 'auto', margin: '0 auto 8px', display: 'block' }}
        />
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
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ ...inp, paddingRight: 48 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(p => !p)}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', padding: 4, cursor: 'pointer',
                color: '#6A6560', display: 'flex', alignItems: 'center',
              }}
            >
              {showPw ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
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
      <div style={{ marginTop: 24, paddingBottom: 40, textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: '#4A4845' }}>Don't have an account? </span>
        <button style={{ background: 'none', border: 'none', color: '#C8A96E', fontSize: 13, fontWeight: 600 }}>
          Sign up
        </button>
      </div>
    </div>
  )
}
