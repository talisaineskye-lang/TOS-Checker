export type ContentPillar =
  | 'policy_watch'      // TOS/privacy changes (was: direct_delta)
  | 'build'             // Dev tools, frameworks, launches, SDKs
  | 'business'          // Revenue, funding, pricing, market moves
  | 'ai_tools'          // AI models, APIs, agents, AI companies
  | 'growth'            // Marketing, distribution, launch tactics
  | 'ideas_trends'      // Market gaps, SaaS ideas, teardowns, trends
  | 'regulatory_intel'  // Regulatory news, enforcement, compliance
  | 'market_shift'      // General market/tech news (legacy, phasing out)
  | 'direct_delta';     // Legacy — kept for existing data compatibility
export type Severity = 'critical' | 'warning' | 'notice' | 'stable';

export interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceUrl: string;
  pillarHint: ContentPillar;
  hn_points?: number;
  hn_comments?: number;
}

export interface ClassifiedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  pillar: ContentPillar;
  severity: Severity;
  relevance: number;
  summary: string;
  affectedVendors: string[];
  tags: string[];
  suggestedPost: string;
  isRelevant: boolean;
  hn_points?: number;
  hn_comments?: number;
  heat_score?: number;
}
