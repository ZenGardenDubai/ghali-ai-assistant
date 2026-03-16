# Post-Migration Enhancements

Items to tackle after the core Telegram migration is complete and stable.

---

## 1. Large File Support via Local Bot API Server

**Status:** Not started
**Priority:** High — users currently get an error for files >20MB

**Problem:** Convex downloads Telegram files via `api.telegram.org` (20MB limit). The local Bot API server on `ubuntu-16gb-hel1-1:8081` supports up to 2GB but is only accessible from the bot server, not from Convex.

**Solution:** Have the bot server download files from the local API and upload to Convex storage directly.

**Flow:**
```
User sends 50MB file
  → Telegram servers
  → Bot server downloads from localhost:8081 (no limit)
  → Bot server calls /telegram-upload-url to get presigned upload URL
  → Bot server uploads file to Convex storage
  → Bot server sends { storageId, mimeType } in payload to /telegram-message
  → Convex uses storageId directly (no download needed)
```

**Implementation:**
- [ ] Add `/telegram-upload-url` HTTP route in Convex (authenticated, returns `generateUploadUrl()`)
- [ ] Update bot server to detect large files (>20MB) and download from local API
- [ ] Bot server uploads to Convex via presigned URL
- [ ] Pass `storageId` + `mimeType` in payload instead of `mediaFileId`
- [ ] `fetchMedia` in Convex becomes fallback for small files only
- [ ] Remove the 20MB error message from `generateResponse`

**Files affected:** `convex/http.ts`, `convex/messages.ts`, `convex/telegram.ts`, bot server `index.js`
