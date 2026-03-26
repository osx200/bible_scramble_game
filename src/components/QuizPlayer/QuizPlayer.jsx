import { useState } from 'react'
import Button from '../shared/Button.jsx'
import styles from './QuizPlayer.module.css'

export default function QuizPlayer({ questions, onBack }) {
  const [index, setIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [scores, setScores] = useState(() => questions.map(() => null)) // null | 'correct' | 'wrong'
  const [finished, setFinished] = useState(false)

  const question = questions[index]
  const total = questions.length
  const correct = scores.filter(s => s === 'correct').length
  const wrong = scores.filter(s => s === 'wrong').length
  const answered = scores.filter(s => s !== null).length
  const progress = ((index + 1) / total) * 100

  function goNext() {
    if (index < total - 1) {
      setIndex(i => i + 1)
      setShowAnswer(false)
    } else {
      setFinished(true)
    }
  }

  function goPrev() {
    if (index > 0) {
      setIndex(i => i - 1)
      setShowAnswer(false)
    }
  }

  function markScore(result) {
    setScores(prev => {
      const next = [...prev]
      next[index] = result
      return next
    })
  }

  function restart() {
    setIndex(0)
    setShowAnswer(false)
    setScores(questions.map(() => null))
    setFinished(false)
  }

  // ── Finished summary ──────────────────────────────────────
  if (finished) {
    const skipped = total - answered
    const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0

    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.summaryHeader}>
            <div className={styles.summaryEmoji}>
              {pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '📖'}
            </div>
            <h1 className={styles.summaryTitle}>Quiz Complete!</h1>
            {answered > 0 && (
              <p className={styles.summaryScore}>{pct}% correct</p>
            )}
          </div>

          <div className={styles.summaryStats}>
            <div className={styles.statBox}>
              <span className={`${styles.statNum} ${styles.statNumCorrect}`}>{correct}</span>
              <span className={styles.statLabel}>Correct</span>
            </div>
            <div className={styles.statBox}>
              <span className={`${styles.statNum} ${styles.statNumWrong}`}>{wrong}</span>
              <span className={styles.statLabel}>Wrong</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{skipped}</span>
              <span className={styles.statLabel}>Skipped</span>
            </div>
          </div>

          <div className={styles.summaryActions}>
            <Button full size="lg" onClick={restart}>Play Again</Button>
            <button className={styles.editBtn} onClick={onBack} type="button">
              ← Edit Questions
            </button>
          </div>

          {/* Review list */}
          <div className={styles.reviewSection}>
            <h2 className={styles.reviewTitle}>Answer Review</h2>
            <div className={styles.reviewList}>
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className={`${styles.reviewItem} ${
                    scores[i] === 'correct' ? styles.reviewCorrect :
                    scores[i] === 'wrong'   ? styles.reviewWrong :
                                              styles.reviewSkipped
                  }`}
                >
                  <span className={styles.reviewIcon}>
                    {scores[i] === 'correct' ? '✓' : scores[i] === 'wrong' ? '✗' : '—'}
                  </span>
                  <div className={styles.reviewContent}>
                    <p className={styles.reviewQ}>{q.question}</p>
                    <p className={styles.reviewA}>
                      {q.answer}
                      {q.reference && <span className={styles.reviewRef}> · {q.reference}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Active question ───────────────────────────────────────
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* Top bar */}
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={onBack} type="button">
            ← Edit
          </button>
          <div className={styles.scoreChips}>
            <span className={styles.chipCorrect}>✓ {correct}</span>
            <span className={styles.chipWrong}>✗ {wrong}</span>
          </div>
        </div>

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressLabel}>
            Question <strong>{index + 1}</strong>
            <span className={styles.progressOf}> of {total}</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          {/* Dot indicators for small quiz sets */}
          {total <= 20 && (
            <div className={styles.dots}>
              {questions.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.dot} ${
                    i === index ? styles.dotCurrent :
                    scores[i] === 'correct' ? styles.dotCorrect :
                    scores[i] === 'wrong'   ? styles.dotWrong :
                                              ''
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Question card */}
        <div className={styles.questionCard}>
          <p className={styles.questionText}>{question.question}</p>
        </div>

        {/* Answer area */}
        <div className={styles.answerArea}>
          {!showAnswer ? (
            <button
              className={styles.revealBtn}
              onClick={() => setShowAnswer(true)}
              type="button"
            >
              👁 Show Answer
            </button>
          ) : (
            <div className={styles.answerReveal}>
              <p className={styles.answerLabel}>Answer</p>
              <p className={styles.answerText}>{question.answer}</p>
              {question.reference && (
                <p className={styles.referenceText}>{question.reference}</p>
              )}

              {/* Mark correct / wrong */}
              {scores[index] === null ? (
                <div className={styles.markButtons}>
                  <button
                    className={styles.btnCorrect}
                    onClick={() => markScore('correct')}
                    type="button"
                  >
                    ✓ Correct
                  </button>
                  <button
                    className={styles.btnWrong}
                    onClick={() => markScore('wrong')}
                    type="button"
                  >
                    ✗ Wrong
                  </button>
                </div>
              ) : (
                <div className={styles.markedRow}>
                  <span className={scores[index] === 'correct' ? styles.markedCorrect : styles.markedWrong}>
                    {scores[index] === 'correct' ? '✓ Correct' : '✗ Wrong'}
                  </span>
                  <button
                    className={styles.undoBtn}
                    onClick={() => markScore(null)}
                    type="button"
                  >
                    Undo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className={styles.navigation}>
          <button
            className={styles.navBtn}
            onClick={goPrev}
            disabled={index === 0}
            type="button"
          >
            ← Prev
          </button>
          <button
            className={`${styles.navBtn} ${styles.navBtnNext}`}
            onClick={goNext}
            type="button"
          >
            {index === total - 1 ? 'Finish Quiz ✓' : 'Next →'}
          </button>
        </div>

      </div>
    </div>
  )
}
