import { useState } from 'react'
import {
  SOLO_FIRST, SOLO_SECOND, GROUP_NAMES, FRUIT_COUNT, FRUIT_REF,
  parsePresetName, soloName, randomItem,
} from '../../data/presetNames.js'
import styles from './NamePicker.module.css'

/** A wrapping row of single-choice chips */
function Chips({ label, options, value, onChange }) {
  return (
    <div className={styles.chips} role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          className={`${styles.chip} ${value === opt ? styles.chipActive : ''}`}
          onClick={() => onChange(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/** The fruit of the Spirit first, with its reference, then the rest */
function FruitThenRest({ label, list, value, onChange }) {
  return (
    <>
      <p className={styles.note}>Fruit of the Spirit <span className={styles.ref}>{FRUIT_REF}</span></p>
      <Chips label={`${label}: fruit of the Spirit`} options={list.slice(0, FRUIT_COUNT)} value={value} onChange={onChange} />
      <p className={styles.note}>More</p>
      <Chips label={`${label}: more`} options={list.slice(FRUIT_COUNT)} value={value} onChange={onChange} />
    </>
  )
}

/**
 * Pick a nickname from the preset lists; there is no free text. Controlled:
 * `value` is the full name ('' while incomplete), `onChange(name)` gets the
 * full name or '' once a solo pick is only half made.
 * Solo players combine a first and a second word; groups pick one name.
 */
export default function NamePicker({ kind, value, onChange }) {
  const initial = kind === 'group' ? null : splitValue(value)
  const [first, setFirst] = useState(initial?.[0] ?? '')
  const [second, setSecond] = useState(initial?.[1] ?? '')

  if (kind === 'group') {
    return (
      <div className={styles.picker}>
        <p className={styles.label} id="np-group">Pick your group name</p>
        <FruitThenRest label="Group name" list={GROUP_NAMES} value={value} onChange={onChange} />
        <Preview name={value} onSurprise={() => onChange(randomItem(GROUP_NAMES))} />
      </div>
    )
  }

  function pick(nextFirst, nextSecond) {
    setFirst(nextFirst)
    setSecond(nextSecond)
    onChange(soloName(nextFirst, nextSecond))
  }

  return (
    <div className={styles.picker}>
      <p className={styles.label}>1. First word</p>
      <FruitThenRest label="First word" list={SOLO_FIRST} value={first} onChange={(w) => pick(w, second)} />

      <p className={`${styles.label} ${styles.second}`}>2. Second word</p>
      <Chips label="Second word" options={SOLO_SECOND} value={second} onChange={(w) => pick(first, w)} />

      <Preview
        name={soloName(first, second)}
        onSurprise={() => pick(randomItem(SOLO_FIRST), randomItem(SOLO_SECOND))}
        hint={first && !second ? 'Now pick a second word' : !first && second ? 'Now pick a first word' : null}
      />
    </div>
  )
}

function splitValue(value) {
  const parsed = parsePresetName(value, 'individual')
  if (!parsed) return null
  const first = SOLO_FIRST.find((w) => parsed.base.startsWith(`${w} `))
  return [first, parsed.base.slice(first.length + 1)]
}

function Preview({ name, onSurprise, hint }) {
  return (
    <div className={styles.preview}>
      <span aria-live="polite">
        {name
          ? <>You’ll appear as <strong className={styles.name}>{name}</strong></>
          : hint ?? 'No real names: everyone plays under a nickname.'}
      </span>
      <button type="button" className={styles.surprise} onClick={onSurprise}>Surprise me</button>
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
      <optgroup label={`Fruit of the Spirit (${FRUIT_REF})`}>
        {GROUP_NAMES.slice(0, FRUIT_COUNT).map((g) => (
          <option key={g} value={g} disabled={used.has(g) && g !== value}>{g}</option>
        ))}
      </optgroup>
      <optgroup label="More">
        {GROUP_NAMES.slice(FRUIT_COUNT).map((g) => (
          <option key={g} value={g} disabled={used.has(g) && g !== value}>{g}</option>
        ))}
      </optgroup>
    </select>
  )
}

/** The first group names not in `taken`, for default team lists */
export function freeGroupNames(count, taken = []) {
  const used = new Set(taken)
  return GROUP_NAMES.filter((g) => !used.has(g)).slice(0, count)
}
