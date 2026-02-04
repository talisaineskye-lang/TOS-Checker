import * as cheerio from 'cheerio';

const DEFAULT_TIMEOUT_MS = 15000;

export async function fetchTosContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TOSMonitor/1.0)'
    }
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $('script, style, nav, footer, header, aside').remove();

  const content = $('main, article, .content, .legal, .terms, body')
    .first()
    .text();

  return content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}
