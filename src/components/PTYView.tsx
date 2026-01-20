// PTY View component wrapping the Ghostty terminal
import type { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"

interface PTYViewProps {
  terminalRef: React.RefObject<GhosttyTerminalRenderable | null>
  cols: number
  rows: number
}

export function PTYView({ terminalRef, cols, rows }: PTYViewProps) {
  return (
    <box
      style={{
        flexGrow: 1,
        flexDirection: "column",
        border: true,
        borderColor: "#444",
      }}
    >
      {/* Header bar */}
      <box style={{ height: 1, paddingLeft: 1, backgroundColor: "#333" }}>
        <text fg="#8b949e">Terminal Output</text>
      </box>

      {/* Ghostty terminal */}
      <ghostty-terminal
        ref={terminalRef}
        persistent={true}
        cols={cols}
        rows={rows}
        trimEnd={true}
        showCursor={true}
      />
    </box>
  )
}
