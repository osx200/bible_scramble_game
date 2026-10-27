import { GameProvider, useGame } from './context/GameContext.jsx'
import { AppModeProvider, useAppMode } from './context/AppModeContext.jsx'
import { ReactionProvider } from './context/ReactionContext.jsx'
import { PlayerProvider, usePlayer } from './context/PlayerContext.jsx'
import Welcome from './components/Welcome/Welcome.jsx'
import Menu from './components/Menu/Menu.jsx'
import GameBoard from './components/GameBoard/GameBoard.jsx'
import GameOver from './components/GameOver/GameOver.jsx'
import TeamRegister from './components/TeamRegister/TeamRegister.jsx'
import TeamTransition from './components/TeamTransition/TeamTransition.jsx'
import TeamResults from './components/TeamResults/TeamResults.jsx'
import ThemeToggle from './components/ThemeToggle/ThemeToggle.jsx'
import Reactions from './components/Reactions/Reactions.jsx'
import QuizApp from './components/QuizApp/QuizApp.jsx'
import ModeratorApp from './components/ModeratorApp/ModeratorApp.jsx'
import RecallApp from './components/RecallApp/RecallApp.jsx'
import styles from './App.module.css'

function GameRouter() {
  const { state } = useGame()
  const { phase } = state

  switch (phase) {
    case 'menu':            return <Menu />
    case 'team-register':   return <TeamRegister />
    case 'team-transition': return <TeamTransition />
    case 'playing':         return <GameBoard />
    case 'team-results':    return <TeamResults />
    case 'gameOver':        return <GameOver />
    default:                return <Menu />
  }
}

function AppContent() {
  const { appMode } = useAppMode()
  const { profile, editing } = usePlayer()

  // No name yet (or changing it): the Welcome page stands in for every mode
  if (!profile || editing) {
    return (
      <div className={styles.app}>
        <ThemeToggle />
        <Welcome />
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <ThemeToggle />
      {/* Moderator View has its own inline reaction panel — everywhere else
          gets the floating picker */}
      {appMode !== 'moderator' && <Reactions />}
      {appMode === 'scramble' ? (
        <GameProvider>
          <GameRouter />
        </GameProvider>
      ) : appMode === 'quiz' ? (
        <QuizApp />
      ) : appMode === 'moderator' ? (
        <ModeratorApp />
      ) : (
        <RecallApp />
      )}
    </div>
  )
}

export default function App() {
  return (
    <PlayerProvider>
      <AppModeProvider>
        <ReactionProvider>
          <AppContent />
        </ReactionProvider>
      </AppModeProvider>
    </PlayerProvider>
  )
}
