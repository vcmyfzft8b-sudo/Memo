# Skripta AI MVP

Slovene-first lecture notes MVP built with `Next.js`, `Supabase`, `Inngest`, and `OpenAI`.

## What is implemented

- Google sign-in via Supabase OAuth
- landing page plus protected app shell
- lecture upload or in-browser recording with consent gate
- async lecture processing state machine
- OpenAI transcription pipeline with timestamped transcript segments
- structured summary and Markdown notes generation
- lecture-scoped chat with timestamp citations
- Markdown export
- Supabase schema and RLS migration for users, lectures, transcripts, artifacts, and chat

## Stack

- `Next.js` App Router
- `Supabase` Auth, Postgres, Storage
- `Inngest` for background processing
- `OpenAI` for transcription, notes, embeddings, and chat

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill these values in `.env.local`:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `INNGEST_EVENT_KEY` optional for local fallback-free background jobs
- `INNGEST_SIGNING_KEY` optional for local callback verification

4. Create a Supabase project and enable Google OAuth in `Authentication -> Providers`.

5. Run the SQL migration in [0001_init.sql](/Users/nacevalencic/Desktop/note_taking_app_slo/supabase/migrations/0001_init.sql).

6. Start the app:

```bash
npm run dev
```

7. Optional but recommended: run Inngest locally if you want true background execution instead of the fallback inline processor.

## Important routes

- `/` landing page
- `/app` lecture list
- `/app/new` new lecture flow
- `/app/lectures/[id]` lecture workspace
- `/api/inngest` Inngest endpoint

## Notes

- The current pipeline uses OpenAI as the default transcription and generation provider.
- The transcription layer is isolated in `src/lib/transcription` so Slovene benchmarking against Soniox or Deepgram can be added later.
- The app currently supports audio only; PDF, YouTube, flashcards, and billing are intentionally out of scope for v1.

## Verification

```bash
npm run lint
npm run build
```
