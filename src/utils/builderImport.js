/**
 * Turns spreadsheet rows (from sheetImport.js) into Quiz & Scramble Builder
 * items, collecting a reason for every row it skips so the moderator can fix
 * the file. Header names match scripts/make-template.mjs; matching is
 * case-insensitive and column order doesn't matter.
 */

export const MAX_UPLOAD_ROWS = 300
export const WORD_MIN = 2
export const WORD_MAX = 30

// Accepted spellings for each column header
const SCRAMBLE_COLUMNS = {
  word: ['word', 'words', 'name'],
  clue: ['clue', 'hint'],
  difficulty: ['difficulty', 'level'],
}
const QUIZ_COLUMNS = {
  question: ['question', 'questions'],
  answer: ['answer', 'answers'],
  reference: ['bible reference', 'reference', 'verse', 'ref', 'scripture'],
}

export const DIFFICULTIES = [
  { value: 1, id: 'easy', label: 'Easy' },
  { value: 2, id: 'medium', label: 'Medium' },
  { value: 3, id: 'hard', label: 'Hard' },
]

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

/** Same rule the template's Instructions sheet describes */
export function guessDifficulty(word) {
  const letters = word.replace(/[^\p{L}]/gu, '').length
  return letters <= 5 ? 1 : letters <= 8 ? 2 : 3
}

function parseDifficulty(raw) {
  const v = clean(raw).toLowerCase()
  if (!v) return { value: null }
  const hit = DIFFICULTIES.find((d) => d.id === v || String(d.value) === v)
  return hit ? { value: hit.value } : { error: `Difficulty "${clean(raw)}" isn’t Easy, Medium or Hard` }
}

/** null when fine, otherwise why the word can't be used */
export function wordProblem(word) {
  if (!word) return 'Word is empty'
  if (word.length < WORD_MIN || word.length > WORD_MAX) return `Word must be ${WORD_MIN} to ${WORD_MAX} characters`
  if (!/^[\p{L}\p{N} '’.-]+$/u.test(word)) return 'Word can only use letters, numbers, spaces, - and ’'
  if ((word.match(/\p{L}/gu) || []).length < 2) return 'Word needs at least two letters to scramble'
  return null
}

// Header row → { key: columnIndex }. Looks in the first 5 rows so a title
// line above the headers doesn't break the upload.
function locateHeaders(rows, columns, required) {
  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const cells = (rows[r] ?? []).map((c) => clean(c).toLowerCase())
    const index = {}
    for (const [key, names] of Object.entries(columns)) {
      const i = cells.findIndex((c) => names.includes(c))
      if (i !== -1) index[key] = i
    }
    if (required.every((k) => k in index)) return { headerRow: r, index }
  }
  return null
}

/**
 * Picks the sheet for this tab. A workbook with both a Scramble and a Quiz
 * sheet works from either tab — each takes the sheet whose headers fit.
 */
function findSheet(sheets, columns, required) {
  for (const sheet of sheets) {
    const found = locateHeaders(sheet.rows, columns, required)
    if (found) return { sheet, ...found }
  }
  return null
}

function collect(sheets, { columns, required, missingMessage, toItem }) {
  const found = findSheet(sheets, columns, required)
  if (!found) return { items: [], skipped: [], error: missingMessage }

  const { sheet, headerRow, index } = found
  const items = []
  const skipped = []
  let truncated = false

  for (let r = headerRow + 1; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] ?? []
    if (row.every((c) => !clean(c))) continue // blank rows are just ignored
    if (items.length >= MAX_UPLOAD_ROWS) { truncated = true; break }
    const get = (key) => (key in index ? clean(row[index[key]]) : '')
    const result = toItem(get)
    if (result.error) skipped.push({ row: r + 1, reason: result.error }) // Excel rows are 1-based
    else items.push(result.item)
  }
  return { items, skipped, truncated, sheetName: sheet.name }
}

/**
 * existingNames — lowercase names already in the list, so "Add to list"
 * doesn't create duplicates either.
 */
export function importWords(sheets, existingNames = new Set()) {
  const seen = new Set(existingNames)
  return collect(sheets, {
    columns: SCRAMBLE_COLUMNS,
    required: ['word'],
    missingMessage: 'Couldn’t find a "Word" column. Use the Scramble sheet from the template.',
    toItem: (get) => {
      const word = get('word')
      const problem = wordProblem(word)
      if (problem) return { error: problem }
      if (seen.has(word.toLowerCase())) return { error: `"${word}" is already in the list` }
      const diff = parseDifficulty(get('difficulty'))
      if (diff.error) return { error: diff.error }
      seen.add(word.toLowerCase())
      return { item: makeWord(word, get('clue'), diff.value) }
    },
  })
}

export function importQuestions(sheets) {
  return collect(sheets, {
    columns: QUIZ_COLUMNS,
    required: ['question', 'answer'],
    missingMessage: 'Couldn’t find "Question" and "Answer" columns. Use the Quiz sheet from the template.',
    toItem: (get) => {
      const question = get('question')
      const answer = get('answer')
      if (!question) return { error: 'Question is empty' }
      if (!answer) return { error: 'Answer is empty' }
      return { item: { id: uid(), question, answer, reference: get('reference') } }
    },
  })
}

/** Shared by the upload and the manual "Add word" form */
export function makeWord(word, clue = '', difficulty = null) {
  return { id: uid(), name: word, clue: clean(clue), difficulty: difficulty ?? guessDifficulty(word) }
}
