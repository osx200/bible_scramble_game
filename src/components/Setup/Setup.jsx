import { useId, useRef, useState } from 'react'
import Button from '../shared/Button.jsx'
import styles from './Setup.module.css'

/**
 * The setup kit: every "choose your options, then start" screen is built
 * from these, so they all read the same way.
 *
 *   <SetupScreen title=… onBack=… summary="Solo · Easy · 45s" onStart=…>
 *     <Field label="Difficulty"><Segmented … /></Field>
 *     <MoreOptions changed={n}>…rarer options…</MoreOptions>
 *   </SetupScreen>
 *
 * Main choices stay visible; anything most people leave alone goes under
 * More options. The start bar (summary + Start) is sticky on phones.
 */
export function SetupScreen({
  title, subtitle, backLabel = 'Menu', onBack, summary, startLabel = 'Start game',
  onStart, onSubmit, startDisabled = false, error, children,
}) {
  const Tag = onSubmit ? 'form' : 'div'
  return (
    <Tag className={styles.screen} onSubmit={onSubmit}>
      {onBack && (
        <button type="button" className={styles.back} onClick={onBack}>
          <span aria-hidden="true">←</span> {backLabel}
        </button>
      )}
      <header className={styles.head}>
        <h1>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>

      <div className={styles.body}>{children}</div>

      <div className={styles.startBar}>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {summary && (
          // Keyed by its text so a change crossfades instead of snapping
          <p key={summary} className={styles.summary} aria-live="polite">{summary}</p>
        )}
        <Button
          type={onSubmit ? 'submit' : 'button'}
          size="lg"
          className={styles.startBtn}
          onClick={onSubmit ? undefined : onStart}
          disabled={startDisabled}
        >
          {startLabel}
        </Button>
      </div>
    </Tag>
  )
}

/** A labelled setting. `aside` sits at the right of the label row (e.g. a value). */
export function Field({ label, aside, hint, children }) {
  return (
    <div className={styles.field}>
      {(label || aside) && (
        <div className={styles.fieldHead}>
          {label && <span className={styles.label}>{label}</span>}
          {aside && <span className={styles.aside}>{aside}</span>}
        </div>
      )}
      {children}
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}

/** Arrow keys move the choice inside a radio group, as screen readers expect */
function useRovingRadios(values, value, onChange) {
  const ref = useRef(null)
  function onKeyDown(e) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const i = Math.max(values.indexOf(value), 0)
    const next = (i + step + values.length) % values.length
    onChange(values[next])
    ref.current?.querySelectorAll('[role="radio"]')[next]?.focus()
  }
  return { ref, onKeyDown }
}

/**
 * Compact one-of-many choice. The chosen segment is a single indicator that
 * slides between options ([data-seg] in global.css), so changing your mind
 * looks like movement, not a flicker.
 * options: [[value, label], …]
 */
export function Segmented({ options, value, onChange, label }) {
  const values = options.map(([v]) => v)
  const index = values.indexOf(value)
  const roving = useRovingRadios(values, value, onChange)
  return (
    <div
      ref={roving.ref}
      role="radiogroup"
      aria-label={label}
      className={styles.seg}
      data-seg
      style={{ '--seg-count': options.length, '--seg-index': index }}
      onKeyDown={roving.onKeyDown}
    >
      {options.map(([v, text]) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={v === value}
          tabIndex={v === value || (index === -1 && v === values[0]) ? 0 : -1}
          className={`${styles.segBtn} ${v === value ? styles.segOn : ''}`}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/**
 * The screen's main decision as large cards (word set, solo or teams…).
 * options: [{ value, title, desc }]
 */
export function ChoiceCards({ options, value, onChange, label, columns = 2 }) {
  const values = options.map((o) => o.value)
  const roving = useRovingRadios(values, value, onChange)
  return (
    <div
      ref={roving.ref}
      role="radiogroup"
      aria-label={label}
      className={styles.cards}
      style={{ '--cols': columns }}
      onKeyDown={roving.onKeyDown}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (!values.includes(value) && o.value === values[0]) ? 0 : -1}
            className={`${styles.card} ${on ? styles.cardOn : ''}`}
            onClick={() => onChange(o.value)}
          >
            <span className={styles.radio} aria-hidden="true" />
            <span className={styles.cardTitle}>{o.title}</span>
            {o.desc && <span className={styles.cardDesc}>{o.desc}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** − value + for a number with a clear range (seconds per round) */
export function Stepper({ value, onChange, min, max, step = 5, unit, label }) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button type="button" className={styles.stepBtn} onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={`Less (${label})`}>−</button>
      <output className={styles.stepValue} aria-live="polite">
        {value}<span className={styles.stepUnit}>{unit}</span>
      </output>
      <button type="button" className={styles.stepBtn} onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={`More (${label})`}>+</button>
    </div>
  )
}

/**
 * Rarer settings, folded away. Opens by itself when something inside has
 * already been changed, so a changed value is never hidden.
 */
export function MoreOptions({ changed = 0, children, label = 'More options' }) {
  const [open, setOpen] = useState(changed > 0)
  const id = useId()
  return (
    <div className={styles.more}>
      <button type="button" className={styles.moreBtn} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span className={styles.moreChevron} aria-hidden="true" />
        {label}
        {changed > 0 && <span className={styles.moreCount}>{changed} changed</span>}
      </button>
      {/* 0fr → 1fr rows: the panel grows to its own height without measuring */}
      <div id={id} className={`${styles.morePanel} ${open ? styles.moreOpen : ''}`} inert={open ? undefined : ''}>
        <div className={styles.moreInner}>
          {/* Padding lives on this inner box so the closed panel collapses to 0 */}
          <div className={styles.moreContent}>{children}</div>
        </div>
      </div>
    </div>
  )
}
