# Implementation Plan: OpenCode Loop TUI

A terminal user interface for batch-running prompts against OpenCode sessions with live PTY viewing.

---

## 1. Resources & Knowledge Base

### Core Libraries

| Resource | Purpose | Access Method |
|----------|---------|---------------|
| `@opentui/core` | TUI renderer engine | `zread_search_doc` repo `anomalyco/opentui` query "createCliRenderer" |
| `@opentui/react` | React reconciler for OpenTUI | Read local `.opencode/skill/opentui/references/react/api.md` |
| `ghostty-opentui` | Terminal component with PTY support | `zread_read_file` repo `remorses/ghostty-opentui` file `src/terminal-buffer.ts` |
| `bun-pty` | PTY spawning for subprocess | `zread_read_file` repo `remorses/ghostty-opentui` file `tui/dual-opencode.tsx` lines 1-20 for import |
| `@opencode-ai/sdk` | OpenCode session/prompt API | Read local `/home/idc/proj/opencode/packages/sdk/js/src/client.ts` lines 1-50 |

### Reference Files (Local)

| Path | Contains |
|------|----------|
| `/home/idc/proj/opencode/packages/sdk/js/src/gen/types.gen.ts` | Session types, status enum |
| `/home/idc/proj/opencode/packages/sdk/js/src/client.ts` | SDK client creation |
| `/home/idc/proj/opencode/packages/opencode/src/cli/cmd/serve.ts` | Server command impl |
| `/home/idc/proj/opencode/packages/opencode/src/cli/cmd/tui/attach.ts` | Attach command impl |
| `/home/idc/proj/opencode/packages/opencode/src/session/status.ts` | Status types: idle, busy, retry |

### Reference Files (Remote - use zread)

| Repo | File | Contains |
|------|------|----------|
| `remorses/ghostty-opentui` | `tui/dual-opencode.tsx` | Dual PTY panel example |
| `remorses/ghostty-opentui` | `tui/interactive.tsx` | PTY spawn + feed pattern |
| `remorses/ghostty-opentui` | `src/terminal-buffer.ts` | GhosttyTerminalRenderable API |

### Testing Reference

| Path | Contains |
|------|----------|
| `.opencode/skill/opentui/references/testing/README.md` | testRender, snapshots, bun:test |

---

## 2. High-Level Objectives

### User Stories

**US-1**: As a user, I want to run `tui --prompt ./improve.md --runs 10` so that I can batch-test a prompt multiple times.

**US-2**: As a user, I want the full OpenCode CLI (TUI) rendered in a PTY panel so that I can interact with and observe the AI session directly.

**US-3**: As a user, I want a sidebar showing all completed runs with timing (e.g., `Run #1 (32s) ✓`) so that I can track progress.

**US-4**: As a user, I want to click on any past run in the sidebar so that I can review that session's PTY output.

**US-5**: As a user, I want the TUI to auto-advance to the next run when a session becomes idle so that batch execution is hands-free.

**US-6**: As a user, I want a quit confirmation dialog when pressing 'q' during an active session so that I don't accidentally terminate.

**US-7**: As a user, I want infinite runs by default (until 'q') or a specific count via `--runs N` so that I have flexibility.

### Maintainer Stories

**MS-1**: As a developer, I want snapshot tests for all UI components so that visual regressions are caught.

**MS-2**: As a developer, I want integration tests for SDK operations (create session, send prompt, poll status) so that API contracts are verified.

**MS-3**: As a developer, I want the codebase to follow OpenCode's TUI patterns so that the UI is visually consistent.

---

## 3. Execution Roadmap

### Phase 1: Project Setup

#### Task 1.1: Initialize Bun Project

- **Context Source**: OpenTUI skill at `.opencode/skill/opentui/references/react/configuration.md`
- **Pre-conditions**: None
- **The Story**: MS-3 (consistent patterns)
- **Implementation Logic**:
  - Run `bun init` in project root
  - Set `name` to `opencode-ralph` in package.json
  - Set `type` to `module`
  - Add `main` entry as `src/index.tsx`
  - Add scripts: `start` → `bun run src/index.tsx`, `test` → `bun test`
- **Reference**: Read `/home/idc/proj/opencode/packages/opencode/package.json` lines 1-20 for scripts pattern

#### Task 1.2: Install Dependencies

- **Context Source**: Resources table above
- **Pre-conditions**: Task 1.1 complete
- **The Story**: All stories (foundation)
- **Implementation Logic**:
  - Install runtime deps: `@opentui/core`, `@opentui/react`, `ghostty-opentui`, `@opencode-ai/sdk`
  - Note: `bun-pty` comes with ghostty-opentui
  - Install dev deps: `typescript`, `@types/bun`
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `package.json` for peer deps

#### Task 1.3: Configure TypeScript

- **Context Source**: `.opencode/skill/opentui/references/react/configuration.md`
- **Pre-conditions**: Task 1.2 complete
- **The Story**: MS-3
- **Implementation Logic**:
  - Create `tsconfig.json` with target `ESNext`, module `ESNext`
  - Set jsx to `react-jsx`, jsxImportSource to `@opentui/react`
  - Enable strict mode, skipLibCheck
  - Set moduleResolution to `bundler`
- **Reference**: Read `/home/idc/proj/opencode/packages/opencode/tsconfig.json` for jsx and module settings

#### Task 1.4: Create Directory Structure

- **Context Source**: Design discussion in brainstorming session
- **Pre-conditions**: Task 1.3 complete
- **The Story**: MS-3
- **Implementation Logic**:
  - Create `src/` directory
  - Create `src/components/` for UI components
  - Create `src/hooks/` for custom hooks
  - Create `src/types.ts` for shared types
  - Create `tests/` directory
  - Create `tests/components/` for UI tests
  - Create `tests/integration/` for SDK tests
- **Reference**: See file structure diagram in Section 4 of this document

---

### Phase 2: Core Types & State

#### Task 2.1: Define Core Types

- **Context Source**: OpenCode SDK types at `/home/idc/proj/opencode/packages/sdk/js/src/gen/types.gen.ts`
- **Pre-conditions**: Task 1.4 complete
- **The Story**: US-3 (sidebar with timing)
- **Implementation Logic**:
  - In `src/types.ts`, define `RunInfo` interface with fields:
    - `id`: string (session ID like `ses_xxx`)
    - `runNumber`: number (1, 2, 3...)
    - `startTime`: number (timestamp ms)
    - `duration`: number or null (null if running)
    - `status`: union type `'busy' | 'idle'`
  - Define `AppState` interface with fields:
    - `port`: number or null
    - `runs`: array of RunInfo
    - `currentIndex`: number (selected run)
    - `ptySessionId`: string or null (currently attached)
    - `isRunning`: boolean
  - Define `CLIArgs` interface with fields:
    - `prompt`: string (file path)
    - `runs`: number or `'infinite'`
- **Reference**: Session status at `/home/idc/proj/opencode/packages/opencode/src/session/status.ts`

#### Task 2.2: Create CLI Argument Parser

- **Context Source**: Bun's built-in arg parsing
- **Pre-conditions**: Task 2.1 complete
- **The Story**: US-1, US-7 (--prompt, --runs flags)
- **Implementation Logic**:
  - In `src/index.tsx`, use `Bun.argv` to get command line args
  - Parse `--prompt` or `-p` flag to get prompt file path (required)
  - Parse `--runs` or `-r` flag, default to `'infinite'`
  - If runs is a number string, parse to integer
  - Validate prompt file exists using `Bun.file().exists()`
  - Exit with error message if prompt file missing
- **Reference**: Bun docs at https://bun.sh/docs/api/utils for Bun.argv, Bun.file

---

### Phase 3: Server & SDK Hooks

#### Task 3.1: Implement useServer Hook

- **Context Source**: OpenCode serve command at `/home/idc/proj/opencode/packages/opencode/src/cli/cmd/serve.ts`
- **Pre-conditions**: Task 2.2 complete
- **The Story**: US-1 (batch execution requires server)
- **Implementation Logic**:
  - In `src/hooks/useServer.ts`, create hook that returns `{ port, isReady, error }`
  - On mount, spawn `opencode serve` using `spawn` from `bun-pty`
  - Capture stdout and parse for port number (regex: `listening on http://.*:(\d+)`)
  - Store spawned process reference for cleanup
  - On unmount (cleanup function), call `pty.kill()` to terminate server
  - Use `useState` for port, `useEffect` for spawn/cleanup lifecycle
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/dual-opencode.tsx` lines 75-95 for `spawn()` and `onData` pattern

#### Task 3.2: Implement useSession Hook

- **Context Source**: SDK client at `/home/idc/proj/opencode/packages/sdk/js/src/client.ts`
- **Pre-conditions**: Task 3.1 complete
- **The Story**: US-2, US-5 (create session, send prompt, detect idle)
- **Implementation Logic**:
  - In `src/hooks/useSession.ts`, create hook accepting `port` and `promptContent`
  - Import `createOpencodeClient` from `@opencode-ai/sdk`
  - Create client with base URL `http://localhost:${port}`
  - Expose function `createAndRun()` that:
    - Calls `client.session.create({})` to get session ID
    - Calls `client.session.prompt({ path: { id }, body: { parts: [{ type: 'text', text: promptContent }] } })`
    - Returns the session ID
  - Expose function `pollStatus(sessionId)` that:
    - Calls `client.session.status()` 
    - Returns status object for given session ID
    - Status has `type` field: `'idle'`, `'busy'`, or `'retry'`
  - Set up polling interval (1000ms) when session is busy
  - Clear interval when status becomes `'idle'`
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/interactive.tsx` lines 50-70 for PTY + SDK pattern. Local SDK types at `/home/idc/proj/opencode/packages/sdk/js/src/gen/types.gen.ts`

#### Task 3.3: Implement usePTY Hook

- **Context Source**: ghostty-opentui `tui/interactive.tsx` and `tui/dual-opencode.tsx`
- **Pre-conditions**: Task 3.2 complete
- **The Story**: US-2, US-4 (live PTY view, switch between sessions)
- **Implementation Logic**:
  - In `src/hooks/usePTY.ts`, create hook accepting `port`, `sessionId`, `terminalRef`, `cols`, `rows`
  - Import `spawn` and `IPty` from `bun-pty`
  - Store PTY reference using `useRef<IPty | null>(null)`
  - Expose function `attach(sessionId)` that:
    - If existing PTY, call pty.kill() first
    - Spawn new PTY using spawn from bun-pty with command "opencode", args array containing "attach", the server URL with port, "-s" flag, and sessionId
    - Set PTY options: name to "xterm-256color" for full color support, cols and rows from parameters, cwd to process.cwd()
    - Set up pty.onData handler to call terminalRef.current.feed(data) for streaming
    - Store new PTY reference
  - Expose function `kill()` that terminates current PTY
  - On unmount, kill any active PTY
  - Handle resize by calling `pty.resize(newCols, newRows)` via `useOnResize` callback
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/dual-opencode.tsx` lines 80-100 for `spawn("opencode", ...)` with onData feed pattern

---

### Phase 4: UI Components

#### Task 4.1: Create Header Component

- **Context Source**: OpenCode TUI header pattern
- **Pre-conditions**: Phase 3 complete
- **The Story**: US-1 (show prompt path and run count)
- **Implementation Logic**:
  - In `src/components/Header.tsx`, create component accepting `promptPath`, `currentRun`, `totalRuns`
  - Use `box` with `flexDirection: "row"`, `justifyContent: "space-between"`, `height: 1`
  - Set `backgroundColor` to theme color (e.g., `#222`)
  - Left side: `text` showing `prompt: {promptPath}` with muted color
  - Right side: `text` showing `runs: {currentRun}/{totalRuns}` or `runs: {currentRun}/∞` if infinite
  - Add `paddingLeft: 1` and `paddingRight: 1` for spacing
- **Reference**: Read `/home/idc/proj/opencode/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` lines 1-50 for header box/text styling

#### Task 4.2: Create Sidebar Component

- **Context Source**: OpenCode sidebar pattern, US-3 requirements
- **Pre-conditions**: Task 4.1 complete
- **The Story**: US-3, US-4 (session list with timing, clickable)
- **Implementation Logic**:
  - In `src/components/Sidebar.tsx`, create component accepting `runs`, `currentIndex`, `onSelect`
  - Use `box` with `width: 20`, `flexDirection: "column"`, `border: true`, `borderColor: "#444"`
  - Add header `text` "Sessions" with accent color
  - Map over `runs` array, for each run render:
    - `text` with content: `Run #{runNumber} ({duration}s)` if done, or `Run #{runNumber} ...` if running
    - Add checkmark `✓` suffix for completed runs (status === 'idle')
    - Highlight selected run with `backgroundColor: "#58a6ff"`, `fg: "#000"`
    - Non-selected: `fg: "#d4d4d4"`
  - Wrap each run item in clickable `box` with `onClick={() => onSelect(index)}`
  - Format duration: `Math.round((run.duration || 0) / 1000)` for seconds
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/interactive.tsx` lines 110-140 for sidebar box styling with border, padding, text colors

#### Task 4.3: Create PTYView Component

- **Context Source**: ghostty-opentui GhosttyTerminalRenderable
- **Pre-conditions**: Task 4.2 complete
- **The Story**: US-2 (live PTY output)
- **Implementation Logic**:
  - In `src/components/PTYView.tsx`, create component accepting `terminalRef`, `cols`, `rows`
  - Import `GhosttyTerminalRenderable` from `ghostty-opentui/terminal-buffer`
  - Use `box` wrapper with `flexGrow: 1`, `border: true`, `borderColor: "#444"`
  - Add header bar: `box` with `height: 1`, `backgroundColor: "#333"`, text "Terminal Output"
  - Render `ghostty-terminal` element with props:
    - `ref={terminalRef}`
    - `persistent={true}` (required for streaming)
    - `cols={cols}`
    - `rows={rows}`
    - `trimEnd={true}`
    - `showCursor={true}`
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/interactive.tsx` lines 130-150 for `<ghostty-terminal ref={} persistent cols={} rows={} trimEnd showCursor />` element

#### Task 4.4: Create Footer Component

- **Context Source**: OpenCode footer pattern
- **Pre-conditions**: Task 4.3 complete
- **The Story**: US-6 (show quit hint)
- **Implementation Logic**:
  - In `src/components/Footer.tsx`, create simple component
  - Use `box` with `height: 1`, `backgroundColor: "#222"`, `paddingLeft: 1`
  - Render `text` with keybind hints: `q: quit`
  - Use muted color `#8b949e` for text
  - Highlight key letters with accent color using nested `span` elements
- **Reference**: Read `/home/idc/proj/opencode/packages/opencode/src/cli/cmd/tui/routes/session/index.tsx` search for "footer" or bottom box with height 1 and keybind text

#### Task 4.5: Create QuitDialog Component

- **Context Source**: OpenCode dialog system, US-6 requirements
- **Pre-conditions**: Task 4.4 complete
- **The Story**: US-6 (confirmation when quitting during active session)
- **Implementation Logic**:
  - In `src/components/QuitDialog.tsx`, create component accepting `visible`, `onConfirm`, `onCancel`
  - If not visible, return null
  - Use `box` with `position: "absolute"` to overlay entire screen
  - Set semi-transparent background: use RGBA with alpha (e.g., `RGBA.fromInts(0, 0, 0, 150)`)
  - Center inner dialog box using flexbox `justifyContent: "center"`, `alignItems: "center"`
  - Inner box: `width: 35`, `border: true`, `backgroundColor: "#282a36"`, `padding: 1`
  - Title text: "Quit? Session still running"
  - Two buttons in horizontal `box`: `[Yes]` and `[No]`
  - Buttons are clickable `box` elements with `onClick` handlers
  - Yes button calls `onConfirm`, No button calls `onCancel`
  - Selected/hover state: `backgroundColor: "#58a6ff"`, `fg: "#000"`
- **Reference**: Read `/home/idc/proj/opencode/packages/opencode/src/cli/cmd/tui/ui/dialog.tsx` for position absolute overlay, RGBA background, centered inner box pattern

---

### Phase 5: Main App Assembly

#### Task 5.1: Register Ghostty Component

- **Context Source**: ghostty-opentui registration pattern
- **Pre-conditions**: Phase 4 complete
- **The Story**: US-2 (PTY rendering requires registration)
- **Implementation Logic**:
  - At top of `src/index.tsx`, import `extend` from `@opentui/react`
  - Import `GhosttyTerminalRenderable` from `ghostty-opentui/terminal-buffer`
  - Call `extend({ "ghostty-terminal": GhosttyTerminalRenderable })` before any rendering
  - This must happen once, before createRoot
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/dual-opencode.tsx` line 9 for `extend({ "ghostty-terminal": GhosttyTerminalRenderable })`

#### Task 5.2: Implement App Component State

- **Context Source**: Design discussion, types from Task 2.1
- **Pre-conditions**: Task 5.1 complete
- **The Story**: All US stories
- **Implementation Logic**:
  - In `src/App.tsx`, create main App component
  - Use `useState` for: `runs` (RunInfo[]), `currentIndex` (number), `showQuitDialog` (boolean)
  - Use `useRef` for `terminalRef` pointing to GhosttyTerminalRenderable
  - Use `useTerminalDimensions` hook from opentui/react for width/height
  - Calculate `cols` and `rows` for PTY: subtract sidebar width (20) and borders (4) from width, subtract header/footer (2) from height
  - Initialize with props from CLI args: `promptPath`, `maxRuns`
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/interactive.tsx` lines 30-50 for useState, useRef, useTerminalDimensions pattern

#### Task 5.3: Implement Run Loop Logic

- **Context Source**: useServer, useSession, usePTY hooks
- **Pre-conditions**: Task 5.2 complete
- **The Story**: US-1, US-5 (batch execution, auto-advance on idle)
- **Implementation Logic**:
  - Use `useServer` hook to get `port`
  - Read prompt file content using `await Bun.file(promptPath).text()`
  - Use `useSession` hook with port and prompt content
  - Use `usePTY` hook with port, current session ID, terminalRef, cols, rows
  - On server ready (port !== null), call `startNextRun()` function
  - `startNextRun()` logic:
    - If maxRuns reached and not infinite, return
    - Call `createAndRun()` from useSession to get new sessionId
    - Add new RunInfo to runs array with status 'busy', startTime Date.now()
    - Set currentIndex to new run's index
    - Call `attach(sessionId)` from usePTY
  - Set up status polling effect: when currentIndex changes, poll status every 1000ms
  - When status becomes 'idle':
    - Update run's duration: `Date.now() - startTime`
    - Update run's status to 'idle'
    - Call `startNextRun()` to continue loop
- **Reference**: Read `/home/idc/proj/opencode/packages/opencode/src/session/status.ts` for `SessionStatus.Info` zod schema with `type: "idle" | "busy" | "retry"`

#### Task 5.4: Implement Session Switching

- **Context Source**: US-4 requirements, usePTY hook
- **Pre-conditions**: Task 5.3 complete
- **The Story**: US-4 (click sidebar to view past sessions)
- **Implementation Logic**:
  - Create `handleSelectRun(index)` function
  - Set `currentIndex` to selected index
  - Get sessionId from `runs[index].id`
  - Call `attach(sessionId)` from usePTY to switch PTY view
  - Pass this handler to Sidebar component's `onSelect` prop
  - Note: This kills current PTY and spawns new one attached to selected session
  - Session continues running server-side regardless of PTY attachment
- **Reference**: See Task 3.3 usePTY hook attach() function for PTY spawn pattern

#### Task 5.5: Implement Keyboard Handling

- **Context Source**: OpenTUI keyboard docs, US-6 requirements
- **Pre-conditions**: Task 5.4 complete
- **The Story**: US-6 (quit with confirmation)
- **Implementation Logic**:
  - Import `useKeyboard` from `@opentui/react`
  - Handle 'q' key press:
    - If any run has status 'busy', set `showQuitDialog` to true
    - If all runs idle (or no runs), call cleanup and exit
  - Handle 'y' key when dialog visible: confirm quit
  - Handle 'n' key or Escape when dialog visible: cancel dialog
  - Cleanup function: kill PTY, kill server, call `process.exit(0)`
  - Note: Do NOT use process.exit directly from component, use renderer.destroy() pattern
- **Reference**: Read `.opencode/skill/opentui/references/core/gotchas.md` search for "process.exit" - must use `renderer.destroy()` instead

#### Task 5.6: Implement Quit Dialog Handlers

- **Context Source**: QuitDialog component from Task 4.5
- **Pre-conditions**: Task 5.5 complete
- **The Story**: US-6 (mouse click on Yes/No)
- **Implementation Logic**:
  - Create `handleQuitConfirm()` function: kill PTY, kill server, destroy renderer
  - Create `handleQuitCancel()` function: set `showQuitDialog` to false
  - Pass these to QuitDialog's `onConfirm` and `onCancel` props
  - Both keyboard 'y'/'n' and mouse clicks trigger same handlers
- **Reference**: See Task 4.5 QuitDialog component for onConfirm/onCancel prop interface

#### Task 5.7: Assemble App Layout

- **Context Source**: All components from Phase 4
- **Pre-conditions**: Task 5.6 complete
- **The Story**: All US stories (complete UI)
- **Implementation Logic**:
  - App return structure:
    - Outer `box` with `flexDirection: "column"`, `flexGrow: 1`
    - Header component with promptPath, currentRun, totalRuns props
    - Middle `box` with `flexDirection: "row"`, `flexGrow: 1`:
      - Sidebar component with runs, currentIndex, onSelect props
      - PTYView component with terminalRef, cols, rows props
    - Footer component
    - QuitDialog component with visible, onConfirm, onCancel props (renders on top when visible)
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/interactive.tsx` lines 105-160 for outer box column, inner box row with sidebar + terminal layout

#### Task 5.8: Create Entry Point

- **Context Source**: OpenTUI renderer setup
- **Pre-conditions**: Task 5.7 complete
- **The Story**: US-1 (CLI entry)
- **Implementation Logic**:
  - In `src/index.tsx`, after component registration:
  - Parse CLI args to get promptPath and maxRuns
  - Validate prompt file exists
  - Import `createCliRenderer` from `@opentui/core`
  - Import `createRoot` from `@opentui/react`
  - Create renderer: `await createCliRenderer({ exitOnCtrlC: false, useMouse: true })`
  - Create root and render: `createRoot(renderer).render(<App promptPath={...} maxRuns={...} />)`
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/dual-opencode.tsx` lines 155-165 for `createCliRenderer({ exitOnCtrlC: false, useMouse: true })` and `createRoot(renderer).render(<App />)`

---

### Phase 6: Testing

#### Task 6.1: Set Up Test Infrastructure

- **Context Source**: `.opencode/skill/opentui/references/testing/README.md`
- **Pre-conditions**: Phase 5 complete
- **The Story**: MS-1 (snapshot tests)
- **Implementation Logic**:
  - Create `tests/setup.ts` for shared test utilities
  - Import `testRender` from `@opentui/react/test-utils`
  - Export helper function `renderComponent(component, options)` that:
    - Calls testRender with default dimensions (80x24)
    - Returns testSetup object
  - Export cleanup helper that calls `testSetup.renderer.destroy()`
  - Configure bun test in package.json if needed
- **Reference**: Read `.opencode/skill/opentui/references/testing/README.md` lines 107-120 for `testRender` import from `@opentui/react/test-utils`

#### Task 6.2: Write Header Component Tests

- **Context Source**: Testing patterns from skill reference
- **Pre-conditions**: Task 6.1 complete
- **The Story**: MS-1
- **Implementation Logic**:
  - In `tests/components/Header.test.tsx`:
  - Test "renders prompt path": render Header with promptPath="./test.md", assert frame contains "./test.md"
  - Test "renders run count": render with currentRun=3, totalRuns=10, assert frame contains "3/10"
  - Test "renders infinite symbol": render with totalRuns="infinite", assert frame contains "∞"
  - Use `toMatchSnapshot()` for visual regression test
  - Always call `renderer.destroy()` in afterEach
- **Reference**: Read `.opencode/skill/opentui/references/testing/README.md` lines 145-170 for `toMatchSnapshot()` and `captureCharFrame()` usage

#### Task 6.3: Write Sidebar Component Tests

- **Context Source**: Testing patterns
- **Pre-conditions**: Task 6.2 complete
- **The Story**: MS-1
- **Implementation Logic**:
  - In `tests/components/Sidebar.test.tsx`:
  - Test "renders empty state": render with empty runs array, assert "Sessions" header visible
  - Test "renders run list": render with 3 RunInfo objects, assert all run numbers visible
  - Test "shows duration for completed runs": render with run having duration 32000, assert "32s" visible
  - Test "shows running indicator": render with run having status 'busy', assert "..." visible
  - Test "highlights selected run": render with currentIndex=1, snapshot should show highlight on Run #2
  - Test "calls onSelect on click": mock onSelect, simulate click, assert called with correct index
- **Reference**: Read `.opencode/skill/opentui/references/testing/README.md` lines 339-380 for `renderer.keyInput.emit("keypress", {...})` interaction simulation

#### Task 6.4: Write QuitDialog Component Tests

- **Context Source**: Testing patterns
- **Pre-conditions**: Task 6.3 complete
- **The Story**: MS-1
- **Implementation Logic**:
  - In `tests/components/QuitDialog.test.tsx`:
  - Test "renders nothing when not visible": render with visible=false, assert empty frame
  - Test "renders dialog when visible": render with visible=true, assert "Quit?" text visible
  - Test "renders Yes and No buttons": assert both button labels in frame
  - Test "calls onConfirm on Yes click": mock handler, simulate click, assert called
  - Test "calls onCancel on No click": mock handler, simulate click, assert called
  - Snapshot test for dialog appearance
- **Reference**: Read `.opencode/skill/opentui/references/testing/README.md` lines 145-170 for snapshot with `toMatchSnapshot()`

#### Task 6.5: Write App Layout Snapshot Test

- **Context Source**: Testing patterns
- **Pre-conditions**: Task 6.4 complete
- **The Story**: MS-1
- **Implementation Logic**:
  - In `tests/components/App.test.tsx`:
  - Mock useServer to return fixed port
  - Mock useSession to return mock session functions
  - Mock usePTY to prevent actual PTY spawn
  - Test "matches initial layout snapshot": render App, snapshot full frame
  - Test "matches layout with runs": add mock runs to state, snapshot
  - Use larger dimensions (120x40) for full layout test
- **Reference**: Read `.opencode/skill/opentui/references/testing/README.md` lines 506-518 for layout test with larger dimensions (120x40)

#### Task 6.6: Write Server Integration Test

- **Context Source**: useServer hook implementation
- **Pre-conditions**: Task 6.5 complete
- **The Story**: MS-2 (SDK integration tests)
- **Implementation Logic**:
  - In `tests/integration/server.test.ts`:
  - Test "spawns opencode serve and captures port":
    - Spawn actual `opencode serve` process
    - Wait for stdout to contain port number
    - Assert port is valid number > 0
    - Kill process in cleanup
  - Test "server responds to health check":
    - After capturing port, fetch `http://localhost:${port}/health` or similar endpoint
    - Assert response is OK
  - Use timeout of 10000ms for spawn tests
- **Reference**: Read `/home/idc/proj/opencode/packages/opencode/src/cli/cmd/serve.ts` for stdout format `listening on http://${hostname}:${port}`

#### Task 6.7: Write Session Integration Test

- **Context Source**: useSession hook, SDK client
- **Pre-conditions**: Task 6.6 complete
- **The Story**: MS-2
- **Implementation Logic**:
  - In `tests/integration/session.test.ts`:
  - Requires running opencode serve (start in beforeAll, stop in afterAll)
  - Test "creates session successfully":
    - Create SDK client with test port
    - Call `client.session.create({})`
    - Assert response has `id` field starting with "ses_"
  - Test "sends prompt to session":
    - Create session first
    - Call `client.session.prompt({ path: { id }, body: { parts: [{ type: 'text', text: 'Hello' }] } })`
    - Assert response received (may be async)
  - Test "polls status and detects idle":
    - Create session, send simple prompt
    - Poll `client.session.status()` in loop
    - Assert eventually returns status with `type: 'idle'` for session
    - Use timeout/retry pattern
- **Reference**: Read `/home/idc/proj/opencode/packages/sdk/js/src/client.ts` for `createOpencodeClient()` and `/home/idc/proj/opencode/packages/sdk/js/src/gen/types.gen.ts` for `Session.Info` type with `id` field

#### Task 6.8: Write E2E Flow Test

- **Context Source**: Full application flow
- **Pre-conditions**: Task 6.7 complete
- **The Story**: MS-2
- **Implementation Logic**:
  - In `tests/integration/e2e.test.ts`:
  - Test "full run loop completes":
    - Start opencode serve
    - Create session via SDK
    - Send minimal prompt (e.g., "Say hi")
    - Poll until idle
    - Verify session status is idle
    - Clean up server
  - This validates the core loop without UI
  - Use longer timeout (30000ms) for AI response
- **Reference**: N/A (E2E test uses hooks from Tasks 3.1-3.3, validates full flow without UI)

---

### Phase 7: Polish & Documentation

#### Task 7.1: Add Error Handling

- **Context Source**: All hooks and components
- **Pre-conditions**: Phase 6 complete
- **The Story**: US-1 (robust execution)
- **Implementation Logic**:
  - In useServer: catch spawn errors, set error state, display in UI
  - In useSession: wrap SDK calls in try/catch, handle network errors
  - In usePTY: handle PTY spawn failures gracefully
  - In App: show error state component when any hook reports error
  - Error display: red border box with error message and "Press q to quit"
- **Reference**: Read `/home/idc/proj/opencode/packages/opencode/src/cli/cmd/tui/app.tsx` search for "error" or try/catch patterns for error state handling

#### Task 7.2: Add Resize Handling

- **Context Source**: useOnResize from opentui
- **Pre-conditions**: Task 7.1 complete
- **The Story**: US-2 (responsive PTY)
- **Implementation Logic**:
  - In App component, use `useOnResize` callback
  - Recalculate cols and rows on resize
  - Call `pty.resize(newCols, newRows)` via usePTY hook
  - GhosttyTerminalRenderable automatically handles content reflow
- **Reference**: `zread_read_file` on `remorses/ghostty-opentui` file `tui/dual-opencode.tsx` lines 68-78 for `useOnResize` callback with `pty.resize(newCols, newRows)`

#### Task 7.3: Create README

- **Context Source**: Project overview from design
- **Pre-conditions**: Task 7.2 complete
- **The Story**: MS-3 (documentation)
- **Implementation Logic**:
  - Create `README.md` in project root
  - Sections: Overview, Installation, Usage, Examples, Development
  - Usage examples: `bun run start --prompt ./my-prompt.md`, `bun run start --prompt ./improve.md --runs 5`
  - Document keyboard shortcuts: q (quit), click sidebar (switch session)
  - Note requirement: opencode CLI must be installed and in PATH
- **Reference**: See Section 5 Success Criteria for feature list to document

---

## 4. File Structure Summary

```
opencode-loop-tui/
├── src/
│   ├── index.tsx           # Entry point, CLI args, renderer setup
│   ├── App.tsx             # Main component, state, layout assembly
│   ├── types.ts            # RunInfo, AppState, CLIArgs interfaces
│   ├── components/
│   │   ├── Header.tsx      # Prompt path, run count display
│   │   ├── Sidebar.tsx     # Session list, click handling
│   │   ├── PTYView.tsx     # Ghostty terminal wrapper
│   │   ├── Footer.tsx      # Keybind hints
│   │   └── QuitDialog.tsx  # Confirmation modal
│   └── hooks/
│       ├── useServer.ts    # Spawn/kill opencode serve
│       ├── useSession.ts   # SDK: create, prompt, poll
│       └── usePTY.ts       # Spawn/kill/switch PTY
├── tests/
│   ├── setup.ts            # Shared test utilities
│   ├── components/
│   │   ├── Header.test.tsx
│   │   ├── Sidebar.test.tsx
│   │   ├── QuitDialog.test.tsx
│   │   └── App.test.tsx
│   └── integration/
│       ├── server.test.ts
│       ├── session.test.ts
│       └── e2e.test.ts
├── docs/
│   └── plan/
│       └── implementation_plan.md
├── package.json
├── tsconfig.json
└── README.md
```

---

## 5. Success Criteria

1. **Functional**: `bun run start --prompt ./test.md --runs 3` executes 3 runs sequentially
2. **Auto-advance**: When session goes idle, next run starts automatically
3. **Sidebar updates**: Each completed run appears with timing
4. **Session switching**: Clicking past run shows its PTY output
5. **Quit flow**: 'q' during active run shows dialog, 'q' when idle exits immediately
6. **Tests pass**: All snapshot and integration tests green
7. **No orphan processes**: Server killed on exit, no zombie PTYs

