import type { Request, Response } from "express";

import {
  CloudinaryConfigError,
  uploadImageToCloudinary,
} from "../../services/cloudinary.js";

/**
 * Generic image-upload handler.
 *
 * POST multipart/form-data (field "file", optional text field "folder")
 *   → Cloudinary
 *   → { success, url, publicId }
 *
 * It deliberately does NOT touch the database. The feature controller that
 * consumes this endpoint stores the returned URL in its own existing field
 * (profilepic, image, banner, ...), which keeps the upload service reusable.
 */
export const uploadImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error:
        'No image file received. Send multipart/form-data with a file in the field named "file".',
    });
  }

  try {
    const rawFolder = req.body?.folder;
    const folder =
      typeof rawFolder === "string" && rawFolder.trim().length > 0
        ? rawFolder
        : undefined;

    const result = await uploadImageToCloudinary(
      {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
      },
      folder !== undefined ? { folder } : {}
    );

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    if (error instanceof CloudinaryConfigError) {
      // Missing/empty CLOUDINARY_* env vars — names only, never values.
      console.error(`[upload] ${error.message}`);
      return res.status(500).json({
        success: false,
        error: "Cloudinary is not configured",
        details: error.message,
      });
    }

    // Real failure reason for debugging (service already redacts credentials).
    const message =
      error instanceof Error ? error.message : "Unknown upload error";
    console.error(`[upload] Cloudinary upload failed: ${message}`);
    return res.status(502).json({
      success: false,
      error: "Cloudinary upload failed",
      details: message,
    });
  }
};
