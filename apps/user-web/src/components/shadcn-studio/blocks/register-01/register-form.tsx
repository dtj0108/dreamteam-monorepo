'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { EyeIcon, EyeOffIcon, Loader2, Users, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LEGAL_PRIVACY_URL, LEGAL_TERMS_URL } from '@/lib/legal-links'

type InviteCheckState = 'idle' | 'checking' | 'found' | 'not-found'

interface InviteInfo {
  workspaceName: string
  role: string
}

interface RegisterFormProps {
  sessionId?: string
  redirectTo?: string | null
}

const RegisterForm = ({ sessionId, redirectTo }: RegisterFormProps) => {
  const router = useRouter()
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Invite check state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteCheckState, setInviteCheckState] = useState<InviteCheckState>('idle')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })

  // Format phone number as user types
  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData({ ...formData, phone: digits })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Name is required'
    if (!formData.email.trim()) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format'
    if (formData.phone.length !== 10) return 'Phone number must be 10 digits'
    if (formData.password.length < 8) return 'Password must be at least 8 characters'
    if (!agreedToTerms) return 'You must agree to the privacy policy & terms'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: `+1${formData.phone}`,
          password: formData.password,
          sessionId, // Include Stripe session ID for post-checkout linking
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Redirect to verify page for phone OTP
      const verifyParams = new URLSearchParams({
        phone: `+1${formData.phone}`,
        signup: 'true',
      })
      if (redirectTo) verifyParams.set('redirectTo', redirectTo)
      router.push(`/verify?${verifyParams.toString()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  // Check if email has pending invite
  const checkForInvite = async () => {
    if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      return
    }

    setInviteCheckState('checking')

    try {
      const response = await fetch('/api/team/invites/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })

      const data = await response.json()

      if (data.hasInvite) {
        setInviteInfo({
          workspaceName: data.workspaceName,
          role: data.role,
        })
        setInviteCheckState('found')
      } else {
        setInviteCheckState('not-found')
      }
    } catch {
      setInviteCheckState('not-found')
    }
  }

  // Proceed to signup with pre-filled email
  const proceedWithInvite = () => {
    setFormData({ ...formData, email: inviteEmail })
    setShowInviteModal(false)
    setInviteCheckState('idle')
  }

  // Reset invite modal state
  const resetInviteModal = () => {
    setInviteCheckState('idle')
    setInviteEmail('')
    setInviteInfo(null)
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner'
      case 'admin':
        return 'Admin'
      default:
        return 'Team Member'
    }
  }

  return (
    <>
      <form className='space-y-4' onSubmit={handleSubmit}>
        {/* Error Message */}
        {error && (
          <div className='rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive'>
            {error}
          </div>
        )}

        {/* Name */}
        <div className='space-y-1'>
          <Label className='leading-5' htmlFor='name'>
            Name*
          </Label>
          <Input
            type='text'
            id='name'
            name='name'
            placeholder='Enter your name'
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        {/* Email */}
        <div className='space-y-1'>
          <Label className='leading-5' htmlFor='email'>
            Email address*
          </Label>
          <Input
            type='email'
            id='email'
            name='email'
            placeholder='Enter your email address'
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        {/* Phone */}
        <div className='space-y-1'>
          <Label className='leading-5' htmlFor='phone'>
            Phone number*
          </Label>
          <div className='relative'>
            <span className='text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm'>+1</span>
            <Input
              type='tel'
              id='phone'
              placeholder='(555) 123-4567'
              value={formatPhoneDisplay(formData.phone)}
              onChange={handlePhoneChange}
              className='pl-10'
              disabled={loading}
            />
          </div>
        </div>

        {/* Password */}
        <div className='w-full space-y-1'>
          <Label className='leading-5' htmlFor='password'>
            Password*
          </Label>
          <div className='relative'>
            <Input
              id='password'
              name='password'
              type={isPasswordVisible ? 'text' : 'password'}
              placeholder='••••••••••••••••'
              className='pr-9'
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => setIsPasswordVisible((prevState) => !prevState)}
              className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
            >
              {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              <span className='sr-only'>{isPasswordVisible ? 'Hide password' : 'Show password'}</span>
            </Button>
          </div>
          <p className='text-muted-foreground text-sm'>Must be at least 8 characters.</p>
        </div>

        {/* Privacy policy */}
        <div className='flex items-center gap-3'>
          <Checkbox
            id='agreeToTerms'
            className='size-5'
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            disabled={loading}
          />
          <Label htmlFor='agreeToTerms' className='cursor-pointer'>
            <span className='text-muted-foreground'>I agree to the </span>
            <a
              href={LEGAL_TERMS_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='hover:underline'
              onClick={(event) => event.stopPropagation()}
            >
              Terms of Service
            </a>
            <span className='text-muted-foreground'> and </span>
            <a
              href={LEGAL_PRIVACY_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='hover:underline'
              onClick={(event) => event.stopPropagation()}
            >
              Privacy Policy
            </a>
          </Label>
        </div>

        <Button className='w-full' type='submit' disabled={loading}>
          {loading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Creating account...
            </>
          ) : (
            'Get started'
          )}
        </Button>

        {/* Were you invited? */}
        <button
          type='button'
          onClick={() => setShowInviteModal(true)}
          className='border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors'
        >
          <Users className='h-4 w-4' />
          Were you invited to a team?
        </button>
      </form>

      {/* Invite Check Modal */}
      <Dialog
        open={showInviteModal}
        onOpenChange={(open) => {
          setShowInviteModal(open)
          if (!open) resetInviteModal()
        }}
      >
        <DialogContent className='sm:max-w-md'>
          {inviteCheckState === 'idle' && (
            <>
              <DialogHeader>
                <DialogTitle>Check for team invite</DialogTitle>
                <DialogDescription>Enter your email to see if you&apos;ve been invited to join a team.</DialogDescription>
              </DialogHeader>
              <div className='flex flex-col gap-4 pt-4'>
                <Input
                  type='email'
                  placeholder='Enter your email'
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className='h-11'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      checkForInvite()
                    }
                  }}
                />
                <Button
                  type='button'
                  className='w-full'
                  onClick={checkForInvite}
                  disabled={!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)}
                >
                  Check for invite
                </Button>
              </div>
            </>
          )}

          {inviteCheckState === 'checking' && (
            <div className='flex flex-col items-center justify-center gap-4 py-8'>
              <Loader2 className='text-primary h-8 w-8 animate-spin' />
              <p className='text-muted-foreground text-sm'>Checking for invites...</p>
            </div>
          )}

          {inviteCheckState === 'found' && inviteInfo && (
            <>
              <DialogHeader>
                <div className='mb-4 flex justify-center'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100'>
                    <CheckCircle2 className='h-6 w-6 text-emerald-600' />
                  </div>
                </div>
                <DialogTitle className='text-center'>You&apos;ve been invited!</DialogTitle>
                <DialogDescription className='text-center'>
                  You&apos;ve been invited to join <strong>{inviteInfo.workspaceName}</strong> as a{' '}
                  <strong>{roleLabel(inviteInfo.role)}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className='flex flex-col gap-3 pt-4'>
                <Button type='button' className='w-full' onClick={proceedWithInvite}>
                  Join {inviteInfo.workspaceName}
                </Button>
                <button
                  type='button'
                  onClick={resetInviteModal}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  <ArrowLeft className='mr-1 inline h-3 w-3' />
                  Try a different email
                </button>
              </div>
            </>
          )}

          {inviteCheckState === 'not-found' && (
            <>
              <DialogHeader>
                <div className='mb-4 flex justify-center'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-full bg-amber-100'>
                    <XCircle className='h-6 w-6 text-amber-600' />
                  </div>
                </div>
                <DialogTitle className='text-center'>No invite found</DialogTitle>
                <DialogDescription className='text-center'>
                  We couldn&apos;t find a pending invite for <strong>{inviteEmail}</strong>. You can still sign up and
                  create your own workspace.
                </DialogDescription>
              </DialogHeader>
              <div className='flex flex-col gap-3 pt-4'>
                <Button
                  type='button'
                  className='w-full'
                  onClick={() => {
                    setFormData({ ...formData, email: inviteEmail })
                    setShowInviteModal(false)
                    resetInviteModal()
                  }}
                >
                  Sign up anyway
                </Button>
                <button
                  type='button'
                  onClick={resetInviteModal}
                  className='text-muted-foreground hover:text-foreground text-sm transition-colors'
                >
                  <ArrowLeft className='mr-1 inline h-3 w-3' />
                  Try a different email
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RegisterForm
