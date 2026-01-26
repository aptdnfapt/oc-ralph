// Hook for loading available models from SDK providers
import { useState, useEffect, useRef } from "react"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"
import type { ProviderInfo, ModelInfo } from "../types.ts"

interface UseModelsResult {
  providers: ProviderInfo[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useModels(port: number | null): UseModelsResult {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
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
      const response = await clientRef.current.provider.list({})
      const data = response.data

      if (data?.all) {
        const providerList: ProviderInfo[] = data.all.map((provider) => ({
          id: provider.id,
          name: provider.name,
          models: Object.fromEntries(
            Object.entries(provider.models).map(([modelId, model]) => [
              modelId,
              {
                id: model.id,
                name: model.name,
                reasoning: model.reasoning,
                cost: model.cost ? { input: model.cost.input, output: model.cost.output } : undefined,
                status: model.status,
              } as ModelInfo,
            ])
          ),
        }))
        setProviders(providerList)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models")
    } finally {
      setIsLoading(false)
    }
  }

  // Load models when client is ready
  useEffect(() => {
    if (port && clientRef.current) {
      refresh()
    }
  }, [port])

  return {
    providers,
    isLoading,
    error,
    refresh,
  }
}
