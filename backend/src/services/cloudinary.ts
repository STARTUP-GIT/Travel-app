import { v2 as cloudinary } from "cloudinary";

/**
 * Central Cloudinary service for the whole backend.
 *
 * Every image upload in the app goes through `uploadImageToCloudinary` so
 * there is exactly ONE Cloudinary implementation. Feature controllers stay
 * responsible for storing the returned URL in their own existing DB fields.
 *
 * Credentials are read from server-side environment variables only:
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * They are never logged and must never be exposed to the frontend.
 */

const CONFIG_VARS = {
  cloudName: "CLOUDINARY_CLOUD_NAME",
  apiKey: "CLOUDINARY_API_KEY",
  apiSecret: "CLOUDINARY_API_SECRET",
} as const;

const DEFAULT_FOLDER = "tourism-app";

/** Missing/invalid server-side Cloudinary configuration. */
export class CloudinaryConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Cloudinary is not configured. Missing or empty server environment variable(s): ${missing.join(
        ", "
      )}. Set them on the BACKEND only (local .env and production env settings), then restart the backend.`
    );
    this.name = "CloudinaryConfigError";
    this.missing = missing;
  }
}

/** Cloudinary accepted the request shape but the upload itself failed. */
export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

export interface UploadableImage {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

let configStatusLogged = false;

const logConfigStatus = (config: CloudinaryConfig): void => {
  if (configStatusLogged) return;
  configStatusLogged = true;
  // Booleans only — never the values themselves.
  console.log(
    `Cloudinary cloud name configured: ${Boolean(config.cloudName)}\n` +
      `Cloudinary API key configured: ${Boolean(config.apiKey)}\n` +
      `Cloudinary API secret configured: ${Boolean(config.apiSecret)}`
  );
};

const readConfig = (): CloudinaryConfig => {
  const cloudName = process.env[CONFIG_VARS.cloudName]?.trim() ?? "";
  const apiKey = process.env[CONFIG_VARS.apiKey]?.trim() ?? "";
  const apiSecret = process.env[CONFIG_VARS.apiSecret]?.trim() ?? "";

  logConfigStatus({ cloudName, apiKey, apiSecret });

  const missing: string[] = [];
  if (!cloudName) missing.push(CONFIG_VARS.cloudName);
  if (!apiKey) missing.push(CONFIG_VARS.apiKey);
  if (!apiSecret) missing.push(CONFIG_VARS.apiSecret);

  if (missing.length > 0) {
    throw new CloudinaryConfigError(missing);
  }

  return { cloudName, apiKey, apiSecret };
};

/** Strip any occurrence of the credentials from outbound error text. */
const redact = (message: string, secrets: Array<string | undefined>): string => {
  let safe = message;
  for (const secret of secrets) {
    if (secret) safe = safe.split(secret).join("***");
  }
  return safe;
};

/**
 * Optional subfolder under `tourism-app/`. Anything unsafe is stripped so a
 * client-supplied value can never escape the folder or inject path syntax.
 */
const resolveFolder = (subfolder?: string): string => {
  if (!subfolder) return DEFAULT_FOLDER;
  const cleaned = subfolder
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return cleaned ? `${DEFAULT_FOLDER}/${cleaned}` : DEFAULT_FOLDER;
};

/**
 * Uploads one image file buffer to Cloudinary and resolves with the real
 * `secure_url` + `public_id`.
 *
 * Throws:
 *  - CloudinaryConfigError when CLOUDINARY_* env vars are missing/empty
 *  - CloudinaryUploadError for Cloudinary API/transport failures
 */
export const uploadImageToCloudinary = (
  file: UploadableImage,
  options: { folder?: string } = {}
): Promise<CloudinaryUploadResult> => {
  const config = readConfig(); // throws CloudinaryConfigError when unconfigured

  // Configure per call so env changes are picked up without module tricks.
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  const folder = resolveFolder(options.folder);

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) {
          const safeMessage = redact(
            error.message || "Unknown Cloudinary error",
            [config.apiKey, config.apiSecret]
          );
          reject(
            new CloudinaryUploadError(
              `Cloudinary API error${error.http_code ? ` (HTTP ${error.http_code})` : ""}: ${safeMessage}`
            )
          );
          return;
        }
        if (!result?.secure_url || !result?.public_id) {
          reject(
            new CloudinaryUploadError(
              "Cloudinary API returned no secure_url/public_id."
            )
          );
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    stream.on("error", (streamError: Error) => {
      reject(
        new CloudinaryUploadError(
          `Upload stream failed: ${redact(streamError.message, [
            config.apiKey,
            config.apiSecret,
          ])}`
        )
      );
    });

    stream.end(file.buffer);
  });
};
