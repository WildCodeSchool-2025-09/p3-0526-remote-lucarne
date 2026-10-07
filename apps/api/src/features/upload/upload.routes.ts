import { PHOTO_MAX_BYTES } from "@lucarne/shared";
import { raw, Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireRoles } from "../../middlewares/requireRoles";
import { getPhoto, uploadPhoto } from "./upload.controller";
import { UPLOAD_WRITE_ROLES } from "./upload.permissions";

const uploadRouter = Router();

uploadRouter.post(
  "/photos",
  authenticate,
  requireRoles(...UPLOAD_WRITE_ROLES),
  raw({ type: () => true, limit: PHOTO_MAX_BYTES }),
  uploadPhoto,
);

uploadRouter.get("/photos/:photoId", getPhoto);

export default uploadRouter;