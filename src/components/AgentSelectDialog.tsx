// Agent selection dialog - similar to ModelSelectDialog
// Shows local and global agents with fuzzy search
import { useState, useMemo } from "react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import type { AgentInfo } from "../types.ts"

interface AgentSelectDialogProps {
  agents: AgentInfo[]
  currentAgent: string | null
  onSelect: (agentName: string) => void
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

export function AgentSelectDialog({
  agents,
  currentAgent,
  onSelect,
  onCancel,
}: AgentSelectDialogProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { width, height } = useTerminalDimensions()

  // Build the list of options grouped by type
  const options = useMemo(() => {
    const needle = query.trim()

    // Separate built-in and custom agents
    const builtInAgents = agents.filter((a) => a.builtIn)
    const customAgents = agents.filter((a) => !a.builtIn)

    type AgentOption = AgentInfo & { category: string }
    const result: AgentOption[] = []

    // Add custom (local/global) agents first
    for (const agent of customAgents) {
      if (needle && !fuzzyMatch(needle, agent.name) && !fuzzyMatch(needle, agent.description || "")) {
        continue
      }
      result.push({ ...agent, category: "Custom Agents" })
    }

    // Add built-in agents
    for (const agent of builtInAgents) {
      if (needle && !fuzzyMatch(needle, agent.name) && !fuzzyMatch(needle, agent.description || "")) {
        continue
      }
      result.push({ ...agent, category: "Built-in Agents" })
    }

    return result
  }, [agents, query])

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
        onSelect(selected.name)
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
    const groups: { category: string; items: (typeof options[0] & { index: number })[] }[] = []
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
    const items: { type: "header" | "item"; text: string; description?: string; index?: number; selected?: boolean; isCurrent?: boolean; color?: string }[] = []

    for (const group of groupedOptions) {
      items.push({ type: "header", text: group.category })
      for (const item of group.items) {
        const isCurrent = currentAgent === item.name
        items.push({
          type: "item",
          text: item.name,
          description: item.description,
          index: item.index,
          selected: item.index === selectedIndex,
          isCurrent,
          color: item.color,
        })
      }
    }

    return items.slice(scrollOffset, scrollOffset + listHeight)
  }, [groupedOptions, selectedIndex, scrollOffset, listHeight, currentAgent])

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
          <text fg="#58a6ff">Select agent</text>
        </box>

        {/* Search input */}
        <box style={{ height: 1, paddingLeft: 1, paddingRight: 1 }}>
          <text fg="#8b949e">
            <span fg="#58a6ff">&gt;</span> {query}<span fg="#58a6ff">_</span>
          </text>
        </box>

        {/* Agent list */}
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
                <text fg={item.isCurrent ? "#7ee787" : item.selected ? "#ffffff" : item.color || "#c9d1d9"}>
                  {item.text}
                  {item.description ? <span fg="#8b949e"> - {item.description}</span> : null}
                </text>
              </box>
            )
          })}
        </box>

        {/* Footer */}
        <box style={{ height: 1, paddingLeft: 1, backgroundColor: "#222" }}>
          <text fg="#8b949e">
            <span fg="#58a6ff">↑↓</span>: navigate  <span fg="#58a6ff">Enter</span>: select  <span fg="#58a6ff">Esc</span>: cancel
          </text>
        </box>
      </box>
    </box>
  )
}
