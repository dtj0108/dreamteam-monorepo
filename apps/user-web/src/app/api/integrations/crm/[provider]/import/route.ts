import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createAdminClient } from "@dreamteam/database/server"
import { decryptCRMToken } from "@/lib/crm-encryption"
import { CRM_PROVIDERS, type CRMProvider, type CRMImportOptions, type CRMImportResult } from "@/types/crm"
import { CloseClient } from "@/lib/crm-clients/close"
import { PipedriveClient } from "@/lib/crm-clients/pipedrive"
import { HubSpotClient } from "@/lib/crm-clients/hubspot"
import { FreshsalesClient } from "@/lib/crm-clients/freshsales"
import { checkLeadDuplicate, type ExistingLead } from "@/lib/lead-duplicate-detector"

// Extend timeout for large imports (Vercel Pro supports up to 300s)
export const maxDuration = 300

interface ImportRequest {
  workspaceId: string
  options: CRMImportOptions
}

// POST /api/integrations/crm/[provider]/import - Import data from CRM
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { provider } = await params

  // Validate provider
  if (!CRM_PROVIDERS[provider as CRMProvider]) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: ImportRequest = await request.json()
  const { workspaceId, options } = body

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId is required" }, { status: 400 })
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
    return NextResponse.json({ error: "Only admins can import data" }, { status: 403 })
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

  // Admin client for database operations
  const adminSupabase = createAdminClient()

  const result: CRMImportResult = {
    leads: { imported: 0, skipped: 0, failed: 0 },
    contacts: { imported: 0, skipped: 0, failed: 0 },
    opportunities: { imported: 0, skipped: 0, failed: 0 },
    errors: [],
  }

  try {
    // Get default lead pipeline and stage (for leads)
    const { data: defaultLeadPipeline } = await adminSupabase
      .from("lead_pipelines")
      .select(`
        id,
        stages:lead_pipeline_stages(id, name, position)
      `)
      .eq("user_id", user.id)
      .eq("is_default", true)
      .single()

    let leadPipelineId = defaultLeadPipeline?.id || null
    let leadStageId: string | null = null

    if (defaultLeadPipeline?.stages) {
      const stages = defaultLeadPipeline.stages as { id: string; position: number }[]
      const sortedStages = stages.sort((a, b) => a.position - b.position)
      leadStageId = sortedStages[0]?.id || null
    }

    // Get default deals pipeline and stage (for deals/opportunities)
    const { data: defaultDealsPipeline } = await adminSupabase
      .from("pipelines")
      .select(`
        id,
        stages:pipeline_stages(id, name, position)
      `)
      .eq("profile_id", user.id)
      .eq("is_default", true)
      .single()

    let dealsPipelineId = defaultDealsPipeline?.id || null
    let dealsStageId: string | null = null

    if (defaultDealsPipeline?.stages) {
      const stages = defaultDealsPipeline.stages as { id: string; position: number }[]
      const sortedStages = stages.sort((a, b) => a.position - b.position)
      dealsStageId = sortedStages[0]?.id || null
    }

    // Fetch data from CRM based on provider
    if (provider === "close") {
      const client = new CloseClient(apiKey)
      await importFromClose(client, adminSupabase, workspaceId, user.id, options, result, leadPipelineId, leadStageId, dealsPipelineId, dealsStageId)
    } else if (provider === "pipedrive") {
      const client = new PipedriveClient(apiKey)
      await importFromPipedrive(client, adminSupabase, workspaceId, user.id, options, result, leadPipelineId, leadStageId, dealsPipelineId, dealsStageId)
    } else if (provider === "hubspot") {
      const client = new HubSpotClient(apiKey)
      await importFromHubSpot(client, adminSupabase, workspaceId, user.id, options, result, leadPipelineId, leadStageId, dealsPipelineId, dealsStageId)
    } else if (provider === "freshsales") {
      const client = new FreshsalesClient(apiKey)
      await importFromFreshsales(client, adminSupabase, workspaceId, user.id, options, result, leadPipelineId, leadStageId, dealsPipelineId, dealsStageId)
    }

    // Update last sync time
    await supabase
      .from("crm_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)

    return NextResponse.json(result)
  } catch (error) {
    console.error("CRM import error:", error)
    result.errors.push("Import failed: " + (error instanceof Error ? error.message : "Unknown error"))
    return NextResponse.json(result, { status: 500 })
  }
}

/**
 * Import data from Close CRM
 */
async function importFromClose(
  client: CloseClient,
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  userId: string,
  options: CRMImportOptions,
  result: CRMImportResult,
  leadPipelineId: string | null,
  leadStageId: string | null,
  dealsPipelineId: string | null,
  dealsStageId: string | null
) {
  // Build a map of lead IDs to names for contact/opportunity linking
  const leadIdToName = new Map<string, string>()
  const importedLeadNames = new Map<string, string>() // Close lead name -> DreamTeam lead ID
  const importedLeadCloseIds = new Set<string>() // Track Close lead IDs for filtering contacts/opportunities

  const importLimit = options.filters?.limit || 0
  const createdAfterDate = options.filters?.createdAfter ? new Date(options.filters.createdAfter) : null

  // Fetch leads with early termination if limit is set (fetch extra to account for date filtering)
  // If date filter is set, we need to fetch more since some may be filtered out
  const fetchLimit = createdAfterDate ? 0 : importLimit
  let closeLeads = await client.fetchLeads(100, fetchLimit)

  // Apply date filter to leads
  if (createdAfterDate) {
    closeLeads = closeLeads.filter((lead) => {
      if (!lead.date_created) return false
      return new Date(lead.date_created) >= createdAfterDate
    })
  }

  // Apply limit filter to leads
  if (importLimit > 0 && closeLeads.length > importLimit) {
    closeLeads = closeLeads.slice(0, importLimit)
  }

  // Build the ID map from filtered leads and track Close lead IDs
  closeLeads.forEach((lead) => {
    leadIdToName.set(lead.id, lead.display_name)
    importedLeadCloseIds.add(lead.id)
  })

  // Import leads if requested
  if (options.leads) {
    const transformedLeads = client.transformLeads(closeLeads)

    // Get existing leads for duplicate detection
    let existingLeads: ExistingLead[] = []
    if (options.skipDuplicates) {
      const { data } = await supabase
        .from("leads")
        .select("id, name, website")
        .eq("workspace_id", workspaceId)

      existingLeads = (data || []).map((l: { id: string; name: string | null; website: string | null }) => ({
        id: l.id,
        name: l.name || "",
        website: l.website,
      }))
    }

    // Insert leads in batches
    const BATCH_SIZE = 100
    for (let i = 0; i < transformedLeads.length; i += BATCH_SIZE) {
      const batch = transformedLeads.slice(i, i + BATCH_SIZE)

      const leadsToInsert = batch
        .filter((lead) => {
          if (!lead.name) return false
          if (options.skipDuplicates) {
            const dup = checkLeadDuplicate({ name: lead.name, website: lead.website }, existingLeads)
            if (dup.isDuplicate) {
              result.leads.skipped++
              return false
            }
          }
          return true
        })
        .map((lead) => ({
          user_id: userId,
          workspace_id: workspaceId,
          name: lead.name,
          website: lead.website,
          notes: lead.description,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          postal_code: lead.zip_code,
          country: lead.country,
          source: "close_import",
          pipeline_id: leadPipelineId,
          stage_id: leadStageId,
        }))

      if (leadsToInsert.length > 0) {
        const { data, error } = await supabase.from("leads").insert(leadsToInsert).select("id, name")

        if (error) {
          result.errors.push(`Lead batch error: ${error.message}`)
          result.leads.failed += leadsToInsert.length
        } else {
          result.leads.imported += data?.length || 0
          // Map imported lead names to their IDs
          data?.forEach((l: { id: string; name: string | null }) => {
            if (l.name) importedLeadNames.set(l.name, l.id)
          })
        }
      }
    }
  }

  // Import contacts - use embedded contacts from leads we already fetched
  // This ensures we only import contacts belonging to the imported leads
  if (options.contacts) {
    // Extract contacts embedded in the leads we already fetched
    // This avoids fetching ALL contacts and ensures proper filtering
    let closeContacts = client.extractContactsFromLeads(closeLeads)

    // Apply date filter to contacts
    if (createdAfterDate) {
      closeContacts = closeContacts.filter((contact) => {
        if (!contact.date_created) return false
        return new Date(contact.date_created) >= createdAfterDate
      })
    }

    const transformedContacts = client.transformContacts(closeContacts, leadIdToName)

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedContacts.length; i += BATCH_SIZE) {
      const batch = transformedContacts.slice(i, i + BATCH_SIZE)

      const contactsToInsert = batch
        .filter((c) => c.first_name || c.last_name)
        .map((contact) => {
          // Try to find the lead ID
          const leadId = importedLeadNames.get(contact.lead_name) || null

          // Note: contacts table links to leads via lead_id
          // user_id/workspace_id are on the leads table, not contacts
          return {
            lead_id: leadId,
            first_name: contact.first_name || "",
            last_name: contact.last_name || "",
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
          }
        })
        // Only insert contacts that have a valid lead_id
        .filter((c) => c.lead_id !== null)

      if (contactsToInsert.length > 0) {
        const { data, error } = await supabase.from("contacts").insert(contactsToInsert).select("id")

        if (error) {
          result.errors.push(`Contact batch error: ${error.message}`)
          result.contacts.failed += contactsToInsert.length
        } else {
          result.contacts.imported += data?.length || 0
        }
      }
    }
  }

  // Import opportunities as deals - only for the leads we're importing
  if (options.opportunities) {
    let closeOpportunities = await client.fetchOpportunities()

    // Filter to only opportunities belonging to our imported leads
    closeOpportunities = closeOpportunities.filter((opp) =>
      importedLeadCloseIds.has(opp.lead_id)
    )

    // Apply date filter to opportunities
    if (createdAfterDate) {
      closeOpportunities = closeOpportunities.filter((opp) => {
        if (!opp.date_created) return false
        return new Date(opp.date_created) >= createdAfterDate
      })
    }

    // Apply status filter to opportunities
    const statusFilter = options.filters?.opportunityStatuses
    if (statusFilter && statusFilter.length > 0) {
      closeOpportunities = closeOpportunities.filter((opp) => {
        return statusFilter.includes(opp.status_type || "active")
      })
    }

    const transformedOpportunities = client.transformOpportunities(closeOpportunities, leadIdToName)

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedOpportunities.length; i += BATCH_SIZE) {
      const batch = transformedOpportunities.slice(i, i + BATCH_SIZE)

      // Map CRM opportunities to lead_opportunities table
      // This links opportunities to leads and shows them in /sales/opportunities
      const opportunitiesToInsert = batch
        .filter((o) => o.name)
        .map((opp) => {
          // Get the DreamTeam lead ID from the imported leads
          const leadId = importedLeadNames.get(opp.lead_name) || null

          return {
            lead_id: leadId,
            user_id: userId,
            workspace_id: workspaceId,
            name: opp.name,
            value: opp.value,
            probability: opp.probability || 0,
            status: opp.status || "active", // "active", "won", "lost"
            stage: "prospect", // Default stage
            value_type: "one_time",
            expected_close_date: opp.expected_close_date,
            notes: `Imported from Close CRM`,
          }
        })
        // Only insert opportunities that have a valid lead_id
        .filter((o) => o.lead_id !== null)

      if (opportunitiesToInsert.length > 0) {
        const { data, error } = await supabase.from("lead_opportunities").insert(opportunitiesToInsert).select("id")

        if (error) {
          result.errors.push(`Opportunity batch error: ${error.message}`)
          result.opportunities.failed += opportunitiesToInsert.length
        } else {
          result.opportunities.imported += data?.length || 0
        }
      }
    }
  }
}

/**
 * Import data from Pipedrive
 */
async function importFromPipedrive(
  client: PipedriveClient,
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  userId: string,
  options: CRMImportOptions,
  result: CRMImportResult,
  leadPipelineId: string | null,
  leadStageId: string | null,
  dealsPipelineId: string | null,
  dealsStageId: string | null
) {
  // Build maps for linking
  const orgIdToName = new Map<number, string>()
  const importedLeadNames = new Map<string, string>() // Org name -> DreamTeam lead ID

  // Filter settings
  const importLimit = options.filters?.limit || 0
  const createdAfterDate = options.filters?.createdAfter ? new Date(options.filters.createdAfter) : null

  // Import organizations as leads
  if (options.leads) {
    let orgs = await client.fetchOrganizations()

    // Apply date filter
    if (createdAfterDate) {
      orgs = orgs.filter((org) => {
        if (!org.add_time) return false
        return new Date(org.add_time) >= createdAfterDate
      })
    }

    // Apply limit filter
    if (importLimit > 0 && orgs.length > importLimit) {
      orgs = orgs.slice(0, importLimit)
    }

    const transformedLeads = client.transformOrganizations(orgs)

    // Build the ID map from filtered orgs
    orgs.forEach((org) => {
      orgIdToName.set(org.id, org.name)
    })

    // Get existing leads for duplicate detection
    let existingLeads: ExistingLead[] = []
    if (options.skipDuplicates) {
      const { data } = await supabase
        .from("leads")
        .select("id, name, website")
        .eq("workspace_id", workspaceId)

      existingLeads = (data || []).map((l: { id: string; name: string | null; website: string | null }) => ({
        id: l.id,
        name: l.name || "",
        website: l.website,
      }))
    }

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedLeads.length; i += BATCH_SIZE) {
      const batch = transformedLeads.slice(i, i + BATCH_SIZE)

      const leadsToInsert = batch
        .filter((lead) => {
          if (!lead.name) return false
          if (options.skipDuplicates) {
            const dup = checkLeadDuplicate({ name: lead.name, website: lead.website }, existingLeads)
            if (dup.isDuplicate) {
              result.leads.skipped++
              return false
            }
          }
          return true
        })
        .map((lead) => ({
          user_id: userId,
          workspace_id: workspaceId,
          name: lead.name,
          website: lead.website,
          address: lead.address,
          source: "pipedrive_import",
          pipeline_id: leadPipelineId,
          stage_id: leadStageId,
        }))

      if (leadsToInsert.length > 0) {
        const { data, error } = await supabase.from("leads").insert(leadsToInsert).select("id, name")

        if (error) {
          result.errors.push(`Lead batch error: ${error.message}`)
          result.leads.failed += leadsToInsert.length
        } else {
          result.leads.imported += data?.length || 0
          data?.forEach((l: { id: string; name: string | null }) => {
            if (l.name) importedLeadNames.set(l.name, l.id)
          })
        }
      }
    }
  }

  // Import persons as contacts - contacts link to leads via lead_id
  if (options.contacts) {
    let persons = await client.fetchPersons()

    // Apply date filter
    if (createdAfterDate) {
      persons = persons.filter((person) => {
        if (!person.add_time) return false
        return new Date(person.add_time) >= createdAfterDate
      })
    }

    const transformedContacts = client.transformPersons(persons, orgIdToName)

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedContacts.length; i += BATCH_SIZE) {
      const batch = transformedContacts.slice(i, i + BATCH_SIZE)

      const contactsToInsert = batch
        .filter((c) => c.first_name || c.last_name)
        .map((contact) => {
          const leadId = importedLeadNames.get(contact.lead_name) || null

          // Note: contacts table links to leads via lead_id
          // user_id/workspace_id are on the leads table, not contacts
          return {
            lead_id: leadId,
            first_name: contact.first_name || "",
            last_name: contact.last_name || "",
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
          }
        })
        // Only insert contacts that have a valid lead_id
        .filter((c) => c.lead_id !== null)

      if (contactsToInsert.length > 0) {
        const { data, error } = await supabase.from("contacts").insert(contactsToInsert).select("id")

        if (error) {
          result.errors.push(`Contact batch error: ${error.message}`)
          result.contacts.failed += contactsToInsert.length
        } else {
          result.contacts.imported += data?.length || 0
        }
      }
    }
  }

  // Import deals as deals table
  if (options.opportunities) {
    let pipedriveDeals = await client.fetchDeals()

    // Apply date filter
    if (createdAfterDate) {
      pipedriveDeals = pipedriveDeals.filter((deal) => {
        if (!deal.add_time) return false
        return new Date(deal.add_time) >= createdAfterDate
      })
    }

    // Apply status filter to deals (Pipedrive uses 'open' instead of 'active')
    const statusFilter = options.filters?.opportunityStatuses
    if (statusFilter && statusFilter.length > 0) {
      pipedriveDeals = pipedriveDeals.filter((deal) => {
        // Map Pipedrive 'open' to our 'active'
        const dealStatus = deal.status === "open" ? "active" : deal.status || "active"
        return statusFilter.includes(dealStatus)
      })
    }

    const transformedOpportunities = client.transformDeals(pipedriveDeals, orgIdToName)

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedOpportunities.length; i += BATCH_SIZE) {
      const batch = transformedOpportunities.slice(i, i + BATCH_SIZE)

      // Map CRM opportunities to lead_opportunities table
      const opportunitiesToInsert = batch
        .filter((o) => o.name)
        .map((opp) => {
          const leadId = importedLeadNames.get(opp.lead_name) || null

          return {
            lead_id: leadId,
            user_id: userId,
            workspace_id: workspaceId,
            name: opp.name,
            value: opp.value,
            probability: opp.probability || 0,
            status: opp.status || "active",
            stage: "prospect",
            value_type: "one_time",
            expected_close_date: opp.expected_close_date,
            notes: `Imported from Pipedrive`,
          }
        })
        .filter((o) => o.lead_id !== null)

      if (opportunitiesToInsert.length > 0) {
        const { data, error } = await supabase.from("lead_opportunities").insert(opportunitiesToInsert).select("id")

        if (error) {
          result.errors.push(`Opportunity batch error: ${error.message}`)
          result.opportunities.failed += opportunitiesToInsert.length
        } else {
          result.opportunities.imported += data?.length || 0
        }
      }
    }
  }
}

/**
 * Import data from HubSpot
 */
async function importFromHubSpot(
  client: HubSpotClient,
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  userId: string,
  options: CRMImportOptions,
  result: CRMImportResult,
  leadPipelineId: string | null,
  leadStageId: string | null,
  dealsPipelineId: string | null,
  dealsStageId: string | null
) {
  // Build maps for linking
  const companyIdToName = new Map<string, string>()
  const importedLeadNames = new Map<string, string>()

  // Filter settings
  const importLimit = options.filters?.limit || 0
  const createdAfterDate = options.filters?.createdAfter ? new Date(options.filters.createdAfter) : null

  // Import companies as leads
  if (options.leads) {
    let companies = await client.fetchCompanies()

    // Apply date filter
    if (createdAfterDate) {
      companies = companies.filter((company) => {
        const createDate = company.properties.createdate || company.createdAt
        if (!createDate) return false
        return new Date(createDate) >= createdAfterDate
      })
    }

    // Apply limit filter
    if (importLimit > 0 && companies.length > importLimit) {
      companies = companies.slice(0, importLimit)
    }

    // Build ID map
    companies.forEach((company) => {
      companyIdToName.set(company.id, company.properties.name || `Company ${company.id}`)
    })

    const transformedLeads = client.transformCompanies(companies)

    // Get existing leads for duplicate detection
    let existingLeads: ExistingLead[] = []
    if (options.skipDuplicates) {
      const { data } = await supabase
        .from("leads")
        .select("id, name, website")
        .eq("workspace_id", workspaceId)

      existingLeads = (data || []).map((l: { id: string; name: string | null; website: string | null }) => ({
        id: l.id,
        name: l.name || "",
        website: l.website,
      }))
    }

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedLeads.length; i += BATCH_SIZE) {
      const batch = transformedLeads.slice(i, i + BATCH_SIZE)

      const leadsToInsert = batch
        .filter((lead) => {
          if (!lead.name) return false
          if (options.skipDuplicates) {
            const dup = checkLeadDuplicate({ name: lead.name, website: lead.website }, existingLeads)
            if (dup.isDuplicate) {
              result.leads.skipped++
              return false
            }
          }
          return true
        })
        .map((lead) => ({
          user_id: userId,
          workspace_id: workspaceId,
          name: lead.name,
          website: lead.website,
          notes: lead.description,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          postal_code: lead.zip_code,
          country: lead.country,
          source: "hubspot_import",
          pipeline_id: leadPipelineId,
          stage_id: leadStageId,
        }))

      if (leadsToInsert.length > 0) {
        const { data, error } = await supabase.from("leads").insert(leadsToInsert).select("id, name")

        if (error) {
          result.errors.push(`Lead batch error: ${error.message}`)
          result.leads.failed += leadsToInsert.length
        } else {
          result.leads.imported += data?.length || 0
          data?.forEach((l: { id: string; name: string | null }) => {
            if (l.name) importedLeadNames.set(l.name, l.id)
          })
        }
      }
    }
  }

  // Import contacts - contacts link to leads via lead_id
  if (options.contacts) {
    let contacts = await client.fetchContacts()

    // Apply date filter
    if (createdAfterDate) {
      contacts = contacts.filter((contact) => {
        const createDate = contact.properties.createdate || contact.createdAt
        if (!createDate) return false
        return new Date(createDate) >= createdAfterDate
      })
    }

    const transformedContacts = client.transformContacts(contacts, companyIdToName)

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedContacts.length; i += BATCH_SIZE) {
      const batch = transformedContacts.slice(i, i + BATCH_SIZE)

      const contactsToInsert = batch
        .filter((c) => c.first_name || c.last_name)
        .map((contact) => {
          const leadId = importedLeadNames.get(contact.lead_name) || null

          // Note: contacts table links to leads via lead_id
          // user_id/workspace_id are on the leads table, not contacts
          return {
            lead_id: leadId,
            first_name: contact.first_name || "",
            last_name: contact.last_name || "",
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
          }
        })
        // Only insert contacts that have a valid lead_id
        .filter((c) => c.lead_id !== null)

      if (contactsToInsert.length > 0) {
        const { data, error } = await supabase.from("contacts").insert(contactsToInsert).select("id")

        if (error) {
          result.errors.push(`Contact batch error: ${error.message}`)
          result.contacts.failed += contactsToInsert.length
        } else {
          result.contacts.imported += data?.length || 0
        }
      }
    }
  }

  // Import deals as deals table
  if (options.opportunities) {
    let hubspotDeals = await client.fetchDeals()

    // Apply date filter
    if (createdAfterDate) {
      hubspotDeals = hubspotDeals.filter((deal) => {
        const createDate = deal.properties.createdate || deal.createdAt
        if (!createDate) return false
        return new Date(createDate) >= createdAfterDate
      })
    }

    // Apply status filter
    const statusFilter = options.filters?.opportunityStatuses
    if (statusFilter && statusFilter.length > 0) {
      hubspotDeals = hubspotDeals.filter((deal) => {
        const stage = deal.properties.dealstage?.toLowerCase() || ""
        let status = "active"
        if (stage.includes("won") || stage.includes("closed won")) {
          status = "won"
        } else if (stage.includes("lost") || stage.includes("closed lost")) {
          status = "lost"
        }
        return statusFilter.includes(status)
      })
    }

    const transformedOpportunities = client.transformDeals(hubspotDeals, companyIdToName)

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedOpportunities.length; i += BATCH_SIZE) {
      const batch = transformedOpportunities.slice(i, i + BATCH_SIZE)

      // Map CRM opportunities to lead_opportunities table
      const opportunitiesToInsert = batch
        .filter((o) => o.name)
        .map((opp) => {
          const leadId = importedLeadNames.get(opp.lead_name) || null

          return {
            lead_id: leadId,
            user_id: userId,
            workspace_id: workspaceId,
            name: opp.name,
            value: opp.value,
            probability: opp.probability || 0,
            status: opp.status || "active",
            stage: "prospect",
            value_type: "one_time",
            expected_close_date: opp.expected_close_date,
            notes: `Imported from HubSpot`,
          }
        })
        .filter((o) => o.lead_id !== null)

      if (opportunitiesToInsert.length > 0) {
        const { data, error } = await supabase.from("lead_opportunities").insert(opportunitiesToInsert).select("id")

        if (error) {
          result.errors.push(`Opportunity batch error: ${error.message}`)
          result.opportunities.failed += opportunitiesToInsert.length
        } else {
          result.opportunities.imported += data?.length || 0
        }
      }
    }
  }
}

/**
 * Import data from Freshsales
 */
async function importFromFreshsales(
  client: FreshsalesClient,
  supabase: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  userId: string,
  options: CRMImportOptions,
  result: CRMImportResult,
  leadPipelineId: string | null,
  leadStageId: string | null,
  dealsPipelineId: string | null,
  dealsStageId: string | null
) {
  // Build maps for linking
  const accountIdToName = new Map<number, string>()
  const importedLeadNames = new Map<string, string>()

  // Filter settings
  const importLimit = options.filters?.limit || 0
  const createdAfterDate = options.filters?.createdAfter ? new Date(options.filters.createdAfter) : null

  // Import accounts as leads
  if (options.leads) {
    let accounts = await client.fetchAccounts()

    // Apply date filter
    if (createdAfterDate) {
      accounts = accounts.filter((account) => {
        if (!account.created_at) return false
        return new Date(account.created_at) >= createdAfterDate
      })
    }

    // Apply limit filter
    if (importLimit > 0 && accounts.length > importLimit) {
      accounts = accounts.slice(0, importLimit)
    }

    // Build ID map
    accounts.forEach((account) => {
      accountIdToName.set(account.id, account.name)
    })

    const transformedLeads = client.transformAccounts(accounts)

    // Get existing leads for duplicate detection
    let existingLeads: ExistingLead[] = []
    if (options.skipDuplicates) {
      const { data } = await supabase
        .from("leads")
        .select("id, name, website")
        .eq("workspace_id", workspaceId)

      existingLeads = (data || []).map((l: { id: string; name: string | null; website: string | null }) => ({
        id: l.id,
        name: l.name || "",
        website: l.website,
      }))
    }

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedLeads.length; i += BATCH_SIZE) {
      const batch = transformedLeads.slice(i, i + BATCH_SIZE)

      const leadsToInsert = batch
        .filter((lead) => {
          if (!lead.name) return false
          if (options.skipDuplicates) {
            const dup = checkLeadDuplicate({ name: lead.name, website: lead.website }, existingLeads)
            if (dup.isDuplicate) {
              result.leads.skipped++
              return false
            }
          }
          return true
        })
        .map((lead) => ({
          user_id: userId,
          workspace_id: workspaceId,
          name: lead.name,
          website: lead.website,
          notes: lead.description,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          postal_code: lead.zip_code,
          country: lead.country,
          source: "freshsales_import",
          pipeline_id: leadPipelineId,
          stage_id: leadStageId,
        }))

      if (leadsToInsert.length > 0) {
        const { data, error } = await supabase.from("leads").insert(leadsToInsert).select("id, name")

        if (error) {
          result.errors.push(`Lead batch error: ${error.message}`)
          result.leads.failed += leadsToInsert.length
        } else {
          result.leads.imported += data?.length || 0
          data?.forEach((l: { id: string; name: string | null }) => {
            if (l.name) importedLeadNames.set(l.name, l.id)
          })
        }
      }
    }
  }

  // Import contacts - contacts link to leads via lead_id
  if (options.contacts) {
    let contacts = await client.fetchContacts()

    // Apply date filter
    if (createdAfterDate) {
      contacts = contacts.filter((contact) => {
        if (!contact.created_at) return false
        return new Date(contact.created_at) >= createdAfterDate
      })
    }

    const transformedContacts = client.transformContacts(contacts, accountIdToName)

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedContacts.length; i += BATCH_SIZE) {
      const batch = transformedContacts.slice(i, i + BATCH_SIZE)

      const contactsToInsert = batch
        .filter((c) => c.first_name || c.last_name)
        .map((contact) => {
          const leadId = importedLeadNames.get(contact.lead_name) || null

          // Note: contacts table links to leads via lead_id
          // user_id/workspace_id are on the leads table, not contacts
          return {
            lead_id: leadId,
            first_name: contact.first_name || "",
            last_name: contact.last_name || "",
            email: contact.email,
            phone: contact.phone,
            title: contact.title,
          }
        })
        // Only insert contacts that have a valid lead_id
        .filter((c) => c.lead_id !== null)

      if (contactsToInsert.length > 0) {
        const { data, error } = await supabase.from("contacts").insert(contactsToInsert).select("id")

        if (error) {
          result.errors.push(`Contact batch error: ${error.message}`)
          result.contacts.failed += contactsToInsert.length
        } else {
          result.contacts.imported += data?.length || 0
        }
      }
    }
  }

  // Import deals as deals table
  if (options.opportunities) {
    let freshsalesDeals = await client.fetchDeals()

    // Apply date filter
    if (createdAfterDate) {
      freshsalesDeals = freshsalesDeals.filter((deal) => {
        if (!deal.created_at) return false
        return new Date(deal.created_at) >= createdAfterDate
      })
    }

    // Apply status filter
    const statusFilter = options.filters?.opportunityStatuses
    if (statusFilter && statusFilter.length > 0) {
      freshsalesDeals = freshsalesDeals.filter((deal) => {
        const stageName = deal.deal_stage?.name?.toLowerCase() || ""
        let status = "active"
        if (stageName.includes("won") || stageName.includes("closed won")) {
          status = "won"
        } else if (stageName.includes("lost") || stageName.includes("closed lost")) {
          status = "lost"
        }
        return statusFilter.includes(status)
      })
    }

    const transformedOpportunities = client.transformDeals(freshsalesDeals, accountIdToName)

    const BATCH_SIZE = 100
    for (let i = 0; i < transformedOpportunities.length; i += BATCH_SIZE) {
      const batch = transformedOpportunities.slice(i, i + BATCH_SIZE)

      // Map CRM opportunities to lead_opportunities table
      const opportunitiesToInsert = batch
        .filter((o) => o.name)
        .map((opp) => {
          const leadId = importedLeadNames.get(opp.lead_name) || null

          return {
            lead_id: leadId,
            user_id: userId,
            workspace_id: workspaceId,
            name: opp.name,
            value: opp.value,
            probability: opp.probability || 0,
            status: opp.status || "active",
            stage: "prospect",
            value_type: "one_time",
            expected_close_date: opp.expected_close_date,
            notes: `Imported from Freshsales`,
          }
        })
        .filter((o) => o.lead_id !== null)

      if (opportunitiesToInsert.length > 0) {
        const { data, error } = await supabase.from("lead_opportunities").insert(opportunitiesToInsert).select("id")

        if (error) {
          result.errors.push(`Opportunity batch error: ${error.message}`)
          result.opportunities.failed += opportunitiesToInsert.length
        } else {
          result.opportunities.imported += data?.length || 0
        }
      }
    }
  }
}
