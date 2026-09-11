import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, getAccessToken, setAccessToken } from "../../../src/lib/authToken";
import { httpClient } from "../../../src/lib/httpClient";
import { login } from "../../../src/services/auth.service";

describe("auth service", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  afterEach(() => {
    clearAccessToken();
    vi.restoreAllMocks();
  });

  it("stores the token after a successful login", async () => {
    vi.spyOn(httpClient, "post").mockResolvedValue({ accessToken: "new-token" });

    await login({ email: "admin@example.com", password: "password" });

    expect(getAccessToken()).toBe("new-token");
    expect(httpClient.post).toHaveBeenCalledWith("/auth/login", {
      json: { email: "admin@example.com", password: "password" },
    });
  });

  it("keeps the existing token when login fails", async () => {
    setAccessToken("existing-token");
    vi.spyOn(httpClient, "post").mockRejectedValue(new Error("Invalid credentials"));

    await expect(
      login({ email: "admin@example.com", password: "wrong-password" }),
    ).rejects.toThrow("Invalid credentials");

    expect(getAccessToken()).toBe("existing-token");
  });
});
