import { createDirectus, rest, authentication } from '@directus/sdk'
import type { DirectusSchema } from './types'

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:8055'

export const directus = createDirectus<DirectusSchema>(directusUrl)
  .with(authentication('cookie'))
  .with(rest())
