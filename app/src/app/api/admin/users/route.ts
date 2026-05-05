import { NextResponse } from 'next/server'

const DIRECTUS = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:8055'
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN ?? ''

const FIELDS = [
  'id', 'first_name', 'last_name', 'email', 'status',
  'role.id', 'role.name',
  'subscription_start_date', 'subscription_end_date',
  'subscription_months', 'subscription_indefinite',
  'date_created',
].join(',')

export async function GET() {
  if (!ADMIN_TOKEN) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const res = await fetch(
    `${DIRECTUS}/users?fields=${FIELDS}&limit=-1&sort=date_created`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: 'no-store' }
  )
  const json = await res.json()
  if (!res.ok) return NextResponse.json({ error: json }, { status: res.status })
  return NextResponse.json(json.data)
}
