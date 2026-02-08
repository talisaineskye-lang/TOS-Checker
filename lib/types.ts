// Vendor and document types for StackDrift

// Re-export risk bucket types for convenience
export type { RiskBucket, RiskPriority } from './risk-buckets';

export type VendorCategory =
  | 'payment_finance'
  | 'cloud_infrastructure'
  | 'ai_ml'
  | 'ai_builders'
  | 'developer_tools';

export type DocumentType = 'tos' | 'privacy' | 'aup' | 'pricing' | 'api_terms' | 'changelog';

export const CATEGORY_LABELS: Record<VendorCategory, string> = {
  payment_finance: 'Payment & Finance',
  cloud_infrastructure: 'Cloud & Infrastructure',
  ai_ml: 'AI & Machine Learning',
  ai_builders: 'AI Builders',
  developer_tools: 'Developer Tools',
};

export const CATEGORY_DESCRIPTIONS: Record<VendorCategory, string> = {
  payment_finance: 'Payment processing and financial services',
  cloud_infrastructure: 'Hosting, deployment, and infrastructure',
  ai_ml: 'AI APIs you integrate',
  ai_builders: 'AI tools you build with',
  developer_tools: 'Development and collaboration tools',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  tos: 'Terms of Service',
  privacy: 'Privacy Policy',
  aup: 'Acceptable Use Policy',
  pricing: 'Pricing',
  api_terms: 'API Terms',
  changelog: 'Changelog',
};

// Template for vendor catalog (hardcoded data)
export interface VendorTemplate {
  slug: string;
  name: string;
  logoUrl: string;
  category: VendorCategory;
  baseUrl: string;
  documents: {
    type: DocumentType;
    url: string;
  }[];
  isDefault?: boolean;
}

// Database types
export interface Vendor {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  category: string | null;
  base_url: string | null;
  is_custom: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  vendor_id: string;
  doc_type: DocumentType;
  url: string;
  is_active: boolean;
  created_at: string;
  last_checked_at: string | null;
  last_changed_at: string | null;
}

export interface Snapshot {
  id: string;
  vendor_id: string;
  document_id: string;
  content_hash: string;
  content: string;
  fetched_at: string;
}

export interface Change {
  id: string;
  vendor_id: string;
  document_id: string;
  old_snapshot_id: string;
  new_snapshot_id: string;
  summary: string | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  risk_bucket: string | null; // Primary risk bucket (ownership, training, visibility, export, pricing)
  risk_priority: string | null; // critical, high, medium, low
  categories: string[] | null; // All matched risk buckets
  detected_at: string;
  notified: boolean;
}

// For custom vendor creation
export interface CustomVendor {
  name: string;
  baseUrl: string;
  documents: {
    type: DocumentType;
    url: string;
  }[];
}
