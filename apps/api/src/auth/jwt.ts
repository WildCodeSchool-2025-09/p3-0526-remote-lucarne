import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { environment } from "../config/environment";
import { isAppRole } from "./appRole";
import type { AppRole } from "./appRole";

const JWT_ALGORITHM = "HS256";
const jwtSecret = new TextEncoder().encode(environment.appSecret);

const appRoleSchema = z.custom<AppRole>(
  (value) => typeof value === "string" && isAppRole(value),
  "Invalid application role",
);

const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: appRoleSchema,
});

interface AccessTokenUser {
  id: string;
  role: AppRole;
}

type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

const signAccessToken = async (
  user: AccessTokenUser,
): Promise<string> => new SignJWT({ role: user.role })
  .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
  .setSubject(user.id)
  .setExpirationTime(`${environment.jwt.accessTokenTtlSeconds}s`)
  .sign(jwtSecret);

const verifyAccessToken = async (
  token: string,
): Promise<AccessTokenPayload> => {
  const { payload } = await jwtVerify(token, jwtSecret, {
    algorithms: [JWT_ALGORITHM],
    requiredClaims: ["exp", "sub"],
  });

  return accessTokenPayloadSchema.parse(payload);
};

export { signAccessToken, verifyAccessToken };
export type { AccessTokenPayload, AccessTokenUser };
