import type { RequestHandler } from "express";
import type { PhotoUploadResponse } from "@lucarne/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { readPhoto, savePhoto } from "./upload.photo";

const uploadPhoto: RequestHandler<
  Record<string, never>,
  PhotoUploadResponse,
  Buffer
> = asyncHandler(async (request, response) => {
  response
    .status(201)
    .json(
      await savePhoto(
        request.body,
        request.get("content-type")?.split(";")[0] ?? "",
      ),
    );
});

const getPhoto: RequestHandler<{ photoId: string }> = asyncHandler(
  async (request, response) => {
    const photo = await readPhoto(request.params.photoId);

    response.set("Cross-Origin-Resource-Policy", "cross-origin");
    response.set("Cache-Control", "public, max-age=31536000, immutable");
    response.type(photo.extension).send(photo.bytes);
  },
);

export { getPhoto, uploadPhoto };
