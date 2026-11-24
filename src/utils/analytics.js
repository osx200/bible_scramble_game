/**
 * The app's own privacy-friendly visit counter (server: POST /api/hit in
 * server/index.js). No cookies, no ids, nothing about the player: just an
 * event name and an allow-listed detail, which bump a daily total. The
 * server ignores anything not on its list.
 *
 * Fire-and-forget: never throws, never waits, and does nothing for browsers
 * that ask not to be tracked (Global Privacy Control / Do Not Track).
 *
 * Events: visit · mode_open (app mode) · game_finish / share (gameKey()) · tv_mode
 */

function optedOut() {
  try {
    return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1'
  } catch {
    return false
  }
}

export function track(event, detail = '') {
  if (optedOut()) return
  try {
    fetch('/api/hit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, detail }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Old browser or blocked request: counting is never worth an error
  }
}

/** Once per browser tab session */
export function trackVisit() {
  try {
    if (sessionStorage.getItem('counted')) return
    sessionStorage.setItem('counted', '1')
  } catch {
    // No sessionStorage: count this load anyway
  }
  track('visit')
}

/** The detail for game_finish / share: 'solo:books', 'teams:couples', 'recall', 'quiz', 'multiplayer' */
export function gameKey(kind, wordSet) {
  return wordSet ? `${kind}:${wordSet}` : kind
}
