'use client'
import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import RoomBuilder from '@/components/RoomBuilder'

export default function RoomSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('from') ?? 'wall-view'
  return <RoomBuilder designId={Number(id)} returnTo={returnTo} />
}
