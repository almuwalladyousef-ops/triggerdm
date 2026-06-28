import { headers } from 'next/headers'

// Resolves the public origin used to build OAuth redirect URIs.
//
// OAuth requires the redirect_uri to (a) match exactly between the authorize
// step and the token exchange and (b) point at wherever the user is actually
// browsing. Hardcoding a single production domain breaks local dev and preview
// deployments, so we derive the origin from the incoming request instead.
//
// Set APP_URL (or NEXTAUTH_URL) in production to pin a canonical domain that
// matches what is registered in the Meta / Instagram app dashboard; otherwise
// we fall back to the request's own host so local dev works with zero config.

function stripTrailingSlash(url) {
  return url.replace(/\/+$/, '')
}

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(host || '')
}

function baseUrlFrom(getHeader) {
  const fromEnv = process.env.APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim()
  if (fromEnv) return stripTrailingSlash(fromEnv)

  const host = getHeader('x-forwarded-host') || getHeader('host')
  const proto = getHeader('x-forwarded-proto') || (isLocalHost(host) ? 'http' : 'https')
  return `${proto}://${host}`
}

// For Route Handlers (e.g. /auth/*/start) that receive the NextRequest.
export function getBaseUrlFromRequest(req) {
  return baseUrlFrom(name => req.headers.get(name))
}

// For Server Component pages (e.g. /auth/*/callback) that have no request arg.
export async function getBaseUrlFromHeaders() {
  const h = await headers()
  return baseUrlFrom(name => h.get(name))
}
