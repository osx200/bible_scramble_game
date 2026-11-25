import { CONTACT_EMAIL } from './WelcomeIntro.jsx'
import styles from './WelcomeIntro.module.css'

/**
 * The privacy page, shown from Menu ("Privacy") and from the first-visit
 * Welcome footer. Keep it in step with what the server actually stores:
 * server/index.js (scores, analytics counters, mp_sessions/mp_players and
 * their 30-day purge, MP_KEEP_MS) and the log rotation in docker-compose.yml.
 */
export default function Privacy() {
  return (
    <div className={styles.privacy}>
      <p className={styles.purpose}>
        Bible Games is built to collect as little as possible. Here is everything it keeps.
      </p>

      <h2>No accounts</h2>
      <p>
        There is no sign-up, no password and no email address. You play under a nickname picked
        from a list (like “Joy” or “Team Peace”), so no real names are ever entered.
      </p>

      <h2>On your device</h2>
      <p>
        Your browser remembers your nickname, your light or dark setting, and a private key that
        lets you rejoin a multiplayer game after a refresh. Clearing your browser data removes them.
      </p>

      <h2>On our server</h2>
      <ul>
        <li>
          <strong>Leaderboard:</strong> each Word Unscramble score above zero, with its nickname,
          word set, difficulty and date. Only each nickname’s best of the month is shown, in the
          top five. Scores are kept so earlier months’ boards can still be shown; ask below to have
          one removed.
        </li>
        <li>
          <strong>Multiplayer:</strong> games run in memory. When one ends, the nicknames, the game
          settings and the final scores are kept for 30 days, then deleted. Custom quiz content is
          never saved.
        </li>
        <li>
          <strong>Visit counts:</strong> simple daily totals (how many visits, which games were
          played). No cookies, no tracking across sites, and no IP address is stored. Browsers set
          to “Do Not Track” or Global Privacy Control are not counted at all.
        </li>
        <li>
          <strong>Server logs:</strong> like every website, the server briefly records the IP
          address, browser and time of each request, to keep the site secure and working. These
          logs are kept for no more than 7 days, then deleted.
        </li>
      </ul>

      <h2>Voice input</h2>
      <p>
        When you tap the microphone, your browser’s own speech service turns your voice into text
        (in Chrome and Edge that service is run by Google or Microsoft). Bible Games only receives
        the text, and does not keep it.
      </p>

      <h2>Questions</h2>
      <p>
        Want a score removed, or have a question? Write to{' '}
        <a className={styles.contactLink} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </div>
  )
}
