import { useState } from 'react'
import Button from '../shared/Button.jsx'
import styles from './QuizBuilder.module.css'

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

export default function QuizBuilder({ questions, onAdd, onRemove, onStart, onBackToScramble }) {
  const [form, setForm] = useState({ question: '', answer: '', reference: '' })
  const [error, setError] = useState('')
  const [samplesLoaded, setSamplesLoaded] = useState(false)

  function handleAdd(e) {
    e.preventDefault()
    if (!form.question.trim()) { setError('Question text is required.'); return }
    if (!form.answer.trim()) { setError('Answer is required.'); return }
    onAdd({ question: form.question.trim(), answer: form.answer.trim(), reference: form.reference.trim() })
    setForm({ question: '', answer: '', reference: '' })
    setError('')
  }

  function loadSamples() {
    SAMPLE_QUESTIONS.forEach(q => onAdd(q))
    setSamplesLoaded(true)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onBackToScramble} type="button">
            ← Back to Scramble
          </button>
          <div className={styles.titleRow}>
            <span className={styles.emoji}>❓</span>
            <h1 className={styles.title}>MyRestStop Bible Quiz</h1>
          </div>
          <p className={styles.subtitle}>
            Create questions, then run your quiz with a reveal button for each answer
          </p>
        </div>

        <div className={styles.divider} />

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
              {!samplesLoaded && (
                <button type="button" className={styles.sampleBtn} onClick={loadSamples}>
                  Load 10 sample questions
                </button>
              )}
            </div>
          </form>
        </section>

        <div className={styles.divider} />

        {/* Question list */}
        <section className={styles.section}>
          <div className={styles.listHeader}>
            <h2 className={styles.sectionTitle}>
              Questions{' '}
              <span className={styles.count}>{questions.length}</span>
            </h2>
          </div>

          {questions.length === 0 ? (
            <p className={styles.empty}>
              No questions yet — add one above or load the sample set.
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
                    onClick={() => onRemove(q.id)}
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
          <Button
            full
            size="lg"
            onClick={onStart}
            disabled={questions.length === 0}
          >
            Start Quiz → ({questions.length} question{questions.length !== 1 ? 's' : ''})
          </Button>
        </div>

      </div>
    </div>
  )
}
