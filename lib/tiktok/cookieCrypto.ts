import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const SALT = "reelgen-tiktok-cookie-v1";

export function sealPayload(plain: string, secret: string): string {
  const key = scryptSync(secret, SALT, 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function openPayload(sealed: string, secret: string): string {
  const buf = Buffer.from(sealed, "base64url");
  if (buf.length < 28) throw new Error("Invalid sealed payload");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const key = scryptSync(secret, SALT, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
