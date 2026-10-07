import {
  API_V1_PATH,
  PHOTO_MAX_BYTES,
  type PhotoUploadResponse,
} from "@lucarne/shared";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { environment } from "../../config/environment";
import { AppError } from "../../errors/AppError";

function photoExtension(bytes: Buffer, contentType: string): string {
  if (
    contentType === "image/png" &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    contentType === "image/jpeg" &&
    bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  )
    return "jpg";
  if (
    contentType === "image/webp" &&
    bytes.length >= 20 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";

  throw new AppError(
    400,
    "PLAYER_PHOTO_INVALID",
    "La photo doit être un fichier JPEG, PNG ou WebP valide.",
  );
}

async function savePhoto(
  bytes: Buffer,
  contentType: string,
  directory = environment.upload.directory,
): Promise<PhotoUploadResponse> {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0)
    throw new AppError(
      400,
      "PHOTO_INVALID",
      "Sélectionnez une photo JPEG, PNG ou WebP.",
    );
  if (bytes.length > PHOTO_MAX_BYTES)
    throw new AppError(
      413,
      "PHOTO_TOO_LARGE",
      "La photo ne doit pas dépasser 5 Mo.",
    );

  const extension = photoExtension(bytes, contentType);
  const filename = `${randomUUID()}.${extension}`;

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });

  return { path: `${API_V1_PATH}/uploads/photos/${filename}` };
}

async function readPhoto(
  photoId: string,
  directory = environment.upload.directory,
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(
      photoId,
    )
  ) {
    throw new AppError(404, "RESOURCE_NOT_FOUND", "Photo introuvable.");
  }

  try {
    return {
      bytes: await readFile(path.join(directory, photoId)),
      extension: path.extname(photoId),
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Photo introuvable.");

    throw error;
  }
}

export { readPhoto, savePhoto };
