# TOS Change Monitor - MVP Build Prompt

## Overview

Build a simple Terms of Service change monitoring tool that:
1. Fetches ToS pages from tracked URLs
2. Detects when content changes
3. Summarizes what changed using AI
4. Sends email alerts for significant changes

**Stack:** Vercel (Next.js + Cron), Supabase (Postgres), Claude API, Resend (email)

---

## Database Schema (Supabase)

Create these tables in Supabase:

```sql
-- Services being monitored
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tos_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_changed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Historical snapshots of ToS content
CREATE TABLE snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  content TEXT NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detected changes with AI analysis
CREATE TABLE changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  old_snapshot_id UUID REFERENCES snapshots(id),
  new_snapshot_id UUID REFERENCES snapshots(id),
  summary TEXT,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  categories TEXT[], -- e.g., ['pricing', 'data_usage', 'termination']
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE
);

-- Index for faster queries
CREATE INDEX idx_snapshots_service_id ON snapshots(service_id);
CREATE INDEX idx_changes_service_id ON changes(service_id);
CREATE INDEX idx_changes_detected_at ON changes(detected_at DESC);
```

---

## Project Structure

```
/
├── app/
│   ├── page.tsx                    # Simple dashboard showing tracked services
│   ├── api/
│   │   ├── cron/
│   │   │   └── check-tos/
│   │   │       └── route.ts        # Cron job to check all services
│   │   ├── services/
│   │   │   └── route.ts            # CRUD for tracked services
│   │   └── changes/
│   │       └── route.ts            # Get change history
├── lib/
│   ├── supabase.ts                 # Supabase client
│   ├── fetcher.ts                  # Fetch and clean ToS pages
│   ├── differ.ts                   # Compare content, generate hash
│   ├── analyzer.ts                 # Claude API for summarization
│   └── notifier.ts                 # Send email alerts
├── vercel.json                     # Cron configuration
└── .env.local                      # Environment variables
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
ALERT_EMAIL=your@email.com

# Cron security
CRON_SECRET=random_secret_string
```

---

## Core Implementation Files

### 1. Supabase Client (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### 2. ToS Fetcher (`lib/fetcher.ts`)

```typescript
import * as cheerio from 'cheerio';

export async function fetchTosContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TOSMonitor/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove noise
  $('script, style, nav, footer, header, aside').remove();

  // Get main content - adjust selectors based on common ToS page patterns
  const content = $('main, article, .content, .legal, .terms, body')
    .first()
    .text();

  // Clean up whitespace
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}
```

### 3. Content Differ (`lib/differ.ts`)

```typescript
import crypto from 'crypto';

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function hasChanged(oldHash: string, newHash: string): boolean {
  return oldHash !== newHash;
}

// Simple diff - returns added and removed text chunks
export function getBasicDiff(oldContent: string, newContent: string): {
  added: string[];
  removed: string[];
} {
  const oldSentences = new Set(oldContent.split(/[.!?]+/).map(s => s.trim()).filter(Boolean));
  const newSentences = new Set(newContent.split(/[.!?]+/).map(s => s.trim()).filter(Boolean));

  const added: string[] = [];
  const removed: string[] = [];

  newSentences.forEach(s => {
    if (!oldSentences.has(s)) added.push(s);
  });

  oldSentences.forEach(s => {
    if (!newSentences.has(s)) removed.push(s);
  });

  return { added, removed };
}
```

### 4. Claude Analyzer (`lib/analyzer.ts`)

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AnalysisResult {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  categories: string[];
}

export async function analyzeChanges(
  serviceName: string,
  added: string[],
  removed: string[]
): Promise<AnalysisResult> {
  const prompt = `You are analyzing changes to the Terms of Service for "${serviceName}".

Here are the sentences that were ADDED:
${added.map(s => `- ${s}`).join('\n') || '(none)'}

Here are the sentences that were REMOVED:
${removed.map(s => `- ${s}`).join('\n') || '(none)'}

Analyze these changes and respond with JSON only (no markdown):
{
  "summary": "2-3 sentence plain English summary of what changed and why users should care",
  "riskLevel": "low" | "medium" | "high",
  "categories": ["pricing", "data_usage", "ai_training", "termination", "liability", "api_limits", "acceptable_use", "legal_only"]
}

Risk levels:
- low: Minor wording changes, clarifications, no material impact
- medium: Some changes to terms that could affect users
- high: Pricing changes, new restrictions, data usage changes, termination clause changes

Only include relevant categories. If changes are purely cosmetic, use "legal_only".`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';

  try {
    return JSON.parse(responseText);
  } catch {
    return {
      summary: 'Unable to analyze changes automatically.',
      riskLevel: 'medium',
      categories: ['unknown'],
    };
  }
}
```

### 5. Email Notifier (`lib/notifier.ts`)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ChangeNotification {
  serviceName: string;
  summary: string;
  riskLevel: string;
  categories: string[];
  detectedAt: Date;
}

export async function sendChangeAlert(change: ChangeNotification) {
  const riskEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🔴',
  }[change.riskLevel] || '⚪';

  await resend.emails.send({
    from: 'TOS Monitor <alerts@yourdomain.com>',
    to: process.env.ALERT_EMAIL!,
    subject: `${riskEmoji} ${change.serviceName} Terms Changed`,
    html: `
      <h2>${change.serviceName} Terms of Service Changed</h2>
      <p><strong>Risk Level:</strong> ${riskEmoji} ${change.riskLevel.toUpperCase()}</p>
      <p><strong>Categories:</strong> ${change.categories.join(', ')}</p>
      <h3>Summary</h3>
      <p>${change.summary}</p>
      <p><small>Detected: ${change.detectedAt.toISOString()}</small></p>
    `,
  });
}
```

### 6. Cron Job (`app/api/cron/check-tos/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchTosContent } from '@/lib/fetcher';
import { hashContent, hasChanged, getBasicDiff } from '@/lib/differ';
import { analyzeChanges } from '@/lib/analyzer';
import { sendChangeAlert } from '@/lib/notifier';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all active services
  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true);

  if (error || !services) {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }

  const results = [];

  for (const service of services) {
    try {
      // Fetch current ToS
      const content = await fetchTosContent(service.tos_url);
      const contentHash = hashContent(content);

      // Get most recent snapshot
      const { data: lastSnapshot } = await supabase
        .from('snapshots')
        .select('*')
        .eq('service_id', service.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      // Update last checked timestamp
      await supabase
        .from('services')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', service.id);

      // If no previous snapshot or content changed
      if (!lastSnapshot || hasChanged(lastSnapshot.content_hash, contentHash)) {
        // Save new snapshot
        const { data: newSnapshot } = await supabase
          .from('snapshots')
          .insert({
            service_id: service.id,
            content_hash: contentHash,
            content: content,
          })
          .select()
          .single();

        // If there was a previous snapshot, analyze the change
        if (lastSnapshot && newSnapshot) {
          const diff = getBasicDiff(lastSnapshot.content, content);
          const analysis = await analyzeChanges(service.name, diff.added, diff.removed);

          // Save change record
          await supabase.from('changes').insert({
            service_id: service.id,
            old_snapshot_id: lastSnapshot.id,
            new_snapshot_id: newSnapshot.id,
            summary: analysis.summary,
            risk_level: analysis.riskLevel,
            categories: analysis.categories,
          });

          // Send alert for medium/high risk changes
          if (analysis.riskLevel !== 'low') {
            await sendChangeAlert({
              serviceName: service.name,
              summary: analysis.summary,
              riskLevel: analysis.riskLevel,
              categories: analysis.categories,
              detectedAt: new Date(),
            });
          }

          // Update service last changed timestamp
          await supabase
            .from('services')
            .update({ last_changed_at: new Date().toISOString() })
            .eq('id', service.id);

          results.push({
            service: service.name,
            status: 'changed',
            riskLevel: analysis.riskLevel,
          });
        } else {
          results.push({ service: service.name, status: 'initial_snapshot' });
        }
      } else {
        results.push({ service: service.name, status: 'no_change' });
      }
    } catch (err) {
      results.push({
        service: service.name,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ checked: results.length, results });
}
```

### 7. Vercel Cron Config (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/check-tos",
      "schedule": "0 6 * * *"
    }
  ]
}
```

This runs daily at 6 AM UTC. Adjust as needed.

---

## Starter Services to Track

Seed your database with these (all have plain HTML ToS pages):

```sql
INSERT INTO services (name, tos_url) VALUES
  ('Stripe', 'https://stripe.com/legal/ssa'),
  ('Vercel', 'https://vercel.com/legal/terms'),
  ('Supabase', 'https://supabase.com/terms'),
  ('OpenAI', 'https://openai.com/policies/terms-of-use'),
  ('GitHub', 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service');
```

---

## MVP Checklist

- [ ] Set up Supabase project and create tables
- [ ] Create Next.js project with Vercel
- [ ] Install dependencies: `@supabase/supabase-js`, `@anthropic-ai/sdk`, `resend`, `cheerio`
- [ ] Implement fetcher and test with one URL
- [ ] Implement differ and verify hashing works
- [ ] Set up Claude API and test analyzer
- [ ] Set up Resend and test email sending
- [ ] Wire up the cron endpoint
- [ ] Deploy to Vercel and configure cron
- [ ] Add 3-5 services you actually care about
- [ ] Wait for changes (or manually trigger to test)

---

## Future Enhancements (Don't Build Yet)

- User authentication and multiple users
- Per-user service tracking
- Dashboard UI with change history
- Risk level filtering in alerts
- Webhook integrations (Slack, Discord)
- Handling JavaScript-rendered pages (Puppeteer)
- Smarter diff algorithm (semantic similarity)
- Public changelog pages per service

---

## Gotchas to Watch For

1. **JavaScript-rendered pages:** Some ToS pages need a headless browser. Skip these for MVP—start with plain HTML pages only.

2. **Rate limiting:** Don't check too frequently. Daily is fine. Some sites may block aggressive scrapers.

3. **Content extraction:** The cheerio selectors in `fetcher.ts` are generic. You may need to tune them per-site if you're getting too much noise.

4. **Hash sensitivity:** The hash will change for ANY text change, including dates in footers. Consider stripping dates/timestamps in the cleaner if you get false positives.

5. **Claude costs:** Each analysis call costs money. With 5 services checked daily, you'll use ~150 API calls/month. At current pricing, that's under $1/month.

---

## Testing Without Waiting for Real Changes

To test your pipeline:

1. Add a service with a URL you control (a GitHub gist, a Notion page, etc.)
2. Run the cron endpoint manually
3. Change the content at that URL
4. Run the cron endpoint again
5. Verify you get an email

This lets you validate the full flow in minutes instead of waiting for Stripe to update their terms.
