import Anthropic from '@anthropic-ai/sdk';
import { classifyChange, generateAlertTitle } from './classifier';
import { RiskBucket, RiskPriority, RISK_BUCKETS } from './risk-buckets';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AnalysisResult {
  summary: string;
  impact: string;
  action: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskBucket: RiskBucket | null;
  riskPriority: RiskPriority;
  categories: string[];
  title: string;
  isNoise: boolean;
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

  const prompt = `You are analyzing a policy/TOS change for "${serviceName}", a tool used by indie developers and SaaS builders. Your analysis will appear in a developer newsletter called "Drift Intel" — write like a smart colleague giving a heads-up, not a lawyer drafting a memo.

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

Analyze this change and respond with the following fields:
- summary: One sentence — what specifically changed. Lead with the consequence, not the legalese.
- impact: One to two sentences — why this matters to an indie dev's business. Be concrete: mention specific scenarios, dollar amounts if applicable, workflow changes. Think "If you're doing X, this means Y for you."
- action: One sentence — what the developer should do about it. Be specific (e.g., "Check your settings at X", "Evaluate alternatives before DATE", "No action required.").
- suggestedRiskLevel: "low", "medium", or "high"
- isNoise: true if this is a non-substantive change (language translations, tracking ID rotations, session tokens, minor whitespace/formatting, internal reference numbers). false for everything else — even low-risk changes like contact email updates or minor date corrections are NOT noise.

Risk levels:
- low: Minor wording changes, clarifications, no material impact, language/translation changes with no policy substance change
- medium: Changes that could affect users — visibility defaults, export restrictions, pricing adjustments, new usage caps
- high: Ownership/IP changes, AI training policy changes, major restrictions, model deprecations or retirements

Here are examples of the tone and specificity expected:

Example 1 (low / noise — tracking ID rotation):
{
  "summary": "Internal tracking ID rotated — no policy content changed.",
  "impact": "None — this is a technical artifact, not a policy change.",
  "action": "No action required.",
  "suggestedRiskLevel": "low",
  "isNoise": true
}

Example 2 (medium — pricing cap change):
{
  "summary": "Free tier build minutes reduced from 6,000 to 3,000 per month.",
  "impact": "If you're deploying more than twice a day on Hobby, you'll hit the new cap mid-month. Projects with CI/CD pipelines will be affected first.",
  "action": "Check your current build minute usage in your dashboard. If you're over 3,000/mo, budget for the Pro upgrade ($20/mo) or reduce deploy frequency.",
  "suggestedRiskLevel": "medium",
  "isNoise": false
}

Example 3 (high — IP/licensing change):
{
  "summary": "Code generated on the platform now grants a perpetual, royalty-free license for the platform to use, display, and create derivative works.",
  "impact": "Any code you generate using this tool can now be used by the platform for any purpose, including training future models or showcasing in marketing. This applies retroactively to existing projects. If you're building proprietary software or client work, your code is no longer fully yours.",
  "action": "Review the updated licensing terms immediately. Consider exporting critical projects and moving to an alternative tool before the effective date.",
  "suggestedRiskLevel": "high",
  "isNoise": false
}

Example 4 (high — training data opt-out removal):
{
  "summary": "The opt-out for AI model training on private repositories has been removed.",
  "impact": "Your private code is now included in training data with no way to prevent it. If you're working on proprietary algorithms or client projects under NDA, this is a compliance risk.",
  "action": "Migrate sensitive repositories to an alternative platform before the next training cycle. Check if your client contracts have data handling clauses that conflict with this change.",
  "suggestedRiskLevel": "high",
  "isNoise": false
}

IMPORTANT: If the changes are purely a language translation (e.g. Spanish to English, or any language switch) with no substantive policy changes, this is ALWAYS "low" risk and isNoise: true.

Respond with JSON only (no markdown, no backticks):
{
  "summary": "...",
  "impact": "...",
  "action": "...",
  "suggestedRiskLevel": "low" | "medium" | "high",
  "isNoise": true | false
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = extractTextContent(message.content);
    const llmResult = JSON.parse(responseText) as {
      summary: string;
      impact: string;
      action: string;
      suggestedRiskLevel: 'low' | 'medium' | 'high';
      isNoise: boolean;
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
      impact: llmResult.impact,
      action: llmResult.action,
      riskLevel: finalRiskLevel,
      riskBucket: classification.primaryBucket,
      riskPriority: finalPriority,
      categories: classification.buckets,
      title,
      isNoise: llmResult.isNoise,
    };
  } catch (err) {
    // Log the actual error so we can diagnose API failures
    console.error(
      `[analyzer] Claude API failed for "${serviceName}":`,
      err instanceof Error ? err.message : err
    );

    // Fallback to keyword-only classification
    const title = generateAlertTitle(serviceName, classification.primaryBucket);

    return {
      summary: 'Policy change detected. Review the document for details.',
      impact: 'Unable to assess impact — review the document manually.',
      action: 'Review the linked document for details.',
      riskLevel: classification.riskLevel,
      riskBucket: classification.primaryBucket,
      riskPriority: classification.priority,
      categories: classification.buckets,
      title,
      isNoise: false,
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
