import { useState } from 'react'
import Button from '../shared/Button.jsx'
import { usePlayer, brandName } from '../../context/PlayerContext.jsx'
import { uid } from '../../utils/builderImport.js'
import BulkUpload from './BulkUpload.jsx'
import ScrambleTab from './ScrambleTab.jsx'
import styles from './QuizBuilder.module.css'
import Stage from '../Stage/Stage.jsx'

const SAMPLE_QUESTIONS = [
  { question: 'What is the first book of the Bible?', answer: 'Genesis', reference: 'Genesis 1:1' },
  { question: 'How many books are in the New Testament?', answer: '27', reference: '' },
  { question: 'Who was thrown into the lion\'s den?', answer: 'Daniel', reference: 'Daniel 6:16' },
  { question: 'What is the shortest verse in the Bible?', answer: '"Jesus wept"', reference: 'John 11:35' },
  { question: 'Who was the first king of Israel?', answer: 'Saul', reference: '1 Samuel 10:24' },
  { question: 'How many days did it rain during the flood?', answer: '40 days and 40 nights', reference: 'Genesis 7:12' },
  { question: 'Who wrote most of the Psalms?', answer: 'King David', reference: 'Psalm titles' },
  { question: 'What were the names of Noah\'s three sons?', answer: 'Shem, Ham, and Japheth', reference: 'Genesis 6:10' },
  { question: 'Which apostle denied Jesus three times?', answer: 'Peter', reference: 'Matthew 26:75' },
  { question: 'What was the last plague in Egypt?', answer: 'Death of the firstborn', reference: 'Exodus 12:29' },
]

const TABS = [
  { id: 'quiz', label: 'Quiz' },
  { id: 'scramble', label: 'Scramble' },
]

/**
 * The moderator's workspace for a session's own content. Everything here is
 * held by QuizApp in memory only — leaving the builder discards it (by
 * design: nothing a fellowship uploads is stored anywhere).
 */
export default function QuizBuilder({
  tab,
  onTabChange,
  questions,
  onQuestionsChange,
  words,
  onWordsChange,
  onStartQuiz,
  onStartScramble,
  onBack,
}) {
  const { profile } = usePlayer()

  function handleBack() {
    const parts = []
    if (questions.length) parts.push(`${questions.length} question${questions.length === 1 ? '' : 's'}`)
    if (words.length) parts.push(`${words.length} word${words.length === 1 ? '' : 's'}`)
    if (parts.length && !window.confirm(`Leave the builder? Your ${parts.join(' and ')} will be discarded.`)) return
    onBack()
  }

  return (
    <Stage art="ezra" wide>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={handleBack} type="button">
            ← Back to Menu
          </button>
          <h1 className={styles.title}>Quiz &amp; Scramble Builder</h1>
          <p className={styles.subtitle}>
            Build your own quiz or word scramble. Type entries in or upload an Excel sheet, then
            host it for your group. Nothing is saved: it’s cleared when you leave the builder.
          </p>
        </div>

        <div className={styles.tabs} role="tablist" aria-label="What to build">
          {TABS.map((t) => {
            const count = t.id === 'quiz' ? questions.length : words.length
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                onClick={() => onTabChange(t.id)}
              >
                {t.label}
                {count > 0 && <span className={styles.tabCount}>{count}</span>}
              </button>
            )
          })}
        </div>

        {tab === 'quiz' ? (
          <QuizTab questions={questions} onChange={onQuestionsChange} onStart={onStartQuiz} />
        ) : (
          <ScrambleTab words={words} onChange={onWordsChange} onStart={onStartScramble} />
        )}
      </div>
    </Stage>
  )
}

function QuizTab({ questions, onChange, onStart }) {
  const [form, setForm] = useState({ question: '', answer: '', reference: '' })
  const [error, setError] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!form.question.trim()) { setError('Question text is required.'); return }
    if (!form.answer.trim()) { setError('Answer is required.'); return }
    const q = { id: uid(), question: form.question.trim(), answer: form.answer.trim(), reference: form.reference.trim() }
    onChange((prev) => [...prev, q])
    setForm({ question: '', answer: '', reference: '' })
    setError('')
  }

  function loadSamples() {
    onChange((prev) => [...prev, ...SAMPLE_QUESTIONS.map((q) => ({ ...q, id: uid() }))])
  }

  function handleImport(items, mode) {
    onChange((prev) => (mode === 'replace' ? items : [...prev, ...items]))
  }

  return (
    <>
      {/* Add question form */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add a Question</h2>
        <form onSubmit={handleAdd} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="q-text">Question</label>
            <textarea
              id="q-text"
              className={styles.textarea}
              placeholder="e.g. Who parted the Red Sea?"
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              rows={3}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="q-answer">Answer</label>
              <input
                id="q-answer"
                className={styles.input}
                placeholder="e.g. Moses"
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="q-ref">
                Bible Reference <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="q-ref"
                className={styles.input}
                placeholder="e.g. Exodus 14:21"
                value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              />
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.formActions}>
            <Button type="submit" size="md">+ Add Question</Button>
            {questions.length === 0 && (
              <button type="button" className={styles.sampleBtn} onClick={loadSamples}>
                Load 10 sample questions
              </button>
            )}
          </div>
        </form>
      </section>

      <BulkUpload kind="quiz" existing={questions} onImport={handleImport} />

      <div className={styles.divider} />

      {/* Question list */}
      <section className={styles.section}>
        <div className={styles.listHeader}>
          <h2 className={styles.sectionTitle}>
            Questions{' '}
            <span className={styles.count}>{questions.length}</span>
          </h2>
          {questions.length > 0 && (
            <button type="button" className={styles.clearBtn} onClick={() => onChange([])}>
              Clear all
            </button>
          )}
        </div>

        {questions.length === 0 ? (
          <p className={styles.empty}>
            No questions yet. Add one above, upload a sheet, or load the sample set.
          </p>
        ) : (
          <ol className={styles.list}>
            {questions.map((q, i) => (
              <li key={q.id} className={styles.questionItem}>
                <span className={styles.questionNum}>{i + 1}</span>
                <div className={styles.questionContent}>
                  <p className={styles.questionText}>{q.question}</p>
                  <p className={styles.questionMeta}>
                    <span className={styles.answerPreview}>{q.answer}</span>
                    {q.reference && (
                      <span className={styles.referenceChip}>{q.reference}</span>
                    )}
                  </p>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => onChange((prev) => prev.filter((x) => x.id !== q.id))}
                  title="Remove question"
                  type="button"
                  aria-label="Remove question"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Footer: start button */}
      <div className={styles.footer}>
        <Button full size="lg" onClick={onStart} disabled={questions.length === 0}>
          Start Quiz → ({questions.length} question{questions.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </>
  )
}
