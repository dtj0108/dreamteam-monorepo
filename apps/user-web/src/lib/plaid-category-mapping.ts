/**
 * Plaid Category Mapping
 * Maps Plaid's primary category to internal category names
 * Plaid categories are hierarchical arrays, e.g., ["Food and Drink", "Restaurants"]
 */

// Mapping from Plaid primary categories to internal category names
// Maps to the system's default business categories
const PLAID_CATEGORY_MAP: Record<string, string> = {
  // Food & Dining -> Meals & Entertainment
  'Food and Drink': 'Meals & Entertainment',
  'Restaurants': 'Meals & Entertainment',
  'Coffee Shop': 'Meals & Entertainment',
  'Fast Food': 'Meals & Entertainment',
  'Groceries': 'Meals & Entertainment',

  // Transportation -> Travel & Transportation / Vehicle Expenses
  'Transportation': 'Travel & Transportation',
  'Travel': 'Travel & Transportation',
  'Airlines and Aviation Services': 'Travel & Transportation',
  'Car Service': 'Travel & Transportation',
  'Gas Stations': 'Vehicle Expenses',
  'Parking': 'Vehicle Expenses',
  'Public Transportation Services': 'Travel & Transportation',
  'Taxi': 'Travel & Transportation',

  // Shopping -> Office Supplies / Equipment & Hardware
  'Shops': 'Office Supplies',
  'Supermarkets and Groceries': 'Meals & Entertainment',
  'Clothing and Accessories': 'Other Expenses',
  'Electronics': 'Equipment & Hardware',
  'Department Stores': 'Office Supplies',
  'Sporting Goods': 'Other Expenses',
  'Discount Stores': 'Office Supplies',
  'Computers and Electronics': 'Equipment & Hardware',
  'Digital Purchase': 'Software & SaaS',
  'Bookstores': 'Training & Education',

  // Entertainment -> Meals & Entertainment
  'Recreation': 'Meals & Entertainment',
  'Entertainment': 'Meals & Entertainment',
  'Arts and Entertainment': 'Meals & Entertainment',
  'Music, Video and DVD': 'Software & SaaS',
  'Movies and DVDs': 'Meals & Entertainment',
  'Gyms and Fitness Centers': 'Other Expenses',

  // Bills & Utilities
  'Service': 'Professional Services',
  'Utilities': 'Utilities',
  'Telecommunication Services': 'Telecommunications',
  'Cable': 'Telecommunications',
  'Internet Services': 'Telecommunications',
  'Telephone': 'Telecommunications',

  // Financial
  'Bank Fees': 'Bank Fees & Charges',
  'Interest': 'Bank Fees & Charges',
  'Payment': 'Transfer',
  'Transfer': 'Transfer',
  'Deposit': 'Other Income',
  'Payroll': 'Payroll & Wages',
  'Income': 'Other Income',

  // Healthcare -> Other Expenses
  'Healthcare': 'Other Expenses',
  'Healthcare Services': 'Other Expenses',
  'Pharmacies': 'Other Expenses',
  'Physicians': 'Other Expenses',
  'Dentists': 'Other Expenses',

  // Home -> Rent & Lease / Repairs & Maintenance
  'Home Improvement': 'Repairs & Maintenance',
  'Rent': 'Rent & Lease',
  'Mortgage': 'Rent & Lease',

  // Insurance
  'Insurance': 'Insurance',

  // Education -> Training & Education
  'Education': 'Training & Education',
  'College and University': 'Training & Education',

  // Personal Care -> Other Expenses
  'Personal Care': 'Other Expenses',
  'Hair Salons and Barbers': 'Other Expenses',
  'Spas and Beauty Services': 'Other Expenses',

  // Subscriptions -> Software & SaaS
  'Subscription': 'Software & SaaS',

  // Government & Taxes
  'Government and Non-Profit': 'Taxes & Licenses',
  'Taxes': 'Taxes & Licenses',
  'Charitable Giving': 'Other Expenses',
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
