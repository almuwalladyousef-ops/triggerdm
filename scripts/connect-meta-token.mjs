#!/usr/bin/env node
import http from 'node:http'
import { execFileSync, spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { platform } from 'node:os'

const GRAPH_VERSION = 'v18.0'
const DEFAULT_APP_ID = '1644618876614946'
const DEFAULT_PORT = 8787
const DEFAULT_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_messaging',
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_messages',
]

function parseEnv(path) {
  if (!existsSync(path)) return {}
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const idx = trimmed.indexOf('=')
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

function upsertEnvFile(path, key, value) {
  const src = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const lines = src.split(/\r?\n/)
  const idx = lines.findIndex(line => line.startsWith(`${key}=`))
  if (idx >= 0) lines[idx] = `${key}=${value}`
  else lines.push(`${key}=${value}`)
  writeFileSync(path, lines.join('\n').replace(/\n{3,}/g, '\n\n'))
}

function arg(name, fallback = null) {
  const prefix = `--${name}=`
  const found = process.argv.find(a => a.startsWith(prefix))
  if (found) return found.slice(prefix.length)
  const idx = process.argv.indexOf(`--${name}`)
  if (idx >= 0) return process.argv[idx + 1]
  return fallback
}

async function graph(path, params) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, value)
  }
  const res = await fetch(url)
  const json = await res.json()
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `Graph request failed: ${res.status}`)
  }
  return json
}

function updateVercelEnv(key, value) {
  spawnSync('vercel', ['env', 'rm', key, 'production', '--yes'], { stdio: 'ignore' })
  const added = spawnSync('vercel', ['env', 'add', key, 'production'], {
    input: value,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  if (added.status !== 0) {
    throw new Error(`Failed to update Vercel env ${key}: ${added.stderr || added.stdout}`)
  }
}

function deployProduction() {
  const deployed = spawnSync('vercel', ['--prod', '--yes'], { stdio: 'inherit' })
  if (deployed.status !== 0) throw new Error('Vercel production deploy failed')
}

const localEnvPath = '.env.local'
const env = { ...parseEnv(localEnvPath), ...process.env }
const appId = arg('app-id', env.META_APP_ID || env.APP_ID || DEFAULT_APP_ID)
const appSecret = arg('app-secret', env.META_APP_SECRET || env.APP_SECRET || env.BUSINESS_APP_SECRET || env.PERSONAL_APP_SECRET)
const targetIgId = arg('ig-id', env.BUSINESS_IG_ID)
const targetEnv = arg('env-key', 'BUSINESS_PAGE_TOKEN')
const port = Number(arg('port', DEFAULT_PORT))
const redirectUri = arg('redirect-uri', `http://localhost:${port}/callback`)
const state = crypto.randomUUID()
const scopes = arg('scopes', DEFAULT_SCOPES.join(',')).split(',').map(s => s.trim()).filter(Boolean)

if (!appId) throw new Error('Missing app id. Pass --app-id or set META_APP_ID/APP_ID.')
if (!appSecret) throw new Error('Missing app secret. Pass --app-secret or set META_APP_SECRET/APP_SECRET.')
if (!targetIgId) throw new Error('Missing target IG id. Pass --ig-id or set BUSINESS_IG_ID.')

const loginUrl = new URL('https://www.facebook.com/dialog/oauth')
loginUrl.searchParams.set('client_id', appId)
loginUrl.searchParams.set('redirect_uri', redirectUri)
loginUrl.searchParams.set('state', state)
loginUrl.searchParams.set('response_type', 'code')
loginUrl.searchParams.set('scope', scopes.join(','))

console.log('\nMeta token connector')
console.log(`Target IG ID: ${targetIgId}`)
console.log(`Vercel env: ${targetEnv}`)
console.log(`Redirect URI: ${redirectUri}`)
console.log('\nIf Meta says the redirect URI is invalid, add it in Meta App Dashboard > Facebook Login > Settings > Valid OAuth Redirect URIs, then rerun this script.')
console.log('\nOpening login URL...')
console.log(loginUrl.toString())

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, redirectUri)
    if (url.pathname !== '/callback') {
      res.writeHead(404).end('Not found')
      return
    }

    if (url.searchParams.get('state') !== state) {
      throw new Error('OAuth state mismatch')
    }
    if (url.searchParams.get('error')) {
      throw new Error(`${url.searchParams.get('error')}: ${url.searchParams.get('error_description')}`)
    }

    const code = url.searchParams.get('code')
    if (!code) throw new Error('Missing OAuth code')

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h1>Meta sign-in received</h1><p>You can return to Codex. Token setup is continuing.</p>')

    console.log('\nExchanging code for user token...')
    const shortLived = await graph('oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    })

    console.log('Exchanging user token for long-lived token...')
    const longLived = await graph('oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLived.access_token,
    })

    console.log('Fetching Pages and linked Instagram accounts...')
    const pages = await graph('me/accounts', {
      fields: 'id,name,access_token,instagram_business_account{id,username}',
      access_token: longLived.access_token,
    })

    const page = (pages.data || []).find(p => p.instagram_business_account?.id === targetIgId)
    if (!page?.access_token) {
      console.log(JSON.stringify((pages.data || []).map(p => ({
        id: p.id,
        name: p.name,
        instagram: p.instagram_business_account || null,
        hasAccessToken: Boolean(p.access_token),
      })), null, 2))
      throw new Error(`No Page access token found for Instagram account ${targetIgId}`)
    }

    console.log(`Found Page: ${page.name} (${page.id}) -> IG ${page.instagram_business_account?.username || targetIgId}`)
    console.log('Updating local .env.local...')
    upsertEnvFile(localEnvPath, targetEnv, page.access_token)

    console.log('Updating Vercel production env...')
    updateVercelEnv(targetEnv, page.access_token)

    console.log('Deploying production...')
    deployProduction()

    console.log('\nDone. Production now uses the refreshed Page access token.')
  } catch (err) {
    console.error('\nToken setup failed:')
    console.error(err.message)
  } finally {
    server.close()
  }
})

server.listen(port, '127.0.0.1', () => {
  if (platform() === 'darwin') {
    spawnSync('open', [loginUrl.toString()], { stdio: 'ignore' })
  }
})
