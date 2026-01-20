// End-to-end flow test: full run loop without UI
import { test, expect, beforeAll, afterAll } from "bun:test"
import { spawn, type IPty } from "bun-pty"
import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk"

let serverPty: IPty | null = null
let port: number | null = null
let client: OpencodeClient | null = null

// Helper to wait for condition
async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 30000,
  interval = 500
): Promise<void> {
  const start = Date.now()
  while (true) {
    const result = await condition()
    if (result) return
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

  client = createOpencodeClient({
    baseUrl: `http://localhost:${port}`,
  })
}, 15000)

afterAll(() => {
  if (serverPty) {
    serverPty.kill()
    serverPty = null
  }
})

test(
  "full run loop: create session, send prompt, poll until idle",
  async () => {
    expect(client).not.toBeNull()

    // 1. Create session
    const createResponse = await client!.session.create({})
    const sessionId = createResponse.data?.id
    expect(sessionId).toBeDefined()
    expect(sessionId).toMatch(/^ses_/)

    // 2. Send minimal prompt
    await client!.session.prompt({
      path: { id: sessionId! },
      body: {
        parts: [{ type: "text", text: "Reply with only: done" }],
      },
    })

    // 3. Poll until idle (with 30s timeout for AI response)
    let finalStatus: string | null = null

    await waitFor(async () => {
      const statusResponse = await client!.session.status()
      const statusMap = statusResponse.data as Record<string, { type: string }>
      const status = statusMap[sessionId!]

      // Session is idle if not in map or explicitly idle
      if (!status || status.type === "idle") {
        finalStatus = "idle"
        return true
      }

      return false
    }, 30000)

    // 4. Verify session completed
    expect(finalStatus === "idle").toBe(true)

    // 5. Verify session still exists in list
    const listResponse = await client!.session.list()
    const sessions = listResponse.data as Array<{ id: string }>
    const found = sessions.find((s) => s.id === sessionId)
    expect(found).toBeDefined()
  },
  35000
) // 35s timeout for the whole test

test("multiple sessions can run in sequence", async () => {
  expect(client).not.toBeNull()

  const sessionIds: string[] = []

  // Create 2 sessions in sequence
  for (let i = 0; i < 2; i++) {
    const response = await client!.session.create({})
    const id = response.data?.id
    expect(id).toBeDefined()
    sessionIds.push(id!)
  }

  // Verify all sessions created
  expect(sessionIds.length).toBe(2)
  expect(sessionIds[0]).not.toBe(sessionIds[1])

  // Verify all sessions in list
  const listResponse = await client!.session.list()
  const sessions = listResponse.data as Array<{ id: string }>

  for (const id of sessionIds) {
    const found = sessions.find((s) => s.id === id)
    expect(found).toBeDefined()
  }
})
