import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";

// Attachment upload, C-16 / C-17 / BR-41.
//
// multer parses the multipart body. Type and size are enforced here - in
// fileFilter and limits - before the handler runs, so a file refused under
// BR-42 or BR-43 is never committed to UPLOAD_DIR; multer also unlinks a
// partially written file when it aborts a request. Files land on disk under a
// generated name; the original filename is metadata only (BR-53). Nothing under
// UPLOAD_DIR is ever served statically (BR-54).

export const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 5 * 1024 * 1024;

// BR-42: JPG, JPEG, PNG, WEBP, PDF. Both the declared type and the extension
// must be in the set; the stored extension comes from the type, never the name.
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};
const PERMITTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

export class UnsupportedFileTypeError extends Error {
  constructor() {
    super("Unsupported file type");
    this.name = "UnsupportedFileTypeError";
  }
}

export function isPermittedFile(mimeType: string, originalName: string): boolean {
  const ext = path.extname(originalName).toLowerCase();
  return mimeType in EXTENSION_BY_MIME && PERMITTED_EXTENSIONS.has(ext);
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXTENSION_BY_MIME[file.mimetype] ?? ""}`),
});

export const uploadSingleFile = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (isPermittedFile(file.mimetype, file.originalname)) cb(null, true);
    else cb(new UnsupportedFileTypeError());
  },
}).single("file");

export function unlinkQuietly(storedFilename: string): void {
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, storedFilename));
  } catch {
    // already gone, or never written
  }
}
