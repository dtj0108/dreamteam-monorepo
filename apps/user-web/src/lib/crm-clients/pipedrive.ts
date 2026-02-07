/**
 * Pipedrive CRM API Client
 * Documentation: https://developers.pipedrive.com/
 */

export interface PipedriveOrganizationRaw {
  id: number
  name: string
  address?: string
  address_formatted_address?: string
  address_route?: string
  address_subpremise?: string
  address_locality?: string
  address_admin_area_level_1?: string
  address_postal_code?: string
  address_country?: string
  cc_email?: string
  owner_id?: number
  add_time?: string
  update_time?: string
}

export interface PipedrivePersonRaw {
  id: number
  name: string
  org_id?: number | { value: number; name: string }
  email?: Array<{ value: string; primary: boolean }> | string
  phone?: Array<{ value: string; primary: boolean }> | string
  job_title?: string
  add_time?: string
}

export interface PipedriveDealRaw {
  id: number
  title: string
  value?: number
  currency?: string
  org_id?: number | { value: number; name: string }
  org_name?: string
  person_id?: number
  probability?: number
  status?: string // 'open' | 'won' | 'lost'
  expected_close_date?: string
  won_time?: string
  lost_time?: string
  add_time?: string
}

export interface PipedriveDataCounts {
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
 * Pipedrive API Client
 */
export class PipedriveClient {
  private apiToken: string
  private baseUrl = "https://api.pipedrive.com/v1"

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    url.searchParams.set("api_token", this.apiToken)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
    }

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.status}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(`Pipedrive API error: ${data.error || "Unknown error"}`)
    }

    return data
  }

  /**
   * Get counts of all data types
   */
  async getCounts(): Promise<PipedriveDataCounts> {
    const [orgs, persons, deals] = await Promise.all([
      this.fetch<{ data: unknown[]; additional_data?: { pagination?: { total_count: number } } }>("/organizations", { limit: "1" }),
      this.fetch<{ data: unknown[]; additional_data?: { pagination?: { total_count: number } } }>("/persons", { limit: "1" }),
      this.fetch<{ data: unknown[]; additional_data?: { pagination?: { total_count: number } } }>("/deals", { limit: "1" }),
    ])

    return {
      leads: orgs.additional_data?.pagination?.total_count || orgs.data?.length || 0,
      contacts: persons.additional_data?.pagination?.total_count || persons.data?.length || 0,
      opportunities: deals.additional_data?.pagination?.total_count || deals.data?.length || 0,
    }
  }

  /**
   * Fetch all organizations (leads) with pagination
   */
  async fetchOrganizations(limit = 100): Promise<PipedriveOrganizationRaw[]> {
    const allOrgs: PipedriveOrganizationRaw[] = []
    let start = 0
    let moreItems = true

    while (moreItems) {
      const response = await this.fetch<{
        data: PipedriveOrganizationRaw[] | null
        additional_data?: { pagination?: { more_items_in_collection: boolean } }
      }>("/organizations", {
        limit: String(limit),
        start: String(start),
      })

      if (response.data) {
        allOrgs.push(...response.data)
      }
      moreItems = response.additional_data?.pagination?.more_items_in_collection || false
      start += limit
    }

    return allOrgs
  }

  /**
   * Fetch all persons (contacts) with pagination
   */
  async fetchPersons(limit = 100): Promise<PipedrivePersonRaw[]> {
    const allPersons: PipedrivePersonRaw[] = []
    let start = 0
    let moreItems = true

    while (moreItems) {
      const response = await this.fetch<{
        data: PipedrivePersonRaw[] | null
        additional_data?: { pagination?: { more_items_in_collection: boolean } }
      }>("/persons", {
        limit: String(limit),
        start: String(start),
      })

      if (response.data) {
        allPersons.push(...response.data)
      }
      moreItems = response.additional_data?.pagination?.more_items_in_collection || false
      start += limit
    }

    return allPersons
  }

  /**
   * Fetch all deals (opportunities) with pagination
   */
  async fetchDeals(limit = 100): Promise<PipedriveDealRaw[]> {
    const allDeals: PipedriveDealRaw[] = []
    let start = 0
    let moreItems = true

    while (moreItems) {
      const response = await this.fetch<{
        data: PipedriveDealRaw[] | null
        additional_data?: { pagination?: { more_items_in_collection: boolean } }
      }>("/deals", {
        limit: String(limit),
        start: String(start),
      })

      if (response.data) {
        allDeals.push(...response.data)
      }
      moreItems = response.additional_data?.pagination?.more_items_in_collection || false
      start += limit
    }

    return allDeals
  }

  /**
   * Transform Pipedrive organizations to DreamTeam leads
   */
  transformOrganizations(orgs: PipedriveOrganizationRaw[]): TransformedLead[] {
    return orgs.map((org) => {
      // Try to parse address if available
      const address = org.address_formatted_address || org.address || null

      return {
        name: org.name,
        website: null, // Pipedrive doesn't have website on orgs by default
        description: null,
        status: null,
        address: address,
        city: org.address_locality || null,
        state: org.address_admin_area_level_1 || null,
        zip_code: org.address_postal_code || null,
        country: org.address_country || null,
      }
    })
  }

  /**
   * Transform Pipedrive persons to DreamTeam contacts
   */
  transformPersons(persons: PipedrivePersonRaw[], orgMap: Map<number, string>): TransformedContact[] {
    return persons.map((person) => {
      const nameParts = (person.name || "").split(" ")
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || ""

      // Handle org_id which can be number or object
      let orgId: number | undefined
      if (typeof person.org_id === "object" && person.org_id?.value) {
        orgId = person.org_id.value
      } else if (typeof person.org_id === "number") {
        orgId = person.org_id
      }

      // Handle email which can be array or string
      let email: string | null = null
      if (Array.isArray(person.email)) {
        const primaryEmail = person.email.find((e) => e.primary) || person.email[0]
        email = primaryEmail?.value || null
      } else if (typeof person.email === "string") {
        email = person.email
      }

      // Handle phone which can be array or string
      let phone: string | null = null
      if (Array.isArray(person.phone)) {
        const primaryPhone = person.phone.find((p) => p.primary) || person.phone[0]
        phone = primaryPhone?.value || null
      } else if (typeof person.phone === "string") {
        phone = person.phone
      }

      return {
        lead_name: orgId ? orgMap.get(orgId) || "" : "",
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        title: person.job_title || null,
      }
    })
  }

  /**
   * Transform Pipedrive deals to DreamTeam opportunities
   */
  transformDeals(deals: PipedriveDealRaw[], orgMap: Map<number, string>): TransformedOpportunity[] {
    return deals.map((deal) => {
      // Handle org_id which can be number or object
      let orgId: number | undefined
      let orgName: string | undefined
      if (typeof deal.org_id === "object" && deal.org_id?.value) {
        orgId = deal.org_id.value
        orgName = deal.org_id.name
      } else if (typeof deal.org_id === "number") {
        orgId = deal.org_id
      }

      // Map Pipedrive status to DreamTeam status
      let status = "active"
      if (deal.status === "won") status = "won"
      else if (deal.status === "lost") status = "lost"

      return {
        lead_name: orgName || (orgId ? orgMap.get(orgId) || "" : deal.org_name || ""),
        name: deal.title,
        value: deal.value || null,
        probability: deal.probability || null,
        status,
        expected_close_date: deal.expected_close_date || deal.won_time || deal.lost_time || null,
      }
    })
  }
}
