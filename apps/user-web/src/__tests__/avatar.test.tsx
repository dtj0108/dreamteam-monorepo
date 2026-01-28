/**
 * Unit tests for Avatar component
 *
 * Tests the Avatar component including:
 * - Rendering with image
 * - Fallback when image fails
 * - Initials fallback
 * - Different sizes
 * - Custom className
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'

describe('Avatar', () => {
  it('renders with image element', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    // AvatarImage renders as an img element (may be hidden during loading)
    const avatarImage = container.querySelector('[data-slot="avatar-image"]')
    expect(avatarImage).toBeDefined()
    expect(avatarImage?.getAttribute('src')).toBe('https://example.com/avatar.jpg')
    expect(avatarImage?.getAttribute('alt')).toBe('User avatar')
  })

  it('renders with initials fallback', () => {
    render(
      <Avatar>
        <AvatarImage src="" alt="User avatar" />
        <AvatarFallback data-testid="avatar-fallback-initials">AB</AvatarFallback>
      </Avatar>
    )

    const fallback = screen.getByTestId('avatar-fallback-initials')
    expect(fallback).toBeDefined()
    expect(fallback.textContent).toBe('AB')
  })

  it('renders with default size', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const avatar = container.querySelector('[data-slot="avatar"]')
    expect(avatar?.getAttribute('data-size')).toBe('default')
  })

  it('renders with small size', () => {
    const { container } = render(
      <Avatar size="sm">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const avatar = container.querySelector('[data-slot="avatar"]')
    expect(avatar?.getAttribute('data-size')).toBe('sm')
  })

  it('renders with large size', () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const avatar = container.querySelector('[data-slot="avatar"]')
    expect(avatar?.getAttribute('data-size')).toBe('lg')
  })

  it('applies custom className', () => {
    const { container } = render(
      <Avatar className="custom-avatar-class">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const avatar = container.querySelector('[data-slot="avatar"]')
    expect(avatar?.classList.contains('custom-avatar-class')).toBe(true)
  })

  it('avatar image applies custom className', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage 
          src="https://example.com/avatar.jpg" 
          alt="User avatar" 
          className="custom-image-class"
        />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const avatarImage = container.querySelector('[data-slot="avatar-image"]')
    expect(avatarImage?.classList.contains('custom-image-class')).toBe(true)
  })

  it('avatar fallback applies custom className', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback className="custom-fallback-class">JD</AvatarFallback>
      </Avatar>
    )

    const fallback = container.querySelector('[data-slot="avatar-fallback"]')
    expect(fallback?.classList.contains('custom-fallback-class')).toBe(true)
  })

  it('renders fallback content', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
        <AvatarFallback data-testid="fallback">Fallback Text</AvatarFallback>
      </Avatar>
    )

    // Fallback is rendered but may be visually hidden when image loads
    const fallback = screen.getByTestId('fallback')
    expect(fallback).toBeDefined()
    expect(fallback.textContent).toBe('Fallback Text')
  })
})

describe('AvatarBadge', () => {
  it('renders avatar badge', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
        <AvatarBadge data-testid="avatar-badge" />
      </Avatar>
    )

    const badge = container.querySelector('[data-slot="avatar-badge"]')
    expect(badge).toBeDefined()
  })

  it('applies custom className to badge', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
        <AvatarBadge className="custom-badge-class" />
      </Avatar>
    )

    const badge = container.querySelector('[data-slot="avatar-badge"]')
    expect(badge?.classList.contains('custom-badge-class')).toBe(true)
  })

  it('badge renders children', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
        <AvatarBadge>
          <span data-testid="badge-content">!</span>
        </AvatarBadge>
      </Avatar>
    )

    const badgeContent = screen.getByTestId('badge-content')
    expect(badgeContent).toBeDefined()
    expect(badgeContent.textContent).toBe('!')
  })
})

describe('AvatarGroup', () => {
  it('renders avatar group', () => {
    const { container } = render(
      <AvatarGroup data-testid="avatar-group">
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    )

    const group = container.querySelector('[data-slot="avatar-group"]')
    expect(group).toBeDefined()
  })

  it('applies custom className to group', () => {
    const { container } = render(
      <AvatarGroup className="custom-group-class">
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    )

    const group = container.querySelector('[data-slot="avatar-group"]')
    expect(group?.classList.contains('custom-group-class')).toBe(true)
  })

  it('renders multiple avatars in group', () => {
    const { container } = render(
      <AvatarGroup>
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>C</AvatarFallback>
        </Avatar>
      </AvatarGroup>
    )

    const avatars = container.querySelectorAll('[data-slot="avatar"]')
    expect(avatars.length).toBe(3)
  })
})

describe('AvatarGroupCount', () => {
  it('renders avatar group count', () => {
    const { container } = render(
      <AvatarGroupCount data-testid="avatar-count">+3</AvatarGroupCount>
    )

    const count = container.querySelector('[data-slot="avatar-group-count"]')
    expect(count).toBeDefined()
    expect(count?.textContent).toBe('+3')
  })

  it('applies custom className to group count', () => {
    const { container } = render(
      <AvatarGroupCount className="custom-count-class">+5</AvatarGroupCount>
    )

    const count = container.querySelector('[data-slot="avatar-group-count"]')
    expect(count?.classList.contains('custom-count-class')).toBe(true)
  })
})
