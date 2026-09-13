import type { RequestHandler } from "express";
import { environment } from "../config/environment";
import { AppError } from "../errors/AppError";

interface Attempt { count: number; resetAt: number; }
const attempts = new Map<string, Attempt>();

function loginKey(ip: string, email: unknown): string {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  return `${ip}:${normalizedEmail}`;
}

const loginRateLimit: RequestHandler = (request, response, next) => {
  if (environment.loginRateLimit.maxAttempts === 0) return next();
  const now = Date.now();
  const body = request.body as unknown;
  const email = typeof body === "object" && body != null && "email" in body
    ? (body as { email?: unknown }).email
    : undefined;
  const key = loginKey(request.ip ?? "unknown", email);
  const current = attempts.get(key);
  const attempt = current == null || current.resetAt <= now
    ? { count: 0, resetAt: now + environment.loginRateLimit.windowMs }
    : current;

  if (attempt.count >= environment.loginRateLimit.maxAttempts) {
    const retryAfter = Math.max(1, Math.ceil((attempt.resetAt - now) / 1000));
    response.setHeader("Retry-After", String(retryAfter));
    next(new AppError(429, "TOO_MANY_LOGIN_ATTEMPTS", "Too many login attempts. Please try again later."));
    return;
  }

  attempt.count += 1;
  attempts.set(key, attempt);
  next();
};

function clearLoginRateLimit(): void { attempts.clear(); }

export { clearLoginRateLimit, loginRateLimit };
