import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, setAccessToken } from "../../../src/lib/authToken";
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
});
