'use client'
import { use } from 'react'
import FloorPlan from '@/components/FloorPlan'

export default function FloorPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <FloorPlan designId={Number(id)} />
}
