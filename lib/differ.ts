import crypto from 'crypto';

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function hasChanged(oldHash: string, newHash: string): boolean {
  return oldHash !== newHash;
}

export function getBasicDiff(oldContent: string, newContent: string): {
  added: string[];
  removed: string[];
} {
  const oldSentences = new Set(
    oldContent
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
  );
  const newSentences = new Set(
    newContent
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
  );

  const added: string[] = [];
  const removed: string[] = [];

  newSentences.forEach((sentence) => {
    if (!oldSentences.has(sentence)) added.push(sentence);
  });

  oldSentences.forEach((sentence) => {
    if (!newSentences.has(sentence)) removed.push(sentence);
  });

  return { added, removed };
}

/**
 * Calculate the removal ratio: what fraction of the old content's sentences
 * are missing from the new content. Used for the 90% removal sanity check.
 */
export function getRemovalRatio(oldContent: string, newContent: string): number {
  const oldSentences = oldContent
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (oldSentences.length === 0) return 0;

  const newSentenceSet = new Set(
    newContent
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const removedCount = oldSentences.filter((s) => !newSentenceSet.has(s)).length;
  return removedCount / oldSentences.length;
}
