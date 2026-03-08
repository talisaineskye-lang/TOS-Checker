/**
 * classify-risk.ts — Keyword-based risk bucket classifier.
 *
 * Extracted from StackDrift production engine (lib/classifier.ts + lib/risk-buckets.ts).
 *
 * This is the secondary signal — the LLM assessment from analyze-change.ts is primary.
 * Keyword classification provides confirmation and bucket categorization when the LLM
 * assessment is unavailable (API failure) or as supplementary context.
 *
 * Risk buckets (highest priority first):
 * - ownership: IP rights, licensing, code ownership
 * - training: AI model training on your data
 * - deprecation: Service/API retirements
 * - visibility: Privacy defaults, public/private settings
 * - export: Data portability, platform lock-in
 * - pricing: Usage limits, billing changes
 */

export type RiskBucket = 'ownership' | 'training' | 'visibility' | 'export' | 'pricing' | 'deprecation';
export type RiskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface RiskBucketConfig {
  name: string;
  priority: RiskPriority;
  description: string;
}

export const RISK_BUCKETS: Record<RiskBucket, RiskBucketConfig> = {
  ownership: {
    name: 'Ownership & IP',
    priority: 'critical',
    description: 'Who owns generated code',
  },
  training: {
    name: 'Training & Data Reuse',
    priority: 'high',
    description: 'Whether your code trains their models',
  },
  visibility: {
    name: 'Project Visibility',
    priority: 'high',
    description: 'Project privacy defaults',
  },
  export: {
    name: 'Export & Lock-in',
    priority: 'medium',
    description: 'Can you leave the platform',
  },
  pricing: {
    name: 'Usage & Commercial',
    priority: 'medium',
    description: 'Pricing enforcement and limits',
  },
  deprecation: {
    name: 'Deprecation & Retirement',
    priority: 'high',
    description: 'Model or API version retirements and migration deadlines',
  },
};

const RISK_KEYWORDS: Record<RiskBucket, string[]> = {
  ownership: [
    'ownership of output', 'generated code', 'derivative works',
    'intellectual property', 'license to use', 'license to modify',
    'license to distribute', 'non-exclusive', 'perpetual', 'royalty-free',
    'you grant us', 'you own', 'we own', 'retain ownership', 'assign',
    'transfer', 'work product', 'created content', 'user content', 'your content',
  ],
  training: [
    'training', 'train our models', 'improve our models', 'machine learning',
    'aggregate data', 'content submitted', 'usage data', 'telemetry',
    'feedback', 'anonymized', 'opt-out', 'opt out', 'model improvement',
    'ai training', 'learning from',
  ],
  visibility: [
    'public', 'private', 'visibility', 'default', 'shared', 'workspace',
    'collaborators', 'gallery', 'showcase', 'discoverable', 'searchable',
    'publicly available', 'made public',
  ],
  export: [
    'export', 'download', 'self-host', 'self host', 'deployment', 'deploy',
    'third-party hosting', 'source code access', 'restrictions', 'limitations',
    'portability', 'lock-in', 'migration', 'transfer out',
  ],
  pricing: [
    'commercial use', 'production use', 'fair use', 'credits', 'rate limit',
    'usage-based', 'overage', 'limits', 'quota', 'throttle', 'subscription',
    'billing', 'pricing', 'plan', 'tier',
  ],
  deprecation: [
    'deprecated', 'deprecation', 'retirement', 'retired', 'end of life',
    'end-of-life', 'sunset', 'sunsetted', 'discontinued', 'replaced by',
    'migration required', 'no longer available', 'no longer supported',
    'shutting down', 'will be removed', 'breaking change', 'legacy',
  ],
};

// Priority order for bucket selection (highest priority first)
const BUCKET_PRIORITY_ORDER: RiskBucket[] = [
  'ownership', 'training', 'deprecation', 'visibility', 'export', 'pricing',
];

export interface ClassificationResult {
  buckets: string[];
  primaryBucket: string | null;
  priority: RiskPriority;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Detect which risk buckets a piece of text relates to.
 */
function detectRiskBuckets(text: string): RiskBucket[] {
  const lowercaseText = text.toLowerCase();
  const matched: RiskBucket[] = [];

  for (const [bucket, keywords] of Object.entries(RISK_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowercaseText.includes(keyword.toLowerCase())) {
        matched.push(bucket as RiskBucket);
        break;
      }
    }
  }

  return matched;
}

/**
 * Get the highest priority bucket from matched buckets.
 */
function getHighestPriorityBucket(buckets: RiskBucket[]): RiskBucket | null {
  if (buckets.length === 0) return null;
  for (const bucket of BUCKET_PRIORITY_ORDER) {
    if (buckets.includes(bucket)) return bucket;
  }
  return buckets[0];
}

function priorityToRiskLevel(priority: RiskPriority): 'low' | 'medium' | 'high' {
  switch (priority) {
    case 'critical': return 'high';
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
  }
}

/**
 * Classify a text change using keyword bucket detection.
 *
 * Returns matched risk categories and a classifier-level risk assessment.
 * The LLM assessment from analyzeChange() is the primary signal;
 * this output is secondary confirmation.
 */
export function classifyRisk(addedText: string, removedText: string): ClassificationResult {
  const combinedText = `${addedText}\n${removedText}`;
  const buckets = detectRiskBuckets(combinedText);
  const primaryBucket = getHighestPriorityBucket(buckets);

  let priority: RiskPriority = 'low';
  if (primaryBucket) {
    priority = RISK_BUCKETS[primaryBucket].priority;
  }

  return {
    buckets,
    primaryBucket,
    priority,
    riskLevel: priorityToRiskLevel(priority),
  };
}
