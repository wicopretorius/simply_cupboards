import { createDirectus, rest, authentication } from '@directus/sdk'

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:8055'

export const directus = createDirectus(directusUrl)
  .with(authentication('cookie'))
  .with(rest())
