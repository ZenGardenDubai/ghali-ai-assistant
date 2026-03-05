import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Admin image upload: gets a Convex upload URL, uploads the file, then returns the public URL.
 * Accepts multipart/form-data with a single "file" field.
 */
export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const isAdmin = (sessionClaims?.metadata as Record<string, unknown> | undefined)?.isAdmin === true;
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (!CONVEX_SITE_URL || !INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type (images only)
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  // Validate file size (5MB max for WhatsApp)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  try {
    // Step 1: Get upload URL from Convex
    const uploadUrlRes = await fetch(`${CONVEX_SITE_URL}/admin/generate-upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
    });
    if (!uploadUrlRes.ok) {
      return NextResponse.json({ error: "Failed to get upload URL" }, { status: 500 });
    }
    const { uploadUrl } = await uploadUrlRes.json();
    if (!uploadUrl) {
      return NextResponse.json({ error: "Invalid upload URL response" }, { status: 500 });
    }

    // Step 2: Upload the file to Convex storage
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) {
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }
    const { storageId } = await uploadRes.json();
    if (!storageId) {
      return NextResponse.json({ error: "Invalid storage response" }, { status: 500 });
    }

    // Step 3: Get the public URL
    const urlRes = await fetch(`${CONVEX_SITE_URL}/admin/get-storage-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({ storageId }),
    });
    if (!urlRes.ok) {
      return NextResponse.json({ error: "Failed to get storage URL" }, { status: 500 });
    }
    const { url } = await urlRes.json();
    if (!url) {
      return NextResponse.json({ error: "Storage URL not available" }, { status: 500 });
    }

    return NextResponse.json({ url, storageId });
  } catch (err) {
    console.error("Admin image upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
