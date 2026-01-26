'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Save,
  CreditCard,
  Users,
  Loader2,
  Plus,
  Trash2,
  Link as LinkIcon,
  Clock,
  Palette,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle
} from 'lucide-react'
import type { PlanWithTeam, Team, PlanType, PlanDisplayConfig } from '@/types/teams'

export default function PlanDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  // Core state
  const [plan, setPlan] = useState<PlanWithTeam | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [teamId, setTeamId] = useState('')
  const [priceMonthly, setPriceMonthly] = useState('')
  const [priceYearly, setPriceYearly] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isComingSoon, setIsComingSoon] = useState(false)
  const [planType, setPlanType] = useState<PlanType | ''>('')
  const [features, setFeatures] = useState<string[]>([])
  const [newFeature, setNewFeature] = useState('')
  const [limits, setLimits] = useState<Record<string, number>>({})
  const [newLimitKey, setNewLimitKey] = useState('')
  const [newLimitValue, setNewLimitValue] = useState('')
  // Display config fields (UI-friendly instead of raw JSON)
  const [tagline, setTagline] = useState('')
  const [badgeText, setBadgeText] = useState('')
  const [humanEquivalent, setHumanEquivalent] = useState('')
  const [agentCount, setAgentCount] = useState('')
  const [savingsText, setSavingsText] = useState('')
  const [departments, setDepartments] = useState<Array<{ name: string; agents: string[] }>>([])
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptAgents, setNewDeptAgents] = useState('')

  // Stripe fields
  const [stripePriceId, setStripePriceId] = useState('')
  const [stripePriceIdYearly, setStripePriceIdYearly] = useState('')
  const [stripeProductId, setStripeProductId] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showStripeIds, setShowStripeIds] = useState(false)

  // Fetch plan data
  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/plans/${id}`)
      if (!res.ok) throw new Error('Plan not found')

      const data = await res.json()
      const planData = data.plan

      setPlan(planData)
      setName(planData.name)
      setSlug(planData.slug || '')
      setDescription(planData.description || '')
      setTeamId(planData.team_id || '')
      setPriceMonthly(planData.price_monthly !== null ? (planData.price_monthly / 100).toFixed(2) : '')
      setPriceYearly(planData.price_yearly !== null ? (planData.price_yearly / 100).toFixed(2) : '')
      setIsActive(planData.is_active)
      setIsComingSoon(planData.is_coming_soon ?? false)
      setPlanType(planData.plan_type || '')
      setFeatures(planData.features || [])
      setLimits(planData.limits || {})
      // Initialize display config fields
      const dc = planData.display_config || {}
      setTagline(dc.tagline || '')
      setBadgeText(dc.badge_text || '')
      setHumanEquivalent(dc.human_equivalent || '')
      setAgentCount(dc.agent_count?.toString() || '')
      setSavingsText(dc.savings_text || '')
      setDepartments(dc.departments || [])
      setStripePriceId(planData.stripe_price_id || '')
      setStripePriceIdYearly(planData.stripe_price_id_yearly || '')
      setStripeProductId(planData.stripe_product_id || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    const res = await fetch('/api/admin/teams?active_only=true')
    if (res.ok) {
      const data = await res.json()
      setTeams(data.teams || [])
    }
  }, [])

  useEffect(() => {
    fetchPlan()
    fetchTeams()
  }, [fetchPlan, fetchTeams])

  // Save plan
  async function savePlan() {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    // Build display config from individual fields
    const displayConfig: PlanDisplayConfig = {}
    if (tagline) displayConfig.tagline = tagline
    if (badgeText) displayConfig.badge_text = badgeText
    if (humanEquivalent) displayConfig.human_equivalent = humanEquivalent
    if (agentCount) displayConfig.agent_count = parseInt(agentCount)
    if (savingsText) displayConfig.savings_text = savingsText
    if (departments.length > 0) displayConfig.departments = departments

    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          description: description || null,
          team_id: teamId || null,
          price_monthly: priceMonthly ? Math.round(parseFloat(priceMonthly) * 100) : null,
          price_yearly: priceYearly ? Math.round(parseFloat(priceYearly) * 100) : null,
          is_active: isActive,
          is_coming_soon: isComingSoon,
          plan_type: planType || null,
          features,
          limits,
          display_config: displayConfig,
          stripe_price_id: stripePriceId || null,
          stripe_price_id_yearly: stripePriceIdYearly || null,
          stripe_product_id: stripeProductId || null
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      // Show success message with Stripe sync status
      if (data.stripe_synced) {
        const archivedCount = data.archived_prices_count || 0
        const archivedText = archivedCount > 0 ? ` (${archivedCount} old price${archivedCount > 1 ? 's' : ''} archived)` : ''
        setSuccessMessage(`Saved and synced to Stripe${archivedText}`)
      } else {
        setSuccessMessage('Plan saved successfully')
      }

      await fetchPlan()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Add feature
  function addFeature() {
    if (!newFeature.trim()) return
    setFeatures(prev => [...prev, newFeature.trim()])
    setNewFeature('')
  }

  // Remove feature
  function removeFeature(index: number) {
    setFeatures(prev => prev.filter((_, i) => i !== index))
  }

  // Add limit
  function addLimit() {
    if (!newLimitKey.trim() || !newLimitValue) return
    setLimits(prev => ({ ...prev, [newLimitKey.trim()]: parseInt(newLimitValue) }))
    setNewLimitKey('')
    setNewLimitValue('')
  }

  // Remove limit
  function removeLimit(key: string) {
    setLimits(prev => {
      const { [key]: _, ...rest } = prev
      return rest
    })
  }

  // Copy to clipboard
  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      console.error('Failed to copy')
    }
  }

  // Department management
  function addDepartment() {
    if (!newDeptName.trim()) return
    const agents = newDeptAgents.split(',').map(a => a.trim()).filter(Boolean)
    setDepartments(prev => [...prev, { name: newDeptName.trim(), agents }])
    setNewDeptName('')
    setNewDeptAgents('')
  }

  function removeDepartment(index: number) {
    setDepartments(prev => prev.filter((_, i) => i !== index))
  }

  function updateDepartmentAgents(index: number, agentsStr: string) {
    const agents = agentsStr.split(',').map(a => a.trim()).filter(Boolean)
    setDepartments(prev => prev.map((d, i) => i === index ? { ...d, agents } : d))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Plan not found</p>
        <Button variant="link" onClick={() => router.push('/admin/plans')}>
          Back to Plans
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/plans')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{plan.name}</h1>
              {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
              {plan.is_coming_soon && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  <Clock className="mr-1 h-3 w-3" />
                  Coming Soon
                </Badge>
              )}
              {plan.plan_type && (
                <Badge variant={plan.plan_type === 'workspace_plan' ? 'default' : 'secondary'}>
                  {plan.plan_type === 'workspace_plan' ? 'Workspace' : 'Agent Tier'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{plan.description || 'No description'}</p>
          </div>
        </div>
        <Button onClick={savePlan} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 text-green-800 px-4 py-3 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>{successMessage}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-green-800 hover:text-green-900 hover:bg-green-200"
            onClick={() => setSuccessMessage(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plan Details
            </CardTitle>
            <CardDescription>Basic information about this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={slug} onChange={e => setSlug(e.target.value)} placeholder="auto-generated" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={teamId || '_none'} onValueChange={(v) => setTeamId(v === '_none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No team</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teamId && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto"
                  onClick={() => router.push(`/admin/teams/${teamId}`)}
                >
                  <LinkIcon className="h-3 w-3 mr-1" />
                  View Team
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Plan Type</Label>
              <Select value={planType || '_none'} onValueChange={(v) => setPlanType(v === '_none' ? '' : v as PlanType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Not set</SelectItem>
                  <SelectItem value="workspace_plan">Workspace Plan</SelectItem>
                  <SelectItem value="agent_tier">Agent Tier</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Workspace plans are for team subscriptions. Agent tiers are for AI agent packages.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isComingSoon}
                  onCheckedChange={setIsComingSoon}
                  className="data-[state=checked]:bg-amber-500"
                />
                <Label>Coming Soon</Label>
              </div>
            </div>
            {isComingSoon && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                Plan will be visible on pricing page but the purchase button will be disabled.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Set the subscription prices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priceMonthly">Monthly Price ($)</Label>
                <Input
                  id="priceMonthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceMonthly}
                  onChange={e => setPriceMonthly(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceYearly">Yearly Price ($)</Label>
                <Input
                  id="priceYearly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceYearly}
                  onChange={e => setPriceYearly(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            {priceMonthly && priceYearly && (
              <p className="text-sm text-muted-foreground">
                Annual savings: ${((parseFloat(priceMonthly) * 12) - parseFloat(priceYearly)).toFixed(2)}
                ({Math.round((1 - parseFloat(priceYearly) / (parseFloat(priceMonthly) * 12)) * 100)}% off)
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stripe Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Stripe Configuration
            </CardTitle>
            <CardDescription>
              Connect this plan to Stripe products and prices for checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Security notice and reveal toggle */}
            {!showStripeIds ? (
              <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800">Sensitive Configuration</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Stripe IDs are hidden for security. These IDs control which products customers are charged for.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowStripeIds(true)}
                        className="border-amber-300 hover:bg-amber-100"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Reveal Stripe IDs
                      </Button>
                      {(stripePriceId || stripeProductId || stripePriceIdYearly) && (
                        <Badge variant="outline" className="text-amber-700 border-amber-300">
                          {[stripePriceId, stripePriceIdYearly, stripeProductId].filter(Boolean).length} configured
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Hide button */}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStripeIds(false)}
                    className="text-muted-foreground"
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Stripe IDs
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="stripeProductId">Stripe Product ID</Label>
                    <div className="flex gap-2">
                      <Input
                        id="stripeProductId"
                        value={stripeProductId}
                        onChange={e => setStripeProductId(e.target.value)}
                        placeholder="prod_..."
                        className="font-mono text-sm"
                      />
                      {stripeProductId && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(stripeProductId, 'product')}
                          title="Copy to clipboard"
                        >
                          {copiedField === 'product' ? (
                            <span className="text-green-600 text-xs">Done</span>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripePriceId">Price ID (Monthly)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="stripePriceId"
                        value={stripePriceId}
                        onChange={e => setStripePriceId(e.target.value)}
                        placeholder="price_..."
                        className="font-mono text-sm"
                      />
                      {stripePriceId && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(stripePriceId, 'monthly')}
                          title="Copy to clipboard"
                        >
                          {copiedField === 'monthly' ? (
                            <span className="text-green-600 text-xs">Done</span>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stripePriceIdYearly">Price ID (Yearly)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="stripePriceIdYearly"
                        value={stripePriceIdYearly}
                        onChange={e => setStripePriceIdYearly(e.target.value)}
                        placeholder="price_..."
                        className="font-mono text-sm"
                      />
                      {stripePriceIdYearly && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(stripePriceIdYearly, 'yearly')}
                          title="Copy to clipboard"
                        >
                          {copiedField === 'yearly' ? (
                            <span className="text-green-600 text-xs">Done</span>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {stripeProductId && (
                  <a
                    href={`https://dashboard.stripe.com/products/${stripeProductId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View in Stripe Dashboard
                  </a>
                )}

                <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground space-y-1">
                  <p><strong>How to get Stripe IDs:</strong></p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Go to <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stripe Products</a></li>
                    <li>Create or select a product</li>
                    <li>Copy the Product ID (starts with prod_)</li>
                    <li>Under Pricing, copy the Price ID (starts with price_)</li>
                  </ol>
                </div>

                {!stripePriceId && !stripeProductId && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                    No Stripe IDs configured. Checkout will fall back to environment variables.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>List of features included in this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                placeholder="Add a feature"
                onKeyDown={e => e.key === 'Enter' && addFeature()}
              />
              <Button onClick={addFeature} disabled={!newFeature.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                  <span className="text-sm">{feature}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {features.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No features added yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Limits</CardTitle>
            <CardDescription>Usage limits for this plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newLimitKey}
                onChange={e => setNewLimitKey(e.target.value)}
                placeholder="Limit name"
                className="flex-1"
              />
              <Input
                type="number"
                value={newLimitValue}
                onChange={e => setNewLimitValue(e.target.value)}
                placeholder="Value"
                className="w-24"
              />
              <Button onClick={addLimit} disabled={!newLimitKey.trim() || !newLimitValue}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {Object.entries(limits).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{key}</Badge>
                    <span className="text-sm">{value}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLimit(key)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {Object.keys(limits).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No limits configured
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Common limits: messages_per_month, agents_count, storage_mb, api_calls_per_day
            </p>
          </CardContent>
        </Card>

        {/* Display Config */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Display Configuration
            </CardTitle>
            <CardDescription>
              UI metadata for pricing page display
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Display Fields */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder="You + a few killers in one room"
                />
                <p className="text-xs text-muted-foreground">Short quote displayed on pricing card</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="badgeText">Badge Text</Label>
                <Input
                  id="badgeText"
                  value={badgeText}
                  onChange={e => setBadgeText(e.target.value)}
                  placeholder="Most Popular"
                />
                <p className="text-xs text-muted-foreground">e.g., "Most Popular", "Best Value"</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="savingsText">Savings Text</Label>
                <Input
                  id="savingsText"
                  value={savingsText}
                  onChange={e => setSavingsText(e.target.value)}
                  placeholder="Save 20%"
                />
                <p className="text-xs text-muted-foreground">Displayed near the price</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="humanEquivalent">Human Equivalent</Label>
                <Input
                  id="humanEquivalent"
                  value={humanEquivalent}
                  onChange={e => setHumanEquivalent(e.target.value)}
                  placeholder="$840K"
                />
                <p className="text-xs text-muted-foreground">Human salary equivalent</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentCount">Agent Count</Label>
                <Input
                  id="agentCount"
                  type="number"
                  min="0"
                  value={agentCount}
                  onChange={e => setAgentCount(e.target.value)}
                  placeholder="7"
                />
                <p className="text-xs text-muted-foreground">Number of agents included</p>
              </div>
            </div>

            {/* Departments Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Departments</Label>
                  <p className="text-xs text-muted-foreground">Organize agents by department for display</p>
                </div>
              </div>

              {/* Add Department Form */}
              <div className="flex gap-2 p-3 border rounded-md bg-muted/30">
                <div className="flex-1 space-y-1">
                  <Input
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    placeholder="Department name (e.g., Leadership)"
                    className="bg-background"
                  />
                </div>
                <div className="flex-[2] space-y-1">
                  <Input
                    value={newDeptAgents}
                    onChange={e => setNewDeptAgents(e.target.value)}
                    placeholder="Agents (comma-separated, e.g., CEO Agent, Strategy Agent)"
                    className="bg-background"
                    onKeyDown={e => e.key === 'Enter' && addDepartment()}
                  />
                </div>
                <Button onClick={addDepartment} disabled={!newDeptName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Department List */}
              <div className="space-y-2">
                {departments.map((dept, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 border rounded-md">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-medium">{dept.name}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {dept.agents.length} agent{dept.agents.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Input
                        value={dept.agents.join(', ')}
                        onChange={e => updateDepartmentAgents(index, e.target.value)}
                        placeholder="Agents (comma-separated)"
                        className="text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDepartment(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
                    No departments configured. Add departments to organize agents on the pricing page.
                  </p>
                )}
              </div>
            </div>

            {/* Preview */}
            {(tagline || badgeText || humanEquivalent || agentCount || savingsText || departments.length > 0) && (
              <div className="p-4 border rounded-md bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">Preview Data</p>
                <div className="flex flex-wrap gap-2 text-sm">
                  {badgeText && <Badge>{badgeText}</Badge>}
                  {tagline && <span className="italic text-muted-foreground">"{tagline}"</span>}
                  {humanEquivalent && <Badge variant="outline">Human equiv: {humanEquivalent}</Badge>}
                  {agentCount && <Badge variant="secondary">{agentCount} agents</Badge>}
                  {savingsText && <Badge variant="outline" className="text-green-600 border-green-300">{savingsText}</Badge>}
                </div>
                {departments.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Departments: </span>
                    {departments.map((d, i) => (
                      <span key={i} className="text-xs">
                        {d.name} ({d.agents.length})
                        {i < departments.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
