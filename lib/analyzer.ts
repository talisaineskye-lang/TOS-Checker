import Anthropic from '@anthropic-ai/sdk';
import { classifyChange, generateAlertTitle } from './classifier';
import { RiskBucket, RiskPriority, RISK_BUCKETS } from './risk-buckets';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalysisResult {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskBucket: RiskBucket | null;
  riskPriority: RiskPriority;
  categories: string[]; // Now stores matched risk buckets
  title: string;
}

function extractTextContent(content: Anthropic.Messages.Message['content']) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : '';
}

export async function analyzeChanges(
  serviceName: string,
  added: string[],
  removed: string[]
): Promise<AnalysisResult> {
  // First, classify the change using keyword detection
  const addedText = added.join('\n');
  const removedText = removed.join('\n');
  const classification = classifyChange(addedText, removedText);

  // Build context about detected risk buckets
  const detectedBucketInfo = classification.buckets.length > 0
    ? classification.buckets
        .map((b) => `- ${RISK_BUCKETS[b].name}: ${RISK_BUCKETS[b].description}`)
        .join('\n')
    : 'No specific risk categories detected from keywords.';

  const prompt = `You are analyzing a policy change for "${serviceName}", a tool used by indie developers.

Here are the sentences that were ADDED:
${added.map((sentence) => `+ ${sentence}`).join('\n') || '(none)'}

Here are the sentences that were REMOVED:
${removed.map((sentence) => `- ${sentence}`).join('\n') || '(none)'}

Our keyword analysis detected these risk categories:
${detectedBucketInfo}

Risk categories to consider:
- ownership: Who owns generated code, IP rights, licensing
- training: Whether your code/data trains their AI models
- visibility: Project privacy defaults, public/private settings
- export: Can you leave the platform, self-host, data portability
- pricing: Commercial use limits, pricing changes, usage quotas
- deprecation: Model retirements, API version sunsets, migration deadlines

Write a 1-2 sentence summary explaining what changed and why it matters to an indie developer using this tool. Be specific and direct. No jargon.

Examples of good summaries:
- "Generated code now grants the platform a perpetual license to use and display your work."
- "Private projects are now included in model training unless you manually opt out in settings."
- "Self-hosting your app now requires a Business plan. Free tier can only deploy to their platform."

Respond with JSON only (no markdown):
{
  "summary": "your 1-2 sentence summary here",
  "suggestedRiskLevel": "low" | "medium" | "high"
}

Risk levels:
- low: Minor wording changes, clarifications, no material impact, language/translation changes with no policy substance change
- medium: Some changes that could affect users (visibility, export, pricing changes)
- high: Ownership/IP changes, AI training policy changes, major restrictions, model deprecations or retirements

IMPORTANT: If the changes are purely a language translation (e.g. Spanish to English, or any language switch) with no substantive policy changes, this is ALWAYS "low" risk.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = extractTextContent(message.content);
    const llmResult = JSON.parse(responseText) as {
      summary: string;
      suggestedRiskLevel: 'low' | 'medium' | 'high';
    };

    // Trust the LLM's risk assessment as primary signal — it understands context
    // (e.g. translations, rewording) that keyword matching cannot distinguish
    const finalRiskLevel = llmResult.suggestedRiskLevel;

    // Derive priority from the LLM's risk level for consistency
    const finalPriority = riskLevelToPriority(finalRiskLevel);

    // Generate title based on platform and primary bucket
    const title = generateAlertTitle(serviceName, classification.primaryBucket);

    return {
      summary: llmResult.summary,
      riskLevel: finalRiskLevel,
      riskBucket: classification.primaryBucket,
      riskPriority: finalPriority,
      categories: classification.buckets,
      title,
    };
  } catch {
    // Fallback to keyword-only classification
    const title = generateAlertTitle(serviceName, classification.primaryBucket);

    return {
      summary: 'Policy change detected. Review the document for details.',
      riskLevel: classification.riskLevel,
      riskBucket: classification.primaryBucket,
      riskPriority: classification.priority,
      categories: classification.buckets,
      title,
    };
  }
}

function riskLevelToPriority(level: 'low' | 'medium' | 'high'): RiskPriority {
  switch (level) {
    case 'high': return 'critical';
    case 'medium': return 'medium';
    case 'low': return 'low';
  }
}
