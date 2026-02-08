import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { TeamMembersCard, type TeamMember } from "@/components/team/team-members-card"

describe("TeamMembersCard", () => {
  it("handles members with null names without crashing", () => {
    const members: TeamMember[] = [
      {
        id: "member-1",
        role: "member",
        joined_at: new Date().toISOString(),
        profile: {
          id: "profile-1",
          name: null,
          email: "member@example.com",
          avatar_url: null,
        },
      },
    ]

    expect(() =>
      render(
        <TeamMembersCard
          members={members}
          currentUserId="owner-profile"
          currentUserRole="owner"
          isLoading={false}
        />
      )
    ).not.toThrow()

    expect(screen.getAllByText("member@example.com").length).toBeGreaterThan(0)
    expect(screen.getByText("?")).toBeInTheDocument()
  })
})
