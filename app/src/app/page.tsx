'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { directus } from '@/lib/directus'
import { readMe } from '@directus/sdk'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    directus.request(readMe())
      .then(() => router.replace('/discover'))
      .catch(() => router.replace('/login'))
  }, [router])

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 24, height: 24,
        border: '2px solid #C8A96E',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  )
}
