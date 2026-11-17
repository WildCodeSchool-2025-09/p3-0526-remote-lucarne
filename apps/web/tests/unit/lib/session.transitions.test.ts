import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAccessToken, getAccessToken, setAccessToken } from "../../../src/lib/authToken";
import { httpClient } from "../../../src/lib/httpClient";
import queryClient from "../../../src/lib/queryClient";
import { login } from "../../../src/services/auth.service";
import { MutationObserver } from "@tanstack/react-query";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), {
  status: 200, headers: { "content-type": "application/json" },
});

describe("session transitions with pending HTTP operations", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    clearAccessToken();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    clearAccessToken();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("cancels A's query and prevents its late response replacing B's data", async () => {
    const response = deferred<Response>();
    setAccessToken("account-a");
    fetchMock.mockReturnValueOnce(response.promise);
    const oldQuery = queryClient.fetchQuery({ queryKey: ["private"], queryFn: () => httpClient.get("/players"), retry: false })
      .catch((error: unknown) => error);
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    setAccessToken("account-b");
    expect(signal?.aborted).toBe(true);
    queryClient.setQueryData(["private"], { account: "B" });
    response.resolve(jsonResponse({ account: "A" }));
    await oldQuery;
    expect(queryClient.getQueryData(["private"])).toEqual({ account: "B" });
  });

  it("rejects A's late mutation without running success callbacks or writing B's cache", async () => {
    const response = deferred<Response>();
    const onSuccess = vi.fn((data: unknown) => { queryClient.setQueryData(["private"], data); });
    setAccessToken("account-a");
    fetchMock.mockReturnValueOnce(response.promise);
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: () => httpClient.patch("/players/player-id", { json: { firstName: "A" } }),
      onSuccess,
    });
    const result = mutation.execute(undefined).catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    setAccessToken("account-b");
    queryClient.setQueryData(["private"], { account: "B" });
    response.resolve(jsonResponse({ account: "A" }));
    expect(await result).toMatchObject({ name: "AbortError" });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["private"])).toEqual({ account: "B" });
  });

  it("discards A's response if the session changes while JSON is being parsed", async () => {
    const body = deferred<unknown>();
    const response = jsonResponse({});
    const parseJson = vi.spyOn(response, "json").mockReturnValue(body.promise);
    setAccessToken("account-a");
    fetchMock.mockResolvedValueOnce(response);
    const result = httpClient.get("/players").catch((error: unknown) => error);
    await vi.waitFor(() => expect(parseJson).toHaveBeenCalled());
    setAccessToken("account-b");
    body.resolve({ account: "A" });
    expect(await result).toMatchObject({ name: "AbortError" });
  });

  it("blocks per-call success callbacks when A's invalidation finishes after login B", async () => {
    const invalidation = deferred<void>();
    const onSuccess = vi.fn(async () => { await invalidation.promise; });
    const lateSuccess = vi.fn((data: unknown) => { queryClient.setQueryData(["private"], data); });
    setAccessToken("account-a");
    fetchMock.mockResolvedValueOnce(jsonResponse({ account: "A" }));
    const observer = new MutationObserver(queryClient, {
      mutationFn: () => httpClient.patch("/players/player-id", { json: { firstName: "A" } }),
      onSuccess,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    try {
      const result = observer.mutate(undefined, { onSuccess: lateSuccess }).catch((error: unknown) => error);
      await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
      setAccessToken("account-b");
      queryClient.setQueryData(["private"], { account: "B" });
      invalidation.resolve();
      expect(await result).toMatchObject({ name: "AbortError" });
      expect(lateSuccess).not.toHaveBeenCalled();
      expect(queryClient.getQueryData(["private"])).toEqual({ account: "B" });
    } finally {
      unsubscribe();
    }
  });

  it("rejects an old request even when logout is followed by reusing the same token", async () => {
    const response = deferred<Response>();
    setAccessToken("account-a");
    fetchMock.mockReturnValueOnce(response.promise);
    const result = httpClient.get("/players").catch((error: unknown) => error);
    clearAccessToken();
    setAccessToken("account-a");
    response.resolve(jsonResponse({ account: "old A" }));
    expect(await result).toMatchObject({ name: "AbortError" });
    expect(getAccessToken()).toBe("account-a");
  });

  it("does not let a late login overwrite a more recent login", async () => {
    const oldResponse = deferred<Response>();
    fetchMock.mockReturnValueOnce(oldResponse.promise);
    const oldLogin = login({ email: "a@lucarne.test", password: "A" }).catch((error: unknown) => error);
    fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: "account-b" }));
    await login({ email: "b@lucarne.test", password: "B" });
    oldResponse.resolve(jsonResponse({ accessToken: "account-a" }));
    expect(await oldLogin).toMatchObject({ name: "AbortError" });
    expect(getAccessToken()).toBe("account-b");
  });

  it("keeps B when both login responses resolve before either token is stored", async () => {
    const responseA = deferred<{ accessToken: string }>();
    const responseB = deferred<{ accessToken: string }>();
    vi.spyOn(httpClient, "post").mockReturnValueOnce(responseA.promise).mockReturnValueOnce(responseB.promise);
    const loginA = login({ email: "a@lucarne.test", password: "A" }).catch((error: unknown) => error);
    const loginB = login({ email: "b@lucarne.test", password: "B" });
    responseB.resolve({ accessToken: "account-b" });
    responseA.resolve({ accessToken: "account-a" });
    await loginB;
    expect(await loginA).toMatchObject({ name: "AbortError" });
    expect(getAccessToken()).toBe("account-b");
  });

  it("preserves an explicit request cancellation signal", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_input, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
    }));
    const result = httpClient.get("/players", { signal: controller.signal }).catch((error: unknown) => error);
    controller.abort();
    expect(await result).toMatchObject({ name: "AbortError" });
  });
});
