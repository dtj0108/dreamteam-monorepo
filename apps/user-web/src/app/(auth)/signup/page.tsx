import Register from '@/components/shadcn-studio/blocks/register-01/register-01'

interface SignupPageProps {
  searchParams: Promise<{ session_id?: string; plan?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  return <Register sessionId={params.session_id} plan={params.plan} />
}
