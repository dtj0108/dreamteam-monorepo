import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../use-mobile'

describe('useIsMobile hook', () => {
  // Store original window properties
  const originalInnerWidth = window.innerWidth
  const originalMatchMedia = window.matchMedia

  // Mock for matchMedia
  let matchMediaListeners: Array<(e: MediaQueryListEvent) => void> = []

  const createMockMatchMedia = (matches: boolean) => {
    return (query: string): MediaQueryList => {
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn((event: string, callback: EventListener) => {
          if (event === 'change') {
            matchMediaListeners.push(callback as (e: MediaQueryListEvent) => void)
          }
        }),
        removeEventListener: vi.fn((event: string, callback: EventListener) => {
          if (event === 'change') {
            matchMediaListeners = matchMediaListeners.filter(cb => cb !== callback)
          }
        }),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList
    }
  }

  beforeEach(() => {
    matchMediaListeners = []
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore window.innerWidth if window is defined
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      })
      window.matchMedia = originalMatchMedia
    }
  })

  it('returns correct initial state for mobile viewport', () => {
    // Mobile viewport (less than 768px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })
    window.matchMedia = createMockMatchMedia(true)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('returns correct initial state for desktop viewport', () => {
    // Desktop viewport (768px or more)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('updates state on resize to mobile', () => {
    // Start with desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    // Trigger the change event
    act(() => {
      matchMediaListeners.forEach(listener => {
        listener({ matches: true } as MediaQueryListEvent)
      })
    })

    expect(result.current).toBe(true)
  })

  it('updates state on resize to desktop', () => {
    // Start with mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })
    window.matchMedia = createMockMatchMedia(true)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)

    // Simulate resize to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })

    // Trigger the change event
    act(() => {
      matchMediaListeners.forEach(listener => {
        listener({ matches: false } as MediaQueryListEvent)
      })
    })

    expect(result.current).toBe(false)
  })

  it('handles edge case at exactly 768px breakpoint', () => {
    // Exactly at breakpoint (768px should be non-mobile based on implementation)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    })
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    // At exactly 768px, innerWidth < MOBILE_BREAKPOINT is false
    expect(result.current).toBe(false)
  })

  it('cleans up event listener on unmount', () => {
    window.matchMedia = createMockMatchMedia(false)

    const { unmount } = renderHook(() => useIsMobile())

    // Unmount should trigger cleanup
    unmount()

    // After cleanup, the listener array should be empty (or have one less)
    expect(matchMediaListeners.length).toBe(0)
  })

  it('handles rapid resize events', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    // Simulate multiple rapid resizes
    act(() => {
      // Mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      matchMediaListeners.forEach(listener => {
        listener({ matches: true } as MediaQueryListEvent)
      })
    })

    expect(result.current).toBe(true)

    act(() => {
      // Desktop again
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })
      matchMediaListeners.forEach(listener => {
        listener({ matches: false } as MediaQueryListEvent)
      })
    })

    expect(result.current).toBe(false)
  })

  it('converts undefined state to false (SSR compatibility)', () => {
    // In SSR, the initial undefined state should be converted to false via !!
    // We test this by verifying the hook never returns undefined
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    // The hook should always return a boolean, never undefined
    // This is because the return statement uses !!isMobile
    expect(result.current).not.toBeUndefined()
    expect(typeof result.current).toBe('boolean')
    expect(result.current).toBe(false)
  })

  it('handles transition from undefined to defined state', () => {
    // Simulate initial state where useState is undefined (before useEffect runs)
    // After useEffect runs, it should be defined
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    // After initial render, should be defined (not undefined)
    expect(result.current).toBeDefined()
    expect(typeof result.current).toBe('boolean')
  })

  it('correctly handles boundary value of 767px', () => {
    // 767px is the maximum mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767,
    })
    window.matchMedia = createMockMatchMedia(true)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('correctly handles boundary value of 769px', () => {
    // 769px is clearly desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 769,
    })
    window.matchMedia = createMockMatchMedia(false)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })
})
