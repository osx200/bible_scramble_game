import { GameProvider, useGame } from './context/GameContext.jsx'
import Menu from './components/Menu/Menu.jsx'
import GameBoard from './components/GameBoard/GameBoard.jsx'
import GameOver from './components/GameOver/GameOver.jsx'
import TeamRegister from './components/TeamRegister/TeamRegister.jsx'
import TeamTransition from './components/TeamTransition/TeamTransition.jsx'
import TeamResults from './components/TeamResults/TeamResults.jsx'
import ThemeToggle from './components/ThemeToggle/ThemeToggle.jsx'
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

export default function App() {
  return (
    <GameProvider>
      <div className={styles.app}>
        <ThemeToggle />
        <GameRouter />
      </div>
    </GameProvider>
  )
}
