/**
 * Creates the 5 app roles in Directus and sets Free as the default registration role.
 * Run once: node setup-roles.js
 * Safe to re-run — skips roles that already exist.
 */

const DIRECTUS_URL = process.env.PUBLIC_URL    ?? 'http://localhost:8055'
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL   ?? 'admin@dmcupboards.co.za'
const ADMIN_PASS   = process.env.ADMIN_PASSWORD

if (!ADMIN_PASS) {
  console.error('Set ADMIN_PASSWORD in .env or pass as env var')
  process.exit(1)
}

async function api(token, method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json.errors ?? json))
  return json.data
}

const ROLES = [
  { name: 'Free',     description: 'Default tier on signup — basic access' },
  { name: 'User',     description: 'Paid tier 1' },
  { name: 'Designer', description: 'Paid tier 2' },
  { name: 'Business', description: 'Paid tier 3' },
  { name: 'Admin',    description: 'Full access + admin-only features' },
]

;(async () => {
  // Login
  const { access_token } = await api(null, 'POST', '/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASS,
  })
  console.log('Logged in.\n')

  // Fetch existing roles
  const existing = await api(access_token, 'GET', '/roles?fields=id,name&limit=-1')
  const roleIds = {}

  for (const role of ROLES) {
    const found = existing.find(r => r.name === role.name)
    if (found) {
      console.log(`  skip    ${role.name} (${found.id})`)
      roleIds[role.name] = found.id
    } else {
      const created = await api(access_token, 'POST', '/roles', {
        name: role.name,
        description: role.description,
      })
      console.log(`  created ${role.name} (${created.id})`)
      roleIds[role.name] = created.id
    }
  }

  // Set Free as the default public registration role
  await api(access_token, 'PATCH', '/settings', {
    public_registration: true,
    public_registration_role: roleIds['Free'],
  })
  console.log(`\n  Public registration enabled, default role → Free`)

  console.log('\nRole IDs:')
  Object.entries(roleIds).forEach(([name, id]) => console.log(`  ${name}: ${id}`))
  console.log('\nDone.')
})()
