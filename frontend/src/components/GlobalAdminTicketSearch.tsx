// Company-wide key/value filter search engine for tickets - GLOBAL_ADMIN.
//
// "Keys" are the fields a person can filter on: status, category,
// department, client, project, state, internal priority, date of
// occurrence, SLA deadline, and a custom date range. "Values" are
// whatever actually shows up in the tickets this person has access to.
//
// GLOBAL_ADMIN access: every ticket in the company, no department/agent
// scoping - see the (unscoped) GLOBAL_ADMIN branch of GET /tickets in
// ticket.controller.ts, and the matching GLOBAL_ADMIN branch in
// AdvancedTicketFilters. This mirrors the same "fetch once, filter
// client-side" pattern already used for HOD (ManagerDashboard.tsx) and
// CXO (CxoDashboard.tsx), just without a forced department/team scope.
import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, RotateCcw, Search } from "lucide-react";
import { Department, Ticket as TicketType, PAGES } from "../types";
import { AdvancedTicketFilters, FilterOption } from "./AdvancedTicketFilters";
import TicketsTable from "./TicketsTable";

interface GlobalAdminTicketSearchProps {
  token: string;
  currentUser: { id: string; fullName: string };
  setSelectedTicketId: (id: string) => void;
  setCurrentView: (view: string) => void;
  apiFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const API_BASE = "http://localhost:3000";

export const GlobalAdminTicketSearch: React.FC<GlobalAdminTicketSearchProps> = ({
  token,
  currentUser,
  setSelectedTicketId,
  setCurrentView,
  apiFetch,
}) => {
  const requestFn = apiFetch || window.fetch;

  const [allTickets, setAllTickets] = useState<TicketType[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // No departmentId param - GLOBAL_ADMIN's GET /tickets call is unscoped,
  // so this pulls every ticket in the company in one shot for client-side
  // filtering (same shape/limit as the HOD/CXO "All Tickets" search).
  const fetchAllTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await requestFn(`${API_BASE}/tickets?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllTickets(data.items || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load tickets");
      }
    } catch {
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  // The full company department list, for the department filter dropdown
  // - fetched here rather than relying on a parent that may not have
  // loaded it yet for this view.
  const fetchDepartments = async () => {
    try {
      const res = await requestFn(`${API_BASE}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data || []);
      }
    } catch {
      // Non-fatal - department filter options just fall back to "not yet loaded".
    }
  };

  useEffect(() => {
    fetchAllTickets();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Category options for the filter dropdown - derived from whatever
  // categories actually appear on the fetched tickets, not a separate
  // master-list fetch (same approach ManagerDashboard/CxoDashboard use).
  const categoryOptions: FilterOption[] = useMemo(() => {
    const map = new Map<string, string>();
    allTickets.forEach((t) => {
      if (t.categoryId && t.category?.name) map.set(t.categoryId, t.category.name);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [allTickets]);

  const departmentOptions: FilterOption[] = useMemo(
    () => departments.map((d) => ({ id: d.id, name: d.name })),
    [departments]
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-slate-900 text-white rounded-xl">
              <Search size={16} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">All Tickets</h1>
              <p className="text-sm text-slate-500 mt-1">
                Company-wide ticket search - every department, every client.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
              <Building2 size={14} className="text-slate-500 shrink-0" />
              {departments.length} department{departments.length === 1 ? "" : "s"}
            </div>
            <button
              onClick={fetchAllTickets}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 transition-all bg-white shrink-0"
            >
              <RotateCcw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <AdvancedTicketFilters
        tickets={allTickets}
        departments={departmentOptions}
        categories={categoryOptions}
        onFilteredTicketsChange={setFilteredTickets}
        userRole="GLOBAL_ADMIN"
        userId={currentUser.id}
      />

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2 rounded-xl">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-400">
          Loading tickets...
        </div>
      ) : (
        <TicketsTable
          tickets={filteredTickets}
          currentView={PAGES.GLOBAL_TICKET_SEARCH}
          setSelectedTicketId={setSelectedTicketId as any}
          setCurrentView={setCurrentView as any}
        />
      )}
    </div>
  );
};

export default GlobalAdminTicketSearch;
