import { useEffect, useState } from 'react'
import { useAppMode, joinCodeFromUrl } from '../../context/AppModeContext.jsx'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { GroupNameSelect, freeGroupNames } from '../NamePicker/NamePicker.jsx'
import { WORD_SET_LIST } from '../../data/wordSets.js'
import { createRoom, getRoomInfo, joinRoom, loadSeat, saveSeat, clearSeat } from '../../utils/multiplayerApi.js'
import Stage from '../Stage/Stage.jsx'
import Button from '../shared/Button.jsx'
import { SetupScreen, Field, ChoiceCards, Segmented, MoreOptions } from '../Setup/Setup.jsx'
import RoomView from './RoomView.jsx'
import menu from '../Menu/Menu.module.css'
import styles from './Multiplayer.module.css'

/**
 * "Play With Others": create or join a remote game. Everything after joining
 * runs in RoomView over the WebSocket. The page address becomes /join/CODE
 * while in a room, so refreshing (or sharing the address) lands back in it.
 */
export default function MultiplayerApp() {
  const { setAppMode, multiplayerLaunch } = useAppMode()
  const urlCode = joinCodeFromUrl()
  const [seat, setSeat] = useState(() => (urlCode ? loadSeat(urlCode) : null))
  const [code, setCode] = useState(urlCode)
  const [view, setView] = useState(() => (urlCode ? (loadSeat(urlCode) ? 'room' : 'join') : multiplayerLaunch ? 'create' : 'home'))

  function enterRoom(roomCode, newSeat) {
    saveSeat(roomCode, newSeat)
    setSeat(newSeat)
    setCode(roomCode)
    window.history.replaceState(null, '', `/join/${roomCode}`)
    setView('room')
  }

  function leave() {
    setAppMode('scramble')
  }

  if (view === 'room' && code && seat) {
    return (
      <RoomView
        key={`${code}:${seat.token}`}
        code={code}
        token={seat.token}
        onLeave={leave}
        onSeatInvalid={() => { clearSeat(code); setSeat(null); setView('join') }}
      />
    )
  }
  if (view === 'create') {
    return <CreateGame launch={multiplayerLaunch} onCreated={enterRoom} onBack={() => (multiplayerLaunch ? leave() : setView('home'))} />
  }
  if (view === 'join') {
    return <JoinGame initialCode={code} onJoined={enterRoom} onBack={() => { window.history.replaceState(null, '', '/'); setView('home') }} />
  }
  return <Home onCreate={() => setView('create')} onJoin={() => setView('join')} onBack={leave} />
}

// ── Landing ──────────────────────────────────────────────────
function Home({ onCreate, onJoin, onBack }) {
  return (
    <Stage art="abraham">
      <div className={styles.screen}>
        <button type="button" className={menu.backLink} onClick={onBack}>
          <span aria-hidden="true">←</span> Menu
        </button>
        <h1>Play With Others</h1>
        <p className={styles.lead}>
          Play the same game at the same time with people anywhere. One person hosts and shares a link
          or code; everyone else joins on their own phone or computer.
        </p>
        <ul className={menu.modeGrid}>
          <li>
            <button type="button" className={`${menu.modeCard} ${menu.featuredCard}`} onClick={onCreate}>
              <span className={menu.modeTitle}>Create a game</span>
              <span className={menu.modeDesc}>Pick a game, get a room code and invite your group.</span>
              <span className={menu.modeArrow} aria-hidden="true">→</span>
            </button>
          </li>
          <li>
            <button type="button" className={menu.modeCard} onClick={onJoin} style={{ '--i': 1 }}>
              <span className={menu.modeTitle}>Join a game</span>
              <span className={menu.modeDesc}>Got a code or a link from your host? Start here.</span>
              <span className={menu.modeArrow} aria-hidden="true">→</span>
            </button>
          </li>
        </ul>
      </div>
    </Stage>
  )
}

/**
 * Everyone plays under their profile's preset nickname. The server adds a
 * number ("Joyful Lion 2") or a colour ("Team Joy Blue") if it's taken.
 */
function NameNote({ kind }) {
  return (
    <span className={styles.namePreview}>
      If someone in the game already has it, {kind === 'group' ? 'a colour' : 'a number'} is added
      so you can be told apart. Change your nickname from the Menu.
    </span>
  )
}

// ── Create ───────────────────────────────────────────────────
const ROUNDS = [5, 10, 15, 20]
const TIMES = [15, 20, 30, 45, 60, 90]
const cap = (w) => w[0].toUpperCase() + w.slice(1)

// Book Recall race: one round of 1 to 5 minutes (server/multiplayer/modes/recall.js)
const RECALL_TIMES = [60, 120, 180, 300]
const RECALL_CARD = { value: 'recall', title: 'Book Recall', desc: 'Name as many books of the Bible as you can before time runs out' }
const BOOKS_LABEL = { all: 'All 66 books', OT: 'Old Testament', NT: 'New Testament' }

const RACE_OPTIONS = [
  { value: false, title: 'Wait for the timer', desc: 'Everyone gets the full time to answer' },
  { value: true, title: 'First correct answer wins', desc: 'A race: first right scores, then move on' },
]

function CreateGame({ launch, onCreated, onBack }) {
  const { profile } = usePlayer()
  // From the Builder's "Host online": custom words or quiz questions
  const custom = launch?.kind ?? null // 'words' | 'questions' | null
  const [wordSet, setWordSet] = useState(custom === 'words' ? 'custom' : 'books')
  const [difficulty, setDifficulty] = useState('easy')
  const [category, setCategory] = useState('all')
  const [rounds, setRounds] = useState(10)
  const [seconds, setSeconds] = useState(30)
  const [recallSeconds, setRecallSeconds] = useState(120)
  const [useTeams, setUseTeams] = useState(false)
  const [teamNames, setTeamNames] = useState(() => freeGroupNames(2))
  const [reveal, setReveal] = useState('round')
  const [speedBonus, setSpeedBonus] = useState(false)
  const [firstCorrect, setFirstCorrect] = useState(false)
  const [minPlayers, setMinPlayers] = useState(2)
  const [hostPlays, setHostPlays] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const mode = custom === 'questions' ? 'quiz' : wordSet === 'recall' ? 'recall' : 'unscramble'
  const isRecall = mode === 'recall'
  const showCategory = mode === 'unscramble' && wordSet !== 'custom' && wordSet !== 'couples'
  const setLabel = custom === 'words' ? 'Your words' : custom === 'questions' ? 'Your quiz'
    : isRecall ? RECALL_CARD.title : WORD_SET_LIST.find((w) => w.id === wordSet)?.label

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await createRoom({
      hostName: profile?.name,
      hostKind: profile?.kind ?? 'individual',
      settings: {
        mode, wordSet, difficulty, category: showCategory || isRecall ? category : 'all', rounds,
        seconds: isRecall ? recallSeconds : seconds,
        reveal, speedBonus, firstCorrect: isRecall ? false : firstCorrect, minPlayers, hostPlays, autoAdvance: true,
        teams: useTeams ? teamNames : null,
      },
      payload: launch ? { words: launch.words, questions: launch.questions } : undefined,
    })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onCreated(res.code, { token: res.token, role: 'host' })
  }

  const summary = (isRecall
    ? [
        `Host ${profile?.name ?? '?'}`,
        setLabel,
        BOOKS_LABEL[category],
        `${recallSeconds / 60} min`,
        useTeams ? `${teamNames.length} teams, shared lists` : null,
        hostPlays ? 'You play too' : null,
      ]
    : [
        `Host ${profile?.name ?? '?'}`,
        setLabel,
        mode === 'unscramble' && !custom && cap(difficulty),
        mode === 'unscramble' && `${rounds} rounds`,
        `${seconds}s each`,
        firstCorrect ? 'Race' : null,
        useTeams ? `${teamNames.length} teams` : null,
        hostPlays ? 'You play too' : null,
      ]).filter(Boolean).join(' · ')

  const changed = isRecall
    ? hostPlays + (minPlayers !== 2)
    : (showCategory && category !== 'all') + (rounds !== 10) + (seconds !== 30)
      + (reveal !== 'round') + speedBonus + hostPlays + (minPlayers !== 2)

  return (
    <Stage art="abraham" wide>
      <SetupScreen
        title="Create a game"
        subtitle={custom
          ? `Hosting your Builder ${custom === 'words' ? `words (${launch.words.length})` : `questions (${launch.questions.length})`}. They are kept only for this game.`
          : 'Choose a game; everyone else joins with a code or link.'}
        backLabel={launch ? 'Menu' : 'Back'}
        onBack={onBack}
        summary={summary}
        startLabel={busy ? 'Creating…' : 'Create game'}
        startDisabled={busy}
        onSubmit={submit}
        error={error}
      >

        {!custom && (
          <Field label="Game">
            <ChoiceCards
              label="Game"
              options={[...WORD_SET_LIST.map((w) => ({ value: w.id, title: w.label, desc: w.cardDesc })), RECALL_CARD]}
              value={wordSet}
              onChange={setWordSet}
            />
          </Field>
        )}
        {mode === 'unscramble' && !custom && (
          <Field label="Difficulty">
            <Segmented label="Difficulty" options={[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]} value={difficulty} onChange={setDifficulty} />
          </Field>
        )}

        {isRecall ? (
          <>
            <Field label="Books">
              <Segmented label="Books" options={[['all', 'All 66'], ['OT', 'Old Testament'], ['NT', 'New Testament']]} value={category} onChange={setCategory} />
            </Field>
            <Field label="Time" hint="One round. Each book a player names is 1 point; an equal count goes to whoever got there first.">
              <Segmented label="Time" options={RECALL_TIMES.map((n) => [n, `${n / 60} min`])} value={recallSeconds} onChange={setRecallSeconds} />
            </Field>
          </>
        ) : (
          <Field label="When someone gets it right" hint={firstCorrect ? 'Wrong guesses cost 2 points; players can try again.' : null}>
            <ChoiceCards label="When someone gets it right" options={RACE_OPTIONS} value={firstCorrect} onChange={setFirstCorrect} />
          </Field>
        )}

        <Field label="Competition" hint={isRecall && useTeams ? 'Each team fills one shared list together; a book counts once per team.' : null}>
          <Segmented label="Competition" options={[[false, 'Everyone for themselves'], [true, 'Teams']]} value={useTeams} onChange={setUseTeams} />
          {useTeams && (
            <div className={styles.teamEditor}>
              {teamNames.map((t, i) => (
                <GroupNameSelect
                  key={i}
                  className={styles.input}
                  value={t}
                  taken={teamNames.filter((_, j) => j !== i)}
                  aria-label={`Team ${i + 1} name`}
                  onChange={(name) => setTeamNames((names) => names.map((n, j) => (j === i ? name : n)))}
                />
              ))}
              <div className={styles.inlineActions}>
                {teamNames.length < 6 && <button type="button" className={styles.textBtn} onClick={() => setTeamNames((n) => [...n, freeGroupNames(1, n)[0]])}>+ Add team</button>}
                {teamNames.length > 2 && <button type="button" className={styles.textBtn} onClick={() => setTeamNames((n) => n.slice(0, -1))}>Remove last</button>}
              </div>
            </div>
          )}
        </Field>

        <MoreOptions changed={changed}>
          {showCategory && (
            <Field label="Category">
              <Segmented label="Category" options={[['all', 'All'], ['OT', 'Old Testament'], ['NT', 'New Testament']]} value={category} onChange={setCategory} />
            </Field>
          )}
          {mode === 'unscramble' && (
            <Field label="Rounds">
              <Segmented label="Rounds" options={ROUNDS.map((n) => [n, String(n)])} value={rounds} onChange={setRounds} />
            </Field>
          )}
          {!isRecall && (
            <Field label="Seconds per round">
              <Segmented label="Seconds per round" options={TIMES.map((n) => [n, `${n}s`])} value={seconds} onChange={setSeconds} />
            </Field>
          )}
          {!firstCorrect && !isRecall && (
            <Field label="Show players if they were right">
              <Segmented label="Show players if they were right" options={[['round', 'After each round'], ['instant', 'Straight away']]} value={reveal} onChange={setReveal} />
            </Field>
          )}
          {!firstCorrect && !isRecall && (
            <Field label="Speed bonus" hint="Up to +10 extra for fast correct answers.">
              <Segmented label="Speed bonus" options={[[false, 'Off'], [true, 'On']]} value={speedBonus} onChange={setSpeedBonus} />
            </Field>
          )}
          <Field label="Your role">
            <Segmented label="Your role" options={[[false, 'Host on the big screen'], [true, 'Host and play']]} value={hostPlays} onChange={setHostPlays} />
          </Field>
          <Field label="Players needed to start">
            <Segmented label="Players needed to start" options={[[1, '1'], [2, '2'], [3, '3'], [4, '4']]} value={minPlayers} onChange={setMinPlayers} />
          </Field>
        </MoreOptions>
      </SetupScreen>
    </Stage>
  )
}

// ── Join ─────────────────────────────────────────────────────
function JoinGame({ initialCode, onJoined, onBack }) {
  const { profile } = usePlayer()
  const [code, setCode] = useState(initialCode ?? '')
  const [info, setInfo] = useState(null)
  const [teamId, setTeamId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function lookUp(e) {
    e?.preventDefault()
    setBusy(true)
    setError('')
    const res = await getRoomInfo(code.trim())
    setBusy(false)
    if (!res.ok) { setInfo(null); return setError(res.error) }
    setInfo(res.room)
    setTeamId(res.room.teams?.[0]?.id ?? null)
  }

  // Arriving from an invitation link: look the room up straight away
  useEffect(() => {
    if (initialCode) lookUp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function join(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await joinRoom(info.code, { name: profile?.name, teamId, asGroup: profile?.kind === 'group' })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onJoined(res.code, { token: res.token, role: 'player' })
  }

  return (
    <Stage art="abraham">
      <div className={styles.screen}>
        <button
          type="button"
          className={menu.backLink}
          onClick={info ? () => { setInfo(null); setError('') } : onBack}
        >
          <span aria-hidden="true">←</span> {info ? 'Different code' : 'Back'}
        </button>
        <h1>Join a game</h1>
        {!info ? (
          <form onSubmit={lookUp} className={styles.joinForm}>
            <label className={styles.label} htmlFor="mp-code">Room code</label>
            <input
              id="mp-code"
              className={`${styles.input} ${styles.fieldInput} ${styles.codeInput}`}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BETHEL4827"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              required
            />
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              <Button type="submit" size="lg" disabled={busy || code.trim().length < 6}>{busy ? 'Checking…' : 'Find game'}</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={join} className={styles.joinForm}>
            <dl className={styles.roomFacts}>
              <div><dt>Game</dt><dd>{info.modeLabel}</dd></div>
              <div><dt>Host</dt><dd>{info.hostName}</dd></div>
              <div><dt>Players</dt><dd>{info.playerCount} joined</dd></div>
              {info.firstCorrect && <div><dt>Rounds</dt><dd>First correct answer wins</dd></div>}
              {info.mode === 'unscramble' && <div><dt>Difficulty</dt><dd className={styles.cap}>{info.difficulty}</dd></div>}
              {info.mode === 'recall' && <div><dt>Time</dt><dd>{info.seconds / 60} min, name as many books as you can</dd></div>}
              <div><dt>Status</dt><dd>{info.status === 'lobby' ? 'Waiting to start' : 'In progress (you can still join)'}</dd></div>
            </dl>
            <Field label="You’ll join as" hint={<NameNote kind={profile?.kind} />}>
              <p className={styles.joinName}>{profile?.name}</p>
            </Field>
            {info.teams && (
              <Field label="Your team">
                <ChoiceCards label="Your team" options={info.teams.map((t) => ({ value: t.id, title: t.name }))} value={teamId} onChange={setTeamId} />
              </Field>
            )}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              <Button type="submit" size="lg" disabled={busy}>{busy ? 'Joining…' : 'Join Game'}</Button>
            </div>
          </form>
        )}
      </div>
    </Stage>
  )
}
