// Names that never make it onto a public board. Deliberately short — this is
// a church-group game, not a moderation system; the admin DELETE endpoint
// handles anything that slips through.

// Matched as whole words, because as substrings they hit innocent names
// ("Cassandra", "Grass Valley Youth", "Scunthorpe").
const WORDS = [
  'ass', 'arse', 'cock', 'cum', 'dick', 'fag', 'hell', 'hoe', 'jap', 'nazi', 'piss', 'porn',
  'sex', 'slut', 'tit', 'tits', 'twat', 'wank', 'whore',
]

// Matched anywhere once spaces and punctuation are stripped, so "f.u.c.k"
// and "bitch3s" are caught too. Only strings no real name contains.
const FRAGMENTS = [
  'fuck', 'shit', 'bitch', 'cunt', 'pussy', 'bastard',
  'nigg', 'faggot', 'retard', 'asshole', 'motherf', 'penis', 'vagina',
]

// Undo the usual digit-for-letter swaps before matching
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' }

function deleet(s) {
  return s.replace(/[013457@$]/g, (c) => LEET[c])
}

export function isBlocked(name) {
  const lower = deleet(name.toLowerCase())
  const words = lower.split(/[^a-z]+/).filter(Boolean)
  if (words.some((w) => WORDS.includes(w))) return true
  const squashed = lower.replace(/[^a-z]/g, '')
  return FRAGMENTS.some((f) => squashed.includes(f))
}
