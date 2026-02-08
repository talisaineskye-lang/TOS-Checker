import { RawFeedItem } from './types';

// Keywords that signal relevance — if title or description contains
// ANY of these, the item passes through to classification.
const RELEVANCE_KEYWORDS = [
  // Vendor names (tracked stack)
  'stripe', 'paypal', 'openai', 'anthropic', 'aws', 'amazon web services',
  'google cloud', 'cloudflare', 'vercel', 'netlify', 'azure', 'github',
  'hugging face', 'square', 'wise', 'gumroad', 'paddle',
  'supabase', 'firebase', 'replit', 'bubble', 'webflow',
  'lovable', 'bolt.new', 'flutterflow', 'durable', 'replicate', 'perplexity',

  // TOS / legal signals
  'terms of service', 'privacy policy', 'acceptable use', 'tos update',
  'terms update', 'policy change', 'policy update', 'legal update',
  'data processing', 'data sharing', 'data retention', 'liability',
  'indemnif',

  // Regulatory signals
  'gdpr', 'ai act', 'eu ai', 'ftc', 'section 230', 'ccpa', 'cpra',
  'data protection', 'data sovereignty', 'privacy regulation',
  'regulatory', 'compliance', 'antitrust', 'dma', 'dsa',
  'consent', 'enforcement', 'fine', 'penalty',

  // Market signals
  'acqui', 'merger', 'outage', 'downtime', 'incident',
  'pricing change', 'price increase', 'price hike',
  'deprecat', 'api change', 'breaking change', 'rate limit',
  'funding round', 'series a', 'series b', 'series c',
  'ipo', 'layoff', 'restructur',

  // BUILD — tools, frameworks, developer experience
  'developer tool', 'dev tool', 'framework', 'sdk', 'cli tool',
  'open source', 'self-host', 'deploy', 'serverless', 'edge function',
  'database', 'postgres', 'prisma',
  'next.js', 'nextjs', 'react', 'svelte', 'remix', 'astro',
  'typescript', 'rust', 'wasm', 'webassembly',
  'v0', 'cursor', 'copilot', 'codeium', 'windsurf', 'bolt',
  'launch', 'release', 'changelog', 'beta',
  'performance', 'migration',

  // AI & TOOLS
  'ai model', 'llm', 'gpt', 'claude', 'gemini', 'llama', 'mistral',
  'chatgpt', 'ai agent', 'agentic', 'mcp',
  'prompt', 'fine-tun', 'embedding', 'rag', 'vector',
  'ai api', 'token', 'context window',
  'machine learning', 'neural', 'diffusion', 'image generation',
  'text to', 'speech to', 'voice ai',
  'ai startup', 'ai company', 'ai regulation', 'ai safety',
  'artificial intelligence',

  // BUSINESS — revenue, pricing, market moves
  'saas', 'mrr', 'arr', 'revenue', 'profit', 'margin',
  'bootstrap', 'indie hacker', 'solo founder', 'solopreneur',
  'startup', 'seed round', 'valuation', 'unicorn',
  'subscription', 'freemium', 'free tier', 'pricing model',
  'payment', 'billing', 'checkout', 'commerce',
  'market share', 'competitor', 'pivot',

  // GROWTH — marketing, distribution
  'seo', 'content marketing', 'newsletter', 'audience',
  'conversion', 'landing page', 'growth hack', 'viral',
  'distribution', 'product hunt', 'launch strategy',
  'retention', 'churn', 'onboarding', 'activation',

  // IDEAS & TRENDS
  'market gap', 'underserved', 'niche', 'untapped',
  'micro saas', 'micro-saas', 'side project', 'weekend project',
  'built in public', 'build in public', 'ship it',
  'pain point', 'opportunity',
  'trend', 'emerging', 'growing market',
  'saas idea', 'startup idea', 'project idea', 'app idea',
  'market research', 'competitor analysis', 'teardown',
  'revenue breakdown', 'how i built', 'lessons learned',
  'failed startup', 'post-mortem', 'what worked',
];

// Keywords that signal IRRELEVANCE — if a title contains these
// AND no relevance keywords, skip it.
const NOISE_KEYWORDS = [
  'tutorial', 'how to build', 'beginner guide', 'css trick',
  'review:', 'unboxing', 'best laptop', 'smartphone',
  'recipe', 'fitness', 'celebrity',
  'sponsored', 'partner content', 'advertorial',
  'roundup:', 'weekly digest',
  'podcast episode', 'podcast:', 'video:',
  'hiring', 'job opening', 'careers at',
  'holiday', 'black friday', 'cyber monday', 'sale:',
  'opinion:', 'editorial:', 'letter to',
  'sports', 'entertainment', 'gaming review',
  'crypto', 'nft', 'web3', 'blockchain', 'bitcoin', 'ethereum',
];

/**
 * Fast local keyword filter. Returns only items likely to be relevant.
 * Runs BEFORE Claude — saving money on every irrelevant item.
 */
export function prefilterItems(items: RawFeedItem[]): RawFeedItem[] {
  return items.filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();

    const hasRelevance = RELEVANCE_KEYWORDS.some((kw) => text.includes(kw));
    const hasNoise = NOISE_KEYWORDS.some((kw) => text.includes(kw));

    // Block if: noise keyword and no relevance signal
    if (hasNoise && !hasRelevance) return false;

    // Pass if: has relevance keyword
    if (hasRelevance) return true;

    // Regulatory feeds — always pass
    if (item.pillarHint === 'regulatory_intel') return true;

    // Vendor blog/changelog feeds — always pass (infrequent, usually signal)
    if (item.source.includes('Blog') || item.source.includes('Changelog') || item.source.includes('Whats New')) return true;

    // Community-curated sources — already filtered by upvotes/engagement
    if (item.source === 'Hacker News' || item.source === 'Hacker News RSS') return true;

    // Default: skip (applies to general news feeds without matching keywords)
    return false;
  });
}
