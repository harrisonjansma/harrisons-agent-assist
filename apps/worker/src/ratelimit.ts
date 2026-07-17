/**
 * In-memory per-IP rate limiter (ADR: 5 sessions / rolling hour / IP).
 * A map is fine for a single-instance demo; resets on redeploy, which is
 * acceptable here.
 */
import { createHash } from "node:crypto";
import { LIMITS } from "@call-copilot/shared";

const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

/** Stable, non-reversible IP identifier for the `sessions.ip_hash` column. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Records a new session attempt for this IP hash and reports whether it is
 * allowed. Prunes timestamps outside the rolling window.
 */
export function allowSession(ipHash: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const arr = (hits.get(ipHash) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMITS.MAX_SESSIONS_PER_HOUR) {
    const oldest = arr[0]!;
    hits.set(ipHash, arr);
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - oldest) };
  }
  arr.push(now);
  hits.set(ipHash, arr);
  return { allowed: true, retryAfterMs: 0 };
}
