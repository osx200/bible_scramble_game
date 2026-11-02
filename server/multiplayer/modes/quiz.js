// Quiz Builder questions in multiplayer. Answers are free text, so judging is
// three-way: a clear match is 'correct', anything else is 'pending' for the
// host to accept or reject in the review step before the reveal. Questions
// live only in the room's memory (session-only rule) — never in SQLite.

// Lowercase, strip punctuation and leading articles, collapse spaces
function normalise(v) {
  return String(v ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an|and)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const carry = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = carry
    }
  }
  return prev[b.length]
}

export const quiz = {
  id: 'quiz',
  label: 'Quiz',

  prepare(settings, payload) {
    return payload.questions.map((q) => ({
      question: q.question,
      answer: q.answer,
      reference: q.reference || '',
    }))
  },

  publicRound(r) {
    return { kind: 'quiz', question: r.question }
  },

  judge(r, text) {
    const said = normalise(text)
    const want = normalise(r.answer)
    if (!said) return 'wrong'
    if (said === want) return 'correct'
    // Small typos on a long enough answer count; everything else goes to the host
    const budget = Math.floor(want.length * 0.15)
    if (budget >= 1 && levenshtein(said, want) <= budget) return 'correct'
    return 'pending'
  },

  reveal(r) {
    return { answer: r.answer, reference: r.reference || null }
  },

  describe() {
    return 'Custom quiz'
  },
}
