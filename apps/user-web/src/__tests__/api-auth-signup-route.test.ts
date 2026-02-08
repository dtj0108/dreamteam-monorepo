import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const testState = vi.hoisted(() => ({
  ilikeEmailArg: "",
  profileUpdatePayload: null as Record<string, unknown> | null,
  signUpMock: vi.fn(),
  sendVerificationCodeMock: vi.fn(async () => ({ success: true })),
  pendingInvite: {
    id: "invite-1",
    workspace_id: "workspace-1",
    role: "member",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    workspaces: { name: "Team Workspace" },
  },
}))

const createAdminMock = () => {
  let currentTable = ""
  let mode: "select" | "delete" | "update" | null = null

  const chain = {
    from: vi.fn((table: string) => {
      currentTable = table
      mode = null
      return chain
    }),
    upsert: vi.fn(async () => ({ data: null, error: null })),
    select: vi.fn(() => {
      mode = "select"
      return chain
    }),
    ilike: vi.fn((field: string, value: string) => {
      if (currentTable === "pending_invites" && field === "email") {
        testState.ilikeEmailArg = value
      }
      return chain
    }),
    is: vi.fn(() => chain),
    insert: vi.fn(async () => ({ data: null, error: null })),
    delete: vi.fn(() => {
      mode = "delete"
      return chain
    }),
    update: vi.fn((payload?: Record<string, unknown>) => {
      mode = "update"
      if (currentTable === "profiles" && payload) {
        testState.profileUpdatePayload = payload
      }
      return chain
    }),
    eq: vi.fn(() => chain),
    then: vi.fn((resolve: (value: { data: unknown; error: null }) => void) => {
      if (currentTable === "pending_invites" && mode === "select") {
        resolve({ data: [testState.pendingInvite], error: null })
        return
      }
      resolve({ data: null, error: null })
    }),
  }

  return chain
}

const adminMock = createAdminMock()

vi.mock("@dreamteam/database/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      signUp: testState.signUpMock,
    },
  })),
  createAdminClient: vi.fn(() => adminMock),
}))

vi.mock("@/lib/twilio", () => ({
  sendVerificationCode: testState.sendVerificationCodeMock,
}))

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({})),
}))

vi.mock("@/lib/billing-queries", () => ({
  updateBillingFromSubscription: vi.fn(),
  ensureWorkspaceBilling: vi.fn(),
}))

import { POST } from "@/app/api/auth/signup/route"

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testState.ilikeEmailArg = ""
    testState.profileUpdatePayload = null
    testState.signUpMock.mockResolvedValue({
      data: { user: { id: "new-user-1" } },
      error: null,
    })
  })

  it("normalizes signup email and queries pending invites case-insensitively", async () => {
    const request = new NextRequest("http://localhost/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "New User",
        email: "  Mixed.Case@Example.COM ",
        phone: "+15555550100",
        password: "password123",
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(testState.signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "mixed.case@example.com",
      })
    )
    expect(testState.ilikeEmailArg).toBe("mixed.case@example.com")
    expect(testState.sendVerificationCodeMock).toHaveBeenCalledWith("+15555550100")
    expect(body.joinedTeam).toBe(true)
    expect(body.teamName).toBe("Team Workspace")
    expect(testState.profileUpdatePayload).toMatchObject({
      onboarding_completed: true,
    })
  })
})
