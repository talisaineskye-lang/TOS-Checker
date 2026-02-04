// Risk bucket classifier for detecting which risk categories a change relates to

import {
  RiskBucket,
  RiskPriority,
  RISK_KEYWORDS,
  RISK_BUCKETS,
  BUCKET_PRIORITY_ORDER,
  bucketPriorityToRiskLevel,
} from './risk-buckets';

export interface ClassificationResult {
  buckets: RiskBucket[];
  primaryBucket: RiskBucket | null;
  priority: RiskPriority;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Detect which risk buckets a piece of text relates to
 */
export function detectRiskBuckets(text: string): RiskBucket[] {
  const lowercaseText = text.toLowerCase();
  const matched: RiskBucket[] = [];

  for (const [bucket, keywords] of Object.entries(RISK_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowercaseText.includes(keyword.toLowerCase())) {
        matched.push(bucket as RiskBucket);
        break; // one match per bucket is enough
      }
    }
  }

  return matched;
}

/**
 * Get the highest priority bucket from a list of matched buckets
 */
export function getHighestPriorityBucket(buckets: RiskBucket[]): RiskBucket | null {
  if (buckets.length === 0) return null;

  for (const bucket of BUCKET_PRIORITY_ORDER) {
    if (buckets.includes(bucket)) {
      return bucket;
    }
  }

  return buckets[0];
}

/**
 * Classify a text change and return the full classification result
 */
export function classifyChange(addedText: string, removedText: string): ClassificationResult {
  // Combine added and removed text for analysis
  const combinedText = `${addedText}\n${removedText}`;

  const buckets = detectRiskBuckets(combinedText);
  const primaryBucket = getHighestPriorityBucket(buckets);

  // Determine priority based on primary bucket
  let priority: RiskPriority = 'low';
  if (primaryBucket) {
    priority = RISK_BUCKETS[primaryBucket].priority;
  }

  // Convert to risk level for backward compatibility
  const riskLevel = bucketPriorityToRiskLevel(priority);

  return {
    buckets,
    primaryBucket,
    priority,
    riskLevel,
  };
}

/**
 * Get bucket display info
 */
export function getBucketDisplayInfo(bucket: RiskBucket) {
  return RISK_BUCKETS[bucket];
}

/**
 * Format buckets for storage (as string array)
 */
export function formatBucketsForStorage(buckets: RiskBucket[]): string[] {
  return buckets;
}

/**
 * Generate a title for an alert based on platform and bucket
 */
export function generateAlertTitle(platformName: string, bucket: RiskBucket | null): string {
  if (!bucket) {
    return `${platformName} – Policy updated`;
  }
  return `${platformName} – ${RISK_BUCKETS[bucket].name} change detected`;
}
