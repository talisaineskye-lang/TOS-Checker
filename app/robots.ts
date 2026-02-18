import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/api', '/onboarding', '/auth'],
    },
    sitemap: 'https://www.stackdrift.app/sitemap.xml',
  };
}
