import { NextResponse } from 'next/server'

const DIRECTUS = process.env.NEXT_PUBLIC_DIRECTUS_URL ?? 'http://localhost:8055'
const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN ?? ''

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!ADMIN_TOKEN) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { id } = await params
  const body = await req.json()

  const res = await fetch(`${DIRECTUS}/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) return NextResponse.json({ error: json }, { status: res.status })
  return NextResponse.json(json.data)
}
