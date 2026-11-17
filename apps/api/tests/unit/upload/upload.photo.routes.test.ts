import { PHOTO_MAX_BYTES } from "@lucarne/shared";
import type { RequestHandler } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../../src/app";
import { AppError } from "../../../src/errors/AppError";
import { readPhoto, savePhoto } from "../../../src/features/upload/upload.photo";

const session = vi.hoisted(() => ({ role: "EDITOR", authenticated: true }));
vi.mock("../../../src/middlewares/authenticate", () => ({
  authenticate: ((request, _response, next) => {
    if (!session.authenticated) {
      next(new AppError(401, "UNAUTHORIZED", "Authentification requise."));
      return;
    }
    request.user = { id: "user-id", role: session.role as "ADMIN" | "MODERATOR" | "EDITOR" | "USER" };
    next();
  }) satisfies RequestHandler,
}));
vi.mock("../../../src/features/upload/upload.photo", () => ({
  savePhoto: vi.fn(), readPhoto: vi.fn(),
}));

const savePhotoMock = vi.mocked(savePhoto);
const readPhotoMock = vi.mocked(readPhoto);
const photoId = "00000000-0000-4000-8000-000000000320.png";
const photoPath = "/api/v1/uploads/photos/" + photoId;

describe("shared photo upload routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.role = "EDITOR";
    session.authenticated = true;
    savePhotoMock.mockResolvedValue({ path: photoPath });
    readPhotoMock.mockResolvedValue({ bytes: Buffer.from("image"), extension: ".png" });
  });

  it.each([128 * 1024, PHOTO_MAX_BYTES])("accepts a binary photo of %i bytes within the shared limit", async (size) => {
    const photo = Buffer.alloc(size);
    const response = await request(app).post("/api/v1/uploads/photos").set("Content-Type", "image/png").send(photo);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ path: photoPath });
    expect(savePhotoMock).toHaveBeenCalledOnce();
    const [receivedPhoto, contentType] = savePhotoMock.mock.calls[0];
    expect(receivedPhoto.equals(photo)).toBe(true);
    expect(contentType).toBe("image/png");
  });

  it.each(["ADMIN", "MODERATOR", "EDITOR"])("allows %s to upload images", async (role) => {
    session.role = role;
    const response = await request(app).post("/api/v1/uploads/photos").set("Content-Type", "image/png").send(Buffer.from("image"));
    expect(response.status).toBe(201);
    expect(savePhotoMock).toHaveBeenCalledOnce();
  });

  it("rejects unauthenticated uploads without storing files", async () => {
    session.authenticated = false;
    const response = await request(app).post("/api/v1/uploads/photos").set("Content-Type", "image/png").send(Buffer.from("image"));
    expect(response.status).toBe(401);
    expect(savePhotoMock).not.toHaveBeenCalled();
  });

  it("rejects reader uploads without storing files", async () => {
    session.role = "USER";
    const response = await request(app).post("/api/v1/uploads/photos").set("Content-Type", "image/png").send(Buffer.from("image"));
    expect(response.status).toBe(403);
    expect(savePhotoMock).not.toHaveBeenCalled();
  });

  it("rejects oversized photos before storing them", async () => {
    const response = await request(app).post("/api/v1/uploads/photos").set("Content-Type", "image/png").send(Buffer.alloc(PHOTO_MAX_BYTES + 1));
    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
    expect(savePhotoMock).not.toHaveBeenCalled();
  });

  it("keeps the 100 KB limit for JSON requests", async () => {
    const response = await request(app).post("/api/v1/players").send({ firstName: "A".repeat(128 * 1024) });
    expect(response.status).toBe(413);
    expect(response.body).toMatchObject({ error: { code: "PAYLOAD_TOO_LARGE" } });
    expect(savePhotoMock).not.toHaveBeenCalled();
  });

  it("removes the obsolete player upload endpoint", async () => {
    const response = await request(app).post("/api/v1/players/photos").set("Content-Type", "image/png").send(Buffer.from("image"));
    expect(response.status).toBe(404);
    expect(savePhotoMock).not.toHaveBeenCalled();
  });

  it.each(["/api/v1/uploads/photos/", "/api/v1/players/photos/"])("serves public permanent images under %s", async (prefix) => {
    session.authenticated = false;
    const response = await request(app).get(prefix + photoId);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(Buffer.from("image"));
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(response.headers["cache-control"]).toContain("immutable");
    expect(readPhotoMock).toHaveBeenCalledWith(photoId);
  });
});
