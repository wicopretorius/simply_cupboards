'use client'
import { useEffect, useState } from 'react'
import { directus } from './directus'
import { readMe } from '@directus/sdk'
import type { AppRole } from './types'
import { ROLE_RANK } from './types'

// Role UUID → name map (from setup-roles.js output)
const ROLE_ID_MAP: Record<string, AppRole> = {
  '6bd8db09-cbf3-425b-84da-4d4de2cfe11e': 'Free',
  'e95ff781-3bb4-4577-9104-a4a331d1942d': 'User',
  '6b8e134f-8922-445f-9fff-4f46a4ba8d4b': 'Designer',
  '6d090944-4e51-438e-a9cb-5bf98b5612b2': 'Business',
  '54b85508-1d0c-4ca0-98e9-fe967c76d6a3': 'Client',
  '7a39afe5-cf12-4886-b131-e19915e10111': 'Admin',
  '682ca723-eb53-447d-ab10-df9bb376056b': 'Administrator',
}

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
    directus.request(readMe({ fields: ['role'] as any }))
      .then((me: any) => {
        const roleVal = me?.role
        // role may come back as a UUID string or an object with id/name
        const roleId = typeof roleVal === 'string' ? roleVal : roleVal?.id
        const roleName = typeof roleVal === 'object' ? roleVal?.name : null
        setRole(roleName ?? (roleId ? ROLE_ID_MAP[roleId] ?? null : null))
      })
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
