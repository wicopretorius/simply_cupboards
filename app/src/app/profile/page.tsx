'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readMe, updateMe, uploadFiles } from '@directus/sdk'
import { BottomNav, Spinner } from '@/components/SharedUI'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:8055'

interface Me {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar?: string | null
}

const inp: React.CSSProperties = {
  width: '100%', padding: '13px 14px', borderRadius: 12, boxSizing: 'border-box',
  background: '#1A1917', border: '1px solid #3A3835',
  color: '#F2EDE6', fontSize: 14, outline: 'none',
}
const label: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#6A6560',
  textTransform: 'uppercase', letterSpacing: '0.5px',
  display: 'block', marginBottom: 6,
}
const section: React.CSSProperties = {
  background: '#1A1917', border: '1px solid #2A2825',
  borderRadius: 16, padding: '18px 16px',
  display: 'flex', flexDirection: 'column', gap: 14,
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [pwSaving, setPwSaving]   = useState(false)
  const [toast, setToast]         = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')

  const [avatarId, setAvatarId]    = useState<string | null>(null)
  const [avatarSrc, setAvatarSrc]  = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const fileInputRef               = useRef<HTMLInputElement>(null)

  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [pwError, setPwError]     = useState('')

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || email[0]?.toUpperCase() || '?'

  useEffect(() => {
    directus.request(readMe({ fields: ['id', 'first_name', 'last_name', 'email', 'phone', 'avatar'] as any }))
      .then(me => {
        const u = me as unknown as Me
        setFirstName(u.first_name ?? '')
        setLastName(u.last_name ?? '')
        setEmail(u.email ?? '')
        setPhone(u.phone ?? '')
        if (u.avatar) {
          setAvatarId(u.avatar)
          // Fetch as blob so auth cookie is sent (cross-port <img src> can't send cookies)
          fetch(`${DIRECTUS_URL}/assets/${u.avatar}?width=152&height=152&fit=cover`, { credentials: 'include' })
            .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.blob() })
            .then(b => setAvatarSrc(URL.createObjectURL(b)))
            .catch(err => console.warn('Avatar fetch failed:', err))
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleAvatarCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Show preview instantly from local file
    const localSrc = URL.createObjectURL(file)
    setAvatarSrc(localSrc)
    setAvatarBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const result = await directus.request(uploadFiles(form)) as any
      const fileId = (result?.id ?? result?.data?.id) as string
      await directus.request(updateMe({ avatar: fileId } as any))
      setAvatarId(fileId)
      showToast('Photo updated')
    } catch {
      setAvatarSrc(avatarId ? avatarSrc : null)  // revert on error
      showToast('Failed to upload photo')
    } finally {
      setAvatarBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await directus.request(updateMe({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
      } as any))
      showToast('Profile saved')
    } catch {
      showToast('Failed to save — try again')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPwError('')
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return }
    setPwSaving(true)
    try {
      await directus.request(updateMe({ password: newPw } as any))
      setNewPw('')
      setConfirmPw('')
      showToast('Password updated')
    } catch {
      setPwError('Failed to update password')
    } finally {
      setPwSaving(false)
    }
  }

  const handleLogout = async () => {
    try { await directus.logout() } catch { /* ignore — still redirect */ }
    router.replace('/login')
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Spinner />
      <BottomNav />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#2A2825', border: '1px solid #3A3835', borderRadius: 20,
          padding: '10px 20px', fontSize: 13, color: '#F2EDE6', fontWeight: 500,
          zIndex: 300, whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Avatar + name */}
        <div style={{ textAlign: 'center', paddingBottom: 4 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            style={{ display: 'none' }}
            onChange={handleAvatarCapture}
          />
          <div
            onClick={() => !avatarBusy && fileInputRef.current?.click()}
            style={{ position: 'relative', display: 'inline-block', margin: '0 auto 12px', cursor: 'pointer' }}
          >
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: avatarSrc ? 'transparent' : 'linear-gradient(135deg,#C8A96E,#A07840)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: '#0F0F0E',
              overflow: 'hidden', border: '2px solid rgba(200,169,110,0.3)',
            }}>
              {avatarSrc
                ? <img src={avatarSrc} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : avatarBusy
                  ? <div style={{ width: 24, height: 24, border: '2px solid #0F0F0E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : initials
              }
            </div>
            {/* Camera badge */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 24, height: 24, borderRadius: '50%',
              background: '#C8A96E', border: '2px solid #0F0F0E',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F0F0E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#F2EDE6' }}>
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Your Profile'}
          </div>
          <div style={{ fontSize: 12, color: '#6A6560', marginTop: 4 }}>{email}</div>
        </div>

        {/* Personal info */}
        <div style={section}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#C8A96E', marginBottom: 2 }}>Personal Information</div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={label}>First Name</span>
              <input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
            </div>
            <div style={{ flex: 1 }}>
              <span style={label}>Last Name</span>
              <input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
            </div>
          </div>

          <div>
            <span style={label}>Email</span>
            <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>

          <div>
            <span style={label}>Phone</span>
            <input style={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27 82 000 0000" />
          </div>

          <button onClick={handleSaveProfile} disabled={saving} style={{
            padding: '13px', borderRadius: 12, border: 'none',
            background: saving ? '#5A4A30' : 'linear-gradient(135deg,#C8A96E,#A07840)',
            color: '#0F0F0E', fontSize: 14, fontWeight: 700,
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

        {/* Change password */}
        <div style={section}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#C8A96E', marginBottom: 2 }}>Change Password</div>

          <div style={{ position: 'relative' }}>
            <span style={label}>New Password</span>
            <input
              style={{ ...inp, paddingRight: 44 }}
              type={showPw ? 'text' : 'password'}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Min. 8 characters"
            />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{
              position: 'absolute', right: 12, bottom: 13,
              background: 'none', border: 'none', color: '#6A6560', cursor: 'pointer',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {showPw
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                }
              </svg>
            </button>
          </div>

          <div>
            <span style={label}>Confirm Password</span>
            <input
              style={inp}
              type={showPw ? 'text' : 'password'}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
            />
          </div>

          {pwError && (
            <div style={{ fontSize: 12, color: '#E05C5C' }}>{pwError}</div>
          )}

          <button onClick={handleChangePassword} disabled={pwSaving || !newPw} style={{
            padding: '13px', borderRadius: 12,
            background: pwSaving || !newPw ? '#242220' : '#1A1917',
            border: `1px solid ${!newPw ? '#2A2825' : '#C8A96E'}`,
            color: !newPw ? '#4A4845' : '#C8A96E',
            fontSize: 14, fontWeight: 700,
            opacity: pwSaving ? 0.7 : 1,
          }}>
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>

        {/* Sign out */}
        <button onClick={handleLogout} style={{
          padding: '15px', borderRadius: 12,
          background: 'rgba(224,92,92,0.08)', border: '1px solid rgba(224,92,92,0.25)',
          color: '#E05C5C', fontSize: 14, fontWeight: 600,
        }}>
          Sign Out
        </button>

      </div>

      <BottomNav />
    </div>
  )
}
