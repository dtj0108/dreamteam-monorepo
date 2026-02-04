/**
 * Close CRM API Client
 * Documentation: https://developer.close.com/
 */

export interface CloseLeadRaw {
  id: string
  display_name: string
  url?: string
  description?: string
  status_label?: string
  addresses?: Array<{
    address_1?: string
    address_2?: string
    city?: string
    state?: string
    zipcode?: string
    country?: string
  }>
  contacts?: CloseContactRaw[]
  opportunities?: CloseOpportunityRaw[]
  created_by?: string
  date_created?: string
}

export interface CloseContactRaw {
  id: string
  lead_id: string
  name?: string
  title?: string
  emails?: Array<{ email: string; type?: string }>
  phones?: Array<{ phone: string; type?: string }>
  date_created?: string
}

export interface CloseOpportunityRaw {
  id: string
  lead_id: string
  lead_name?: string
  note?: string
  value?: number
  value_period?: string
  confidence?: number
  status_type?: string // 'active' | 'won' | 'lost'
  status_label?: string
  date_created?: string
  date_won?: string
  date_lost?: string
}

export interface CloseDataCounts {
  leads: number
  contacts: number
  opportunities: number
}

export interface TransformedLead {
  name: string
  website: string | null
  description: string | null
  status: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country: string | null
}

export interface TransformedContact {
  lead_name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  title: string | null
}

export interface TransformedOpportunity {
  lead_name: string
  name: string
  value: number | null
  probability: number | null
  status: string
  expected_close_date: string | null
}

/**
 * Close API Client
 */
export class CloseClient {
  private apiKey: string
  private baseUrl = "https://api.close.com/api/v1"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.apiKey}:`).toString("base64")}`
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Close API error: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get counts of all data types
   * Note: Close may return 0 for contacts if they're embedded in leads
   */
  async getCounts(): Promise<CloseDataCounts> {
    // Close API uses _limit=0 to get just the total count
    const [leads, contacts, opportunities] = await Promise.all([
      this.fetch<{ total_results?: number }>("/lead/", { _limit: "0" }),
      this.fetch<{ total_results?: number }>("/contact/", { _limit: "0" }),
      this.fetch<{ total_results?: number }>("/opportunity/", { _limit: "0" }),
    ])

    return {
      leads: leads.total_results ?? 0,
      contacts: contacts.total_results ?? 0,
      opportunities: opportunities.total_results ?? 0,
    }
  }

  /**
   * Get counts including embedded contacts from leads
   * This fetches all leads and counts their embedded contacts
   */
  async getCountsWithEmbeddedContacts(): Promise<CloseDataCounts> {
    const baseCounts = await this.getCounts()

    // If contacts endpoint returned 0, count embedded contacts from leads
    if (baseCounts.contacts === 0 && baseCounts.leads > 0) {
      const leads = await this.fetchLeads()
      const embeddedContacts = this.extractContactsFromLeads(leads)
      return {
        ...baseCounts,
        contacts: embeddedContacts.length,
      }
    }

    return baseCounts
  }

  /**
   * Extract contacts embedded within leads
   * Use this as fallback if /contact/ endpoint returns 0
   */
  extractContactsFromLeads(leads: CloseLeadRaw[]): CloseContactRaw[] {
    const allContacts: CloseContactRaw[] = []
    for (const lead of leads) {
      if (lead.contacts && lead.contacts.length > 0) {
        for (const contact of lead.contacts) {
          allContacts.push({
            ...contact,
            lead_id: lead.id, // Ensure lead_id is set
          })
        }
      }
    }
    return allContacts
  }

  /**
   * Fetch leads with pagination
   * @param pageSize - Number of records per API request (default 100)
   * @param maxRecords - Maximum total records to fetch (0 = unlimited)
   */
  async fetchLeads(pageSize = 100, maxRecords = 0): Promise<CloseLeadRaw[]> {
    const allLeads: CloseLeadRaw[] = []
    let skip = 0
    let hasMore = true

    while (hasMore) {
      const response = await this.fetch<{ data: CloseLeadRaw[]; has_more: boolean }>("/lead/", {
        _limit: String(pageSize),
        _skip: String(skip),
      })

      allLeads.push(...response.data)
      hasMore = response.has_more
      skip += pageSize

      // Early termination if we have enough records
      if (maxRecords > 0 && allLeads.length >= maxRecords) {
        break
      }
    }

    return allLeads
  }

  /**
   * Fetch all contacts with pagination
   */
  async fetchContacts(limit = 100): Promise<CloseContactRaw[]> {
    const allContacts: CloseContactRaw[] = []
    let skip = 0
    let hasMore = true

    while (hasMore) {
      const response = await this.fetch<{ data: CloseContactRaw[]; has_more: boolean }>("/contact/", {
        _limit: String(limit),
        _skip: String(skip),
      })

      allContacts.push(...response.data)
      hasMore = response.has_more
      skip += limit
    }

    return allContacts
  }

  /**
   * Fetch all opportunities with pagination
   */
  async fetchOpportunities(limit = 100): Promise<CloseOpportunityRaw[]> {
    const allOpportunities: CloseOpportunityRaw[] = []
    let skip = 0
    let hasMore = true

    while (hasMore) {
      const response = await this.fetch<{ data: CloseOpportunityRaw[]; has_more: boolean }>("/opportunity/", {
        _limit: String(limit),
        _skip: String(skip),
      })

      allOpportunities.push(...response.data)
      hasMore = response.has_more
      skip += limit
    }

    return allOpportunities
  }

  /**
   * Transform Close leads to DreamTeam format
   */
  transformLeads(leads: CloseLeadRaw[]): TransformedLead[] {
    return leads.map((lead) => {
      const address = lead.addresses?.[0]
      return {
        name: lead.display_name,
        website: lead.url || null,
        description: lead.description || null,
        status: lead.status_label || null,
        address: address?.address_1 || null,
        city: address?.city || null,
        state: address?.state || null,
        zip_code: address?.zipcode || null,
        country: address?.country || null,
      }
    })
  }

  /**
   * Transform Close contacts to DreamTeam format
   */
  transformContacts(contacts: CloseContactRaw[], leadMap: Map<string, string>): TransformedContact[] {
    return contacts.map((contact) => {
      const nameParts = (contact.name || "").split(" ")
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || ""

      return {
        lead_name: leadMap.get(contact.lead_id) || "",
        first_name: firstName,
        last_name: lastName,
        email: contact.emails?.[0]?.email || null,
        phone: contact.phones?.[0]?.phone || null,
        title: contact.title || null,
      }
    })
  }

  /**
   * Transform Close opportunities to DreamTeam format
   */
  transformOpportunities(opportunities: CloseOpportunityRaw[], leadMap: Map<string, string>): TransformedOpportunity[] {
    return opportunities.map((opp) => {
      // Map Close status_type to DreamTeam status
      let status = "active"
      if (opp.status_type === "won") status = "won"
      else if (opp.status_type === "lost") status = "lost"

      return {
        lead_name: leadMap.get(opp.lead_id) || opp.lead_name || "",
        name: opp.note || `Opportunity ${opp.id.slice(-6)}`,
        value: opp.value ? opp.value / 100 : null, // Close stores value in cents
        probability: opp.confidence || null,
        status,
        expected_close_date: opp.date_won || opp.date_lost || null,
      }
    })
  }
}
