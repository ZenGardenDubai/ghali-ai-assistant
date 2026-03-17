/**
 * Verify Telegram Mini App initData using HMAC-SHA256.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export async function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 300
): Promise<{ telegramId: string; firstName?: string } | null> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    // Check auth_date is not too old (5 minutes)
    const authDate = params.get("auth_date");
    if (!authDate) return null;
    const authTimestamp = parseInt(authDate, 10);
    if (isNaN(authTimestamp)) return null;
    if (Math.abs(Date.now() / 1000 - authTimestamp) > maxAgeSeconds) return null;

    // Build data-check-string: sort all fields except hash, join with \n
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretHash = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(botToken)
    );

    // computed_hash = HMAC-SHA256(secret_key, data_check_string)
    const dataKey = await crypto.subtle.importKey(
      "raw",
      secretHash,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const computedHash = await crypto.subtle.sign(
      "HMAC",
      dataKey,
      encoder.encode(dataCheckString)
    );

    // Constant-time hash comparison to prevent timing attacks
    const computedBytes = new Uint8Array(computedHash);
    const hashBytes = new Uint8Array(
      (hash.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16))
    );
    if (computedBytes.length !== hashBytes.length) return null;
    let mismatch = 0;
    for (let i = 0; i < computedBytes.length; i++) {
      mismatch |= computedBytes[i] ^ hashBytes[i];
    }
    if (mismatch !== 0) return null;

    // Extract user info
    const userJson = params.get("user");
    if (!userJson) return null;
    const user = JSON.parse(userJson);

    return {
      telegramId: String(user.id),
      firstName: user.first_name,
    };
  } catch (error) {
    console.error("[tg-auth] Verification error:", error);
    return null;
  }
}
