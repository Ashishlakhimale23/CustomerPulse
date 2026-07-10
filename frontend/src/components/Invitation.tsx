import { useState } from "react";
import { Department, Invitation as InvitationType, SupportLevel,UserRole } from "../types";

export const InvitationComponent = ({
  setInviteDeptId,setError,setSuccess,token,inviteDeptId,fetchInvitations,invitations,departments,inviteCategoryIds, setInviteCategoryIds,inviteDeptCategories, setInviteDeptCategories} : {
    setInviteDeptId :React.Dispatch<React.SetStateAction<string>> ,
    setError :React.Dispatch<React.SetStateAction<string>> ,
    setSuccess :React.Dispatch<React.SetStateAction<string>> ,
    token : string,
    inviteDeptId :string ,
    fetchInvitations : () => Promise<void>,
    invitations : InvitationType[],
    departments : Department[]
    inviteCategoryIds : string[]
    setInviteCategoryIds: React.Dispatch<React.SetStateAction<string[]>>
    inviteDeptCategories: string[] 
    setInviteDeptCategories:React.Dispatch<React.SetStateAction<any[]>> 
}) => {
    
  const [inviteLevel, setInviteLevel] = useState<SupportLevel>(SupportLevel.L1);
  const [name,setName] = useState<string>("")
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.EMPLOYEE);

  const handleInviteDeptChange = async (deptId : string) => {
    setInviteDeptId(deptId);
    setInviteDeptCategories([]);
    
    try {
      const res = await fetch(`http://localhost:3000/departments/${deptId}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInviteDeptCategories(data);
      }
    } catch (err) {}
  }
 
  

  // Action: Invite someone
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {

      if(inviteCategoryIds.length <= 0){
        setError("Select atleast a single category")
        return
      }

      const res = await fetch("http://localhost:3000/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name : name,
          email: inviteEmail,
          role: inviteRole,
          departmentId: inviteDeptId || null,
          categoryIds: inviteCategoryIds,
          supportLevel: inviteLevel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invitation");

      setSuccess(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail("");
      setInviteCategoryIds([]);
      fetchInvitations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResendInvite = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/invitations/${id}/resend`, {
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
      const res = await fetch(`http://localhost:3000/invitations/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess("Invitation cancelled.");
        fetchInvitations();
      }
    } catch (err) {}
  };

    return (
        <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left panel list of invites */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white border border-zinc-200 p-6">
                    <h1 className="text-xl font-bold text-zinc-900">Collaboration Invites</h1>
                    <p className="text-sm text-zinc-500">Track and manage operator onboarding invitations.</p>
                  </div>

                  <div className="bg-white border border-zinc-200">
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
                          {invitations.map(i => (
                            <tr key={i.id} className="hover:bg-zinc-50">
                              <td className="px-4 py-3.5 font-mono font-medium">{i.email}</td>
                              <td className="px-4 py-3.5 font-mono text-teal-800 font-bold">{i.role}</td>
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-zinc-800">{i.department.name || <span className="text-zinc-400 italic">— No Department</span>}</div>
                                {i.categoryName && (
                                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{i.categoryName}</div>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`px-2 py-0.5 rounded-none text-[10px] font-bold ${
                                  i.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                                  i.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                }`}>
                                  {i.status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right space-x-1.5 flex">
                                {i.status === "PENDING" && (
                                  <>
                                    <button
                                      onClick={() => handleResendInvite(i.id)}
                                      className="text-[10px] font-mono border px-2 py-0.5 hover:bg-zinc-50 cursor-pointer"
                                    >
                                      Resend
                                    </button>
                                    <button
                                      onClick={() => handleCancelInvite(i.id)}
                                      className="text-[10px] font-mono text-red-600 border border-red-200 px-2 py-0.5 hover:bg-red-50 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Invite dispatch panel */}
                <div className="bg-white border border-zinc-200 p-6 h-fit">
                  <h3 className="text-sm font-semibold uppercase text-zinc-900 border-b pb-2 mb-4">Onboard Staff member</h3>

                  <form onSubmit={handleSendInvite} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">Name</label>
                      <input
                        type="text"
                        placeholder="joe doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs p-2.5 border border-zinc-300 bg-white focus:outline-none focus:border-zinc-500"
                        required
                      />
                    </div>
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

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">Operations Role Profile</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as UserRole)}
                        className="w-full text-xs p-2.5 border border-zinc-300 bg-white"
                        required
                      >
                        {Object.values(UserRole).map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">Assign Department</label>
                      <select
                        value={inviteDeptId}
                        onChange={(e) => handleInviteDeptChange(e.target.value)}
                        className="w-full text-xs p-2.5 border border-zinc-300 bg-white"
                      >
                        <option value="">-- Choose Department --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {inviteDeptId && (
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Assign Categories (Select multiple)</label>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 border border-zinc-300 bg-white">
                          {inviteDeptCategories.length === 0 ? (
                            <p className="text-[11px] text-zinc-400 italic">No categories found in this department.</p>
                          ) : (
                            inviteDeptCategories.map(c => {
                              const isChecked = inviteCategoryIds.includes(c.id);
                              return (
                                <label key={c.id} className="flex items-center space-x-2 text-xs text-zinc-700 cursor-pointer hover:bg-zinc-50 p-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setInviteCategoryIds([...inviteCategoryIds, c.id]);
                                      } else {
                                        setInviteCategoryIds(inviteCategoryIds.filter(id => id !== c.id));
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

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">Support Tier Level</label>
                      <select
                        value={inviteLevel}
                        onChange={(e) => setInviteLevel(e.target.value as SupportLevel)}
                        className="w-full text-xs p-2.5 border border-zinc-300 bg-white"
                      >
                        <option value="L1">L1</option>
                        <option value="L2">L2</option>
                        <option value="L3">L3</option>
                        <option value="L4">L4</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#032d26] hover:bg-[#021f1a] text-white text-xs font-semibold py-2.5 cursor-pointer text-center"
                    >
                      Issue Invitation
                    </button>
                  </form>
                </div>
              </div>
            </div>
    )
}