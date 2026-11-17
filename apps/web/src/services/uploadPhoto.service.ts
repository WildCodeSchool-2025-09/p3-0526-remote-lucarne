import type { PhotoUploadResponse } from "@lucarne/shared";
import { apiUrl } from "../config/environment";
import { httpClient } from "../lib/httpClient";

async function uploadPhoto(file: File): Promise<string> {
  const result = await httpClient.post<PhotoUploadResponse>("/uploads/photos", {
    body: file,
    headers: { "content-type": file.type },
  });

  return new URL(result.path, apiUrl || window.location.origin).href;
}

export { uploadPhoto };
