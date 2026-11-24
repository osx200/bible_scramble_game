import { useState } from 'react'
import { useVoiceInput } from '../../hooks/useVoiceInput.js'
import { resolveSpokenAnswer } from '../../utils/voiceMatch.js'
import { WORD_SETS } from '../../data/wordSets.js'
import Stage from '../Stage/Stage.jsx'
import Button from '../shared/Button.jsx'
import { Countdown, Standings, useCountdown, verdictLabel } from './parts.jsx'
import RecallRace from './RecallRace.jsx'
import tiles from '../ScrambledWord/ScrambledWord.module.css'
import styles from './Multiplayer.module.css'

/** The shared game screen: same round for everyone, controls for the host */
export default function PlayView({ mp, onLeave }) {
  const { snapshot, send, clockOffset } = mp
  const { room, you, players, teams, round } = snapshot
  const s = room.settings
  const seconds = useCountdown(round, clockOffset)
  const me = players.find((p) => p.id === you.playerId)

  // Book Recall is one long round with many answers each: its own screen
  if (s.mode === 'recall') return <RecallRace mp={mp} onLeave={onLeave} />
  if (!round) return null
  const isPlayer = Boolean(you.playerId)

  return (
    <Stage>
      <div className={styles.play}>
        <header className={styles.playTop}>
          <div>
            <span className={styles.label}>Round</span>
            <p className={styles.playRound}>{round.index + 1} <span>/ {round.total}</span></p>
          </div>
          <p className={styles.playCode}>Room {room.code}</p>
          {me && (
            <div className={styles.playScore}>
              <span className={styles.label}>Your score</span>
              <p>{me.score}</p>
            </div>
          )}
          {!me && you.isHost && <p className={styles.hostBadge}>You are hosting</p>}
        </header>

        <div className={styles.playGrid}>
          <main className={styles.playMain}>
            {round.phase === 'open' && (
              <Countdown seconds={seconds} total={Math.round(round.roundMs / 1000)} paused={round.paused} />
            )}
            <Prompt round={round} />

            {round.phase === 'open' && isPlayer && (
              <AnswerBox key={round.index} round={round} settings={s} onSubmit={(text) => send('answer', { text })} />
            )}
            {round.phase === 'open' && (
              <p className={styles.progressLine}>
                {round.answeredIds.length} of {players.length} {s.firstCorrect ? 'have guessed' : 'answered'}
                {round.paused && ' · paused'}
              </p>
            )}
            {round.phase === 'review' && !you.isHost && (
              <p className={styles.waitLine}>The host is checking a few answers…</p>
            )}
            {round.phase === 'revealed' && <Reveal round={round} youId={you.playerId} autoAdvance={s.autoAdvance} settings={s} />}

            {you.isHost && <HostControls round={round} send={send} />}
          </main>

          <aside className={styles.playSide} aria-label="Live standings">
            <h2 className={styles.sectionTitle}>Standings</h2>
            <Standings
              players={players}
              teams={teams}
              youId={you.playerId}
              answeredIds={round.phase === 'open' ? round.answeredIds : null}
              showDelta={round.phase === 'revealed'}
            />
            <button type="button" className={styles.backLink} onClick={onLeave}>← Leave game</button>
          </aside>
        </div>
      </div>
    </Stage>
  )
}

// ── The question / scramble ──────────────────────────────────
function Prompt({ round }) {
  const p = round.prompt
  if (p.kind === 'quiz') {
    return <p className={styles.question}>{p.question}</p>
  }
  const words = p.scrambled.split(' ')
  // Same cascade as the single-device board: 25ms apart, capped at 300ms
  let letterIndex = 0
  return (
    <div className={tiles.wrapper}>
      {p.partner && (
        <p className={tiles.pairPrompt}>
          {p.partnerFirst
            ? <><span className={tiles.pairName}>{p.partner}</span> &amp; <span className={tiles.pairBlank}>{p.blank}</span></>
            : <><span className={tiles.pairBlank}>{p.blank}</span> &amp; <span className={tiles.pairName}>{p.partner}</span></>}
        </p>
      )}
      <div className={tiles.group}>
        {words.map((word, wi) => (
          <span key={wi} className={styles.tileWord}>
            {word.split('').map((ch, ci) => (
              <span key={`${round.index}-${wi}-${ci}`} className={`${tiles.tile} ${/^\d+$/.test(word) ? tiles.prefix : ''}`} style={{ animationDelay: `${Math.min(letterIndex++ * 25, 300)}ms` }}>
                {ch.toUpperCase()}
              </span>
            ))}
          </span>
        ))}
      </div>
      <p className={tiles.hint}>
        {p.partner ? `Unscramble the name of ${p.partner}’s spouse` : p.wordCount > 1 ? `${p.wordCount}-word name` : 'Unscramble the letters'}
      </p>
      {p.clue && <p className={styles.clue}><span className={styles.label}>Clue</span> {p.clue}</p>}
    </div>
  )
}

// ── A player's answer (one attempt per round, or retries in a race) ──
function AnswerBox({ round, settings, onSubmit }) {
  const [text, setText] = useState('')
  const mine = round.mine
  const builtInSet = settings.mode === 'unscramble' && settings.wordSet in WORD_SETS

  const voice = useVoiceInput({
    onResult: (alts) => {
      // Fill the box, don't submit: a wrong guess costs points
      setText(builtInSet ? resolveSpokenAnswer(alts, settings.wordSet).text : alts[0])
    },
  })

  if (mine && !mine.canRetry) {
    return (
      <div className={styles.sent} role="status">
        <p>Your answer: <strong>{mine.text}</strong></p>
        <p className={styles.sentNote}>
          {mine.verdict === 'correct' && 'Correct! Waiting for the others…'}
          {mine.verdict === 'wrong' && 'Not quite. The answer is revealed when the round ends.'}
          {mine.verdict === 'pending' && (settings.firstCorrect ? 'The host is checking your answer.' : 'The host will check this one.')}
          {!mine.verdict && 'Sent. Results appear when the round ends.'}
        </p>
      </div>
    )
  }

  const disabled = round.paused
  return (
    <>
    {mine?.canRetry && (
      // Keyed by the guess count so the note re-enters on every miss
      <div key={mine.wrongs} className={styles.sent} role="status">
        <p>Not quite: <strong>{mine.text}</strong> (-2)</p>
        <p className={styles.sentNote}>Try again. The first correct answer wins the round.</p>
      </div>
    )}
    <form
      className={styles.answerRow}
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSubmit(text.trim()); setText('') } }}
    >
      <input
        className={styles.input}
        value={voice.listening && voice.interim ? voice.interim : text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? 'Paused' : settings.mode === 'quiz' ? 'Type your answer…' : 'Type the name…'}
        aria-label="Your answer"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        autoFocus
      />
      {voice.supported && (
        <button
          type="button"
          className={`${styles.micBtn} ${voice.listening ? styles.micLive : ''}`}
          onClick={voice.listening ? voice.stop : voice.start}
          aria-label={voice.listening ? 'Stop listening' : 'Say your answer'}
          disabled={disabled}
        >
          🎤
        </button>
      )}
      <Button type="submit" disabled={disabled || !text.trim()}>Submit</Button>
      <p className={styles.answerHint}>
        {settings.firstCorrect
          ? 'First correct answer wins. Wrong guesses cost 2 points, but you can try again.'
          : 'One answer per round, so check it before you submit.'}
      </p>
    </form>
    </>
  )
}

// ── End of round ─────────────────────────────────────────────
/** A race-round result: what earned the points, in plain words */
function raceLine(res) {
  const misses = res.wrongs === 1 ? '1 wrong guess' : `${res.wrongs} wrong guesses`
  if (res.first) return res.wrongs ? `First, after ${misses}` : 'First'
  if (res.wrongs) return misses
  return res.verdict === 'late' ? 'Right, but not first' : res.verdict === 'none' ? 'No answer' : 'Not first'
}

function Reveal({ round, youId, autoAdvance, settings }) {
  const r = round.reveal
  const mine = r.results.find((x) => x.playerId === youId)
  const solvers = r.results.filter((x) => x.verdict === 'correct').map((x) => x.name)
  const race = Boolean(settings?.firstCorrect)
  return (
    <section className={styles.reveal} aria-live="polite">
      {r.skipped ? (
        <p className={styles.revealLabel}>Question skipped: no points this round</p>
      ) : (
        <>
          <p className={styles.revealLabel}>The answer</p>
          <p className={styles.revealAnswer}>{r.answer}</p>
          {r.reference && <p className={styles.revealRef}>{r.reference}</p>}
        </>
      )}
      {mine && !r.skipped && (
        <p className={`${styles.myResult} ${mine.verdict === 'correct' ? styles.good : styles.bad}`}>
          {race ? raceLine(mine) : verdictLabel(mine.verdict)}: {mine.points > 0 ? `+${mine.points}` : mine.points} points
        </p>
      )}
      {!r.skipped && (
        <p className={styles.solvers}>
          {race
            ? (r.winner ? `${r.winner.name} got it first!` : 'Nobody got this one.')
            : solvers.length ? `Got it: ${solvers.join(', ')}` : 'Nobody got this one.'}
        </p>
      )}
      {autoAdvance && !round.paused && <p className={styles.waitLine}>Next question coming up…</p>}
    </section>
  )
}

// ── Host dashboard ───────────────────────────────────────────
function HostControls({ round, send }) {
  const last = round.index + 1 >= round.total
  const responses = round.responses ?? []
  // Answers that needed a human decision (still pending, or already decided by the host)
  const toReview = responses.filter((r) => r.verdict === 'pending' || r.decided)

  function confirmThen(message, type) {
    if (window.confirm(message)) send(type)
  }

  return (
    <section className={styles.hostPanel} aria-label="Host controls">
      <h2 className={styles.sectionTitle}>Host controls</h2>

      {round.phase === 'review' && (
        <div className={styles.review}>
          <p className={styles.reviewLead}>These answers don’t match exactly. Accept the ones that are right:</p>
          <ul className={styles.reviewList}>
            {toReview.map((r) => (
              <li key={r.playerId} className={styles.reviewRow}>
                <span><strong>{r.name}</strong> answered “{r.text}”</span>
                <span className={styles.inlineActions}>
                  <button type="button" className={`${styles.chipBtn} ${r.verdict === 'correct' ? styles.chipOn : ''}`} onClick={() => send('accept', { playerId: r.playerId, accept: true })}>Accept</button>
                  <button type="button" className={`${styles.chipBtn} ${r.verdict === 'pending-rejected' ? styles.chipOn : ''}`} onClick={() => send('accept', { playerId: r.playerId, accept: false })}>Wrong</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* A presenting host sees answers as they arrive; a playing host only after the round */}
      {round.phase === 'open' && responses.length > 0 && (
        <ul className={styles.liveAnswers}>
          {responses.map((r) => <li key={r.playerId}><strong>{r.name}:</strong> {r.text}</li>)}
        </ul>
      )}

      <div className={styles.hostButtons}>
        {round.phase === 'open' && (
          round.paused
            ? <Button onClick={() => send('resume_game')}>Resume</Button>
            : <Button variant="ghost" onClick={() => send('pause')}>Pause</Button>
        )}
        {round.phase === 'open' && <Button variant="ghost" onClick={() => send('reveal')}>Close round now</Button>}
        {round.phase === 'review' && <Button onClick={() => send('reveal')}>Reveal results</Button>}
        {round.phase === 'revealed' && <Button onClick={() => send('next')}>{last ? 'See final results' : 'Next question'}</Button>}
        {round.phase === 'revealed' && (
          round.paused
            ? <Button variant="ghost" onClick={() => send('resume_game')}>Resume auto-advance</Button>
            : <Button variant="ghost" onClick={() => send('pause')}>Hold here</Button>
        )}
        {round.phase !== 'revealed' && <Button variant="ghost" onClick={() => send('skip')}>Skip question</Button>}
        <button type="button" className={styles.dangerLink} onClick={() => confirmThen('End the game now and show final results?', 'end')}>End game</button>
        <button type="button" className={styles.dangerLink} onClick={() => confirmThen('Restart? Scores reset and everyone returns to the lobby.', 'restart')}>Restart</button>
      </div>
    </section>
  )
}
