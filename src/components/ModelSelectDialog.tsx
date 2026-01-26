// Model selection dialog - similar to OpenCode's DialogModel
// Shows favorites, recents, and all models grouped by provider with fuzzy search
import { useState, useCallback, useMemo } from "react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import type { ModelSelection, ProviderInfo, ModelStore } from "../types.ts"

interface ModelOption {
  providerID: string
  modelID: string
  title: string        // Display name
  description?: string // Provider name or "(Favorite)"
  category: string     // For grouping: "Favorites", "Recent", or provider name
  isFavorite: boolean
}

interface ModelSelectDialogProps {
  providers: ProviderInfo[]
  store: ModelStore
  currentModel: ModelSelection | null
  onSelect: (model: ModelSelection) => void
  onToggleFavorite: (model: ModelSelection) => void
  onCancel: () => void
}

// Simple fuzzy match - returns true if all chars in needle appear in haystack in order
function fuzzyMatch(needle: string, haystack: string): boolean {
  const lowerNeedle = needle.toLowerCase()
  const lowerHaystack = haystack.toLowerCase()
  let ni = 0
  for (let hi = 0; hi < lowerHaystack.length && ni < lowerNeedle.length; hi++) {
    if (lowerHaystack[hi] === lowerNeedle[ni]) {
      ni++
    }
  }
  return ni === lowerNeedle.length
}

export function ModelSelectDialog({
  providers,
  store,
  currentModel,
  onSelect,
  onToggleFavorite,
  onCancel,
}: ModelSelectDialogProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { width, height } = useTerminalDimensions()

  // Build the list of options
  const options = useMemo(() => {
    const result: ModelOption[] = []
    const needle = query.trim()
    const showSections = needle.length === 0

    // Helper to check if model is favorite
    const isFav = (m: ModelSelection) =>
      store.favorite.some((f) => f.providerID === m.providerID && f.modelID === m.modelID)

    // Helper to check if model is in recents
    const isRecent = (m: ModelSelection) =>
      store.recent.some((r) => r.providerID === m.providerID && r.modelID === m.modelID)

    // Get model name from providers
    const getModelName = (providerID: string, modelID: string): string => {
      const provider = providers.find((p) => p.id === providerID)
      return provider?.models[modelID]?.name ?? modelID
    }

    const getProviderName = (providerID: string): string => {
      return providers.find((p) => p.id === providerID)?.name ?? providerID
    }

    if (showSections) {
      // Add favorites section
      for (const fav of store.favorite) {
        const title = getModelName(fav.providerID, fav.modelID)
        result.push({
          providerID: fav.providerID,
          modelID: fav.modelID,
          title,
          description: getProviderName(fav.providerID),
          category: "Favorites",
          isFavorite: true,
        })
      }

      // Add recent section (excluding favorites)
      for (const recent of store.recent) {
        if (!isFav(recent)) {
          const title = getModelName(recent.providerID, recent.modelID)
          result.push({
            providerID: recent.providerID,
            modelID: recent.modelID,
            title,
            description: getProviderName(recent.providerID),
            category: "Recent",
            isFavorite: false,
          })
        }
      }
    }

    // Add all models grouped by provider
    for (const provider of providers) {
      for (const [modelId, model] of Object.entries(provider.models)) {
        // Skip deprecated models
        if (model.status === "deprecated") continue

        // Skip if already in favorites or recents (when showing sections)
        if (showSections) {
          const sel = { providerID: provider.id, modelID: modelId }
          if (isFav(sel) || isRecent(sel)) continue
        }

        const title = model.name || modelId

        // Apply fuzzy filter if query exists
        if (needle && !fuzzyMatch(needle, title) && !fuzzyMatch(needle, provider.name)) {
          continue
        }

        result.push({
          providerID: provider.id,
          modelID: modelId,
          title,
          description: isFav({ providerID: provider.id, modelID: modelId }) ? "(Favorite)" : undefined,
          category: provider.name,
          isFavorite: isFav({ providerID: provider.id, modelID: modelId }),
        })
      }
    }

    return result
  }, [providers, store, query])

  // Reset selection when options change
  useMemo(() => {
    if (selectedIndex >= options.length) {
      setSelectedIndex(Math.max(0, options.length - 1))
    }
  }, [options.length, selectedIndex])

  // Handle keyboard input
  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel()
      return
    }

    if (key.name === "return" || key.name === "enter") {
      const selected = options[selectedIndex]
      if (selected) {
        onSelect({ providerID: selected.providerID, modelID: selected.modelID })
      }
      return
    }

    if (key.name === "up") {
      setSelectedIndex((prev) => Math.max(0, prev - 1))
      return
    }

    if (key.name === "down") {
      setSelectedIndex((prev) => Math.min(options.length - 1, prev + 1))
      return
    }

    // Ctrl+F to toggle favorite
    if (key.ctrl && key.name === "f") {
      const selected = options[selectedIndex]
      if (selected) {
        onToggleFavorite({ providerID: selected.providerID, modelID: selected.modelID })
      }
      return
    }

    // Handle text input for search
    if (key.name === "backspace") {
      setQuery((prev) => prev.slice(0, -1))
      setSelectedIndex(0)
      return
    }

    // Regular character input
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setQuery((prev) => prev + key.sequence)
      setSelectedIndex(0)
      return
    }
  })

  // Calculate visible area
  const dialogWidth = Math.min(60, width - 4)
  const dialogHeight = Math.min(20, height - 4)
  const listHeight = dialogHeight - 4 // Account for title, search, footer

  // Calculate scroll offset to keep selected item visible
  const scrollOffset = Math.max(0, selectedIndex - listHeight + 1)

  // Group options by category for display
  const groupedOptions = useMemo(() => {
    const groups: { category: string; items: (ModelOption & { index: number })[] }[] = []
    let currentCategory = ""
    
    options.forEach((opt, index) => {
      if (opt.category !== currentCategory) {
        currentCategory = opt.category
        groups.push({ category: currentCategory, items: [] })
      }
      const lastGroup = groups[groups.length - 1]
      if (lastGroup) {
        lastGroup.items.push({ ...opt, index })
      }
    })
    
    return groups
  }, [options])

  // Flatten for rendering with scroll
  const visibleItems = useMemo(() => {
    const items: { type: "header" | "item"; text: string; index?: number; selected?: boolean; isCurrent?: boolean }[] = []
    
    for (const group of groupedOptions) {
      items.push({ type: "header", text: group.category })
      for (const item of group.items) {
        const isCurrent = currentModel?.providerID === item.providerID && currentModel?.modelID === item.modelID
        items.push({
          type: "item",
          text: `${item.isFavorite ? "★ " : "  "}${item.title}${item.description ? ` (${item.description})` : ""}`,
          index: item.index,
          selected: item.index === selectedIndex,
          isCurrent,
        })
      }
    }
    
    return items.slice(scrollOffset, scrollOffset + listHeight)
  }, [groupedOptions, selectedIndex, scrollOffset, listHeight, currentModel])

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
{/* No backdrop - let background show through */}

      {/* Dialog */}
      <box
        style={{
          width: dialogWidth,
          height: dialogHeight,
          backgroundColor: "#1c1c1c",
          border: true,
          borderColor: "#58a6ff",
          flexDirection: "column",
        }}
      >
        {/* Title */}
        <box style={{ height: 1, paddingLeft: 1 }}>
          <text fg="#58a6ff">Select model</text>
        </box>

        {/* Search input */}
        <box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
          <text fg="#8b949e">
            <span fg="#58a6ff">&gt;</span> {query}<span fg="#58a6ff">_</span>
          </text>
        </box>

        {/* Model list */}
        <box style={{ flexGrow: 1, flexDirection: "column", overflow: "hidden" }}>
          {visibleItems.map((item, i) => {
            if (item.type === "header") {
              return (
                <box key={`h-${i}`} style={{ height: 1, paddingLeft: 1 }}>
                  <text fg="#8b949e">{item.text}</text>
                </box>
              )
            }
            return (
              <box
                key={`i-${item.index}`}
                style={{
                  height: 1,
                  paddingLeft: 1,
                  backgroundColor: item.selected ? "#264f78" : undefined,
                }}
              >
                <text fg={item.isCurrent ? "#7ee787" : item.selected ? "#ffffff" : "#c9d1d9"}>
                  {item.text}
                </text>
              </box>
            )
          })}
        </box>

        {/* Footer */}
        <box style={{ height: 1, paddingLeft: 1, backgroundColor: "#222" }}>
          <text fg="#8b949e">
            <span fg="#58a6ff">↑↓</span>: navigate  <span fg="#58a6ff">Enter</span>: select  <span fg="#58a6ff">Ctrl+F</span>: favorite  <span fg="#58a6ff">Esc</span>: cancel
          </text>
        </box>
      </box>
    </box>
  )
}
