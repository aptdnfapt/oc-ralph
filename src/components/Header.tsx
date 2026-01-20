// Header component showing prompt path and run count

interface HeaderProps {
  promptPath: string
  currentRun: number
  totalRuns: number | 'infinite'
}

export function Header({ promptPath, currentRun, totalRuns }: HeaderProps) {
  // Format run count display
  const runDisplay = totalRuns === 'infinite' 
    ? `${currentRun}/∞` 
    : `${currentRun}/${totalRuns}`

  return (
    <box
      style={{
        height: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#222",
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      {/* Left: prompt path */}
      <text fg="#8b949e">
        prompt: <span fg="#58a6ff">{promptPath}</span>
      </text>
      
      {/* Right: run count */}
      <text fg="#8b949e">
        runs: <span fg="#58a6ff">{runDisplay}</span>
      </text>
    </box>
  )
}
