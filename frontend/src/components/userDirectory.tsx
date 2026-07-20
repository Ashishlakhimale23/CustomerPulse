import { useState } from "react";
import { UserRole,SupportLevel,User as UserType, Department} from "../types";
import { User} from "lucide-react";
export const UserDirectory = (
    {token,setError,setSuccess,fetchUsers,users,departments,user} : {
        user:UserType,
        setUser: React.Dispatch<React.SetStateAction<UserType | null>>
        token: string,
        setSuccess:  React.Dispatch<React.SetStateAction<string>>,
        fetchUsers : () => Promise<void>,
        users : UserType[],
        departments: Department[],
        setError : React.Dispatch<React.SetStateAction<string>>
    }
) => {


   // User details editor (drawer state)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserRole, setEditUserRole] = useState<UserRole>(UserRole.REQUESTER);
  const [editUserDept, setEditUserDept] = useState("");
  const [editUserSupportLevel, setEditUserSupportLevel] = useState<SupportLevel | "">("");
  const [editUserIsActive, setEditUserIsActive] = useState(true);
  const [editUserAvailability, setEditUserAvailability] = useState(true);
  const [editUserMaxTickets, setEditUserMaxTickets] = useState(15);


  const isAdmin = user ? ["GLOBAL_ADMIN"].includes(user.role) : false;


  const handleSaveUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/users/${editingUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          role: editUserRole,
          departmentId: editUserDept || null,
          supportLevel: editUserSupportLevel || null,
          isActive: editUserIsActive,
          isAvailableForAssignment: editUserAvailability,
          maxActiveTickets: editUserMaxTickets
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user details");

      setSuccess("User directory records updated.");
      setEditingUserId(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
   };
    
      // Action: Update user roles / department from Team Directory
  const handleOpenUserEditor = (u: UserType) => {
    setEditingUserId(u.id);
    setEditUserRole(u.role);
    setEditUserDept(u.departmentId || "");
    setEditUserSupportLevel(u.supportLevel || "");
    setEditUserIsActive(u.isActive);
    setEditUserAvailability(u.isAvailableForAssignment);
    setEditUserMaxTickets(u.maxActiveTickets);
  };


    return (
        <div className="space-y-6 font-sans">
              <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Directory</h1>
                <p className="text-sm text-slate-500 mt-1">Staff registry. Click an user record to configure role profiles and routing caps.</p>
              </div>

              <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5 text-left">User</th>
                        <th className="px-6 py-3.5 text-left">Email Address</th>
                        <th className="px-6 py-3.5 text-left">Role Profile</th>
                        <th className="px-6 py-3.5 text-left">Support Tier</th>
                        <th className="px-6 py-3.5 text-left">Active Status</th>
                        <th className="px-6 py-3.5 text-left">Assignment State</th>
                        <th className="px-6 py-3.5 text-left">Load count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {users.map(u => (
                        <tr
                          key={u.id}
                          onClick={() => isAdmin && handleOpenUserEditor(u)}
                          className={`hover:bg-slate-50/50 transition-colors ${isAdmin ? "cursor-pointer" : ""}`}
                        >
                          <td className="px-6 py-4 font-semibold text-slate-900">{u.fullName}</td>
                          <td className="px-6 py-4 font-mono text-slate-500">{u.email}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-800">{u.role}</td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-600">{u.supportLevel || "--"}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] border ${
                              u.isActive 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                : "bg-red-50 text-red-700 border-red-100"
                            }`}>
                              {u.isActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                            {u.isAvailableForAssignment ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                                Available
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">Not Available</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                            {u._count.ticketsAssigned || 0} / {u.maxActiveTickets || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Edit User drawer modal */}
              {editingUserId && (
                <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-6 z-50">
                  <div className="bg-white border border-slate-200 w-full max-w-lg p-6 rounded-2xl shadow-xl space-y-4">
                    <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                      <User size={18} className="text-indigo-600" />
                      Edit Operator Operations Profile
                    </h2>

                    <form onSubmit={handleSaveUserDetails} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Operations Role</label>
                          <select
                            value={editUserRole}
                            onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            {Object.values(UserRole).map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                          <select
                            value={editUserDept}
                            onChange={(e) => setEditUserDept(e.target.value)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">-- No Department --</option>
                            {departments.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Support Level</label>
                          <select
                            value={editUserSupportLevel}
                            onChange={(e) => setEditUserSupportLevel(e.target.value as SupportLevel)}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="">-- Unspecified --</option>
                            <option value="L1">L1 - Junior Frontline</option>
                            <option value="L2">L2 - Senior Support</option>
                            <option value="L3">L3 - Engineering Specialist</option>
                            <option value="L4">L4 - System Executive</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Max Active Cases</label>
                          <input
                            type="number"
                            value={editUserMaxTickets}
                            onChange={(e) => setEditUserMaxTickets(Number(e.target.value))}
                            className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            min={0}
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editUserIsActive}
                            onChange={(e) => setEditUserIsActive(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500/30"
                          />
                          <span>Operator is active (Unchecking locks login)</span>
                        </label>

                        <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editUserAvailability}
                            onChange={(e) => setEditUserAvailability(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500/30"
                          />
                          <span>Operator is on duty for auto routing</span>
                        </label>
                      </div>

                      <div className="flex gap-2 justify-between border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editingUserId) return;
                            try {
                              const res = await fetch("http://localhost:3000/manager-dashboard/set-manager", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ userId: editingUserId })
                              });
                              if (res.ok) {
                                setSuccess("User promoted to Department Manager");
                                setEditingUserId(null);
                                fetchUsers();
                              } else {
                                const err = await res.json();
                                setError(err.error || "Failed to set manager");
                              }
                            } catch {
                              setError("Failed to set manager");
                            }
                          }}
                          className="px-4 py-2 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                        >
                          Set as Manager
                        </button>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
    )
}
