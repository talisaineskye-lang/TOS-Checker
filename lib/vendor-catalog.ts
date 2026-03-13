import { VendorTemplate, VendorCategory } from './types';

export const VENDOR_CATALOG: VendorTemplate[] = [
  // ============ PAYMENT & FINANCE ============
  {
    slug: 'stripe',
    name: 'Stripe',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://stripe.com',
    category: 'payment_finance',
    baseUrl: 'https://stripe.com',
    documents: [
      { type: 'tos', url: 'https://stripe.com/legal/ssa' },
      { type: 'privacy', url: 'https://stripe.com/privacy' },
      { type: 'aup', url: 'https://stripe.com/legal/restricted-businesses' },
      { type: 'pricing', url: 'https://stripe.com/pricing' },
      { type: 'api_terms', url: 'https://stripe.com/legal/spc' },
    ],
    isDefault: true,
  },
  {
    slug: 'paypal',
    name: 'PayPal',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://paypal.com',
    category: 'payment_finance',
    baseUrl: 'https://paypal.com',
    documents: [
      { type: 'tos', url: 'https://www.paypal.com/us/legalhub/useragreement-full' },
      { type: 'privacy', url: 'https://www.paypal.com/us/legalhub/privacy-full' },
      { type: 'aup', url: 'https://www.paypal.com/us/legalhub/acceptableuse-full' },
      { type: 'pricing', url: 'https://www.paypal.com/us/webapps/mpp/merchant-fees' },
    ],
  },
  {
    slug: 'square',
    name: 'Square',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://squareup.com',
    category: 'payment_finance',
    baseUrl: 'https://squareup.com',
    documents: [
      { type: 'tos', url: 'https://squareup.com/us/en/legal/general/ua' },
      { type: 'privacy', url: 'https://squareup.com/us/en/legal/general/privacy' },
      { type: 'aup', url: 'https://squareup.com/us/en/legal/general/payment-terms' },
      { type: 'pricing', url: 'https://squareup.com/us/en/payments' },
    ],
  },
  {
    slug: 'wise',
    name: 'Wise',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://wise.com',
    category: 'payment_finance',
    baseUrl: 'https://wise.com',
    documents: [
      { type: 'tos', url: 'https://wise.com/us/terms-of-use' },
      { type: 'privacy', url: 'https://wise.com/gb/legal/privacy-notice-personal-en' },
      { type: 'aup', url: 'https://wise.com/acceptable-use-policy' },
    ],
  },
  {
    slug: 'gumroad',
    name: 'Gumroad',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://gumroad.com',
    category: 'payment_finance',
    baseUrl: 'https://gumroad.com',
    documents: [
      { type: 'tos', url: 'https://gumroad.com/terms' },
      { type: 'privacy', url: 'https://gumroad.com/privacy' },
      { type: 'aup', url: 'https://gumroad.com/prohibited' },
      { type: 'pricing', url: 'https://gumroad.com/features/pricing' },
    ],
  },
  {
    slug: 'paddle',
    name: 'Paddle',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://paddle.com',
    category: 'payment_finance',
    baseUrl: 'https://paddle.com',
    documents: [
      { type: 'tos', url: 'https://www.paddle.com/legal/terms' },
      { type: 'privacy', url: 'https://www.paddle.com/legal/privacy' },
      { type: 'aup', url: 'https://www.paddle.com/legal/aup' },
      { type: 'pricing', url: 'https://www.paddle.com/pricing' },
    ],
  },

  // ============ CLOUD & INFRASTRUCTURE ============
  {
    slug: 'aws',
    name: 'AWS',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://aws.amazon.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://aws.amazon.com',
    documents: [
      { type: 'tos', url: 'https://aws.amazon.com/service-terms/' },
      { type: 'privacy', url: 'https://aws.amazon.com/privacy/' },
      { type: 'aup', url: 'https://aws.amazon.com/aup/' },
    ],
  },
  {
    slug: 'google-cloud',
    name: 'Google Cloud',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://cloud.google.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://cloud.google.com',
    documents: [
      { type: 'tos', url: 'https://cloud.google.com/terms' },
      { type: 'privacy', url: 'https://cloud.google.com/terms/cloud-privacy-notice' },
      { type: 'aup', url: 'https://cloud.google.com/terms/aup' },
    ],
    isDefault: true,
  },
  {
    slug: 'azure',
    name: 'Azure',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://azure.microsoft.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://azure.microsoft.com',
    documents: [
      { type: 'tos', url: 'https://azure.microsoft.com/en-us/support/legal/' },
      { type: 'privacy', url: 'https://privacy.microsoft.com/en-us/privacystatement' },
      { type: 'aup', url: 'https://www.microsoft.com/en-us/legal/terms-of-use' },
    ],
  },
  {
    slug: 'cloudflare',
    name: 'Cloudflare',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://cloudflare.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://cloudflare.com',
    documents: [
      { type: 'tos', url: 'https://www.cloudflare.com/terms/' },
      { type: 'privacy', url: 'https://www.cloudflare.com/privacypolicy/' },
      { type: 'aup', url: 'https://www.cloudflare.com/terms/' },
    ],
  },
  {
    slug: 'vercel',
    name: 'Vercel',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://vercel.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://vercel.com',
    documents: [
      { type: 'tos', url: 'https://vercel.com/legal/terms' },
      { type: 'privacy', url: 'https://vercel.com/legal/privacy-policy' },
      { type: 'aup', url: 'https://vercel.com/legal/acceptable-use-policy' },
    ],
    isDefault: true,
  },
  {
    slug: 'netlify',
    name: 'Netlify',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://netlify.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://netlify.com',
    documents: [
      { type: 'tos', url: 'https://www.netlify.com/legal/terms-of-use/' },
      { type: 'privacy', url: 'https://www.netlify.com/privacy/' },
      { type: 'aup', url: 'https://www.netlify.com/legal/acceptable-use-policy/' },
    ],
  },

  // ============ AI & MACHINE LEARNING ============
  {
    slug: 'openai',
    name: 'OpenAI',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://openai.com',
    category: 'ai_ml',
    baseUrl: 'https://openai.com',
    documents: [
      { type: 'tos', url: 'https://openai.com/policies/terms-of-use' },
      { type: 'privacy', url: 'https://openai.com/policies/privacy-policy' },
      { type: 'aup', url: 'https://openai.com/policies/usage-policies' },
      { type: 'api_terms', url: 'https://openai.com/policies/business-terms' },
      { type: 'changelog', url: 'https://platform.openai.com/docs/deprecations' },
    ],
    isDefault: true,
  },
  {
    slug: 'anthropic',
    name: 'Anthropic',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://anthropic.com',
    category: 'ai_ml',
    baseUrl: 'https://anthropic.com',
    documents: [
      { type: 'tos', url: 'https://www.anthropic.com/legal/consumer-terms' },
      { type: 'privacy', url: 'https://www.anthropic.com/legal/privacy' },
      { type: 'aup', url: 'https://www.anthropic.com/legal/aup' },
      { type: 'api_terms', url: 'https://www.anthropic.com/legal/commercial-terms' },
      { type: 'changelog', url: 'https://docs.anthropic.com/en/docs/about-claude/model-deprecations' },
    ],
  },
  {
    slug: 'google-gemini',
    name: 'Google Gemini',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://gemini.google.com',
    category: 'ai_ml',
    baseUrl: 'https://gemini.google.com',
    documents: [
      { type: 'tos', url: 'https://policies.google.com/terms' },
      { type: 'privacy', url: 'https://policies.google.com/privacy' },
      { type: 'aup', url: 'https://policies.google.com/terms/generative-ai' },
      { type: 'api_terms', url: 'https://ai.google.dev/terms' },
      { type: 'changelog', url: 'https://ai.google.dev/gemini-api/docs/deprecations' },
    ],
  },
  {
    slug: 'perplexity',
    name: 'Perplexity',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://perplexity.ai',
    category: 'ai_ml',
    baseUrl: 'https://perplexity.ai',
    documents: [
      { type: 'tos', url: 'https://www.perplexity.ai/hub/legal/terms-of-service' },
      { type: 'privacy', url: 'https://www.perplexity.ai/hub/legal/privacy-policy' },
      { type: 'aup', url: 'https://www.perplexity.ai/hub/legal/terms-of-service' },
    ],
  },
  {
    slug: 'huggingface',
    name: 'Hugging Face',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://huggingface.co',
    category: 'ai_ml',
    baseUrl: 'https://huggingface.co',
    documents: [
      { type: 'tos', url: 'https://huggingface.co/terms-of-service' },
      { type: 'privacy', url: 'https://huggingface.co/privacy' },
      { type: 'aup', url: 'https://huggingface.co/content-guidelines' },
    ],
  },
  {
    slug: 'replicate',
    name: 'Replicate',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://replicate.com',
    category: 'ai_ml',
    baseUrl: 'https://replicate.com',
    documents: [
      { type: 'tos', url: 'https://replicate.com/terms' },
      { type: 'privacy', url: 'https://replicate.com/privacy' },
      { type: 'aup', url: 'https://replicate.com/terms' },
      { type: 'api_terms', url: 'https://replicate.com/terms' },
    ],
  },

  // ============ AI BUILDERS ============
  {
    slug: 'lovable',
    name: 'Lovable',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://lovable.dev',
    category: 'ai_builders',
    baseUrl: 'https://lovable.dev',
    documents: [
      { type: 'tos', url: 'https://lovable.dev/terms' },
      { type: 'privacy', url: 'https://lovable.dev/privacy' },
      { type: 'aup', url: 'https://lovable.dev/terms' },
    ],
  },
  {
    slug: 'bolt',
    name: 'Bolt.new',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://bolt.new',
    category: 'ai_builders',
    baseUrl: 'https://bolt.new',
    documents: [
      { type: 'tos', url: 'https://bolt.new/terms' },
      { type: 'privacy', url: 'https://bolt.new/privacy' },
      { type: 'aup', url: 'https://bolt.new/terms' },
    ],
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://cursor.com',
    category: 'ai_builders',
    baseUrl: 'https://cursor.com',
    documents: [
      { type: 'tos', url: 'https://www.cursor.com/terms-of-service' },
      { type: 'privacy', url: 'https://www.cursor.com/privacy' },
      { type: 'aup', url: 'https://www.cursor.com/terms' },
    ],
  },
  {
    slug: 'replit',
    name: 'Replit',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://replit.com',
    category: 'ai_builders',
    baseUrl: 'https://replit.com',
    documents: [
      { type: 'tos', url: 'https://replit.com/site/terms' },
      { type: 'privacy', url: 'https://replit.com/site/privacy' },
      { type: 'aup', url: 'https://docs.replit.com/legal-and-security-info/usage' },
    ],
  },
  {
    slug: 'vercel-v0',
    name: 'Vercel v0',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://v0.dev',
    category: 'ai_builders',
    baseUrl: 'https://v0.dev',
    documents: [
      { type: 'tos', url: 'https://vercel.com/legal/terms' },
      { type: 'privacy', url: 'https://vercel.com/legal/privacy-policy' },
      { type: 'aup', url: 'https://vercel.com/legal/acceptable-use-policy' },
    ],
  },
  {
    slug: 'bubble',
    name: 'Bubble',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://bubble.io',
    category: 'ai_builders',
    baseUrl: 'https://bubble.io',
    documents: [
      { type: 'tos', url: 'https://bubble.io/terms' },
      { type: 'privacy', url: 'https://bubble.io/privacy' },
      { type: 'aup', url: 'https://bubble.io/terms' },
    ],
  },
  {
    slug: 'flutterflow',
    name: 'FlutterFlow',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://flutterflow.io',
    category: 'ai_builders',
    baseUrl: 'https://flutterflow.io',
    documents: [
      { type: 'tos', url: 'https://flutterflow.io/tos' },
      { type: 'privacy', url: 'https://flutterflow.io/privacy' },
      { type: 'aup', url: 'https://flutterflow.io/tos' },
    ],
  },
  {
    slug: 'webflow',
    name: 'Webflow',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://webflow.com',
    category: 'ai_builders',
    baseUrl: 'https://webflow.com',
    documents: [
      { type: 'tos', url: 'https://webflow.com/legal/terms' },
      { type: 'privacy', url: 'https://webflow.com/legal/privacy' },
      { type: 'aup', url: 'https://webflow.com/legal/terms' },
    ],
  },
  {
    slug: 'framer',
    name: 'Framer',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://framer.com',
    category: 'ai_builders',
    baseUrl: 'https://framer.com',
    documents: [
      { type: 'tos', url: 'https://www.framer.com/legal/terms-of-service/' },
      { type: 'privacy', url: 'https://www.framer.com/legal/privacy-statement/' },
      { type: 'aup', url: 'https://www.framer.com/legal/acceptable-use-policy/' },
    ],
  },
  // ============ DEVELOPER TOOLS ============
  {
    slug: 'github',
    name: 'GitHub',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://github.com',
    category: 'developer_tools',
    baseUrl: 'https://github.com',
    documents: [
      { type: 'tos', url: 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service' },
      { type: 'privacy', url: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' },
      { type: 'aup', url: 'https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies' },
      { type: 'api_terms', url: 'https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features' },
      { type: 'tos', url: 'https://github.com/customer-terms/github-copilot-product-specific-terms' },
      { type: 'tos', url: 'https://github.com/customer-terms/github-enterprise-cloud-product-specific-terms' },
      { type: 'tos', url: 'https://github.com/customer-terms/github-enterprise-server-product-specific-terms' },
      { type: 'tos', url: 'https://github.com/customer-terms/github-data-protection-agreement' },
      { type: 'pricing', url: 'https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions' },
      { type: 'changelog', url: 'https://github.com/customer-terms/updates' },
    ],
    isDefault: true,
  },

  // ============ AUTOMATION & WORKFLOW ============
  {
    slug: 'n8n',
    name: 'n8n',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://n8n.io',
    category: 'automation',
    baseUrl: 'https://n8n.io',
    documents: [
      { type: 'tos', url: 'https://n8n.io/legal/terms' },
      { type: 'privacy', url: 'https://n8n.io/legal/privacy' },
    ],
  },
  {
    slug: 'zapier',
    name: 'Zapier',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://zapier.com',
    category: 'automation',
    baseUrl: 'https://zapier.com',
    documents: [
      { type: 'tos', url: 'https://zapier.com/legal/terms-of-service' },
      { type: 'privacy', url: 'https://zapier.com/privacy' },
    ],
  },
  {
    slug: 'make',
    name: 'Make',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://make.com',
    category: 'automation',
    baseUrl: 'https://make.com',
    documents: [
      { type: 'tos', url: 'https://www.make.com/en/terms-of-service' },
      { type: 'privacy', url: 'https://www.make.com/en/privacy-notice' },
    ],
  },

  // ============ AI AGENTS & PLATFORMS ============
  {
    slug: 'manus',
    name: 'Manus',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://manus.im',
    category: 'ai_ml',
    baseUrl: 'https://manus.im',
    documents: [
      { type: 'tos', url: 'https://manus.im/terms' },
      { type: 'privacy', url: 'https://manus.im/privacy' },
    ],
  },
  {
    slug: 'openrouter',
    name: 'OpenRouter',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://openrouter.ai',
    category: 'ai_ml',
    baseUrl: 'https://openrouter.ai',
    documents: [
      { type: 'tos', url: 'https://openrouter.ai/terms' },
      { type: 'privacy', url: 'https://openrouter.ai/privacy' },
    ],
  },
  {
    slug: 'groq',
    name: 'Groq',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://groq.com',
    category: 'ai_ml',
    baseUrl: 'https://groq.com',
    documents: [
      { type: 'tos', url: 'https://groq.com/terms-of-use/' },
      { type: 'privacy', url: 'https://groq.com/privacy-policy/' },
    ],
  },
  {
    slug: 'mistral-ai',
    name: 'Mistral AI',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://mistral.ai',
    category: 'ai_ml',
    baseUrl: 'https://mistral.ai',
    documents: [
      { type: 'tos', url: 'https://mistral.ai/terms/' },
      { type: 'privacy', url: 'https://mistral.ai/terms/#privacy-policy' },
    ],
  },
  {
    slug: 'wispr-flow',
    name: 'Wispr Flow',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://wisprflow.ai',
    category: 'ai_ml',
    baseUrl: 'https://wisprflow.ai',
    documents: [
      { type: 'tos', url: 'https://www.wisprflow.ai/terms' },
      { type: 'privacy', url: 'https://www.wisprflow.ai/privacy' },
    ],
  },
  {
    slug: 'pinecone',
    name: 'Pinecone',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://pinecone.io',
    category: 'ai_ml',
    baseUrl: 'https://pinecone.io',
    documents: [
      { type: 'tos', url: 'https://www.pinecone.io/terms/' },
      { type: 'privacy', url: 'https://www.pinecone.io/privacy/' },
    ],
  },
  {
    slug: 'windsurf',
    name: 'Windsurf',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://windsurf.com',
    category: 'ai_builders',
    baseUrl: 'https://windsurf.com',
    documents: [
      { type: 'tos', url: 'https://windsurf.com/terms-of-service' },
      { type: 'privacy', url: 'https://windsurf.com/privacy-policy' },
    ],
  },

  // ============ ANALYTICS ============
  {
    slug: 'posthog',
    name: 'PostHog',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://posthog.com',
    category: 'analytics',
    baseUrl: 'https://posthog.com',
    documents: [
      { type: 'tos', url: 'https://posthog.com/terms' },
      { type: 'privacy', url: 'https://posthog.com/privacy' },
    ],
  },
  {
    slug: 'plausible',
    name: 'Plausible',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://plausible.io',
    category: 'analytics',
    baseUrl: 'https://plausible.io',
    documents: [
      { type: 'tos', url: 'https://plausible.io/terms' },
      { type: 'privacy', url: 'https://plausible.io/privacy' },
    ],
  },
  {
    slug: 'mixpanel',
    name: 'Mixpanel',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://mixpanel.com',
    category: 'analytics',
    baseUrl: 'https://mixpanel.com',
    documents: [
      { type: 'tos', url: 'https://mixpanel.com/legal/terms-of-use/' },
      { type: 'privacy', url: 'https://mixpanel.com/legal/privacy-policy/' },
    ],
  },

  // ============ SCRAPING & DATA ============
  {
    slug: 'apify',
    name: 'Apify',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://apify.com',
    category: 'scraping',
    baseUrl: 'https://apify.com',
    documents: [
      { type: 'tos', url: 'https://apify.com/terms-of-use' },
      { type: 'privacy', url: 'https://apify.com/privacy-policy' },
    ],
  },
  {
    slug: 'firecrawl',
    name: 'Firecrawl',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://firecrawl.dev',
    category: 'scraping',
    baseUrl: 'https://firecrawl.dev',
    documents: [
      { type: 'tos', url: 'https://www.firecrawl.dev/terms' },
      { type: 'privacy', url: 'https://www.firecrawl.dev/privacy' },
    ],
  },
  {
    slug: 'browserbase',
    name: 'Browserbase',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://browserbase.com',
    category: 'scraping',
    baseUrl: 'https://browserbase.com',
    documents: [
      { type: 'tos', url: 'https://www.browserbase.com/terms-of-service' },
      { type: 'privacy', url: 'https://www.browserbase.com/privacy-policy' },
    ],
  },

  // ============ INFRASTRUCTURE & DEPLOY ============
  {
    slug: 'railway',
    name: 'Railway',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://railway.app',
    category: 'cloud_infrastructure',
    baseUrl: 'https://railway.app',
    documents: [
      { type: 'tos', url: 'https://railway.app/legal/terms' },
      { type: 'privacy', url: 'https://railway.app/legal/privacy' },
    ],
  },
  {
    slug: 'render',
    name: 'Render',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://render.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://render.com',
    documents: [
      { type: 'tos', url: 'https://render.com/terms' },
      { type: 'privacy', url: 'https://render.com/privacy' },
    ],
  },
  {
    slug: 'neon',
    name: 'Neon',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://neon.tech',
    category: 'cloud_infrastructure',
    baseUrl: 'https://neon.tech',
    documents: [
      { type: 'tos', url: 'https://neon.tech/terms-of-service' },
      { type: 'privacy', url: 'https://neon.tech/privacy-policy' },
    ],
  },
  {
    slug: 'resend',
    name: 'Resend',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://resend.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://resend.com',
    documents: [
      { type: 'tos', url: 'https://resend.com/legal/terms-of-service' },
      { type: 'privacy', url: 'https://resend.com/legal/privacy-policy' },
    ],
  },
  {
    slug: 'docker',
    name: 'Docker',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://docker.com',
    category: 'cloud_infrastructure',
    baseUrl: 'https://docker.com',
    documents: [
      { type: 'tos', url: 'https://www.docker.com/legal/docker-terms-service/' },
      { type: 'privacy', url: 'https://www.docker.com/legal/docker-privacy-policy/' },
    ],
  },

  // ============ PRODUCTIVITY & BUSINESS ============
  {
    slug: 'notion',
    name: 'Notion',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://notion.so',
    category: 'productivity',
    baseUrl: 'https://notion.so',
    documents: [
      { type: 'tos', url: 'https://www.notion.so/Terms-and-Privacy-28ffdd083dc3473e9c2da6ec011b58ac' },
      { type: 'privacy', url: 'https://www.notion.so/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091' },
    ],
  },
  {
    slug: 'lemon-squeezy',
    name: 'Lemon Squeezy',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://lemonsqueezy.com',
    category: 'payment_finance',
    baseUrl: 'https://lemonsqueezy.com',
    documents: [
      { type: 'tos', url: 'https://www.lemonsqueezy.com/terms' },
      { type: 'privacy', url: 'https://www.lemonsqueezy.com/privacy' },
    ],
  },
  {
    slug: 'cal-com',
    name: 'Cal.com',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://cal.com',
    category: 'productivity',
    baseUrl: 'https://cal.com',
    documents: [
      { type: 'tos', url: 'https://cal.com/terms' },
      { type: 'privacy', url: 'https://cal.com/privacy' },
    ],
  },
  {
    slug: 'linear',
    name: 'Linear',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://linear.app',
    category: 'productivity',
    baseUrl: 'https://linear.app',
    documents: [
      { type: 'tos', url: 'https://linear.app/terms' },
      { type: 'privacy', url: 'https://linear.app/privacy' },
    ],
  },
  {
    slug: 'slack',
    name: 'Slack',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://slack.com',
    category: 'productivity',
    baseUrl: 'https://slack.com',
    documents: [
      { type: 'tos', url: 'https://slack.com/terms-of-service' },
      { type: 'privacy', url: 'https://slack.com/privacy-policy' },
    ],
  },
  {
    slug: 'xero',
    name: 'Xero',
    logoUrl: 'https://www.google.com/s2/favicons?sz=128&domain_url=https://xero.com',
    category: 'productivity',
    baseUrl: 'https://xero.com',
    documents: [
      { type: 'tos', url: 'https://www.xero.com/legal/terms/' },
      { type: 'privacy', url: 'https://www.xero.com/legal/privacy/' },
      { type: 'api_terms', url: 'https://developer.xero.com/xero-developer-platform-terms-conditions' },
      { type: 'api_terms', url: 'https://developer.xero.com/xero-developer-platform-commercial-terms' },
      { type: 'pricing', url: 'https://developer.xero.com/pricing' },
      { type: 'changelog', url: 'https://developer.xero.com/faq/pricing-and-policy-updates' },
      { type: 'changelog', url: 'https://developer.xero.com/changelog' },
    ],
  },
];

// Category order for display
export const CATEGORY_ORDER: VendorCategory[] = [
  'payment_finance',
  'cloud_infrastructure',
  'ai_ml',
  'ai_builders',
  'developer_tools',
  'automation',
  'analytics',
  'scraping',
  'productivity',
];

// Get vendors grouped by category
export function getVendorsByCategory(): Record<VendorCategory, VendorTemplate[]> {
  const grouped: Record<VendorCategory, VendorTemplate[]> = {
    payment_finance: [],
    cloud_infrastructure: [],
    ai_ml: [],
    ai_builders: [],
    developer_tools: [],
    automation: [],
    analytics: [],
    scraping: [],
    productivity: [],
  };

  for (const vendor of VENDOR_CATALOG) {
    grouped[vendor.category].push(vendor);
  }

  return grouped;
}

// Get default vendors
export function getDefaultVendors(): VendorTemplate[] {
  return VENDOR_CATALOG.filter((v) => v.isDefault);
}

// Find vendor by slug
export function getVendorBySlug(slug: string): VendorTemplate | undefined {
  return VENDOR_CATALOG.find((v) => v.slug === slug);
}
