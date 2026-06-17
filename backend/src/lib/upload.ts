import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { uploadConfig } from "../config/upload.config.js";
import { env } from "../config/env.config.js";
import { ValidationError } from "./errors.js";

// ============================================================================
// R2 CLIENT (S3-compatible)
// ============================================================================

type R2Sdk = {
  S3Client: new (args: {
    region: string;
    endpoint: string;
    credentials: { accessKeyId: string; secretAccessKey: string };
  }) => { send: (command: unknown) => Promise<unknown> };
  PutObjectCommand: new (args: Record<string, unknown>) => unknown;
  DeleteObjectCommand: new (args: Record<string, unknown>) => unknown;
};

let r2SdkPromise: Promise<R2Sdk> | null = null;
let r2ClientPromise: Promise<{ send: (command: unknown) => Promise<unknown> }> | null = null;

async function getR2Sdk(): Promise<R2Sdk> {
  if (!r2SdkPromise) {
    r2SdkPromise = import("@aws-sdk/client-s3") as Promise<R2Sdk>;
  }

  try {
    return await r2SdkPromise;
  } catch {
    throw new ValidationError(
      "R2 upload package is missing. Install @aws-sdk/client-s3 in backend dependencies.",
    );
  }
}

async function getR2Client(): Promise<{ send: (command: unknown) => Promise<unknown> }> {
  if (!r2ClientPromise) {
    r2ClientPromise = (async () => {
      const { S3Client } = await getR2Sdk();

      return new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });
    })();
  }

  return r2ClientPromise;
}

// ============================================================================
// FILE FILTERS
// ============================================================================

function imageFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (uploadConfig.allowedMimeTypes.images.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `Invalid file type: ${file.mimetype}. Allowed: ${uploadConfig.allowedMimeTypes.images.join(", ")}`,
      ),
    );
  }
}

function documentFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (uploadConfig.allowedMimeTypes.documents.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `Invalid file type: ${file.mimetype}. Allowed: ${uploadConfig.allowedMimeTypes.documents.join(", ")}`,
      ),
    );
  }
}

// ============================================================================
// MULTER INSTANCES (memory storage — buffer is streamed to R2 in controllers)
// ============================================================================

const memoryStorage = multer.memoryStorage();

export const uploadAvatar = multer({
  storage: memoryStorage,
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter: imageFilter,
}).single("avatar");

export const uploadLogo = multer({
  storage: memoryStorage,
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter: imageFilter,
}).single("logo");

export const uploadDocument = multer({
  storage: memoryStorage,
  limits: { fileSize: uploadConfig.maxFileSize * 2 }, // 10MB for documents
  fileFilter: documentFilter,
}).single("document");

export const uploadServiceImage = multer({
  storage: memoryStorage,
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter: imageFilter,
}).single("image");

export const uploadPortfolioImage = multer({
  storage: memoryStorage,
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter: imageFilter,
}).single("image");

// ============================================================================
// R2 HELPERS
// ============================================================================

/**
 * Upload a multer memory-buffered file to R2.
 * Returns the public URL of the uploaded object.
 */
export async function uploadToR2(file: Express.Multer.File, subdir: string): Promise<string> {
  const { PutObjectCommand } = await getR2Sdk();
  const r2 = await getR2Client();
  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${subdir}/${uuidv4()}${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${env.R2_PUBLIC_URL}/${key}`;
}

/**
 * Delete an object from R2 by its full public URL.
 */
export async function deleteFromR2(publicUrl: string): Promise<void> {
  const { DeleteObjectCommand } = await getR2Sdk();
  const r2 = await getR2Client();
  const key = publicUrl.replace(`${env.R2_PUBLIC_URL}/`, "");
  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}
