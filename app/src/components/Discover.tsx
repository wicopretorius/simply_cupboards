'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItems, readMe, createItem } from '@directus/sdk'
import type { Design } from '@/lib/types'
import { BADGE_STYLES } from '@/lib/types'
import { StatusBar, BottomNav, BellIcon, SearchIcon, PlusIcon, IconBtn, Spinner } from './SharedUI'

export default function Discover() {
  const router  = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [me, items] = await Promise.all([
          directus.request(readMe()),
          directus.request(readItems('designs', {
            sort: ['-date_updated'],
            fields: ['id', 'name', 'subtitle', 'badge', 'wall_mm', 'date_updated'],
          })),
        ])
        setUserEmail((me as { email: string }).email ?? '')
        setDesigns(items as Design[])
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const createDesign = async () => {
    setCreating(true)
    try {
      const design = await directus.request(createItem('designs', {
        name: 'New Design',
        subtitle: 'Untitled · 4.2m wide',
        badge: 'Draft',
        wall_mm: 4200,
      }))
      router.push(`/wall-view/${(design as Design).id}`)
    } finally {
      setCreating(false)
    }
  }

  const firstName = userEmail.split('@')[0] ?? 'there'

  if (loading) return <><StatusBar /><Spinner /><BottomNav /></>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <StatusBar />

      {/* Top bar */}
      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6A6560', fontWeight: 500 }}>Good morning,</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#F2EDE6', textTransform: 'capitalize' }}>{firstName}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <IconBtn><SearchIcon /></IconBtn>
          <IconBtn><BellIcon /></IconBtn>
        </div>
      </div>

      {/* Section header */}
      <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#F2EDE6' }}>My Designs</div>
        <button
          onClick={createDesign}
          disabled={creating}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(200,169,110,0.12)', border: '1px solid rgba(200,169,110,0.3)',
            borderRadius: 20, padding: '7px 14px',
            color: '#C8A96E', fontSize: 12, fontWeight: 600,
            opacity: creating ? 0.6 : 1,
          }}
        >
          <PlusIcon size={14} />
          {creating ? 'Creating…' : 'New Design'}
        </button>
      </div>

      {/* Design list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
        {designs.length === 0 ? (
          <div style={{
            marginTop: 60, textAlign: 'center',
            color: '#4A4845', fontSize: 14,
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🪵</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>No designs yet</div>
            <div style={{ fontSize: 12 }}>Tap &quot;New Design&quot; to get started</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {designs.map(design => {
              const { color, bg } = BADGE_STYLES[design.badge] ?? BADGE_STYLES['Draft']
              return (
                <button
                  key={design.id}
                  onClick={() => router.push(`/wall-view/${design.id}`)}
                  style={{
                    background: '#1A1917', border: '1px solid #2A2825',
                    borderRadius: 16, padding: '16px 18px',
                    textAlign: 'left', width: '100%',
                    transition: 'border-color 0.15s',
                  }}
                >
                  {/* Badge */}
                  <div style={{ marginBottom: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                      color, background: bg,
                      padding: '4px 10px', borderRadius: 20,
                    }}>
                      {design.badge}
                    </span>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: '#F2EDE6', marginBottom: 4 }}>
                    {design.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6A6560' }}>
                    {design.subtitle}
                  </div>

                  {/* Footer */}
                  <div style={{
                    marginTop: 14, paddingTop: 12, borderTop: '1px solid #2A2825',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, color: '#4A4845' }}>
                      Wall: {design.wall_mm}mm
                    </span>
                    <span style={{ fontSize: 11, color: '#C8A96E', fontWeight: 600 }}>
                      Open →
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
