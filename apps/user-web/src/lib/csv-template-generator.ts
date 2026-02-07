/**
 * CSV Template Generator
 *
 * Generates sample CSV templates for each data type with correct headers
 * and realistic example data to help users understand the expected format.
 */

export type TemplateDataType = "leads" | "contacts" | "opportunities" | "tasks"

interface TemplateConfig {
  headers: string[]
  sampleRows: string[][]
}

/**
 * Escape a CSV value by wrapping in quotes and escaping internal quotes
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, newline, or quote, wrap in quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Template configurations for each data type
 * Headers match the auto-detection patterns in the CSV parsers
 */
const TEMPLATES: Record<TemplateDataType, TemplateConfig> = {
  leads: {
    headers: [
      "Company Name",
      "Website",
      "Industry",
      "City",
      "State",
      "Country",
      "Source",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Title",
    ],
    sampleRows: [
      [
        "Acme Corp",
        "acme.com",
        "Technology",
        "San Francisco",
        "CA",
        "USA",
        "Website",
        "John",
        "Smith",
        "john@acme.com",
        "+1-555-0101",
        "CEO",
      ],
      [
        "Global Industries",
        "globalind.com",
        "Manufacturing",
        "New York",
        "NY",
        "USA",
        "Referral",
        "Sarah",
        "Johnson",
        "sarah@globalind.com",
        "+1-555-0102",
        "VP Sales",
      ],
      [
        "TechStart Inc",
        "techstart.io",
        "Software",
        "Austin",
        "TX",
        "USA",
        "LinkedIn",
        "Mike",
        "Chen",
        "mike@techstart.io",
        "+1-555-0103",
        "CTO",
      ],
    ],
  },
  contacts: {
    headers: [
      "Company Name",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Title",
    ],
    sampleRows: [
      [
        "Acme Corp",
        "John",
        "Smith",
        "john@acme.com",
        "+1-555-0101",
        "CEO",
      ],
      [
        "Acme Corp",
        "Jane",
        "Doe",
        "jane@acme.com",
        "+1-555-0102",
        "CTO",
      ],
      [
        "Global Industries",
        "Bob",
        "Wilson",
        "bob@globalind.com",
        "+1-555-0103",
        "Sales Manager",
      ],
    ],
  },
  opportunities: {
    headers: [
      "Company Name",
      "Deal Name",
      "Value",
      "Probability",
      "Expected Close Date",
      "Status",
    ],
    sampleRows: [
      [
        "Acme Corp",
        "Enterprise License",
        "50000",
        "75",
        "2026-03-15",
        "active",
      ],
      [
        "Global Industries",
        "Consulting Project",
        "25000",
        "50",
        "2026-04-01",
        "active",
      ],
      [
        "TechStart Inc",
        "Pilot Program",
        "10000",
        "90",
        "2026-02-28",
        "active",
      ],
    ],
  },
  tasks: {
    headers: [
      "Company Name",
      "Task Title",
      "Description",
      "Due Date",
    ],
    sampleRows: [
      [
        "Acme Corp",
        "Follow up call",
        "Discuss enterprise pricing and contract terms",
        "2026-02-15",
      ],
      [
        "Global Industries",
        "Send proposal",
        "Draft and send SOW for consulting project",
        "2026-02-20",
      ],
      [
        "TechStart Inc",
        "Schedule demo",
        "Demo the new features to their engineering team",
        "2026-02-18",
      ],
    ],
  },
}

/**
 * Generate a CSV string for the given data type
 */
export function generateCSVTemplate(dataType: TemplateDataType): string {
  const config = TEMPLATES[dataType]
  const rows = [config.headers, ...config.sampleRows]
  return rows.map(row => row.map(escapeCSVValue).join(",")).join("\n")
}

/**
 * Trigger a download of the CSV template for the given data type
 */
export function downloadCSVTemplate(dataType: TemplateDataType): void {
  const csv = generateCSVTemplate(dataType)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${dataType}-import-template.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
