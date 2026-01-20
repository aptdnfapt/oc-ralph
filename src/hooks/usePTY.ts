// Hook for managing PTY connections to opencode attach
import { useRef, useCallback, useEffect } from "react"
import { spawn, type IPty } from "bun-pty"

// @ts-ignore - bun-pty types
import type { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"

interface UsePTYResult {
  attach: (sessionId: string) => void  // Attach to a session
  kill: () => void                     // Kill current PTY
  resize: (cols: number, rows: number) => void  // Resize PTY
}

export function usePTY(
  port: number | null,
  terminalRef: React.RefObject<GhosttyTerminalRenderable | null>,
  cols: number,
  rows: number
): UsePTYResult {
  const ptyRef = useRef<IPty | null>(null)
  const colsRef = useRef(cols)
  const rowsRef = useRef(rows)
  const bufferRef = useRef<string[]>([])  // Buffer for early data
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep refs updated
  useEffect(() => {
    colsRef.current = cols
    rowsRef.current = rows
  }, [cols, rows])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ptyRef.current) {
        ptyRef.current.kill()
        ptyRef.current = null
      }
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current)
        flushIntervalRef.current = null
      }
    }
  }, [])

  // Attach to a session
  const attach = useCallback((sessionId: string) => {
    if (!port) return

    // Kill existing PTY first
    if (ptyRef.current) {
      ptyRef.current.kill()
      ptyRef.current = null
    }

    // Spawn new PTY attached to the session
    // Command: opencode attach http://localhost:PORT -s SESSION_ID
    const pty = spawn("opencode", [
      "attach",
      `http://localhost:${port}`,
      "-s",
      sessionId,
    ], {
      name: "xterm-256color",
      cols: colsRef.current,
      rows: rowsRef.current,
      cwd: process.cwd(),
    })

    // Clear any existing buffer and flush interval
    bufferRef.current = []
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current)
    }

    // Feed PTY output to terminal (buffer if not ready)
    pty.onData((data: string) => {
      const term = terminalRef.current
      if (term && term.persistent) {
        // Terminal ready - flush buffer first, then feed new data
        if (bufferRef.current.length > 0) {
          for (const buffered of bufferRef.current) {
            term.feed(buffered)
          }
          bufferRef.current = []
        }
        term.feed(data)
      } else {
        // Terminal not ready - buffer the data
        bufferRef.current.push(data)
      }
    })

    // Also try to flush buffer periodically in case terminal becomes ready
    flushIntervalRef.current = setInterval(() => {
      const term = terminalRef.current
      if (term && term.persistent && bufferRef.current.length > 0) {
        for (const buffered of bufferRef.current) {
          term.feed(buffered)
        }
        bufferRef.current = []
      }
    }, 50)

    // Handle exit (could reconnect or show message)
    pty.onExit(() => {
      // PTY exited, could handle reconnection here
    })

    ptyRef.current = pty
  }, [port, terminalRef])

  // Kill current PTY
  const kill = useCallback(() => {
    if (ptyRef.current) {
      ptyRef.current.kill()
      ptyRef.current = null
    }
  }, [])

  // Resize PTY
  const resize = useCallback((newCols: number, newRows: number) => {
    if (ptyRef.current) {
      ptyRef.current.resize(newCols, newRows)
    }
    colsRef.current = newCols
    rowsRef.current = newRows
  }, [])

  return { attach, kill, resize }
}
