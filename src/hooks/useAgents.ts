// Hook for loading available agents from SDK (local + global)
import { useState, useEffect, useRef } from "react"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import type { AgentInfo } from "../types.ts"

interface UseAgentsResult {
  agents: AgentInfo[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useAgents(port: number | null): UseAgentsResult {
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<OpencodeClient | null>(null)

  // Initialize client when port is ready
  useEffect(() => {
    if (port) {
      clientRef.current = createOpencodeClient({
        baseUrl: `http://localhost:${port}`,
      })
    }
  }, [port])

  const refresh = async () => {
    if (!clientRef.current) {
      setError("Client not initialized")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await clientRef.current.app.agents({})
      const data = response.data

      if (data && Array.isArray(data)) {
        const agentList: AgentInfo[] = data.map((agent) => ({
          name: agent.name,
          description: agent.description,
          mode: agent.mode,
          builtIn: agent.builtIn,
          color: agent.color,
        }))
        setAgents(agentList)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents")
    } finally {
      setIsLoading(false)
    }
  }

  // Load agents when client is ready
  useEffect(() => {
    if (port && clientRef.current) {
      refresh()
    }
  }, [port])

  return {
    agents,
    isLoading,
    error,
    refresh,
  }
}
