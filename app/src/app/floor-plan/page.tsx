'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readItems, readMe } from '@directus/sdk'
import type { Design } from '@/lib/types'
import { BottomNav, Spinner } from '@/components/SharedUI'

export default function FloorPlanIndexPage() {
  const router = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      directus.request(readMe()),
      directus.request(readItems('designs', { sort: ['-date_updated'], fields: ['id', 'name', 'subtitle'] })),
    ])
      .then(([, items]) => setDesigns(items as Design[]))
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false))
  }, [router])



  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#F2EDE6' }}>Floor Plans</div>
        <div style={{ fontSize: 13, color: '#6A6560' }}>Select a design to view its floor plan</div>

        {designs.length === 0 ? (
          <div style={{ marginTop: 40, textAlign: 'center', color: '#4A4845', fontSize: 14 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📐</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No designs yet</div>
            <div style={{ fontSize: 12 }}>Create a design from Home first</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {designs.map(d => (
              <button
                key={d.id}
                onClick={() => router.push(`/floor-plan/${d.id}`)}
                style={{
                  background: '#1A1917', border: '1px solid #2A2825',
                  borderRadius: 14, padding: '14px 16px', textAlign: 'left',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: '#F2EDE6', marginBottom: 4 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: '#6A6560' }}>{d.subtitle}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
