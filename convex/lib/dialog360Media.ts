/**
 * 360dialog media download utilities.
 * 360dialog requires a two-step process: get the media URL, then download with auth.
 */

const DIALOG360_MEDIA_BASE_URL = "https://waba.360dialog.io/v1/media";

/**
 * Download media from 360dialog using its media ID.
 *
 * Step 1: GET /v1/media/<media_id> → returns { url: "https://..." }
 * Step 2: GET <url> with D360-API-KEY header → returns binary data
 *
 * @returns { url, buffer } or throws on error
 */
export async function downloadDialog360Media(
  apiKey: string,
  mediaId: string
): Promise<{ url: string; buffer: ArrayBuffer }> {
  // Step 1: resolve media URL
  const metaResponse = await fetch(`${DIALOG360_MEDIA_BASE_URL}/${mediaId}`, {
    method: "GET",
    headers: { "D360-API-KEY": apiKey },
  });

  if (!metaResponse.ok) {
    throw new Error(
      `360dialog media URL fetch failed (${metaResponse.status}): ${await metaResponse.text()}`
    );
  }

  const meta = (await metaResponse.json()) as { url?: string };
  const url = meta.url;

  if (!url) {
    throw new Error(`360dialog media URL missing in response for media ID: ${mediaId}`);
  }

  // Step 2: download the actual file
  const fileResponse = await fetch(url, {
    method: "GET",
    headers: { "D360-API-KEY": apiKey },
  });

  if (!fileResponse.ok) {
    throw new Error(
      `360dialog media download failed (${fileResponse.status}): ${await fileResponse.text()}`
    );
  }

  const buffer = await fileResponse.arrayBuffer();
  return { url, buffer };
}
