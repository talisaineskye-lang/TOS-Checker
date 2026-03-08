/**
 * analyze-change.ts — Send diff to Claude Sonnet for structured risk analysis.
 *
 * Extracted from StackDrift production engine (lib/analyzer.ts).
 *
 * - Calls Claude Sonnet with vendor name, document type, and sentence diff
 * - Requests structured JSON: summary, impact, action_items, risk_level, is_noise
 * - Retries once on transient errors (429, 5xx, network)
 * - Falls back to keyword-only classification if all attempts fail
 */

import Anthropic from '@anthropic-ai/sdk';
import { classifyRisk } from './classify-risk.js';

const anthropic = new Anthropic();

export interface AnalysisResult {
  summary: string;
  impact: string;
  action: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskBucket: string | null;
  categories: string[];
  isNoise: boolean;
  analysisFailed: boolean;
}

const MAX_DIFF_CHARS = 12_000;
const TRUNCATED_HALF = 5_000;

function isRetryable(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return status === 429 || status >= 500;
  }
  if (err instanceof Error && (err.message.includes('timeout') || err.message.includes('ECONNRESET') || err.message.includes('fetch failed'))) {
    return true;
  }
  return false;
}

function extractTextContent(content: Anthropic.Messages.Message['content']): string {
  const textBlock = content.find((block) => block.type === 'text');
  return textBlock && 'text' in textBlock ? textBlock.text : '';
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenced) return fenced[1].trim();
  const braces = raw.match(/\{[\s\S]*\}/);
  if (braces) return braces[0];
  return raw.trim();
}

/**
 * Analyze a detected change using Claude Sonnet.
 *
 * @param vendorName - Display name of the vendor (e.g. "Stripe")
 * @param docType - Document type label (e.g. "Terms of Service")
 * @param added - Array of added sentences from diff
 * @param removed - Array of removed sentences from diff
 * @returns Structured analysis result
 */
export async function analyzeChange(
  vendorName: string,
  docType: string,
  added: string[],
  removed: string[]
): Promise<AnalysisResult> {
  const addedText = added.join('\n');
  const removedText = removed.join('\n');
  const totalDiffChars = addedText.length + removedText.length;
  const classification = classifyRisk(addedText, removedText);

  // Truncate large diffs
  let effectiveAdded = added;
  let effectiveRemoved = removed;
  let truncationNote = '';

  if (totalDiffChars > MAX_DIFF_CHARS) {
    console.warn(`[analyze] Diff for "${vendorName}" is ${totalDiffChars} chars — truncating`);
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
    truncationNote = `\n\n[Diff truncated — showing first ~${TRUNCATED_HALF} chars of each section out of ${totalDiffChars} total chars.]`;
  }

  const prompt = `You are analyzing a policy/TOS change for "${vendorName}" (${docType}), a tool used by indie developers and SaaS founders. Write as if briefing a busy indie founder who has 30 seconds to decide if this matters to their business.

Here are the sentences that were ADDED:
${effectiveAdded.map((s) => `+ ${s}`).join('\n') || '(none)'}

Here are the sentences that were REMOVED:
${effectiveRemoved.map((s) => `- ${s}`).join('\n') || '(none)'}${truncationNote}

Risk categories to consider:
- ownership: Who owns generated code, IP rights, licensing
- training: Whether your code/data trains their AI models
- visibility: Project privacy defaults, public/private settings
- export: Can you leave the platform, self-host, data portability
- pricing: Commercial use limits, pricing changes, usage quotas
- deprecation: Model retirements, API version sunsets, migration deadlines

Analyze this change and respond with JSON only (no markdown, no backticks):
{
  "summary": "One sentence — what changed and why a founder should care.",
  "impact": "One to two sentences — who is affected and how.",
  "action": "One sentence — what to do right now.",
  "suggestedRiskLevel": "low" | "medium" | "high" | "critical",
  "isNoise": true | false
}

Risk levels:
- low: Minor wording changes, clarifications — no material impact
- medium: Visibility defaults, pricing adjustments, new usage caps
- high: Training data opt-outs removed, model deprecations, major export limitations
- critical: IP/ownership rights changed, retroactive policy changes, service discontinuation

IMPORTANT: Language translations with no substantive policy changes = "low" risk and isNoise: true.`;

  const callSonnet = () =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const message = await callSonnet();
      const responseText = extractTextContent(message.content);
      const jsonText = extractJson(responseText);

      const llmResult = JSON.parse(jsonText) as {
        summary: string;
        impact: string;
        action: string;
        suggestedRiskLevel: 'low' | 'medium' | 'high' | 'critical';
        isNoise: boolean;
      };

      if (!llmResult.summary || !llmResult.impact || !llmResult.suggestedRiskLevel) {
        throw new Error('Sonnet returned incomplete JSON');
      }

      console.log(`[analyze] "${vendorName}" → risk=${llmResult.suggestedRiskLevel}, noise=${llmResult.isNoise}`);

      return {
        summary: llmResult.summary,
        impact: llmResult.impact,
        action: llmResult.action,
        riskLevel: llmResult.suggestedRiskLevel,
        riskBucket: classification.primaryBucket,
        categories: classification.buckets,
        isNoise: llmResult.isNoise,
        analysisFailed: false,
      };
    } catch (err) {
      lastError = err;
      console.error(`[analyze] Claude API failed for "${vendorName}" (attempt ${attempt}/2):`, err instanceof Error ? err.message : err);

      if (attempt === 1 && isRetryable(err)) {
        console.log(`[analyze] Retrying "${vendorName}" in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      break;
    }
  }

  // Fallback: keyword-only classification
  console.error(`[analyze] All attempts failed for "${vendorName}" — using keyword fallback`);

  return {
    summary: 'Policy change detected. Review the document for details.',
    impact: 'Unable to assess impact — review the document manually.',
    action: 'Review the linked document for details.',
    riskLevel: classification.riskLevel,
    riskBucket: classification.primaryBucket,
    categories: classification.buckets,
    isNoise: false,
    analysisFailed: true,
  };
}
