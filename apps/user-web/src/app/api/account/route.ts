import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@dreamteam/database/server'

// PATCH - Update profile information
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, company_name, industry_type } = body

    // Check if email is already taken by another user
    if (email) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .neq('id', user.id)
        .single()

      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
      }
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        name,
        email,
        phone,
        company_name,
        industry_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Update Supabase Auth user metadata if email changed
    if (email && email !== user.email) {
      const { error: authError } = await supabase.auth.updateUser({
        email: email,
      })
      if (authError) {
        console.error('Auth email update error:', authError)
        // Don't fail the request, profile was updated
      }
    }

    return NextResponse.json({ success: true, profile: data })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[account/update] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}

// DELETE - Delete account
export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use admin client for deletion operations
    const adminSupabase = createAdminClient()

    // Delete all user data in order (respecting foreign keys)
    // 1. Delete transactions (depends on accounts)
    const { data: accounts } = await adminSupabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)

    if (accounts && accounts.length > 0) {
      const accountIds = accounts.map((a: { id: string }) => a.id)
      await adminSupabase.from('transactions').delete().in('account_id', accountIds)
    }

    // 2. Delete accounts
    await adminSupabase.from('accounts').delete().eq('user_id', user.id)

    // 3. Delete categories (non-system ones)
    await adminSupabase.from('categories').delete().eq('user_id', user.id)

    // 4. Delete budgets and budget alerts
    await adminSupabase.from('budget_alerts').delete().eq('profile_id', user.id)
    await adminSupabase.from('budgets').delete().eq('profile_id', user.id)

    // 5. Delete goals
    await adminSupabase.from('goals').delete().eq('profile_id', user.id)

    // 6. Delete exit plans
    await adminSupabase.from('exit_plans').delete().eq('profile_id', user.id)

    // 7. Delete the profile
    const { error: profileError } = await adminSupabase.from('profiles').delete().eq('id', user.id)

    if (profileError) {
      console.error('Profile deletion error:', profileError)
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
    }

    // 8. Delete the Supabase Auth user
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (authError) {
      console.error('Auth user deletion error:', authError)
      // Profile already deleted, just log the error
    }

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8)
    console.error(`[account/delete] Error [${errorId}]:`, error)
    return NextResponse.json({ error: 'Internal server error', errorId }, { status: 500 })
  }
}
