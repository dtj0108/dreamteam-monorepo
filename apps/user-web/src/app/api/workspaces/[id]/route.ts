import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@dreamteam/database/server"
import { getSession } from "@dreamteam/auth/session"
import { getStripe } from "@/lib/stripe"
import { getWorkspaceBilling } from "@/lib/billing-queries"
import { getPhoneNumberSubscription } from "@/lib/addons-queries"
import { releasePhoneNumber } from "@/lib/twilio"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params

    // 1. Auth: get user session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // 2. Get workspace and verify user is owner
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id, owner_id, name")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    if (workspace.owner_id !== session.id) {
      return NextResponse.json(
        { error: "Only the workspace owner can delete the workspace" },
        { status: 403 }
      )
    }

    // 3. Cancel Stripe subscriptions (best-effort)
    const billing = await getWorkspaceBilling(workspaceId)

    if (billing) {
      const stripe = getStripe()

      // Cancel plan subscription
      if (billing.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(billing.stripe_subscription_id, {
            invoice_now: false,
            prorate: false,
          })
          console.log(
            `[workspace-delete] Canceled plan subscription ${billing.stripe_subscription_id} for workspace ${workspaceId}`
          )
        } catch (err) {
          console.error(
            `[workspace-delete] Failed to cancel plan subscription ${billing.stripe_subscription_id}:`,
            err
          )
        }
      }

      // Cancel agent subscription
      if (billing.stripe_agent_subscription_id) {
        try {
          await stripe.subscriptions.cancel(
            billing.stripe_agent_subscription_id,
            { invoice_now: false, prorate: false }
          )
          console.log(
            `[workspace-delete] Canceled agent subscription ${billing.stripe_agent_subscription_id} for workspace ${workspaceId}`
          )
        } catch (err) {
          console.error(
            `[workspace-delete] Failed to cancel agent subscription ${billing.stripe_agent_subscription_id}:`,
            err
          )
        }
      }
    }

    // Cancel phone number subscription
    const phoneSub = await getPhoneNumberSubscription(workspaceId)
    if (phoneSub?.stripe_subscription_id) {
      try {
        const stripe = getStripe()
        await stripe.subscriptions.cancel(phoneSub.stripe_subscription_id, {
          invoice_now: false,
          prorate: false,
        })
        console.log(
          `[workspace-delete] Canceled phone subscription ${phoneSub.stripe_subscription_id} for workspace ${workspaceId}`
        )
      } catch (err) {
        console.error(
          `[workspace-delete] Failed to cancel phone subscription ${phoneSub.stripe_subscription_id}:`,
          err
        )
      }
    }

    // 4. Release Twilio numbers (best-effort)
    const { data: twilioNumbers } = await supabase
      .from("twilio_numbers")
      .select("id, twilio_sid")
      .eq("workspace_id", workspaceId)

    if (twilioNumbers) {
      for (const num of twilioNumbers) {
        if (num.twilio_sid) {
          try {
            await releasePhoneNumber(num.twilio_sid)
            console.log(
              `[workspace-delete] Released Twilio number ${num.twilio_sid} for workspace ${workspaceId}`
            )
          } catch (err) {
            console.error(
              `[workspace-delete] Failed to release Twilio number ${num.twilio_sid}:`,
              err
            )
          }
        }
      }
    }

    // 5. Delete workspace data (order matters for foreign keys)
    const tablesToDelete = [
      "workspace_members",
      "workspace_billing",
      "phone_number_subscriptions",
      "twilio_numbers",
      "billing_invoices",
      "billing_checkout_sessions",
      "billing_alerts",
      "workspace_deployed_teams",
      "agent_schedules",
      "workspace_sms_credits",
      "workspace_call_minutes",
      "sms_credit_purchases",
      "call_minutes_purchases",
      "sms_usage_log",
      "call_usage_log",
      "channels",
      "messages",
    ]

    for (const table of tablesToDelete) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("workspace_id", workspaceId)

        if (error) {
          // Log but continue - table may not exist or have no matching rows
          console.warn(
            `[workspace-delete] Error deleting from ${table}: ${error.message}`
          )
        }
      } catch (err) {
        console.warn(
          `[workspace-delete] Failed to delete from ${table}:`,
          err
        )
      }
    }

    // Delete the workspace itself last
    const { error: deleteError } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId)

    if (deleteError) {
      console.error(
        `[workspace-delete] Failed to delete workspace row: ${deleteError.message}`
      )
      return NextResponse.json(
        { error: "Failed to delete workspace" },
        { status: 500 }
      )
    }

    // 6. Clear current_workspace_id cookie
    const cookieStore = await cookies()
    cookieStore.delete("current_workspace_id")

    // 7. Return success
    console.log(
      `[workspace-delete] Successfully deleted workspace ${workspaceId} (${workspace.name})`
    )
    return NextResponse.json({ success: true, redirect: "/account" })
  } catch (error) {
    console.error("[workspace-delete] Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
