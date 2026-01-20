// Tests for Footer component
import { test, expect, afterEach } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { Footer } from "../../src/components/Footer.tsx"

let testSetup: Awaited<ReturnType<typeof testRender>> | null = null

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy()
    testSetup = null
  }
})

test("Footer renders quit hint", async () => {
  testSetup = await testRender(
    <Footer />,
    { width: 40, height: 3 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("q")
  expect(frame).toContain("quit")
})

test("Footer matches snapshot", async () => {
  testSetup = await testRender(
    <Footer />,
    { width: 40, height: 3 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toMatchSnapshot()
})
