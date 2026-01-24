/**
 * HubSpot CRM API Client
 * Documentation: https://developers.hubspot.com/docs/api/crm
 */

export interface HubSpotCompanyRaw {
  id: string
  properties: {
    name?: string
    domain?: string
    description?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    createdate?: string
    hs_lead_status?: string
  }
  createdAt: string
  updatedAt: string
}

export interface HubSpotContactRaw {
  id: string
  properties: {
    firstname?: string
    lastname?: string
    email?: string
    phone?: string
    jobtitle?: string
    company?: string
    associatedcompanyid?: string
    createdate?: string
  }
  createdAt: string
  updatedAt: string
}

export interface HubSpotDealRaw {
  id: string
  properties: {
    dealname?: string
    amount?: string
    dealstage?: string
    pipeline?: string
    closedate?: string
    createdate?: string
    hs_deal_stage_probability?: string
  }
  createdAt: string
  updatedAt: string
  associations?: {
    companies?: { results: Array<{ id: string }> }
  }
}

export interface HubSpotDataCounts {
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
 * HubSpot API Client
 */
export class HubSpotClient {
  private accessToken: string
  private baseUrl = "https://api.hubapi.com"

  constructor(accessToken: string) {
    this.accessToken = accessToken
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
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get counts of all data types
   */
  async getCounts(): Promise<HubSpotDataCounts> {
    // HubSpot doesn't have a direct count endpoint, so we fetch with limit=0
    // and use the total from the response
    const [companies, contacts, deals] = await Promise.all([
      this.fetch<{ total: number }>("/crm/v3/objects/companies", { limit: "1" }),
      this.fetch<{ total: number }>("/crm/v3/objects/contacts", { limit: "1" }),
      this.fetch<{ total: number }>("/crm/v3/objects/deals", { limit: "1" }),
    ])

    return {
      leads: companies.total || 0,
      contacts: contacts.total || 0,
      opportunities: deals.total || 0,
    }
  }

  /**
   * Fetch all companies with pagination
   */
  async fetchCompanies(limit = 100): Promise<HubSpotCompanyRaw[]> {
    const allCompanies: HubSpotCompanyRaw[] = []
    let after: string | undefined

    const properties = "name,domain,description,address,city,state,zip,country,createdate,hs_lead_status"

    while (true) {
      const params: Record<string, string> = {
        limit: String(limit),
        properties,
      }
      if (after) {
        params.after = after
      }

      const response = await this.fetch<{
        results: HubSpotCompanyRaw[]
        paging?: { next?: { after: string } }
      }>("/crm/v3/objects/companies", params)

      allCompanies.push(...response.results)

      if (!response.paging?.next?.after) {
        break
      }
      after = response.paging.next.after
    }

    return allCompanies
  }

  /**
   * Fetch all contacts with pagination
   */
  async fetchContacts(limit = 100): Promise<HubSpotContactRaw[]> {
    const allContacts: HubSpotContactRaw[] = []
    let after: string | undefined

    const properties = "firstname,lastname,email,phone,jobtitle,company,associatedcompanyid,createdate"

    while (true) {
      const params: Record<string, string> = {
        limit: String(limit),
        properties,
      }
      if (after) {
        params.after = after
      }

      const response = await this.fetch<{
        results: HubSpotContactRaw[]
        paging?: { next?: { after: string } }
      }>("/crm/v3/objects/contacts", params)

      allContacts.push(...response.results)

      if (!response.paging?.next?.after) {
        break
      }
      after = response.paging.next.after
    }

    return allContacts
  }

  /**
   * Fetch all deals with pagination
   */
  async fetchDeals(limit = 100): Promise<HubSpotDealRaw[]> {
    const allDeals: HubSpotDealRaw[] = []
    let after: string | undefined

    const properties = "dealname,amount,dealstage,pipeline,closedate,createdate,hs_deal_stage_probability"

    while (true) {
      const params: Record<string, string> = {
        limit: String(limit),
        properties,
        associations: "companies",
      }
      if (after) {
        params.after = after
      }

      const response = await this.fetch<{
        results: HubSpotDealRaw[]
        paging?: { next?: { after: string } }
      }>("/crm/v3/objects/deals", params)

      allDeals.push(...response.results)

      if (!response.paging?.next?.after) {
        break
      }
      after = response.paging.next.after
    }

    return allDeals
  }

  /**
   * Transform HubSpot companies to DreamTeam leads
   */
  transformCompanies(companies: HubSpotCompanyRaw[]): TransformedLead[] {
    return companies.map((company) => ({
      name: company.properties.name || `Company ${company.id}`,
      website: company.properties.domain || null,
      description: company.properties.description || null,
      status: company.properties.hs_lead_status || null,
      address: company.properties.address || null,
      city: company.properties.city || null,
      state: company.properties.state || null,
      zip_code: company.properties.zip || null,
      country: company.properties.country || null,
    }))
  }

  /**
   * Transform HubSpot contacts to DreamTeam contacts
   */
  transformContacts(contacts: HubSpotContactRaw[], companyMap: Map<string, string>): TransformedContact[] {
    return contacts.map((contact) => {
      // Try to get company name from association or company property
      const companyId = contact.properties.associatedcompanyid
      const leadName = companyId ? companyMap.get(companyId) || "" : contact.properties.company || ""

      return {
        lead_name: leadName,
        first_name: contact.properties.firstname || "",
        last_name: contact.properties.lastname || "",
        email: contact.properties.email || null,
        phone: contact.properties.phone || null,
        title: contact.properties.jobtitle || null,
      }
    })
  }

  /**
   * Transform HubSpot deals to DreamTeam opportunities
   */
  transformDeals(deals: HubSpotDealRaw[], companyMap: Map<string, string>): TransformedOpportunity[] {
    return deals.map((deal) => {
      // Get company name from association
      const companyId = deal.associations?.companies?.results?.[0]?.id
      const leadName = companyId ? companyMap.get(companyId) || "" : ""

      // Map HubSpot deal stages to status
      // HubSpot stages are custom, but we can use common patterns
      const stage = deal.properties.dealstage?.toLowerCase() || ""
      let status = "active"
      if (stage.includes("won") || stage.includes("closed won")) {
        status = "won"
      } else if (stage.includes("lost") || stage.includes("closed lost")) {
        status = "lost"
      }

      return {
        lead_name: leadName,
        name: deal.properties.dealname || `Deal ${deal.id}`,
        value: deal.properties.amount ? parseFloat(deal.properties.amount) : null,
        probability: deal.properties.hs_deal_stage_probability
          ? parseFloat(deal.properties.hs_deal_stage_probability)
          : null,
        status,
        expected_close_date: deal.properties.closedate || null,
      }
    })
  }
}
