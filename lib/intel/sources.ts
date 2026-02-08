import { ContentPillar } from './types';

export interface FeedSource {
  name: string;
  url: string;
  pillar: ContentPillar;
}

// Regulatory intel
export const REGULATORY_FEEDS: FeedSource[] = [
  { name: 'IAPP Daily Dashboard',   url: 'https://iapp.org/news/rss/',                                         pillar: 'regulatory_intel' },
  { name: 'FTC Press Releases',     url: 'https://www.ftc.gov/feeds/press-releases.xml',                       pillar: 'regulatory_intel' },
  { name: 'ICO UK News',            url: 'https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/rss/',   pillar: 'regulatory_intel' },
  { name: 'EFF Deeplinks',          url: 'https://www.eff.org/rss/updates.xml',                                 pillar: 'regulatory_intel' },
  { name: 'Lawfare',                url: 'https://www.lawfaremedia.org/rss.xml',                                pillar: 'regulatory_intel' },
];

// Market / tech news
export const MARKET_FEEDS: FeedSource[] = [
  { name: 'TechCrunch',       url: 'https://techcrunch.com/feed/',                                                  pillar: 'market_shift' },
  { name: 'Ars Technica',     url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',                      pillar: 'market_shift' },
  { name: 'The New Stack',    url: 'https://thenewstack.io/feed/',                                                  pillar: 'market_shift' },
  { name: 'The Verge AI',     url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',             pillar: 'market_shift' },
  { name: 'Hacker News RSS',  url: 'https://hnrss.org/frontpage',                                                   pillar: 'market_shift' },
];

// Business & growth
export const BUSINESS_FEEDS: FeedSource[] = [
  { name: 'SaaStr',            url: 'https://www.saastr.com/feed/',            pillar: 'market_shift' },
  { name: 'Lenny Rachitsky',   url: 'https://www.lennysnewsletter.com/feed',   pillar: 'market_shift' },
];

// Vendor blogs (direct from source — free early warnings)
export const VENDOR_FEEDS: FeedSource[] = [
  { name: 'Stripe Blog',       url: 'https://stripe.com/blog/feed.rss',                        pillar: 'market_shift' },
  { name: 'AWS Whats New',     url: 'https://aws.amazon.com/about-aws/whats-new/recent/feed/',  pillar: 'market_shift' },
  { name: 'OpenAI Blog',       url: 'https://openai.com/blog/rss.xml',                         pillar: 'market_shift' },
  { name: 'Cloudflare Blog',   url: 'https://blog.cloudflare.com/rss/',                        pillar: 'market_shift' },
  { name: 'Vercel Changelog',  url: 'https://vercel.com/changelog/rss.xml',                    pillar: 'market_shift' },
  { name: 'GitHub Changelog',  url: 'https://github.blog/changelog/feed/',                     pillar: 'market_shift' },
  { name: 'Anthropic News',    url: 'https://www.anthropic.com/rss.xml',                       pillar: 'market_shift' },
  { name: 'Replit Blog',       url: 'https://blog.replit.com/feed.xml',                        pillar: 'market_shift' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml',                    pillar: 'market_shift' },
  { name: 'Bubble Blog',       url: 'https://bubble.io/blog/rss/',                             pillar: 'market_shift' },
  { name: 'Webflow Blog',      url: 'https://webflow.com/blog/rss.xml',                        pillar: 'market_shift' },
  // Broken / no RSS feed found:
  // Supabase Blog — supabase.com/blog/rss.xml returns HTML
  // Netlify Blog — netlify.com/blog/rss.xml returns 404
  // Cursor Changelog — changelog.cursor.com/feed.xml redirects to HTML
  // Framer Blog — framer.com/blog/rss.xml returns 404
  // Perplexity Blog — perplexity.ai/blog/rss.xml blocked by Cloudflare
  // Replicate Blog — replicate.com/blog/rss.xml returns 404
  // Indie Hackers — indiehackers.com/feed.xml redirects to HTML
];

export const ALL_FEEDS: FeedSource[] = [
  ...REGULATORY_FEEDS,
  ...MARKET_FEEDS,
  ...BUSINESS_FEEDS,
  ...VENDOR_FEEDS,
];
