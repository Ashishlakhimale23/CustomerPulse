import crypto from "crypto";

/**
 * Generates a cryptographically secure, URL-safe token for use in
 * invitation links (e.g. https://app.example.com/invite/accept?token=...).
 *
 * 32 bytes -> 43 chars base64url, ~192 bits of entropy. Collision risk
 * against the `token @unique` constraint on Invitation is negligible,
 * but createInvitation should still let a unique-constraint violation
 * bubble up (or retry once) rather than assume uniqueness.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function generateRandomString(length:number) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    
    return result;
}

/**
 * Generates a human-readable, unique-ish ticket number like:
 *   TCK-260704-8K3F
 *
 * Format: TCK-<YYMMDD>-<4 random base36 chars, uppercase>
 * The date prefix makes tickets easy to eyeball/sort by creation day;
 * the random suffix keeps two tickets created the same day from colliding.
 *
 * NOTE: this is NOT guaranteed collision-free (it's ~1.7M possible suffixes
 * per day), and `ticketNumber` is `@unique` on the Ticket model, so a
 * collision will throw a Prisma P2002 error on create. Wrap the insert in
 * a retry loop (below) rather than assuming this always succeeds.
 */
export function generateTicketNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const datePart = `${yy}${mm}${dd}`;

  const suffix = crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()
    .slice(0, 4);

  return `TCK-${datePart}-${suffix}`;
}
