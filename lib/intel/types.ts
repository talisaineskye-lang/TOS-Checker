export type ContentPillar = 'direct_delta' | 'regulatory_intel' | 'market_shift';
export type Severity = 'critical' | 'warning' | 'notice' | 'stable';

export interface RawFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  sourceUrl: string;
  pillarHint: ContentPillar;
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
}
