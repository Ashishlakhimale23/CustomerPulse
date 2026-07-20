import { useEffect, useRef, useState } from "react";
import { RequestorDirectoryEntry } from "../types";
import { MessageSquare, ShieldCheck, ShieldX, Ban, CheckCircle2, Trash2, Upload, FileDown, FileUp } from "lucide-react";
import * as XLSX from "xlsx";

const API_BASE = "http://localhost:3000";

type BulkInviteResult = {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  created: string[];
  skipped: { name: string; email: string; reason: string }[];
};

export const RequestorDirectory = (
  { token, setError, setSuccess }: {
    token: string;
    setError: React.Dispatch<React.SetStateAction<string>>;
    setSuccess: React.Dispatch<React.SetStateAction<string>>;
  }
) => {
  const [requestors, setRequestors] = useState<RequestorDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  // Bulk upload (Excel template download / bulk invite) state
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkInviteResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchRequestors = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/requestors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setRequestors(data);
    } catch {
      setError("Failed to load requestor directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async (id: string, action: "approve" | "reject" | "block" | "unblock", successMsg: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/admin/requestors/${id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} requestor`);
      setSuccess(successMsg);
      fetchRequestors();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this requestor account permanently? This can't be undone.")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/admin/requestors/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete requestor");
      setSuccess("Requestor deleted.");
      fetchRequestors();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendMessage = async (id: string) => {
    if (!messageText.trim()) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/admin/requestors/${id}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: messageText.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setSuccess("Message sent to requestor.");
      setMessagingId(null);
      setMessageText("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Downloads a blank Excel template the admin fills in with requestor
  // names + emails, then re-uploads via "Bulk Upload".
  const handleDownloadTemplate = () => {
    setShowUploadMenu(false);
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Email"],
      ["Jane Doe", "jane.doe@example.com"],
    ]);
    worksheet["!cols"] = [{ wch: 28 }, { wch: 32 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Requestors");
    XLSX.writeFile(workbook, "requestor_bulk_invite_template.xlsx");
  };

  const handleUploadClick = () => {
    setShowUploadMenu(false);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError("");
    setSuccess("");
    setBulkResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      // Accept "Name"/"name" and "Email"/"email" header variants.
      const requestorsPayload = rows
        .map((row) => {
          const keyMap = Object.keys(row).reduce((acc, k) => {
            acc[k.trim().toLowerCase()] = row[k];
            return acc;
          }, {} as Record<string, any>);
          return {
            name: String(keyMap["name"] ?? "").trim(),
            email: String(keyMap["email"] ?? "").trim(),
          };
        })
        .filter((r) => r.name || r.email);

      if (requestorsPayload.length === 0) {
        setError("No rows found in the uploaded file. Use the template and fill in Name + Email.");
        return;
      }

      setUploading(true);
      const res = await fetch(`${API_BASE}/admin/requestors/bulk-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ requestors: requestorsPayload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Bulk invite failed");

      setBulkResult(data);
      setSuccess(`Bulk invite complete: ${data.createdCount} invited, ${data.skippedCount} skipped.`);
      fetchRequestors();
    } catch (err: any) {
      setError(err.message || "Failed to process the uploaded file");
    } finally {
      setUploading(false);
    }
  };

  const filtered = requestors.filter(r => filter === "ALL" ? true : r.approvalStatus === filter);
  const pendingCount = requestors.filter(r => r.approvalStatus === "PENDING").length;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Users Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review self-registered user accounts, approve or reject signups, and manage access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full">
              {pendingCount} pending approval
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setShowUploadMenu((v) => !v)}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Upload size={14} />
              {uploading ? "Uploading..." : "Upload"}
            </button>
            {showUploadMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUploadMenu(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                  >
                    <FileDown size={16} className="text-slate-500 mt-0.5" />
                    <span>
                      <span className="block text-xs font-semibold text-slate-900">Download template</span>
                      <span className="block text-[11px] text-slate-500">Excel file with Name + Email columns</span>
                    </span>
                  </button>
                  <button
                    onClick={handleUploadClick}
                    className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-slate-50 cursor-pointer"
                  >
                    <FileUp size={16} className="text-slate-500 mt-0.5" />
                    <span>
                      <span className="block text-xs font-semibold text-slate-900">Bulk upload &amp; invite</span>
                      <span className="block text-[11px] text-slate-500">Upload the filled template to send invites</span>
                    </span>
                  </button>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </div>
      </div>

      {bulkResult && (
        <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Bulk invite results</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {bulkResult.createdCount} invited &middot; {bulkResult.skippedCount} skipped of {bulkResult.totalRows} rows
              </p>
            </div>
            <button
              onClick={() => setBulkResult(null)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          {bulkResult.skipped.length > 0 && (
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Reason skipped</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {bulkResult.skipped.map((s, i) => (
                    <tr key={`${s.email}-${i}`}>
                      <td className="px-4 py-2">{s.name || "—"}</td>
                      <td className="px-4 py-2 font-mono">{s.email || "—"}</td>
                      <td className="px-4 py-2">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 text-left">User</th>
                <th className="px-6 py-3.5 text-left">Email</th>
                <th className="px-6 py-3.5 text-left">Registered</th>
                <th className="px-6 py-3.5 text-left">Tickets</th>
                <th className="px-6 py-3.5 text-left">Approval</th>
                <th className="px-6 py-3.5 text-left">Access</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-slate-400 italic">No user match this filter.</td></tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="px-6 py-4 font-semibold text-slate-900">{r.fullName}</td>
                    <td className="px-6 py-4 font-mono text-slate-500">{r.email}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono font-semibold">{r._count.ticketsRequested}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] border ${
                        r.approvalStatus === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        r.approvalStatus === "REJECTED" ? "bg-red-50 text-red-700 border-red-100" :
                        "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        {r.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] border ${
                        r.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                      }`}>
                        {r.isActive ? "ACTIVE" : "BLOCKED"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        {r.approvalStatus === "PENDING" && (
                          <>
                            <button
                              onClick={() => runAction(r.id, "approve", "Requestor approved.")}
                              title="Approve"
                              className="p-1.5 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 cursor-pointer"
                            >
                              <ShieldCheck size={14} />
                            </button>
                            <button
                              onClick={() => runAction(r.id, "reject", "Requestor rejected.")}
                              title="Reject"
                              className="p-1.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 cursor-pointer"
                            >
                              <ShieldX size={14} />
                            </button>
                          </>
                        )}
                        {r.approvalStatus !== "PENDING" && (
                          r.isActive ? (
                            <button
                              onClick={() => runAction(r.id, "block", "Requestor blocked.")}
                              title="Block"
                              className="p-1.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 cursor-pointer"
                            >
                              <Ban size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => runAction(r.id, "unblock", "Requestor unblocked.")}
                              title="Unblock"
                              className="p-1.5 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 cursor-pointer"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )
                        )}
                        <button
                          onClick={() => { setMessagingId(r.id); setMessageText(""); }}
                          title="Send message"
                          className="p-1.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          title="Delete"
                          className="p-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message modal */}
      {messagingId && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white border border-slate-200 w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Message User
            </h2>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
              placeholder="Type a message for this user..."
              className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <div className="flex gap-2 justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setMessagingId(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendMessage(messagingId)}
                disabled={!messageText.trim()}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
