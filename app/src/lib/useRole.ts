'use client'
import { useEffect, useState } from 'react'
import { directus } from './directus'
import { readMe } from '@directus/sdk'
import type { AppRole } from './types'
import { ROLE_RANK } from './types'

export interface RoleState {
  role: AppRole | null
  loading: boolean
  /** true if user's role is at least the required tier */
  atLeast: (required: AppRole) => boolean
  isAdmin: boolean
}

export function useRole(): RoleState {
  const [role, setRole]       = useState<AppRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    directus.request(readMe({ fields: ['role.name'] as any }))
      .then((me: any) => setRole(me?.role?.name ?? null))
      .catch(() => setRole(null))
      .finally(() => setLoading(false))
  }, [])

  return {
    role,
    loading,
    isAdmin: role === 'Admin' || role === 'Administrator',
    atLeast: (required: AppRole) =>
      role !== null && ROLE_RANK[role] >= ROLE_RANK[required],
  }
}
