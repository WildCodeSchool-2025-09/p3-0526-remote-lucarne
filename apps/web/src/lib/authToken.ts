const accessTokenStorageKey = "lucarne.accessToken";

function getAccessToken(): string | null {
  return sessionStorage.getItem(accessTokenStorageKey);
}

function setAccessToken(accessToken: string): void {
  sessionStorage.setItem(accessTokenStorageKey, accessToken);
}

function clearAccessToken(): void {
  sessionStorage.removeItem(accessTokenStorageKey);
}

export { clearAccessToken, getAccessToken, setAccessToken };
