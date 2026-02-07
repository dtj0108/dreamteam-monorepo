import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { AgentsProvider } from "@/providers/agents-provider"
import { TeamProvider } from "@/providers/team-provider"
import { KnowledgeProvider } from "@/providers/knowledge-provider"

const mockUseWorkspace = vi.fn()
const mockUseUser = vi.fn()
const mockUseTeamChannels = vi.fn()

const pushMock = vi.fn()
const routerRefreshMock = vi.fn()

type WorkspaceLike = { id: string } | null
let currentWorkspace: WorkspaceLike = null

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: routerRefreshMock,
  }),
}))

vi.mock("@/providers/workspace-provider", () => ({
  useWorkspace: () => mockUseWorkspace(),
}))

vi.mock("@/hooks/use-user", () => ({
  useUser: () => mockUseUser(),
}))

vi.mock("@/hooks/use-team-channels", () => ({
  useTeamChannels: (...args: unknown[]) => mockUseTeamChannels(...args),
}))

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
        on: () => ({
          subscribe: () => ({})
        }),
      }),
      subscribe: () => ({}),
    }),
    removeChannel: vi.fn(),
  }),
}))

function jsonResponse(payload: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  )
}

function collectedUrls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map(([url]) => String(url))
}

describe("Workspace-dependent providers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentWorkspace = { id: "ws-a" }

    mockUseWorkspace.mockImplementation(() => ({
      currentWorkspace,
    }))
    mockUseUser.mockImplementation(() => ({
      user: null,
    }))
    mockUseTeamChannels.mockImplementation(() => ({
      channels: [],
      isLoading: false,
      createChannel: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("AgentsProvider fetches using currentWorkspace and refetches after workspace change", async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.startsWith("/api/agents?")) {
        return jsonResponse({
          agents: [],
          departments: [],
          organization: { department_assignments: {}, position_order: [] },
        })
      }
      if (input.startsWith("/api/agents/activity/pending?")) {
        return jsonResponse({ executions: [] })
      }
      if (input.startsWith("/api/agents/schedules?")) {
        return jsonResponse({ schedules: [] })
      }
      return jsonResponse({})
    })
    vi.stubGlobal("fetch", fetchMock)

    const { rerender } = render(
      <AgentsProvider>
        <div>child</div>
      </AgentsProvider>
    )

    await waitFor(() => {
      const urls = collectedUrls(fetchMock)
      expect(urls.some((url) => url.includes("workspaceId=ws-a"))).toBe(true)
    })

    currentWorkspace = { id: "ws-b" }
    rerender(
      <AgentsProvider>
        <div>child</div>
      </AgentsProvider>
    )

    await waitFor(() => {
      const urls = collectedUrls(fetchMock)
      expect(urls.some((url) => url.includes("workspaceId=ws-b"))).toBe(true)
    })
  })

  it("TeamProvider fetches DM and agents with currentWorkspace and refetches after workspace change", async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.startsWith("/api/team/dm?")) {
        return jsonResponse([])
      }
      if (input.startsWith("/api/team/agents?")) {
        return jsonResponse([])
      }
      return jsonResponse({})
    })
    vi.stubGlobal("fetch", fetchMock)

    const { rerender } = render(
      <TeamProvider>
        <div>child</div>
      </TeamProvider>
    )

    await waitFor(() => {
      const urls = collectedUrls(fetchMock)
      expect(urls).toContain("/api/team/dm?workspaceId=ws-a")
      expect(urls).toContain("/api/team/agents?workspaceId=ws-a")
    })

    currentWorkspace = { id: "ws-b" }
    rerender(
      <TeamProvider>
        <div>child</div>
      </TeamProvider>
    )

    await waitFor(() => {
      const urls = collectedUrls(fetchMock)
      expect(urls).toContain("/api/team/dm?workspaceId=ws-b")
      expect(urls).toContain("/api/team/agents?workspaceId=ws-b")
    })
  })

  it("KnowledgeProvider fetches resources with currentWorkspace and refetches after workspace change", async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.startsWith("/api/knowledge/pages?")) {
        return jsonResponse([])
      }
      if (input.startsWith("/api/knowledge/templates?")) {
        return jsonResponse([])
      }
      if (input.startsWith("/api/knowledge/categories?")) {
        return jsonResponse([])
      }
      if (input.startsWith("/api/knowledge/whiteboards?")) {
        return jsonResponse([])
      }
      return jsonResponse({})
    })
    vi.stubGlobal("fetch", fetchMock)

    const { rerender } = render(
      <KnowledgeProvider>
        <div>child</div>
      </KnowledgeProvider>
    )

    await waitFor(() => {
      const urls = collectedUrls(fetchMock)
      expect(urls).toContain("/api/knowledge/pages?workspaceId=ws-a")
      expect(urls).toContain("/api/knowledge/templates?workspaceId=ws-a")
      expect(urls).toContain("/api/knowledge/categories?workspaceId=ws-a")
      expect(urls).toContain("/api/knowledge/whiteboards?workspaceId=ws-a")
    })

    currentWorkspace = { id: "ws-b" }
    rerender(
      <KnowledgeProvider>
        <div>child</div>
      </KnowledgeProvider>
    )

    await waitFor(() => {
      const urls = collectedUrls(fetchMock)
      expect(urls).toContain("/api/knowledge/pages?workspaceId=ws-b")
      expect(urls).toContain("/api/knowledge/templates?workspaceId=ws-b")
      expect(urls).toContain("/api/knowledge/categories?workspaceId=ws-b")
      expect(urls).toContain("/api/knowledge/whiteboards?workspaceId=ws-b")
    })
  })
})
