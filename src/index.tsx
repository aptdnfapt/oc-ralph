#!/usr/bin/env bun
// Entry point for OpenCode Loop TUI
// Handles CLI args, component registration, and renderer setup

import { createCliRenderer } from "@opentui/core"
import { createRoot, extend } from "@opentui/react"
import { GhosttyTerminalRenderable } from "ghostty-opentui/terminal-buffer"

import { App } from "./App.tsx"

// Register the ghostty-terminal component before rendering
extend({ "ghostty-terminal": GhosttyTerminalRenderable })

// Parse CLI arguments
function parseArgs(): { promptPath: string; maxRuns: number | 'infinite'; model: string | null; agent: string | null } {
  const args = Bun.argv.slice(2)  // Skip bun and script path
  
  let promptPath: string | null = null
  let maxRuns: number | 'infinite' = 'infinite'
  let model: string | null = null
  let agent: string | null = null

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
    } else if ((arg === '--model' || arg === '-m') && nextArg) {
      model = nextArg
      i++
    } else if ((arg === '--agent' || arg === '-a') && nextArg) {
      agent = nextArg
      i++
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
OpenCode Loop TUI - Batch run prompts against OpenCode sessions

Usage:
  oc-ralph --prompt <file> [--runs <count>] [--model <provider/model>] [--agent <name>]

Options:
  -p, --prompt <file>          Path to prompt file (required)
  -r, --runs <count>           Number of runs (default: infinite until quit)
  -m, --model <provider/model> Model to use (e.g., anthropic/claude-sonnet-4-20250514)
                               If not specified, shows model selection dialog on start
  -a, --agent <name>           Agent to use (e.g., code, default)
                               If not specified, shows agent selection dialog on start
  -h, --help                   Show this help message

Keybinds:
  ↑/↓                   Navigate between runs
  a                     Attach to session in native terminal
  q                     Quit (with confirmation if busy)

Examples:
  oc-ralph --prompt ./improve.md
  oc-ralph -p ./test.md -r 5
  oc-ralph -p ./test.md -m anthropic/claude-sonnet-4-20250514
  oc-ralph -p ./test.md -m anthropic/claude-sonnet-4-20250514 -a code
`)
      process.exit(0)
    }
  }

  if (!promptPath) {
    console.error('Error: --prompt is required')
    console.error('Use --help for usage information')
    process.exit(1)
  }

  return { promptPath, maxRuns, model, agent }
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

// Parse model string like "provider/modelId"
function parseModel(modelStr: string): { providerID: string; modelID: string } | null {
  const [providerID, ...rest] = modelStr.split("/")
  if (!providerID || rest.length === 0) {
    return null
  }
  return {
    providerID,
    modelID: rest.join("/"), // Handle model IDs with slashes
  }
}

// Main entry
async function main() {
  // Parse args
  const { promptPath, maxRuns, model, agent } = parseArgs()

  // Load prompt content
  const promptContent = await loadPrompt(promptPath)

  // Parse model if provided
  let initialModel: { providerID: string; modelID: string } | null = null
  if (model) {
    initialModel = parseModel(model)
    if (!initialModel) {
      console.error(`Error: Invalid model format: ${model}`)
      console.error('Expected format: provider/modelId (e.g., anthropic/claude-sonnet-4-20250514)')
      process.exit(1)
    }
  }

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
      initialModel={initialModel}
      initialAgent={agent}
    />
  )
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
