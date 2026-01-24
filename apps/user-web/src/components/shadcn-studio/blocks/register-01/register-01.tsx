import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'

import Logo from '@/components/shadcn-studio/logo'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'
import RegisterForm from '@/components/shadcn-studio/blocks/register-01/register-form'

interface RegisterProps {
  sessionId?: string
  plan?: string
}

const Register = ({ sessionId, plan }: RegisterProps) => {
  const isPostCheckout = !!sessionId
  const planLabel = plan === 'annual' ? 'Pro Annual' : 'Pro Monthly'

  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-10 w-full border-none shadow-md sm:max-w-lg'>
        <CardHeader className='gap-6'>
          <Logo className='gap-3' />

          {isPostCheckout ? (
            <div>
              <div className='mb-3 flex items-center gap-2'>
                <CheckCircle2 className='h-5 w-5 text-emerald-500' />
                <Badge variant='secondary' className='bg-emerald-50 text-emerald-700'>
                  Payment successful
                </Badge>
              </div>
              <CardTitle className='mb-1.5 text-2xl'>Complete your account</CardTitle>
              <CardDescription className='text-base'>
                You&apos;re signed up for <strong>{planLabel}</strong>. Create your account to get started.
              </CardDescription>
            </div>
          ) : (
            <div>
              <CardTitle className='mb-1.5 text-2xl'>Start your free trial</CardTitle>
              <CardDescription className='text-base'>Sign up in less than 2 minutes.</CardDescription>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className='space-y-4'>
            <RegisterForm sessionId={sessionId} />

            <p className='text-muted-foreground text-center'>
              Already have an account?{' '}
              <Link href='/login' className='text-card-foreground hover:underline'>
                Sign in instead
              </Link>
            </p>

            <div className='flex items-center gap-4'>
              <Separator className='flex-1' />
              <p className='text-muted-foreground text-sm'>or</p>
              <Separator className='flex-1' />
            </div>

            <Button variant='ghost' className='w-full' asChild>
              <a href='#'>Sign in with Google</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Register
