import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import JoinWorkspacePage from "@/app/workspaces/join/page"

const pushMock = vi.fn()
const refreshWorkspacesMock = vi.fn(async () => {})

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "invite" ? "invite-123" : null),
  }),
}))

vi.mock("@/providers/workspace-provider", () => ({
  useWorkspace: () => ({
    refreshWorkspaces: refreshWorkspacesMock,
  }),
}))

describe("JoinWorkspacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows switch-account flow for invite email mismatch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: "INVITE_EMAIL_MISMATCH",
            error: "This invite was sent to a different email than your current signed-in account.",
            inviteEmailMasked: "m***r@example.com",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    vi.stubGlobal("fetch", fetchMock)

    render(<JoinWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByText("Switch account")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Switch account" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" })
      expect(pushMock).toHaveBeenCalledWith(
        "/login?redirectTo=%2Fworkspaces%2Fjoin%3Finvite%3Dinvite-123"
      )
    })
  })

  it("handles non-JSON invite responses without throwing a JSON parse error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html><body>Login</body></html>", {
        status: 401,
        headers: { "Content-Type": "text/html" },
      })
    )

    vi.stubGlobal("fetch", fetchMock)

    render(<JoinWorkspacePage />)

    await waitFor(() => {
      expect(
        screen.getByText(
          "Set your password to join your workspace."
        )
      ).toBeInTheDocument()
    })
  })

  it("shows create-password flow when invite requires auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    )

    vi.stubGlobal("fetch", fetchMock)

    render(<JoinWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create password and join" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Sign in instead" })).toBeInTheDocument()
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument()
    })
  })

  it("creates password and shows redirecting status before navigation", async () => {
    let resolveRefresh: (() => void) | null = null
    refreshWorkspacesMock.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveRefresh = resolve })
    )

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, workspaceId: "workspace-1" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    vi.stubGlobal("fetch", fetchMock)

    render(<JoinWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create password and join" })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "password123" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create password and join" }))

    await waitFor(() => {
      expect(screen.getAllByText("Redirecting you to your workspace...").length).toBeGreaterThan(0)
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/invite-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteId: "invite-123",
          password: "password123",
        }),
      })
      expect(pushMock).not.toHaveBeenCalled()
    })

    resolveRefresh?.()

    await waitFor(() => {
      expect(refreshWorkspacesMock).toHaveBeenCalled()
      expect(pushMock).toHaveBeenCalledWith("/")
    })
  })

  it("shows inline validation when passwords do not match", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    )

    vi.stubGlobal("fetch", fetchMock)

    render(<JoinWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create password and join" })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    })
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "password124" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create password and join" }))

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })
})
