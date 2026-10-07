import type { RequestHandler } from "express";
import { createHash } from "node:crypto";
import { environment } from "../config/environment";
import { AppError } from "../errors/AppError";

interface LoginAttempt {
  count: number;
  resetAt: number;
}

const MAX_LOGIN_RATE_LIMIT_KEYS = 10_000;

interface LoginRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
}

function getLoginAttemptKey(ip: string, email: unknown): string {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  // Retain a fixed-size key even when validation later rejects a large email.
  return createHash("sha256").update(ip).update("\0").update(normalizedEmail).digest("hex");
}

function createLoginRateLimiter({
  maxAttempts,
  windowMs,
  maxKeys = MAX_LOGIN_RATE_LIMIT_KEYS,
  now = Date.now,
}: LoginRateLimitOptions) {
  const loginAttempts = new Map<string, LoginAttempt>();

  const middleware: RequestHandler = (request, response, next) => {
    if (maxAttempts === 0) return next();

    const currentTime = now();
    let earliestResetAt = currentTime + windowMs;

    for (const [key, attempt] of loginAttempts) {
      if (attempt.resetAt <= currentTime) loginAttempts.delete(key);
      else earliestResetAt = Math.min(earliestResetAt, attempt.resetAt);
    }

    const body = request.body as unknown;
    const email = typeof body === "object" && body != null && "email" in body
      ? (body as { email?: unknown }).email
      : undefined;
    const key = getLoginAttemptKey(request.ip ?? "unknown", email);
    const current = loginAttempts.get(key);

    // Never evict a live counter: flooding new keys must not reset a blocked login.
    if (current == null && loginAttempts.size >= maxKeys
      || current != null && current.count >= maxAttempts) {
      const resetAt = current?.resetAt ?? earliestResetAt;
      response.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt - currentTime) / 1000))));
      next(new AppError(
        429,
        "TOO_MANY_LOGIN_ATTEMPTS",
        "Too many login attempts. Please try again later.",
      ));
      return;
    }

    const attempt = current ?? { count: 0, resetAt: currentTime + windowMs };
    attempt.count += 1;
    loginAttempts.set(key, attempt);
    next();
  };

  return { middleware, clear: () => loginAttempts.clear() };
}

const limiter = createLoginRateLimiter(environment.loginRateLimit);
const loginRateLimit = limiter.middleware;
const clearLoginRateLimit = limiter.clear;

export { clearLoginRateLimit, createLoginRateLimiter, loginRateLimit };
