import { FileText } from "lucide-react"
import { useState } from "react";
import { Department, TicketCategory, Client, PAGES, SubDepartment } from "../types";
import AttachmentUploader from "./AttachmentUploader";
import { uploadAttachmentToS3 } from "../libs/attachmentUpload";

export const TicketForm = ({setError,setSuccess,setSelectedTicketId,setCurrentView,token,departments,clients}:{
    setError:React.Dispatch<React.SetStateAction<string>>,
    setSuccess:React.Dispatch<React.SetStateAction<string>>,
    setSelectedTicketId:React.Dispatch<React.SetStateAction<string>>,
    setCurrentView:React.Dispatch<React.SetStateAction<string>>,
    token:string,
    departments:Department[],
    clients:Client[]
}) => {
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDesc, setNewTicketDesc] = useState("");
  const [newTicketDept, setNewTicketDept] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState("");
  const [newTicketClient, setNewTicketClient] = useState("");
  const [newTicketClientEmail, setNewTicketClientEmail] = useState("");
  const [newTicketClientRep, setNewTicketClientRep] = useState("");
  const [newTicketClientEmpId, setNewTicketClientEmpId] = useState("");
  const [newTicketSite, setNewTicketSite] = useState("");
  const [newTicketState, setNewTicketState] = useState("");
  const [newTicketDesignation, setNewTicketDesignation] = useState("");
  const [newTicketProjectId, setNewTicketProjectId] = useState("");
  const [newTicketDateOccurred, setNewTicketDateOccurred] = useState("");
  const [newTicketTags, setNewTicketTags] = useState<string>("");
  const [newTicketAttachFiles, setNewTicketAttachFiles] = useState<File[]>([]);
  const [attachmentUploadError, setAttachmentUploadError] = useState("");
  const [deptCategories, setDeptCategories] = useState<TicketCategory[]>([]);
  const [deptSubDepartments, setDeptSubDepartments] = useState<SubDepartment[]>([]);
  const [newTicketSubDepartment, setNewTicketSubDepartment] = useState("");



// Handles department select when submitting ticket to trigger category
// (and sub-department) fetching. Sub-department is optional: until the
// user picks one, the category dropdown lists every category under the
// department.
  const handleTicketDeptChange = async (deptId: string) => {
    setNewTicketDept(deptId);
    setNewTicketCategory("");
    setNewTicketSubDepartment("");
    if (!deptId || deptId === "OTHER") {
      setDeptCategories([]);
      setDeptSubDepartments([]);
      return;
    }
    try {
      const [catRes, subDeptRes] = await Promise.all([
        fetch(`http://localhost:3000/departments/${deptId}/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`http://localhost:3000/departments/${deptId}/subdepartments`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (catRes.ok) setDeptCategories(await catRes.json());
      if (subDeptRes.ok) setDeptSubDepartments(await subDeptRes.json());
    } catch (err) {}
  };

  // Handles sub-department select - re-fetches categories scoped to just
  // that sub-department. Clearing the sub-department (back to "-- All --")
  // goes back to showing every category in the department.
  const handleTicketSubDepartmentChange = async (subDepartmentId: string) => {
    setNewTicketSubDepartment(subDepartmentId);
    setNewTicketCategory("");
    if (!newTicketDept || newTicketDept === "OTHER") return;
    try {
      const url = subDepartmentId
        ? `http://localhost:3000/departments/${newTicketDept}/categories?subDepartmentId=${subDepartmentId}`
        : `http://localhost:3000/departments/${newTicketDept}/categories`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDeptCategories(await res.json());
    } catch (err) {}
  };



    const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newTicketDept || !newTicketTitle || !newTicketClient || !newTicketClientEmail || !newTicketSite || !newTicketState || !newTicketDesignation || !newTicketDateOccurred) {
      setError("Please fill out all required fields.");
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: newTicketDept === "OTHER" ? "dept-other" : newTicketDept,
          departmentName: newTicketDept === "OTHER" ? "Other" : undefined,
          categoryId: newTicketCategory === "OTHER" ? "cat-other" : (newTicketCategory || null),
          categoryName: newTicketCategory === "OTHER" ? "Other" : undefined,
          title: newTicketTitle,
          description: newTicketDesc,
          clientName: newTicketClient,
          clientEmail: newTicketClientEmail,
          representative: newTicketClientRep,
          employeeId: newTicketClientEmpId ,
          dateOfOccurance: new Date(newTicketDateOccurred).toISOString(),
          site: newTicketSite,
          state: newTicketState,
          designation: newTicketDesignation,
          projectId: newTicketProjectId || undefined,
          tags: [] 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit ticket");

      // Upload any staged attachments straight to S3 now that the ticket has an id
      if (newTicketAttachFiles.length > 0) {
        setAttachmentUploadError("");
        const results = await Promise.allSettled(
          newTicketAttachFiles.map((file) => uploadAttachmentToS3(file, data.id, token))
        );
        const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        if (failed.length > 0) {
          setAttachmentUploadError(
            `Ticket ${data.ticketNumber || data.id} was created, but ${failed.length} attachment(s) failed to upload. You can add them from the ticket detail page.`
          );
        }
      }

      // Reset
      setNewTicketTitle("");
      setNewTicketDesc("");
      setNewTicketDept("");
      setNewTicketCategory("");
      setNewTicketSubDepartment("");
      setDeptSubDepartments([]);
      setNewTicketClient("");
      setNewTicketClientEmail("");
      setNewTicketClientRep("");
      setNewTicketClientEmpId("");
      setNewTicketSite("");
      setNewTicketState("");
      setNewTicketDesignation("");
      setNewTicketProjectId("");
      setNewTicketDateOccurred("");
      setNewTicketTags("");
      setNewTicketAttachFiles([]);

      // Navigate to detailed ticket view directly
      setSelectedTicketId(data.id);
      setCurrentView(PAGES.TICKET_DETAILS);
    } catch (err: any) {
      setError(err.message);
    }
  };


    return (
        <div className="max-w-3xl mx-auto space-y-6 font-sans">
              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
                <h1 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <FileText className="text-indigo-600" size={20} />
                  New Service Desk Ticket
                </h1>
                <p className="text-xs text-slate-500 mt-2">
                  Complete corporate details. Priority assignments are computed automatically on routing based on client account definitions and service parameters.
                </p>
              </div>

              <form onSubmit={handleSubmitTicket} className="bg-white border border-slate-200/80 rounded-2xl p-8 space-y-5 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                    <select
                      value={newTicketDept}
                      onChange={(e) => handleTicketDeptChange(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      required>
                      <option value="">-- Select Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>

                      ))}
                      
                    </select>
                  </div>

                  {newTicketDept && newTicketDept !== "OTHER" && deptSubDepartments.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Department</label>
                      <select
                        value={newTicketSubDepartment}
                        onChange={(e) => handleTicketSubDepartmentChange(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="">-- All / Not applicable --</option>
                        {deptSubDepartments.map(sd => (
                          <option key={sd.id} value={sd.id}>{sd.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Category </label>
                    <select
                      value={newTicketCategory}
                      onChange={(e) => setNewTicketCategory(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      disabled={!newTicketDept}
                    >
                      <option value="">-- Select Category --</option>
                      {deptCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      {newTicketDept && <option value="OTHER">Other</option>}
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Client Business/Company *</label>
                    <select
                      value={newTicketClient}
                      onChange={(e) => {
                        setNewTicketClient(e.target.value);
                        setNewTicketProjectId("");
                      }}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Client --</option>
                      {Array.isArray(clients) && clients.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Project</label>
                    <select
                      value={newTicketProjectId}
                      onChange={(e) => setNewTicketProjectId(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
                      disabled={!newTicketClient}
                    >
                      <option value="">-- Choose Project --</option>
                      {Array.isArray(clients) && clients
                        .find(c => c.name === newTicketClient)?.projects?.map(p => (
                          <option key={p.id} value={p.id}>{p.name}{p.isShutdownJob ? " (Shutdown Job)" : ""}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Client Authorized Email *</label>
                    <input
                      type="email"
                      placeholder="authorized@client.com"
                      value={newTicketClientEmail}
                      onChange={(e) => setNewTicketClientEmail(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Requester Designation *</label>
                    <select
                      value={newTicketDesignation}
                      onChange={(e) => setNewTicketDesignation(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Designation --</option>
                      <option value="CEO">CEO</option>
                      <option value="COO">COO</option>
                      <option value="CXO">CXO</option>
                      <option value="HOD">HOD</option>
                      <option value="EMPLOYEE">EMPLOYEE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Occurred (Date & Time) *</label>
                    <input
                      type="datetime-local"
                      value={newTicketDateOccurred}
                      onChange={(e) => setNewTicketDateOccurred(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Site / Physical location</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={newTicketSite}
                      onChange={(e) => setNewTicketSite(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                    <select
                      value={newTicketState}
                      onChange={(e) => setNewTicketState(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Indian State --</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                      <option value="Assam">Assam</option>
                      <option value="Bihar">Bihar</option>
                      <option value="Chhattisgarh">Chhattisgarh</option>
                      <option value="Goa">Goa</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Haryana">Haryana</option>
                      <option value="Himachal Pradesh">Himachal Pradesh</option>
                      <option value="Jharkhand">Jharkhand</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Manipur">Manipur</option>
                      <option value="Meghalaya">Meghalaya</option>
                      <option value="Mizoram">Mizoram</option>
                      <option value="Nagaland">Nagaland</option>
                      <option value="Odisha">Odisha</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Sikkim">Sikkim</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Tripura">Tripura</option>
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Uttarakhand">Uttarakhand</option>
                      <option value="West Bengal">West Bengal</option>
                      <option value="Andaman and Nicobar Islands">Andaman & Nicobar Islands</option>
                      <option value="Chandigarh">Chandigarh</option>
                      <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra & Nagar Haveli & Daman & Diu</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Jammu and Kashmir">Jammu & Kashmir</option>
                      <option value="Ladakh">Ladakh</option>
                      <option value="Lakshadweep">Lakshadweep</option>
                      <option value="Puducherry">Puducherry</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Subject / Title *</label>
                  <input
                    type="text"
                    placeholder="Short summary of the outage or issue"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Outage Narrative / Description</label>
                  <textarea
                    placeholder="Provide troubleshooting details, steps to reproduce, or notes."
                    value={newTicketDesc}
                    onChange={(e) => setNewTicketDesc(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    rows={4}
                  />
                </div>

               

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Attachments (Optional)</label>
                  <AttachmentUploader
                    token={token}
                    stagedFiles={newTicketAttachFiles}
                    onStagedFilesChange={setNewTicketAttachFiles}
                  />
                  {attachmentUploadError && (
                    <p className="mt-2 text-[11px] text-amber-600">{attachmentUploadError}</p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentView(PAGES.DASHBOARD)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Create and File Ticket
                  </button>
                </div>
              </form>
            </div>
    )
}
