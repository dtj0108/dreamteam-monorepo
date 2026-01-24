import OpenAI from 'openai'
import type { Category } from './types'

export interface CategorySuggestion {
  description: string
  categoryId: string | null
  categoryName: string | null
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Use AI to categorize transaction descriptions
 */
export async function categorizeTransactions(
  descriptions: string[],
  categories: Category[]
): Promise<CategorySuggestion[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  // Initialize OpenAI client lazily (at runtime, not build time)
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  if (descriptions.length === 0) {
    return []
  }

  // Build category list for the prompt
  const categoryList = categories
    .map((c) => `- "${c.name}" (ID: ${c.id}, type: ${c.type})`)
    .join('\n')

  // Build numbered list of transactions
  const transactionList = descriptions
    .map((desc, i) => `${i + 1}. "${desc}"`)
    .join('\n')

  const prompt = `You are a financial transaction categorizer. Given a list of categories and transaction descriptions, assign the most appropriate category to each transaction.

## Available Categories:
${categoryList}

## Transactions to Categorize:
${transactionList}

## Instructions:
- For each transaction, determine the best matching category based on the merchant name or description
- If a transaction is clearly income (salary, payment received, deposit), use an income-type category
- If a transaction is an expense (purchase, payment, subscription), use an expense-type category
- If no category is a good match, set category_id to null
- Be conservative - only assign high confidence if you're very sure

## Response Format:
Return a JSON array with exactly ${descriptions.length} objects, one for each transaction in order:
[
  { "category_id": "uuid-or-null", "category_name": "name-or-null", "confidence": "high|medium|low" },
  ...
]

Only return the JSON array, no other text.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        {
          role: 'system',
          content: 'You are a financial transaction categorizer. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      // Note: gpt-5-nano only supports default temperature (1)
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    // Parse the response
    let parsed: { results?: Array<{ category_id: string | null; category_name: string | null; confidence: string }> }
    try {
      parsed = JSON.parse(content)
    } catch {
      // Try to extract JSON array from response
      const match = content.match(/\[[\s\S]*\]/)
      if (match) {
        parsed = { results: JSON.parse(match[0]) }
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    // Handle both array and object responses
    const results = Array.isArray(parsed) ? parsed : (parsed.results || [])

    // Map results back to descriptions
    return descriptions.map((description, index) => {
      const result = results[index]
      if (!result) {
        return {
          description,
          categoryId: null,
          categoryName: null,
          confidence: 'low' as const,
        }
      }

      // Validate category ID exists in our list
      const matchedCategory = categories.find(
        (c) => c.id === result.category_id || c.name.toLowerCase() === result.category_name?.toLowerCase()
      )

      return {
        description,
        categoryId: matchedCategory?.id || null,
        categoryName: matchedCategory?.name || null,
        confidence: (result.confidence as 'high' | 'medium' | 'low') || 'low',
      }
    })
  } catch (error) {
    console.error('AI categorization error:', error)
    throw error
  }
}

/**
 * Batch categorize in chunks to avoid token limits
 */
export async function batchCategorizeTransactions(
  descriptions: string[],
  categories: Category[],
  batchSize: number = 50
): Promise<CategorySuggestion[]> {
  const results: CategorySuggestion[] = []

  for (let i = 0; i < descriptions.length; i += batchSize) {
    const batch = descriptions.slice(i, i + batchSize)
    const batchResults = await categorizeTransactions(batch, categories)
    results.push(...batchResults)
  }

  return results
}

