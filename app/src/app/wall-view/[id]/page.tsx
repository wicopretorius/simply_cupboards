'use client'
import { use } from 'react'
import WallView from '@/components/WallView'

export default function WallViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <WallView designId={Number(id)} />
}
