// Tests for QuitDialog component
import { test, expect, afterEach } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { QuitDialog } from "../../src/components/QuitDialog.tsx"

let testSetup: Awaited<ReturnType<typeof testRender>> | null = null

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy()
    testSetup = null
  }
})

test("QuitDialog renders nothing when not visible", async () => {
  testSetup = await testRender(
    <QuitDialog visible={false} onConfirm={() => {}} onCancel={() => {}} />,
    { width: 40, height: 15 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  // Should be empty (only whitespace)
  expect(frame.trim()).toBe("")
})

test("QuitDialog renders dialog when visible", async () => {
  testSetup = await testRender(
    <QuitDialog visible={true} onConfirm={() => {}} onCancel={() => {}} />,
    { width: 50, height: 15 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("Quit?")
  expect(frame).toContain("Session still running")
})

test("QuitDialog renders Yes and No buttons", async () => {
  testSetup = await testRender(
    <QuitDialog visible={true} onConfirm={() => {}} onCancel={() => {}} />,
    { width: 50, height: 15 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("[Yes]")
  expect(frame).toContain("[No]")
})

test("QuitDialog matches snapshot", async () => {
  testSetup = await testRender(
    <QuitDialog visible={true} onConfirm={() => {}} onCancel={() => {}} />,
    { width: 50, height: 15 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toMatchSnapshot()
})
