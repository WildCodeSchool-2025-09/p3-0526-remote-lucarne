import { environment } from "../config/environment";
import { createLoginRateLimiter } from "./loginRateLimit";

// Independent IP counters prevent changing emails from bypassing this limit.
const limiter = createLoginRateLimiter({ ...environment.registerRateLimit, keyBy: "ip", errorCode: "TOO_MANY_REGISTRATION_ATTEMPTS" });
export const registerRateLimit = limiter.middleware;
export const clearRegisterRateLimit = limiter.clear;
