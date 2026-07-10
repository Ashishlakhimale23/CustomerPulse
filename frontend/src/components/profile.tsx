import React from "react";
import { User } from "../types"

export const Profile = ({user,setUser,token,setSuccess}:{
    user:User,
    setUser: React.Dispatch<React.SetStateAction<User | null>>
    token: string,
    setSuccess:  React.Dispatch<React.SetStateAction<string>>
}) => {

    const handleProfileAvailabilityToggle = async (avail: boolean) => {
    try {
      const res = await fetch("http://localhost:3000/users/me/availability", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isAvailableForAssignment: avail })
      });
      if (res.ok) {
        const updated = await res.json();
        setUser(prev => prev ? { ...prev, isAvailableForAssignment: updated.isAvailableForAssignment } : null);
        setSuccess(`Availability updated to: ${updated.isAvailableForAssignment ? "Available" : "Away"}`);
      }
    } catch (err) {}
  };


    return (
          <div className="max-w-2xl mx-auto space-y-6 font-sans">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex justify-between items-center shadow-xs">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Profile Settings</h1>
                  <p className="text-sm text-slate-500 mt-1">Review active operator credentials and assignment states.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium mb-1">Full Name</span>
                    <strong className="text-sm text-slate-800">{user.fullName}</strong>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium mb-1">Email Address</span>
                    <strong className="text-sm text-slate-800 font-mono">{user?.email}</strong>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium mb-1">Operations Role</span>
                    <strong className="text-sm text-slate-800 font-mono">{user?.role}</strong>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block font-medium mb-1">Employee ID</span>
                    <strong className="text-sm text-slate-800 font-mono">{user?.employeeId || "Not defined"}</strong>
                  </div>
                </div>

                {/* Agent Assignment state toggle */}
                {["AGENT", "TEAM_LEAD", "MANAGER", "DEPT_MANAGER"].includes(user.role) && (
                  <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Support Assignment Status</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Toggle whether you can be automatically routed tickets based on skills.</p>
                    </div>
                    <button
                      onClick={() => handleProfileAvailabilityToggle(!user?.isAvailableForAssignment)}
                      className={`text-xs font-bold px-4 py-2 border rounded-lg cursor-pointer transition-all duration-150 shrink-0 ${
                        user?.isAvailableForAssignment
                          ? "bg-slate-900 hover:bg-slate-850 text-white border-slate-900 shadow-xs"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {user?.isAvailableForAssignment ? "ACTIVE: READY TO MATCH" : "OFF-DUTY: NO ASSIGNMENTS"}
                    </button>
                  </div>
                )}
              </div>
            </div>
    )
}
