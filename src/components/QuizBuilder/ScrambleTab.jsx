import { useState } from 'react'
import Button from '../shared/Button.jsx'
import BulkUpload from './BulkUpload.jsx'
import { TIMERS } from '../ModeratorSetup/ModeratorSetup.jsx'
import { DIFFICULTIES, makeWord, wordProblem } from '../../utils/builderImport.js'
import { scrambleName } from '../../utils/scramble.js'
import styles from './QuizBuilder.module.css'

const SAMPLE_WORDS = [
  ['Hannah', 'Mother of Samuel'],
  ['Gideon', 'Defeated Midian with 300 men'],
  ['Deborah', 'Prophetess and judge of Israel'],
  ['Goliath', 'Giant defeated by David'],
  ['Barnabas', 'Called “son of encouragement”'],
  ['Bethlehem', 'Town where Jesus was born'],
  ['Nehemiah', 'Rebuilt the walls of Jerusalem'],
  ['Zacchaeus', 'Tax collector who climbed a sycamore tree'],
  ['Methuselah', 'Lived 969 years'],
  ['Gethsemane', 'Garden where Jesus prayed before His arrest'],
]

const DIFF_LABEL = Object.fromEntries(DIFFICULTIES.map((d) => [d.value, d.label]))

function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Custom words for a host-led scramble. Starting hands a ModeratorPlay
 * config ({ words: [{ name, scrambled, clue }], timerDuration }) to QuizApp.
 */
export default function ScrambleTab({ words, onChange, onStart }) {
  const [form, setForm] = useState({ word: '', clue: '', difficulty: '' })
  const [error, setError] = useState('')
  const [chosenFilter, setFilter] = useState('all') // 'all' | 1 | 2 | 3
  const [timer, setTimer] = useState(30)
  const [shuffled, setShuffled] = useState(true)

  const counts = { all: words.length }
  DIFFICULTIES.forEach((d) => { counts[d.value] = words.filter((w) => w.difficulty === d.value).length })
  // A level the list no longer has (after removing words) falls back to all
  const filter = counts[chosenFilter] ? chosenFilter : 'all'
  const playable = filter === 'all' ? words : words.filter((w) => w.difficulty === filter)

  function handleAdd(e) {
    e.preventDefault()
    const word = form.word.replace(/\s+/g, ' ').trim()
    const problem = wordProblem(word)
    if (problem) { setError(problem + '.'); return }
    if (words.some((w) => w.name.toLowerCase() === word.toLowerCase())) {
      setError(`"${word}" is already in the list.`)
      return
    }
    onChange((prev) => [...prev, makeWord(word, form.clue, form.difficulty ? Number(form.difficulty) : null)])
    setForm({ word: '', clue: '', difficulty: '' })
    setError('')
  }

  function loadSamples() {
    onChange((prev) => [...prev, ...SAMPLE_WORDS.map(([w, clue]) => makeWord(w, clue))])
  }

  function handleImport(items, mode) {
    onChange((prev) => (mode === 'replace' ? items : [...prev, ...items]))
  }

  function handleStart() {
    const list = shuffled ? shuffle(playable) : playable
    onStart({
      words: list.map((w) => ({ name: w.name, scrambled: scrambleName(w.name), clue: w.clue })),
      timerDuration: timer,
    })
  }

  return (
    <>
      {/* Add word form */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add a Word</h2>
        <form onSubmit={handleAdd} className={styles.form}>
          <div className={styles.fieldRow3}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="w-word">Word</label>
              <input
                id="w-word"
                className={styles.input}
                placeholder="e.g. Hannah"
                value={form.word}
                onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
                maxLength={40}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="w-clue">
                Clue <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="w-clue"
                className={styles.input}
                placeholder="e.g. Mother of Samuel"
                value={form.clue}
                onChange={(e) => setForm((f) => ({ ...f, clue: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="w-diff">Difficulty</label>
              <select
                id="w-diff"
                className={styles.input}
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
              >
                <option value="">Auto</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <Button type="submit" size="md">+ Add Word</Button>
            {words.length === 0 && (
              <button type="button" className={styles.sampleBtn} onClick={loadSamples}>
                Load 10 sample words
              </button>
            )}
          </div>
        </form>
      </section>

      <BulkUpload kind="scramble" existing={words} onImport={handleImport} />

      <div className={styles.divider} />

      {/* Word list */}
      <section className={styles.section}>
        <div className={styles.listHeader}>
          <h2 className={styles.sectionTitle}>
            Words <span className={styles.count}>{words.length}</span>
          </h2>
          {words.length > 0 && (
            <button type="button" className={styles.clearBtn} onClick={() => onChange([])}>
              Clear all
            </button>
          )}
        </div>

        {words.length === 0 ? (
          <p className={styles.empty}>
            No words yet. Add one above, upload a sheet, or load the sample set.
          </p>
        ) : (
          <ol className={styles.wordGrid}>
            {words.map((w) => (
              <li key={w.id} className={styles.wordItem}>
                <div className={styles.wordContent}>
                  <p className={styles.wordName}>
                    {w.name}
                    <span className={`${styles.diffTag} ${styles[`diff${w.difficulty}`]}`}>
                      {DIFF_LABEL[w.difficulty]}
                    </span>
                  </p>
                  {w.clue && <p className={styles.wordClue}>{w.clue}</p>}
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => onChange((prev) => prev.filter((x) => x.id !== w.id))}
                  title="Remove word"
                  type="button"
                  aria-label={`Remove ${w.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Round settings + start */}
      {words.length > 0 && (
        <section className={styles.playSettings}>
          <div className={styles.settingGroup}>
            <span className={styles.label}>Play</span>
            <div className={styles.pills}>
              {[['all', 'All'], ...DIFFICULTIES.map((d) => [d.value, d.label])].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.pill} ${filter === value ? styles.pillActive : ''}`}
                  onClick={() => setFilter(value)}
                  disabled={counts[value] === 0}
                >
                  {label} <span className={styles.pillCount}>{counts[value]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.settingGroup}>
            <span className={styles.label}>Time per word</span>
            <div className={styles.pills}>
              {TIMERS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.pill} ${timer === t.value ? styles.pillActive : ''}`}
                  onClick={() => setTimer(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={shuffled} onChange={(e) => setShuffled(e.target.checked)} />
            Shuffle the order
          </label>
        </section>
      )}

      <div className={styles.footer}>
        <Button full size="lg" onClick={handleStart} disabled={playable.length === 0}>
          Start Scramble → ({playable.length} word{playable.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </>
  )
}
