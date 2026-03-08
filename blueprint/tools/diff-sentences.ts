/**
 * diff-sentences.ts — Sentence-level diff for policy document changes.
 *
 * Extracted from StackDrift production engine (lib/differ.ts).
 *
 * - Splits content on sentence boundaries (.!? followed by whitespace or end)
 * - Computes added sentences (in new, not in old) and removed (in old, not in new)
 * - Caps total diff output at 12,000 characters to prevent context-length errors
 * - Includes SHA256 hashing for change detection
 */

import crypto from 'crypto';

const MAX_DIFF_CHARS = 12_000;
const TRUNCATED_HALF = 5_000;

/**
 * SHA256 hash of content string. Used for fast change detection.
 */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Compare two hashes. Returns true if they differ.
 */
export function hasChanged(oldHash: string, newHash: string): boolean {
  return oldHash !== newHash;
}

export interface DiffResult {
  added: string[];
  removed: string[];
  totalAddedChars: number;
  totalRemovedChars: number;
  truncated: boolean;
}

/**
 * Split text into sentences on .!? boundaries.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Compute sentence-level diff between old and new content.
 *
 * Returns arrays of added and removed sentences, capped at 12K total characters.
 */
export function diffSentences(oldContent: string, newContent: string): DiffResult {
  const oldSentences = new Set(splitSentences(oldContent));
  const newSentences = new Set(splitSentences(newContent));

  const added: string[] = [];
  const removed: string[] = [];

  newSentences.forEach((sentence) => {
    if (!oldSentences.has(sentence)) added.push(sentence);
  });

  oldSentences.forEach((sentence) => {
    if (!newSentences.has(sentence)) removed.push(sentence);
  });

  // Check if truncation is needed
  const totalChars = added.join('\n').length + removed.join('\n').length;
  let truncated = false;

  let effectiveAdded = added;
  let effectiveRemoved = removed;

  if (totalChars > MAX_DIFF_CHARS) {
    truncated = true;
    const truncateLines = (lines: string[], limit: number) => {
      const result: string[] = [];
      let chars = 0;
      for (const line of lines) {
        if (chars + line.length > limit) break;
        result.push(line);
        chars += line.length;
      }
      return result;
    };
    effectiveAdded = truncateLines(added, TRUNCATED_HALF);
    effectiveRemoved = truncateLines(removed, TRUNCATED_HALF);
  }

  return {
    added: effectiveAdded,
    removed: effectiveRemoved,
    totalAddedChars: added.join('\n').length,
    totalRemovedChars: removed.join('\n').length,
    truncated,
  };
}

/**
 * Calculate the removal ratio: what fraction of the old content's sentences
 * are missing from the new content. Used for the 90% removal sanity check.
 */
export function getRemovalRatio(oldContent: string, newContent: string): number {
  const oldSentences = splitSentences(oldContent);
  if (oldSentences.length === 0) return 0;

  const newSentenceSet = new Set(splitSentences(newContent));
  const removedCount = oldSentences.filter((s) => !newSentenceSet.has(s)).length;
  return removedCount / oldSentences.length;
}

/**
 * Detect full-document replacement: >80% sentences changed AND >100 total changed.
 * Indicates page redesign, language swap, or fetch anomaly.
 */
export function isFullReplacement(oldContent: string, newContent: string): boolean {
  const oldSentences = splitSentences(oldContent);
  const newSentences = splitSentences(newContent);
  const totalSentences = Math.max(oldSentences.length, newSentences.length);

  if (totalSentences === 0) return false;

  const oldSet = new Set(oldSentences);
  const newSet = new Set(newSentences);

  let changedCount = 0;
  newSentences.forEach((s) => { if (!oldSet.has(s)) changedCount++; });
  oldSentences.forEach((s) => { if (!newSet.has(s)) changedCount++; });

  const changeRatio = changedCount / totalSentences;
  return changeRatio > 0.8 && changedCount > 100;
}
