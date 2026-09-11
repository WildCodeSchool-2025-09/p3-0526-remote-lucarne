import { SignJWT } from "jose";
import type { JWTPayload } from "jose";
import { environment } from "../../../src/config/environment";
import { APP_ROLES } from "../../../src/auth/appRole";
import { signAccessToken, verifyAccessToken } from "../../../src/auth/jwt";
import { beforeAll, describe, expect, it } from "vitest";

const userId = "00000000-0000-4000-8000-000000000001";
const jwtAlgorithm = "HS256";
const validExpiration = Math.floor(Date.now() / 1000) + 60;
let accessToken: string;

const signTestToken = async (
  payload: JWTPayload,
  secret = environment.appSecret,
): Promise<string> => new SignJWT(payload)
  .setProtectedHeader({ alg: jwtAlgorithm, typ: "JWT" })
  .sign(new TextEncoder().encode(secret));

beforeAll(async () => {
  accessToken = await signAccessToken({
    id: userId,
    role: APP_ROLES.ADMIN,
  });
});

describe("JWT access tokens", () => {
  it("verifies a valid token", async () => {
    await expect(verifyAccessToken(accessToken)).resolves.toEqual({
      sub: userId,
      role: APP_ROLES.ADMIN,
    });
  });

  it("reads the user identifier from the subject", async () => {
    const payload = await verifyAccessToken(accessToken);

    expect(payload.sub).toBe(userId);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signTestToken({
      exp: validExpiration,
      role: APP_ROLES.ADMIN,
      sub: userId,
    }, "another-secret-with-at-least-32-characters");

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const token = await signTestToken({
      exp: Math.floor(Date.now() / 1000) - 60,
      role: APP_ROLES.ADMIN,
      sub: userId,
    });

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects a token without an expiration", async () => {
    const token = await signTestToken({
      role: APP_ROLES.ADMIN,
      sub: userId,
    });

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects a token without a subject", async () => {
    const token = await signTestToken({
      exp: validExpiration,
      role: APP_ROLES.ADMIN,
    });

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects a token without a role", async () => {
    const token = await signTestToken({
      exp: validExpiration,
      sub: userId,
    });

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects an unknown role", async () => {
    const token = await signTestToken({
      exp: validExpiration,
      role: "MODERATER",
      sub: userId,
    });

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });
});
