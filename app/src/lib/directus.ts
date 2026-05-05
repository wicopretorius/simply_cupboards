import { createDirectus, rest, authentication } from '@directus/sdk'
import type { DirectusSchema } from './types'

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:8055'

// Persist tokens in localStorage so sessions survive page reloads
// (cross-origin cookie auth doesn't work between app.dmcupboards.co.za and api.dmcupboards.co.za)
const storage = typeof window !== 'undefined' ? {
  get: (key: string) => localStorage.getItem(key),
  set: (key: string, value: string) => localStorage.setItem(key, value),
  delete: (key: string) => localStorage.removeItem(key),
} : undefined

export const directus = createDirectus<DirectusSchema>(directusUrl)
  .with(authentication('json', { storage: storage as any }))
  .with(rest())
