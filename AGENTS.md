# AGENTS.md - oc-ralph Development Guide

This document provides guidelines for agents working on the oc-ralph project.

## Build Commands

```bash
# Build for production (outputs to dist/)
bun run build

# Build in watch mode for development
bun run dev

# Run directly without building
bun run src/index.tsx

# Run tests
bun test

# Run a single test file
bun test <file-path>

# Run tests matching a pattern
bun test -- <pattern>
```

## Project Overview

oc-ralph is a TUI application for running Ralph loops with OpenCode. It spawns `opencode serve` in the background, creates sessions, sends prompts, and displays live PTY output in a split-pane interface.

## Tech Stack

- **Runtime**: Bun
- **Framework**: React 19 + OpenTUI for terminal UI
- **Terminal**: ghostty-opentui for PTY rendering
- **Language**: TypeScript

## Code Style Guidelines

### Imports

Organize imports in this order:
1. React core imports (`react`)
2. Library imports (`@opentui/*`, `ghostty-opentui/*`)
3. Type imports (`import type { ... }`)
4. Local component/hook imports (relative paths)

```typescript
import { useState, useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import type { CliRenderer } from "@opentui/core"

import { Header } from "./components/Header.tsx"
import { useServer } from "./hooks/useServer.ts"
import type { RunInfo } from "./types.ts"
```

### Naming Conventions

- **Components**: PascalCase (e.g., `Header`, `Sidebar`)
- **Hooks**: camelCase with `use` prefix (e.g., `useServer`, `useSession`)
- **Variables**: camelCase (e.g., `currentIndex`, `promptPath`)
- **Constants**: SCREAMING_SNAKE_CASE for config constants (e.g., `SIDEBAR_WIDTH`)
- **Interfaces**: PascalCase (e.g., `RunInfo`, `AppProps`)
- **Types**: Use `Type` suffix for type aliases (e.g., `SessionStatusType`)
- **Files**: Match exported entity name (e.g., `App.tsx` exports `App`)

### Component Structure

Export components as named exports. Define component props interface above the component:

```typescript
interface AppProps {
  promptPath: string
  promptContent: string
  maxRuns: number | 'infinite'
}

export function App({ promptPath, promptContent, maxRuns }: AppProps) {
  // State
  const [runs, setRuns] = useState<RunInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  // Refs
  const terminalRef = useRef<GhosttyTerminalRenderable>(null)

  // Hooks
  const server = useServer()
  const session = useSession(server.port, promptContent)

  // Callbacks
  const handleSelect = useCallback((index: number) => {
    // ...
  }, [deps])

  // Effects
  useEffect(() => {
    // ...
  }, [deps])

  // Render
  return (
    <box>...</box>
  )
}
```

### Error Handling

- Use `try/catch` blocks with `finally` for cleanup
- Handle errors with `instanceof Error` check
- Store errors in state for UI display
- Use descriptive error messages

```typescript
try {
  const sessionId = await session.createSession()
} catch (err) {
  setError(err instanceof Error ? err.message : 'Failed to start run')
} finally {
  isStartingRun.current = false
}
```

### State Management

- Use `useState` for component state
- Use `useRef` for mutable values that shouldn't trigger re-renders
- Use `useCallback` for functions passed as props or dependencies
- Use functional updates when state depends on previous value: `setRuns(prev => [...prev, newRun])`

### Async/Await Patterns

- Prefer `async/await` over raw promises
- Use `await` for sequential async operations
- Handle async errors with try/catch
- Consider using refs to prevent concurrent operations (e.g., `isStartingRun.current`)

### Layout Constants

Define terminal layout constants at the top of files:

```typescript
const SIDEBAR_WIDTH = 20
const HORIZONTAL_OVERHEAD = 4
const VERTICAL_OVERHEAD = 3
```

### Testing

- Tests live in `tests/` directory
- Use `bun test` to run all tests
- Place test files alongside source files or in `tests/`

## Architecture

### Entry Point (`src/index.tsx`)

Handles CLI argument parsing, prompt file loading, and renderer initialization. Exits on invalid arguments or missing prompt file.

### Main App (`src/App.tsx`)

Orchestrates the run loop and layout:
- Manages run state (runs array, current index)
- Coordinates between useServer, useSession, and usePTY hooks
- Handles keyboard navigation and quit dialog

### Custom Hooks (`src/hooks/`)

- `useServer.ts`: Manages `opencode serve` process and port detection
- `useSession.ts`: Creates sessions and sends prompts via OpenCode SDK
- `usePTY.ts`: Handles PTY spawning, resizing, and streaming

### Components (`src/components/`)

- `Header.tsx`: Shows prompt path and run progress
- `Sidebar.tsx`: Lists all runs with status and duration
- `PTYView.tsx`: Displays live terminal output
- `Footer.tsx`: Shows keybinding hints
- `QuitDialog.tsx`: Confirmation dialog for quitting during active runs

### Types (`src/types.ts`)

Contains all TypeScript interfaces and types:
- `RunInfo`: Single batch run session data
- `AppState`: Global application state
- `SessionStatus`: Status from OpenCode SDK

## Key Implementation Details

### Run Loop

1. Server starts → `useEffect` triggers first run
2. Create session via `useSession`
3. Add new `RunInfo` to runs array
4. Attach PTY and send prompt
5. Poll status every second
6. When status becomes idle → start next run
7. Continue until max runs reached or user quits

### Session Navigation

Users can browse old runs while new runs continue:
- `↑/↓` keys navigate between runs
- PTY attaches to selected session ID
- New runs auto-switch view only if viewing latest run

### Native Attach

The `a` key suspends the TUI and runs `opencode attach` in the native terminal with inherited stdio. This allows full terminal interaction while maintaining the TUI session state.

## Common Tasks

### Adding a New Component

1. Create `src/components/NewComponent.tsx`
2. Export named function with Props interface
3. Import and add to layout in `App.tsx`

### Adding a New Hook

1. Create `src/hooks/useNewHook.ts`
2. Export named function following hook patterns
3. Import in `App.tsx` or other hooks

### Modifying PTY Behavior

Edit `src/hooks/usePTY.ts` - handles spawning, attaching, resizing, and killing PTY processes.

### Modifying Session Management

Edit `src/hooks/useSession.ts` - handles session creation and prompt sending via OpenCode SDK.

## Dependencies

Key dependencies and their purposes:
- `@opentui/react` / `@opentui/core`: TUI rendering framework
- `@opencode-ai/sdk`: OpenCode API integration
- `ghostty-opentui`: Terminal buffer rendering
- `bun-pty`: PTY functionality for Bun
- `react`: React 19 for component model
