import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogMedia,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

describe('AlertDialog', () => {
  it('renders trigger button', () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByRole('button', { name: /open alert dialog/i })).toBeInTheDocument()
  })

  it('opens alert dialog when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
  })

  it('renders title and description', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alert Title</AlertDialogTitle>
            <AlertDialogDescription>Alert Description</AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Alert Title')).toBeInTheDocument()
      expect(screen.getByText('Alert Description')).toBeInTheDocument()
    })
  })

  it('renders action and cancel buttons', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
    })
  })

  it('closes dialog when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    // Open the dialog
    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  it('closes dialog when action button is clicked', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onAction}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    // Open the dialog
    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    // Click action button
    const actionButton = screen.getByRole('button', { name: /continue/i })
    await user.click(actionButton)

    expect(onAction).toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  it('supports custom className on AlertDialogContent', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="custom-alert-class">
          <AlertDialogTitle>Test Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const content = document.querySelector('[data-slot="alert-dialog-content"]')
      expect(content).toHaveClass('custom-alert-class')
    })
  })

  it('supports custom className on AlertDialogHeader', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader className="custom-header-class">
            <AlertDialogTitle>Test Title</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const header = document.querySelector('[data-slot="alert-dialog-header"]')
      expect(header).toHaveClass('custom-header-class')
    })
  })

  it('supports custom className on AlertDialogFooter', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
          <AlertDialogFooter className="custom-footer-class">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const footer = document.querySelector('[data-slot="alert-dialog-footer"]')
      expect(footer).toHaveClass('custom-footer-class')
    })
  })

  it('supports custom className on AlertDialogTitle', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle className="custom-title-class">Test Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const title = document.querySelector('[data-slot="alert-dialog-title"]')
      expect(title).toHaveClass('custom-title-class')
    })
  })

  it('supports custom className on AlertDialogDescription', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
          <AlertDialogDescription className="custom-desc-class">Description</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const desc = document.querySelector('[data-slot="alert-dialog-description"]')
      expect(desc).toHaveClass('custom-desc-class')
    })
  })

  it('renders data-slot attribute on alert dialog elements', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Test Title</AlertDialogTitle>
            <AlertDialogDescription>Test Description</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(document.querySelector('[data-slot="alert-dialog-content"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="alert-dialog-header"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="alert-dialog-footer"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="alert-dialog-title"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="alert-dialog-description"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="alert-dialog-action"]')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="alert-dialog-cancel"]')).toBeInTheDocument()
    })
  })

  it('supports size variant on AlertDialogContent', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogTitle>Test Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const content = document.querySelector('[data-slot="alert-dialog-content"]')
      expect(content).toHaveAttribute('data-size', 'sm')
    })
  })

  it('renders AlertDialogMedia with custom content', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertCircle data-testid="alert-icon" />
            </AlertDialogMedia>
            <AlertDialogTitle>Warning</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
      expect(document.querySelector('[data-slot="alert-dialog-media"]')).toBeInTheDocument()
    })
  })

  it('supports custom className on AlertDialogMedia', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="custom-media-class">
              <AlertCircle />
            </AlertDialogMedia>
            <AlertDialogTitle>Warning</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const media = document.querySelector('[data-slot="alert-dialog-media"]')
      expect(media).toHaveClass('custom-media-class')
    })
  })

  it('supports custom variant on AlertDialogAction', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const action = document.querySelector('[data-slot="alert-dialog-action"]')
      expect(action).toBeInTheDocument()
    })
  })

  it('supports custom variant on AlertDialogCancel', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost">Dismiss</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      const cancel = document.querySelector('[data-slot="alert-dialog-cancel"]')
      expect(cancel).toBeInTheDocument()
    })
  })

  it('calls onOpenChange callback when dialog opens and closes', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <AlertDialog onOpenChange={onOpenChange}>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /open alert dialog/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(true)
    })

    // Close by clicking cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('renders with default open state when defaultOpen is true', () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogTrigger asChild>
          <Button>Open Alert Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Test Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>
    )

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('renders complex layout with all components', async () => {
    const user = userEvent.setup()
    render(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button>Delete Account</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertCircle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive">Delete Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )

    const trigger = screen.getByRole('button', { name: /delete account/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Delete Account?')).toBeInTheDocument()
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete account$/i })).toBeInTheDocument()
    })
  })
})
