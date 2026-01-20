// Tests for Sidebar component
import { test, expect, afterEach } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { Sidebar } from "../../src/components/Sidebar.tsx"
import type { RunInfo } from "../../src/types.ts"

let testSetup: Awaited<ReturnType<typeof testRender>> | null = null

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy()
    testSetup = null
  }
})

// Helper to create mock runs
function createMockRuns(count: number): RunInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ses_${i + 1}`,
    runNumber: i + 1,
    startTime: Date.now() - (count - i) * 30000,
    duration: i < count - 1 ? 30000 + i * 2000 : null,  // Last one is running
    status: i < count - 1 ? 'idle' as const : 'busy' as const,
  }))
}

test("Sidebar renders empty state", async () => {
  testSetup = await testRender(
    <Sidebar runs={[]} currentIndex={0} onSelect={() => {}} />,
    { width: 25, height: 10 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("Sessions")
  expect(frame).toContain("No runs yet")
})

test("Sidebar renders run list", async () => {
  const runs = createMockRuns(3)
  
  testSetup = await testRender(
    <Sidebar runs={runs} currentIndex={0} onSelect={() => {}} />,
    { width: 25, height: 10 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("Run #1")
  expect(frame).toContain("Run #2")
  expect(frame).toContain("Run #3")
})

test("Sidebar shows duration for completed runs", async () => {
  const runs: RunInfo[] = [{
    id: "ses_1",
    runNumber: 1,
    startTime: Date.now() - 32000,
    duration: 32000,
    status: 'idle',
  }]
  
  testSetup = await testRender(
    <Sidebar runs={runs} currentIndex={0} onSelect={() => {}} />,
    { width: 25, height: 10 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("32s")
  expect(frame).toContain("✓")
})

test("Sidebar shows running indicator", async () => {
  const runs: RunInfo[] = [{
    id: "ses_1",
    runNumber: 1,
    startTime: Date.now(),
    duration: null,
    status: 'busy',
  }]
  
  testSetup = await testRender(
    <Sidebar runs={runs} currentIndex={0} onSelect={() => {}} />,
    { width: 25, height: 10 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("...")
})

test("Sidebar matches snapshot with multiple runs", async () => {
  const runs = createMockRuns(3)
  
  testSetup = await testRender(
    <Sidebar runs={runs} currentIndex={1} onSelect={() => {}} />,
    { width: 25, height: 12 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toMatchSnapshot()
})
