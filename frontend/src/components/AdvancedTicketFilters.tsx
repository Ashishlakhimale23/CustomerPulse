// /home/workdir/artifacts/CustomerPulse-main/frontend/src/components/AdvancedTicketFilters.tsx
import React, { useState, useMemo, useEffect } from "react";
import { Ticket, TicketStatus, TicketPriority, Department, TicketCategory, UserRole } from "../types";
import { Filter, X, Calendar } from "lucide-react";

interface AdvancedTicketFiltersProps {
  tickets: Ticket[];
  departments: Department[];
  categories: TicketCategory[];
  onFilteredTicketsChange: (filtered: Ticket[]) => void;
  userRole: UserRole;
  userDepartmentIds?: string[];
  userId?: string; // for AGENT own/assigned scoping
}

export const AdvancedTicketFilters: React.FC<AdvancedTicketFiltersProps> = ({
  tickets,
  departments,
  categories,
  onFilteredTicketsChange,
  userRole,
  userDepartmentIds = [],
  userId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [slaBreachedFilter, setSlaBreachedFilter] = useState(false);

  // Dynamic options
  const availableStatuses = useMemo(() => [...new Set(tickets.map(t => t.status))].sort(), [tickets]);
  const availablePriorities = useMemo(() => [...new Set(tickets.map(t => t.priority))].sort(), [tickets]);
  const availableDepartments = useMemo(() => {
    const deptIds = new Set(tickets.map(t => t.departmentId));
    return departments.filter(d => deptIds.has(d.id));
  }, [tickets, departments]);
  const availableCategories = useMemo(() => {
    const catIds = new Set(tickets.map(t => t.categoryId).filter(Boolean));
    return categories.filter(c => catIds.has(c.id));
  }, [tickets, categories]);

  // Core filtering (role-aware)
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Text search
      const matchesSearch = !searchTerm || 
        [ticket.title, ticket.description, ticket.ticketNumber, ticket.clientName]
          .some(field => field?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = !statusFilter || ticket.status === statusFilter;
      const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
      const matchesCategory = !categoryFilter || ticket.categoryId === categoryFilter;

      // Department + Role scoping
      let matchesDept = true;
      if (departmentFilter) {
        matchesDept = ticket.departmentId === departmentFilter;
      } else if (["HOD", "CXO"].includes(userRole)) {
        matchesDept = userDepartmentIds.includes(ticket.departmentId || "");
      } else if (userRole === "AGENT" && userId) {
        matchesDept = ticket.assigneeId === userId || ticket.requesterId === userId;
      }

      // Date
      const ticketDate = new Date(ticket.createdAt);
      const matchesDate = (!dateFrom || ticketDate >= new Date(dateFrom)) && 
                         (!dateTo || ticketDate <= new Date(dateTo + "T23:59:59"));

      const matchesSla = !slaBreachedFilter || !!ticket.slaBreached;

      return matchesSearch && matchesStatus && matchesPriority && matchesDept && 
             matchesCategory && matchesDate && matchesSla;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, departmentFilter, categoryFilter, 
      dateFrom, dateTo, slaBreachedFilter, userRole, userDepartmentIds, userId]);

  useEffect(() => {
    onFilteredTicketsChange(filteredTickets);
  }, [filteredTickets, onFilteredTicketsChange]);

  const reset = () => {
    setSearchTerm(""); setStatusFilter(""); setPriorityFilter(""); 
    setDepartmentFilter(""); setCategoryFilter(""); setDateFrom(""); 
    setDateTo(""); setSlaBreachedFilter(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter size={18} />
          <span className="font-semibold">Advanced Ticket Search & Filters</span>
        </div>
        <button onClick={reset} className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1">
          <X size={14} /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="lg:col-span-2">
          <input 
            type="text" placeholder="Search title, #, client..." 
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-1"
          />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
          <option value="">All Status</option>
          {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
          <option value="">All Priority</option>
          {availablePriorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
          <option value="">All Depts</option>
          {availableDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl bg-white">
          <option value="">All Categories</option>
          {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" />
        </div>
        <div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl" />
        </div>

        <label className="flex items-center gap-2 col-span-full md:col-span-1 pt-2">
          <input type="checkbox" checked={slaBreachedFilter} onChange={e => setSlaBreachedFilter(e.target.checked)} className="rounded" />
          <span>SLA Breached</span>
        </label>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        {filteredTickets.length} results • {tickets.length} total
      </div>
    </div>
  );
};
