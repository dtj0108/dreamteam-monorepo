import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, badgeVariants } from '../badge'

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-variant', 'default')
    expect(badge).toHaveClass('bg-primary')
    expect(badge).toHaveClass('text-primary-foreground')
  })

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Secondary Badge</Badge>)
    const badge = screen.getByText('Secondary Badge')
    expect(badge).toHaveAttribute('data-variant', 'secondary')
    expect(badge).toHaveClass('bg-secondary')
    expect(badge).toHaveClass('text-secondary-foreground')
  })

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Destructive Badge</Badge>)
    const badge = screen.getByText('Destructive Badge')
    expect(badge).toHaveAttribute('data-variant', 'destructive')
    expect(badge).toHaveClass('text-destructive')
    expect(badge).toHaveClass('bg-destructive/10')
  })

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline Badge</Badge>)
    const badge = screen.getByText('Outline Badge')
    expect(badge).toHaveAttribute('data-variant', 'outline')
    expect(badge).toHaveClass('border-border')
    expect(badge).toHaveClass('text-foreground')
  })

  it('renders with ghost variant', () => {
    render(<Badge variant="ghost">Ghost Badge</Badge>)
    const badge = screen.getByText('Ghost Badge')
    expect(badge).toHaveAttribute('data-variant', 'ghost')
    expect(badge).toHaveClass('hover:bg-muted')
    expect(badge).toHaveClass('hover:text-muted-foreground')
  })

  it('renders with link variant', () => {
    render(<Badge variant="link">Link Badge</Badge>)
    const badge = screen.getByText('Link Badge')
    expect(badge).toHaveAttribute('data-variant', 'link')
    expect(badge).toHaveClass('text-primary')
    expect(badge).toHaveClass('underline-offset-4')
  })

  it('children render correctly', () => {
    render(<Badge>Badge Content</Badge>)
    expect(screen.getByText('Badge Content')).toBeInTheDocument()
  })

  it('renders with icon as child', () => {
    render(
      <Badge>
        <svg data-testid="badge-icon" />
        With Icon
      </Badge>
    )
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument()
    expect(screen.getByText('With Icon')).toBeInTheDocument()
  })

  it('custom className is applied', () => {
    render(<Badge className="my-custom-class">Custom Badge</Badge>)
    const badge = screen.getByText('Custom Badge')
    expect(badge).toHaveClass('my-custom-class')
    expect(badge).toHaveClass('bg-primary')
  })

  it('has data-slot attribute', () => {
    render(<Badge>Data Slot Badge</Badge>)
    const badge = screen.getByText('Data Slot Badge')
    expect(badge).toHaveAttribute('data-slot', 'badge')
  })

  it('renders as span by default', () => {
    render(<Badge>Span Badge</Badge>)
    const badge = screen.getByText('Span Badge')
    expect(badge.tagName).toBe('SPAN')
  })

  it('renders with asChild as different element', () => {
    render(
      <Badge asChild>
        <a href="/test">Link Badge</a>
      </Badge>
    )
    const badge = screen.getByText('Link Badge')
    expect(badge.tagName).toBe('A')
    expect(badge).toHaveAttribute('href', '/test')
  })

  it('applies correct base styling', () => {
    render(<Badge>Base Styled Badge</Badge>)
    const badge = screen.getByText('Base Styled Badge')
    expect(badge).toHaveClass('h-5')
    expect(badge).toHaveClass('rounded-4xl')
    expect(badge).toHaveClass('text-xs')
    expect(badge).toHaveClass('font-medium')
    expect(badge).toHaveClass('inline-flex')
    expect(badge).toHaveClass('items-center')
    expect(badge).toHaveClass('justify-center')
  })

  it('badgeVariants function returns correct classes for default variant', () => {
    const classes = badgeVariants({ variant: 'default' })
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('text-primary-foreground')
  })

  it('badgeVariants function returns correct classes for destructive variant', () => {
    const classes = badgeVariants({ variant: 'destructive' })
    expect(classes).toContain('text-destructive')
    expect(classes).toContain('bg-destructive/10')
  })
})
