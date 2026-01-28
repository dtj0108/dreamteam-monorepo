import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')

// Mock next/headers cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn((name: string) => {
      if (name === 'fb_session') {
        return {
          value: Buffer.from(JSON.stringify({
            id: 'test-user-id',
            email: 'test@example.com'
          })).toString('base64')
        }
      }
      return undefined
    }),
    set: vi.fn(),
  })),
}))

// Mock Twilio for send-otp route tests
vi.mock('@/lib/twilio', () => ({
  sendVerificationCode: vi.fn(() => Promise.resolve({ success: true })),
  verifyCode: vi.fn(() => Promise.resolve({ success: true })),
}))
