'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/lib/useRole'
import { Spinner } from './SharedUI'
import type { AppRole } from '@/lib/types'

const ALL_ROLES: AppRole[] = ['Free', 'User', 'Designer', 'Business', 'Client', 'Admin']

interface AppUser {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  status: string
  role: { id: string; name: string } | null
  subscription_start_date: string | null
  subscription_end_date: string | null
  subscription_months: number | null
  subscription_indefinite: boolean | null
}

const ROLE_COLORS: Record<string, string> = {
  Free: '#6A6560', User: '#6A9EC8', Designer: '#C8A96E',
  Business: '#50B4C8', Client: '#9A6EC8', Admin: '#E05C5C', Administrator: '#E05C5C',
}

export default function AdminPanel() {
  const router = useRouter()
  const { isAdmin, loading: roleLoading } = useRole()
  const [users, setUsers]         = useState<AppUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<AppUser | null>(null)
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    if (!roleLoading && !isAdmin) router.replace('/designs')
  }, [isAdmin, roleLoading, router])

  useEffect(() => {
    if (roleLoading || !isAdmin) return
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [roleLoading, isAdmin])

  const save = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await fetch(`/api/admin/users/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editing.role?.id,
          subscription_start_date: editing.subscription_start_date || null,
          subscription_end_date: editing.subscription_end_date || null,
          subscription_months: editing.subscription_months || null,
          subscription_indefinite: editing.subscription_indefinite ?? false,
        }),
      })
      setUsers(u => u.map(x => x.id === editing.id ? editing : x))
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  const ROLE_IDS: Record<string, string> = {
    Free: '6bd8db09-cbf3-425b-84da-4d4de2cfe11e',
    User: 'e95ff781-3bb4-4577-9104-a4a331d1942d',
    Designer: '6b8e134f-8922-445f-9fff-4f46a4ba8d4b',
    Business: '6d090944-4e51-438e-a9cb-5bf98b5612b2',
    Client: '54b85508-1d0c-4ca0-98e9-fe967c76d6a3',
    Admin: '7a39afe5-cf12-4886-b131-e19915e10111',
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    background: '#1A1917', border: '1px solid #3A3835',
    color: '#F2EDE6', fontSize: 13, outline: 'none',
  }

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  if (roleLoading || loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#C8A96E', cursor: 'pointer', padding: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#F2EDE6' }}>App Users</div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#6A6560' }}>{users.length} total</div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 20px 12px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email…"
          style={inp}
        />
      </div>

      {/* User list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(u => {
          const roleName = u.role?.name ?? 'No role'
          const roleColor = ROLE_COLORS[roleName] ?? '#6A6560'
          const expired = u.subscription_end_date && !u.subscription_indefinite
            ? new Date(u.subscription_end_date) < new Date() : false

          return (
            <div key={u.id} style={{
              background: '#1A1917', borderRadius: 14, padding: '14px 16px',
              border: '1px solid #2A2825', cursor: 'pointer',
            }} onClick={() => setEditing({ ...u })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F2EDE6' }}>
                    {u.first_name} {u.last_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6A6560' }}>{u.email}</div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: roleColor,
                  background: `${roleColor}22`, padding: '3px 8px', borderRadius: 6,
                }}>
                  {roleName}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#4A4845' }}>
                {u.subscription_indefinite ? (
                  <span style={{ color: '#6EC87A' }}>Indefinite</span>
                ) : u.subscription_end_date ? (
                  <span style={{ color: expired ? '#E05C5C' : '#9A9590' }}>
                    {expired ? 'Expired' : 'Expires'} {new Date(u.subscription_end_date).toLocaleDateString()}
                  </span>
                ) : (
                  <span>No subscription</span>
                )}
                {u.subscription_months && <span>{u.subscription_months}mo</span>}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#4A4845', padding: 32 }}>No users found</div>
        )}
      </div>

      {/* Edit drawer */}
      {editing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setEditing(null)}>
          <div style={{
            width: '100%', maxWidth: 480, margin: '0 auto',
            background: '#1A1917', borderRadius: '20px 20px 0 0', padding: '20px 20px 40px',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F2EDE6', marginBottom: 4 }}>
              {editing.first_name} {editing.last_name}
            </div>
            <div style={{ fontSize: 12, color: '#6A6560', marginBottom: 20 }}>{editing.email}</div>

            {/* Role */}
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Role</label>
            <select value={editing.role?.name ?? ''} onChange={e => setEditing(prev => prev ? {
              ...prev, role: { id: ROLE_IDS[e.target.value], name: e.target.value }
            } : null)} style={{ ...inp, marginBottom: 14 }}>
              {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {/* Subscription dates */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Start Date</label>
                <input type="date" value={editing.subscription_start_date?.split('T')[0] ?? ''} onChange={e => setEditing(p => p ? { ...p, subscription_start_date: e.target.value } : null)} style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>End Date</label>
                <input type="date" value={editing.subscription_end_date?.split('T')[0] ?? ''} onChange={e => setEditing(p => p ? { ...p, subscription_end_date: e.target.value } : null)} style={inp} />
              </div>
            </div>

            <label style={{ fontSize: 11, fontWeight: 600, color: '#6A6560', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Months Purchased</label>
            <input type="number" min={1} value={editing.subscription_months ?? ''} onChange={e => setEditing(p => p ? { ...p, subscription_months: parseInt(e.target.value) || null } : null)} style={{ ...inp, marginBottom: 14 }} />

            {/* Indefinite toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#F2EDE6' }}>Indefinite access</div>
              <div style={{ marginLeft: 'auto' }} onClick={() => setEditing(p => p ? { ...p, subscription_indefinite: !p.subscription_indefinite } : null)}>
                <div style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                  background: editing.subscription_indefinite ? '#C8A96E' : '#3A3835',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: editing.subscription_indefinite ? 22 : 2,
                    width: 20, height: 20, borderRadius: 10, background: '#F2EDE6',
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            </div>

            <button onClick={save} disabled={saving} style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
              background: saving ? '#5A4A30' : 'linear-gradient(135deg,#C8A96E,#A07840)',
              color: '#0F0F0E', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
            }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
