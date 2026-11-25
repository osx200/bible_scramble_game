import { useState } from 'react'
import { usePlayer, presetProfileName } from '../../context/PlayerContext.jsx'
import Button from '../shared/Button.jsx'
import NamePicker from '../NamePicker/NamePicker.jsx'
import { WelcomeIntro, WelcomeFooter, Verse } from './WelcomeIntro.jsx'
import Privacy from './Privacy.jsx'
import styles from './Welcome.module.css'
import menu from '../Menu/Menu.module.css'
import Stage from '../Stage/Stage.jsx'

const KINDS = [
  { id: 'individual', label: 'Individual' },
  { id: 'group', label: 'Group' },
]

/**
 * First screen on a new device, and the "Change" screen from the Menu.
 * The player picks a preset nickname (no typing), used in titles, greetings
 * and on the leaderboard. A first visit also introduces the app (purpose,
 * verse, contact, disclaimer, privacy); the "Change" screen is just the form.
 */
export default function Welcome() {
  const { profile, setProfile, editing, cancelEditing } = usePlayer()
  const [kind, setKind] = useState(profile?.kind ?? 'individual')
  const [name, setName] = useState(profile?.name ?? '')
  const [touched, setTouched] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  const valid = presetProfileName(name, kind) !== ''

  function chooseKind(id) {
    if (id === kind) return
    setKind(id)
    setName('') // solo names and group names are different lists
    setTouched(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (valid) setProfile({ name, kind })
  }

  const fields = (
    <>
      <p className={styles.label} id="kind-label">Playing as</p>
      <div
        className={styles.kindGroup}
        role="radiogroup"
        aria-labelledby="kind-label"
        data-seg
        style={{ '--seg-count': KINDS.length, '--seg-index': KINDS.findIndex((k) => k.id === kind) }}
      >
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kind === k.id}
            className={`${styles.kind} ${kind === k.id ? styles.kindActive : ''}`}
            onClick={() => chooseKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>

      <NamePicker kind={kind} value={name} onChange={setName} />

      {touched && !valid && (
        <p className={styles.error} role="alert">
          {kind === 'group' ? 'Pick a group name' : 'Pick a nickname'}
        </p>
      )}

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
            <p className={styles.subtitle}>Pick a new nickname for this device.</p>
          </div>
          {fields}
          <Button full variant="ghost" className={styles.cancel} onClick={cancelEditing}>
            Cancel
          </Button>
        </form>
      </Stage>
    )
  }

  // First visit, privacy page open from the footer
  if (showPrivacy) {
    return (
      <Stage art="creation">
        <div className={styles.card}>
          <button type="button" className={menu.backLink} onClick={() => setShowPrivacy(false)}>
            <span aria-hidden="true">←</span> Back
          </button>
          <div className={styles.header}>
            <h1 className={styles.title}>Privacy</h1>
          </div>
          <Privacy />
        </div>
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
          Pick a nickname. It becomes the title of your games and appears on the monthly leaderboard.
        </p>
        {fields}

        <WelcomeFooter onPrivacy={() => { setShowPrivacy(true); window.scrollTo(0, 0) }} />
      </form>
    </Stage>
  )
}
