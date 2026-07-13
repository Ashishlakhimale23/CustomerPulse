import { FileText } from "lucide-react"
import { useState } from "react";
import { Department, TicketCategory, Client, PAGES } from "../types";

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
  const [newTicketTags, setNewTicketTags] = useState<string>("");
  const [newTicketAttachName, setNewTicketAttachName] = useState("");
  const [newTicketAttachUrl, setNewTicketAttachUrl] = useState("");
  const [deptCategories, setDeptCategories] = useState<TicketCategory[]>([]);



// Handles department select when submitting ticket to trigger category fetching
  const handleTicketDeptChange = async (deptId: string) => {
    setNewTicketDept(deptId);
    setNewTicketCategory("");
    if (!deptId || deptId === "OTHER") {
      setDeptCategories([]);
      return;
    }
    try {
      const res = await fetch(`http://localhost:3000/departments/${deptId}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeptCategories(data);
      }
    } catch (err) {}
  };



    const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!newTicketDept || !newTicketTitle || !newTicketClient || !newTicketClientEmail || !newTicketSite || !newTicketState) {
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
          dateOfOccurance: new Date().toISOString(),
          site: newTicketSite,
          state: newTicketState,
          tags: [] 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit ticket");

      // Post attachment if provided
      if (newTicketAttachName.trim() && newTicketAttachUrl.trim()) {
        await fetch(`http://localhost:3000/tickets/${data.id}/attachments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ fileName: newTicketAttachName.trim(), fileUrl: newTicketAttachUrl.trim() })
        });
      }

      // Reset
      setNewTicketTitle("");
      setNewTicketDesc("");
      setNewTicketDept("");
      setNewTicketCategory("");
      setNewTicketClient("");
      setNewTicketClientEmail("");
      setNewTicketClientRep("");
      setNewTicketClientEmpId("");
      setNewTicketSite("");
      setNewTicketState("");
      setNewTicketTags("");
      setNewTicketAttachName("");
      setNewTicketAttachUrl("");

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
                      onChange={(e) => setNewTicketClient(e.target.value)}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Representative Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={newTicketClientRep}
                      onChange={(e) => setNewTicketClientRep(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Representative Employee ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="EMP02"
                      value={newTicketClientEmpId}
                      onChange={(e) => setNewTicketClientEmpId(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
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

               

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Attachment File Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. error_screenshot.png"
                      value={newTicketAttachName}
                      onChange={(e) => setNewTicketAttachName(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Attachment URL / Document Link (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://storage.company.com/files/error.png"
                      value={newTicketAttachUrl}
                      onChange={(e) => setNewTicketAttachUrl(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
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
