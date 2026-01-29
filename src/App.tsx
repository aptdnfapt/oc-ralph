// Main App component - orchestrates the run loop and layout
import { useState, useRef, useEffect, useCallback } from "react"
import { useKeyboard, useTerminalDimensions, useOnResize, useRenderer } from "@opentui/react"
import type { CliRenderer } from "@opentui/core"
import type { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"

import { Header } from "./components/Header.tsx"
import { Sidebar } from "./components/Sidebar.tsx"
import { PTYView } from "./components/PTYView.tsx"
import { Footer } from "./components/Footer.tsx"
import { QuitDialog } from "./components/QuitDialog.tsx"
import { ModelSelectDialog } from "./components/ModelSelectDialog.tsx"
import { AgentSelectDialog } from "./components/AgentSelectDialog.tsx"

import { useServer } from "./hooks/useServer.ts"
import { useSession } from "./hooks/useSession.ts"
import { usePTY } from "./hooks/usePTY.ts"
import { useModels } from "./hooks/useModels.ts"
import { useModelStore } from "./hooks/useModelStore.ts"
import { useAgents } from "./hooks/useAgents.ts"

import type { RunInfo, ModelSelection } from "./types.ts"

// Layout constants
const SIDEBAR_WIDTH = 20
const HORIZONTAL_OVERHEAD = 4  // Borders
const VERTICAL_OVERHEAD = 3    // Header + Footer + PTY header

interface AppProps {
  promptPath: string
  promptContent: string
  maxRuns: number | 'infinite'
  initialModel: ModelSelection | null  // From CLI -m flag, null means show dialog
  initialAgent: string | null          // From CLI -a flag, null means show dialog
}

export function App({ promptPath, promptContent, maxRuns, initialModel, initialAgent }: AppProps) {
  // State
  const [runs, setRuns] = useState<RunInfo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showQuitDialog, setShowQuitDialog] = useState(false)
  const [showModelDialog, setShowModelDialog] = useState(false)
  const [showAgentDialog, setShowAgentDialog] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelSelection | null>(initialModel)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(initialAgent)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const terminalRef = useRef<GhosttyTerminalRenderable>(null)
  const isStartingRun = useRef(false)

  // Terminal dimensions
  const { width, height } = useTerminalDimensions()
  const cols = Math.max(40, width - SIDEBAR_WIDTH - HORIZONTAL_OVERHEAD)
  const rows = Math.max(10, height - VERTICAL_OVERHEAD)

  // Hooks
  const renderer = useRenderer() as CliRenderer
  const server = useServer()
  const models = useModels(server.port)
  const modelStore = useModelStore()
  const agents = useAgents(server.port)
  const session = useSession(server.port, promptContent, selectedModel, selectedAgent)
  const pty = usePTY(server.port, terminalRef, cols, rows)

  // Resize PTY when dimensions change
  useOnResize((newWidth, newHeight) => {
    const newCols = Math.max(40, newWidth - SIDEBAR_WIDTH - HORIZONTAL_OVERHEAD)
    const newRows = Math.max(10, newHeight - VERTICAL_OVERHEAD)
    pty.resize(newCols, newRows)
  })

  // Start a new run
  const startNextRun = useCallback(async () => {
    // Prevent concurrent starts
    if (isStartingRun.current) return
    
    // Check if we've reached max runs
    if (maxRuns !== 'infinite' && runs.length >= maxRuns) {
      return
    }

    isStartingRun.current = true
    
    try {
      // 1. Create session (fast)
      const sessionId = await session.createSession()
      
      // 2. Create new run info
      const newRun: RunInfo = {
        id: sessionId,
        runNumber: runs.length + 1,
        startTime: Date.now(),
        duration: null,
        status: 'busy',
      }

      // 3. Add to runs
      setRuns(prev => [...prev, newRun])
      
      // 4. Only auto-switch view if user is on the latest run (not browsing history)
      const isViewingLatest = currentIndex === runs.length - 1 || runs.length === 0
      if (isViewingLatest) {
        setCurrentIndex(runs.length)
      }

      // 4. Attach PTY immediately (before prompt)
      pty.attach(sessionId)

      // 5. Send prompt async (non-blocking) - PTY will show it
      session.sendPrompt(sessionId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start run')
    } finally {
      isStartingRun.current = false
    }
  }, [runs.length, maxRuns, session, pty])

  // Show model dialog when server is ready and no model selected (interactive mode)
  useEffect(() => {
    if (server.isReady && !selectedModel && !models.isLoading && models.providers.length > 0) {
      setShowModelDialog(true)
    }
  }, [server.isReady, selectedModel, models.isLoading, models.providers.length])

  // Show agent dialog after model is selected and no agent selected (interactive mode)
  useEffect(() => {
    if (server.isReady && selectedModel && !selectedAgent && !agents.isLoading && agents.agents.length > 0 && !showModelDialog) {
      setShowAgentDialog(true)
    }
  }, [server.isReady, selectedModel, selectedAgent, agents.isLoading, agents.agents.length, showModelDialog])

  // Start first run when server is ready AND model AND agent are selected
  useEffect(() => {
    if (server.isReady && runs.length === 0 && selectedModel && selectedAgent) {
      startNextRun()
    }
  }, [server.isReady, runs.length, startNextRun, selectedModel, selectedAgent])

  // Poll status and auto-advance
  useEffect(() => {
    if (runs.length === 0) return

    const interval = setInterval(() => {
      // Check each busy run
      setRuns(prevRuns => {
        let hasChanges = false
        const updatedRuns = prevRuns.map(run => {
          if (run.status === 'busy') {
            const status = session.getStatus(run.id)
            if (status.type === 'idle') {
              hasChanges = true
              return {
                ...run,
                status: 'idle' as const,
                duration: Date.now() - run.startTime,
              }
            }
          }
          return run
        })
        return hasChanges ? updatedRuns : prevRuns
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [runs.length, session])

  // Auto-advance when LATEST run becomes idle (not the viewed run)
  useEffect(() => {
    const latestRun = runs[runs.length - 1]
    if (latestRun?.status === 'idle') {
      // Small delay before starting next run
      const timeout = setTimeout(() => {
        startNextRun()
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [runs, startNextRun])

  // Handle session selection
  const handleSelectRun = useCallback((index: number) => {
    setCurrentIndex(index)
    const run = runs[index]
    if (run) {
      pty.attach(run.id)
    }
  }, [runs, pty])

  // Cleanup function
  const cleanup = useCallback(() => {
    pty.kill()
    server.kill()
    renderer.destroy()
  }, [pty, server, renderer])

  // Native attach - suspend TUI, run opencode attach in native terminal, resume
  const nativeAttach = useCallback(async (sessionId: string) => {
    if (!server.port) return

    // Kill embedded PTY first
    pty.kill()

    // Suspend TUI to release terminal
    renderer.suspend()

    // Run opencode attach in native terminal with inherited stdio
    const proc = Bun.spawn([
      "opencode",
      "attach",
      `http://localhost:${server.port}`,
      "-s",
      sessionId,
    ], {
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    })

    // Wait for user to exit (Ctrl+C or natural exit)
    await proc.exited

    // Resume TUI
    renderer.resume()

    // Re-attach PTY to continue streaming
    pty.attach(sessionId)
  }, [server.port, pty, renderer])

  // Keyboard handling
  useKeyboard((key) => {
    // Quit dialog handling
    if (showQuitDialog) {
      if (key.name === 'y') {
        cleanup()
      } else if (key.name === 'n' || key.name === 'escape') {
        setShowQuitDialog(false)
      }
      return
    }

    // Main key handling
    if (key.name === 'q') {
      // Check if any run is busy
      const hasBusyRun = runs.some(r => r.status === 'busy')
      if (hasBusyRun) {
        setShowQuitDialog(true)
      } else {
        cleanup()
      }
    }

    // Arrow key navigation
    if (key.name === 'up' && runs.length > 0) {
      const newIndex = Math.max(0, currentIndex - 1)
      if (newIndex !== currentIndex) {
        handleSelectRun(newIndex)
      }
    }
    if (key.name === 'down' && runs.length > 0) {
      const newIndex = Math.min(runs.length - 1, currentIndex + 1)
      if (newIndex !== currentIndex) {
        handleSelectRun(newIndex)
      }
    }

    // 'A' key - attach to current session in native terminal
    if (key.name === 'a' && runs.length > 0 && server.port) {
      const currentRun = runs[currentIndex]
      if (currentRun) {
        nativeAttach(currentRun.id)
      }
    }
  })

  // Dialog handlers
  const handleQuitConfirm = useCallback(() => {
    cleanup()
  }, [cleanup])

  const handleQuitCancel = useCallback(() => {
    setShowQuitDialog(false)
  }, [])

  // Model selection handlers
  const handleModelSelect = useCallback((model: ModelSelection) => {
    setSelectedModel(model)
    setShowModelDialog(false)
    // Add to recent models
    modelStore.addRecent(model)
  }, [modelStore])

  const handleModelToggleFavorite = useCallback((model: ModelSelection) => {
    modelStore.toggleFavorite(model)
  }, [modelStore])

  const handleModelCancel = useCallback(() => {
    // If no model selected yet, can't cancel - must select one
    if (!selectedModel) return
    setShowModelDialog(false)
  }, [selectedModel])

  // Agent selection handlers
  const handleAgentSelect = useCallback((agentName: string) => {
    setSelectedAgent(agentName)
    setShowAgentDialog(false)
  }, [])

  const handleAgentCancel = useCallback(() => {
    // If no agent selected yet, can't cancel - must select one
    if (!selectedAgent) return
    setShowAgentDialog(false)
  }, [selectedAgent])

  // Show error state
  if (error || server.error || models.error || agents.error) {
    return (
      <box style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
        <box style={{ border: true, borderColor: "#ff7b72", padding: 1 }}>
          <text fg="#ff7b72">Error: {error || server.error || models.error || agents.error}</text>
        </box>
        <box style={{ height: 1, marginTop: 1 }}>
          <text fg="#8b949e">Press q to quit</text>
        </box>
      </box>
    )
  }

  // Show loading state
  if (!server.isReady) {
    return (
      <box style={{ flexDirection: "column", flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
        <text fg="#8b949e">Starting server...</text>
      </box>
    )
  }

  // Show loading models state (when no initialModel provided)
  if (!selectedModel && models.isLoading) {
    return (
      <box style={{ flexDirection: "column", flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
        <text fg="#8b949e">Loading models...</text>
      </box>
    )
  }

  // Show model selection dialog
  if (showModelDialog) {
    return (
      <ModelSelectDialog
        providers={models.providers}
        store={modelStore.store}
        currentModel={selectedModel}
        onSelect={handleModelSelect}
        onToggleFavorite={handleModelToggleFavorite}
        onCancel={handleModelCancel}
      />
    )
  }

  // Show agent selection dialog (after model is selected)
  if (showAgentDialog) {
    return (
      <AgentSelectDialog
        agents={agents.agents}
        currentAgent={selectedAgent}
        onSelect={handleAgentSelect}
        onCancel={handleAgentCancel}
      />
    )
  }

  // Show loading agents state
  if (selectedModel && !selectedAgent && agents.isLoading) {
    return (
      <box style={{ flexDirection: "column", flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
        <text fg="#8b949e">Loading agents...</text>
      </box>
    )
  }

  // Main layout
  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      {/* Header */}
      <Header
        promptPath={promptPath}
        currentRun={runs.length}
        totalRuns={maxRuns}
      />

      {/* Main content area */}
      <box style={{ flexDirection: "row", flexGrow: 1 }}>
        {/* Sidebar */}
        <Sidebar
          runs={runs}
          currentIndex={currentIndex}
          onSelect={handleSelectRun}
        />

        {/* PTY View */}
        <PTYView
          terminalRef={terminalRef}
          cols={cols}
          rows={rows}
        />
      </box>

      {/* Footer */}
      <Footer />

      {/* Quit Dialog (overlays when visible) */}
      <QuitDialog
        visible={showQuitDialog}
        onConfirm={handleQuitConfirm}
        onCancel={handleQuitCancel}
      />
    </box>
  )
}
