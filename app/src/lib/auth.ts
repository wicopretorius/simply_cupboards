'use client'
import { directus } from './directus'

/**
 * Call at the top of every protected page's load function.
 * Restores the access token from the refresh cookie after a page reload.
 * Returns false if the user is not logged in (caller should redirect to /login).
 */
export async function ensureSession(): Promise<boolean> {
  try {
    await directus.refresh()
    return true
  } catch {
    return false
  }
}
