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
  { name: 'TechCrunch',    url: 'https://techcrunch.com/feed/',                             pillar: 'market_shift' },
  { name: 'Ars Technica',  url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', pillar: 'market_shift' },
  { name: 'The New Stack', url: 'https://thenewstack.io/feed/',                             pillar: 'market_shift' },
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
];

export const ALL_FEEDS: FeedSource[] = [
  ...REGULATORY_FEEDS,
  ...MARKET_FEEDS,
  ...VENDOR_FEEDS,
];
