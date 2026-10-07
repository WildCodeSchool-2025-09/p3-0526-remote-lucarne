import queryClient from "./queryClient";
import { advanceSessionRevision, assertSessionRevision, getSessionRevision } from "./sessionRevision";

const accessTokenStorageKey = "lucarne.accessToken";
const sessionRequests = new Set<AbortController>();

function registerSessionRequest(controller: AbortController): () => void {
  sessionRequests.add(controller);
  return () => { sessionRequests.delete(controller); };
}

function resetSessionData(): void {
  advanceSessionRevision();
  for (const controller of sessionRequests) controller.abort();
  sessionRequests.clear();
  queryClient.clear();
}

function getAccessToken(): string | null {
  return sessionStorage.getItem(accessTokenStorageKey);
}

function setAccessToken(accessToken: string): void {
  if (getAccessToken() === accessToken) return;
  resetSessionData();
  sessionStorage.setItem(accessTokenStorageKey, accessToken);
}

function clearAccessToken(): void {
  sessionStorage.removeItem(accessTokenStorageKey);
  resetSessionData();
}

export {
  assertSessionRevision,
  clearAccessToken,
  getAccessToken,
  getSessionRevision,
  registerSessionRequest,
  setAccessToken,
};
