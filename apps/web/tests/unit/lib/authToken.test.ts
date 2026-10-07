import { clearAccessToken, getAccessToken, setAccessToken } from "../../../src/lib/authToken";
import queryClient from "../../../src/lib/queryClient";

describe("auth token storage", () => {
  beforeEach(() => {
    clearAccessToken();
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

  it("removes the old account's query and mutation caches when replacing its token", () => {
    setAccessToken("account-a");
    queryClient.setQueryData(["private"], { account: "A" });
    queryClient.getMutationCache().build(queryClient, { mutationKey: ["private-mutation"] });
    setAccessToken("account-b");
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(getAccessToken()).toBe("account-b");
  });

  it("preserves data when storing the identical token again", () => {
    setAccessToken("same-account");
    queryClient.setQueryData(["private"], { account: "same" });
    setAccessToken("same-account");
    expect(queryClient.getQueryData(["private"])).toEqual({ account: "same" });
  });
});
