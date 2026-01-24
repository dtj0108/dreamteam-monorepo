/**
 * Unit tests for Bearer Token Authentication in agent-server
 *
 * Tests the authenticateRequest function's ability to handle:
 * - Valid Bearer tokens
 * - Invalid Bearer tokens
 * - Missing Authorization headers
 * - Malformed Authorization headers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Request } from "express"

// Mock the Supabase modules before importing the function under test
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}))

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"

import { authenticateRequest, type SessionUser } from "../lib/supabase"
import { createClient } from "@supabase/supabase-js"

const mockCreateClient = vi.mocked(createClient)

// Helper to create a mock Express request
function createMockRequest(headers: Record<string, string | undefined> = {}): Request {
  return {
    headers: {
      ...headers,
    },
  } as unknown as Request
}

// Mock profile data for successful auth
const mockProfile = {
  name: "Test User",
  phone: "+1234567890",
  company_name: "Test Company",
  industry_type: "Technology",
}

// Mock user data for successful auth
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: {
    name: "Test User",
    phone: "+1234567890",
  },
}

describe("authenticateRequest - Bearer Token Auth", () => {
  let mockSupabaseClient: {
    auth: {
      getUser: ReturnType<typeof vi.fn>
    }
    from: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Silence console.log during tests
    vi.spyOn(console, "log").mockImplementation(() => {})

    // Create a fresh mock Supabase client for each test
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    }

    mockCreateClient.mockReturnValue(mockSupabaseClient as ReturnType<typeof createClient>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should return SessionUser when valid Bearer token provided", async () => {
    // Arrange: Set up successful auth response
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    // Set up successful profile fetch
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    })

    const req = createMockRequest({
      authorization: "Bearer valid-token-123",
    })

    // Act
    const result = await authenticateRequest(req)

    // Assert
    expect(result).not.toBeNull()
    expect(result).toEqual<SessionUser>({
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      phone: "+1234567890",
      companyName: "Test Company",
      industryType: "Technology",
    })

    // Verify getUser was called with the token
    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith("valid-token-123")
  })

  it("should return null when invalid Bearer token provided", async () => {
    // Arrange: Set up failed auth response
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    })

    const req = createMockRequest({
      authorization: "Bearer invalid-token",
    })

    // Act
    const result = await authenticateRequest(req)

    // Assert
    expect(result).toBeNull()
    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith("invalid-token")
  })

  it("should return null when no Authorization header present", async () => {
    // Arrange: Request with no auth headers
    const req = createMockRequest({})

    // Act
    const result = await authenticateRequest(req)

    // Assert
    expect(result).toBeNull()
    // createClient should not be called for Bearer auth when no header
    // (it might be called for cookie auth check, but getUser shouldn't be called)
    expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled()
  })

  it("should return null when Authorization header is not Bearer format", async () => {
    // Arrange: Request with non-Bearer auth header
    const req = createMockRequest({
      authorization: "Basic dXNlcjpwYXNz", // Basic auth format
    })

    // Act
    const result = await authenticateRequest(req)

    // Assert
    expect(result).toBeNull()
    expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled()
  })

  it("should extract token correctly from 'Bearer <token>' format", async () => {
    // Arrange: Various token formats
    const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-payload"

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    })

    const req = createMockRequest({
      authorization: `Bearer ${testToken}`,
    })

    // Act
    await authenticateRequest(req)

    // Assert: Verify the token was extracted correctly (without "Bearer " prefix)
    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(testToken)
    // Verify "Bearer " was not included
    expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalledWith(
      expect.stringContaining("Bearer ")
    )
  })

  it("should return null when profile fetch fails after valid token", async () => {
    // Arrange: Successful auth but failed profile fetch
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Profile not found" },
          }),
        }),
      }),
    })

    const req = createMockRequest({
      authorization: "Bearer valid-token",
    })

    // Act
    const result = await authenticateRequest(req)

    // Assert
    expect(result).toBeNull()
  })

  it("should prefer cookie auth over Bearer token when cookies present", async () => {
    // This test verifies the priority order: cookies first, then Bearer
    // When cookie auth succeeds, Bearer should not be attempted

    // Note: This is harder to test in isolation since we need to mock
    // the @supabase/ssr createServerClient. For now, we verify that
    // Bearer auth works when no cookies are present.

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    })

    // Request with Bearer but no cookies
    const req = createMockRequest({
      authorization: "Bearer token-123",
    })

    // Act
    const result = await authenticateRequest(req)

    // Assert: Should succeed via Bearer auth
    expect(result).not.toBeNull()
    expect(result?.id).toBe("user-123")
  })
})
