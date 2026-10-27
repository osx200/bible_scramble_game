import { useState } from 'react'
import { usePlayer, cleanPlayerName, NAME_MIN, NAME_MAX } from '../../context/PlayerContext.jsx'
import Button from '../shared/Button.jsx'
import { WelcomeIntro, WelcomeFooter, Verse } from './WelcomeIntro.jsx'
import styles from './Welcome.module.css'
import Stage from '../Stage/Stage.jsx'

const KINDS = [
  { id: 'individual', label: 'Individual', placeholder: 'Your name' },
  { id: 'group', label: 'Group', placeholder: 'e.g. Grace Fellowship Youth' },
]

/**
 * First screen on a new device, and the "Change" screen from the Menu.
 * Captures the name used in titles, greetings and on the leaderboard. A first
 * visit also introduces the app (purpose, verse, contact, disclaimer); the
 * "Change" screen is just the form.
 */
export default function Welcome() {
  const { profile, setProfile, editing, cancelEditing } = usePlayer()
  const [kind, setKind] = useState(profile?.kind ?? 'individual')
  const [name, setName] = useState(profile?.name ?? '')
  const [touched, setTouched] = useState(false)

  const cleaned = cleanPlayerName(name)
  const valid = cleaned.length >= NAME_MIN && cleaned.length <= NAME_MAX
  const activeKind = KINDS.find((k) => k.id === kind)

  function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (valid) setProfile({ name: cleaned, kind })
  }

  const fields = (
    <>
      <p className={styles.label} id="kind-label">Playing as</p>
      <div className={styles.kindGroup} role="radiogroup" aria-labelledby="kind-label">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kind === k.id}
            className={`${styles.kind} ${kind === k.id ? styles.kindActive : ''}`}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>

      <label className={styles.label} htmlFor="player-name">
        {kind === 'group' ? 'Group name' : 'Your name'}
      </label>
      <input
        id="player-name"
        className={`${styles.input} ${touched && !valid ? styles.inputError : ''}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={activeKind.placeholder}
        maxLength={NAME_MAX + 8 /* room for stray spaces that get trimmed */}
        autoComplete={kind === 'individual' ? 'given-name' : 'organization'}
        // Only on "Change": on a first visit it would pop the keyboard and
        // scroll past the welcome message
        autoFocus={editing}
        enterKeyHint="go"
      />
      <div className={styles.hintRow}>
        <span className={touched && !valid ? styles.error : styles.hint}>
          {touched && !valid ? `Use ${NAME_MIN} to ${NAME_MAX} characters` : 'Shown on the public leaderboard'}
        </span>
        <span className={`${styles.count} ${cleaned.length > NAME_MAX ? styles.error : ''}`}>
          {cleaned.length}/{NAME_MAX}
        </span>
      </div>

      <Button type="submit" full size="lg" className={styles.submit}>
        {editing ? 'Save' : "Let's Play →"}
      </Button>
    </>
  )

  // "Change" from the Menu: just the form
  if (editing) {
    return (
      <Stage art="creation">
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Bible Games</p>
            <h1 className={styles.title}>Change Player</h1>
            <p className={styles.subtitle}>Update who is playing on this device.</p>
          </div>
          {fields}
          <Button full variant="ghost" className={styles.cancel} onClick={cancelEditing}>
            Cancel
          </Button>
        </form>
      </Stage>
    )
  }

  // First visit: the verse rides on the artwork, everything else in one column
  return (
    <Stage art="creation" artOverlay={<Verse onArt />}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Welcome</p>
          <h1 className={styles.title}>Bible Games</h1>
        </div>
        <WelcomeIntro verseOnArt />

        <h2 className={styles.formHeading}>Who’s playing?</h2>
        <p className={styles.formLead}>
          Your name becomes the title of your games and appears on the monthly leaderboard.
        </p>
        {fields}

        <WelcomeFooter />
      </form>
    </Stage>
  )
}
