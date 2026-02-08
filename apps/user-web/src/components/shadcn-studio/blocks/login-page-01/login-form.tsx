'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { EyeIcon, EyeOffIcon, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const LoginForm = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials')
      }

      // Redirect to verify page for 2FA
      const verifyUrl = `/verify?phone=${encodeURIComponent(data.phone)}&userId=${data.userId}${redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ''}`
      router.push(verifyUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className='space-y-4' onSubmit={handleSubmit}>
      {/* Error Message */}
      {error && (
        <div className='rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive'>
          {error}
        </div>
      )}

      {/* Email */}
      <div className='space-y-1'>
        <Label htmlFor='userEmail' className='leading-5'>
          Email address
        </Label>
        <Input
          type='email'
          id='userEmail'
          name='email'
          placeholder='Enter your email address'
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      {/* Password */}
      <div className='w-full space-y-1'>
        <Label htmlFor='password' className='leading-5'>
          Password
        </Label>
        <div className='relative'>
          <Input
            id='password'
            name='password'
            type={isVisible ? 'text' : 'password'}
            placeholder='Enter your password'
            className='pr-9'
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={() => setIsVisible(prevState => !prevState)}
            className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className='sr-only'>{isVisible ? 'Hide password' : 'Show password'}</span>
          </Button>
        </div>
      </div>

      {/* Remember Me and Forgot Password */}
      <div className='flex items-center justify-between gap-y-2'>
        <div className='flex items-center gap-3'>
          <Checkbox id='rememberMe' className='size-5' />
          <Label htmlFor='rememberMe' className='text-muted-foreground font-normal'>
            Remember Me
          </Label>
        </div>

        <a href='#' className='text-sm hover:underline'>
          Forgot Password?
        </a>
      </div>

      <Button className='w-full' type='submit' disabled={loading}>
        {loading ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Signing in...
          </>
        ) : (
          'Sign in to DreamTeam'
        )}
      </Button>
    </form>
  )
}

export default LoginForm
