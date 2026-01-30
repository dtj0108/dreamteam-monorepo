/**
 * A2P 10DLC Brand and Campaign Registration Types
 *
 * Types for managing SMS messaging compliance via A2P 10DLC registration.
 */

// =====================================================
// Enums
// =====================================================

export type BusinessType =
  | 'sole_proprietor'
  | 'corporation'
  | 'llc'
  | 'partnership'
  | 'non_profit'
  | 'government';

export type IndustryVertical =
  | 'professional_services'
  | 'real_estate'
  | 'healthcare'
  | 'retail'
  | 'technology'
  | 'financial_services'
  | 'education'
  | 'hospitality'
  | 'transportation'
  | 'manufacturing'
  | 'construction'
  | 'agriculture'
  | 'energy'
  | 'media'
  | 'telecommunications'
  | 'insurance'
  | 'legal'
  | 'other';

export type RegistrationStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type CampaignUseCase =
  | 'marketing'
  | 'customer_care'
  | 'mixed'
  | 'two_factor_auth'
  | 'account_notifications'
  | 'appointment_reminders'
  | 'delivery_notifications'
  | 'fraud_alerts'
  | 'higher_education'
  | 'polling_voting'
  | 'public_service_announcement'
  | 'security_alerts'
  | 'emergency';

export type CampaignNumberStatus = 'pending' | 'active' | 'failed';

// =====================================================
// Database Types
// =====================================================

export interface A2PBrand {
  id: string;
  workspace_id: string;
  user_id: string;

  // Brand Information
  brand_name: string;
  business_type: BusinessType;
  ein: string | null;

  // Contact Information
  email: string;
  phone: string;
  website: string | null;

  // Address Information
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;

  // Industry Classification
  vertical: IndustryVertical;

  // Registration Status
  status: RegistrationStatus;

  // Twilio Integration
  twilio_brand_sid: string | null;

  // Status Tracking
  approved_at: string | null;
  rejected_reason: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface A2PCampaign {
  id: string;
  workspace_id: string;
  brand_id: string;

  // Campaign Information
  campaign_name: string;
  use_case: CampaignUseCase;
  sub_use_case: string | null;

  // Message Samples
  message_samples: string[];

  // Opt-in/Opt-out Configuration
  opt_in_workflow: string;
  opt_in_keywords: string[];
  opt_out_keywords: string[];
  help_keywords: string[];
  help_message: string;
  opt_out_message: string;

  // Compliance Attributes
  direct_lending: boolean;
  embedded_link: boolean;
  embedded_phone: boolean;
  age_gated: boolean;
  affiliate_marketing: boolean;

  // Volume Estimate
  expected_monthly_volume: number;

  // Registration Status
  status: RegistrationStatus;

  // Twilio Integration
  twilio_campaign_sid: string | null;

  // Status Tracking
  approved_at: string | null;
  rejected_reason: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface A2PCampaignPhoneNumber {
  id: string;
  campaign_id: string;
  phone_number_id: string;

  // Assignment Status
  status: CampaignNumberStatus;

  // Timestamps
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Extended Types with Relations
// =====================================================

export interface A2PCampaignWithBrand extends A2PCampaign {
  brand: A2PBrand;
}

export interface A2PCampaignWithNumbers extends A2PCampaign {
  phone_numbers: Array<A2PCampaignPhoneNumber & {
    phone_number: {
      id: string;
      phone_number: string;
      friendly_name: string | null;
    };
  }>;
}

// =====================================================
// Form Input Types
// =====================================================

export interface CreateBrandInput {
  brand_name: string;
  business_type: BusinessType;
  ein?: string;
  email: string;
  phone: string;
  website?: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
  vertical: IndustryVertical;
}

export interface UpdateBrandInput extends Partial<CreateBrandInput> {}

export interface CreateCampaignInput {
  brand_id: string;
  campaign_name: string;
  use_case: CampaignUseCase;
  sub_use_case?: string;
  message_samples: string[];
  opt_in_workflow: string;
  opt_in_keywords?: string[];
  opt_out_keywords?: string[];
  help_keywords?: string[];
  help_message?: string;
  opt_out_message?: string;
  direct_lending?: boolean;
  embedded_link?: boolean;
  embedded_phone?: boolean;
  age_gated?: boolean;
  affiliate_marketing?: boolean;
  expected_monthly_volume?: number;
}

export interface UpdateCampaignInput extends Partial<CreateCampaignInput> {}

// =====================================================
// UI Helper Constants
// =====================================================

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  sole_proprietor: 'Sole Proprietor',
  corporation: 'Corporation',
  llc: 'LLC',
  partnership: 'Partnership',
  non_profit: 'Non-Profit',
  government: 'Government',
};

export const INDUSTRY_VERTICAL_LABELS: Record<IndustryVertical, string> = {
  professional_services: 'Professional Services',
  real_estate: 'Real Estate',
  healthcare: 'Healthcare',
  retail: 'Retail',
  technology: 'Technology',
  financial_services: 'Financial Services',
  education: 'Education',
  hospitality: 'Hospitality',
  transportation: 'Transportation',
  manufacturing: 'Manufacturing',
  construction: 'Construction',
  agriculture: 'Agriculture',
  energy: 'Energy',
  media: 'Media',
  telecommunications: 'Telecommunications',
  insurance: 'Insurance',
  legal: 'Legal',
  other: 'Other',
};

export const CAMPAIGN_USE_CASE_LABELS: Record<CampaignUseCase, string> = {
  marketing: 'Marketing',
  customer_care: 'Customer Care',
  mixed: 'Mixed',
  two_factor_auth: 'Two-Factor Authentication',
  account_notifications: 'Account Notifications',
  appointment_reminders: 'Appointment Reminders',
  delivery_notifications: 'Delivery Notifications',
  fraud_alerts: 'Fraud Alerts',
  higher_education: 'Higher Education',
  polling_voting: 'Polling & Voting',
  public_service_announcement: 'Public Service Announcement',
  security_alerts: 'Security Alerts',
  emergency: 'Emergency',
};

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

export const STATUS_COLORS: Record<RegistrationStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  approved: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  suspended: 'bg-orange-100 text-orange-700 border-orange-300',
};

// =====================================================
// Validation Helpers
// =====================================================

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const DEFAULT_OPT_IN_KEYWORDS = ['START', 'YES', 'UNSTOP'];
export const DEFAULT_OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
export const DEFAULT_HELP_KEYWORDS = ['HELP', 'INFO'];
export const DEFAULT_HELP_MESSAGE = 'Reply HELP for help, STOP to unsubscribe.';
export const DEFAULT_OPT_OUT_MESSAGE = 'You have been unsubscribed and will receive no further messages.';
