// Entry point for OpenCode Loop TUI
// Handles CLI args, component registration, and renderer setup

import { createCliRenderer } from "@opentui/core"
import { createRoot, extend } from "@opentui/react"
import { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"

import { App } from "./App.tsx"

// Register the ghostty-terminal component before rendering
extend({ "ghostty-terminal": GhosttyTerminalRenderable })

// Parse CLI arguments
function parseArgs(): { promptPath: string; maxRuns: number | 'infinite' } {
  const args = Bun.argv.slice(2)  // Skip bun and script path
  
  let promptPath: string | null = null
  let maxRuns: number | 'infinite' = 'infinite'

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    if ((arg === '--prompt' || arg === '-p') && nextArg) {
      promptPath = nextArg
      i++
    } else if ((arg === '--runs' || arg === '-r') && nextArg) {
      const parsed = parseInt(nextArg, 10)
      if (!isNaN(parsed) && parsed > 0) {
        maxRuns = parsed
      }
      i++
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
OpenCode Loop TUI - Batch run prompts against OpenCode sessions

Usage:
  bun run start --prompt <file> [--runs <count>]

Options:
  -p, --prompt <file>   Path to prompt file (required)
  -r, --runs <count>    Number of runs (default: infinite until quit)
  -h, --help            Show this help message

Examples:
  bun run start --prompt ./improve.md
  bun run start --prompt ./test.md --runs 5
`)
      process.exit(0)
    }
  }

  if (!promptPath) {
    console.error('Error: --prompt is required')
    console.error('Use --help for usage information')
    process.exit(1)
  }

  return { promptPath, maxRuns }
}

// Validate prompt file exists and read content
async function loadPrompt(promptPath: string): Promise<string> {
  const file = Bun.file(promptPath)
  
  if (!await file.exists()) {
    console.error(`Error: Prompt file not found: ${promptPath}`)
    process.exit(1)
  }

  return await file.text()
}

// Main entry
async function main() {
  // Parse args
  const { promptPath, maxRuns } = parseArgs()

  // Load prompt content
  const promptContent = await loadPrompt(promptPath)

  // Create renderer with mouse support, handle Ctrl+C ourselves
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    useMouse: true,
  })

  // Create root and render
  createRoot(renderer).render(
    <App
      promptPath={promptPath}
      promptContent={promptContent}
      maxRuns={maxRuns}
    />
  )
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
