// Footer component showing keybind hints

export function Footer() {
  return (
    <box
      style={{
        height: 1,
        backgroundColor: "#222",
        paddingLeft: 1,
      }}
    >
      <text fg="#8b949e">
        <span fg="#58a6ff">↑↓</span>: navigate  <span fg="#58a6ff">a</span>: attach  <span fg="#58a6ff">q</span>: quit
      </text>
    </box>
  )
}
