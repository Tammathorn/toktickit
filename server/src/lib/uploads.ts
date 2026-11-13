import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import type { RequestHandler } from "express";

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

// Lab 5 (R-04). Where the bytes of an attachment are kept:
//   disk      - a file under UPLOAD_DIR (the default; local development, tests)
//   database  - the Attachment.content column (Cloud Run, which has no
//               lasting disk: a restart or a redeploy would lose the files)
// Read on every request, not at import, so a test can switch it.
export type StorageMode = "disk" | "database";
export function storageMode(): StorageMode {
  return process.env.ATTACHMENT_STORAGE === "database" ? "database" : "disk";
}

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

// A generated name for the stored copy; the original filename is metadata only
// (BR-53). In database mode it is still the row's unique storedFilename.
export function generatedFilename(mimeType: string): string {
  return `${randomUUID()}${EXTENSION_BY_MIME[mimeType] ?? ""}`;
}

const limits = { fileSize: MAX_UPLOAD_BYTES, files: 1 };
const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (isPermittedFile(file.mimetype, file.originalname)) cb(null, true);
  else cb(new UnsupportedFileTypeError());
};

let diskUpload: ReturnType<multer.Multer["single"]> | undefined;
function diskUploader() {
  if (!diskUpload) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    diskUpload = multer({
      storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => cb(null, generatedFilename(file.mimetype)),
      }),
      limits,
      fileFilter,
    }).single("file");
  }
  return diskUpload;
}

// Database mode keeps the file in memory (at most MAX_UPLOAD_BYTES) until the
// route writes it into the row; nothing touches the container's disk.
const memoryUpload = multer({ storage: multer.memoryStorage(), limits, fileFilter }).single("file");

if (storageMode() === "disk") fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const uploadSingleFile: RequestHandler = (req, res, next) =>
  (storageMode() === "database" ? memoryUpload : diskUploader())(req, res, next);

export function unlinkQuietly(storedFilename: string | undefined): void {
  if (!storedFilename) return; // database mode: nothing was written to disk
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, storedFilename));
  } catch {
    // already gone, or never written
  }
}
