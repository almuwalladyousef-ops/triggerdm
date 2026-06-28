'use client'

// Helpers for when TriggerDM runs as the "Dmsender" view inside the Content OS
// desktop shell. The view is loaded full-screen from the live Vercel site, so
// these only kick in there — on the normal web they're no-ops.

const FLAG = 'contentos:desktop'
const SHELL_OPEN = 'http://localhost:3737/open'

// True when opened with ?desktop=1 (set by the shell) or remembered from a
// previous load in this webview.
export function isDesktop() {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('desktop') === '1') {
      localStorage.setItem(FLAG, '1')
      return true
    }
    return localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

// Open a same-origin app path in the user's real Chrome (where their saved
// passwords live) via the shell's local server, instead of navigating the
// webview. Falls back to in-app navigation if the shell isn't reachable.
//
// Returns true if it handed off to Chrome (caller should not navigate),
// false if it did nothing and the caller should navigate normally.
export function openInBrowser(path) {
  if (!isDesktop()) return false
  const url = window.location.origin + path
  // GET with a query param = a "simple" request, so no-cors fires it off
  // without a preflight. We don't need the response, only the side effect of
  // the shell launching Chrome. localhost is exempt from mixed-content blocking.
  fetch(SHELL_OPEN + '?url=' + encodeURIComponent(url), { mode: 'no-cors' })
    .catch(() => { window.location.href = path })
  return true
}
