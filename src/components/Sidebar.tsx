// Sidebar showing list of runs with timing and status
import type { RunInfo } from "../types.ts"

interface SidebarProps {
  runs: RunInfo[]
  currentIndex: number
  onSelect: (index: number) => void
}

export function Sidebar({ runs, currentIndex, onSelect }: SidebarProps) {
  return (
    <box
      style={{
        width: 20,
        flexDirection: "column",
        border: true,
        borderColor: "#444",
      }}
    >
      {/* Header */}
      <box style={{ height: 1, paddingLeft: 1, backgroundColor: "#333" }}>
        <text fg="#58a6ff">Sessions</text>
      </box>

      {/* Run list */}
      {runs.map((run, index) => {
        const isSelected = index === currentIndex
        const isRunning = run.status === 'busy'
        
        // Format duration in seconds
        const durationText = run.duration !== null 
          ? `${Math.round(run.duration / 1000)}s`
          : '...'
        
        // Format: "Run #1 (32s) ✓" or "Run #1 ..."
        const label = isRunning
          ? `Run #${run.runNumber} ...`
          : `Run #${run.runNumber} (${durationText}) ✓`

        return (
          <box
            key={run.id}
            style={{
              height: 1,
              paddingLeft: 1,
              backgroundColor: isSelected ? "#58a6ff" : undefined,
            }}
            onMouseDown={() => onSelect(index)}
          >
            <text fg={isSelected ? "#000" : "#d4d4d4"}>
              {label}
            </text>
          </box>
        )
      })}

      {/* Empty state */}
      {runs.length === 0 && (
        <box style={{ paddingLeft: 1, paddingTop: 1 }}>
          <text fg="#6e7681">No runs yet</text>
        </box>
      )}
    </box>
  )
}
