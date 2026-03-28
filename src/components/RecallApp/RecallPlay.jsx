import { useState, useEffect, useRef, useCallback } from 'react'
import { matchBookName } from '../../data/canonicalBooks.js'
import styles from './RecallPlay.module.css'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function RecallPlay({ config, onFinish }) {
  const { timerDuration, targetBooks } = config
  const total = targetBooks.length

  const [timeRemaining, setTimeRemaining] = useState(timerDuration)
  const [inputValue,    setInputValue]    = useState('')
  const [namedSet,      setNamedSet]      = useState(() => new Set())
  const [feedback,      setFeedback]      = useState(null) // { message, type: 'success'|'error' }
  const [shaking,       setShaking]       = useState(false)
  const [done,          setDone]          = useState(false)

  const inputRef     = useRef(null)
  const feedbackRef  = useRef(null)
  const namedSetRef  = useRef(namedSet)

  // Keep ref in sync so the timer-expiry handler sees fresh data
  useEffect(() => { namedSetRef.current = namedSet }, [namedSet])

  // ── Countdown timer ──────────────────────────────────────────
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(id)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  // When time hits 0, finish
  useEffect(() => {
    if (timeRemaining === 0 && !done) {
      setDone(true)
      onFinish([...namedSetRef.current])
    }
  }, [timeRemaining, done, onFinish])

  // ── Input handling ───────────────────────────────────────────
  const triggerShake = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 450)
  }, [])

  const showFeedback = useCallback((message, type, duration = 1400) => {
    clearTimeout(feedbackRef.current)
    setFeedback({ message, type })
    feedbackRef.current = setTimeout(() => setFeedback(null), duration)
  }, [])

  useEffect(() => () => clearTimeout(feedbackRef.current), [])

  function handleSubmit(e) {
    e.preventDefault()
    const raw = inputValue.trim()
    if (!raw) return

    const canonical = matchBookName(raw)

    if (!canonical) {
      triggerShake()
      showFeedback('Not a Bible book — check your spelling', 'error')
      return
    }

    // Check it belongs to the selected category
    const inTarget = targetBooks.some(b => b.name === canonical)
    if (!inTarget) {
      const testament = canonical.includes('Samuel') || canonical.includes('Kings')
        ? 'Old Testament' : 'New Testament'
      triggerShake()
      showFeedback(`${canonical} is not in the selected category`, 'error')
      return
    }

    if (namedSet.has(canonical)) {
      triggerShake()
      showFeedback(`${canonical} already named!`, 'error')
      return
    }

    // ✓ Valid, new entry
    setNamedSet(prev => new Set([...prev, canonical]))
    setInputValue('')
    showFeedback(`✓ ${canonical}`, 'success', 1200)
    inputRef.current?.focus()
  }

  // Books shown in canonical order with named status
  const orderedBooks = targetBooks.map(b => ({
    ...b,
    named: namedSet.has(b.name),
  }))

  const score = namedSet.size
  const timerLow  = timeRemaining <= 30 && timeRemaining > 10
  const timerDanger = timeRemaining <= 10

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>

        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <div className={`${styles.timer} ${timerLow ? styles.timerLow : ''} ${timerDanger ? styles.timerDanger : ''}`}>
            {formatTime(timeRemaining)}
          </div>
          <div className={styles.counter}>
            <span className={styles.counterNum}>{score}</span>
            <span className={styles.counterOf}> / {total}</span>
          </div>
        </div>

        {/* ── Input ── */}
        <form className={styles.inputRow} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={`${styles.input} ${shaking ? styles.inputShake : ''}`}
            placeholder="Type a Bible book name…"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            autoFocus
          />
          <button type="submit" className={styles.submitBtn}>→</button>
        </form>

        {/* Feedback */}
        <div className={styles.feedbackSlot} aria-live="polite">
          {feedback && (
            <span className={`${styles.feedback} ${feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
              {feedback.message}
            </span>
          )}
        </div>

        {/* ── Named books grid ── */}
        <div className={styles.booksGrid}>
          {orderedBooks.map(b => (
            <span
              key={b.name}
              className={`${styles.chip} ${b.named ? styles.chipNamed : styles.chipEmpty}`}
            >
              {b.named ? b.name : '?'}
            </span>
          ))}
        </div>

        {/* Finish early */}
        <button
          type="button"
          className={styles.finishBtn}
          onClick={() => { setDone(true); onFinish([...namedSet]) }}
        >
          Finish Early
        </button>

      </div>
    </div>
  )
}
