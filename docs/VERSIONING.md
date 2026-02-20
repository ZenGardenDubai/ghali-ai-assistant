# Versioning & Release System

> Guide for setting up automated versioning, changelogs, and "What's New" generation.

---

## 1. Version Strategy

**Semantic Versioning (SemVer):** `MAJOR.MINOR.PATCH`

- **Current:** Start at `v0.1.0` (pre-release)
- **v1.0.0** = public launch on ghali.ae
- Before v1.0.0: `v0.MINOR.PATCH` — bump freely
- After v1.0.0: MAJOR (breaking) / MINOR (features) / PATCH (fixes)

---

## 2. Conventional Commits

All commit messages must follow this format:

```
<type>: <short description>

[optional body]
```

### Types

| Type | When to use | Triggers version bump |
|------|------------|----------------------|
| `feat` | New feature | MINOR bump |
| `fix` | Bug fix | PATCH bump |
| `docs` | Documentation only | No bump |
| `chore` | Build, deps, config | No bump |
| `refactor` | Code change, no new feature/fix | No bump |
| `test` | Adding/updating tests | No bump |
| `style` | Formatting, whitespace | No bump |
| `perf` | Performance improvement | PATCH bump |

### Examples

```bash
feat: add voice note transcription via Whisper
fix: WhatsApp message splitting for Arabic text
docs: update landing page copy with user-focused messaging
chore: upgrade Convex to v1.18
refactor: extract credit logic into shared utility
test: add integration tests for onboarding flow
feat!: change credit system from per-message to per-token  # Breaking change = MAJOR bump
```

### Breaking Changes

Add `!` after the type or include `BREAKING CHANGE:` in the body:

```
feat!: change credit deduction model

BREAKING CHANGE: Credits are now deducted per token instead of per message.
Pro tier increased to 1000 credits to compensate.
```

---

## 3. Setup Steps

### Step 1: Initialize package.json version

```bash
# In repo root, ensure package.json has:
npm pkg set version="0.1.0"
```

### Step 2: Create release-please GitHub Action

Create `.github/workflows/release-please.yml`:

```yaml
name: Release Please

on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Step 3: Create release-please config

Create `release-please-config.json` in repo root:

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "release-type": "node",
  "packages": {
    ".": {
      "changelog-path": "CHANGELOG.md",
      "release-type": "node",
      "bump-minor-pre-major": true,
      "bump-patch-for-minor-pre-major": false,
      "include-component-in-tag": false,
      "extra-files": []
    }
  }
}
```

Create `.release-please-manifest.json` in repo root:

```json
{
  ".": "0.1.0"
}
```

### Step 4: Update CLAUDE.md

Add this to `CLAUDE.md` so Cursor follows the convention:

```markdown
## Commit Messages

Use Conventional Commits format for ALL commits:

- `feat: <description>` — new feature (bumps minor version)
- `fix: <description>` — bug fix (bumps patch version)  
- `docs: <description>` — documentation changes
- `chore: <description>` — maintenance, deps, config
- `refactor: <description>` — code restructure, no behavior change
- `test: <description>` — test additions/changes
- `feat!: <description>` — breaking change (bumps major version)

Keep descriptions short and lowercase. No period at the end.
```

---

## 4. How It Works (After Setup)

```
You push commits to main
        ↓
release-please reads commit messages
        ↓
Auto-creates a "Release PR" with:
  - Version bump in package.json
  - Updated CHANGELOG.md with all changes since last release
        ↓
You review and merge the Release PR
        ↓
GitHub Release is created automatically
  - Tag: v0.2.0
  - Release notes: full changelog
        ↓
You pick highlights for social media
```

### Example Changelog Output

```markdown
## [0.2.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.1.0...v0.2.0) (2026-02-25)

### Features
* add document processing and RAG search ([#12](link))
* add image generation via Gemini 3 Pro ([#10](link))
* add voice note transcription ([#8](link))

### Bug Fixes
* fix WhatsApp formatting for Arabic text ([#11](link))
* fix credit reset timezone handling ([#9](link))
```

---

## 5. "What's New" for Social Media

After each release, generate a social-friendly summary:

### Manual (recommended for now)
1. Go to the GitHub Release page
2. Pick the top 3-4 highlights
3. Write a short post:

```
🚀 Ghali v0.2.0 is here!

✨ What's new:
• Send any document — Ghali reads and remembers it
• Voice notes — just talk, Ghali listens  
• Image generation — describe it, get it in seconds
• Smarter answers with web search

Try it → wa.me/971582896090

#AI #WhatsApp #OpenSource
```

### Automated (future)
Add a GitHub Action that triggers on release publish → uses an LLM to summarize the changelog into social posts → sends to WhatsApp or saves as a draft.

---

## 6. Execution Checklist

- [ ] Run `npm pkg set version="0.1.0"` in repo root
- [ ] Create `.github/workflows/release-please.yml` (content above)
- [ ] Create `release-please-config.json` (content above)
- [ ] Create `.release-please-manifest.json` (content above)
- [ ] Add commit convention section to `CLAUDE.md`
- [ ] Start using conventional commit messages
- [ ] Push to main → verify release-please Action runs
- [ ] First release: merge the auto-created Release PR
