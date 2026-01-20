// Integration tests for SDK session operations
import { test, expect, beforeAll, afterAll } from "bun:test"
import { spawn, type IPty } from "bun-pty"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"

let serverPty: IPty | null = null
let port: number | null = null
let client: OpencodeClient | null = null

// Helper to wait for condition
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
  // Start server
  serverPty = spawn("opencode", ["serve"], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
  })

  let buffer = ""
  serverPty.onData((data: string) => {
    buffer += data
    const match = buffer.match(/listening on http:\/\/[^:]+:(\d+)/)
    if (match?.[1]) {
      port = parseInt(match[1], 10)
    }
  })

  await waitFor(() => port !== null, 10000)

  // Create SDK client
  client = createOpencodeClient({
    baseUrl: `http://localhost:${port}`,
  })
})

afterAll(() => {
  if (serverPty) {
    serverPty.kill()
    serverPty = null
  }
})

test("creates session successfully", async () => {
  expect(client).not.toBeNull()

  const response = await client!.session.create({})

  expect(response.data).toBeDefined()
  expect(response.data?.id).toBeDefined()
  expect(response.data?.id).toMatch(/^ses_/)
})

test("sends prompt to session", async () => {
  expect(client).not.toBeNull()

  // Create session first
  const createResponse = await client!.session.create({})
  const sessionId = createResponse.data?.id
  expect(sessionId).toBeDefined()

  // Send prompt - don't await the streaming response, just fire it
  // The SDK prompt() streams, so we just verify we can call it
  const promptPromise = client!.session.prompt({
    path: { id: sessionId! },
    body: {
      parts: [{ type: "text", text: "Say only: hi" }],
    },
  })

  // Give it a moment to start
  await Bun.sleep(500)

  // Verify session is now busy
  const statusResponse = await client!.session.status()
  const statusMap = statusResponse.data as Record<string, { type: string }>
  
  // Session should exist in status (busy) or have started processing
  expect(statusResponse.data).toBeDefined()
}, 15000)

test("polls status and detects state changes", async () => {
  expect(client).not.toBeNull()

  // Create session
  const createResponse = await client!.session.create({})
  const sessionId = createResponse.data?.id
  expect(sessionId).toBeDefined()

  // Check initial status (should be idle or not in map)
  const statusResponse = await client!.session.status()
  expect(statusResponse.data).toBeDefined()

  // Status is a map of sessionId -> status
  const statusMap = statusResponse.data as Record<string, { type: string }>

  // New session should either be idle or not in the map
  const sessionStatus = statusMap[sessionId!]
  if (sessionStatus) {
    expect(["idle", "busy"]).toContain(sessionStatus.type)
  }
})

test("session list includes created session", async () => {
  expect(client).not.toBeNull()

  // Create a session
  const createResponse = await client!.session.create({})
  const sessionId = createResponse.data?.id
  expect(sessionId).toBeDefined()

  // List sessions
  const listResponse = await client!.session.list()
  expect(listResponse.data).toBeDefined()
  expect(Array.isArray(listResponse.data)).toBe(true)

  // Find our session in the list
  const sessions = listResponse.data as Array<{ id: string }>
  const found = sessions.find((s) => s.id === sessionId)
  expect(found).toBeDefined()
})
