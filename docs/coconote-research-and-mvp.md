# Coconote Research and Slovenia-First MVP

Last updated: 2026-03-14

## Executive summary

Coconote's core idea is not "AI transcription." It is:

1. capture a lecture or upload source material,
2. turn it into a transcript and organized notes,
3. convert that same source into study outputs like flashcards, quizzes, podcasts, and chat.

That product loop is why it has grown quickly with students. The winning pattern is "capture once, study many times."

For our MVP, we should clone only the smallest defensible loop:

1. record or upload a lecture,
2. transcribe it,
3. generate structured notes and a summary,
4. let the user ask questions against the transcript,
5. keep the original audio and timestamped transcript visible.

We should explicitly not build games, podcast generation, or broad multi-source ingestion in v1.

## What Coconote is

Official product positioning:

- Coconote calls itself "The top rated AI note taker" and says it can turn lectures into "organized notes, flashcards, quizzes, podcasts, and more."
- The App Store listing says: "Record lectures and automatically generate study guides, quizzes, and flashcards from lecture notes."
- Its public signup pages describe it as an "AI note taker with study guides, quizzes, and flashcards."

Sources:

- https://coconote.app/
- https://apps.apple.com/us/app/coconote-ai-note-taker/id6479320349
- https://coconote.app/signup

## Why it is winning

### 1. It is built for students, not meetings

Otter and similar apps are meeting tools first. Coconote is designed around class and revision.

Third-party reviews and user feedback consistently frame it as:

- lecture recorder,
- transcript-to-notes tool,
- study guide generator,
- flashcard and quiz generator,
- note chat assistant.

This is the correct category for us to copy.

### 2. It converts passive content into active learning

This is the strongest point in the product. A transcript alone is weak. Coconote keeps reusing the same captured source to create:

- notes,
- quizzes,
- flashcards,
- mini games,
- podcast-style summaries,
- chat answers.

That gives students repeated reasons to come back after the lecture.

### 3. It has strong student-oriented distribution

As of February 2026, Quizlet said it acquired Coconote. Earlier PR from August 2025 said Coconote had reached 1.5 million students.

Third-party coverage also highlights its social distribution strategy, especially TikTok-led growth.

Sources:

- https://www.prnewswire.com/news-releases/viral-ai-note-taking-app-coconote-now-free-for-educators-as-back-to-school-season-begins-302540300.html
- https://www.prnewswire.com/news-releases/quizlet-supercharges-studying-with-new-product-innovations-and-strategic-acquisition-302679622.html
- https://tldv.io/blog/coconote-review/

## Core workflow

From Coconote's public site, app listing, and public note pages, the product loop appears to be:

1. Record or upload source material.
2. Wait for async processing.
3. Receive transcript plus generated notes.
4. Use secondary study tools generated from the same source.
5. Ask questions against the note.
6. Organize notes in folders and revisit them later.

Publicly visible supported sources include:

- lecture audio,
- video,
- PDFs,
- websites,
- YouTube links,
- images.

For our first MVP, audio recording/upload is enough.

Sources:

- https://coconote.app/
- https://apps.apple.com/us/app/coconote-ai-note-taker/id6479320349
- https://coconote.app/notes/553f6715-a568-4b90-9da3-940ac80f6299

## Strongest user-facing features

These are the features that show up repeatedly across official pages and user reviews.

### Lecture recording with one-tap capture

This is the entry point. The user does not need to take notes live. They capture first and process later.

### Structured notes, not raw transcript only

The notes are positioned as organized and readable. The transcript supports the note, but the product value is the cleaned result.

### Chat over a note

The App Store listing and user reviews mention voice chat or regular chat that uses the lecture content.

### Flashcards and quizzes

This is likely the biggest retention engine after the core note.

### Broad input support

Coconote does not force users to start from live audio. It accepts multiple content types. This broadens acquisition, but it is not necessary for our first release.

### Accessibility angle

Users explicitly mention learning disabilities and ADHD as reasons the product helps them.

Sources:

- https://apps.apple.com/us/app/coconote-ai-note-taker/id6479320349
- https://tldv.io/blog/coconote-review/
- https://www.reddit.com/r/studytips/comments/1dd13c0

## What users seem to like

Based on the App Store page, Reddit discussion, and secondary reviews:

- It reduces live note-taking pressure during lectures.
- It gives a fast summary for difficult material.
- It lets users ask follow-up questions from the captured content.
- It creates flashcards and quizzes automatically.
- It is useful for learners who struggle to keep up in class.

Examples:

- App Store review: a student says it helps with difficult college courses, learning disability support, mini games, quizzes, and chat over the recorded content.
- Reddit discussion: a user says it makes "good notes," that quizzes and flashcards help, and that transcript access helps recover what the teacher said.

Sources:

- https://apps.apple.com/us/app/coconote-ai-note-taker/id6479320349
- https://www.reddit.com/r/studytips/comments/1dd13c0

## What users complain about

These issues are important because they define our opportunity to beat them.

### 1. Price sensitivity

Users repeatedly describe it as expensive or limited on the free tier.

### 2. Reliability risk during recording

Third-party reviews mention crashes, failed saves, and upload issues. For our product, reliability matters more than feature count.

### 3. Notes can be too short or not detailed enough

A Reddit user said a one-hour lecture could turn into a short page of notes that misses important information.

### 4. UI and information organization can be weak

App Store feedback mentions the UI, navigation, and note organization as weaker than competitors.

### 5. Cross-note chat and combined context are wanted

One App Store review specifically asks for chat across multiple notes or combined user notes plus recording context.

Sources:

- https://www.reddit.com/r/studytips/comments/1dd13c0
- https://apps.apple.com/us/app/coconote-ai-note-taker/id6479320349
- https://tldv.io/blog/coconote-review/

## How Coconote likely works under the hood

This section is inference from public product behavior plus publicly exposed frontend details. It is not a claim about their private implementation.

### Likely product pipeline

1. Capture audio on device or accept uploaded media.
2. Upload file to backend storage.
3. Run speech-to-text asynchronously.
4. Chunk transcript by time and topic.
5. Use an LLM to generate:
   - title,
   - short summary,
   - structured note,
   - key concepts,
   - quiz items,
   - flashcards.
6. Store transcript, note artifacts, and embeddings or searchable chunks.
7. Power note chat using retrieval over the transcript and generated note.

This is the standard architecture for products with this behavior.

### Publicly visible web stack

From public HTML on `coconote.app` and `coconote.app/signup`:

- Marketing site is built in Framer.
- Product app appears to use React Router with Vite-built assets.
- Frontend points to `https://api.coconote.app`.
- Google and Apple sign-in are enabled.
- Stripe is used for billing.
- Churnkey is loaded for retention/cancellation flows.
- Mixpanel token is exposed in the frontend config, which implies product analytics.
- Cloudflare fronts the site.
- Render headers are present, implying Render hosting for at least part of the stack.

This is useful because it shows the app is not doing anything exotic on the web surface. The differentiator is product flow and output quality, not unusual infrastructure.

## What we should copy exactly for MVP

We should clone these ideas:

### 1. Single primary action

The first CTA should be "Record lecture" or "Upload audio."

### 2. Async processing with a clear waiting state

The user needs confidence that the recording was saved and is being processed.

### 3. Transcript plus notes on the same screen

The generated note should never exist without an auditable source transcript.

### 4. Summary first, detail second

Top of page:

- title,
- concise summary,
- key topics,
- actions/study points.

Below that:

- detailed note,
- transcript,
- ask-AI panel.

### 5. Grounded chat

The assistant should answer only from the lecture transcript and cite timestamps or transcript sections.

### 6. A study output users can immediately reuse

For v1, the cheapest extra output after notes is probably flashcards, not quizzes, games, or podcasts.

## What we should not copy yet

- AI podcasts
- study games
- websites/PDFs/YouTube ingestion
- family plans or educator workflows
- advanced folder systems
- multi-note chat
- desktop-native apps

Those features help growth and retention, but they are not required to prove the Slovenia lecture-note use case.

## Recommended MVP architecture for us

### Product scope

Required features:

1. Sign in.
2. Record audio in browser or upload audio file.
3. Save lecture.
4. Transcribe lecture.
5. Generate:
   - title,
   - summary,
   - structured note,
   - key takeaways.
6. Show timestamped transcript.
7. Ask questions against the lecture.
8. Export note as Markdown or PDF.

### Suggested initial stack

Frontend:

- Next.js or React app
- mobile-first web UI
- browser audio recording

Backend:

- Node.js API
- Postgres for users, lectures, transcripts, notes
- object storage for audio files
- background jobs for transcription and note generation

AI services:

- Speech-to-text: benchmark OpenAI, Soniox, and Deepgram for Slovene
- Note generation and chat: OpenAI responses/chat stack with transcript-grounded prompts

Core data model:

- `users`
- `lectures`
- `lecture_files`
- `transcript_segments`
- `lecture_notes`
- `flashcards`
- `chat_messages`

Processing flow:

1. User records/uploads audio.
2. Backend stores file and creates lecture row with `processing` status.
3. Job transcribes the file.
4. Job stores timestamped transcript segments.
5. Job generates note artifacts from transcript chunks.
6. UI polls or subscribes for completion.

## Feature parity map

### Coconote feature -> our v1 decision

- Recording -> yes
- Audio upload -> yes
- Transcript -> yes
- Structured notes -> yes
- Summary -> yes
- Chat over note -> yes
- Flashcards -> optional if time remains after core loop
- Quizzes -> no
- Podcasts -> no
- Games -> no
- PDF/website/YouTube inputs -> no
- Cross-note chat -> no

## Risks specific to Slovenia

### 1. Slovene speech quality

This is the main technical risk. We need benchmarks on real classroom audio before choosing the transcription provider.

### 2. Lecture recording permissions

Some Slovenian institutions restrict recording without permission. We need:

- clear consent language,
- lecturer permission guidance,
- institution-safe positioning.

### 3. Noisy classrooms and domain terminology

University lectures can have:

- poor microphones,
- room echo,
- overlapping speech,
- English technical terms inside Slovene speech.

Our prompts and quality evaluation should assume mixed-language transcripts.

## Exact build recommendation

If the goal is to replicate Coconote's core without wasting time, we should build in this order:

1. Auth
2. Lecture create flow
3. Audio upload/record
4. Transcription job
5. Notes generation job
6. Lecture detail page with:
   - status,
   - summary,
   - structured notes,
   - transcript
7. Chat over transcript
8. Export

Only after that should we add flashcards.

## Sources

- Coconote homepage: https://coconote.app/
- Coconote signup page: https://coconote.app/signup
- Coconote public note page redirect/sign-up teaser: https://coconote.app/notes/553f6715-a568-4b90-9da3-940ac80f6299
- Apple App Store listing: https://apps.apple.com/us/app/coconote-ai-note-taker/id6479320349
- Coconote growth PR: https://www.prnewswire.com/news-releases/viral-ai-note-taking-app-coconote-now-free-for-educators-as-back-to-school-season-begins-302540300.html
- Quizlet acquisition PR: https://www.prnewswire.com/news-releases/quizlet-supercharges-studying-with-new-product-innovations-and-strategic-acquisition-302679622.html
- tl;dv review: https://tldv.io/blog/coconote-review/
- Reddit discussion: https://www.reddit.com/r/studytips/comments/1dd13c0
