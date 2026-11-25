/**
 * Preset nicknames: players pick a name, they never type one, so no real
 * names reach the leaderboard or a multiplayer room. Shared by the client
 * and the game server (the server image copies all of src/data).
 *
 * Solo players pick one word from SOLO_NAMES ("Joy"); groups and teams pick
 * one of GROUP_NAMES. The first FRUIT_COUNT entries of each list are the
 * fruit of the Spirit, in the order of Galatians 5:22-23.
 */

export const SOLO_NAMES = [
  'Love', 'Joy', 'Peace', 'Patience', 'Kindness', 'Goodness', 'Faithfulness', 'Gentleness', 'Self-Control',
  'Grace', 'Hope', 'Faith', 'Mercy', 'Light', 'Truth', 'Praise', 'Glory',
  'Blessing', 'Shalom', 'Wisdom', 'Psalm', 'Manna', 'Dove', 'Lamb',
]

export const GROUP_NAMES = [
  'Team Love', 'Team Joy', 'Team Peace', 'Team Patience', 'Team Kindness', 'Team Goodness',
  'Team Faithfulness', 'Team Gentleness', 'Team Self-Control',
  'The Ark Crew', 'Jericho Jumpers', 'Mustard Seeds', 'Loaves & Fishes', 'Burning Bush Squad',
  "Lions' Den", 'Red Sea Crossers', 'Bethlehem Stars', 'Manna Makers', 'Slingshot Squad',
  'Jordan River Crew', 'Psalm Singers', 'Twelve Tribes', 'Net Casters', 'Mount Sinai Climbers',
  'The Good Samaritans', 'Fiery Furnace Five', "Shepherd's Flock", "Joseph's Coats",
  'Ravens of Elijah', 'Wise Builders',
]

export const FRUIT_COUNT = 9
export const FRUIT_REF = 'Galatians 5:22-23'

/** Added to a group name already taken in a room: "Team Joy Blue" */
export const DUPLICATE_COLORS = ['Blue', 'Red', 'Green', 'Gold', 'Purple', 'Silver', 'Scarlet', 'White']

/** Longest possible name with a suffix ("Team Faithfulness Scarlet") fits */
export const PRESET_NAME_MAX = 32

const lower = (s) => s.toLowerCase()
const SOLO = new Map(SOLO_NAMES.map((w) => [lower(w), w]))
const GROUPS = new Map(GROUP_NAMES.map((g) => [lower(g), g]))
const COLORS = new Map(DUPLICATE_COLORS.map((c) => [lower(c), c]))

/**
 * The canonical spelling of a preset name, plus any duplicate suffix, or null.
 * `{ base: 'Joy', suffix: '2', name: 'Joy 2' }`
 */
export function parsePresetName(raw, kind, { allowSuffix = false } = {}) {
  if (typeof raw !== 'string') return null
  const name = raw.replace(/\s+/g, ' ').trim()
  const whole = (kind === 'group' ? GROUPS : SOLO).get(lower(name))
  if (whole) return { base: whole, suffix: '', name: whole }
  if (!allowSuffix) return null

  const cut = name.lastIndexOf(' ')
  if (cut < 0) return null
  const head = name.slice(0, cut)
  const tail = name.slice(cut + 1)
  if (kind === 'group') {
    const base = GROUPS.get(lower(head))
    const color = COLORS.get(lower(tail))
    return base && color ? { base, suffix: color, name: `${base} ${color}` } : null
  }
  const base = SOLO.get(lower(head))
  return base && /^[2-9]$|^[1-9][0-9]$/.test(tail) ? { base, suffix: tail, name: `${base} ${tail}` } : null
}

export function isPresetName(raw, kind, options) {
  return parsePresetName(raw, kind, options) !== null
}

/** "Joy 2" → "Joy", "Team Joy Blue" → "Team Joy"; else the name itself */
export function presetBase(raw) {
  const parsed = parsePresetName(raw, 'individual', { allowSuffix: true })
    ?? parsePresetName(raw, 'group', { allowSuffix: true })
  return parsed?.base ?? raw
}

/**
 * The base name if nobody has it, else the first free variant:
 * "Joy 2", "Joy 3" for solo players, "Team Joy Blue", "… Red" for groups.
 * `taken` is any iterable of names already in the room (case-insensitive).
 * Returns null only when every variant is in use.
 */
export function nextFreeName(base, kind, taken) {
  const used = new Set([...taken].map(lower))
  if (!used.has(lower(base))) return base
  const variants = kind === 'group'
    ? DUPLICATE_COLORS.map((c) => `${base} ${c}`)
    : Array.from({ length: 98 }, (_, i) => `${base} ${i + 2}`)
  return variants.find((v) => !used.has(lower(v))) ?? null
}

// ── Earlier two-word solo names ("Joyful Lion") ─────────────────
// No longer offered, but leaderboard rows saved with them are still preset
// nicknames, not typed names: the board shows them in full rather than as
// initials (server/index.js getLeaderboard). Never accepted for new scores.
const OLD_FIRST = ['loving', 'joyful', 'peaceful', 'patient', 'kind', 'good', 'faithful', 'gentle', 'self-controlled',
  'brave', 'mighty', 'wise', 'swift', 'loyal', 'shining', 'bold', 'bright', 'humble', 'cheerful', 'fearless', 'steady']
const OLD_SECOND = new Set(['lion', 'lamb', 'dove', 'eagle', 'camel', 'donkey', 'whale', 'sparrow', 'shepherd',
  'fisherman', 'builder', 'trumpet', 'harp', 'star', 'lamp', 'olive tree'])

export function isOldSoloName(raw) {
  const key = lower(String(raw ?? '').replace(/\s+/g, ' ').trim())
  return OLD_FIRST.some((f) => key.startsWith(`${f} `) && OLD_SECOND.has(key.slice(f.length + 1)))
}
