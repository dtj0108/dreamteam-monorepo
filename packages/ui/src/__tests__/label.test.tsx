import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '../label'

describe('Label', () => {
  it('renders label element', () => {
    render(<Label>Test Label</Label>)
    const label = screen.getByText('Test Label')
    expect(label).toBeInTheDocument()
    expect(label.tagName).toBe('LABEL')
  })

  it('associates with input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="test-input">Test Label</Label>
        <input id="test-input" type="text" />
      </>
    )
    const label = screen.getByText('Test Label')
    expect(label).toHaveAttribute('for', 'test-input')
  })

  it('applies correct default styling', () => {
    render(<Label>Styled Label</Label>)
    const label = screen.getByText('Styled Label')
    expect(label).toHaveClass('text-sm')
    expect(label).toHaveClass('font-medium')
    expect(label).toHaveClass('flex')
    expect(label).toHaveClass('items-center')
    expect(label).toHaveClass('select-none')
  })

  it('applies custom className', () => {
    render(<Label className="custom-class">Custom Label</Label>)
    const label = screen.getByText('Custom Label')
    expect(label).toHaveClass('custom-class')
    expect(label).toHaveClass('text-sm')
  })

  it('has data-slot attribute', () => {
    render(<Label>Data Slot Label</Label>)
    const label = screen.getByText('Data Slot Label')
    expect(label).toHaveAttribute('data-slot', 'label')
  })

  it('renders with disabled state styling via aria-disabled', () => {
    render(
      <div aria-disabled="true">
        <Label>Disabled Label</Label>
      </div>
    )
    const label = screen.getByText('Disabled Label')
    expect(label).toBeInTheDocument()
  })

  it('passes through additional props', () => {
    render(<Label data-testid="custom-label">Props Label</Label>)
    const label = screen.getByTestId('custom-label')
    expect(label).toBeInTheDocument()
    expect(label).toHaveTextContent('Props Label')
  })

  it('renders children correctly', () => {
    render(
      <Label>
        <span data-testid="child-span">Child Content</span>
      </Label>
    )
    expect(screen.getByTestId('child-span')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('applies gap-2 class for spacing', () => {
    render(<Label>Spaced Label</Label>)
    const label = screen.getByText('Spaced Label')
    expect(label).toHaveClass('gap-2')
  })

  it('has leading-none for line height', () => {
    render(<Label>Leading Label</Label>)
    const label = screen.getByText('Leading Label')
    expect(label).toHaveClass('leading-none')
  })
})
