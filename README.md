# TOS Change Monitor (MVP)

Minimal Terms of Service change monitor built with Next.js, Supabase, Claude API, and Resend.

## Setup

1. Create the tables in Supabase using `project.md` (schema section).
2. Create `.env.local` from `.env.local.example` and fill the values.
3. Install dependencies and run the app:

```bash
npm install
npm run dev
```

## Manual Cron Trigger

This endpoint is protected by `CRON_SECRET` in the `Authorization` header.

PowerShell:

```powershell
.\scripts\trigger-cron.ps1 -BaseUrl "http://localhost:3000" -Secret "your-secret"
```

## Useful Endpoints

- `GET /api/services`
- `POST /api/services`
- `PATCH /api/services`
- `DELETE /api/services?id=...`
- `GET /api/changes?limit=20`

## Seed Services

Use `scripts/seed.sql` in the Supabase SQL editor.
