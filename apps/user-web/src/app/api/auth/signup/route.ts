import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@dreamteam/database/server'
import { sendVerificationCode } from '@/lib/twilio'
import { getStripe } from '@/lib/stripe'
import { updateBillingFromSubscription, ensureWorkspaceBilling } from '@/lib/billing-queries'

const normalizeEmail = (value: string) => value.trim().toLowerCase()

type PendingInviteRecord = {
  id: string
  workspace_id: string
  role: "owner" | "admin" | "member"
  expires_at: string | null
  workspaces: unknown
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, companyName, password, sessionId } = body
    const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : ''

    // Validate required fields
    if (!name || !normalizedEmail || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, email, phone, and password are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate phone format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Sign up with Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name,
          phone,
          company_name: companyName || null,
        },
        // Don't require email confirmation - we use phone 2FA instead
        emailRedirectTo: undefined,
      },
    })

    if (signUpError) {
      console.error('Supabase signup error:', signUpError)
      
      // Handle specific error cases
      if (signUpError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Use admin client to bypass RLS during signup
    const adminSupabase = createAdminClient()
    
    // Create initial profile (role will be set after determining if user is joining via invite or creating own workspace)
    await adminSupabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: normalizedEmail,
        name,
        phone,
        company_name: companyName || null,
        phone_verified: false,
        pending_2fa: true,
        role: 'owner', // Default, will be updated if joining via invite
      }, { onConflict: 'id' })

    // Check for pending team invites
    let joinedTeam = false
    let teamName: string | null = null
    let defaultWorkspaceId: string | null = null
    let userRole = 'owner' // Default to owner if creating own workspace

    const { data: pendingInvites } = await adminSupabase
      .from('pending_invites')
      .select('id, workspace_id, role, expires_at, workspaces:workspace_id(name)')
      .ilike('email', normalizedEmail)
      .is('accepted_at', null)

    const activePendingInvites = ((pendingInvites || []) as PendingInviteRecord[]).filter((invite) => {
      if (!invite.expires_at) return true
      return new Date(invite.expires_at) > new Date()
    })

    if (activePendingInvites.length > 0) {
      // Process each invite
      for (const invite of activePendingInvites) {
        // Add user to workspace
        const { error: memberError } = await adminSupabase
          .from('workspace_members')
          .insert({
            workspace_id: invite.workspace_id,
            profile_id: authData.user.id,
            role: invite.role,
          })

        if (!memberError) {
          joinedTeam = true
          // Use the invite role for the user's profile role
          if (!defaultWorkspaceId) {
            defaultWorkspaceId = invite.workspace_id
            userRole = invite.role // Set profile role from invite
          }
          const workspaceData = invite.workspaces as unknown
          if (workspaceData && typeof workspaceData === 'object' && 'name' in workspaceData) {
            teamName = (workspaceData as { name: string }).name
          }
        }

        // Delete the pending invite
        await adminSupabase
          .from('pending_invites')
          .delete()
          .eq('id', invite.id)
      }
    }

    // If user didn't join a team via invite, create their own workspace
    if (!joinedTeam) {
      userRole = 'owner' // They're creating their own workspace
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        + '-' + Date.now().toString(36)

      const { data: workspace, error: workspaceError } = await adminSupabase
        .from('workspaces')
        .insert({
          name: companyName || `${name}'s Workspace`,
          slug,
          owner_id: authData.user.id,
        })
        .select('id, name')
        .single()

      if (!workspaceError && workspace) {
        defaultWorkspaceId = workspace.id
        teamName = workspace.name

        await adminSupabase.from('workspace_members').insert({
          workspace_id: workspace.id,
          profile_id: authData.user.id,
          role: 'owner',
        })

        await adminSupabase.from('channels').insert([
          { workspace_id: workspace.id, name: 'general', description: 'General discussions', created_by: authData.user.id },
          { workspace_id: workspace.id, name: 'random', description: 'Off-topic conversations', created_by: authData.user.id },
        ])

        // Ensure billing record exists for new workspace (with default free tier)
        // This is idempotent - safe to call even if Stripe checkout will create one later
        await ensureWorkspaceBilling(workspace.id)

        // If there's a Stripe session from guest checkout, link subscription to this workspace
        if (sessionId && workspace.id) {
          try {
            const checkoutSession = await getStripe().checkout.sessions.retrieve(sessionId)

            if (checkoutSession.payment_status === 'paid' && checkoutSession.subscription) {
              const subscriptionId = typeof checkoutSession.subscription === 'string'
                ? checkoutSession.subscription
                : checkoutSession.subscription.id

              // Get or create Stripe customer linked to this workspace
              const customerId = typeof checkoutSession.customer === 'string'
                ? checkoutSession.customer
                : checkoutSession.customer?.id

              // Upsert workspace_billing with Stripe IDs (handles case where billing record may not exist yet)
              await adminSupabase
                .from('workspace_billing')
                .upsert({
                  workspace_id: workspace.id,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  plan: 'free', // Will be updated by updateBillingFromSubscription
                  agent_tier: 'none',
                  included_users: 3,
                  storage_limit_gb: 1,
                }, { onConflict: 'workspace_id' })

              // Update subscription metadata to include workspace_id
              await getStripe().subscriptions.update(subscriptionId, {
                metadata: {
                  workspace_id: workspace.id,
                  type: 'workspace_plan',
                },
              })

              // Sync billing status from subscription
              const targetPlan = checkoutSession.metadata?.target_plan || 'monthly'
              await updateBillingFromSubscription(
                workspace.id,
                subscriptionId,
                'workspace_plan',
                targetPlan
              )

              // Mark checkout session as completed
              await adminSupabase
                .from('billing_checkout_sessions')
                .update({
                  workspace_id: workspace.id,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                })
                .eq('stripe_session_id', sessionId)

              console.log(`Linked Stripe subscription ${subscriptionId} to workspace ${workspace.id}`)
            }
          } catch (stripeError) {
            // Log but don't fail signup if Stripe linking fails
            console.error('Failed to link Stripe subscription:', stripeError)
          }
        }
      }
    }

    // Update profile with default workspace and role.
    // Invite-based signups skip onboarding and go directly to the workspace.
    const profileUpdate: {
      default_workspace_id: string | null
      role: string
      onboarding_completed?: boolean
    } = {
      default_workspace_id: defaultWorkspaceId,
      role: userRole,
    }

    if (joinedTeam) {
      profileUpdate.onboarding_completed = true
    }

    await adminSupabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', authData.user.id)

    // Send Twilio OTP for phone verification
    const otpResult = await sendVerificationCode(phone)

    if (!otpResult.success) {
      console.error('Failed to send OTP:', otpResult.error)
      return NextResponse.json(
        { error: 'Account created but failed to send verification code. Please try logging in.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your phone',
      userId: authData.user.id,
      phone,
      joinedTeam,
      teamName,
      workspaceId: defaultWorkspaceId,
    })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[auth/signup] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}
