import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_SALT_ROUNDS = 10;
const LEGACY_SALT = process.env.PASSWORD_SALT || "zm_secure_salt_2026_pk";

/**
 * Checks if a string is a standard Bcrypt hash ($2a$, $2b$, or $2y$)
 */
export function isBcryptHash(hash?: string | null): boolean {
  if (!hash || typeof hash !== "string") return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

/**
 * Hash password using bcrypt with 10 salt rounds
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

/**
 * Synchronous bcrypt hash for batch migrations and server initialization
 */
export function hashPasswordSync(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_SALT_ROUNDS);
}

/**
 * Legacy salted SHA-256 hash (used only for backward-compatible migration verification)
 */
export function legacySha256Hash(plain: string): string {
  return crypto.createHash("sha256").update(plain + LEGACY_SALT).digest("hex");
}

/**
 * Verify a plain-text password against a stored hash or legacy format.
 * Automatically flags `needsRehash: true` if the stored hash is a legacy SHA-256
 * or plaintext password so the system can upgrade it seamlessly to bcrypt.
 */
export async function verifyPassword(
  plain: string,
  storedHash?: string | null
): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!plain || !storedHash) {
    return { valid: false, needsRehash: false };
  }

  // 1. Modern Bcrypt format ($2a$, $2b$, $2y$)
  if (isBcryptHash(storedHash)) {
    const match = await bcrypt.compare(plain, storedHash);
    return { valid: match, needsRehash: false };
  }

  // 2. Legacy salted SHA-256 format (64-character hex string)
  if (storedHash.length === 64 && /^[0-9a-f]{64}$/i.test(storedHash)) {
    const legacy = legacySha256Hash(plain);
    if (crypto.timingSafeEqual(Buffer.from(legacy), Buffer.from(storedHash))) {
      return { valid: true, needsRehash: true };
    }
  }

  // 3. Fallback: Legacy plaintext match (very old legacy records)
  if (plain === storedHash) {
    return { valid: true, needsRehash: true };
  }

  return { valid: false, needsRehash: false };
}
