// Hook to spawn and manage the opencode serve process
import { useState, useEffect, useRef } from "react"
import { spawn, type IPty } from "bun-pty"

// @ts-ignore - bun-pty types

interface UseServerResult {
  port: number | null   // Server port when ready
  isReady: boolean      // True when server is listening
  error: string | null  // Error message if spawn failed
  kill: () => void      // Cleanup function
}

export function useServer(): UseServerResult {
  const [port, setPort] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ptyRef = useRef<IPty | null>(null)

  useEffect(() => {
    // Spawn opencode serve process
    try {
      const pty = spawn("opencode", ["serve"], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
      })

      ptyRef.current = pty

      // Buffer for parsing output
      let buffer = ""

      // Listen for output to capture port
      pty.onData((data: string) => {
        buffer += data
        // Parse for port: "listening on http://...:PORT"
        const match = buffer.match(/listening on http:\/\/[^:]+:(\d+)/)
        if (match?.[1]) {
          const parsedPort = parseInt(match[1], 10)
          if (!isNaN(parsedPort)) {
            setPort(parsedPort)
          }
        }
      })

      // Handle exit
      pty.onExit(({ exitCode }: { exitCode: number }) => {
        if (exitCode !== 0 && !port) {
          setError(`Server exited with code ${exitCode}`)
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to spawn server")
    }

    // Cleanup on unmount
    return () => {
      if (ptyRef.current) {
        ptyRef.current.kill()
        ptyRef.current = null
      }
    }
  }, [])

  const kill = () => {
    if (ptyRef.current) {
      ptyRef.current.kill()
      ptyRef.current = null
    }
  }

  return {
    port,
    isReady: port !== null,
    error,
    kill,
  }
}
