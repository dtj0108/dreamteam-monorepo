import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '../card'

describe('Card', () => {
  describe('Card component', () => {
    it('renders with correct data-slot attribute', () => {
      render(<Card>Card Content</Card>)
      const card = screen.getByText('Card Content')
      expect(card).toHaveAttribute('data-slot', 'card')
    })

    it('applies default size attribute', () => {
      render(<Card>Card Content</Card>)
      const card = screen.getByText('Card Content')
      expect(card).toHaveAttribute('data-size', 'default')
    })

    it('applies small size when specified', () => {
      render(<Card size="sm">Small Card</Card>)
      const card = screen.getByText('Small Card')
      expect(card).toHaveAttribute('data-size', 'sm')
    })

    it('applies custom className', () => {
      render(<Card className="custom-card-class">Card Content</Card>)
      const card = screen.getByText('Card Content')
      expect(card).toHaveClass('custom-card-class')
    })

    it('renders children content correctly', () => {
      render(<Card>Test Child Content</Card>)
      expect(screen.getByText('Test Child Content')).toBeInTheDocument()
    })

    it('renders with ring and background classes', () => {
      render(<Card>Card Content</Card>)
      const card = screen.getByText('Card Content')
      expect(card).toHaveClass('ring-foreground/10', 'bg-card', 'rounded-xl')
    })
  })

  describe('CardHeader component', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardHeader>Header Content</CardHeader>)
      const header = screen.getByText('Header Content')
      expect(header).toHaveAttribute('data-slot', 'card-header')
    })

    it('applies custom className', () => {
      render(<CardHeader className="custom-header">Header</CardHeader>)
      const header = screen.getByText('Header')
      expect(header).toHaveClass('custom-header')
    })

    it('renders header content correctly', () => {
      render(<CardHeader>Header Text</CardHeader>)
      expect(screen.getByText('Header Text')).toBeInTheDocument()
    })
  })

  describe('CardTitle component', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardTitle>Title Text</CardTitle>)
      const title = screen.getByText('Title Text')
      expect(title).toHaveAttribute('data-slot', 'card-title')
    })

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title</CardTitle>)
      const title = screen.getByText('Title')
      expect(title).toHaveClass('custom-title')
    })

    it('renders title with font-medium class', () => {
      render(<CardTitle>Card Title</CardTitle>)
      const title = screen.getByText('Card Title')
      expect(title).toHaveClass('font-medium')
    })

    it('renders title text correctly', () => {
      render(<CardTitle>My Card Title</CardTitle>)
      expect(screen.getByText('My Card Title')).toBeInTheDocument()
    })
  })

  describe('CardDescription component', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardDescription>Description Text</CardDescription>)
      const description = screen.getByText('Description Text')
      expect(description).toHaveAttribute('data-slot', 'card-description')
    })

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>)
      const description = screen.getByText('Description')
      expect(description).toHaveClass('custom-desc')
    })

    it('renders with text-muted-foreground class', () => {
      render(<CardDescription>Card Description</CardDescription>)
      const description = screen.getByText('Card Description')
      expect(description).toHaveClass('text-muted-foreground')
    })

    it('renders description text correctly', () => {
      render(<CardDescription>This is a description</CardDescription>)
      expect(screen.getByText('This is a description')).toBeInTheDocument()
    })
  })

  describe('CardContent component', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardContent>Content</CardContent>)
      const content = screen.getByText('Content')
      expect(content).toHaveAttribute('data-slot', 'card-content')
    })

    it('applies custom className', () => {
      render(<CardContent className="custom-content">Content</CardContent>)
      const content = screen.getByText('Content')
      expect(content).toHaveClass('custom-content')
    })

    it('renders content text correctly', () => {
      render(<CardContent>Main content area</CardContent>)
      expect(screen.getByText('Main content area')).toBeInTheDocument()
    })

    it('renders with px-6 padding class', () => {
      render(<CardContent>Content</CardContent>)
      const content = screen.getByText('Content')
      expect(content).toHaveClass('px-6')
    })
  })

  describe('CardFooter component', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardFooter>Footer Content</CardFooter>)
      const footer = screen.getByText('Footer Content')
      expect(footer).toHaveAttribute('data-slot', 'card-footer')
    })

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer">Footer</CardFooter>)
      const footer = screen.getByText('Footer')
      expect(footer).toHaveClass('custom-footer')
    })

    it('renders footer text correctly', () => {
      render(<CardFooter>Footer actions</CardFooter>)
      expect(screen.getByText('Footer actions')).toBeInTheDocument()
    })

    it('renders with flex and items-center classes', () => {
      render(<CardFooter>Footer</CardFooter>)
      const footer = screen.getByText('Footer')
      expect(footer).toHaveClass('flex', 'items-center')
    })
  })

  describe('CardAction component', () => {
    it('renders with correct data-slot attribute', () => {
      render(<CardAction>Action</CardAction>)
      const action = screen.getByText('Action')
      expect(action).toHaveAttribute('data-slot', 'card-action')
    })

    it('applies custom className', () => {
      render(<CardAction className="custom-action">Action</CardAction>)
      const action = screen.getByText('Action')
      expect(action).toHaveClass('custom-action')
    })

    it('renders action content correctly', () => {
      render(<CardAction>Click me</CardAction>)
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })
  })

  describe('Card composition', () => {
    it('renders complete card with all subcomponents', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card Description')).toBeInTheDocument()
      expect(screen.getByText('Card Content')).toBeInTheDocument()
      expect(screen.getByText('Card Footer')).toBeInTheDocument()
    })

    it('renders card with action in header', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
            <CardAction>
              <button>Action Button</button>
            </CardAction>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      )

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Action Button')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('composes card with custom data-testid', () => {
      render(
        <Card data-testid="my-card">
          <CardHeader data-testid="my-header">
            <CardTitle>Title</CardTitle>
          </CardHeader>
        </Card>
      )

      expect(screen.getByTestId('my-card')).toBeInTheDocument()
      expect(screen.getByTestId('my-header')).toBeInTheDocument()
    })

    it('forwards ref and additional props correctly', () => {
      render(
        <Card id="card-id" aria-label="Test Card">
          <CardHeader id="header-id">
            <CardTitle id="title-id">Title</CardTitle>
          </CardHeader>
        </Card>
      )

      expect(screen.getByLabelText('Test Card')).toHaveAttribute('id', 'card-id')
      expect(screen.getByText('Title')).toHaveAttribute('id', 'title-id')
    })

    it('renders nested content correctly', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>
              <span data-testid="nested-span">Nested Title</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p data-testid="nested-paragraph">Nested paragraph content</p>
          </CardContent>
        </Card>
      )

      expect(screen.getByTestId('nested-span')).toHaveTextContent('Nested Title')
      expect(screen.getByTestId('nested-paragraph')).toHaveTextContent('Nested paragraph content')
    })
  })
})
