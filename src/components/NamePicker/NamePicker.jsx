import { useRef } from 'react'
import { SOLO_NAMES, GROUP_NAMES } from '../../data/presetNames.js'
import styles from './NamePicker.module.css'

const ARROW_STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

/**
 * A wrapping row of single-choice chips. One Tab stop per row (the chosen
 * chip, else the first); arrow keys, Home and End move the choice, like the
 * setup screens' radio groups (Setup.jsx useRovingRadios).
 */
function Chips({ label, options, value, onChange }) {
  const rowRef = useRef(null)
  const index = options.indexOf(value)

  function onKeyDown(e) {
    const step = ARROW_STEP[e.key]
    let next
    if (step) next = ((index === -1 ? (step > 0 ? -1 : 0) : index) + step + options.length) % options.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = options.length - 1
    else return
    e.preventDefault()
    onChange(options[next])
    rowRef.current?.querySelectorAll('[role="radio"]')[next]?.focus()
  }

  return (
    <div ref={rowRef} className={styles.chips} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          tabIndex={i === (index === -1 ? 0 : index) ? 0 : -1}
          className={`${styles.chip} ${value === opt ? styles.chipActive : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/**
 * Pick a nickname: one tap on one list, no typing. Controlled: `value` is
 * the chosen name ('' for none), `onChange(name)` gets the new one.
 * Solo players pick a word ("Joy"), groups a group name ("Team Joy"); either
 * list starts with the fruit of the Spirit (Galatians 5:22-23).
 */
export default function NamePicker({ kind, value, onChange }) {
  const group = kind === 'group'
  return (
    <div className={styles.picker}>
      <p className={styles.label}>{group ? 'Pick your group name' : 'Pick your nickname'}</p>
      <Chips
        label={group ? 'Group name' : 'Nickname'}
        options={group ? GROUP_NAMES : SOLO_NAMES}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}

/**
 * One group name from a dropdown (TeamRegister and the multiplayer team
 * editor). Names in `taken` (other teams) are disabled so teams stay unique.
 */
export function GroupNameSelect({ value, onChange, taken = [], className = '', ...rest }) {
  const used = new Set(taken)
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {GROUP_NAMES.map((g) => (
        <option key={g} value={g} disabled={used.has(g) && g !== value}>{g}</option>
      ))}
    </select>
  )
}

/** The first group names not in `taken`, for default team lists */
export function freeGroupNames(count, taken = []) {
  const used = new Set(taken)
  return GROUP_NAMES.filter((g) => !used.has(g)).slice(0, count)
}
