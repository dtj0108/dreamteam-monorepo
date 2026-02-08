import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

let insertedInvitePayload: Record<string, unknown> | null = null
let updatedInvitePayload: Record<string, unknown> | null = null
let existingInviteRecord: { id: string; accepted_at: string | null; expires_at: string | null } | null = null
const sendWorkspaceInviteEmail = vi.fn(async () => ({ id: "email-1" }))

const createAdminMock = () => {
  let currentTable = ""
  const filters: Record<string, unknown> = {}
  let orderedByCreatedAt = false

  const chain = {
    from: vi.fn((table: string) => {
      currentTable = table
      Object.keys(filters).forEach((key) => delete filters[key])
      orderedByCreatedAt = false
      return chain
    }),
    select: vi.fn(() => chain),
    eq: vi.fn((field: string, value: unknown) => {
      filters[field] = value
      return chain
    }),
    order: vi.fn(() => {
      orderedByCreatedAt = true
      return chain
    }),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => {
      if (currentTable === "profiles" && typeof filters.email === "string") {
        return { data: null, error: null }
      }

      if (currentTable === "workspace_members" && typeof filters.profile_id === "string") {
        return { data: null, error: null }
      }

      if (currentTable === "pending_invites" && orderedByCreatedAt) {
        return { data: existingInviteRecord, error: null }
      }

      return { data: null, error: null }
    }),
    single: vi.fn(async () => {
      if (currentTable === "workspace_members") {
        return { data: { role: "owner" }, error: null }
      }

      if (currentTable === "pending_invites") {
        const inviteId = existingInviteRecord?.id || "invite-1"
        return {
          data: {
            id: inviteId,
            email: insertedInvitePayload?.email || "member@example.com",
            role: (updatedInvitePayload?.role as string) || insertedInvitePayload?.role || "member",
            created_at: new Date().toISOString(),
            expires_at: (updatedInvitePayload?.expires_at as string) || new Date(Date.now() + 60_000).toISOString(),
            invited_by: "inviter-1",
            inviter: { id: "inviter-1", name: "Inviter" },
          },
          error: null,
        }
      }

      if (currentTable === "workspaces") {
        return { data: { name: "Workspace Alpha" }, error: null }
      }

      if (currentTable === "profiles") {
        return { data: { name: "Inviter Name" }, error: null }
      }

      return { data: null, error: null }
    }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertedInvitePayload = payload
      return chain
    }),
    update: vi.fn((payload: Record<string, unknown>) => {
      updatedInvitePayload = payload
      return chain
    }),
  }

  return chain
}

const mockAdminClient = createAdminMock()

vi.mock("@dreamteam/database/server", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}))

vi.mock("@dreamteam/auth/session", () => ({
  getSession: vi.fn(async () => ({ id: "inviter-1", email: "owner@example.com" })),
}))

vi.mock("@/emails", () => ({
  sendWorkspaceInviteEmail,
}))

import { POST } from "@/app/api/team/invites/route"

describe("POST /api/team/invites", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertedInvitePayload = null
    updatedInvitePayload = null
    existingInviteRecord = null
  })

  it("normalizes email before storing invite and sending email", async () => {
    const request = new NextRequest("http://localhost/api/team/invites", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "workspace-1",
        role: "member",
        email: "  Mixed.Case+Tag@Example.COM  ",
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(insertedInvitePayload).toMatchObject({
      workspace_id: "workspace-1",
      role: "member",
      invited_by: "inviter-1",
      email: "mixed.case+tag@example.com",
    })
    expect(sendWorkspaceInviteEmail).toHaveBeenCalledWith(
      "mixed.case+tag@example.com",
      expect.objectContaining({
        inviteId: "invite-1",
        workspaceName: "Workspace Alpha",
      })
    )
    expect(body.email).toBe("mixed.case+tag@example.com")
  })

  it("reuses a previously accepted invite record when re-inviting", async () => {
    existingInviteRecord = {
      id: "invite-accepted-1",
      accepted_at: new Date(Date.now() - 60_000).toISOString(),
      expires_at: new Date(Date.now() - 30_000).toISOString(),
    }

    const request = new NextRequest("http://localhost/api/team/invites", {
      method: "POST",
      body: JSON.stringify({
        workspaceId: "workspace-1",
        role: "admin",
        email: "member@example.com",
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(insertedInvitePayload).toBeNull()
    expect(updatedInvitePayload).toMatchObject({
      role: "admin",
      invited_by: "inviter-1",
      accepted_at: null,
    })
    expect(sendWorkspaceInviteEmail).toHaveBeenCalledWith(
      "member@example.com",
      expect.objectContaining({
        inviteId: "invite-accepted-1",
      })
    )
    expect(body.id).toBe("invite-accepted-1")
  })
})
