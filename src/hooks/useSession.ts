// Hook for SDK operations: create session, send prompt, poll status
import { useState, useRef, useCallback, useEffect } from "react"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import type { SessionStatus, ModelSelection } from "../types.ts"

interface UseSessionResult {
  createSession: () => Promise<string>             // Create session, returns sessionId
  sendPrompt: (sessionId: string) => void          // Send prompt async (non-blocking)
  getStatus: (sessionId: string) => SessionStatus  // Get current status for a session
  error: string | null                             // Any error that occurred
}

export function useSession(
  port: number | null,
  promptContent: string,
  model: ModelSelection | null
): UseSessionResult {
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<OpencodeClient | null>(null)
  const statusCache = useRef<Map<string, SessionStatus>>(new Map())
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // Initialize client when port is ready
  useEffect(() => {
    if (port) {
      clientRef.current = createOpencodeClient({
        baseUrl: `http://localhost:${port}`,
      })
    }
    return () => {
      // Clear all polling intervals on cleanup
      pollingRef.current.forEach((interval) => clearInterval(interval))
      pollingRef.current.clear()
    }
  }, [port])

  // Create session only (fast)
  const createSession = useCallback(async (): Promise<string> => {
    if (!clientRef.current) {
      throw new Error("Client not initialized")
    }

    try {
      const createResponse = await clientRef.current.session.create({})
      const sessionId = createResponse.data?.id
      if (!sessionId) {
        throw new Error("No session ID returned")
      }

      // Initialize status as busy
      statusCache.current.set(sessionId, { type: "busy" })
      
      return sessionId
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg)
      throw err
    }
  }, [])

  // Send prompt async (non-blocking) - fire and forget
  const sendPrompt = useCallback((sessionId: string) => {
    if (!clientRef.current) return

    // Build prompt body with optional model
    const body: {
      parts: { type: "text"; text: string }[]
      model?: { providerID: string; modelID: string }
    } = {
      parts: [{ type: "text", text: promptContent }],
    }

    // Add model if specified
    if (model) {
      body.model = {
        providerID: model.providerID,
        modelID: model.modelID,
      }
    }

    // Don't await - let it run in background
    clientRef.current.session.prompt({
      path: { id: sessionId },
      body,
    }).catch((err) => {
      console.error("Prompt error:", err)
    })

    // Start polling for status
    startPolling(sessionId)
  }, [promptContent, model])

  // Start polling status for a session
  const startPolling = (sessionId: string) => {
    // Clear existing polling for this session
    const existing = pollingRef.current.get(sessionId)
    if (existing) clearInterval(existing)

    const interval = setInterval(async () => {
      if (!clientRef.current) return

      try {
        const response = await clientRef.current.session.status()
        // Response is a map of sessionId -> status
        const allStatus = response.data
        if (allStatus && typeof allStatus === "object") {
          // Find status for our session
          const status = (allStatus as Record<string, SessionStatus>)[sessionId]
          if (status) {
            statusCache.current.set(sessionId, status)
            // Stop polling if idle
            if (status.type === "idle") {
              clearInterval(pollingRef.current.get(sessionId))
              pollingRef.current.delete(sessionId)
            }
          } else {
            // Session not in status map means it's idle
            statusCache.current.set(sessionId, { type: "idle" })
            clearInterval(pollingRef.current.get(sessionId))
            pollingRef.current.delete(sessionId)
          }
        }
      } catch {
        // Ignore polling errors, keep trying
      }
    }, 1000)

    pollingRef.current.set(sessionId, interval)
  }

  // Get cached status for a session
  const getStatus = useCallback((sessionId: string): SessionStatus => {
    return statusCache.current.get(sessionId) ?? { type: "idle" }
  }, [])

  return {
    createSession,
    sendPrompt,
    getStatus,
    error,
  }
}
