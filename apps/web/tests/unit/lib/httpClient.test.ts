import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, getAccessToken, setAccessToken } from "../../../src/lib/authToken";
import { httpClient } from "../../../src/lib/httpClient";

describe("httpClient authentication", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not send Authorization without a token", async () => {
    await httpClient.get("/protected");

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(request.headers);

    expect(headers.has("authorization")).toBe(false);
  });

  it("sends the stored token as a Bearer token", async () => {
    setAccessToken("token");

    await httpClient.get("/protected");

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(request.headers);

    expect(headers.get("authorization")).toBe("Bearer token");
  });

  it("does not overwrite a manually provided Authorization header", async () => {
    setAccessToken("stored-token");

    await httpClient.get("/protected", {
      headers: { Authorization: "Bearer manual-token" },
    });

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(request.headers);

    expect(headers.get("authorization")).toBe("Bearer manual-token");
  });

  it("preserves the existing HttpError behavior for API errors", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({
        error: { code: "FORBIDDEN", message: "Forbidden" },
      }), {
        headers: { "content-type": "application/json" },
        status: 403,
      }),
    );

    await expect(httpClient.get("/protected")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Forbidden",
      status: 403,
    });
  });

  it("does not erase a new session when an older request returns 401", async () => {
    setAccessToken("old-token");
    const expired = vi.fn();
    window.addEventListener("lucarne:session-expired", expired);
    fetchMock.mockImplementationOnce(() => {
      setAccessToken("new-token");
      return Promise.resolve(new Response(JSON.stringify({
        error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" },
      }), { status: 401, headers: { "content-type": "application/json" } }));
    });
    try {
      await expect(httpClient.get("/seasons")).rejects.toMatchObject({ name: "AbortError" });
      expect(getAccessToken()).toBe("new-token");
      expect(expired).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("lucarne:session-expired", expired);
    }
  });

  it("clears the current session when its own token is rejected", async () => {
    setAccessToken("rejected-token");
    const expired = vi.fn();
    window.addEventListener("lucarne:session-expired", expired);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" },
    }), { status: 401, headers: { "content-type": "application/json" } }));
    try {
      await expect(httpClient.get("/seasons")).rejects.toMatchObject({ status: 401 });
      expect(getAccessToken()).toBeNull();
      expect(expired).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("lucarne:session-expired", expired);
    }
  });

  it("keeps the current session when a login attempt uses incorrect credentials", async () => {
    setAccessToken("current-token");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    }), { status: 401, headers: { "content-type": "application/json" } }));
    await expect(httpClient.post("/auth/login", { json: { email: "admin@lucarne.test", password: "wrong" } }))
      .rejects.toMatchObject({ status: 401 });
    expect(getAccessToken()).toBe("current-token");
  });
});
