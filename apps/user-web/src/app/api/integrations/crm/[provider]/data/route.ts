import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { decryptCRMToken } from "@/lib/crm-encryption"
import { CRM_PROVIDERS, type CRMProvider } from "@/types/crm"
import { CloseClient } from "@/lib/crm-clients/close"
import { PipedriveClient } from "@/lib/crm-clients/pipedrive"
import { HubSpotClient } from "@/lib/crm-clients/hubspot"
import { FreshsalesClient } from "@/lib/crm-clients/freshsales"

// GET /api/integrations/crm/[provider]/data - Get counts of data available to import
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { provider } = await params
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get("workspaceId")

  // Validate provider
  if (!CRM_PROVIDERS[provider as CRMProvider]) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
  }

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify user is a member of the workspace
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
  }

  // Get the integration
  const { data: integration, error: integrationError } = await supabase
    .from("crm_integrations")
    .select("encrypted_access_token, status")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .single()

  if (integrationError || !integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 })
  }

  if (integration.status !== "active") {
    return NextResponse.json({ error: "Integration is not active" }, { status: 400 })
  }

  if (!integration.encrypted_access_token) {
    return NextResponse.json({ error: "No API key stored" }, { status: 400 })
  }

  // Decrypt the API key
  let apiKey: string
  try {
    apiKey = decryptCRMToken(integration.encrypted_access_token)
  } catch {
    return NextResponse.json({ error: "Failed to decrypt API key" }, { status: 500 })
  }

  // Get counts from the CRM
  try {
    let counts: { leads: number; contacts: number; opportunities: number; contactsNote?: string }

    if (provider === "close") {
      const client = new CloseClient(apiKey)
      // Use fast basic counts - embedded contacts will be extracted during import
      const baseCounts = await client.getCounts()
      counts = {
        ...baseCounts,
        // If Close returns 0 contacts, they're likely embedded in leads
        contactsNote: baseCounts.contacts === 0 && baseCounts.leads > 0
          ? "Contacts embedded in leads will be imported"
          : undefined,
      }
    } else if (provider === "pipedrive") {
      const client = new PipedriveClient(apiKey)
      counts = await client.getCounts()
    } else if (provider === "hubspot") {
      const client = new HubSpotClient(apiKey)
      counts = await client.getCounts()
    } else if (provider === "freshsales") {
      const client = new FreshsalesClient(apiKey)
      counts = await client.getCounts()
    } else {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 })
    }

    return NextResponse.json(counts)
  } catch (error) {
    console.error("Failed to fetch CRM data counts:", error)
    return NextResponse.json({ error: "Failed to fetch data from CRM" }, { status: 500 })
  }
}
