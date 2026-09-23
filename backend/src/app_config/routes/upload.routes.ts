import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

import { anyAuthMiddleware } from "../../middlewares/auth.midleware.js";
import { uploadImage } from "../controllers/upload.controller.js";

/**
 * The ONE generic image-upload endpoint for the whole backend:
 *
 *   POST /api/upload/image        (multipart/form-data, field name: "file")
 *   optional text field: folder   (stored under tourism-app/<folder>)
 *
 * Any authenticated role may call it (admin, user, guide, hotel/restaurant
 * owner). It returns the Cloudinary secure URL and never writes to the
 * database itself.
 */
const router = Router();

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// image/svg+xml is allowed so the branding app-icon upload can accept SVG.
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];

// In-memory buffer: the file is streamed straight to Cloudinary and never
// written to the local filesystem (required on serverless/production too).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(
      new Error(
        `Unsupported file type "${file.mimetype}". Allowed types: ${ALLOWED_MIME_TYPES.join(
          ", "
        )}.`
      )
    );
  },
});

// Wraps multer so validation failures surface as clear 4xx JSON instead of
// an unhandled error, and so LIMIT_FILE_SIZE maps to 413.
const receiveImageField = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          success: false,
          error: `Image is too large. Maximum allowed size is ${MAX_IMAGE_BYTES / (1024 * 1024)} MB.`,
        });
        return;
      }
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Invalid file upload",
    });
  });
};

router.post("/upload/image", anyAuthMiddleware, receiveImageField, uploadImage);

export default router;
