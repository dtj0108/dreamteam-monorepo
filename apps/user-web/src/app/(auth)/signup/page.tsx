import { redirect } from 'next/navigation'
import Register from '@/components/shadcn-studio/blocks/register-01/register-01'

interface SignupPageProps {
  searchParams: Promise<{ session_id?: string; plan?: string; tier?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams

  // If coming from checkout with a session_id, redirect to the new complete signup page
  if (params.session_id) {
    redirect(`/signup/complete?session_id=${params.session_id}`)
  }

  return <Register sessionId={params.session_id} plan={params.plan} />
}
