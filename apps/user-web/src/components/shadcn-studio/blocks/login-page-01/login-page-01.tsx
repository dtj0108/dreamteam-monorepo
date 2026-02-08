import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import Logo from '@/components/shadcn-studio/logo'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-01/login-form'

const Login = () => {
  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      {/* Back to home link */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-10 w-full border-none shadow-md sm:max-w-lg'>
        <CardHeader className='gap-6'>
          <Logo className='gap-3' />

          <div>
            <CardTitle className='mb-1.5 text-2xl'>Sign in to DreamTeam</CardTitle>
            <CardDescription className='text-base'>Ship Faster and Focus on Growth.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
