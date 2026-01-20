// Tests for Header component
import { test, expect, afterEach } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { Header } from "../../src/components/Header.tsx"

let testSetup: Awaited<ReturnType<typeof testRender>> | null = null

afterEach(() => {
  if (testSetup) {
    testSetup.renderer.destroy()
    testSetup = null
  }
})

test("Header renders prompt path", async () => {
  testSetup = await testRender(
    <Header promptPath="./test.md" currentRun={1} totalRuns={10} />,
    { width: 80, height: 5 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("./test.md")
})

test("Header renders run count", async () => {
  testSetup = await testRender(
    <Header promptPath="./test.md" currentRun={3} totalRuns={10} />,
    { width: 80, height: 5 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("3/10")
})

test("Header renders infinite symbol", async () => {
  testSetup = await testRender(
    <Header promptPath="./test.md" currentRun={5} totalRuns="infinite" />,
    { width: 80, height: 5 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toContain("5/∞")
})

test("Header matches snapshot", async () => {
  testSetup = await testRender(
    <Header promptPath="./improve.md" currentRun={2} totalRuns={5} />,
    { width: 60, height: 3 }
  )
  
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  
  expect(frame).toMatchSnapshot()
})
