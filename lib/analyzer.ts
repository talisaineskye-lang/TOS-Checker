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
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskBucket: RiskBucket | null;
  riskPriority: RiskPriority;
  categories: string[];
  title: string;
  isNoise: boolean;
  analysisFailed: boolean;
}

const MAX_DIFF_CHARS = 12_000;
const TRUNCATED_HALF = 5_000;

/** Returns true for transient errors worth retrying (rate limit, server error, network). */
function isRetryable(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return status === 429 || status >= 500;
  }
  // Network/timeout errors don't have a status code
  if (err instanceof Error && (err.message.includes('timeout') || err.message.includes('ECONNRESET') || err.message.includes('fetch failed'))) {
    return true;
  }
  return false;
}

function extractTextContent(content: Anthropic.Messages.Message['content']) {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : '';
}

/** Extract JSON from a response that might be wrapped in markdown code blocks. */
function extractJson(raw: string): string {
  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenced) return fenced[1].trim();
  // Otherwise try to extract the first { ... } object
  const braces = raw.match(/\{[\s\S]*\}/);
  if (braces) return braces[0];
  return raw.trim();
}

export async function analyzeChanges(
  serviceName: string,
  added: string[],
  removed: string[],
  effectiveDate?: string | null
): Promise<AnalysisResult> {
  // First, classify the change using keyword detection
  const addedText = added.join('\n');
  const removedText = removed.join('\n');
  const totalDiffChars = addedText.length + removedText.length;
  const classification = classifyChange(addedText, removedText);

  // Truncate large diffs to prevent context-length errors
  let effectiveAdded = added;
  let effectiveRemoved = removed;
  let truncationNote = '';

  if (totalDiffChars > MAX_DIFF_CHARS) {
    console.warn(`[analyzer] Diff for "${serviceName}" is ${totalDiffChars} chars — truncating to ~${TRUNCATED_HALF * 2} chars`);
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
    truncationNote = `\n\n[Diff truncated — showing first ~${TRUNCATED_HALF} chars of each section out of ${totalDiffChars} total chars. Focus your analysis on the visible changes.]`;
  }

  // Build context about detected risk buckets
  const detectedBucketInfo = classification.buckets.length > 0
    ? classification.buckets
        .map((b) => `- ${RISK_BUCKETS[b].name}: ${RISK_BUCKETS[b].description}`)
        .join('\n')
    : 'No specific risk categories detected from keywords.';

  const prompt = `You are analyzing a policy/TOS change for "${serviceName}", a tool used by indie developers and SaaS founders. Write as if briefing a busy indie founder who has 30 seconds to decide if this matters to their business.

Here are the sentences that were ADDED:
${effectiveAdded.map((sentence) => `+ ${sentence}`).join('\n') || '(none)'}

Here are the sentences that were REMOVED:
${effectiveRemoved.map((sentence) => `- ${sentence}`).join('\n') || '(none)'}${truncationNote}
${effectiveDate ? `\nDocument effective/update date: ${effectiveDate}` : ''}

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
- summary: One sentence — what changed and why a founder should care. Lead with the business consequence, not the legalese.
- impact: One to two sentences — who is affected and how. Be specific: "If you're a solo founder using X for client work..." or "Teams on the free tier who..." Reference dollar amounts, deadlines, or workflow changes when applicable.
- action: One sentence — what to do right now. Be specific (e.g., "Check your settings at X", "Budget for the Pro tier before DATE", "No action needed — this doesn't affect paid plans").
- suggestedRiskLevel: "low", "medium", "high", or "critical"
- isNoise: true if this is a non-substantive change (language translations, tracking ID rotations, session tokens, minor whitespace/formatting, internal reference numbers). false for everything else — even low-risk changes like contact email updates are NOT noise.

Risk levels:
- low: Minor wording changes, clarifications, contact info updates — no material impact on your business
- medium: Changes worth noting — visibility defaults, pricing adjustments, new usage caps, export tweaks
- high: Significant restrictions or policy shifts — training data opt-outs removed, model deprecations with deadlines, major export limitations
- critical: Immediate business impact — IP/ownership rights changed, code licensing modified, retroactive policy changes, service discontinuation

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
  "summary": "Free tier build minutes cut in half — you'll hit the cap faster if you deploy frequently.",
  "impact": "If you're a solo founder deploying more than twice a day on Hobby, you'll burn through the new 3,000/mo cap by mid-month. CI/CD-heavy projects are hit first.",
  "action": "Check your build minute usage in your dashboard. If you're over 3,000/mo, budget $20/mo for Pro or reduce deploy frequency.",
  "suggestedRiskLevel": "medium",
  "isNoise": false
}

Example 3 (high — training data change):
{
  "summary": "The opt-out for AI model training on private repos has been removed — your code is now training data.",
  "impact": "If you're building proprietary software or working under client NDAs, your private code is now included in training data with no way to prevent it. This is a compliance risk for anyone with data handling clauses in their contracts.",
  "action": "Migrate sensitive repos to an alternative platform before the next training cycle. Review client contracts for conflicting data handling clauses.",
  "suggestedRiskLevel": "high",
  "isNoise": false
}

Example 4 (critical — IP/licensing change):
{
  "summary": "Your generated code now comes with a perpetual license for the platform to use, display, and create derivative works — this applies retroactively.",
  "impact": "If you're building proprietary SaaS or client work, your code is no longer fully yours. The platform can use it for marketing, training, or competing products. Solo founders with a single flagship product are most exposed.",
  "action": "Review the updated licensing terms immediately. Export critical projects and evaluate alternative tools before the effective date.",
  "suggestedRiskLevel": "critical",
  "isNoise": false
}

IMPORTANT: If the changes are purely a language translation (e.g. Spanish to English, or any language switch) with no substantive policy changes, this is ALWAYS "low" risk and isNoise: true.

Respond with JSON only (no markdown, no backticks):
{
  "summary": "...",
  "impact": "...",
  "action": "...",
  "suggestedRiskLevel": "low" | "medium" | "high" | "critical",
  "isNoise": true | false
}`;

  const callSonnet = () =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

  let lastError: unknown;

  // Attempt up to 2 times: initial call + 1 retry for transient errors
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const message = await callSonnet();

      const responseText = extractTextContent(message.content);
      const jsonText = extractJson(responseText);

      console.log(`[analyzer] Raw Sonnet response for "${serviceName}" (${responseText.length} chars):`, responseText.slice(0, 500));

      const llmResult = JSON.parse(jsonText) as {
        summary: string;
        impact: string;
        action: string;
        suggestedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
        isNoise: boolean;
      };

      // Guard against missing fields — Sonnet might use different key names
      if (!llmResult.summary || !llmResult.impact || !llmResult.suggestedRiskLevel) {
        console.error(`[analyzer] Sonnet returned incomplete JSON for "${serviceName}":`, JSON.stringify(llmResult));
        throw new Error('Sonnet returned incomplete JSON — missing required fields');
      }

      // Trust the LLM's risk assessment as primary signal — it understands context
      // (e.g. translations, rewording) that keyword matching cannot distinguish
      const finalRiskLevel = llmResult.suggestedRiskLevel;

      // Derive priority from the LLM's risk level for consistency
      const finalPriority = riskLevelToPriority(finalRiskLevel);

      console.log(`[analyzer] "${serviceName}" → Sonnet: suggestedRiskLevel=${finalRiskLevel}, isNoise=${llmResult.isNoise} → stored: risk_level=${finalRiskLevel}, risk_priority=${finalPriority}${totalDiffChars > MAX_DIFF_CHARS ? ` (diff was truncated from ${totalDiffChars} chars)` : ''}`);

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
        analysisFailed: false,
      };
    } catch (err) {
      lastError = err;

      // Build structured error info for logging
      const errStatus = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : null;
      const errName = err instanceof Error ? err.name : 'UnknownError';
      const errMsg = err instanceof Error ? err.message : String(err);

      console.error(`[analyzer] Claude API failed for "${serviceName}" (attempt ${attempt}/2):`, {
        errorType: errName,
        status: errStatus,
        message: errMsg,
        diffChars: totalDiffChars,
        addedLines: added.length,
        removedLines: removed.length,
        truncated: totalDiffChars > MAX_DIFF_CHARS,
      });

      // Only retry on transient errors; bail immediately on 400 (context length) or other client errors
      if (attempt === 1 && isRetryable(err)) {
        console.log(`[analyzer] Retrying "${serviceName}" in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      break;
    }
  }

  // All attempts exhausted — return fallback with analysisFailed flag
  console.error(`[analyzer] All attempts failed for "${serviceName}" — returning fallback classification`);

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
    analysisFailed: true,
  };
}

// Map Sonnet's risk level to dashboard priority.
// Shift up so: high→critical, medium→high(warning), low→medium(notice).
// Noise is forced to 'low' priority before this function is called.
function riskLevelToPriority(level: 'low' | 'medium' | 'high' | 'critical'): RiskPriority {
  switch (level) {
    case 'critical': return 'critical';
    case 'high': return 'critical';
    case 'medium': return 'high';
    case 'low': return 'medium';
  }
}
