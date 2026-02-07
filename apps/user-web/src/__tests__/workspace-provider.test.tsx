import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react"
import { WorkspaceProvider, useWorkspace } from "@/providers/workspace-provider"

const pushMock = vi.fn()
const routerRefreshMock = vi.fn()
const mockUseUser = vi.fn()

type MockUserState = {
  user: { id: string; workspaceId?: string | null } | null
  loading: boolean
  refreshUser: () => Promise<void>
}

let mockUserState: MockUserState

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: routerRefreshMock,
  }),
}))

vi.mock("@/hooks/use-user", () => ({
  useUser: () => mockUseUser(),
}))

function Consumer() {
  const { currentWorkspace, isLoading, switchWorkspace } = useWorkspace()
  return (
    <div>
      <div data-testid="workspace-id">{currentWorkspace?.id ?? "none"}</div>
      <div data-testid="workspace-loading">{isLoading ? "true" : "false"}</div>
      <button type="button" onClick={() => void switchWorkspace("ws-2")}>
        Switch
      </button>
    </div>
  )
}

function renderWorkspaceProvider() {
  return render(
    <WorkspaceProvider>
      <Consumer />
    </WorkspaceProvider>
  )
}

function jsonResponse(payload: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  )
}

describe("WorkspaceProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUser.mockImplementation(() => mockUserState)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("refetches workspaces when auth transitions from loading/unauthenticated to authenticated", async () => {
    const refreshUserMock = vi.fn().mockResolvedValue(undefined)
    mockUserState = {
      user: null,
      loading: true,
      refreshUser: refreshUserMock,
    }

    const fetchMock = vi.fn((input: string) => {
      if (input === "/api/workspaces") {
        return jsonResponse({
          workspaces: [
            { id: "ws-1", name: "Workspace 1", slug: "ws-1", avatarUrl: null, ownerId: "u1", role: "owner" },
          ],
          currentWorkspaceId: "ws-1",
        })
      }
      throw new Error(`Unexpected fetch URL: ${input}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const { rerender } = renderWorkspaceProvider()

    expect(fetchMock).not.toHaveBeenCalled()

    mockUserState = {
      user: { id: "u1", workspaceId: null },
      loading: false,
      refreshUser: refreshUserMock,
    }

    rerender(
      <WorkspaceProvider>
        <Consumer />
      </WorkspaceProvider>
    )

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/workspaces")
    })
    await waitFor(() => {
      expect(screen.getByTestId("workspace-id")).toHaveTextContent("ws-1")
    })
    expect(refreshUserMock).toHaveBeenCalledTimes(1)
  })

  it("awaits refreshUser before routing during workspace switch", async () => {
    let resolveRefreshUser: (() => void) | null = null
    const refreshUserPromise = new Promise<void>((resolve) => {
      resolveRefreshUser = resolve
    })
    const refreshUserMock = vi.fn(() => refreshUserPromise)
    mockUserState = {
      user: { id: "u1", workspaceId: "ws-1" },
      loading: false,
      refreshUser: refreshUserMock,
    }

    const fetchMock = vi.fn((input: string) => {
      if (input === "/api/workspaces") {
        return jsonResponse({
          workspaces: [
            { id: "ws-1", name: "Workspace 1", slug: "ws-1", avatarUrl: null, ownerId: "u1", role: "owner" },
            { id: "ws-2", name: "Workspace 2", slug: "ws-2", avatarUrl: null, ownerId: "u1", role: "owner" },
          ],
          currentWorkspaceId: "ws-1",
        })
      }

      if (input === "/api/workspaces/switch") {
        return jsonResponse({ success: true })
      }

      throw new Error(`Unexpected fetch URL: ${input}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    renderWorkspaceProvider()

    await waitFor(() => {
      expect(screen.getByTestId("workspace-id")).toHaveTextContent("ws-1")
    })

    fireEvent.click(screen.getByRole("button", { name: "Switch" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/workspaces/switch",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: "ws-2" }),
        })
      )
    })

    expect(refreshUserMock).toHaveBeenCalledTimes(1)
    expect(pushMock).not.toHaveBeenCalled()

    await act(async () => {
      resolveRefreshUser?.()
      await refreshUserPromise
    })

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/")
      expect(routerRefreshMock).toHaveBeenCalledTimes(1)
    })
  })
})
