import { useEffect } from 'react'
import { useReactionTrigger } from '../../context/ReactionContext.jsx'
import { WINNER_REACTION } from '../../data/reactions.js'
import Stage from '../Stage/Stage.jsx'
import Button from '../shared/Button.jsx'
import Confetti from '../Confetti/Confetti.jsx'
import { Standings } from './parts.jsx'
import styles from './Multiplayer.module.css'

/** Final rankings. Winners get the trophy reaction and confetti; a tie at the top gets 🤝 */
export default function FinalResults({ mp, onLeave }) {
  const { snapshot, send } = mp
  const { you, players, teams } = snapshot
  const top = players.filter((p) => p.rank === 1)
  const teamTie = teams && teams.length > 1 && teams[0].score === teams[1].score
  const tie = teams ? teamTie : top.length > 1
  const winner = teams ? teams[0]?.name : top[0]?.name

  const { triggerReaction } = useReactionTrigger()
  useEffect(() => {
    if (!tie && winner) triggerReaction(WINNER_REACTION)
  }, [tie, winner, triggerReaction])

  return (
    <>
      {!tie && <Confetti count={150} />}
      <Stage art="jonathan" wide>
        <div className={styles.screen}>
          <p className={styles.resultEmoji} aria-hidden="true">{tie ? '🤝' : '🏆'}</p>
          <h1>
            {tie
              ? `A tie between ${teams ? teams.filter((t) => t.score === teams[0].score).map((t) => t.name).join(' and ') : top.map((p) => p.name).join(' and ')}!`
              : `${winner} wins!`}
          </h1>
          <p className={styles.lead}>Final standings for this game. They don’t count toward the monthly leaderboard.</p>

          <Standings players={players} teams={teams} youId={you.playerId} />

          <div className={styles.actions}>
            {you.isHost && <Button size="lg" onClick={() => send('restart')}>Play again with everyone</Button>}
            {you.isHost && <button type="button" className={styles.dangerLink} onClick={() => send('close')}>Close room</button>}
            <button type="button" className={styles.backLink} onClick={onLeave}>← Back to Menu</button>
          </div>
        </div>
      </Stage>
    </>
  )
}
