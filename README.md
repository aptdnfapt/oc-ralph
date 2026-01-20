# oc-ralph

A TUI for running [Ralph loops](https://ghuntley.com/ralph/) with [OpenCode](https://opencode.ai).

## What is Ralph?

```bash
while :; do cat PROMPT.md | claude-code ; done
```

Feed a prompt to an AI coding agent in a loop. Let it run. Walk away. Come back to shipped code.

## Why oc-ralph?

Other Ralph implementations add opinions:
- JSON PRD formats
- Custom prompt plans
- Structured task schemas
- Their own system prompts

**oc-ralph doesn't touch your prompt.**

It's just:
1. A loop
2. A terminal UI

Bring any file. Any format. Markdown, plain text, whatever. It pipes it to OpenCode and shows you what's happening. That's it.

Ralph is the outer shell around your agent. This tool gives you visibility into that shell without dictating what goes inside.

## Install

```bash
npm i -g oc-ralph
# or
bun install -g oc-ralph
```

## Usage

```bash
oc-ralph --prompt ./PROMPT.md --runs 5
```

Options:
- `--prompt, -p` — Path to prompt file (required)
- `--runs, -r` — Number of runs (default: infinite)

## Keybindings

| Key | Action |
|-----|--------|
| `↑/↓` | Navigate between sessions |
| `a` | Attach to current session (native terminal) |
| `q` | Quit (confirms if session busy) |

## How it works

```
┌─────────────────────────────────────────────────────┐
│ Prompt: ./PROMPT.md                    Run 3 of 5   │
├──────────────┬──────────────────────────────────────┤
│ Run #1 (32s) │                                      │
│ Run #2 (45s) │   Live terminal output from          │
│▸Run #3 ●     │   current session                    │
│              │                                      │
├──────────────┴──────────────────────────────────────┤
│ ↑↓: navigate  a: attach  q: quit                    │
└─────────────────────────────────────────────────────┘
```

1. Spawns `opencode serve` in background
2. Creates session, sends your prompt as-is
3. Shows live PTY output
4. When session idles → starts next run
5. Browse old sessions without interrupting new runs

## Current Limitations

- **Model/Agent selection** — Uses whatever you last used in OpenCode. No override yet.

## Roadmap

- [ ] Model and agent selection flags
- [ ] Improved UI design
- [ ] Global session history (persist across runs, browse anytime)
- [ ] Session export/replay

This is early. Built to test different PRD files and prompt plans. PRs welcome for any of the above.

## Requirements

- [Bun](https://bun.sh)
- [OpenCode](https://opencode.ai)

## License

MIT
