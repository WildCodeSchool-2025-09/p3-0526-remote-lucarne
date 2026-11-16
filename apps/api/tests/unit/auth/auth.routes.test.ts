import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticationErrorMessage } from "@lucarne/shared";
import authRouter from "../../../src/features/auth/auth.routes";
import { errorHandler } from "../../../src/middlewares/errorHandler";
import { hashPassword, verifyPassword } from "../../../src/auth/password";
import { verifyAccessToken } from "../../../src/auth/jwt";
import { Prisma } from "../../../src/generated/prisma/client";
import { clearLoginRateLimit } from "../../../src/middlewares/loginRateLimit";
import { clearRegisterRateLimit } from "../../../src/middlewares/registerRateLimit";

const database = vi.hoisted(() => ({
  role: { findUnique: vi.fn() },
  appUser: { findUnique: vi.fn(), create: vi.fn() },
}));
vi.mock("../../../database/prisma", () => ({ default: { ...database, $transaction: (work: (transaction: typeof database) => unknown) => work(database) } }));

const input = { firstName: "Jane", lastName: "Doe", email: "jane@example.com", password: "Password1" };
const genericError = { error: { code: "INVALID_CREDENTIALS", message: authenticationErrorMessage } };
const app = express(); app.use(express.json()); app.use("/auth", authRouter); app.use(errorHandler);

describe("Public authentication HTTP", () => {
  beforeEach(() => {
    vi.clearAllMocks(); clearLoginRateLimit(); clearRegisterRateLimit();
    database.role.findUnique.mockResolvedValue({ id: "user-role" });
    database.appUser.create.mockResolvedValue({ id: "new-user" });
    database.appUser.findUnique.mockResolvedValue(null);
  });

  it("creates only an ACTIVE USER, hashes the password and returns a signed JWT", async () => {
    const response = await request(app).post("/auth/register").send(input).expect(201);
    const token = (response.body as { accessToken: string }).accessToken;
    expect(await verifyAccessToken(token)).toEqual({ sub: "new-user", role: "USER" });
    expect(database.role.findUnique).toHaveBeenCalledWith({ where: { name: "USER" }, select: { id: true } });
    const write = database.appUser.create.mock.calls[0][0] as { data: { passwordHash: string; status: string; roleId: string } };
    expect(write.data).toMatchObject({ status: "ACTIVE", roleId: "user-role" });
    expect(write.data.passwordHash).not.toBe(input.password);
    expect(await verifyPassword(input.password, write.data.passwordHash)).toBe(true);
    expect(response.body).toEqual({ accessToken: token });
  });

  it.each([{ role: "ADMIN" }, { roleId: "admin-role" }, { status: "ACTIVE" }, { password: "password1" }, { password: "Password" }, { password: "Short1" }])("rejects invalid or privileged registration %j without creating a user", async (extra) => {
    await request(app).post("/auth/register").send({ ...input, ...extra }).expect(400);
    expect(database.appUser.create).not.toHaveBeenCalled();
  });

  it("uses the same error for an existing email and an unknown login", async () => {
    database.appUser.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }));
    const registration = await request(app).post("/auth/register").send(input).expect(401);
    const login = await request(app).post("/auth/login").send({ email: input.email, password: input.password }).expect(401);
    expect(registration.body).toEqual(genericError);
    expect(login.body).toEqual(genericError);
  });

  it("uses the same error for a wrong password and an inactive account", async () => {
    const passwordHash = await hashPassword(input.password);
    database.appUser.findUnique.mockResolvedValue({ id: "old-user", passwordHash, status: "DISABLED", role: { name: "ADMIN" } });
    expect((await request(app).post("/auth/login").send({ email: input.email, password: "wrong" }).expect(401)).body).toEqual(genericError);
    expect((await request(app).post("/auth/login").send({ email: input.email, password: input.password }).expect(401)).body).toEqual(genericError);
  });

  it("limits registrations by IP even when the email changes", async () => {
    for (let i = 0; i < 5; i++) await request(app).post("/auth/register").send({ ...input, email: `user${i}@example.com` }).expect(201);
    const response = await request(app).post("/auth/register").send({ ...input, email: "another@example.com" }).expect(429);
    expect(response.headers["retry-after"]).toBeDefined();
    expect(database.appUser.create).toHaveBeenCalledTimes(5);
  });

  it("does not create an account if the USER role is missing", async () => {
    database.role.findUnique.mockResolvedValue(null);
    await request(app).post("/auth/register").send(input).expect(503);
    expect(database.appUser.create).not.toHaveBeenCalled();
  });

  it("protects the session endpoint", async () => {
    await request(app).get("/auth/me").expect(401);
    expect(database.appUser.findUnique).not.toHaveBeenCalled();
  });

  it("returns the current database role and only the session DTO", async () => {
    const registration = await request(app).post("/auth/register").send(input).expect(201);
    database.appUser.findUnique.mockResolvedValue({ id: "new-user", ...input, status: "ACTIVE", passwordHash: "private", role: { name: "ADMIN" } });
    const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${(registration.body as { accessToken: string }).accessToken}`).expect(200);
    expect(response.body).toEqual({ id: "new-user", firstName: input.firstName, lastName: input.lastName, email: input.email, role: "ADMIN" });
  });
});
