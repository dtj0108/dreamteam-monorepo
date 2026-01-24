import { Suspense } from 'react'
import { AddOnsPage } from '@/components/addons/add-ons-page'
import { Skeleton } from '@/components/ui/skeleton'

export default function AddOnsPageRoute() {
  return (
    <div className="container max-w-5xl py-6">
      <Suspense fallback={<AddOnsPageSkeleton />}>
        <AddOnsPage />
      </Suspense>
    </div>
  )
}

function AddOnsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
