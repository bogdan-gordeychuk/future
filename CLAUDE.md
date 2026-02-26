# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
AI-powered Telegram booking assistant SaaS for Russian service businesses.
Owner: Sereja (sereja.tech) — CTO role, approves direction, does NOT implement.
Claude = full product team. Work autonomously, report progress, ask before big decisions.

## Communication
- Always respond in Russian
- Keep owner updated on task status
- Flag blockers immediately
- Before large architectural changes — present plan, wait for approval

## Workflow
- Use TaskCreate/TaskUpdate to track all work
- Commits: conventional commits (feat:, fix:, chore:, docs:)
- PRs for every feature (even solo — documents what changed and why)
- Update CLAUDE.md and memory files when architecture or decisions change

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database/Auth:** Supabase
- **Hosting:** Vercel
- **Telegram:** Bot API + Telegram Web App (TWA/Mini App)
- **AI:** Claude API (claude-haiku-4-5 for bot, claude-sonnet-4-6 for complex tasks)
- **Payments:** YooKassa (subscriptions, recurring billing)
- **Language:** TypeScript throughout

## Key Commands
```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint         # ESLint
npm run test         # tests (when configured)
```

## Architecture (update as project grows)
TBD — to be filled after architecture phase completes.

## Business Context
- Target: Russian SMBs (barbershops, beauty, tutors, photographers)
- Pricing: 1490₽/month per business
- Legal: owner is самозанятый (НПД), payments via YooKassa
- Break-even: ~7 paying clients
