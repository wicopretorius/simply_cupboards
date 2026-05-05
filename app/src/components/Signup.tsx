'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:8055'

export default function Signup() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    background: '#1A1917', border: '1px solid #3A3835',
    color: '#F2EDE6', fontSize: 14, outline: 'none',
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${DIRECTUS_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          ...(lastName ? { last_name: lastName } : {}),
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.errors?.[0]?.message ?? 'Registration failed')
      }
      await directus.login({ email, password })
      router.replace('/designs')
    } catch (err: any) {
      const msg = err?.message ?? ''
      if (msg.toLowerCase().includes('registered')) {
        setError('An account with this email already exists.')
      } else if (msg.toLowerCase().includes('not allowed') || msg.toLowerCase().includes('disabled')) {
        setError('Registration is currently disabled. Please contact support.')
      } else {
        setError('Sign up failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 28px' }}>

      {/* Header */}
      <div style={{ paddingTop: 48, paddingBottom: 32, textAlign: 'center' }}>
        <img
          src="/logo.png"
          alt="Design My Cupboards"
          style={{ width: 220, height: 'auto', margin: '0 auto', display: 'block' }}
        />
      </div>

      {/* Form */}
      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Jane"
              required
              style={inp}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Smith"
              style={inp}
            />
          </div>
        </div>

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
              placeholder="Min. 8 characters"
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

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Confirm Password
          </label>
          <input
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
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
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      {/* Footer */}
      <div style={{ marginTop: 24, paddingBottom: 40, textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: '#4A4845' }}>Already have an account? </span>
        <button
          onClick={() => router.push('/login')}
          style={{ background: 'none', border: 'none', color: '#C8A96E', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Sign in
        </button>
      </div>
    </div>
  )
}
