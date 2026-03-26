import { useState, useRef, useEffect } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import Button from '../shared/Button.jsx'
import styles from './AnswerInput.module.css'

export default function AnswerInput({ roundKey, onSubmit, disabled }) {
  const [value, setValue] = useState('')
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef(null)

  // Auto-focus on mount and on each new round
  useEffect(() => {
    setValue('')
    if (!disabled) inputRef.current?.focus()
  }, [roundKey])

  function handleSubmit() {
    if (disabled) return
    const trimmed = value.trim()
    if (!trimmed) {
      setShaking(true)
      setTimeout(() => setShaking(false), 450)
      return
    }
    onSubmit(trimmed)
    setValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <input
          ref={inputRef}
          type="text"
          className={`${styles.input} ${shaking ? styles.shake : ''}`}
          placeholder="Type the book name..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
        />
        <Button onClick={handleSubmit} className={styles.submitBtn} disabled={disabled}>
          Submit
        </Button>
      </div>
      <p className={styles.hint}>
        Press <kbd className={styles.kbd}>Enter</kbd> to submit · not case-sensitive · numbers required (e.g. <em>1 Samuel</em>)
      </p>
    </div>
  )
}
