import { API_V1_PATH, type ApiErrorResponse } from "@lucarne/shared";
import { apiUrl } from "../config/environment";
import { getAccessToken } from "./authToken";

type QueryValue = boolean | number | string | null | undefined;
type QueryParameters = Record<string, QueryValue | QueryValue[]>;

interface HttpRequestOptions extends Omit<RequestInit, "body" | "method"> {
  body?: BodyInit;
  json?: unknown;
  query?: QueryParameters;
}

class HttpError extends Error {
  readonly code?: string;
  readonly payload: unknown;
  readonly status: number;

  constructor(response: Response, payload: unknown) {
    const apiError = getApiError(payload);

    super(apiError?.message ?? `HTTP ${response.status}: ${response.statusText}`);
    this.name = "HttpError";
    this.code = apiError?.code;
    this.payload = payload;
    this.status = response.status;
  }
}

const apiBaseUrl = `${apiUrl}${API_V1_PATH}`;

function getApiError(payload: unknown): ApiErrorResponse["error"] | undefined {
  if (typeof payload !== "object" || payload == null || !("error" in payload)) {
    return undefined;
  }

  const { error } = payload;

  if (
    typeof error !== "object"
    || error == null
    || !("code" in error)
    || typeof error.code !== "string"
    || !("message" in error)
    || typeof error.message !== "string"
  ) {
    return undefined;
  }

  return { code: error.code, message: error.message };
}

function createUrl(path: string, query?: QueryParameters): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBaseUrl}${normalizedPath}`;

  if (query == null) {
    return url;
  }

  const searchParameters = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const value of values) {
      if (value != null) {
        searchParameters.append(key, String(value));
      }
    }
  }

  const queryString = searchParameters.toString();

  return queryString === "" ? url : `${url}?${queryString}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return text === "" ? undefined : text;
}

async function request<T>(
  method: string,
  path: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const { body, headers: initialHeaders, json, query, ...requestOptions } = options;

  if (body !== undefined && json !== undefined) {
    throw new TypeError("An HTTP request cannot define both body and json");
  }

  const headers = new Headers(initialHeaders);
  headers.set("accept", "application/json");

  const accessToken = getAccessToken();

  if (accessToken !== null && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  if (json !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(createUrl(path, query), {
    ...requestOptions,
    body: json === undefined ? body : JSON.stringify(json),
    headers,
    method,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new HttpError(response, payload);
  }

  return payload as T;
}

const httpClient = {
  delete: <T>(path: string, options?: HttpRequestOptions) =>
    request<T>("DELETE", path, options),
  get: <T>(path: string, options?: HttpRequestOptions) =>
    request<T>("GET", path, options),
  patch: <T>(path: string, options?: HttpRequestOptions) =>
    request<T>("PATCH", path, options),
  post: <T>(path: string, options?: HttpRequestOptions) =>
    request<T>("POST", path, options),
  put: <T>(path: string, options?: HttpRequestOptions) =>
    request<T>("PUT", path, options),
};

export { HttpError, httpClient };
export type { HttpRequestOptions, QueryParameters, QueryValue };
