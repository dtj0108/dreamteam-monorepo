/**
 * Unit tests for Badge component
 *
 * Tests the Badge component including:
 * - Default variant rendering
 * - All variant styles (default, secondary, outline, destructive, ghost, link)
 * - Custom className
 * - Data attributes
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, badgeVariants } from '@/components/ui/badge'

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default Badge</Badge>)

    const badge = screen.getByText('Default Badge')
    expect(badge).toBeDefined()
    expect(badge.getAttribute('data-variant')).toBe('default')
    expect(badge.getAttribute('data-slot')).toBe('badge')
  })

  it('renders with default variant explicitly', () => {
    render(<Badge variant="default">Explicit Default</Badge>)

    const badge = screen.getByText('Explicit Default')
    expect(badge.getAttribute('data-variant')).toBe('default')
  })

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>)

    const badge = screen.getByText('Secondary Badge')
    expect(badge.getAttribute('data-variant')).toBe('secondary')
  })

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>)

    const badge = screen.getByText('Outline Badge')
    expect(badge.getAttribute('data-variant')).toBe('outline')
  })

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>)

    const badge = screen.getByText('Destructive Badge')
    expect(badge.getAttribute('data-variant')).toBe('destructive')
  })

  it('renders with ghost variant', () => {
    render(<Badge variant="ghost">Ghost Badge</Badge>)

    const badge = screen.getByText('Ghost Badge')
    expect(badge.getAttribute('data-variant')).toBe('ghost')
  })

  it('renders with link variant', () => {
    render(<Badge variant="link">Link Badge</Badge>)

    const badge = screen.getByText('Link Badge')
    expect(badge.getAttribute('data-variant')).toBe('link')
  })

  it('applies custom className', () => {
    render(<Badge className="custom-badge-class">Custom Styled</Badge>)

    const badge = screen.getByText('Custom Styled')
    expect(badge.classList.contains('custom-badge-class')).toBe(true)
  })

  it('renders as span by default', () => {
    render(<Badge>Span Badge</Badge>)

    const badge = screen.getByText('Span Badge')
    expect(badge.tagName.toLowerCase()).toBe('span')
  })

  it('renders as child component when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/test">Link as Badge</a>
      </Badge>
    )

    const badge = screen.getByText('Link as Badge')
    expect(badge.tagName.toLowerCase()).toBe('a')
    expect(badge.getAttribute('href')).toBe('/test')
    expect(badge.getAttribute('data-slot')).toBe('badge')
  })

  it('includes base badge classes', () => {
    render(<Badge>Styled Badge</Badge>)

    const badge = screen.getByText('Styled Badge')
    // Check for some key base classes
    expect(badge.classList.contains('inline-flex')).toBe(true)
    expect(badge.classList.contains('items-center')).toBe(true)
    expect(badge.classList.contains('justify-center')).toBe(true)
    expect(badge.classList.contains('rounded-4xl')).toBe(true)
  })
})

describe('badgeVariants', () => {
  it('generates correct classes for default variant', () => {
    const classes = badgeVariants({ variant: 'default' })
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('text-primary-foreground')
  })

  it('generates correct classes for secondary variant', () => {
    const classes = badgeVariants({ variant: 'secondary' })
    expect(classes).toContain('bg-secondary')
    expect(classes).toContain('text-secondary-foreground')
  })

  it('generates correct classes for outline variant', () => {
    const classes = badgeVariants({ variant: 'outline' })
    expect(classes).toContain('border-border')
    expect(classes).toContain('text-foreground')
  })

  it('generates correct classes for destructive variant', () => {
    const classes = badgeVariants({ variant: 'destructive' })
    expect(classes).toContain('text-destructive')
  })

  it('generates correct classes for ghost variant', () => {
    const classes = badgeVariants({ variant: 'ghost' })
    expect(classes).toContain('hover:bg-muted')
    expect(classes).toContain('hover:text-muted-foreground')
  })

  it('generates correct classes for link variant', () => {
    const classes = badgeVariants({ variant: 'link' })
    expect(classes).toContain('text-primary')
    expect(classes).toContain('underline-offset-4')
  })
})
