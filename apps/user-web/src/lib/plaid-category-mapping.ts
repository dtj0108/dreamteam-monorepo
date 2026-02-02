/**
 * Plaid Category Mapping
 * Maps Plaid's primary category to internal category names
 * Plaid categories are hierarchical arrays, e.g., ["Food and Drink", "Restaurants"]
 */

// Mapping from Plaid primary categories to internal category names
const PLAID_CATEGORY_MAP: Record<string, string> = {
  // Food & Dining
  'Food and Drink': 'Food & Dining',
  'Restaurants': 'Food & Dining',
  'Coffee Shop': 'Food & Dining',
  'Fast Food': 'Food & Dining',
  'Groceries': 'Groceries',

  // Transportation
  'Transportation': 'Transportation',
  'Travel': 'Travel',
  'Airlines and Aviation Services': 'Travel',
  'Car Service': 'Transportation',
  'Gas Stations': 'Transportation',
  'Parking': 'Transportation',
  'Public Transportation Services': 'Transportation',
  'Taxi': 'Transportation',

  // Shopping
  'Shops': 'Shopping',
  'Supermarkets and Groceries': 'Groceries',
  'Clothing and Accessories': 'Shopping',
  'Electronics': 'Shopping',
  'Department Stores': 'Shopping',
  'Sporting Goods': 'Shopping',
  'Discount Stores': 'Shopping',
  'Computers and Electronics': 'Shopping',
  'Digital Purchase': 'Shopping',
  'Bookstores': 'Shopping',

  // Entertainment
  'Recreation': 'Entertainment',
  'Entertainment': 'Entertainment',
  'Arts and Entertainment': 'Entertainment',
  'Music, Video and DVD': 'Entertainment',
  'Movies and DVDs': 'Entertainment',
  'Gyms and Fitness Centers': 'Entertainment',

  // Bills & Utilities
  'Service': 'Services',
  'Utilities': 'Utilities',
  'Telecommunication Services': 'Utilities',
  'Cable': 'Utilities',
  'Internet Services': 'Utilities',
  'Telephone': 'Utilities',

  // Financial
  'Bank Fees': 'Fees & Charges',
  'Interest': 'Fees & Charges',
  'Payment': 'Transfer',
  'Transfer': 'Transfer',
  'Deposit': 'Income',
  'Payroll': 'Income',
  'Income': 'Income',

  // Healthcare
  'Healthcare': 'Healthcare',
  'Healthcare Services': 'Healthcare',
  'Pharmacies': 'Healthcare',
  'Physicians': 'Healthcare',
  'Dentists': 'Healthcare',

  // Home
  'Home Improvement': 'Home',
  'Rent': 'Housing',
  'Mortgage': 'Housing',

  // Insurance
  'Insurance': 'Insurance',

  // Education
  'Education': 'Education',
  'College and University': 'Education',

  // Personal Care
  'Personal Care': 'Personal Care',
  'Hair Salons and Barbers': 'Personal Care',
  'Spas and Beauty Services': 'Personal Care',

  // Subscriptions
  'Subscription': 'Subscriptions',

  // Other
  'Government and Non-Profit': 'Government & Taxes',
  'Taxes': 'Government & Taxes',
  'Charitable Giving': 'Gifts & Donations',
}

/**
 * Get suggested internal category name from Plaid categories array
 * @param plaidCategories - Array of Plaid category strings (hierarchical)
 * @returns Suggested internal category name, or null if no mapping found
 */
export function getSuggestedCategoryFromPlaid(plaidCategories: string[] | null | undefined): string | null {
  if (!plaidCategories || plaidCategories.length === 0) {
    return null
  }

  // Try matching from most specific (last) to least specific (first)
  for (let i = plaidCategories.length - 1; i >= 0; i--) {
    const category = plaidCategories[i]
    if (PLAID_CATEGORY_MAP[category]) {
      return PLAID_CATEGORY_MAP[category]
    }
  }

  // If no direct match, try partial matching on primary category
  const primaryCategory = plaidCategories[0]
  for (const [plaidCat, internalCat] of Object.entries(PLAID_CATEGORY_MAP)) {
    if (primaryCategory.toLowerCase().includes(plaidCat.toLowerCase()) ||
        plaidCat.toLowerCase().includes(primaryCategory.toLowerCase())) {
      return internalCat
    }
  }

  return null
}

/**
 * Check if a Plaid category array suggests this is income
 */
export function isPlaidIncomeCategory(plaidCategories: string[] | null | undefined): boolean {
  if (!plaidCategories || plaidCategories.length === 0) {
    return false
  }

  const incomeKeywords = ['income', 'deposit', 'payroll', 'salary', 'transfer', 'payment']
  return plaidCategories.some(cat =>
    incomeKeywords.some(keyword => cat.toLowerCase().includes(keyword))
  )
}
