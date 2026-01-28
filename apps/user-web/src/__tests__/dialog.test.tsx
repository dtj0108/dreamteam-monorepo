import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

describe('Dialog', () => {
  it('renders trigger button', () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByRole('button', { name: /open dialog/i })).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('closes dialog when overlay is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    // Open the dialog
    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click the overlay (the backdrop behind the dialog)
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    if (overlay) {
      await user.click(overlay)
    }

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('renders title and description', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog Description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Dialog Title')).toBeInTheDocument()
      expect(screen.getByText('Dialog Description')).toBeInTheDocument()
    })
  })

  it('renders custom content', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Title</DialogTitle>
          </DialogHeader>
          <div data-testid="custom-content">Custom Content</div>
          <DialogFooter>
            <Button>Custom Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /custom action/i })).toBeInTheDocument()
    })
  })

  it('closes dialog when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    // Open the dialog
    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click the close button (X icon)
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('supports custom className on DialogContent', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent className="custom-dialog-class">
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const content = document.querySelector('[data-slot="dialog-content"]')
      expect(content).toHaveClass('custom-dialog-class')
    })
  })

  it('supports custom className on DialogHeader', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader className="custom-header-class">
            <DialogTitle>Test Title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const header = document.querySelector('[data-slot="dialog-header"]')
      expect(header).toHaveClass('custom-header-class')
    })
  })

  it('supports custom className on DialogFooter', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogFooter className="custom-footer-class">
            <Button>Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const footer = document.querySelector('[data-slot="dialog-footer"]')
      expect(footer).toHaveClass('custom-footer-class')
    })
  })

  it('supports custom className on DialogTitle', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="custom-title-class">Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const title = document.querySelector('[data-slot="dialog-title"]')
      expect(title).toHaveClass('custom-title-class')
    })
  })

  it('supports custom className on DialogDescription', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription className="custom-desc-class">Description</DialogDescription>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const desc = document.querySelector('[data-slot="dialog-description"]')
      expect(desc).toHaveClass('custom-desc-class')
    })
  })

  it('renders data-slot attribute on dialog elements', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Title</DialogTitle>
            <DialogDescription>Test Description</DialogDescription>
          </DialogHeader>
          <DialogFooter />
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="dialog-header"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="dialog-footer"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="dialog-title"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="dialog-description"]')).toBeInTheDocument()
    })
  })

  it('hides close button when showCloseButton is false', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Close button should not be present
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
  })

  it('calls onOpenChange callback when dialog opens and closes', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Dialog onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(true)
    })

    // Close by clicking overlay
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    if (overlay) {
      await user.click(overlay)
    }

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('renders DialogClose component', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogClose asChild>
            <Button>Custom Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /custom close/i })).toBeInTheDocument()
    })
  })

  it('closes dialog when DialogClose button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogClose asChild>
            <Button>Custom Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )

    // Open the dialog
    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click custom close button
    const closeButton = screen.getByRole('button', { name: /custom close/i })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('renders with default open state when defaultOpen is true', () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders showCloseButton in DialogFooter when specified', async () => {
    const user = userEvent.setup()
    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogFooter showCloseButton>
            <Button>Action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
    })
  })
})
