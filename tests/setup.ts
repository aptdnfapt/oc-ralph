// Shared test utilities for OpenTUI component testing
import { testRender } from "@opentui/react/test-utils"

// Default test dimensions
export const DEFAULT_WIDTH = 80
export const DEFAULT_HEIGHT = 24

// Helper to render a component for testing
export async function renderComponent(
  element: React.ReactElement,
  options?: { width?: number; height?: number }
) {
  const testSetup = await testRender(element, {
    width: options?.width ?? DEFAULT_WIDTH,
    height: options?.height ?? DEFAULT_HEIGHT,
  })
  
  return testSetup
}

// Type for test setup return
export type TestSetup = Awaited<ReturnType<typeof testRender>>
