# UI Package - Agent Guide

## Overview
shadcn/ui-based component library with 40+ components for the DreamTeam platform.

## Structure
- `button.tsx`, `card.tsx`, `input.tsx` - Core components
- `sidebar.tsx`, `data-table.tsx` - Complex composite components
- `utils.ts` - Utility functions (cn)
- `use-mobile.ts` - React hooks

## Adding Tests (Option A - Tests Only)
When adding tests:
1. Use React Testing Library + Vitest
2. Test component rendering and interactions
3. Test utility functions (cn, hooks)
4. Mock Radix UI primitives if needed
5. Do NOT modify production code

## Test Pattern
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```
