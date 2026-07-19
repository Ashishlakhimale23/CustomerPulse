import { useRef, useState } from "react";
import { UploadCloud, File as FileIcon, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Attachment } from "../types";
import {
  ATTACHMENT_ACCEPT_ATTR,
  ATTACHMENT_TYPES_LABEL,
  MAX_ATTACHMENT_SIZE_BYTES,
  formatBytes,
  uploadAttachmentToS3,
  validateAttachmentFile,
} from "../libs/attachmentUpload";

interface QueueItem {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

interface AttachmentUploaderProps {
  token: string;
  // When set, selected files upload straight to S3 against this ticket.
  ticketId?: string;
  disabled?: boolean;
  disabledMessage?: string;
  // When ticketId isn't known yet (e.g. a ticket being drafted), the
  // parent holds selected files here and uploads them once it has an id.
  stagedFiles?: File[];
  onStagedFilesChange?: (files: File[]) => void;
  onUploaded?: (attachment: Attachment) => void;
  compact?: boolean;
  // When true (and ticketId is set), shows a "Comment (optional)" box above
  // the dropzone. Whatever's typed there is posted as a comment alongside
  // the attachment; if left blank, the API posts a comment naming the file
  // instead, so every upload still shows up in the activity thread.
  allowComment?: boolean;
}

// Drag-and-drop + click-to-browse picker for ticket attachments (xlsx,
// pdf, images - under 20MB). Files are validated client-side, then either
// uploaded immediately straight to S3 (ticketId provided) or staged for
// the parent to upload once a ticket id exists.
export default function AttachmentUploader({
  token,
  ticketId,
  disabled,
  disabledMessage,
  stagedFiles,
  onStagedFilesChange,
  onUploaded,
  compact,
  allowComment,
}: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || disabled) return;
    setError("");
    const files = Array.from(fileList);
    const valid: File[] = [];
    const errors: string[] = [];
    for (const f of files) {
      const msg = validateAttachmentFile(f);
      if (msg) errors.push(msg);
      else valid.push(f);
    }
    if (errors.length) setError(errors.join(" "));
    if (valid.length === 0) return;

    if (ticketId) {
      const commentForThisBatch = commentDraft;
      const items: QueueItem[] = valid.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        file: f,
        status: "uploading",
        progress: 0,
      }));
      setQueue((prev) => [...prev, ...items]);
      setCommentDraft("");
      items.forEach((item) => {
        uploadAttachmentToS3(
          item.file,
          ticketId,
          token,
          (pct) => {
            setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, progress: pct } : q)));
          },
          commentForThisBatch
        )
          .then((attachment) => {
            setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "done", progress: 100 } : q)));
            onUploaded?.(attachment);
            // The parent refetches the real attachments list on success, so
            // just fade this queue entry out shortly after it completes.
            setTimeout(() => setQueue((prev) => prev.filter((q) => q.id !== item.id)), 1500);
          })
          .catch((err: Error) => {
            setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: err.message } : q)));
          });
      });
    } else {
      const next = [...(stagedFiles || []), ...valid];
      onStagedFilesChange?.(next);
    }
  };

  const removeStagedFile = (index: number) => {
    if (!stagedFiles) return;
    onStagedFilesChange?.(stagedFiles.filter((_, i) => i !== index));
  };

  if (disabled) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 text-xs rounded-lg">
        {disabledMessage || "Adding attachments is currently disabled."}
      </div>
    );
  }

  return (
    <div>
      {allowComment && ticketId && (
        <textarea
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          placeholder="Comment (optional) - shown alongside the file(s) you attach below"
          rows={2}
          className="w-full mb-2 text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer
          ${compact ? "p-4" : "p-6"}
          ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"}`}
      >
        <UploadCloud size={compact ? 18 : 22} className="text-slate-400" />
        <p className="text-xs text-slate-600">
          <span className="font-semibold text-indigo-600">Click to browse</span> or drag and drop
        </p>
        <p className="text-[10px] text-slate-400">
          {ATTACHMENT_TYPES_LABEL} — up to {formatBytes(MAX_ATTACHMENT_SIZE_BYTES)}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-2 text-[11px] text-red-600 flex items-start gap-1">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {/* Staged files - shown when a ticket id isn't known yet */}
      {stagedFiles && stagedFiles.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {stagedFiles.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileIcon size={14} className="text-slate-400 shrink-0" />
                <span className="truncate">{f.name}</span>
                <span className="text-slate-400 shrink-0">{formatBytes(f.size)}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeStagedFile(i);
                }}
                className="text-slate-400 hover:text-red-500 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Live upload progress - shown when uploading straight to an existing ticket */}
      {queue.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                {item.status === "uploading" && <Loader2 size={14} className="text-indigo-500 animate-spin shrink-0" />}
                {item.status === "done" && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                {item.status === "error" && <AlertCircle size={14} className="text-red-500 shrink-0" />}
                <span className="truncate">{item.file.name}</span>
                {item.status === "uploading" && (
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden min-w-[40px]">
                    <div className="h-full bg-indigo-500 transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {item.status === "error" && <span className="text-red-500 truncate">{item.error}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
