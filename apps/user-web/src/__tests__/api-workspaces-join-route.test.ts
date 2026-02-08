import { beforeEach, describe, expect, it, vi } from "vitest"

type InviteRecord = {
  id: string
  workspace_id: string
  email: string
  role: "admin" | "member"
  expires_at: string | null
}

let mockAuthUser: { id: string; email?: string | null } | null = null
let mockInvite: InviteRecord | null = null
let mockExistingMembership: { id: string } | null = null
let insertedMembership: Record<string, unknown> | null = null
let inviteAccepted = false

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
        if (!hasAcceptedAtNullFilter || filters.id !== mockInvite?.id || !mockInvite) {
          return { data: null, error: { message: "Not found" } }
        }
        return { data: mockInvite, error: null }
      }

      if (currentTable === "workspace_members") {
        if (mockExistingMembership) {
          return { data: mockExistingMembership, error: null }
        }
        return { data: null, error: { message: "Not found" } }
      }

      if (currentTable === "profiles") {
        return { data: { default_workspace_id: null }, error: null }
      }

      return { data: null, error: null }
    }),
    insert: vi.fn(async (payload: Record<string, unknown>) => {
      insertedMembership = payload
      return { data: null, error: null }
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      if (currentTable === "pending_invites" && payload.accepted_at) {
        inviteAccepted = true
      }
      return chain
    }),
    then: vi.fn((resolve: (value: { data: null; error: null }) => void) =>
      resolve({ data: null, error: null })
    ),
  }

  return chain
}

const mockAdminClient = createAdminMock()

vi.mock("@dreamteam/database/server", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockAuthUser }, error: null })),
    },
  })),
}))

import { POST } from "@/app/api/workspaces/join/route"

describe("POST /api/workspaces/join", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthUser = { id: "user-1", email: "member@example.com" }
    mockInvite = {
      id: "invite-1",
      workspace_id: "workspace-1",
      email: "member@example.com",
      role: "member",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }
    mockExistingMembership = null
    insertedMembership = null
    inviteAccepted = false
  })

  it("returns 401 for unauthenticated users", async () => {
    mockAuthUser = null

    const request = new Request("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ inviteId: "invite-1" }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe("Not authenticated")
  })

  it("returns 409 on invite-email mismatch and does not mutate membership/invite", async () => {
    mockAuthUser = { id: "user-1", email: "other@example.com" }

    const request = new Request("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ inviteId: "invite-1" }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.code).toBe("INVITE_EMAIL_MISMATCH")
    expect(insertedMembership).toBeNull()
    expect(inviteAccepted).toBe(false)
  })

  it("returns 410 when invite is expired", async () => {
    mockInvite = {
      ...mockInvite!,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    }

    const request = new Request("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ inviteId: "invite-1" }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(410)
    expect(body.code).toBe("INVITE_EXPIRED")
    expect(insertedMembership).toBeNull()
    expect(inviteAccepted).toBe(false)
  })

  it("returns already-member success when matching account is already in workspace", async () => {
    mockExistingMembership = { id: "member-row-1" }

    const request = new Request("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ inviteId: "invite-1" }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("Already a member of this workspace")
    expect(insertedMembership).toBeNull()
  })

  it("adds workspace membership for matching account", async () => {
    const request = new Request("http://localhost/api/workspaces/join", {
      method: "POST",
      body: JSON.stringify({ inviteId: "invite-1" }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe("Successfully joined workspace")
    expect(insertedMembership).toMatchObject({
      workspace_id: "workspace-1",
      profile_id: "user-1",
      role: "member",
    })
    expect(inviteAccepted).toBe(true)
  })
})
