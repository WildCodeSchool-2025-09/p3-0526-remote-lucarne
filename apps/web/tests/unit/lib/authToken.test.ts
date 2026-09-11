import { clearAccessToken, getAccessToken, setAccessToken } from "../../../src/lib/authToken";

describe("auth token storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores and reads an access token", () => {
    setAccessToken("token");

    expect(getAccessToken()).toBe("token");
  });

  it("returns null after clearing the access token", () => {
    setAccessToken("token");

    clearAccessToken();

    expect(getAccessToken()).toBeNull();
  });
});
