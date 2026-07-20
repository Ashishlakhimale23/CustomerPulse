import React, { useRef, useState } from "react";
import { Department, Invitation as InvitationType, SupportLevel, UserRole, TicketCategory, WindCategory } from "../types";
import { Upload, FileDown, FileUp } from "lucide-react";
import * as XLSX from "xlsx";

interface InvitationComponentProps {
  setInviteDeptId: React.Dispatch<React.SetStateAction<string>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setSuccess: React.Dispatch<React.SetStateAction<string>>;
  token: string;
  inviteDeptId: string;
  fetchInvitations: () => Promise<void>;
  invitations: InvitationType[];
  departments: Department[];
  inviteCategoryIds: string[];
  setInviteCategoryIds: React.Dispatch<React.SetStateAction<string[]>>;
  inviteDeptCategories: TicketCategory[];
  setInviteDeptCategories: React.Dispatch<React.SetStateAction<TicketCategory[]>>;
  apiFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const STATES = [
  "Maharashtra",
  "Karnataka",
  "Gujarat",
  "Tamil Nadu",
  "Delhi",
  "Telangana",
  "Kerala",
];


export const InvitationComponent: React.FC<InvitationComponentProps> = ({
  setInviteDeptId,
  setError,
  setSuccess,
  token,
  inviteDeptId,
  fetchInvitations,
  invitations,
  departments,
  inviteCategoryIds,
  setInviteCategoryIds,
  inviteDeptCategories,
  setInviteDeptCategories,
  apiFetch,
}) => {
  const requestFn = apiFetch || window.fetch;

  const [name, setName] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.REQUESTER);
  const [inviteDeptIds, setInviteDeptIds] = useState<string[]>([]);

  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedWindCategory, setSelectedWindCategory] = useState<WindCategory | "">("");
  const isExecutiveRole = inviteRole === UserRole.HOD || inviteRole === UserRole.CXO;

  // Bulk upload (Excel template download / bulk invite) state - reuses
  // whichever Role/Department/Category/State/WindCategory is currently
  // selected in the form above; only Name+Email vary per row.
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    totalRows: number;
    createdCount: number;
    skippedCount: number;
    skipped: { name: string; email: string; reason: string }[];
  } | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);



  const handleRoleChange = (newRole: UserRole) => {
    setInviteRole(newRole);

    if (newRole !== UserRole.AGENT) {
      setSelectedState("");
      setSelectedWindCategory("");
    }

    // Reset category/department selections appropriately when switching roles
    if (newRole === UserRole.HOD || newRole === UserRole.CXO) {
      setInviteCategoryIds([]);
      setInviteDeptId("");
    } else {
      setInviteDeptIds([]);
    }
  };
  const handleInviteDeptChange = async (deptId: string) => {
    setInviteDeptId(deptId);
    setInviteDeptCategories([]);
    setInviteCategoryIds([]);

    if (!deptId) return;

    try {
      const res = await requestFn(`http://localhost:3000/departments/${deptId}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInviteDeptCategories(data);
      }
    } catch (err) {
      // Fallback or handle network error silently in dev preview
    }
  };


  // Action: Invite someone
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (inviteRole != UserRole.REQUESTER && !isExecutiveRole && inviteCategoryIds.length <= 0) {
        setError("Select at least a single category");
        return;
      }

      if (isExecutiveRole && inviteDeptIds.length <= 0) {
        setError("Select at least one department for HOD / CXO");
        return;
      }

      if (inviteRole == UserRole.AGENT && !selectedWindCategory) {
        setError("Select Wind, Non-Wind, or Both for this agent");
        return;
      }

      const payload = {
        name: name,
        email: inviteEmail,
        role: inviteRole,
        departmentId: !isExecutiveRole ? (inviteDeptId || null) : null,
        departmentIds: isExecutiveRole ? inviteDeptIds : [],
        categoryIds: !isExecutiveRole ? inviteCategoryIds : [],
        supportLevel: inviteRole == UserRole.AGENT ? SupportLevel.L1 : SupportLevel.L2,
        state:
          inviteRole === UserRole.AGENT && selectedState
            ? selectedState
            : null,
        windCategory:
          inviteRole === UserRole.AGENT && selectedWindCategory
            ? selectedWindCategory
            : null,

      };

      const res = await requestFn("http://localhost:3000/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data || "Failed to send invitation");

      setSuccess(`Invitation sent to ${inviteEmail}.`);
      setName("");
      setInviteEmail("");
      setInviteCategoryIds([]);
      setSelectedState("");
      setSelectedWindCategory("");
      setInviteDeptIds([]);
      setInviteDeptId("");
      fetchInvitations();
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const res = await requestFn(`http://localhost:3000/invitations/${id}/resend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess("Invitation resent successfully.");
        fetchInvitations();
      }
    } catch (err) {}
  };

  const handleCancelInvite = async (id: string) => {
    try {
      const res = await requestFn(`http://localhost:3000/invitations/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess("Invitation cancelled.");
        fetchInvitations();
      }
    } catch (err) {}
  };

  // Same field checks as handleSendInvite, reused so a bulk batch can't be
  // fired off with an incomplete Role/Department/Category selection.
  const validateCommonFields = (): string | null => {
    if (inviteRole != UserRole.REQUESTER && !isExecutiveRole && inviteCategoryIds.length <= 0) {
      return "Select at least a single category";
    }
    if (isExecutiveRole && inviteDeptIds.length <= 0) {
      return "Select at least one department for HOD / CXO";
    }
    if (inviteRole == UserRole.AGENT && !selectedWindCategory) {
      return "Select Wind, Non-Wind, or Both for this agent";
    }
    return null;
  };

  const handleDownloadBulkTemplate = () => {
    setShowBulkMenu(false);
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Email"],
      ["Jane Doe", "jane.doe@example.com"],
    ]);
    worksheet["!cols"] = [{ wch: 28 }, { wch: 32 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invitees");
    XLSX.writeFile(workbook, `${inviteRole.toLowerCase()}_bulk_invite_template.xlsx`);
  };

  const handleBulkUploadClick = () => {
    const validationError = validateCommonFields();
    if (validationError) {
      setError(validationError);
      return;
    }
    setShowBulkMenu(false);
    bulkFileInputRef.current?.click();
  };

  const handleBulkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setSuccess("");
    setBulkResult(null);

    const validationError = validateCommonFields();
    if (validationError) {
      setError(validationError);
      return;
    }

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

      const payload = {
        role: inviteRole,
        requestors: requestorsPayload,
        departmentId: !isExecutiveRole ? (inviteDeptId || null) : null,
        departmentIds: isExecutiveRole ? inviteDeptIds : [],
        categoryIds: !isExecutiveRole ? inviteCategoryIds : [],
        supportLevel: inviteRole == UserRole.AGENT ? SupportLevel.L1 : SupportLevel.L2,
        state: inviteRole === UserRole.AGENT && selectedState ? selectedState : null,
        windCategory: inviteRole === UserRole.AGENT && selectedWindCategory ? selectedWindCategory : null,
      };

      setBulkUploading(true);
      const res = await requestFn("http://localhost:3000/invitations/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Bulk invite failed");

      setBulkResult(data);
      setSuccess(`Bulk invite complete: ${data.createdCount} invited, ${data.skippedCount} skipped.`);
      fetchInvitations();
    } catch (err: any) {
      setError(err.message || "Failed to process the uploaded file");
    } finally {
      setBulkUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel list of invites */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <h1 className="text-xl font-bold text-zinc-900">Collaboration Invites</h1>
            <p className="text-sm text-zinc-500">Track and manage operator onboarding invitations.</p>
          </div>

          <div className="bg-white border border-zinc-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Email Address</th>
                    <th className="px-4 py-3 text-left">Target Role</th>
                    <th className="px-4 py-3 text-left">Assigned Dept / Category</th>
                    <th className="px-4 py-3 text-left">Onboarding Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-400 italic">
                        No invitations found.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((i) => (
                      <tr key={i.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3.5 font-mono font-medium">{i.email}</td>
                        <td className="px-4 py-3.5 font-mono text-teal-800 font-bold">{i.role}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-zinc-800">
                            {
                              (i.department && i.department.length > 0
                                ? i.department.map((d) => d.name).join(", ")
                                : <span className="text-zinc-400 italic">— No Department</span>)}
                          </div>
                          {i.categoryName && (
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{i.categoryName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold ${
                              i.status === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : i.status === "ACCEPTED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {i.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 flex justify-end">
                          {i.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleResendInvite(i.id)}
                                className="text-[10px] font-mono border px-2 py-0.5 hover:bg-zinc-50 cursor-pointer bg-white"
                              >
                                Resend
                              </button>
                              <button
                                onClick={() => handleCancelInvite(i.id)}
                                className="text-[10px] font-mono text-red-600 border border-red-200 px-2 py-0.5 hover:bg-red-50 cursor-pointer bg-white"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Invite dispatch panel - Attribute order: Name, Email, Role, Department, Category */}
        <div className="bg-white border border-zinc-200 p-6 h-fit shadow-sm">
          <h3 className="text-sm font-semibold uppercase text-zinc-900 border-b pb-2 mb-4">Onboard Staff Member and users</h3>

          <form onSubmit={handleSendInvite} className="space-y-4">
            {/* 1. Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Name</label>
              <input
                type="text"
                placeholder="Joe Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 border border-zinc-300 bg-white focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            {/* 2. Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Corporate Email</label>
              <input
                type="email"
                placeholder="operator@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full text-xs p-2.5 border border-zinc-300 bg-white focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            {/* 3. Role */}
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Operations Role Profile</label>
              <select
                value={inviteRole}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full text-xs p-2.5 border border-zinc-300 bg-white"
                required
              >
                {["CXO","HOD","AGENT","USER"].map((role) => (

                  
                  <option key={role} value={role == "USER" ? UserRole.REQUESTER : role }>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            {/* if agent is selected add the state drop it should be optional*/}
            {/* State (Optional - AGENT only) */}
            {inviteRole === UserRole.AGENT && (
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  State (Optional)
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full text-xs p-2.5 border border-zinc-300 bg-white"
                >
                  <option value="">-- Select State --</option>

                  {STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Wind Category (Required - AGENT only): which turbine business this agent covers */}
            {inviteRole === UserRole.AGENT && (
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                  Wind Category
                </label>
                <select
                  value={selectedWindCategory}
                  onChange={(e) => setSelectedWindCategory(e.target.value as WindCategory | "")}
                  className="w-full text-xs p-2.5 border border-zinc-300 bg-white"
                  required
                >
                  <option value="">-- Select Wind Category --</option>
                  <option value={WindCategory.WIND}>Wind</option>
                  <option value={WindCategory.NON_WIND}>Non-Wind</option>
                  <option value={WindCategory.BOTH}>Both</option>
                </select>
              </div>
            )}

            {/* 4. Department (Single select for normal roles, Multi-select for HOD/CXO) */}
            {
              inviteRole != UserRole.REQUESTER && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">
                    {isExecutiveRole ? "Assign Departments (Multiple allowed for HOD/CXO)" : "Assign Department"}
                  </label>

                  {isExecutiveRole ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 border border-zinc-300 bg-white">
                      {departments.length === 0 ? (
                        <p className="text-[11px] text-zinc-400 italic">No departments available.</p>
                      ) : (
                        departments.map((d) => {
                          const isChecked = inviteDeptIds.includes(d.id);
                          return (
                            <label
                              key={d.id}
                              className="flex items-center space-x-2 text-xs text-zinc-700 cursor-pointer hover:bg-zinc-50 p-1"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setInviteDeptIds([...inviteDeptIds, d.id]);
                                  } else {
                                    setInviteDeptIds(inviteDeptIds.filter((id) => id !== d.id));
                                  }
                                }}
                                className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span>{d.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <select
                      value={inviteDeptId}
                      onChange={(e) => handleInviteDeptChange(e.target.value)}
                      className="w-full text-xs p-2.5 border border-zinc-300 bg-white"
                    >
                      <option value="">-- Choose Department --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}


            {/* 5. Category (Hidden / Not applicable for HOD and CXO) */}
            {inviteRole!=UserRole.REQUESTER && !isExecutiveRole && inviteDeptId && (
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                  Assign Categories (Select multiple)
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 border border-zinc-300 bg-white">
                  {inviteDeptCategories.length === 0 ? (
                    <p className="text-[11px] text-zinc-400 italic">No categories found in this department.</p>
                  ) : (
                    inviteDeptCategories.map((c) => {
                      const isChecked = inviteCategoryIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center space-x-2 text-xs text-zinc-700 cursor-pointer hover:bg-zinc-50 p-1"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteCategoryIds([...inviteCategoryIds, c.id]);
                              } else {
                                setInviteCategoryIds(inviteCategoryIds.filter((id) => id !== c.id));
                              }
                            }}
                            className="rounded border-zinc-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>{c.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {isExecutiveRole && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-500 italic">
                Note: HOD and CXO roles have cross-department oversight; no specific category is applied.
              </div>
            )}


            <button
              type="submit"
              className="w-full bg-[#032d26] hover:bg-[#021f1a] text-white text-xs font-semibold py-2.5 cursor-pointer text-center transition-colors"
            >
              Issue Invitation
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-[11px] text-zinc-500 mb-2">
              Or invite many people at once with this same Role{!isExecutiveRole && inviteRole !== UserRole.REQUESTER ? " / Department / Category" : isExecutiveRole ? " / Department" : ""} setting:
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBulkMenu((v) => !v)}
                disabled={bulkUploading}
                className="w-full flex items-center justify-center gap-1.5 border border-zinc-300 text-zinc-700 text-xs font-semibold py-2.5 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Upload size={14} />
                {bulkUploading ? "Uploading..." : `Bulk Upload (${inviteRole})`}
              </button>
              {showBulkMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowBulkMenu(false)} />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-zinc-200 shadow-lg z-20 overflow-hidden">
                    <button
                      type="button"
                      onClick={handleDownloadBulkTemplate}
                      className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-zinc-50 cursor-pointer border-b border-zinc-100"
                    >
                      <FileDown size={16} className="text-zinc-500 mt-0.5" />
                      <span>
                        <span className="block text-xs font-semibold text-zinc-900">Download template</span>
                        <span className="block text-[11px] text-zinc-500">Excel file with Name + Email columns</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkUploadClick}
                      className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-zinc-50 cursor-pointer"
                    >
                      <FileUp size={16} className="text-zinc-500 mt-0.5" />
                      <span>
                        <span className="block text-xs font-semibold text-zinc-900">Bulk upload &amp; invite</span>
                        <span className="block text-[11px] text-zinc-500">Sends a {inviteRole} invite to every row</span>
                      </span>
                    </button>
                  </div>
                </>
              )}
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleBulkFileSelected}
              />
            </div>

            {bulkResult && (
              <div className="mt-3 border border-zinc-200 text-xs">
                <div className="flex justify-between items-center px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                  <span className="font-semibold text-zinc-800">
                    {bulkResult.createdCount} invited &middot; {bulkResult.skippedCount} skipped of {bulkResult.totalRows}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBulkResult(null)}
                    className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                {bulkResult.skipped.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto divide-y divide-zinc-100">
                    {bulkResult.skipped.map((s, i) => (
                      <li key={`${s.email}-${i}`} className="px-3 py-1.5 text-zinc-600">
                        <span className="font-mono">{s.email || "—"}</span>: {s.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
