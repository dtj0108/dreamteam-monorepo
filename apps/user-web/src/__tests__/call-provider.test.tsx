import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { CallProvider } from "@/providers/call-provider"

const testState = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  loading: false,
  deviceConstructor: vi.fn(),
}))

vi.mock("@/hooks/use-user", () => ({
  useUser: () => ({
    user: testState.user,
    loading: testState.loading,
    refreshUser: vi.fn(),
  }),
}))

vi.mock("@twilio/voice-sdk", () => {
  class MockDevice {
    constructor(...args: unknown[]) {
      testState.deviceConstructor(...args)
    }
    on() {}
    async register() {}
    destroy() {}
    updateToken() {}
    async connect() {
      return {
        on: vi.fn(),
        mute: vi.fn(),
        sendDigits: vi.fn(),
        disconnect: vi.fn(),
        reject: vi.fn(),
        accept: vi.fn(),
      }
    }
  }

  const MockCall = {
    Codec: {
      Opus: "opus",
      PCMU: "pcmu",
    },
  }

  return {
    Device: MockDevice,
    Call: MockCall,
  }
})

describe("CallProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testState.user = null
    testState.loading = false
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("does not fetch a Twilio token when user is unauthenticated", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    render(
      <CallProvider>
        <div>child</div>
      </CallProvider>
    )

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled()
      expect(testState.deviceConstructor).not.toHaveBeenCalled()
    })
  })

  it("handles unauthorized token responses without logging console errors", async () => {
    testState.user = { id: "user-1", email: "user@example.com" }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <CallProvider>
        <div>child</div>
      </CallProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/twilio/token")
    })

    expect(errorSpy).not.toHaveBeenCalled()
    expect(testState.deviceConstructor).not.toHaveBeenCalled()
  })
})
