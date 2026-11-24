import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { parsePresetName, PRESET_NAME_MAX } from '../data/presetNames.js'

/**
 * Who is playing: `{ name, kind: 'individual' | 'group' }`, or null before the
 * Welcome page has been filled in. Persisted per device in localStorage — the
 * name is also what the leaderboard files scores under, and `kind` picks
 * which board (Top Players / Top Groups) a solo game lands on.
 */
const PlayerContext = createContext(null)

const STORAGE_KEY = 'player'
export const NAME_MIN = 2
export const NAME_MAX = PRESET_NAME_MAX
export const PLAYER_KINDS = ['individual', 'group']

/**
 * The app has no product name of its own — titles read "{brand} Bible Games".
 * Individuals get a possessive ("Kwame's", "James'"); groups don't
 * ("Grace Fellowship Bible Games").
 */
export function brandName(profile) {
  if (!profile) return ''
  if (profile.kind === 'group') return profile.name
  return /s$/i.test(profile.name) ? `${profile.name}’` : `${profile.name}’s`
}

/** Same normalisation the leaderboard server applies. */
export function cleanPlayerName(raw) {
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Names are picked from preset lists (src/data/presetNames.js), never typed,
 * so no real name is stored or shown. Returns the canonical spelling, or ''
 * when the name isn't a preset for that kind.
 */
export function presetProfileName(raw, kind) {
  return parsePresetName(raw, kind)?.name ?? ''
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (typeof saved?.name !== 'string' || !PLAYER_KINDS.includes(saved.kind)) return null
    // Typed names / initials from before the preset lists don't load, so
    // those players pick a nickname on their next visit
    const name = presetProfileName(saved.name, saved.kind)
    if (name) return { name, kind: saved.kind }
  } catch {
    // Private window, blocked storage or corrupt JSON — just ask again
  }
  return null
}

export function PlayerProvider({ children }) {
  const [profile, setProfileState] = useState(loadProfile)
  // true while the Welcome page is open from Menu's "Change" link
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    document.title = profile ? `${brandName(profile)} Bible Games` : 'Bible Games'
  }, [profile])

  const setProfile = useCallback((input) => {
    const name = presetProfileName(input.name, input.kind)
    if (!name) return
    const next = { kind: input.kind, name }
    setProfileState(next)
    setEditing(false)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Still works for this visit, just isn't remembered
    }
  }, [])

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      editing,
      startEditing: () => setEditing(true),
      cancelEditing: () => setEditing(false),
    }),
    [profile, setProfile, editing],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  return useContext(PlayerContext)
}
