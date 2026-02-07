import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@dreamteam/database/server'
import { stripe } from '@/lib/stripe'
import { sendVerificationCode } from '@/lib/twilio'
import { updateBillingFromSubscription, ensureWorkspaceBilling } from '@/lib/billing-queries'
import { autoDeployTeamForPlan } from '@dreamteam/database'

/**
 * POST /api/auth/complete-signup
 * Completes signup for users who have already paid via Stripe guest checkout.
 *
 * This endpoint:
 * 1. Validates the Stripe session and extracts customer info
 * 2. Creates a Supabase auth user
 * 3. Creates a workspace
 * 4. Links the Stripe subscription to the workspace
 * 5. Deploys agents based on the purchased tier
 * 6. Sends phone verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, name, phone, password } = body

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Checkout session ID is required' },
        { status: 400 }
      )
    }

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, phone, and password are required' },
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

    // 1. Fetch and validate Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Checkout session has not been paid' },
        { status: 400 }
      )
    }

    const email = checkoutSession.customer_details?.email
    if (!email) {
      return NextResponse.json(
        { error: 'No email found in checkout session' },
        { status: 400 }
      )
    }

    const tier = checkoutSession.metadata?.target_plan || 'startup'
    const subscriptionType = checkoutSession.metadata?.type || 'agent_tier'

    // Get subscription and customer IDs
    let subscriptionId: string | null = null
    if (checkoutSession.subscription) {
      subscriptionId = typeof checkoutSession.subscription === 'string'
        ? checkoutSession.subscription
        : checkoutSession.subscription.id
    }

    let customerId: string | null = null
    if (checkoutSession.customer) {
      customerId = typeof checkoutSession.customer === 'string'
        ? checkoutSession.customer
        : checkoutSession.customer.id
    }

    const supabase = await createServerSupabaseClient()
    const adminSupabase = createAdminClient()

    // 2. Create Supabase auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: {
          name,
          phone,
        },
        emailRedirectTo: undefined,
      },
    })

    if (signUpError) {
      console.error('Supabase signup error:', signUpError)

      if (signUpError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
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

    // 3. Create profile
    await adminSupabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email.toLowerCase(),
        name,
        phone,
        phone_verified: false,
        pending_2fa: true,
        role: 'owner',
      }, { onConflict: 'id' })

    // 4. Create workspace
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36)

    const { data: workspace, error: workspaceError } = await adminSupabase
      .from('workspaces')
      .insert({
        name: `${name}'s Workspace`,
        slug,
        owner_id: authData.user.id,
      })
      .select('id, name, owner_id')
      .single()

    if (workspaceError || !workspace) {
      console.error('Workspace creation error:', workspaceError)
      return NextResponse.json(
        { error: 'Failed to create workspace' },
        { status: 500 }
      )
    }

    // Add owner as workspace member
    await adminSupabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      profile_id: authData.user.id,
      role: 'owner',
    })

    // Create default channels
    await adminSupabase.from('channels').insert([
      { workspace_id: workspace.id, name: 'general', description: 'General discussions', created_by: authData.user.id },
      { workspace_id: workspace.id, name: 'random', description: 'Off-topic conversations', created_by: authData.user.id },
    ])

    // 5. Ensure billing record exists and link Stripe subscription
    await ensureWorkspaceBilling(workspace.id)

    if (subscriptionId && customerId) {
      // Update workspace_billing with Stripe IDs
      if (subscriptionType === 'agent_tier') {
        await adminSupabase
          .from('workspace_billing')
          .update({
            stripe_customer_id: customerId,
            stripe_agent_subscription_id: subscriptionId,
            agent_tier: tier,
            agent_status: 'active',
          })
          .eq('workspace_id', workspace.id)
      } else {
        // workspace_plan type
        await adminSupabase
          .from('workspace_billing')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('workspace_id', workspace.id)
      }

      // Update subscription metadata to include workspace_id
      await stripe.subscriptions.update(subscriptionId, {
        metadata: {
          workspace_id: workspace.id,
          type: subscriptionType,
          target_plan: tier,
        },
      })

      // Sync billing status from subscription
      await updateBillingFromSubscription(
        workspace.id,
        subscriptionId,
        subscriptionType as 'workspace_plan' | 'agent_tier',
        tier
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

    // 6. Deploy agents for the purchased tier
    if (subscriptionType === 'agent_tier' && tier !== 'none') {
      console.log(`[complete-signup] Deploying agents for tier ${tier} to workspace ${workspace.id}`)
      await adminSupabase
        .from('workspace_billing')
        .update({
          agent_deploy_status: 'pending',
          agent_deploy_error: null,
          agent_deploy_attempted_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspace.id)

      try {
        const deployResult = await autoDeployTeamForPlan(workspace.id, tier, authData.user.id)

        if (!deployResult.deployed) {
          const deployError = deployResult.error || deployResult.errorCode || 'deploy_failed'
          console.error(`[complete-signup] Auto-deploy failed:`, deployError)

          await adminSupabase
            .from('workspace_billing')
            .update({
              agent_deploy_status: 'failed',
              agent_deploy_error: deployError,
            })
            .eq('workspace_id', workspace.id)

          await adminSupabase.from('billing_alerts').insert({
            workspace_id: workspace.id,
            alert_type: 'deploy_failed',
            severity: 'high',
            title: 'Agent deployment failed',
            description: `Auto-deploy failed after complete-signup for tier ${tier}: ${deployError}`,
          })
        } else {
          await adminSupabase
            .from('workspace_billing')
            .update({
              agent_deploy_status: 'deployed',
              agent_deploy_error: null,
            })
            .eq('workspace_id', workspace.id)

          console.log(`[complete-signup] Agents deployed successfully: deployment ${deployResult.deploymentId}`)
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown_error'
        console.error(`[complete-signup] Auto-deploy error:`, err)

        await adminSupabase
          .from('workspace_billing')
          .update({
            agent_deploy_status: 'failed',
            agent_deploy_error: errMsg,
          })
          .eq('workspace_id', workspace.id)

        await adminSupabase.from('billing_alerts').insert({
          workspace_id: workspace.id,
          alert_type: 'deploy_failed',
          severity: 'high',
          title: 'Agent deployment failed',
          description: `Auto-deploy threw after complete-signup for tier ${tier}: ${errMsg}`,
        })
      }
    }

    // Update profile with default workspace
    await adminSupabase
      .from('profiles')
      .update({ default_workspace_id: workspace.id })
      .eq('id', authData.user.id)

    // 7. Send phone verification OTP
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
      message: 'Account created successfully. Please verify your phone.',
      userId: authData.user.id,
      workspaceId: workspace.id,
      phone,
    })
  } catch (error) {
    console.error('Complete signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
