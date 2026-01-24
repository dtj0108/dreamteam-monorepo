/**
 * Freshsales CRM API Client
 * Documentation: https://developers.freshworks.com/crm/api/
 *
 * Note: API key should be stored as "subdomain:apikey" format
 * e.g., "mycompany:abc123xyz"
 */

export interface FreshsalesAccountRaw {
  id: number
  name: string
  website?: string
  address?: string
  city?: string
  state?: string
  zipcode?: string
  country?: string
  industry_type?: { name: string }
  business_type?: { name: string }
  created_at: string
  updated_at: string
}

export interface FreshsalesContactRaw {
  id: number
  first_name?: string
  last_name?: string
  email?: string
  work_number?: string
  mobile_number?: string
  job_title?: string
  sales_account_id?: number
  sales_account?: { name: string }
  created_at: string
  updated_at: string
}

export interface FreshsalesDealRaw {
  id: number
  name: string
  amount?: number
  expected_close?: string
  probability?: number
  deal_stage?: { name: string }
  sales_account_id?: number
  sales_account?: { name: string }
  created_at: string
  updated_at: string
  // Deal stage can indicate won/lost
  stage_updated_time?: string
}

export interface FreshsalesDataCounts {
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
 * Parse the combined "subdomain:apikey" format
 */
export function parseFreshsalesCredentials(combined: string): { subdomain: string; apiKey: string } {
  const colonIndex = combined.indexOf(":")
  if (colonIndex === -1) {
    throw new Error("Invalid Freshsales credentials format. Expected 'subdomain:apikey'")
  }
  return {
    subdomain: combined.substring(0, colonIndex),
    apiKey: combined.substring(colonIndex + 1),
  }
}

/**
 * Freshsales API Client
 */
export class FreshsalesClient {
  private subdomain: string
  private apiKey: string
  private baseUrl: string

  constructor(combinedCredentials: string) {
    const { subdomain, apiKey } = parseFreshsalesCredentials(combinedCredentials)
    this.subdomain = subdomain
    this.apiKey = apiKey
    // Freshsales Suite uses myfreshworks.com, classic uses freshsales.io
    // We'll try the newer format first
    this.baseUrl = `https://${subdomain}.myfreshworks.com/crm/sales/api`
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
        Authorization: `Token token=${this.apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      // If we get 404, try the classic freshsales.io domain
      if (response.status === 404 && this.baseUrl.includes("myfreshworks.com")) {
        this.baseUrl = `https://${this.subdomain}.freshsales.io/api`
        return this.fetch(endpoint, params)
      }
      const errorText = await response.text()
      throw new Error(`Freshsales API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get counts of all data types
   */
  async getCounts(): Promise<FreshsalesDataCounts> {
    // Freshsales returns meta with total_count in list endpoints
    const [accounts, contacts, deals] = await Promise.all([
      this.fetch<{ meta?: { total: number }; sales_accounts?: unknown[] }>("/sales_accounts/view/1", { per_page: "1" }),
      this.fetch<{ meta?: { total: number }; contacts?: unknown[] }>("/contacts/view/1", { per_page: "1" }),
      this.fetch<{ meta?: { total: number }; deals?: unknown[] }>("/deals/view/1", { per_page: "1" }),
    ])

    return {
      leads: accounts.meta?.total || accounts.sales_accounts?.length || 0,
      contacts: contacts.meta?.total || contacts.contacts?.length || 0,
      opportunities: deals.meta?.total || deals.deals?.length || 0,
    }
  }

  /**
   * Fetch all sales accounts (leads) with pagination
   */
  async fetchAccounts(perPage = 100): Promise<FreshsalesAccountRaw[]> {
    const allAccounts: FreshsalesAccountRaw[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await this.fetch<{
        sales_accounts: FreshsalesAccountRaw[]
        meta?: { total_pages: number }
      }>("/sales_accounts/view/1", {
        per_page: String(perPage),
        page: String(page),
      })

      allAccounts.push(...(response.sales_accounts || []))

      const totalPages = response.meta?.total_pages || 1
      hasMore = page < totalPages
      page++
    }

    return allAccounts
  }

  /**
   * Fetch all contacts with pagination
   */
  async fetchContacts(perPage = 100): Promise<FreshsalesContactRaw[]> {
    const allContacts: FreshsalesContactRaw[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await this.fetch<{
        contacts: FreshsalesContactRaw[]
        meta?: { total_pages: number }
      }>("/contacts/view/1", {
        per_page: String(perPage),
        page: String(page),
      })

      allContacts.push(...(response.contacts || []))

      const totalPages = response.meta?.total_pages || 1
      hasMore = page < totalPages
      page++
    }

    return allContacts
  }

  /**
   * Fetch all deals with pagination
   */
  async fetchDeals(perPage = 100): Promise<FreshsalesDealRaw[]> {
    const allDeals: FreshsalesDealRaw[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const response = await this.fetch<{
        deals: FreshsalesDealRaw[]
        meta?: { total_pages: number }
      }>("/deals/view/1", {
        per_page: String(perPage),
        page: String(page),
      })

      allDeals.push(...(response.deals || []))

      const totalPages = response.meta?.total_pages || 1
      hasMore = page < totalPages
      page++
    }

    return allDeals
  }

  /**
   * Transform Freshsales accounts to DreamTeam leads
   */
  transformAccounts(accounts: FreshsalesAccountRaw[]): TransformedLead[] {
    return accounts.map((account) => ({
      name: account.name,
      website: account.website || null,
      description: account.industry_type?.name || null,
      status: account.business_type?.name || null,
      address: account.address || null,
      city: account.city || null,
      state: account.state || null,
      zip_code: account.zipcode || null,
      country: account.country || null,
    }))
  }

  /**
   * Transform Freshsales contacts to DreamTeam contacts
   */
  transformContacts(contacts: FreshsalesContactRaw[], accountMap: Map<number, string>): TransformedContact[] {
    return contacts.map((contact) => ({
      lead_name: contact.sales_account?.name || (contact.sales_account_id ? accountMap.get(contact.sales_account_id) || "" : ""),
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || null,
      phone: contact.work_number || contact.mobile_number || null,
      title: contact.job_title || null,
    }))
  }

  /**
   * Transform Freshsales deals to DreamTeam opportunities
   */
  transformDeals(deals: FreshsalesDealRaw[], accountMap: Map<number, string>): TransformedOpportunity[] {
    return deals.map((deal) => {
      // Determine status from deal stage name
      const stageName = deal.deal_stage?.name?.toLowerCase() || ""
      let status = "active"
      if (stageName.includes("won") || stageName.includes("closed won")) {
        status = "won"
      } else if (stageName.includes("lost") || stageName.includes("closed lost")) {
        status = "lost"
      }

      return {
        lead_name: deal.sales_account?.name || (deal.sales_account_id ? accountMap.get(deal.sales_account_id) || "" : ""),
        name: deal.name,
        value: deal.amount || null,
        probability: deal.probability || null,
        status,
        expected_close_date: deal.expected_close || null,
      }
    })
  }
}
