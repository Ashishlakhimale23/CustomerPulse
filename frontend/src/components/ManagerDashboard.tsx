import React, { useState, useEffect } from "react";
import {
  Users,
  Ticket,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  RotateCcw,
  X,
  Building2,
  ArrowUpCircle,
  PauseCircle,
} from "lucide-react";
import { DepartmentTeam, DepartmentTeamMember, Ticket as TicketType, Department, PAGES } from "../types";
import { AdvancedTicketFilters, FilterOption } from "./AdvancedTicketFilters";
import TicketsTable from "./TicketsTable";
import { Search } from "lucide-react";

interface ManagerDashboardProps {
  token: string;
  currentUser: { id: string; fullName: string; departmentId?: string; departments?: { id: string; name: string }[] };
  setSelectedTicketId: (id: string) => void;
  setCurrentView: (view: string) => void;
  departments: Department[];
  apiFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

interface managerDepartments{
  id : string,
  name : string,
}

const API_BASE = "http://localhost:3000";

const CARD_LABELS: Record<"active" | "resolved" | "breached" | "escalated" | "onHold", string> = {
  active: "Active",
  resolved: "Resolved",
  breached: "SLA Breached",
  escalated: "Escalated",
  onHold: "On Hold",
};

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  token,
  currentUser,
  setSelectedTicketId,
  setCurrentView,
  departments,
  apiFetch,
}) => {
  const requestFn = apiFetch || window.fetch;

  // Manager managed departments (could be from currentUser.departments or all departments if manager has cross-dept access)
  const [managedDepartments,setManagedDepartments] = useState<managerDepartments[]>([])

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    managedDepartments[0]?.id || currentUser.departmentId || ""
  );

  const [teamData, setTeamData] = useState<DepartmentTeam | null>(null);
  const [selectedUser, setSelectedUser] = useState<DepartmentTeamMember | null>(null);
  const [userTickets, setUserTickets] = useState<TicketType[]>([]);
  const [activeCard, setActiveCard] = useState<"active" | "resolved" | "breached" | "escalated" | "onHold" | null>(null);
  const [cardTickets, setCardTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [showReassign, setShowReassign] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ---- All Department Tickets: key/value filter search (HOD) ----
  // Same access as CXO: every ticket across whichever department(s) are
  // assigned to this HOD, plus tickets they personally raised. Backed by
  // the (fixed) GET /tickets scoping in ticket.controller.ts.
  const [showTicketSearch, setShowTicketSearch] = useState(false);
  const [allDeptTickets, setAllDeptTickets] = useState<TicketType[]>([]);
  const [filteredDeptTickets, setFilteredDeptTickets] = useState<TicketType[]>([]);
  const [allTicketsLoading, setAllTicketsLoading] = useState(false);
  const [allTicketsError, setAllTicketsError] = useState("");

  const fetchAllDeptTickets = async () => {
    setAllTicketsLoading(true);
    setAllTicketsError("");
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (selectedDeptId) params.set("departmentId", selectedDeptId);
      const res = await requestFn(`${API_BASE}/tickets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllDeptTickets(data.items || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setAllTicketsError(err.error || "Failed to load department tickets");
      }
    } catch {
      setAllTicketsError("Failed to load department tickets");
    } finally {
      setAllTicketsLoading(false);
    }
  };

  // Category options for the filter dropdown - derived from whatever
  // categories actually appear on the tickets this HOD can see, not a
  // separate master-list fetch.
  const categoryOptions: FilterOption[] = React.useMemo(() => {
    const map = new Map<string, string>();
    allDeptTickets.forEach((t) => {
      if (t.categoryId && t.category?.name) map.set(t.categoryId, t.category.name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [allDeptTickets]);




  const fetchManagerDepartments = async () => {

    try{
        const res = await fetch(`http://localhost:3000/users/manageddepartments/${currentUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setManagedDepartments(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load team data");
      }


    }catch(error){}
  }

  const fetchTeam = async (deptId?: string) => {
    setLoading(true);
    setError("");
    try {
      const targetDept = deptId || selectedDeptId;
      const url = targetDept
        ? `${API_BASE}/manager-dashboard/team?departmentId=${targetDept}`
        : `${API_BASE}/manager-dashboard/team`;

      const res = await requestFn(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeamData(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load team data");
      }
    } catch {
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTickets = async (userId: string) => {
    setTicketLoading(true);
    setShowReassign(null);
    setActiveCard(null);
    try {
      const res = await requestFn(`${API_BASE}/manager-dashboard/user/${userId}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserTickets(data.tickets || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load user tickets");
      }
    } catch {
      setError("Failed to load user tickets");
    } finally {
      setTicketLoading(false);
    }
  };

  const fetchCardTickets = async (filter: "active" | "resolved" | "breached" | "escalated" | "onHold") => {
    setTicketLoading(true);
    setShowReassign(null);
    setSelectedUser(null);
    setActiveCard(filter);
    try {
      const targetDept = selectedDeptId;
      const url = `${API_BASE}/manager-dashboard/tickets?filter=${filter}${
        targetDept ? `&departmentId=${targetDept}` : ""
      }`;
      const res = await requestFn(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCardTickets(data.tickets || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load tickets");
      }
    } catch {
      setError("Failed to load tickets");
    } finally {
      setTicketLoading(false);
    }
  };

  const handleReassign = async (ticketId: string) => {
    if (!reassignTarget) return;
    setError("");
    setSuccess("");
    try {
      const res = await requestFn(`${API_BASE}/manager-dashboard/reassign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticketId, newAssigneeId: reassignTarget }),
      });
      if (res.ok) {
        setSuccess("Ticket reassigned successfully");
        setShowReassign(null);
        setReassignTarget("");
        if (selectedUser) fetchUserTickets(selectedUser.id);
        if (activeCard) fetchCardTickets(activeCard);
        fetchTeam();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to reassign");
      }
    } catch {
      setError("Failed to reassign ticket");
    }
  };

  useEffect(() => {
    fetchTeam(selectedDeptId);
    fetchManagerDepartments()
  }, [selectedDeptId, token]);

  useEffect(() => {
    if (showTicketSearch) fetchAllDeptTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTicketSearch, selectedDeptId, token]);

  const totalTeamTickets = teamData?.users.reduce((sum, u) => sum + u.activeTickets, 0) || 0;
  const totalBreached = teamData?.users.reduce((sum, u) => sum + u.breachedTickets, 0) || 0;
  const totalResolved = teamData?.users.reduce((sum, u) => sum + u.resolvedTickets, 0) || 0;
  const totalEscalated = teamData?.users.reduce((sum, u) => sum + u.escalatedTickets, 0) || 0;
  const totalOnHold = teamData?.users.reduce((sum, u) => sum + u.onHoldTickets, 0) || 0;
  const displayedTickets = selectedUser ? userTickets : cardTickets;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Manager Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {teamData?.departmentName
                ? `Department: ${teamData.departmentName}`
                : "Select a department to view team metrics."}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Department Dropdown Selector for Managers managing multiple departments */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Building2 size={14} className="text-slate-500 shrink-0" />
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedUser(null);
                  setUserTickets([]);
                  setActiveCard(null);
                  setCardTickets([]);
                }}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">-- All Managed Departments --</option>
                {managedDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowTicketSearch((v) => !v)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all border shrink-0 ${
                showTicketSearch
                  ? "bg-slate-900 text-white border-slate-900"
                  : "text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50 bg-white"
              }`}
            >
              <Search size={14} /> All Department Tickets
            </button>

            <button
              onClick={() => fetchTeam(selectedDeptId)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 transition-all bg-white shrink-0"
            >
              <RotateCcw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 mt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">Team Members</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{teamData?.users.length || 0}</h2>
          </div>
          <button
            type="button"
            onClick={() => fetchCardTickets("active")}
            className={`text-left bg-slate-50 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 ${
              activeCard === "active" ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">Active Tickets</span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">{totalTeamTickets}</h2>
          </button>
          <button
            type="button"
            onClick={() => fetchCardTickets("resolved")}
            className={`text-left bg-slate-50 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 ${
              activeCard === "resolved" ? "border-emerald-600 ring-1 ring-emerald-600" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">Resolved</span>
            <h2 className="text-2xl font-extrabold text-emerald-600 mt-1">{totalResolved}</h2>
          </button>
          <button
            type="button"
            onClick={() => fetchCardTickets("onHold")}
            className={`text-left bg-slate-50 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 ${
              activeCard === "onHold" ? "border-orange-600 ring-1 ring-orange-600" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider flex items-center gap-1">
              <PauseCircle size={12} /> On Hold
            </span>
            <h2 className="text-2xl font-extrabold text-orange-600 mt-1">{totalOnHold}</h2>
          </button>
          <button
            type="button"
            onClick={() => fetchCardTickets("breached")}
            className={`text-left bg-slate-50 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 ${
              activeCard === "breached" ? "border-rose-600 ring-1 ring-rose-600" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">SLA Breached</span>
            <h2 className="text-2xl font-extrabold text-rose-600 mt-1">{totalBreached}</h2>
          </button>
          <button
            type="button"
            onClick={() => fetchCardTickets("escalated")}
            className={`text-left bg-slate-50 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-100 hover:border-slate-300 ${
              activeCard === "escalated" ? "border-amber-600 ring-1 ring-amber-600" : "border-slate-200"
            }`}
          >
            <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider flex items-center gap-1">
              <ArrowUpCircle size={12} /> Escalated
            </span>
            <h2 className="text-2xl font-extrabold text-amber-600 mt-1">{totalEscalated}</h2>
          </button>
        </div>
      </div>

      {showTicketSearch && (
        <div className="space-y-4">
          <AdvancedTicketFilters
            tickets={allDeptTickets}
            departments={managedDepartments}
            categories={categoryOptions}
            onFilteredTicketsChange={setFilteredDeptTickets}
            userRole="HOD"
            userDepartmentIds={managedDepartments.map((d) => d.id)}
            userId={currentUser.id}
          />
          {allTicketsError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2 rounded-xl">
              <AlertTriangle size={16} /> {allTicketsError}
            </div>
          )}
          {allTicketsLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-400">
              Loading department tickets...
            </div>
          ) : (
            <TicketsTable
              tickets={filteredDeptTickets}
              currentView={PAGES.HOD_DASHBOARD}
              setSelectedTicketId={setSelectedTicketId as any}
              setCurrentView={setCurrentView as any}
            />
          )}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2 rounded-xl">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 rounded-xl">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-400">
          Loading team data...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Users size={14} /> Team Members ({teamData?.users.length || 0})
                </h2>
              </div>
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {teamData?.users.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">No members found in this department.</div>
                ) : (
                  teamData?.users.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => {
                        setSelectedUser(member);
                        fetchUserTickets(member.id);
                      }}
                      className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${
                        selectedUser?.id === member.id ? "bg-indigo-50 border-l-4 border-l-indigo-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                            {member.fullName[0]}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{member.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{member.role}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-900">{member.activeTickets}</div>
                          <div className="text-[10px] text-slate-400">active</div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {member.openTickets} open
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={10} /> {member.inProgressTickets} in-progress
                        </span>
                        {member.onHoldTickets > 0 && (
                          <span className="flex items-center gap-1 text-orange-600 font-semibold">
                            <PauseCircle size={10} /> {member.onHoldTickets} on-hold
                          </span>
                        )}
                        {member.breachedTickets > 0 && (
                          <span className="flex items-center gap-1 text-rose-600 font-semibold">
                            <AlertTriangle size={10} /> {member.breachedTickets} breached
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Ticket size={14} />{" "}
                  {selectedUser
                    ? `${selectedUser.fullName}'s Tickets`
                    : activeCard
                      ? `${CARD_LABELS[activeCard]} Tickets`
                      : "Select a team member or a card above"}
                </h2>
                {(selectedUser || activeCard) && (
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setUserTickets([]);
                      setActiveCard(null);
                      setCardTickets([]);
                    }}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {ticketLoading ? (
                <div className="p-8 text-center text-sm text-slate-400">Loading tickets...</div>
              ) : !selectedUser && !activeCard ? (
                <div className="p-12 text-center text-sm text-slate-400 italic">
                  Select a team member from the left panel, or a card above, to view tickets
                </div>
              ) : displayedTickets.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400 italic">
                  No tickets found
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {displayedTickets.map((t) => (
                    <div key={t.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedTicketId(t.id);
                            setCurrentView(PAGES.TICKET_DETAILS);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-900 hover:underline">
                              {t.ticketNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border ${
                                t.status === "OPEN"
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : t.status === "IN_PROGRESS"
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                    : t.status === "ON_HOLD"
                                      ? "bg-orange-50 text-orange-700 border-orange-100"
                                      : t.status === "PENDING"
                                        ? "bg-amber-50 text-amber-700 border-amber-100"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-100"
                              }`}
                            >
                              {t.status}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold text-[10px] font-mono border ${
                                t.priority === "P1"
                                  ? "bg-red-50 text-red-800 border-red-200"
                                  : t.priority === "P2"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-900 mt-1">{t.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                            <span>Client: {t.clientName}</span>
                            <span>Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                            {t.slaBreached && (
                              <span className="text-rose-600 font-bold flex items-center gap-1">
                                <AlertTriangle size={10} /> SLA Breached
                              </span>
                            )}
                          </div>
                          {t.comments && t.comments.length > 0 && (
                            <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mb-1">
                                <MessageSquare size={10} /> Recent Comments
                              </div>
                              {t.comments.slice(0, 2).map((c) => (
                                <p key={c.id} className="text-[11px] text-slate-600 truncate">
                                  <span className="font-semibold text-slate-700">{c.user?.fullName || "User"}:</span>{" "}
                                  {c.commentText}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {showReassign === t.id ? (
                            <div className="space-y-2 w-48">
                              <select
                                value={reassignTarget}
                                onChange={(e) => setReassignTarget(e.target.value)}
                                className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white"
                              >
                                <option value="">Select agent...</option>
                                {teamData?.users
                                  .filter(
                                    (u) =>
                                      u.id !== t.assigneeId 
                                  )
                                  .map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.fullName} ({u.activeTickets} active)
                                    </option>
                                  ))}
                              </select>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleReassign(t.id)}
                                  disabled={!reassignTarget}
                                  className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setShowReassign(null)}
                                  className="text-[10px] border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowReassign(t.id);
                              }}
                              className="text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors whitespace-nowrap"
                            >
                              Reassign
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;

