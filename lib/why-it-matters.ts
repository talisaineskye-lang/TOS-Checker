import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChangeInput {
  vendor: string;
  documentType: string;
  summary: string;
  riskBuckets: string[];
}

export async function generateWhyItMatters(change: ChangeInput): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    messages: [
      {
        role: 'user',
        content: `You write one-line alerts for indie developers and founders who use ${change.vendor}.

Change detected in: ${change.documentType}
Summary: ${change.summary}
Risk areas: ${change.riskBuckets.join(', ')}

Write a single "Why this affects you" line. Rules:
- 1-2 sentences, under 150 characters total
- Direct and slightly urgent, like a smart friend giving a heads-up
- Plain English, zero legal jargon
- Actionable: what should they do or watch out for
- No quotes, no prefix label, just the line itself`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === 'text');
  return text && 'text' in text ? text.text.trim() : '';
}
