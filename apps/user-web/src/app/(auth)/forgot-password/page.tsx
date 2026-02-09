'use client'

import { useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, EyeIcon, EyeOffIcon, Loader2, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import Logo from '@/components/shadcn-studio/logo'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

type Step = 'email' | 'otp' | 'password'

function ForgotPasswordForm() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [success, setSuccess] = useState(false)

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Email is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setMaskedPhone(data.phone || '')
      startCountdown()
      setStep('otp')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (countdown > 0) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code')
      }

      startCountdown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (otp.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setError(null)
    setStep('password')
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error?.includes('Invalid') || data.error?.includes('expired')) {
          setOtp('')
          setStep('otp')
        }
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className='z-10 w-full border-none shadow-md sm:max-w-lg'>
        <CardHeader className='gap-6'>
          <Logo className='gap-3' />
          <div>
            <CardTitle className='mb-1.5 text-2xl'>Password reset</CardTitle>
            <CardDescription className='text-base'>
              Your password has been successfully reset.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild className='w-full'>
            <Link href='/login'>Sign in with your new password</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='z-10 w-full border-none shadow-md sm:max-w-lg'>
      <CardHeader className='gap-6'>
        <Logo className='gap-3' />

        <div>
          <CardTitle className='mb-1.5 text-2xl'>
            {step === 'email' && 'Reset your password'}
            {step === 'otp' && 'Verify your phone'}
            {step === 'password' && 'Set new password'}
          </CardTitle>
          <CardDescription className='text-base'>
            {step === 'email' && 'Enter your email address and we\'ll send a verification code to the phone number on file.'}
            {step === 'otp' && `Enter the 6-digit code sent to ${maskedPhone}`}
            {step === 'password' && 'Enter your new password.'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className='mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive'>
            {error}
          </div>
        )}

        {step === 'email' && (
          <form className='space-y-4' onSubmit={handleEmailSubmit}>
            <div className='space-y-1'>
              <Label htmlFor='resetEmail' className='leading-5'>
                Email address
              </Label>
              <Input
                type='email'
                id='resetEmail'
                placeholder='Enter your email address'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <Button className='w-full' type='submit' disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Sending code...
                </>
              ) : (
                'Send verification code'
              )}
            </Button>

            <div className='text-center text-sm text-muted-foreground'>
              <Link href='/login' className='underline underline-offset-4 hover:text-primary'>
                Back to login
              </Link>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className='space-y-6'>
            <div className='flex justify-center'>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={loading}
              >
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
            </div>

            <Button type='submit' className='w-full' disabled={loading || otp.length !== 6}>
              Continue
            </Button>

            <div className='flex items-center justify-center'>
              <button
                type='button'
                onClick={handleResendCode}
                disabled={countdown > 0 || loading}
                className='text-sm text-primary hover:text-primary/80 transition-colors disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center gap-1'
              >
                <RefreshCw className='h-3 w-3' />
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
              </button>
            </div>

            <div className='text-center text-sm text-muted-foreground'>
              <Link href='/login' className='underline underline-offset-4 hover:text-primary'>
                Back to login
              </Link>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form className='space-y-4' onSubmit={handlePasswordSubmit}>
            <div className='w-full space-y-1'>
              <Label htmlFor='newPassword' className='leading-5'>
                New password
              </Label>
              <div className='relative'>
                <Input
                  id='newPassword'
                  type={isPasswordVisible ? 'text' : 'password'}
                  placeholder='Enter new password'
                  className='pr-9'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={8}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsPasswordVisible((prev) => !prev)}
                  className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
                >
                  {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  <span className='sr-only'>{isPasswordVisible ? 'Hide password' : 'Show password'}</span>
                </Button>
              </div>
              <p className='text-xs text-muted-foreground'>Must be at least 8 characters</p>
            </div>

            <div className='w-full space-y-1'>
              <Label htmlFor='confirmPassword' className='leading-5'>
                Confirm password
              </Label>
              <div className='relative'>
                <Input
                  id='confirmPassword'
                  type={isConfirmVisible ? 'text' : 'password'}
                  placeholder='Confirm new password'
                  className='pr-9'
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={8}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsConfirmVisible((prev) => !prev)}
                  className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
                >
                  {isConfirmVisible ? <EyeOffIcon /> : <EyeIcon />}
                  <span className='sr-only'>{isConfirmVisible ? 'Hide password' : 'Show password'}</span>
                </Button>
              </div>
            </div>

            <Button className='w-full' type='submit' disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Resetting password...
                </>
              ) : (
                'Reset password'
              )}
            </Button>

            <div className='text-center text-sm text-muted-foreground'>
              <Link href='/login' className='underline underline-offset-4 hover:text-primary'>
                Back to login
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <Link
        href='/login'
        className='absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
      >
        <ArrowLeft className='h-4 w-4' />
        Back to login
      </Link>

      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  )
}
