import { NextResponse } from 'next/server'
import { createAdminClient } from '@dreamteam/database/server'
import { getAuthContext } from '@/lib/api-auth'
import { getCurrentWorkspaceId, validateWorkspaceAccess } from '@/lib/workspace-auth'
import { batchCategorizeTransactions } from '@/lib/ai'
import type { Category } from '@dreamteam/database/types'

interface CategorizeRequest {
  descriptions: string[]
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = auth.type === 'api_key' ? null : auth.userId
    const workspaceId = auth.type === 'api_key'
      ? auth.workspaceId
      : await getCurrentWorkspaceId(auth.userId)

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    if (userId) {
      const { isValid } = await validateWorkspaceAccess(workspaceId, userId)
      if (!isValid) {
        return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
      }
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI categorization not configured. Please add OPENAI_API_KEY to environment.' },
        { status: 503 }
      )
    }

    const body: CategorizeRequest = await request.json()

    if (!body.descriptions || !Array.isArray(body.descriptions) || body.descriptions.length === 0) {
      return NextResponse.json(
        { error: 'At least one transaction description is required' },
        { status: 400 }
      )
    }

    if (body.descriptions.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 transactions can be categorized at once' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch all categories (system + workspace-specific if any)
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true })

    if (categoriesError) {
      console.error('Failed to fetch categories:', categoriesError)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    // Call AI to categorize
    const suggestions = await batchCategorizeTransactions(
      body.descriptions,
      categories as Category[]
    )

    return NextResponse.json({
      success: true,
      suggestions,
      categoriesUsed: categories?.length || 0,
    })
  } catch (error) {
    console.error('Categorization error:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to categorize transactions' },
      { status: 500 }
    )
  }
}
