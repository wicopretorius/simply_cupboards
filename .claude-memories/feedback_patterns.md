---
name: Coding patterns and lessons learned
description: Directus SDK gotchas, auth patterns, and recurring bugs to avoid
type: feedback
originSessionId: 49eaa2d6-f235-484c-845c-750ec9a6c56d
---
**Never list specific fields in Directus readItems when schema may be incomplete.**

Use `fields: ['*'] as any` instead of named field arrays. If a named field doesn't exist in the Directus schema, the SDK throws an error — and if the catch block redirects to `/login`, the user gets silently kicked out.

**Why:** Happened with `room_shape` — field wasn't in schema yet, Discover page crashed on load, redirected to login, looked like an auth failure.

**How to apply:** Default to `fields: ['*'] as any` for list queries; only use named fields when you need relational expansion (e.g., `['*', 'palette_item_id.*']`).

---

**Catch blocks in auth-guarded pages should only redirect on 401/403.**

```ts
} catch (err: any) {
  const status = err?.response?.status ?? err?.status
  if (status === 401 || status === 403) router.replace('/login')
  // other errors stay on page — don't silently swallow and redirect
}
```

**Why:** Any other error (network, missing schema field, etc.) incorrectly booted users to login.

---

**Directus SDK `authentication('cookie')` stores access_token in memory.**

The cookie holds the refresh token. Cross-origin (port 3000 vs 8055) over HTTP means the refresh cookie won't be sent back automatically, but the in-memory access token works for the session lifetime (~15 min).

**How to apply:** Session works fine after login; after a page refresh the user must log in again (acceptable for dev).

---

**`as unknown as Design[]` needed when casting Directus SDK readItems result.**

Directus SDK v21 returns a complex mapped type. Direct `as Design[]` fails TS — use double cast.

---

**PM2 must use `exec_mode: 'fork'` for Directus (and any self-binding HTTP server).**

```js
// ecosystem.config.js
exec_mode: 'fork',   // NOT the default cluster
```

**Why:** PM2 cluster mode makes PM2 itself hold the port and proxy to workers. Directus also tries to bind its own port on startup → "Port already in use" crash loop (1500+ restarts observed). Fork mode lets Directus own its port directly.

**How to apply:** Any server process that calls `server.listen()` internally (Directus, custom Express servers, etc.) must use fork mode. Cluster mode only works for apps built explicitly around Node's `cluster` module where workers never call listen().

---

**HestiaCP overwrites nginx.ssl.conf when SSL is enabled or domain is rebuilt.**

The proxy config in `/home/jireh/conf/web/<domain>/nginx.ssl.conf` must be re-applied after any HestiaCP SSL operation. There is no permanent hook — it's a manual step.

**Why:** HestiaCP regenerates the file from its template on every SSL certificate action.

**How to apply:** After any HestiaCP domain change, re-edit the nginx.ssl.conf `location /` block to add proxy_pass and headers, then `nginx -s reload`.
