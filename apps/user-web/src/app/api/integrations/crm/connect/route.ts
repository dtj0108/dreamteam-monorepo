import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { encryptCRMToken } from "@/lib/crm-encryption"
import { CRM_PROVIDERS, type CRMProvider } from "@/types/crm"

interface ConnectRequest {
  provider: CRMProvider
  workspaceId: string
  apiKey: string
}

// POST /api/integrations/crm/connect - Validate and save API key
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: ConnectRequest = await request.json()
  const { provider, workspaceId, apiKey } = body

  // Validate provider
  if (!CRM_PROVIDERS[provider]) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
  }

  if (!workspaceId || !apiKey) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Verify user is an admin/owner of the workspace
  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("profile_id", user.id)
    .single()

  if (memberError || !membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 })
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can connect integrations" }, { status: 403 })
  }

  // Validate the API key by making a test request
  const validation = await validateApiKey(provider, apiKey)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Encrypt the API key
  const encryptedApiKey = encryptCRMToken(apiKey)

  // Upsert the integration
  const { error: dbError } = await supabase
    .from("crm_integrations")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: user.id,
        provider,
        name: `${CRM_PROVIDERS[provider].name} Integration`,
        status: "active",
        encrypted_access_token: encryptedApiKey,
        external_account_id: validation.accountId || null,
        external_account_name: validation.accountName || null,
        error_code: null,
        error_message: null,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "workspace_id,provider",
        ignoreDuplicates: false,
      }
    )

  if (dbError) {
    console.error("Database error:", dbError)
    return NextResponse.json({ error: "Failed to save integration" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    accountName: validation.accountName,
  })
}

/**
 * Validate API key by making a test request to the provider
 */
async function validateApiKey(
  provider: CRMProvider,
  apiKey: string
): Promise<{ valid: boolean; error?: string; accountId?: string; accountName?: string }> {
  try {
    if (provider === "close") {
      // Close uses Basic auth with API key as username
      const response = await fetch("https://api.close.com/api/v1/me/", {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: "Invalid API key" }
        }
        return { valid: false, error: "Failed to verify API key" }
      }

      const data = await response.json()
      return {
        valid: true,
        accountId: data.id,
        accountName: data.organizations?.[0]?.name || data.email || "Close Account",
      }
    }

    if (provider === "pipedrive") {
      // Pipedrive uses api_token query parameter
      const response = await fetch(`https://api.pipedrive.com/v1/users/me?api_token=${apiKey}`)

      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, error: "Invalid API token" }
        }
        return { valid: false, error: "Failed to verify API token" }
      }

      const data = await response.json()
      if (!data.success) {
        return { valid: false, error: "Invalid API token" }
      }

      return {
        valid: true,
        accountId: String(data.data?.id),
        accountName: data.data?.company_name || data.data?.name || "Pipedrive Account",
      }
    }

    return { valid: false, error: "Unsupported provider" }
  } catch (error) {
    console.error("API key validation error:", error)
    return { valid: false, error: "Failed to verify API key" }
  }
}
