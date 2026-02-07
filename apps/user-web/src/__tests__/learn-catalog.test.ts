import { describe, expect, it } from "vitest"
import { getLearnHomeHref, getLearnProductFromPath, learnSections } from "@/components/learn"

describe("learn catalog", () => {
  it("contains all product sections", () => {
    const ids = learnSections.map((section) => section.id)
    expect(ids).toEqual(["finance", "sales", "team", "projects", "knowledge", "agents"])
  })

  it("returns product-aware learn home href", () => {
    expect(getLearnHomeHref("finance")).toBe("/learn")
    expect(getLearnHomeHref("learn")).toBe("/learn")
    expect(getLearnHomeHref("sales")).toBe("/learn/sales")
    expect(getLearnHomeHref("team")).toBe("/learn/team")
    expect(getLearnHomeHref("projects")).toBe("/learn/projects")
    expect(getLearnHomeHref("knowledge")).toBe("/learn/knowledge")
    expect(getLearnHomeHref("agents")).toBe("/learn/agents")
  })

  it("maps learn paths to product context", () => {
    expect(getLearnProductFromPath("/learn")).toBe("finance")
    expect(getLearnProductFromPath("/learn/accounts")).toBe("finance")
    expect(getLearnProductFromPath("/learn/projects/tasks")).toBe("projects")
    expect(getLearnProductFromPath("/learn/sales/core-workflows")).toBe("sales")
    expect(getLearnProductFromPath("/learn/team/getting-started")).toBe("team")
    expect(getLearnProductFromPath("/learn/knowledge/core-workflows")).toBe("knowledge")
    expect(getLearnProductFromPath("/learn/agents/getting-started")).toBe("agents")
    expect(getLearnProductFromPath("/projects")).toBeNull()
  })
})
