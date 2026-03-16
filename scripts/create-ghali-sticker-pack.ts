#!/usr/bin/env tsx
/**
 * Ghali Sticker Pack Creation Script
 *
 * Creates the official Ghali sticker pack on Telegram via the Bot API.
 * Run once to create the pack; afterwards the file_ids are stable and free to reuse.
 *
 * Prerequisites:
 *   1. Install sharp for WebP conversion: pnpm add -D sharp
 *   2. Export TELEGRAM_BOT_TOKEN and TELEGRAM_OWNER_ID environment variables
 *   3. Build sticker WebP images (see below)
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=<token> TELEGRAM_OWNER_ID=<your_numeric_id> pnpm tsx scripts/create-ghali-sticker-pack.ts
 *
 * After a successful run, copy the printed file_ids into:
 *   convex/lib/telegramStickers.ts → STICKER_FILE_IDS
 *
 * Pack URL (publicly shareable after creation):
 *   https://t.me/addstickers/GhaliBot
 *
 * WebP conversion (requires sharp or ImageMagick):
 *   for f in public/stickers/*.svg; do
 *     name=$(basename "$f" .svg)
 *     npx sharp "$f" -o "public/stickers/${name}.webp" --width 512 --height 512
 *   done
 *
 * Alternatively with Inkscape + cwebp:
 *   inkscape input.svg --export-png=tmp.png --export-width=512 --export-height=512
 *   cwebp -q 90 tmp.png -o output.webp
 */

import fs from "fs";
import path from "path";

// ============================================================================
// Config
// ============================================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_ID = process.env.TELEGRAM_OWNER_ID; // Your Telegram numeric user ID

const PACK_NAME = "GhaliBot"; // becomes t.me/addstickers/GhaliBot
const PACK_TITLE = "Ghali — Your AI Assistant";

const STICKERS_DIR = path.join(process.cwd(), "public", "stickers");

/** Ordered list of stickers to include in the pack */
const STICKER_MANIFEST: Array<{
  file: string; // filename in public/stickers/ (WebP required for upload)
  emoji: string; // associated emoji shown in the keyboard
  event: string; // key for STICKER_FILE_IDS in telegramStickers.ts
}> = [
  { file: "welcome.webp", emoji: "👋", event: "welcome" },
  { file: "thinking.webp", emoji: "🤔", event: "thinking" },
  { file: "celebrating.webp", emoji: "🎉", event: "celebrating" },
  { file: "working.webp", emoji: "💻", event: "working" },
  { file: "error.webp", emoji: "😬", event: "error" },
  { file: "goodnight.webp", emoji: "🌙", event: "goodnight" },
  { file: "image_generated.webp", emoji: "✨", event: "image_generated" },
  { file: "credits_exhausted.webp", emoji: "🪫", event: "credits_exhausted" },
  { file: "love.webp", emoji: "❤️", event: "love" },
  { file: "idea.webp", emoji: "💡", event: "idea" },
];

// ============================================================================
// Telegram API helpers
// ============================================================================

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
}

async function apiCall(
  method: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as TelegramResponse;
  if (!data.ok) {
    throw new Error(
      `Telegram API error in ${method} (${data.error_code}): ${data.description}`
    );
  }
  return data.result;
}

async function apiCallMultipart(
  method: string,
  fields: Record<string, string>,
  fileField: string,
  fileBuffer: Buffer,
  filename: string
): Promise<unknown> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: "image/webp" });
  form.append(fileField, blob, filename);

  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as TelegramResponse;
  if (!data.ok) {
    throw new Error(
      `Telegram API error in ${method} (${data.error_code}): ${data.description}`
    );
  }
  return data.result;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  if (!BOT_TOKEN) {
    console.error("❌ Missing TELEGRAM_BOT_TOKEN environment variable");
    process.exit(1);
  }
  if (!OWNER_ID) {
    console.error(
      "❌ Missing TELEGRAM_OWNER_ID environment variable\n" +
        "   Get your numeric ID by messaging @userinfobot on Telegram."
    );
    process.exit(1);
  }

  // Verify WebP files exist
  const missing = STICKER_MANIFEST.filter(
    (s) => !fs.existsSync(path.join(STICKERS_DIR, s.file))
  );
  if (missing.length > 0) {
    console.error(
      "❌ Missing WebP sticker files (convert SVGs first):\n" +
        missing.map((s) => `   public/stickers/${s.file}`).join("\n") +
        "\n\n" +
        "   Convert SVGs to WebP with:\n" +
        "     for f in public/stickers/*.svg; do\n" +
        "       name=$(basename \"$f\" .svg)\n" +
        '       npx sharp "$f" -o "public/stickers/${name}.webp" --width 512 --height 512\n' +
        "     done"
    );
    process.exit(1);
  }

  console.log("🤖 Ghali Sticker Pack Creator");
  console.log(`   Pack name : ${PACK_NAME}`);
  console.log(`   Pack title: ${PACK_TITLE}`);
  console.log(`   Stickers  : ${STICKER_MANIFEST.length}`);
  console.log();

  // ---- Step 1: Upload first sticker + create set ----------------------------
  const [first, ...rest] = STICKER_MANIFEST;
  const firstBuffer = fs.readFileSync(path.join(STICKERS_DIR, first.file));

  console.log(`📤 Creating pack with first sticker: ${first.event} (${first.emoji})`);

  await apiCallMultipart(
    "createNewStickerSet",
    {
      user_id: OWNER_ID,
      name: PACK_NAME,
      title: PACK_TITLE,
      sticker_type: "regular",
      emojis: first.emoji,
    },
    "png_sticker",
    firstBuffer,
    first.file
  );

  console.log("   ✅ Pack created!");

  // ---- Step 2: Add remaining stickers ---------------------------------------
  for (const sticker of rest) {
    const buf = fs.readFileSync(path.join(STICKERS_DIR, sticker.file));
    console.log(`📤 Adding sticker: ${sticker.event} (${sticker.emoji})`);

    await apiCallMultipart(
      "addStickerToSet",
      {
        user_id: OWNER_ID,
        name: PACK_NAME,
        emojis: sticker.emoji,
      },
      "png_sticker",
      buf,
      sticker.file
    );

    console.log("   ✅ Added!");

    // Brief pause to respect Bot API rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  // ---- Step 3: Retrieve file_ids from the created pack ----------------------
  console.log("\n🔍 Retrieving file_ids from the pack...");

  const stickerSet = (await apiCall("getStickerSet", {
    name: PACK_NAME,
  })) as {
    stickers: Array<{ file_id: string; emoji: string }>;
  };

  console.log("\n📋 Copy these file_ids into convex/lib/telegramStickers.ts:\n");
  console.log("export const STICKER_FILE_IDS: Record<StickerEvent, string> = {");

  for (let i = 0; i < STICKER_MANIFEST.length; i++) {
    const manifest = STICKER_MANIFEST[i];
    const retrieved = stickerSet.stickers[i];
    const fileId = retrieved?.file_id ?? "";
    console.log(`  ${manifest.event}: "${fileId}",`);
  }

  console.log("};");

  console.log(`
✅ Done! Your pack is live at:
   https://t.me/addstickers/${PACK_NAME}

Next steps:
  1. Copy the file_ids above into convex/lib/telegramStickers.ts
  2. Call sendEventSticker(botToken, chatId, "welcome") on /start
`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
