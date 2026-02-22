/**
 * PIN Hashing Utilities — ScanMart
 * Uses bcryptjs (browser-compatible bcrypt)
 *
 * IMPORTANT: Never store raw PINs in Supabase.
 * Always hash on create/update, always verifyPin() on login.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10; // 10 is the industry standard (good balance of speed vs security)

/**
 * Hash a plain-text PIN before saving to DB.
 * @param plainPin  e.g. "1234"
 * @returns bcrypt hash string (60 chars)
 */
export async function hashPin(plainPin: string): Promise<string> {
    return bcrypt.hash(plainPin, SALT_ROUNDS);
}

/**
 * Verify a plain-text PIN against a stored bcrypt hash.
 * @param plainPin   what the user typed
 * @param hash       what's stored in Supabase pin_code column
 * @returns true if match, false otherwise
 */
export async function verifyPin(plainPin: string, hash: string): Promise<boolean> {
    // Backwards-compat: if the stored value looks like a plain PIN (no $2b$ prefix),
    // fall back to plain-text compare so existing staff still work until re-hashed.
    if (!hash.startsWith("$2b$") && !hash.startsWith("$2a$")) {
        return plainPin === hash;
    }
    return bcrypt.compare(plainPin, hash);
}
