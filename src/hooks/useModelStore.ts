// Hook for managing model.json state (recent/favorites)
// Uses the same cache file as OpenCode: ~/.local/state/opencode/model.json
import { useState, useEffect, useCallback } from "react"
import * as path from "path"
import * as os from "os"
import type { ModelSelection, ModelStore } from "../types.ts"

const MODEL_JSON_PATH = path.join(os.homedir(), ".local/state/opencode/model.json")

interface UseModelStoreResult {
  store: ModelStore
  isReady: boolean
  addRecent: (model: ModelSelection) => void
  toggleFavorite: (model: ModelSelection) => void
  isFavorite: (model: ModelSelection) => boolean
}

const defaultStore: ModelStore = {
  recent: [],
  favorite: [],
  variant: {},
}

export function useModelStore(): UseModelStoreResult {
  const [store, setStore] = useState<ModelStore>(defaultStore)
  const [isReady, setIsReady] = useState(false)

  // Load store from disk on mount
  useEffect(() => {
    loadStore()
  }, [])

  const loadStore = async () => {
    try {
      const file = Bun.file(MODEL_JSON_PATH)
      if (await file.exists()) {
        const data = await file.json()
        setStore({
          recent: Array.isArray(data.recent) ? data.recent : [],
          favorite: Array.isArray(data.favorite) ? data.favorite : [],
          variant: typeof data.variant === "object" && data.variant !== null ? data.variant : {},
        })
      }
    } catch {
      // Use default store if file doesn't exist or is invalid
    } finally {
      setIsReady(true)
    }
  }

  const saveStore = async (newStore: ModelStore) => {
    try {
      // Ensure directory exists
      const dir = path.dirname(MODEL_JSON_PATH)
      await Bun.write(MODEL_JSON_PATH, JSON.stringify(newStore, null, 2))
    } catch (err) {
      console.error("Failed to save model store:", err)
    }
  }

  const addRecent = useCallback((model: ModelSelection) => {
    setStore((prev) => {
      // Remove existing entry if present, then add to front
      const filtered = prev.recent.filter(
        (m) => !(m.providerID === model.providerID && m.modelID === model.modelID)
      )
      const newRecent = [model, ...filtered].slice(0, 10) // Keep max 10
      const newStore = { ...prev, recent: newRecent }
      saveStore(newStore)
      return newStore
    })
  }, [])

  const toggleFavorite = useCallback((model: ModelSelection) => {
    setStore((prev) => {
      const exists = prev.favorite.some(
        (m) => m.providerID === model.providerID && m.modelID === model.modelID
      )
      const newFavorite = exists
        ? prev.favorite.filter(
            (m) => !(m.providerID === model.providerID && m.modelID === model.modelID)
          )
        : [model, ...prev.favorite]
      const newStore = { ...prev, favorite: newFavorite }
      saveStore(newStore)
      return newStore
    })
  }, [])

  const isFavorite = useCallback(
    (model: ModelSelection) => {
      return store.favorite.some(
        (m) => m.providerID === model.providerID && m.modelID === model.modelID
      )
    },
    [store.favorite]
  )

  return {
    store,
    isReady,
    addRecent,
    toggleFavorite,
    isFavorite,
  }
}
