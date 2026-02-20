# Deployment & CI/CD Setup

## Vercel

Project: `ghali-ai-assistant` linked to `zengardendubais-projects`
GitHub: `ZenGardenDubai/ghali-ai-assistant` (auto-connected)

### Environment Variables (Vercel Dashboard)

| Variable | Type | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Public | Yes | `https://amiable-hound-193.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Public | Yes | `https://amiable-hound-193.convex.site` |
| `CONVEX_DEPLOY_KEY` | Secret | Yes | Generate from Convex dashboard (prod: `amiable-hound-193`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public | Yes | Production key from Clerk dashboard |
| `CLERK_SECRET_KEY` | Secret | Yes | |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Secret | Yes | |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Secret | Yes | |
| `ANTHROPIC_API_KEY` | Secret | Yes | |
| `OPENAI_API_KEY` | Secret | Yes | |
| `TWILIO_ACCOUNT_SID` | Secret | Yes | |
| `TWILIO_AUTH_TOKEN` | Secret | Yes | |
| `TWILIO_WHATSAPP_NUMBER` | Secret | Yes | `+971582896090` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public | Post-launch | Project API key (used by both client & server SDKs) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public | Post-launch | `https://us.i.posthog.com` |
| `POSTHOG_PERSONAL_API_KEY` | Secret | Post-launch | Personal API key for PostHog Query API (admin analytics) |
| `POSTHOG_PROJECT_ID` | Secret | Post-launch | PostHog project ID for Query API calls |
| `CLOUDCONVERT_API_KEY` | Secret | Post-launch | Document processing |

---

## GitHub Actions

### Secrets Required (GitHub → Settings → Secrets and variables → Actions)

| Secret | Used By | Notes |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | CI build, tests | |
| `CONVEX_DEPLOY_KEY` | CI build, tests | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | CI build, tests | |
| `CLERK_SECRET_KEY` | CI build, tests | |
| `OPENAI_API_KEY` | CI build | |
| `ANTHROPIC_API_KEY` | CI build, Claude Action | Also powers the Claude interactive assistant workflow |
| `GOOGLE_GENERATIVE_AI_API_KEY` | CI build | |
| `NEXT_PUBLIC_POSTHOG_KEY` | CI build | Optional until PostHog is configured |
| `NEXT_PUBLIC_POSTHOG_HOST` | CI build | Optional until PostHog is configured |

### Workflows to Create

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

Replicate from hub-ai-v2. Triggers: push to `main`, PRs to `main`.

**Jobs:**
- **lint-and-typecheck** — `pnpm type-check` + `pnpm lint`
- **test** — `pnpm test` with Convex/Clerk env vars
- **build** — `pnpm build` with all env vars, verify `.next/` output

**Differences from hub-ai-v2:**
- Single Next.js app (not Turborepo monorepo)
- Build output check: `.next/` instead of `apps/web/.next/` and `apps/admin/.next/`
- No turbo commands

#### 2. CodeRabbit Review

CodeRabbit runs automatically on PRs via the GitHub App — no workflow file needed.
Ensure the CodeRabbit GitHub App is installed on the `ZenGardenDubai/ghali-ai-assistant` repo.

#### 3. Claude Interactive Assistant (`.github/workflows/claude-interactive.yml`)

Replicate from hub-ai-v2. Triggers: `@claude` mentions in issues, PR comments, PR reviews.

**Secrets:**
- `ANTHROPIC_API_KEY`
- `GITHUB_TOKEN` (automatic)

**Config:**
- `max_turns: 25`
- Allowed tools: `Bash(pnpm test/lint/type-check/build)`, `Read`, `Write`, `Edit`, `Grep`, `Glob`
- Custom instructions tailored to this project (single agent, Convex backend, WhatsApp-first)

---

## PostHog Setup (Future Task — After Landing Page)

### Keys Needed

| Key | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Vercel, GitHub, `.env.local` | Project API key — used by both `posthog-js` (client) and `posthog-node` (server) |
| `NEXT_PUBLIC_POSTHOG_HOST` | Vercel, GitHub, `.env.local` | `https://us.i.posthog.com` |
| `POSTHOG_PERSONAL_API_KEY` | Vercel, `.env.local` | Personal API key from PostHog → Settings → User API Keys. For Query API (admin dashboards, HogQL queries) |
| `POSTHOG_PROJECT_ID` | Vercel, `.env.local` | Project ID for Query API endpoint (`/api/projects/{id}/query/`) |

### Client-Side Tracking (`posthog-js`)

- Page views — landing page, web chat, pricing
- Sign-up funnel — landing → Clerk sign-up → first message sent
- Feature usage — tool calls, model escalations
- Credit events — upgrade prompts shown, conversion to Pro

### Server-Side Tracking (`posthog-node`)

Used in Convex actions (`"use node"`) and Next.js API routes:

- **AI generation events** (`$ai_generation`) — model, tokens, cost, latency
- **WhatsApp events** — message received, response sent, delivery status
- **Credit consumption** — credits deducted, plan limits hit
- **Error tracking** — failed generations, Twilio failures, webhook errors
- **User lifecycle** — first message, onboarding complete, day-7 retention

### Admin Analytics (Query API)

Uses `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` to query PostHog via HogQL:

- Model escalation rates (Flash vs Pro vs Opus %)
- Cost analysis per model/user
- DAU/WAU/MAU metrics
- Revenue dashboards

### Implementation Steps

1. Install `posthog-js` and `posthog-node`
2. Add `PostHogProvider` to app layout (client)
3. Create `posthog-server.ts` singleton (server — same pattern as hub-ai-v2)
4. Add `$ai_generation` tracking in Convex analytics action
5. Track custom events listed above
6. Create PostHog dashboards: Engagement, Revenue, AI Usage, Errors
