import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

describe('InputOTP', () => {
  describe('Basic rendering', () => {
    it('renders InputOTP component', () => {
      render(
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      )

      // The OTP input renders a hidden input for form handling
      const input = document.querySelector('input')
      expect(input).toBeInTheDocument()
    })

    it('renders correct number of slots', () => {
      render(
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      )

      const slots = document.querySelectorAll('[data-slot="input-otp-slot"]')
      expect(slots).toHaveLength(6)
    })

    it('renders with 4 slots', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      )

      const slots = document.querySelectorAll('[data-slot="input-otp-slot"]')
      expect(slots).toHaveLength(4)
    })

    it('has data-slot attribute on InputOTP', () => {
      const { container } = render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const inputOtp = container.querySelector('[data-slot="input-otp"]')
      expect(inputOtp).toBeInTheDocument()
    })

    it('has data-slot attribute on InputOTPGroup', () => {
      const { container } = render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const group = container.querySelector('[data-slot="input-otp-group"]')
      expect(group).toBeInTheDocument()
    })

    it('has data-slot attribute on InputOTPSlot', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const slot = document.querySelector('[data-slot="input-otp-slot"]')
      expect(slot).toBeInTheDocument()
    })
  })

  describe('Value handling', () => {
    it('handles value changes', async () => {
      const handleChange = vi.fn()
      render(
        <InputOTP maxLength={4} onChange={handleChange}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      if (input) {
        await userEvent.type(input, '1')
        expect(handleChange).toHaveBeenCalled()
      }
    })

    it('renders with controlled value', () => {
      render(
        <InputOTP maxLength={4} value="1234">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveValue('1234')
    })

    it('forwards ref correctly', () => {
      const ref = { current: null as HTMLInputElement | null }
      render(
        <InputOTP maxLength={4} ref={ref}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })
  })

  describe('Max length validation', () => {
    it('has maxLength attribute on input', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveAttribute('maxlength', '4')
    })

    it('respects maxLength of 6', () => {
      render(
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveAttribute('maxlength', '6')
    })
  })

  describe('Pattern validation', () => {
    it('accepts numbers only by default', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      // Default pattern should be digits only
      expect(input).toHaveAttribute('inputmode', 'numeric')
    })

    it('accepts custom pattern for alphanumeric', () => {
      render(
        <InputOTP maxLength={4} pattern="[a-zA-Z0-9]*">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveAttribute('pattern', '[a-zA-Z0-9]*')
    })
  })

  describe('Custom separator', () => {
    it('renders custom separator between groups', () => {
      render(
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      )

      const separator = document.querySelector('[data-slot="input-otp-separator"]')
      expect(separator).toBeInTheDocument()
    })

    it('has role separator on InputOTPSeparator', () => {
      render(
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={1} />
          </InputOTPGroup>
        </InputOTP>
      )

      const separator = screen.getByRole('separator')
      expect(separator).toBeInTheDocument()
    })

    it('renders minus icon in separator', () => {
      render(
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={1} />
          </InputOTPGroup>
        </InputOTP>
      )

      const separator = document.querySelector('[data-slot="input-otp-separator"]')
      const icon = separator?.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('allows custom separator content', () => {
      render(
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
          <InputOTPSeparator data-testid="custom-separator">
            <span>-</span>
          </InputOTPSeparator>
          <InputOTPGroup>
            <InputOTPSlot index={1} />
          </InputOTPGroup>
        </InputOTP>
      )

      const separator = screen.getByTestId('custom-separator')
      expect(separator).toBeInTheDocument()
    })
  })

  describe('Completed state', () => {
    it('triggers onComplete when all slots filled', async () => {
      const handleComplete = vi.fn()
      render(
        <InputOTP maxLength={4} onComplete={handleComplete}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      if (input) {
        await userEvent.type(input, '1234')
        expect(handleComplete).toHaveBeenCalledWith('1234')
      }
    })

    it('recognizes complete value', () => {
      render(
        <InputOTP maxLength={4} value="1234">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveValue('1234')
    })
  })

  describe('Disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(
        <InputOTP maxLength={4} disabled>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toBeDisabled()
    })

    it('applies disabled cursor styling', () => {
      render(
        <InputOTP maxLength={4} disabled>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveClass('disabled:cursor-not-allowed')
    })
  })

  describe('Custom className', () => {
    it('applies custom className to InputOTP', () => {
      render(
        <InputOTP maxLength={4} className="custom-otp-class">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveClass('custom-otp-class')
    })

    it('applies custom containerClassName to InputOTP container', () => {
      render(
        <InputOTP maxLength={4} containerClassName="custom-container-class">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const container = document.querySelector('.cn-input-otp')
      expect(container).toHaveClass('custom-container-class')
    })

    it('applies custom className to InputOTPGroup', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup className="custom-group-class">
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const group = document.querySelector('[data-slot="input-otp-group"]')
      expect(group).toHaveClass('custom-group-class')
    })

    it('applies custom className to InputOTPSlot', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} className="custom-slot-class" />
          </InputOTPGroup>
        </InputOTP>
      )

      const slot = document.querySelector('[data-slot="input-otp-slot"]')
      expect(slot).toHaveClass('custom-slot-class')
    })

    it('combines base classes with custom className', () => {
      render(
        <InputOTP maxLength={4} className="my-custom-class">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveClass('my-custom-class')
      expect(input).toHaveClass('disabled:cursor-not-allowed')
    })
  })

  describe('Styling', () => {
    it('applies base styling classes to slot', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const slot = document.querySelector('[data-slot="input-otp-slot"]')
      expect(slot).toHaveClass('size-9')
      expect(slot).toHaveClass('text-sm')
    })

    it('applies first and last slot styling', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      )

      const slots = document.querySelectorAll('[data-slot="input-otp-slot"]')
      expect(slots[0]).toHaveClass('first:rounded-l-md')
      expect(slots[0]).toHaveClass('first:border-l')
      expect(slots[3]).toHaveClass('last:rounded-r-md')
    })

    it('has data-active attribute on slots', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const slot = document.querySelector('[data-slot="input-otp-slot"]')
      expect(slot).toHaveAttribute('data-active')
    })

    it('applies focus ring classes to slot', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const slot = document.querySelector('[data-slot="input-otp-slot"]')
      expect(slot).toHaveClass('data-[active=true]:ring-[3px]')
    })

    it('applies transition classes to slot', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const slot = document.querySelector('[data-slot="input-otp-slot"]')
      expect(slot).toHaveClass('transition-all')
    })

    it('applies flex layout to container', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const container = document.querySelector('.cn-input-otp')
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('items-center')
    })
  })

  describe('Accessibility', () => {
    it('has correct aria attributes on input', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveAttribute('maxlength', '4')
    })

    it('supports aria-invalid attribute', () => {
      render(
        <InputOTP maxLength={4} aria-invalid={true}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('applies aria-invalid styling to group', () => {
      render(
        <InputOTP maxLength={4} aria-invalid={true}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const group = document.querySelector('[data-slot="input-otp-group"]')
      expect(group).toHaveClass('has-aria-invalid:ring-destructive/20')
    })

    it('sets spellCheck to false', () => {
      render(
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
          </InputOTPGroup>
        </InputOTP>
      )

      const input = document.querySelector('input')
      expect(input).toHaveAttribute('spellcheck', 'false')
    })
  })
})
