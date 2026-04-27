'use client'
import { use } from 'react'
import RoomBuilder from '@/components/RoomBuilder'

export default function RoomSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <RoomBuilder designId={Number(id)} />
}
