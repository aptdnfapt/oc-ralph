// Quit confirmation dialog overlay

interface QuitDialogProps {
  visible: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function QuitDialog({ visible, onConfirm, onCancel }: QuitDialogProps) {
  if (!visible) return null

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000000",
      }}
    >
      {/* Dialog box */}
      <box
        style={{
          width: 35,
          border: true,
          borderColor: "#58a6ff",
          backgroundColor: "#282a36",
          padding: 1,
          flexDirection: "column",
        }}
      >
        {/* Title */}
        <box style={{ height: 1, justifyContent: "center" }}>
          <text fg="#ff7b72">Quit? Session still running</text>
        </box>

        {/* Spacer */}
        <box style={{ height: 1 }} />

        {/* Buttons */}
        <box
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 2,
          }}
        >
          {/* Yes button */}
          <box
            style={{
              paddingLeft: 2,
              paddingRight: 2,
              backgroundColor: "#58a6ff",
            }}
            onMouseDown={onConfirm}
          >
            <text fg="#000">[Yes]</text>
          </box>

          {/* No button */}
          <box
            style={{
              paddingLeft: 2,
              paddingRight: 2,
              border: true,
              borderColor: "#444",
            }}
            onMouseDown={onCancel}
          >
            <text fg="#d4d4d4">[No]</text>
          </box>
        </box>
      </box>
    </box>
  )
}
