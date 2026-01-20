// Tests for App layout - testing composed layout without hook complexity
import { test, expect, afterEach } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { Header } from "../../src/components/Header.tsx"
import { Sidebar } from "../../src/components/Sidebar.tsx"
import { Footer } from "../../src/components/Footer.tsx"
import type { RunInfo } from "../../src/types.ts"

let testSetup: Awaited<ReturnType<typeof testRender>> | null = null

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy()
    testSetup = null
  }
})

// Test the composed layout structure (without App's complex hooks)
function AppLayout({
  promptPath,
  currentRun,
  maxRuns,
  runs,
  currentIndex,
}: {
  promptPath: string
  currentRun: number
  maxRuns: number | "infinite"
  runs: RunInfo[]
  currentIndex: number
}) {
  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header promptPath={promptPath} currentRun={currentRun} totalRuns={maxRuns} />
      <box style={{ flexDirection: "row", flexGrow: 1 }}>
        <Sidebar runs={runs} currentIndex={currentIndex} onSelect={() => {}} />
        <box style={{ flexGrow: 1, border: true, borderColor: "#444" }}>
          <text fg="#8b949e">Terminal Output</text>
        </box>
      </box>
      <Footer />
    </box>
  )
}

test("AppLayout matches initial layout snapshot", async () => {
  testSetup = await testRender(
    <AppLayout
      promptPath="./test-prompt.md"
      currentRun={0}
      maxRuns={3}
      runs={[]}
      currentIndex={0}
    />,
    { width: 120, height: 40 }
  )

  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()

  // Verify key elements present
  expect(frame).toContain("./test-prompt.md")
  expect(frame).toContain("Sessions")
  expect(frame).toContain("q: quit")
  expect(frame).toContain("Terminal Output")

  expect(frame).toMatchSnapshot()
})

test("AppLayout with runs shows session list", async () => {
  const mockRuns: RunInfo[] = [
    { id: "ses_1", runNumber: 1, startTime: Date.now() - 32000, duration: 32000, status: "idle" },
    { id: "ses_2", runNumber: 2, startTime: Date.now() - 15000, duration: 15000, status: "idle" },
    { id: "ses_3", runNumber: 3, startTime: Date.now(), duration: null, status: "busy" },
  ]

  testSetup = await testRender(
    <AppLayout
      promptPath="./improve.md"
      currentRun={3}
      maxRuns={5}
      runs={mockRuns}
      currentIndex={2}
    />,
    { width: 120, height: 40 }
  )

  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()

  // Verify runs are displayed
  expect(frame).toContain("Run #1")
  expect(frame).toContain("Run #2")
  expect(frame).toContain("Run #3")
  expect(frame).toContain("32s")
  expect(frame).toContain("15s")
  expect(frame).toContain("3/5") // Run count

  expect(frame).toMatchSnapshot()
})

test("AppLayout shows infinite runs symbol", async () => {
  testSetup = await testRender(
    <AppLayout
      promptPath="./test.md"
      currentRun={7}
      maxRuns="infinite"
      runs={[]}
      currentIndex={0}
    />,
    { width: 80, height: 24 }
  )

  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()

  expect(frame).toContain("7/∞")
})

// Test error state rendering
function ErrorState({ message }: { message: string }) {
  return (
    <box style={{ flexDirection: "column", flexGrow: 1, padding: 1 }}>
      <box style={{ border: true, borderColor: "#ff7b72", padding: 1 }}>
        <text fg="#ff7b72">Error: {message}</text>
      </box>
      <box style={{ height: 1, marginTop: 1 }}>
        <text fg="#8b949e">Press q to quit</text>
      </box>
    </box>
  )
}

test("ErrorState renders error message", async () => {
  testSetup = await testRender(<ErrorState message="Connection refused" />, {
    width: 80,
    height: 24,
  })

  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()

  expect(frame).toContain("Error")
  expect(frame).toContain("Connection refused")
  expect(frame).toContain("Press q to quit")
})

// Test loading state
function LoadingState() {
  return (
    <box
      style={{
        flexDirection: "column",
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <text fg="#8b949e">Starting server...</text>
    </box>
  )
}

test("LoadingState renders loading message", async () => {
  testSetup = await testRender(<LoadingState />, { width: 80, height: 24 })

  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()

  expect(frame).toContain("Starting server")
})
