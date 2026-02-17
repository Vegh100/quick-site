import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { uploadConfig } from "../config/upload.config.js";
import { ValidationError } from "./errors.js";

// Ensure upload directories exist
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initialize all upload subdirectories
Object.values(uploadConfig.subdirs).forEach((subdir) => {
  ensureDir(path.join(uploadConfig.baseDir, subdir));
});

// Create multer storage for a specific subdirectory
function createStorage(subdir: string): multer.StorageEngine {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(uploadConfig.baseDir, subdir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${uuidv4()}${ext}`;
      cb(null, uniqueName);
    },
  });
}

// File filter for images
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

// File filter for documents
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

// Pre-configured upload instances
export const uploadAvatar = multer({
  storage: createStorage(uploadConfig.subdirs.avatars),
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter: imageFilter,
}).single("avatar");

export const uploadLogo = multer({
  storage: createStorage(uploadConfig.subdirs.logos),
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter: imageFilter,
}).single("logo");

export const uploadDocument = multer({
  storage: createStorage(uploadConfig.subdirs.documents),
  limits: { fileSize: uploadConfig.maxFileSize * 2 }, // 10MB for documents
  fileFilter: documentFilter,
}).single("document");

export const uploadServiceImage = multer({
  storage: createStorage(uploadConfig.subdirs.services),
  limits: { fileSize: uploadConfig.maxFileSize },
  fileFilter: imageFilter,
}).single("image");

// Helper: get public URL from file path
export function getFileUrl(subdir: string, filename: string): string {
  return `${uploadConfig.urlPrefix}/${subdir}/${filename}`;
}

// Helper: delete a file
export function deleteFile(filePath: string): void {
  const fullPath = path.join(uploadConfig.baseDir, filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}
