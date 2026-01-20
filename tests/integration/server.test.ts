// Integration tests for opencode serve spawning
import { test, expect, beforeAll, afterAll } from "bun:test"
import { spawn, type IPty } from "bun-pty"

let serverPty: IPty | null = null
let capturedPort: number | null = null

// Helper to wait for condition with timeout
async function waitFor(
  condition: () => boolean,
  timeout = 10000,
  interval = 100
): Promise<void> {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("Timeout waiting for condition")
    }
    await Bun.sleep(interval)
  }
}

beforeAll(async () => {
  // Spawn opencode serve
  serverPty = spawn("opencode", ["serve"], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
  })

  let buffer = ""

  serverPty.onData((data: string) => {
    buffer += data
    // Parse for port
    const match = buffer.match(/listening on http:\/\/[^:]+:(\d+)/)
    if (match?.[1]) {
      capturedPort = parseInt(match[1], 10)
    }
  })

  // Wait for port to be captured (max 10s)
  await waitFor(() => capturedPort !== null, 10000)
})

afterAll(() => {
  if (serverPty) {
    serverPty.kill()
    serverPty = null
  }
})

test("spawns opencode serve and captures port", () => {
  expect(capturedPort).not.toBeNull()
  expect(capturedPort).toBeGreaterThan(0)
  expect(capturedPort).toBeLessThan(65536)
})

test("server responds to session endpoint", async () => {
  expect(capturedPort).not.toBeNull()

  // Try the session endpoint (GET /session lists sessions)
  const response = await fetch(`http://localhost:${capturedPort}/session`)

  expect(response.ok).toBe(true)
  const data = await response.json()
  expect(Array.isArray(data)).toBe(true)
})

test("server responds to status endpoint", async () => {
  expect(capturedPort).not.toBeNull()

  const response = await fetch(`http://localhost:${capturedPort}/session/status`)

  expect(response.ok).toBe(true)
  const data = await response.json()
  expect(typeof data).toBe("object")
})
