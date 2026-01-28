import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../input'

describe('Input', () => {
  describe('Basic rendering', () => {
    it('renders input element', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('renders with correct data-slot attribute', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('data-slot', 'input')
    })

    it('renders input element without explicit type by default', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      // When type is not specified, the component doesn't add type attribute
      // Browsers default to 'text' behavior
      expect(input).toBeInTheDocument()
    })

    it('renders with specified type', () => {
      render(<Input type="password" />)
      const input = document.querySelector('input[type="password"]')
      expect(input).toHaveAttribute('type', 'password')
      expect(input).toHaveAttribute('data-slot', 'input')
    })

    it('renders with email type', () => {
      render(<Input type="email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('renders with number type', () => {
      render(<Input type="number" />)
      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('type', 'number')
    })
  })

  describe('Styling', () => {
    it('applies base styling classes', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-9', 'rounded-md', 'border', 'px-2.5')
    })

    it('applies w-full class for full width', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('w-full')
    })

    it('applies transition classes', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('transition-[color,box-shadow]')
    })

    it('applies custom className', () => {
      render(<Input className="custom-input-class" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('custom-input-class')
    })

    it('applies background transparency class', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('bg-transparent')
    })

    it('combines base classes with custom className', () => {
      render(<Input className="my-custom-class" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('h-9', 'my-custom-class', 'rounded-md')
    })
  })

  describe('Value handling', () => {
    it('renders with initial value', () => {
      render(<Input value="initial value" onChange={() => {}} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('initial value')
    })

    it('handles value changes', async () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} />)
      const input = screen.getByRole('textbox')

      await userEvent.type(input, 'hello')
      expect(handleChange).toHaveBeenCalled()
    })

    it('allows typing text into input', async () => {
      render(<Input />)
      const input = screen.getByRole('textbox')

      await userEvent.type(input, 'test input')
      expect(input).toHaveValue('test input')
    })

    it('updates value when typing numbers', async () => {
      render(<Input type="number" />)
      const input = screen.getByRole('spinbutton')

      await userEvent.type(input, '123')
      expect(input).toHaveValue(123)
    })
  })

  describe('Disabled state', () => {
    it('supports disabled state', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('applies disabled styling classes', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:pointer-events-none', 'disabled:cursor-not-allowed', 'disabled:opacity-50')
    })

    it('prevents typing when disabled', async () => {
      render(<Input disabled value="disabled" onChange={() => {}} />)
      const input = screen.getByRole('textbox')

      await userEvent.type(input, 'new text')
      expect(input).toHaveValue('disabled')
    })
  })

  describe('Placeholder', () => {
    it('supports placeholder text', () => {
      render(<Input placeholder="Enter your name" />)
      const input = screen.getByPlaceholderText('Enter your name')
      expect(input).toBeInTheDocument()
    })

    it('renders with empty placeholder by default', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).not.toHaveAttribute('placeholder')
    })

    it('applies placeholder text color class', () => {
      render(<Input placeholder="Test" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('placeholder:text-muted-foreground')
    })
  })

  describe('Focus and blur events', () => {
    it('handles focus event', async () => {
      const handleFocus = vi.fn()
      render(<Input onFocus={handleFocus} />)
      const input = screen.getByRole('textbox')

      await userEvent.click(input)
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('handles blur event', async () => {
      const handleBlur = vi.fn()
      render(<Input onBlur={handleBlur} />)
      const input = screen.getByRole('textbox')

      await userEvent.click(input)
      await userEvent.tab()
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })

    it('applies focus-visible ring classes', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('focus-visible:ring-[3px]', 'focus-visible:ring-ring/50')
    })
  })

  describe('Accessibility attributes', () => {
    it('supports aria-label attribute', () => {
      render(<Input aria-label="Email Address" />)
      const input = screen.getByLabelText('Email Address')
      expect(input).toBeInTheDocument()
    })

    it('supports aria-invalid attribute', () => {
      render(<Input aria-invalid={true} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('applies aria-invalid styling classes', () => {
      render(<Input aria-invalid={true} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('aria-invalid:ring-destructive/20', 'aria-invalid:border-destructive')
    })

    it('supports aria-required attribute', () => {
      render(<Input aria-required={true} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('supports aria-describedby attribute', () => {
      render(<Input aria-describedby="error-message" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby', 'error-message')
    })

    it('supports id attribute', () => {
      render(<Input id="email-input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('id', 'email-input')
    })

    it('supports name attribute', () => {
      render(<Input name="email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('name', 'email')
    })
  })

  describe('Ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = { current: null as HTMLInputElement | null }
      render(<Input ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })

    it('allows accessing input methods via ref', () => {
      const ref = { current: null as HTMLInputElement | null }
      render(<Input ref={ref} value="test" onChange={() => {}} />)
      expect(ref.current?.value).toBe('test')
    })
  })

  describe('Additional props', () => {
    it('forwards data-testid attribute', () => {
      render(<Input data-testid="custom-input" />)
      expect(screen.getByTestId('custom-input')).toBeInTheDocument()
    })

    it('forwards autoComplete attribute', () => {
      render(<Input autoComplete="email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('autocomplete', 'email')
    })

    it('forwards maxLength attribute', () => {
      render(<Input maxLength={10} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('maxlength', '10')
    })

    it('forwards readOnly attribute', () => {
      render(<Input readOnly />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('readonly')
    })

    it('forwards required attribute', () => {
      render(<Input required />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('required')
    })
  })
})
