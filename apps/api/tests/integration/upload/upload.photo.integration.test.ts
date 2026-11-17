import type { PhotoUploadResponse } from "@lucarne/shared";
import { PHOTO_MAX_BYTES } from "@lucarne/shared";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../../src/app";
import { createEditor, createUser } from "../../helpers/auth";
import type * as EnvironmentModule from "../../../src/config/environment";

const storage = vi.hoisted(() => ({ directory: "" }));
vi.mock("../../../src/config/environment", async (original) => {
  const actual = await original<typeof EnvironmentModule>();
  return { environment: { ...actual.environment, upload: storage } };
});
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=", "base64");

describe("shared photo upload", () => {
  beforeEach(async () => { storage.directory = await mkdtemp(path.join(os.tmpdir(), "lucarne-upload-photo-test-")); });
  afterEach(async () => {
    expect(path.dirname(storage.directory)).toBe(os.tmpdir());
    expect(path.basename(storage.directory)).toMatch(/^lucarne-upload-photo-test-/);
    await rm(storage.directory, { recursive: true, force: true });
  });

  it("stores an authenticated upload and serves the same image for the player photo", async () => {
    const editor = await createEditor();
    const uploaded = await request(app).post("/api/v1/uploads/photos").set("Authorization", `Bearer ${editor.accessToken}`).set("Content-Type", "image/png").send(png);
    expect(uploaded.status).toBe(201);
    const result = uploaded.body as PhotoUploadResponse;
    expect(result.path).toMatch(/^\/api\/v1\/uploads\/photos\/[0-9a-f-]+\.png$/);
    const fetched = await request(app).get(result.path);
    expect(fetched.status).toBe(200);
    expect(fetched.headers["content-type"]).toContain("image/png");
    expect(fetched.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(fetched.body).toEqual(png);
    const legacy = await request(app).get(result.path.replace("/uploads/photos/", "/players/photos/"));
    expect(legacy.status).toBe(200);
    expect(legacy.body).toEqual(png);
    const created = await request(app).post("/api/v1/players").set("Authorization", `Bearer ${editor.accessToken}`).send({ firstName: "Alex", lastName: "Martin", pictureUrl: `http://localhost:3310${result.path}` });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ pictureUrl: `http://localhost:3310${result.path}` });
  });

  it("rejects missing authentication and a reader role before storing a file", async () => {
    expect((await request(app).post("/api/v1/uploads/photos").set("Content-Type", "image/png").send(png)).status).toBe(401);
    const user = await createUser();
    expect((await request(app).post("/api/v1/uploads/photos").set("Authorization", `Bearer ${user.accessToken}`).set("Content-Type", "image/png").send(png)).status).toBe(403);
    expect(await readdir(storage.directory)).toEqual([]);
  });

  it("rejects fake images and oversized uploads without storing files", async () => {
    const editor = await createEditor();
    expect((await request(app).post("/api/v1/uploads/photos").set("Authorization", `Bearer ${editor.accessToken}`).set("Content-Type", "image/png").send(Buffer.from("not an image"))).status).toBe(400);
    expect((await request(app).post("/api/v1/uploads/photos").set("Authorization", `Bearer ${editor.accessToken}`).set("Content-Type", "image/png").send(Buffer.alloc(PHOTO_MAX_BYTES + 1))).status).toBe(413);
    expect(await readdir(storage.directory)).toEqual([]);
  });

  it("returns 404 for missing files and invalid photo identifiers", async () => {
    expect((await request(app).get("/api/v1/uploads/photos/00000000-0000-4000-8000-000000000320.png")).status).toBe(404);
    expect((await request(app).get("/api/v1/uploads/photos/other-file.png")).status).toBe(404);
  });
});
