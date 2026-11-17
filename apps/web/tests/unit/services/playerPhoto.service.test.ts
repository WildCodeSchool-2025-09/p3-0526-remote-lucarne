import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadPhoto } from "../../../src/services/uploadPhoto.service";
import { clearAccessToken } from "../../../src/lib/authToken";

describe("shared photo upload service", () => {
  afterEach(() => { vi.unstubAllGlobals(); clearAccessToken(); });

  it("sends the binary file and resolves its permanent URL on the API origin", async () => {
    const photoPath = "/api/v1/uploads/photos/00000000-0000-4000-8000-000000000320.png";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ path: photoPath }), { status: 201, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["image"], "photo.png", { type: "image/png" });

    const result = await uploadPhoto(file);

    const request = fetchMock.mock.calls[0];
    expect(request[1]?.method).toBe("POST");
    expect(request[1]?.body).toBe(file);
    expect(new Headers(request[1]?.headers).get("content-type")).toBe("image/png");
    const requestUrl = request[0] instanceof Request ? request[0].url : request[0];
    expect(result).toBe(new URL(photoPath, new URL(requestUrl, window.location.origin).origin).href);
  });
});
