'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createClient } from '@/lib/supabase/client'

type RequestType = 'bug' | 'support' | 'feature'
type Urgency = 'low' | 'medium' | 'high'

export default function SupportPage() {
  const router = useRouter()
  const [type, setType] = useState<RequestType>('support')
  const [urgency, setUrgency] = useState<Urgency>('medium')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', authUser.id)
          .single()

        setUser({
          name: profile?.name || authUser.email || 'Admin',
          email: profile?.email || authUser.email || '',
        })
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim()) {
      toast.error('Please enter a subject')
      return
    }

    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          urgency,
          subject: subject.trim(),
          message: message.trim(),
          source: 'admin',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send request')
      }

      setIsSuccess(true)
      toast.success(
        type === 'bug'
          ? "Bug report sent! We'll look into it."
          : type === 'feature'
          ? "Feature request sent! We'll review your idea."
          : "Support request sent! We'll get back to you soon."
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to send request. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setType('support')
    setUrgency('medium')
    setSubject('')
    setMessage('')
    setIsSuccess(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const userName = user?.name || 'Admin'
  const userEmail = user?.email || ''

  // Success state
  if (isSuccess) {
    return (
      <div className="max-w-2xl">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4 text-4xl">
            ✅
          </div>
          <h2 className="text-2xl font-semibold mb-2">
            {type === 'bug' ? 'Bug Report Sent!' : type === 'feature' ? 'Feature Request Sent!' : 'Support Request Sent!'}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {type === 'bug'
              ? "Thank you for reporting this issue. Our team will investigate and get back to you if we need more information."
              : type === 'feature'
              ? "Thank you for your suggestion! We love hearing ideas from our users."
              : 'Thank you for reaching out. We typically respond within 24 hours.'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              ← Go Back
            </Button>
            <Button onClick={handleReset}>Submit Another Request</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Support & Bug Reports</h1>
        <p className="text-muted-foreground">
          Let us know how we can help. We typically respond within 24 hours.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request Type */}
        <div className="space-y-3">
          <Label>What would you like to do?</Label>
          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as RequestType)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <label
              htmlFor="type-support"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                type === 'support'
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="support" id="type-support" />
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <div>
                  <span className="text-sm font-medium">Contact Support</span>
                  <p className="text-xs text-muted-foreground">
                    Get help with admin features
                  </p>
                </div>
              </div>
            </label>
            <label
              htmlFor="type-bug"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                type === 'bug'
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="bug" id="type-bug" />
              <div className="flex items-center gap-2">
                <span className="text-xl">🐛</span>
                <div>
                  <span className="text-sm font-medium">Report a Bug</span>
                  <p className="text-xs text-muted-foreground">
                    Let us know about issues
                  </p>
                </div>
              </div>
            </label>
            <label
              htmlFor="type-feature"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                type === 'feature'
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="feature" id="type-feature" />
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <span className="text-sm font-medium">Feature Request</span>
                  <p className="text-xs text-muted-foreground">
                    Suggest a new feature
                  </p>
                </div>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder={
              type === 'bug'
                ? 'Brief description of the bug'
                : type === 'feature'
                ? 'What feature would you like to see?'
                : 'What do you need help with?'
            }
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Urgency */}
        <div className="space-y-3">
          <Label>How urgent is this?</Label>
          <RadioGroup
            value={urgency}
            onValueChange={(value) => setUrgency(value as Urgency)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <label
              htmlFor="urgency-low"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                urgency === 'low'
                  ? 'border-green-500 bg-green-500/5'
                  : 'border-input hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="low" id="urgency-low" />
              <div>
                <span className="text-sm font-medium">Low</span>
                <p className="text-xs text-muted-foreground">
                  No rush, just checking in
                </p>
              </div>
            </label>
            <label
              htmlFor="urgency-medium"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                urgency === 'medium'
                  ? 'border-yellow-500 bg-yellow-500/5'
                  : 'border-input hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="medium" id="urgency-medium" />
              <div>
                <span className="text-sm font-medium">Medium</span>
                <p className="text-xs text-muted-foreground">
                  Would appreciate help soon
                </p>
              </div>
            </label>
            <label
              htmlFor="urgency-high"
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                urgency === 'high'
                  ? 'border-red-500 bg-red-500/5'
                  : 'border-input hover:bg-muted/50'
              }`}
            >
              <RadioGroupItem value="high" id="urgency-high" />
              <div>
                <span className="text-sm font-medium">High</span>
                <p className="text-xs text-muted-foreground">
                  Blocking my work
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder={
              type === 'bug'
                ? 'Please describe the bug in detail. Include steps to reproduce, expected behavior, and what actually happened.'
                : type === 'feature'
                ? "Describe the feature you'd like and how it would help you..."
                : 'Tell us more about your question or issue...'
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSubmitting}
            className="min-h-[180px] resize-none"
          />
        </div>

        {/* User Info (read-only display) */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          Sending as{' '}
          <span className="font-medium text-foreground">{userName}</span> (
          {userEmail})
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
