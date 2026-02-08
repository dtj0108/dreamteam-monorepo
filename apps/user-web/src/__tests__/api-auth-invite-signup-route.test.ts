import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

type InviteRecord = {
  id: string
  workspace_id: string
  email: string
  role: "admin" | "member"
  expires_at: string | null
}

const testState = vi.hoisted(() => ({
  invite: null as InviteRecord | null,
  existingProfileById: null as { id: string } | null,
  existingMembership: null as { id: string } | null,
  insertedMembership: null as Record<string, unknown> | null,
  profileUpsertPayload: null as Record<string, unknown> | null,
  inviteAccepted: false,
  signUpMock: vi.fn(),
  signInWithPasswordMock: vi.fn(),
  cookieSetMock: vi.fn(),
}))

const createAdminMock = () => {
  let currentTable = ""
  const filters: Record<string, unknown> = {}
  let hasAcceptedAtNullFilter = false

  const chain = {
    from: vi.fn((table: string) => {
      currentTable = table
      Object.keys(filters).forEach((key) => delete filters[key])
      hasAcceptedAtNullFilter = false
      return chain
    }),
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: unknown) => {
      filters[field] = value
      return chain
    }),
    is: vi.fn((field: string, value: unknown) => {
      if (field === "accepted_at" && value === null) {
        hasAcceptedAtNullFilter = true
      }
      return chain
    }),
    single: vi.fn(async () => {
      if (currentTable === "pending_invites") {
        if (!testState.invite || !hasAcceptedAtNullFilter || filters.id !== testState.invite.id) {
          return { data: null, error: { message: "Not found" } }
        }

        return { data: testState.invite, error: null }
      }

      if (currentTable === "profiles") {
        if (typeof filters.id === "string" && filters.id.length > 0) {
          if (testState.existingProfileById) {
            return { data: testState.existingProfileById, error: null }
          }
          return { data: null, error: { message: "Not found" } }
        }

        return { data: null, error: { message: "Not found" } }
      }

      if (currentTable === "workspace_members") {
        if (testState.existingMembership) {
          return { data: testState.existingMembership, error: null }
        }
        return { data: null, error: { message: "Not found" } }
      }

      return { data: null, error: null }
    }),
    upsert: vi.fn(async (payload: Record<string, unknown>) => {
      if (currentTable === "profiles") {
        testState.profileUpsertPayload = payload
      }
      return { data: null, error: null }
    }),
    insert: vi.fn(async (payload: Record<string, unknown>) => {
      if (currentTable === "workspace_members") {
        testState.insertedMembership = payload
      }
      return { data: null, error: null }
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      if (currentTable === "pending_invites" && payload.accepted_at) {
        testState.inviteAccepted = true
      }
      return chain
    }),
  }

  return chain
}

const adminMock = createAdminMock()

vi.mock("@dreamteam/database/server", () => ({
  createAdminClient: vi.fn(() => adminMock),
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      signUp: testState.signUpMock,
      signInWithPassword: testState.signInWithPasswordMock,
    },
  })),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: testState.cookieSetMock,
  })),
}))

import { POST } from "@/app/api/auth/invite-signup/route"

describe("POST /api/auth/invite-signup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testState.invite = {
      id: "invite-1",
      workspace_id: "workspace-1",
      email: "  Mixed.Case@Example.COM ",
      role: "member",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }
    testState.existingProfileById = null
    testState.existingMembership = null
    testState.insertedMembership = null
    testState.profileUpsertPayload = null
    testState.inviteAccepted = false
    testState.signUpMock.mockResolvedValue({
      data: { user: { id: "new-user-1" } },
      error: null,
    })
    testState.signInWithPasswordMock.mockResolvedValue({ data: {}, error: null })
  })

  it("creates account from invite and joins workspace", async () => {
    const request = new NextRequest("http://localhost/api/auth/invite-signup", {
      method: "POST",
      body: JSON.stringify({
        inviteId: "invite-1",
        password: "password123",
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.workspaceId).toBe("workspace-1")
    expect(testState.signUpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "mixed.case@example.com",
      })
    )
    expect(testState.profileUpsertPayload).toMatchObject({
      id: "new-user-1",
      email: "mixed.case@example.com",
      role: "member",
      onboarding_completed: true,
      default_workspace_id: "workspace-1",
    })
    expect(testState.insertedMembership).toMatchObject({
      workspace_id: "workspace-1",
      profile_id: "new-user-1",
      role: "member",
    })
    expect(testState.inviteAccepted).toBe(true)
    expect(testState.signInWithPasswordMock).toHaveBeenCalledWith({
      email: "mixed.case@example.com",
      password: "password123",
    })
    expect(testState.cookieSetMock).toHaveBeenCalledWith(
      "current_workspace_id",
      "workspace-1",
      expect.objectContaining({
        httpOnly: true,
      })
    )
  })

  it("returns 409 when invite email already has an account", async () => {
    testState.signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: "already registered" },
    })
    testState.signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    })

    const request = new NextRequest("http://localhost/api/auth/invite-signup", {
      method: "POST",
      body: JSON.stringify({
        inviteId: "invite-1",
        password: "password123",
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.code).toBe("INVITE_ACCOUNT_EXISTS")
    expect(testState.signUpMock).toHaveBeenCalled()
    expect(testState.insertedMembership).toBeNull()
    expect(testState.inviteAccepted).toBe(false)
  })

  it("recovers and joins when auth account already exists with matching password", async () => {
    testState.signUpMock.mockResolvedValue({
      data: { user: null },
      error: { message: "already registered" },
    })
    testState.signInWithPasswordMock.mockResolvedValue({
      data: { user: { id: "existing-user-1" } },
      error: null,
    })

    const request = new NextRequest("http://localhost/api/auth/invite-signup", {
      method: "POST",
      body: JSON.stringify({
        inviteId: "invite-1",
        password: "password123",
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(testState.profileUpsertPayload).toMatchObject({
      id: "existing-user-1",
      email: "mixed.case@example.com",
      onboarding_completed: true,
      default_workspace_id: "workspace-1",
    })
    expect(testState.insertedMembership).toMatchObject({
      workspace_id: "workspace-1",
      profile_id: "existing-user-1",
      role: "member",
    })
    expect(testState.inviteAccepted).toBe(true)
  })

  it("returns 410 when invite is expired", async () => {
    testState.invite = {
      ...testState.invite!,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    }

    const request = new NextRequest("http://localhost/api/auth/invite-signup", {
      method: "POST",
      body: JSON.stringify({
        inviteId: "invite-1",
        password: "password123",
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(410)
    expect(body.code).toBe("INVITE_EXPIRED")
    expect(testState.signUpMock).not.toHaveBeenCalled()
    expect(testState.insertedMembership).toBeNull()
    expect(testState.inviteAccepted).toBe(false)
  })
})
