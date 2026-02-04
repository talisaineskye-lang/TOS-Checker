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
