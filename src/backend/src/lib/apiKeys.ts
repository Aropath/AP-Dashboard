import crypto from "node:crypto";

const API_KEY_PREFIX = "trk_live_";
const PREFIX_LENGTH = 18;
const API_KEY_FORMAT = /^trk_live_[A-Za-z0-9_-]{16,}$/;

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

export function getApiKeyPrefix(apiKey: string): string {
  if (typeof apiKey !== "string") return "";
  return apiKey.slice(0, PREFIX_LENGTH);
}

export function isValidApiKeyFormat(apiKey: string): boolean {
  if (typeof apiKey !== "string") return false;
  return API_KEY_FORMAT.test(apiKey.trim());
}

export function generateApiKey(): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const secret = crypto.randomBytes(24).toString("base64url");
  const rawKey = `${API_KEY_PREFIX}${secret}`;

  return {
    rawKey,
    keyPrefix: getApiKeyPrefix(rawKey),
    keyHash:   hashApiKey(rawKey),
  };
}

export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}...`;
}
