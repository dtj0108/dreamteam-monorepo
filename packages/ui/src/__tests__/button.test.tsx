import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button, buttonVariants } from '../button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
    expect(button).toHaveAttribute('data-slot', 'button')
    expect(button).toHaveAttribute('data-variant', 'default')
    expect(button).toHaveAttribute('data-size', 'default')
  })

  describe('variant styles', () => {
    it('renders with default variant', () => {
      render(<Button variant="default">Default</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'default')
      expect(button.className).toContain('bg-primary')
      expect(button.className).toContain('text-primary-foreground')
    })

    it('renders with outline variant', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'outline')
      expect(button.className).toContain('border-border')
      expect(button.className).toContain('bg-background')
    })

    it('renders with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'secondary')
      expect(button.className).toContain('bg-secondary')
      expect(button.className).toContain('text-secondary-foreground')
    })

    it('renders with ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'ghost')
      expect(button.className).toContain('hover:bg-muted')
    })

    it('renders with destructive variant', () => {
      render(<Button variant="destructive">Destructive</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'destructive')
      expect(button.className).toContain('bg-destructive/10')
      expect(button.className).toContain('text-destructive')
    })

    it('renders with link variant', () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'link')
      expect(button.className).toContain('text-primary')
      expect(button.className).toContain('underline-offset-4')
    })
  })

  describe('size styles', () => {
    it('renders with default size', () => {
      render(<Button size="default">Default Size</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'default')
      expect(button.className).toContain('h-9')
    })

    it('renders with xs size', () => {
      render(<Button size="xs">Extra Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'xs')
      expect(button.className).toContain('h-6')
      expect(button.className).toContain('text-xs')
    })

    it('renders with sm size', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'sm')
      expect(button.className).toContain('h-8')
    })

    it('renders with lg size', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'lg')
      expect(button.className).toContain('h-10')
    })

    it('renders with icon size', () => {
      render(<Button size="icon">Icon</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon')
      expect(button.className).toContain('size-9')
    })

    it('renders with icon-xs size', () => {
      render(<Button size="icon-xs">Icon XS</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon-xs')
      expect(button.className).toContain('size-6')
    })

    it('renders with icon-sm size', () => {
      render(<Button size="icon-sm">Icon SM</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon-sm')
      expect(button.className).toContain('size-8')
    })

    it('renders with icon-lg size', () => {
      render(<Button size="icon-lg">Icon LG</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon-lg')
      expect(button.className).toContain('size-10')
    })
  })

  describe('asChild prop', () => {
    it('renders as a Slot when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveTextContent('Link Button')
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveAttribute('data-slot', 'button')
      expect(link).toHaveAttribute('data-variant', 'default')
      expect(link.tagName.toLowerCase()).toBe('a')
    })

    it('renders as button when asChild is false', () => {
      render(<Button asChild={false}>Regular Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button.tagName.toLowerCase()).toBe('button')
    })

    it('renders as button by default when asChild is not specified', () => {
      render(<Button>Default Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button.tagName.toLowerCase()).toBe('button')
    })
  })

  describe('className merging', () => {
    it('merges custom className with default classes', () => {
      render(<Button className="custom-class">Custom Class</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
      expect(button.className).toContain('bg-primary')
    })

    it('allows multiple custom classes', () => {
      render(<Button className="class-one class-two">Multiple Classes</Button>)
      const button = screen.getByRole('button')
      expect(button.className).toContain('class-one')
      expect(button.className).toContain('class-two')
    })
  })

  describe('disabled state', () => {
    it('renders as disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('does not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(<Button disabled onClick={handleClick}>Disabled Button</Button>)
      const button = screen.getByRole('button')
      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('renders as enabled when disabled prop is false', () => {
      render(<Button disabled={false}>Enabled Button</Button>)
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })
  })

  describe('click events', () => {
    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click Me</Button>)
      const button = screen.getByRole('button')
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick handler multiple times when clicked multiple times', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click Me</Button>)
      const button = screen.getByRole('button')
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(3)
    })

    it('passes click event to handler', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click Me</Button>)
      const button = screen.getByRole('button')
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledWith(expect.any(Object))
    })
  })

  describe('data attributes', () => {
    it('has data-slot attribute set to "button"', () => {
      render(<Button>Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-slot', 'button')
    })

    it('has data-variant attribute matching the variant prop', () => {
      render(<Button variant="outline">Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'outline')
    })

    it('has data-size attribute matching the size prop', () => {
      render(<Button size="lg">Test</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'lg')
    })

    it('preserves data attributes when using asChild', () => {
      render(
        <Button asChild variant="secondary" size="sm">
          <span>Child Element</span>
        </Button>
      )
      const span = screen.getByText('Child Element')
      expect(span).toHaveAttribute('data-slot', 'button')
      expect(span).toHaveAttribute('data-variant', 'secondary')
      expect(span).toHaveAttribute('data-size', 'sm')
    })
  })

  describe('buttonVariants function', () => {
    it('returns classes for default variant and size', () => {
      const classes = buttonVariants({})
      expect(classes).toContain('bg-primary')
      expect(classes).toContain('h-9')
    })

    it('returns classes for specific variant', () => {
      const classes = buttonVariants({ variant: 'ghost' })
      expect(classes).toContain('hover:bg-muted')
    })

    it('returns classes for specific size', () => {
      const classes = buttonVariants({ size: 'lg' })
      expect(classes).toContain('h-10')
    })

    it('returns classes for combined variant and size', () => {
      const classes = buttonVariants({ variant: 'outline', size: 'sm' })
      expect(classes).toContain('border-border')
      expect(classes).toContain('h-8')
    })

    it('accepts custom className', () => {
      const classes = buttonVariants({ className: 'my-custom-class' })
      expect(classes).toContain('my-custom-class')
    })
  })
})
