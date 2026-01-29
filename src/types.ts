// Core types for the OpenCode Loop TUI

// Model selection types
export interface ModelSelection {
  providerID: string
  modelID: string
}

export interface ModelInfo {
  id: string
  name: string
  reasoning: boolean
  cost?: {
    input: number
    output: number
  }
  status?: "alpha" | "beta" | "deprecated"
}

export interface ProviderInfo {
  id: string
  name: string
  models: Record<string, ModelInfo>
}

export interface ModelStore {
  recent: ModelSelection[]
  favorite: ModelSelection[]
  variant: Record<string, string>
}

// Agent types
export interface AgentInfo {
  name: string
  description?: string
  mode: "subagent" | "primary" | "all"
  builtIn: boolean
  color?: string
}

// Represents a single batch run session
export interface RunInfo {
  id: string              // Session ID (e.g., "ses_xxx")
  runNumber: number       // Sequential run number (1, 2, 3...)
  startTime: number       // Timestamp when run started (ms)
  duration: number | null // Duration in ms (null if still running)
  status: 'busy' | 'idle' // Current session status
}

// Global application state
export interface AppState {
  port: number | null           // Server port (null if not ready)
  runs: RunInfo[]               // All runs in this batch
  currentIndex: number          // Currently selected run index
  ptySessionId: string | null   // Session ID attached to PTY
  isRunning: boolean            // Whether batch is actively running
}

// Command line arguments
export interface CLIArgs {
  prompt: string                // Path to prompt file
  runs: number | 'infinite'     // Number of runs or infinite mode
}

// Session status from OpenCode SDK
export type SessionStatusType = 'idle' | 'busy' | 'retry'

export interface SessionStatus {
  type: SessionStatusType
  // Only present when type === 'retry'
  attempt?: number
  message?: string
  next?: number
}
