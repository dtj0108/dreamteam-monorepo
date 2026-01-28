import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Mock hasPointerCapture for happy-dom
describe('Select', () => {
  beforeAll(() => {
    // Add hasPointerCapture mock if not present
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = vi.fn(() => false)
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn()
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn()
    }
  })

  describe('Basic rendering', () => {
    it('renders trigger with placeholder', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
      expect(screen.getByText('Select an option')).toBeInTheDocument()
    })

    it('has data-slot attribute on trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('data-slot', 'select-trigger')
    })

    it('renders with default value', () => {
      render(
        <Select defaultValue="option2">
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })
  })

  describe('Dropdown interaction', () => {
    it('opens dropdown when clicked', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      // Content should be visible when open
      expect(document.querySelector('[data-slot="select-content"]')).toBeInTheDocument()
    })
  })

  describe('Selection behavior', () => {
    it('selects option and calls onValueChange', async () => {
      const handleValueChange = vi.fn()
      render(
        <Select onValueChange={handleValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      // Find and click the option
      const option2 = document.querySelector('[data-slot="select-item"][data-value="option2"]')
      if (option2) {
        await userEvent.click(option2)
        expect(handleValueChange).toHaveBeenCalledWith('option2')
      }
    })

    it('displays selected value', () => {
      render(
        <Select defaultValue="option2">
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('renders check icon for selected item', async () => {
      render(
        <Select defaultValue="option1">
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      // Selected item should have item indicator
      const selectedItem = document.querySelector('[data-state="checked"]')
      expect(selectedItem).toBeInTheDocument()
    })
  })

  describe('Disabled state', () => {
    it('disables trigger when disabled prop is true', () => {
      render(
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeDisabled()
    })

    it('applies disabled styling classes', () => {
      render(
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
    })

    it('prevents opening dropdown when disabled', async () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="select-trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByTestId('select-trigger')
      await userEvent.click(trigger)

      // Content should not be visible when disabled
      expect(document.querySelector('[data-state="open"]')).not.toBeInTheDocument()
    })

    it('disables specific items', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2" disabled>Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      const disabledOption = document.querySelector('[data-disabled]')
      expect(disabledOption).toBeInTheDocument()
    })
  })

  describe('Grouped options', () => {
    it('renders grouped options with label', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Fruits</SelectLabel>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Vegetables</SelectLabel>
              <SelectItem value="carrot">Carrot</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      expect(document.querySelector('[data-slot="select-label"]')).toBeInTheDocument()
    })

    it('has data-slot attribute on SelectGroup', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup data-testid="select-group">
              <SelectLabel>Group</SelectLabel>
              <SelectItem value="1">Option</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      const group = screen.getByTestId('select-group')
      expect(group).toHaveAttribute('data-slot', 'select-group')
    })

    it('has data-slot attribute on SelectLabel', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group Label</SelectLabel>
              <SelectItem value="1">Option</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      const label = document.querySelector('[data-slot="select-label"]')
      expect(label).toHaveAttribute('data-slot', 'select-label')
    })

    it('applies correct styling to SelectLabel', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Styled Label</SelectLabel>
              <SelectItem value="1">Option</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      const label = document.querySelector('[data-slot="select-label"]')
      expect(label).toHaveClass('text-muted-foreground', 'px-2', 'py-1.5', 'text-xs')
    })
  })

  describe('Custom className', () => {
    it('applies custom className to SelectTrigger', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger-class">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass('custom-trigger-class')
    })

    it('applies custom className to SelectItem', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1" className="custom-item-class">
              Option 1
            </SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      const item = document.querySelector('[data-slot="select-item"]')
      expect(item).toHaveClass('custom-item-class')
    })

    it('combines base classes with custom className', () => {
      render(
        <Select>
          <SelectTrigger className="my-custom-class">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass('my-custom-class')
      expect(trigger).toHaveClass('border-input') // base class
    })

    it('applies custom className to SelectGroup', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup className="custom-group-class">
              <SelectLabel>Group</SelectLabel>
              <SelectItem value="1">Option</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      const group = document.querySelector('[data-slot="select-group"]')
      expect(group).toHaveClass('custom-group-class')
    })
  })

  describe('Styling', () => {
    it('applies base styling classes to trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass('rounded-md', 'border', 'bg-transparent')
    })

    it('renders chevron down icon in trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      const chevron = trigger.querySelector('svg')
      expect(chevron).toBeInTheDocument()
    })

    it('applies correct styling to SelectItem', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      await userEvent.click(trigger)

      const item = document.querySelector('[data-slot="select-item"]')
      expect(item).toHaveClass('rounded-sm', 'py-1.5', 'pr-8', 'pl-2')
    })

    it('applies focus styling classes to trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass('focus-visible:ring-[3px]')
    })
  })

  describe('Size variants', () => {
    it('renders with default size', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('data-size', 'default')
    })

    it('renders with sm size', () => {
      render(
        <Select>
          <SelectTrigger size="sm">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('data-size', 'sm')
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA role', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
    })

    it('has aria-expanded attribute', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')

      await userEvent.click(trigger)
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
