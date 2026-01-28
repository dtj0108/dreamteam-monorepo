import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '../alert'

describe('Alert', () => {
  it('renders with default variant', () => {
    render(<Alert>Default Alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveClass('bg-card')
    expect(alert).toHaveClass('text-card-foreground')
  })

  it('renders with destructive variant', () => {
    render(<Alert variant="destructive">Destructive Alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('text-destructive')
    expect(alert).toHaveClass('bg-card')
  })

  it('has role alert for accessibility', () => {
    render(<Alert>Accessible Alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
  })

  it('has data-slot attribute', () => {
    render(<Alert>Data Slot Alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('data-slot', 'alert')
  })

  it('AlertTitle renders correctly', () => {
    render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
      </Alert>
    )
    const title = screen.getByText('Alert Title')
    expect(title).toBeInTheDocument()
    expect(title).toHaveAttribute('data-slot', 'alert-title')
    expect(title).toHaveClass('font-medium')
  })

  it('AlertDescription renders correctly', () => {
    render(
      <Alert>
        <AlertDescription>Alert Description</AlertDescription>
      </Alert>
    )
    const description = screen.getByText('Alert Description')
    expect(description).toBeInTheDocument()
    expect(description).toHaveAttribute('data-slot', 'alert-description')
    expect(description).toHaveClass('text-muted-foreground')
  })

  it('AlertAction renders correctly', () => {
    render(
      <Alert>
        <AlertAction data-testid="alert-action">Action</AlertAction>
      </Alert>
    )
    const action = screen.getByTestId('alert-action')
    expect(action).toBeInTheDocument()
    expect(action).toHaveAttribute('data-slot', 'alert-action')
    expect(action).toHaveClass('absolute')
    expect(action).toHaveClass('top-2.5')
    expect(action).toHaveClass('right-3')
  })

  it('renders with icon support', () => {
    render(
      <Alert>
        <svg data-testid="alert-icon" />
        <AlertTitle>Title with Icon</AlertTitle>
        <AlertDescription>Description with icon</AlertDescription>
      </Alert>
    )
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    expect(screen.getByText('Title with Icon')).toBeInTheDocument()
    expect(screen.getByText('Description with icon')).toBeInTheDocument()
  })

  it('applies custom className to Alert', () => {
    render(<Alert className="custom-alert-class">Custom Alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-alert-class')
    expect(alert).toHaveClass('bg-card')
  })

  it('applies custom className to AlertTitle', () => {
    render(
      <Alert>
        <AlertTitle className="custom-title-class">Custom Title</AlertTitle>
      </Alert>
    )
    const title = screen.getByText('Custom Title')
    expect(title).toHaveClass('custom-title-class')
    expect(title).toHaveClass('font-medium')
  })

  it('applies custom className to AlertDescription', () => {
    render(
      <Alert>
        <AlertDescription className="custom-desc-class">Custom Description</AlertDescription>
      </Alert>
    )
    const description = screen.getByText('Custom Description')
    expect(description).toHaveClass('custom-desc-class')
    expect(description).toHaveClass('text-muted-foreground')
  })

  it('renders complete alert structure', () => {
    render(
      <Alert>
        <AlertTitle>Complete Alert Title</AlertTitle>
        <AlertDescription>Complete alert description text</AlertDescription>
      </Alert>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Complete Alert Title')).toBeInTheDocument()
    expect(screen.getByText('Complete alert description text')).toBeInTheDocument()
  })

  it('applies correct base styling to Alert', () => {
    render(<Alert>Base Styled Alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('grid')
    expect(alert).toHaveClass('gap-0.5')
    expect(alert).toHaveClass('rounded-lg')
    expect(alert).toHaveClass('border')
    expect(alert).toHaveClass('px-4')
    expect(alert).toHaveClass('py-3')
    expect(alert).toHaveClass('text-left')
    expect(alert).toHaveClass('text-sm')
    expect(alert).toHaveClass('w-full')
  })

  it('renders children correctly', () => {
    render(
      <Alert>
        <span data-testid="child-element">Child Content</span>
      </Alert>
    )
    expect(screen.getByTestId('child-element')).toBeInTheDocument()
  })

  it('passes through data attributes', () => {
    render(<Alert data-testid="alert-with-data">Alert with Data</Alert>)
    const alert = screen.getByTestId('alert-with-data')
    expect(alert).toBeInTheDocument()
  })
})
