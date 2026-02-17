import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "5242880", 10); // 5MB

export const uploadConfig = {
  baseDir: path.resolve(__dirname, "..", "..", UPLOAD_DIR),
  maxFileSize: MAX_FILE_SIZE,
  subdirs: {
    avatars: "avatars",
    logos: "logos",
    documents: "documents",
    services: "services",
  } as const,
  allowedMimeTypes: {
    images: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    documents: ["application/pdf", "image/jpeg", "image/png"],
  },
  urlPrefix: "/uploads",
};
