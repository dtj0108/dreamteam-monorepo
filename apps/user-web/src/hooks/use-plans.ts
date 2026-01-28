"use client"

import { useState, useEffect } from 'react'

interface DisplayConfig {
  tagline?: string
  badge_text?: string
  human_equivalent?: string
  agent_count?: number
  savings_text?: string
  departments?: Array<{ name: string; agents: string[] }>
}

export interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  plan_type: 'workspace_plan' | 'agent_tier' | null
  price_monthly: number | null  // In cents
  price_yearly: number | null   // In cents
  features: string[]
  is_coming_soon: boolean
  display_config: DisplayConfig
  stripe_price_id: string | null
  stripe_price_id_yearly: string | null
}

interface UsePlansReturn {
  workspacePlans: Plan[]
  agentTiers: Plan[]
  loading: boolean
  error: string | null
}

/**
 * Hook to fetch pricing plans from the database
 * Returns workspace plans and agent tiers separately for easy consumption
 */
export function usePlans(): UsePlansReturn {
  const [workspacePlans, setWorkspacePlans] = useState<Plan[]>([])
  const [agentTiers, setAgentTiers] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch('/api/plans')
        if (!res.ok) throw new Error('Failed to fetch plans')

        const data = await res.json()
        const plans: Plan[] = data.plans || []

        setWorkspacePlans(plans.filter(p => p.plan_type === 'workspace_plan'))
        setAgentTiers(plans.filter(p => p.plan_type === 'agent_tier'))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans')
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  return { workspacePlans, agentTiers, loading, error }
}
