import { Attachment } from "../types";

const API_BASE = "http://localhost:3000";

export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// mimeType -> accepted file extensions. Kept in one place so the dropzone's
// `accept` attribute, the validation message, and the upload request all
// agree on exactly what "supported document" means.
export const ALLOWED_ATTACHMENT_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

const ALLOWED_EXTENSIONS = Object.values(ALLOWED_ATTACHMENT_TYPES).flat();

/** Value for an <input type="file" accept="..."> covering every supported type. */
export const ATTACHMENT_ACCEPT_ATTR = [
  ...Object.keys(ALLOWED_ATTACHMENT_TYPES),
  ...ALLOWED_EXTENSIONS,
].join(",");

export const ATTACHMENT_TYPES_LABEL = "PDF, Excel (.xlsx/.xls), or image (PNG/JPG/WEBP/GIF)";

function getExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

/** Client-side check mirroring the server's rules, so bad files are caught before any network call. */
export function validateAttachmentFile(file: File): string | null {
  if (file.size <= 0) {
    return `${file.name} is empty.`;
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `${file.name} is larger than 20MB.`;
  }
  const ext = getExtension(file.name);
  const mimeOk = Object.keys(ALLOWED_ATTACHMENT_TYPES).includes(file.type);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
  if (!mimeOk && !extOk) {
    return `${file.name} isn't a supported file type. Allowed: ${ATTACHMENT_TYPES_LABEL}.`;
  }
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Uploads a single file straight to S3 using a presigned URL:
 *  1. ask the API for a presigned PUT URL scoped to this ticket
 *  2. PUT the raw file bytes to S3 (never touches our server)
 *  3. tell the API to record the resulting object as a ticket attachment
 */
export async function uploadAttachmentToS3(
  file: File,
  ticketId: string,
  token: string,
  onProgress?: (percent: number) => void
): Promise<Attachment> {
  const presignRes = await fetch(`${API_BASE}/tickets/${ticketId}/attachments/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
    }),
  });
  const presignData = await presignRes.json();
  if (!presignRes.ok) throw new Error(presignData.error || "Could not get an upload URL");

  const { uploadUrl, fileUrl } = presignData as { uploadUrl: string; fileUrl: string };

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload to storage failed"));
    };
    xhr.onerror = () => reject(new Error("Upload to storage failed"));
    xhr.send(file);
  });

  const createRes = await fetch(`${API_BASE}/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName: file.name, fileUrl }),
  });
  const attachment = await createRes.json();
  if (!createRes.ok) throw new Error(attachment.error || "Failed to save the attachment record");
  return attachment as Attachment;
}
