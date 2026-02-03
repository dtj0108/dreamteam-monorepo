'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EyeIcon, EyeOffIcon, Loader2, CheckCircle2, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

import Logo from '@/components/shadcn-studio/logo'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

interface CheckoutSessionInfo {
  email: string
  name: string | null
  tier: string
  customerId: string
  subscriptionId: string
}

// Plan display names and agent counts
const PLAN_INFO: Record<string, { name: string; agents: number }> = {
  startup: { name: 'Startup', agents: 5 },
  teams: { name: 'Department Teams', agents: 18 },
  enterprise: { name: 'Enterprise', agents: 50 },
}

const DEPLOYMENT_STEPS = [
  { title: 'Creating your workspace', detail: 'Setting up your HQ' },
  { title: 'Waking up your agents', detail: 'Bringing the team online' },
  { title: 'Syncing schedules', detail: 'Preparing daily runs' },
  { title: 'Opening channels', detail: 'Creating agent rooms' },
  { title: 'Finalizing setup', detail: 'Almost there' },
]

function CompleteSignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionInfo, setSessionInfo] = useState<CheckoutSessionInfo | null>(null)
  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (!submitting) return

    setProgress(4)
    setStepIndex(0)

    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000

      const nextStep = Math.min(
        DEPLOYMENT_STEPS.length - 1,
        Math.floor(elapsed / 18)
      )
      setStepIndex(nextStep)

      const nextProgress = Math.min(96, 4 + elapsed * 1.3)
      setProgress(nextProgress)
    }, 600)

    return () => clearInterval(interval)
  }, [submitting])

  // Fetch checkout session info on mount
  useEffect(() => {
    if (!sessionId) {
      setError('No checkout session found. Please complete checkout first.')
      setLoading(false)
      return
    }

    const fetchSessionInfo = async () => {
      try {
        const url = `/api/checkout/session?session_id=${sessionId}`
        console.log('[CompleteSignup] Fetching:', url)

        const response = await fetch(url)
        console.log('[CompleteSignup] Response status:', response.status)
        console.log('[CompleteSignup] Response content-type:', response.headers.get('content-type'))

        // Check response.ok BEFORE attempting to parse JSON
        if (!response.ok) {
          // Get raw text first to see what we're actually receiving
          const rawText = await response.text()
          console.log('[CompleteSignup] Error response body (first 500 chars):', rawText.substring(0, 500))

          // Try to parse as JSON if it looks like JSON
          let errorMessage = 'Failed to load checkout session'
          if (rawText.startsWith('{')) {
            try {
              const errorData = JSON.parse(rawText)
              errorMessage = errorData.error || errorMessage
            } catch {
              // Not valid JSON
            }
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()
        console.log('[CompleteSignup] Success data:', data)
        setSessionInfo(data)
        // Pre-fill name from Stripe if available
        if (data.name) {
          setFormData((prev) => ({ ...prev, name: data.name }))
        }
      } catch (err) {
        console.error('[CompleteSignup] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load checkout session')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionInfo()
  }, [sessionId])

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
    if (formData.phone.length !== 10) return 'Phone number must be 10 digits'
    if (formData.password.length < 8) return 'Password must be at least 8 characters'
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match'
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

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: formData.name,
          phone: `+1${formData.phone}`,
          password: formData.password,
        }),
      })

      // Check response.ok BEFORE attempting to parse JSON
      if (!response.ok) {
        let errorMessage = 'Failed to complete signup'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      await response.json()

      // Redirect to phone verification
      router.push(`/verify?phone=${encodeURIComponent(`+1${formData.phone}`)}&signup=true`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete signup')
    } finally {
      setSubmitting(false)
    }
  }

  const planInfo = sessionInfo?.tier ? PLAN_INFO[sessionInfo.tier] : null

  // Loading state
  if (loading) {
    return (
      <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute">
          <AuthBackgroundShape />
        </div>
        <Card className="z-10 w-full border-none shadow-md sm:max-w-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading checkout details...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state (no session)
  if (!sessionInfo && error) {
    return (
      <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute">
          <AuthBackgroundShape />
        </div>
        <Card className="z-10 w-full border-none shadow-md sm:max-w-lg">
          <CardHeader className="gap-6">
            <Logo className="gap-3" />
            <div>
              <CardTitle className="mb-1.5 text-2xl">Something went wrong</CardTitle>
              <CardDescription className="text-base">{error}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push('/pricing')}>
              Return to pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute">
        <AuthBackgroundShape />
      </div>

      <Card className="z-10 w-full border-none shadow-md sm:max-w-lg">
        <CardHeader className="gap-6">
          <Logo className="gap-3" />

          {/* Progress indicator */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-600 font-medium">Payment complete</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium">Create account</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-muted-foreground">Get started</span>
          </div>

          <div>
            {/* Plan badge */}
            {planInfo && (
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Users className="mr-1 h-3 w-3" />
                  {planInfo.name} - {planInfo.agents} Agents
                </Badge>
              </div>
            )}
            <CardTitle className="mb-1.5 text-2xl">Complete your account</CardTitle>
            <CardDescription className="text-base">
              Just a few more details to get your AI team up and running.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {submitting ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-white to-primary/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">Deploying your team</p>
                    <p className="text-xs text-muted-foreground">
                      This can take about a minute. Please keep this tab open.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                </div>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{Math.floor(progress)}% complete</p>
              </div>

              <div className="space-y-3">
                {DEPLOYMENT_STEPS.map((step, index) => {
                  const isComplete = index < stepIndex
                  const isActive = index === stepIndex
                  return (
                    <div key={step.title} className="flex items-start gap-3">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                          isComplete
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                            : isActive
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-muted-foreground/30 text-muted-foreground'
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{step.detail}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Email (read-only) */}
              <div className="space-y-1">
                <Label className="leading-5" htmlFor="email">
                  Email address
                </Label>
                <Input
                  type="email"
                  id="email"
                  value={sessionInfo?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email from your Stripe checkout</p>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <Label className="leading-5" htmlFor="name">
                  Name*
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <Label className="leading-5" htmlFor="phone">
                  Phone number*
                </Label>
                <div className="relative">
                  <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                    +1
                  </span>
                  <Input
                    type="tel"
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={formatPhoneDisplay(formData.phone)}
                    onChange={handlePhoneChange}
                    className="pl-10"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="w-full space-y-1">
                <Label className="leading-5" htmlFor="password">
                  Password*
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={isPasswordVisible ? 'text' : 'password'}
                    placeholder="Create a password"
                    className="pr-9"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsPasswordVisible((prev) => !prev)}
                    className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
                  >
                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">Must be at least 8 characters.</p>
              </div>

              {/* Confirm Password */}
              <div className="w-full space-y-1">
                <Label className="leading-5" htmlFor="confirmPassword">
                  Confirm password*
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={isConfirmPasswordVisible ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className="pr-9"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsConfirmPasswordVisible((prev) => !prev)}
                    className="text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent"
                  >
                    {isConfirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
              </div>

              {/* Privacy policy */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="agreeToTerms"
                  className="size-5"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  disabled={submitting}
                />
                <Label htmlFor="agreeToTerms" className="cursor-pointer">
                  <span className="text-muted-foreground">I agree to</span>{' '}
                  <a href="#" className="hover:underline">
                    privacy policy & terms
                  </a>
                </Label>
              </div>

              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute">
        <AuthBackgroundShape />
      </div>
      <Card className="z-10 w-full border-none shadow-md sm:max-w-lg">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CompleteSignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CompleteSignupForm />
    </Suspense>
  )
}
