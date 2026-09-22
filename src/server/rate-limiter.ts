/**
 * In-memory Rate Limiter (PRD §17 Anti-Abuse)
 * Protects room creation and media upload endpoints against brute-force and resource exhaustion.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private limits = new Map<string, RateLimitRecord>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}

  public check(key: string): { allowed: boolean; remaining: number; resetInMs: number } {
    const now = Date.now();
    const record = this.limits.get(key);

    if (!record || now > record.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1, resetInMs: this.windowMs };
    }

    if (record.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetInMs: record.resetAt - now };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetInMs: Math.max(0, record.resetAt - now),
    };
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.limits.entries()) {
      if (now > record.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// 10 room creations per hour per IP
export const roomCreationLimiter = new RateLimiter(10, 60 * 60 * 1000);

// 30 photo uploads per minute per session/IP
export const photoUploadLimiter = new RateLimiter(30, 60 * 1000);
