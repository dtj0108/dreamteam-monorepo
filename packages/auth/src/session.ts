import { createServerSupabaseClient } from '@dreamteam/database/server'
import type { IndustryType } from '@dreamteam/database/types'

export interface SessionUser {
  id: string
  email: string
  name: string
  phone: string
  companyName?: string | null
  industryType?: IndustryType
}

/**
 * Get the current session from Supabase Auth
 * Returns the user if authenticated, null otherwise
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    // Get profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, phone, company_name, industry_type')
      .eq('id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email || '',
      name: profile?.name || user.user_metadata?.name || '',
      phone: profile?.phone || user.user_metadata?.phone || '',
      companyName: profile?.company_name,
      industryType: profile?.industry_type,
    }
  } catch {
    return null
  }
}

/**
 * Check if the current user has completed 2FA
 * Returns true if 2FA is complete, false if pending
 */
export async function is2FAComplete(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return false
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('pending_2fa')
      .eq('id', user.id)
      .single()

    // If pending_2fa is true, 2FA is NOT complete
    return profile?.pending_2fa === false
  } catch {
    return false
  }
}

/**
 * Mark 2FA as complete for the current user
 */
export async function complete2FA(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return false
    }

    const { error } = await supabase
      .from('profiles')
      .update({ pending_2fa: false })
      .eq('id', user.id)

    return !error
  } catch {
    return false
  }
}

// Legacy exports for backward compatibility during migration
// These will be removed after full migration

/**
 * @deprecated Use Supabase auth.signUp() or auth.signInWithPassword() instead
 */
export async function createSession(_user: SessionUser): Promise<void> {
  console.warn('createSession is deprecated. Use Supabase Auth instead.')
}

/**
 * @deprecated Use Supabase auth.signOut() instead
 */
export async function destroySession(): Promise<void> {
  console.warn('destroySession is deprecated. Use Supabase Auth instead.')
}

// Type for backward compatibility
export interface SessionData extends SessionUser {
  createdAt: number
}
