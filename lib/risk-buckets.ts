// Risk bucket definitions for AI Builders change classification

export type RiskBucket = 'ownership' | 'training' | 'visibility' | 'export' | 'pricing' | 'deprecation';
export type RiskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface RiskBucketConfig {
  name: string;
  priority: RiskPriority;
  color: string;
  icon: string;
  description: string;
}

export const RISK_BUCKETS: Record<RiskBucket, RiskBucketConfig> = {
  ownership: {
    name: 'Ownership & IP',
    priority: 'critical',
    color: 'red',
    icon: '🔴',
    description: 'Who owns generated code',
  },
  training: {
    name: 'Training & Data Reuse',
    priority: 'high',
    color: 'orange',
    icon: '🟠',
    description: 'Whether your code trains their models',
  },
  visibility: {
    name: 'Project Visibility',
    priority: 'high',
    color: 'yellow',
    icon: '🟡',
    description: 'Project privacy defaults',
  },
  export: {
    name: 'Export & Lock-in',
    priority: 'medium',
    color: 'blue',
    icon: '🔵',
    description: 'Can you leave the platform',
  },
  pricing: {
    name: 'Usage & Commercial',
    priority: 'medium',
    color: 'purple',
    icon: '🟣',
    description: 'Pricing enforcement and limits',
  },
  deprecation: {
    name: 'Deprecation & Retirement',
    priority: 'high',
    color: 'orange',
    icon: '🟠',
    description: 'Model or API version retirements and migration deadlines',
  },
} as const;

export const RISK_KEYWORDS: Record<RiskBucket, string[]> = {
  ownership: [
    'ownership of output',
    'generated code',
    'derivative works',
    'intellectual property',
    'license to use',
    'license to modify',
    'license to distribute',
    'non-exclusive',
    'perpetual',
    'royalty-free',
    'you grant us',
    'you own',
    'we own',
    'retain ownership',
    'assign',
    'transfer',
    'work product',
    'created content',
    'user content',
    'your content',
  ],
  training: [
    'training',
    'train our models',
    'improve our models',
    'machine learning',
    'aggregate data',
    'content submitted',
    'usage data',
    'telemetry',
    'feedback',
    'anonymized',
    'opt-out',
    'opt out',
    'model improvement',
    'ai training',
    'learning from',
  ],
  visibility: [
    'public',
    'private',
    'visibility',
    'default',
    'shared',
    'workspace',
    'collaborators',
    'gallery',
    'showcase',
    'discoverable',
    'searchable',
    'publicly available',
    'made public',
  ],
  export: [
    'export',
    'download',
    'self-host',
    'self host',
    'deployment',
    'deploy',
    'third-party hosting',
    'source code access',
    'restrictions',
    'limitations',
    'portability',
    'lock-in',
    'migration',
    'transfer out',
  ],
  pricing: [
    'commercial use',
    'production use',
    'fair use',
    'credits',
    'rate limit',
    'usage-based',
    'overage',
    'limits',
    'quota',
    'throttle',
    'subscription',
    'billing',
    'pricing',
    'plan',
    'tier',
  ],
  deprecation: [
    'deprecated',
    'deprecation',
    'retirement',
    'retired',
    'end of life',
    'end-of-life',
    'sunset',
    'sunsetted',
    'discontinued',
    'replaced by',
    'migration required',
    'no longer available',
    'no longer supported',
    'shutting down',
    'will be removed',
    'breaking change',
    'legacy',
  ],
};

// Priority order for bucket selection (highest priority first)
export const BUCKET_PRIORITY_ORDER: RiskBucket[] = [
  'ownership',
  'training',
  'deprecation',
  'visibility',
  'export',
  'pricing',
];

// Map risk bucket priority to the existing risk level system
export function bucketPriorityToRiskLevel(priority: RiskPriority): 'low' | 'medium' | 'high' {
  switch (priority) {
    case 'critical':
      return 'high';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
  }
}
