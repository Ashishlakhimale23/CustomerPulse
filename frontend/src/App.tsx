import React, { useState, useEffect } from "react";
import {
  Activity,
  Users,
  CheckCircle,
  Clock,
  Lock,
  Plus,
  Edit,
  Trash2,
  Layers,
  ShieldAlert,
  Search,
  Building,
  Briefcase,
  Filter,
  Database,
  Inbox,
  TrendingUp,
  LogOut,
  Key,
  FileText,
  Mail,
  User,
  Tag,
  AlertTriangle,
  Settings,
  Menu,
  ChevronDown,
  ArrowLeft,
  RefreshCw,
  Eye,
  Ticket
} from "lucide-react";

import {
  User as UserType,
  UserRole,
  Ticket as TicketType,
  Department,
  TicketCategory,
  Keyword,
  KeywordSuggestion,
  Invitation,
  AuditLog,
  Client,
  TicketStatus,
  TicketPriority,
  SupportLevel,
  DepartmentSuggestions
} from "./types";

import ClientManagement from "./components/ClientManagement";
import TicketDetail from "./components/TicketDetail";
import { TicketForm } from "./components/TicketForm";
import { Profile } from "./components/profile";
import { UserDirectory } from "./components/userDirectory";
import { InvitationComponent } from "./components/invitation";
import { Dashboard } from "./components/Dashboard";
import TicketsTable from "./components/TicketsTable"
import ManagerDashboard from "./components/ManagerDashboard"

export const SanghviLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="20" stroke="#E21D24" strokeWidth="12" fill="none" />
    <path 
      d="M50 20 C64 32, 57 44, 50 48 C43 52, 36 64, 50 80 C36 68, 43 56, 50 52 C57 48, 64 36, 50 20 Z" 
      fill="#E21D24" 
    />
  </svg>
);
interface metric {
        openTickets : number
        assignedTickets : number,
        slaBreachedTickets : number,
        resolvedTickets : number,
        totalSubmissions : number,
}


export default function App() {
  // Session State
  const [user, setUser] = useState<UserType | null>(null);
  const [token, setToken] = useState<string>("");
  const [company, setCompany] = useState<any>(null);

  // Auth Forms State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmployeeId, setSignupEmployeeId] = useState("");
  const [signupMode, setSignupMode] = useState(false);

  // Accept Invite State
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");

  const [inviteCategoryIds, setInviteCategoryIds] = useState<string[]>([]);
  const [inviteDeptCategories, setInviteDeptCategories] = useState<any[]>([]);

  // Navigation State
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");

  // Data Lists State
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [allTicketsForMetrics, setAllTicketsForMetrics] = useState<TicketType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // suggestions data 
  const [deparmentSuggestions,setDepartmentSuggestion] = useState<DepartmentSuggestions[]>([])

  // Filtering / Search States for Queues
  const [ticketSearch, setTicketSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterSlaBreachedOnly, setFilterSlaBreachedOnly] = useState(false);

  // Add Department Dialog state
  const [showAddDeptDialog, setShowAddDeptDialog] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDescription, setNewDeptDescription] = useState("");

  // Department Config state
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [deptCategoriesList, setDeptCategoriesList] = useState<TicketCategory[]>([]);
  const [deptKeywordsList, setDeptKeywordsList] = useState<Keyword[]>([]);
  const [deptSuggestionsList, setDeptSuggestionsList] = useState<KeywordSuggestion[]>([]);

  // Category and Keyword Creator states
  const [newCatName, setNewCatName] = useState("");
  const [newCatSla, setNewCatSla] = useState("24");
  const [newCatPriority, setNewCatPriority] = useState<TicketPriority>(TicketPriority.P3);
  const [newCatLevel, setNewCatLevel] = useState<SupportLevel>(SupportLevel.L1);

  const [newKwName, setNewKwName] = useState("");
  const [newKwSynonyms, setNewKwSynonyms] = useState("");

  // Invite Form State
  
  const [inviteDeptId, setInviteDeptId] = useState("");

  // General Notification state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Developer Tool stats
  const [devLogs, setDevLogs] = useState("");
    const [metric,setMetric] = useState<metric | null>(null)

  // Mytickets
  const [mytickets,setMytickets] = useState<TicketType[]>([])
  const [assigned,setAssigned] = useState<TicketType[]>([])
  const [breached,setBreached] = useState<TicketType[]>([])

  // Status filter shared by the My Tickets / Personal Workload / SLA Breached pages
  const [personalStatusFilter, setPersonalStatusFilter] = useState("");

  // Role based check short hands
  const isStaff = user ? ["CEO", "CTO", "CFO", "COO", "GLOBAL_ADMIN", "DEPT_ADMIN", "MANAGER", "DEPT_MANAGER", "TEAM_LEAD", "AGENT"].includes(user.role) : false;
  const isAdmin = user ? ["GLOBAL_ADMIN", "DEPT_ADMIN", "MANAGER", "DEPT_MANAGER"].includes(user.role) : false;
  const isGlobalAdmin = user ? user.role === "GLOBAL_ADMIN" : false;
  const isManager = user ? ["MANAGER", "DEPT_MANAGER"].includes(user.role) : false;

  // Initialize and check token
  useEffect(() => {
    // Check if invitation token in URL query
    const params = new URLSearchParams(window.location.search);
    const tok = params.get("token");
    if (tok) {
      setInviteToken(tok);
    }

    const savedToken = localStorage.getItem("service_now_token");
    const savedUser = localStorage.getItem("service_now_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch company info when logged in
  useEffect(() => {
    if (token) {
      fetch("/api/companies/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setCompany(data))
        .catch(() => {});
    }
  }, [token]);

  // Load screen data based on view
  useEffect(() => {
    if (!token) return;
    if (currentView === "dashboard") {
      if (user?.role == UserRole.GLOBAL_ADMIN){
        fetchTickets();
      }
      fetchDepartments();
    } else if (currentView === "tickets") {
      fetchTickets();
      fetchDepartments();
      fetchClients()
    } else if (currentView === "users") {
      fetchUsers();
      fetchDepartments();
    } else if (currentView === "invitations") {
      fetchInvitations();
      fetchDepartments();
    } else if (currentView === "departments") {
      fetchDepartments();
    } else if (currentView === "clients") {
      // Handled inside ClientManagement
    } else if (currentView === "audit-logs") {
      fetchAuditLogs();
    } else if (currentView === "new-ticket") {
      fetchDepartments();
      fetchClients();
    } else if (currentView == "mytickets"){
      fetchMytickets()
    } else if (currentView == "assignedtickets"){
      fetchAssignedTickets()
    } else if (currentView == "breachedtickets"){
      fetchbreachedTickets()
    }

    fetchMetrics()
  }, [currentView, filterDept, filterStatus, filterPriority, filterAssignee, filterSlaBreachedOnly, token]);

  // Load department categories for invitations
  useEffect(() => {
    if (!token || !inviteDeptId) {
      setInviteDeptCategories([]);
      setInviteCategoryIds([]);
      return;
    }
    fetch(`http://localhost:3000/departments/${inviteDeptId}/categories`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (res.ok) return res.json();
        return [];
      })
      .then(data => {
        setInviteDeptCategories(data);
        setInviteCategoryIds([]);
      })
      .catch(() => {
        setInviteDeptCategories([]);
        setInviteCategoryIds([]);
      });
  }, [inviteDeptId, token]);

  const fetchTickets = async () => {
    try {
      let deptId = filterDept;
      if (isStaff && !isAdmin && user?.departmentId) {
        deptId = user.departmentId;
      }

      const params = new URLSearchParams();
      if (deptId) params.set("departmentId", deptId);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterAssignee) params.set("assigneeId", filterAssignee);
      if (filterSlaBreachedOnly) params.set("slaBreached", "true");

      const qs = params.toString();
      let url = `http://localhost:3000/tickets${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.items);
      }
      
    } catch (err) {}
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch("http://localhost:3000/departments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {}

  };

  const fetchMytickets = async () => {
     try {
      const res = await fetch(`http://localhost:3000/tickets/mytickets/${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMytickets(data)
      }
    } catch (err) {}
    

  }

  const fetchAssignedTickets= async () => {
     try {
      const res = await fetch(`http://localhost:3000/tickets/assigned/${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssigned(data)
      }
    } catch (err) {}
    

  }

  const fetchbreachedTickets = async () => {
     try {
      const res = await fetch(`http://localhost:3000/tickets/breached/${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBreached(data)
      }
    } catch (err) {}
    

  }

  const fetchUsers = async () => {
    try {
      const res = await fetch(`http://localhost:3000/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {}
  };

  const fetchInvitations = async () => {
    try {
      const res = await fetch("http://localhost:3000/invitations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch (err) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch("http://localhost:3000/audit-logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {}
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("http://localhost:3000/clients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data.data);
      }
    } catch (err) {}
  };

      const fetchMetrics = async () => {
        try {
            const res = await fetch(`http://localhost:3000/users/metric/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMetric(data.data)
            }
        } catch (err) { }
    };


  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("service_now_token", data.token);
      localStorage.setItem("service_now_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setCurrentView("dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Signup handler
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          fullName: signupFullName,
          employeeId: signupEmployeeId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      localStorage.setItem("service_now_token", data.token);
      localStorage.setItem("service_now_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setCurrentView("dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Accept Invite Handler
  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (invitePassword !== invitePasswordConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: inviteToken,
          fullName: inviteFullName,
          password: invitePassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to accept invitation");

      localStorage.setItem("service_now_token", data.token);
      localStorage.setItem("service_now_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setInviteToken(null);
      setCurrentView("dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("service_now_token");
    localStorage.removeItem("service_now_user");
    setUser(null);
    setToken("");
    setCompany(null);
    setCurrentView("dashboard");
  };

  

  // Action: Fetch Department specifics (Categories & Keywords)
  const handleSelectDeptConfig = async (deptId: string) => {
    setSelectedDeptId(deptId);
    try {
      // 1. Fetch categories
      const catRes = await fetch(`http://localhost:3000/departments/${deptId}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (catRes.ok) {
        const catData = await catRes.json();
        setDeptCategoriesList(catData);
      }

      // 2. Fetch keywords
      const kwRes = await fetch(`http://localhost:3000/keywords?departmentId=${deptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (kwRes.ok) {
        const kwData = await kwRes.json();
        setDeptKeywordsList(kwData);
      }

      // 3. Fetch aggregated keyword suggestions
      const sugRes = await fetch(`http://localhost:3000/keywords/departments/${deptId}/suggestions?status=PENDING`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (sugRes.ok) {
        const sugData = await sugRes.json();
        setDeptSuggestionsList(sugData);
      }
    } catch (err) {}
  };

  // Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;
    try {
      const res = await fetch("http://localhost:3000/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newDeptName,
          description: newDeptDescription || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create department");

      setNewDeptName("");
      setNewDeptDescription("");
      setShowAddDeptDialog(false);
      fetchDepartments();
      setSuccess("Department created.");
    } catch (err: any) {
      setError(err.message || "Failed to create department");
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const res = await fetch(`http://localhost:3000/departments/${selectedDeptId}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCatName,
          defaultSlaHours: Number(newCatSla),
          defaultPriority: newCatPriority,
          minSupportLevel: newCatLevel
        })
      });
      if (res.ok) {
        setNewCatName("");
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Category added to Department.");
      }
    } catch (err) {}
  };

  // Delete Category
  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`http://localhost:3000/categories/${catId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Category deleted.");
      }
    } catch (err) {}
  };

  

  // Create Keyword
  const handleCreateKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKwName) return;
    try {
      const res = await fetch("http://localhost:3000/keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: selectedDeptId,
          name: newKwName,
          synonyms: newKwSynonyms
        })
      });
      if (res.ok) {
        setNewKwName("");
        setNewKwSynonyms("");
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Knowledge Base Keyword defined.");
      }
    } catch (err) {}
  };

  // Delete Keyword
  const handleDeleteKeyword = async (kwId: string) => {
    if (!confirm("Are you sure you want to delete this keyword?")) return;
    try {
      const res = await fetch(`http://localhost:3000/keywords/${kwId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Keyword removed.");
      }
    } catch (err) {}
  };

  // Promote Suggestion
  const handlePromoteSuggestion = async (sugId: string, term: string) => {
    const synonymsInput = prompt(`Promote suggestion '${term}' to Real Keyword. Add synonyms separated by commas if any:`, "");
    if (synonymsInput === null) return; // cancelled
    try {
      const res = await fetch(`http://localhost:3000/keywords/suggestions/${sugId}/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: term, synonyms: synonymsInput })
      });
      if (res.ok) {
        handleSelectDeptConfig(selectedDeptId);
        setSuccess(`Keyword suggested '${term}' promoted to active index.`);
      }
    } catch (err) {}
  };

  // Reject Suggestion
  const handleRejectSuggestion = async (sugId: string) => {
    try {
      const res = await fetch(`http://localhost:3000/keywords/suggestions/${sugId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Suggestion dismissed.");
      }
    } catch (err) {}
  };


  // Filtered tickets lists for Dashboard indicators
  const myAssignedTickets = allTicketsForMetrics.filter(t => 
    t.assigneeId === user?.id && 
    (!isStaff || !user?.departmentId || t.departmentId === user.departmentId)
  );
  const openIncidentCount = allTicketsForMetrics.filter(t => 
    !["RESOLVED", "CLOSED"].includes(t.status) && 
    (!isStaff || !user?.departmentId || t.departmentId === user.departmentId)
  ).length;
  const slaBreachedCount = allTicketsForMetrics.filter(t => 
    t.slaBreached && 
    !["RESOLVED", "CLOSED"].includes(t.status) && 
    (!isStaff || !user?.departmentId || t.departmentId === user.departmentId)
  ).length;

  // ====================== PUBLIC UNAUTHENTICATED SCENE ======================

  if (!token) {
    // 1. Accept Invitation Form
    if (inviteToken) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
          <div className="w-full max-w-md bg-white border border-slate-200 shadow-md rounded-2xl p-8">
            <div className="text-center mb-6">
              <span className="inline-flex p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl mb-3">
                <Mail size={24} />
              </span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Accept Invitation</h1>
              <p className="text-xs text-slate-500 mt-1">Configure your corporate profile to join the Helpdesk operations hub.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 rounded-lg">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleAcceptInvite} className="space-y-4">
             

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
              >
                {loading ? "Activating Profile..." : "Activate Account & Login"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setInviteToken(null)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
              >
                Go back to login screen
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. Main Login / Public Requester Signup
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-md rounded-2xl p-8">
          <div className="text-center mb-6">
            <span className="inline-flex p-3 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl mb-3">
              <img src={"../assets/logo.jpg"} className="w-12 h-12" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sml Operations</h1>
            <p className="text-xs text-slate-500 mt-1">
              {signupMode
                ? "Self-register as a Requester to issue, view, and track corporate support tickets."
                : "Internal operations dashboard login page."}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 rounded-lg">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

           
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email</label>
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
              >
                {loading ? "Signing in..." : "Login to Operations Hub"}
              </button>

              <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSignupMode(true)}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline"
                >
                  Register new Requester account
                </button>
                <span className="text-zinc-400 text-[10px]">
                  Staff & Agents must be registered via admin email invitations.
                </span>
              </div>
            </form>
          

          
        </div>
      </div>
    )
  }

  // ====================== AUTHENTICATED SYSTEM SHELL ======================

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 selection:bg-slate-200 selection:text-slate-900">
      {/* Top Navigation Banner */}
      <header className="bg-white text-slate-900 h-14 flex items-center justify-between px-6 shrink-0 border-b border-slate-200 shadow-xs select-none">
        <div className="flex items-center gap-3">
          <img src={"../assets/logo.jpg"} className="w-10 h-10" />
          <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            SML Operations
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-900">{user.fullName}</div>
            <div className="text-[10px] text-slate-500 font-mono tracking-wider flex items-center justify-end gap-1.5 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {user.role}
            </div>
          </div>

          <span className="text-slate-300">|</span>

          {/* Profile link */}
          <button
            onClick={() => setCurrentView("profile")}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
          >
            My Profile
          </button>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-all"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Body: Sidebar + Content panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side Corporate Sidebar navigation */}
        <nav className="w-64 bg-white text-slate-600 flex flex-col border-r border-slate-200 select-none shrink-0 font-sans text-xs">
          <div className="p-4 uppercase text-[10px] font-semibold text-slate-400 tracking-wider border-b border-slate-200">
            Operations Navigation
          </div>

          <div className="flex-1 py-2 space-y-0.5 overflow-y-auto">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                currentView === "dashboard" ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
              }`}
            >
              <Activity size={15} />
              <span>Service Dashboard</span>
            </button>

            {isAdmin ? (
              <button
                onClick={() => {
                  setCurrentView("tickets");
                }}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === "tickets" ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Inbox size={15} />
                <span>All Tickets / Queue</span>
              </button>
            ) : null }

            {isManager ? (
              <button
                onClick={() => setCurrentView("manager-dashboard")}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === "manager-dashboard" ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Users size={15} />
                <span>Manager Dashboard</span>
              </button>
            ) : null }

            {/* Staff / Agent Directory */}
            {isGlobalAdmin && (
              <button
                onClick={() => setCurrentView("users")}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === "users" ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Users size={15} />
                <span>Users Directory</span>
              </button>
            )}

            {/* Admin invitations list */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView("invitations")}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === "invitations" ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Mail size={15} />
                <span>Pending Invites</span>
              </button>
            )}

            {/* Department SLA / Priority config */}
            {isAdmin && (
              <button
                onClick={() => {
                  setCurrentView("departments");
                  setSelectedDeptId("");
                }}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === "departments" ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Layers size={15} />
                <span>Departments</span>
              </button>
            )}

            {/* Clients Management (Global Admin only) */}
            {isGlobalAdmin && (
              <button
                onClick={() => setCurrentView("clients")}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === "clients" ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Settings size={15} />
                <span>Clients Database</span>
              </button>
            )}

            {/* System Audit logs */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView("audit-logs")}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === "audit-logs" ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Database size={15} />
                <span>System Audit Logs</span>
              </button>
            )}
          </div>

          
        </nav>

        {/* Central Operations Viewport container */}
        <main className="flex-1 p-8 overflow-y-auto">
          {error && currentView !== "ticket-detail" && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          {success && currentView !== "ticket-detail" && (
            <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          {/* VIEW: DASHBOARD */}
          {currentView === "dashboard" && (
            <Dashboard
            token={token}
            setCurrentView={setCurrentView}
            user={user}
            setSelectedTicketId={setSelectedTicketId}
            metric={metric!}
            />
           
          )}

          {/* VIEW: MANAGER DASHBOARD */}
          {currentView === "manager-dashboard" && (
            <ManagerDashboard
              token={token}
              currentUser={user!}
              setSelectedTicketId={setSelectedTicketId}
              setCurrentView={setCurrentView}
            />
          )}

          {/* VIEW: TICKETS LIST / QUEUE */}
          {currentView === "tickets" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 shadow-xs rounded-2xl p-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tickets Registry</h1>
                  <p className="text-sm text-slate-500">Service desk ticket records repository.</p>
                </div>
                <button
                  onClick={() => setCurrentView("new-ticket")}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 cursor-pointer flex items-center gap-2 rounded-lg transition-all shadow-xs"
                >
                  <Plus size={16} /> Submit Ticket
                </button>
              </div>

              

              {/* Filters bar */}
              <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                  <Filter size={14} />
                  Filters
                </div>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="text-xs p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING">Pending</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                {(filterDept || filterStatus) && (
                  <button
                    onClick={() => { setFilterDept(""); setFilterStatus(""); }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* Registry Table List */}
              <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                {tickets.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm italic">
                    No ticket records matching current query parameters.
                  </div>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200/60 text-xs">
                        <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-3.5 text-left">Ticket ID</th>
                            <th className="px-6 py-3.5 text-left">Ticket Title</th>
                            <th className="px-6 py-3.5 text-left">Client Account</th>
                            <th className="px-6 py-3.5 text-left">Department</th>
                            <th className="px-6 py-3.5 text-left">State</th>
                            <th className="px-6 py-3.5 text-left">Priority</th>
                            <th className="px-6 py-3.5 text-left">Assigned Agent</th>
                            <th className="px-6 py-3.5 text-left">SLA Countdown</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {tickets.map(t => (
                            <tr
                              key={t.id}
                              onClick={() => {
                                setSelectedTicketId(t.id);
                                setCurrentView("ticket-detail");
                              }}
                              className="hover:bg-slate-50/50 cursor-pointer transition-colors duration-150"
                            >
                              <td className="px-6 py-4 font-mono font-bold text-slate-900 hover:underline">{t.ticketNumber}</td>
                              <td className="px-6 py-4 font-semibold text-slate-900">{t.title}</td>
                              <td className="px-6 py-4 text-slate-500 font-medium">{t.clientName}</td>
                              <td className="px-6 py-4 font-medium">{t.department?.name || "General"}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] border ${
                                  t.status === "OPEN" ? "bg-blue-50 text-blue-700 border-blue-100" :
                                  t.status === "IN_PROGRESS" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                  t.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                  t.status === "RESOLVED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded font-bold border font-mono text-[10px] ${
                                  t.priority === "P1" ? "bg-red-50 text-red-800 border-red-200" :
                                  t.priority === "P2" ? "bg-amber-50 text-amber-800 border-amber-200" :
                                  t.priority === "P3" ? "bg-indigo-50 text-indigo-800 border-indigo-200" : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}>
                                  {t.priority}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-800">
                                {t.assignee?.fullName || <span className="text-slate-400 italic">Unassigned</span>}
                              </td>
                              <td className="px-6 py-4 font-mono text-slate-500">
                                {t.slaBreached ? (
                                  <span className="text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded font-bold">BREACHED</span>
                                ) : (
                                  new Date(t.slaDeadline || "").toLocaleDateString()
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: CREATE TICKET (FORM) */}
          {currentView === "new-ticket" && (
            <TicketForm
            setSelectedTicketId={setSelectedTicketId}
            setCurrentView={setCurrentView}
            setError={setError}
            setSuccess={setSuccess}
            token={token}
            clients={clients}
            departments={departments}
            />
          )
          }

          {/* VIEW: TICKET DETAIL (COMPLEX TABS) */}
          {currentView === "ticket-detail" && (
            <TicketDetail
              ticketId={selectedTicketId}
              token={token}
              currentUser={user}
              metric={metric!}
              onBack={() => setCurrentView("tickets")}
            />
          )}

          {/* VIEW: PROFILE */}
          {currentView === "profile" && (
            <Profile
            token={token}
            setSuccess={setSuccess}
            setUser={setUser}
            user={user!}
            />
          )
          }

          {/* VIEW: USERS DIRECTORY */}
          {currentView === "users" && isGlobalAdmin && (
            <UserDirectory
            setError={setError}
            setSuccess={setSuccess}
            setUser={setUser}
            user={user!}
            users={users}
            departments={departments}
            fetchUsers={fetchUsers}
            token={token}
            /> 
          )}

          {/* VIEW: INVITATIONS */}
          {currentView === "invitations" && (
            <InvitationComponent
            setError={setError}
            setInviteDeptId={setInviteDeptId}
            setInviteCategoryIds={setInviteCategoryIds}
            setInviteDeptCategories={setInviteDeptCategories}
            inviteCategoryIds={inviteCategoryIds}
            inviteDeptCategories={inviteDeptCategories}
            setSuccess={setSuccess}
            invitations={invitations}
            departments={departments}
            inviteDeptId={inviteDeptId}
            token={token}
            fetchInvitations={fetchInvitations}
            /> 
            
          )}

          {
            currentView === "mytickets" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => { setPersonalStatusFilter(""); setCurrentView("dashboard"); }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back to Dashboard
                  </button>
                  <select
                    value={personalStatusFilter}
                    onChange={(e) => setPersonalStatusFilter(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING">Pending</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
                <TicketsTable
                  tickets={personalStatusFilter ? mytickets.filter(t => t.status === personalStatusFilter) : mytickets}
                  setCurrentView={setCurrentView}
                  setSelectedTicketId={setSelectedTicketId}
                />
              </div>
            )
          
          }

          {
            currentView === "assignedtickets" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => { setPersonalStatusFilter(""); setCurrentView("dashboard"); }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back to Dashboard
                  </button>
                  <select
                    value={personalStatusFilter}
                    onChange={(e) => setPersonalStatusFilter(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING">Pending</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
                <TicketsTable
                  tickets={personalStatusFilter ? assigned.filter(t => t.status === personalStatusFilter) : assigned}
                  setCurrentView={setCurrentView}
                  setSelectedTicketId={setSelectedTicketId}
                />
              </div>
            )
          
          }

          {
            currentView === "breachedtickets" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => { setPersonalStatusFilter(""); setCurrentView("dashboard"); }}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back to Dashboard
                  </button>
                  <select
                    value={personalStatusFilter}
                    onChange={(e) => setPersonalStatusFilter(e.target.value)}
                    className="text-xs p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PENDING">Pending</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
                <TicketsTable
                  tickets={personalStatusFilter ? breached.filter(t => t.status === personalStatusFilter) : breached}
                  setCurrentView={setCurrentView}
                  setSelectedTicketId={setSelectedTicketId}
                />
              </div>
            )
          
          }

          {/* VIEW: DEPARTMENTS & SLA POLICY */}
          {currentView === "departments" && (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-200 p-6 flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-zinc-900">Departments SLA & Knowledge Index</h1>
                  <p className="text-sm text-zinc-500 mt-1">Configure service parameters, categories, and tags.</p>
                </div>
                <button
                  onClick={() => setShowAddDeptDialog(true)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 cursor-pointer flex items-center gap-2 rounded-lg transition-all"
                >
                  <Plus size={16} /> Add Department
                </button>
              </div>

              {/* Add Department Dialog */}
              {showAddDeptDialog && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-zinc-900">Add Department</h2>
                      <button
                        onClick={() => setShowAddDeptDialog(false)}
                        className="text-zinc-400 hover:text-zinc-700 text-xl leading-none cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                    <form onSubmit={handleCreateDepartment} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">Department Name</label>
                        <input
                          type="text"
                          placeholder="e.g. IT Support"
                          value={newDeptName}
                          onChange={(e) => setNewDeptName(e.target.value)}
                          className="w-full text-sm p-2.5 border border-zinc-200 rounded-lg bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">Description</label>
                        <textarea
                          placeholder="Optional description"
                          value={newDeptDescription}
                          onChange={(e) => setNewDeptDescription(e.target.value)}
                          className="w-full text-sm p-2.5 border border-zinc-200 rounded-lg bg-white"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowAddDeptDialog(false)}
                          className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 px-4 py-2.5 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer"
                        >
                          Save Department
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Department selectors card grid */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase font-mono font-bold text-zinc-500 tracking-wider">Select Department</h3>
                  {departments.map(d => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDeptConfig(d.id)}
                      className={`p-4 border cursor-pointer select-none ${
                        selectedDeptId === d.id ? "bg-white border-[#30b380] shadow-xs" : "bg-white border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="text-[10px] font-mono text-zinc-400 block uppercase font-bold">Scope ID: {d.id}</span>
                      <h4 className="text-sm font-semibold text-zinc-950 mt-1">{d.name}</h4>
                      <p className="text-xs text-zinc-500 mt-1">{d.description}</p>
                      <div className="flex gap-4 mt-3 pt-2.5 border-t border-zinc-100 text-[10px] font-mono text-zinc-400">
                        <span>Staff: {d.userCount || 0}</span>
                        <span>Tickets logged: {d.ticketCount || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Config panel detail for categories/keywords */}
                <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 h-fit">
                  {selectedDeptId ? (
                    <div className="space-y-8">
                      {/* Sub-Section: Categories */}
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 border-b pb-2 mb-4 flex justify-between items-center">
                          <span>Department Categories & SLA Configurations</span>
                        </h3>

                        {/* inline category creator */}
                        <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-50 p-3 border border-zinc-200 mb-4">
                          <input
                            type="text"
                            placeholder="Category Name"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                            required
                          />
                          <input
                            type="number"
                            placeholder="SLA Hours (e.g. 24)"
                            value={newCatSla}
                            onChange={(e) => setNewCatSla(e.target.value)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                            min={1}
                            required
                          />
                          <select
                            value={newCatPriority}
                            onChange={(e) => setNewCatPriority(e.target.value as TicketPriority)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                          >
                            <option value="P1">P1 - Critical</option>
                            <option value="P2">P2 - High</option>
                            <option value="P3">P3 - Moderate</option>
                            <option value="P4">P4 - Low</option>
                          </select>
                          <button
                            type="submit"
                            className="bg-zinc-800 text-white text-xs py-1 cursor-pointer font-bold hover:bg-zinc-700"
                          >
                            Add Category
                          </button>
                        </form>

                        {/* List categories */}
                        {deptCategoriesList.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">No categories mapped to this department yet.</p>
                        ) : (
                          <div className="overflow-x-auto border border-zinc-200">
                            <table className="min-w-full divide-y divide-zinc-200 text-xs">
                              <thead className="bg-zinc-50 text-zinc-600">
                                <tr>
                                  <th className="px-4 py-2.5 text-left">Category Name</th>
                                  <th className="px-4 py-2.5 text-left">SLA SLA Deadline</th>
                                  <th className="px-4 py-2.5 text-left">Priority</th>
                                  <th className="px-4 py-2.5 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 text-zinc-700">
                                {deptCategoriesList.map(c => (
                                  <tr key={c.id}>
                                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                                    <td className="px-4 py-2.5 font-mono">{c.defaultSlaHours} hours</td>
                                    <td className="px-4 py-2.5 font-mono font-bold text-teal-800">{c.defaultPriority}</td>
                                    <td className="px-4 py-2.5 text-right">
                                      <button
                                        onClick={() => handleDeleteCategory(c.id)}
                                        className="text-red-500 hover:text-red-700 font-bold"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Sub-Section: Keywords routing keys */}
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 border-b pb-2 mb-4">
                          Defined Knowledge Keywords Routing Keys
                        </h3>

                        {/* inline keyword definitions creator */}
                        <form onSubmit={handleCreateKeyword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-3 border border-zinc-200 mb-4">
                          <input
                            type="text"
                            placeholder="Keyword (e.g. SSO)"
                            value={newKwName}
                            onChange={(e) => setNewKwName(e.target.value)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Synonyms (comma separated)"
                            value={newKwSynonyms}
                            onChange={(e) => setNewKwSynonyms(e.target.value)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                          />
                          <button
                            type="submit"
                            className="bg-zinc-800 text-white text-xs py-1 cursor-pointer font-bold hover:bg-zinc-700"
                          >
                            Save Keyword
                          </button>
                        </form>

                        {/* List defined tags */}
                        {deptKeywordsList.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">No routing tags declared yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {deptKeywordsList.map(k => (
                              <span
                                key={k.id}
                                className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-800 text-xs px-2.5 py-1 border border-zinc-200"
                              >
                                <strong className="text-[#032d26]">{k.name}</strong>
                                {k.synonyms.length > 0 && (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    ({k.synonyms.join(", ")})
                                  </span>
                                )}
                                <button
                                  onClick={() => handleDeleteKeyword(k.id)}
                                  className="text-red-500 hover:text-red-700 font-bold ml-1.5"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Mined aggregate keyword suggestions */}
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 border-b pb-2 mb-4 flex items-center justify-between">
                          <span>Mined Unmatched Keyword Suggestions</span>
                          <span className="text-[10px] font-mono text-zinc-400 font-normal bg-zinc-50 px-2 py-0.5 border">
                            Auto-mined over time from unmatched tickets narrative text.
                          </span>
                        </h3>

                        {deptSuggestionsList.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic text-center py-4 bg-zinc-50 border border-dashed">
                            No keyword suggestions accumulated. Matchers are optimized.
                          </p>
                        ) : (
                          <div className="overflow-x-auto border border-zinc-200">
                            <table className="min-w-full divide-y divide-zinc-200 text-xs">
                              <thead className="bg-zinc-50 text-zinc-600 font-semibold uppercase">
                                <tr>
                                  <th className="px-4 py-3 text-left">Suggested Term</th>
                                  <th className="px-4 py-3 text-left">Occurrences Count</th>
                                  <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 text-zinc-700">
                                {deptSuggestionsList.map(s => (
                                  <tr key={s.id}>
                                    <td className="px-4 py-3 font-mono font-bold text-[#032d26]">{s.term}</td>
                                    <td className="px-4 py-3 font-mono">{s.occurrenceCount} matches</td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                      <button
                                        onClick={() => handlePromoteSuggestion(s.id, s.term)}
                                        className="text-emerald-700 hover:underline font-bold"
                                      >
                                        Promote to Keyword
                                      </button>
                                      <span className="text-zinc-300">|</span>
                                      <button
                                        onClick={() => handleRejectSuggestion(s.id)}
                                        className="text-red-500 hover:underline font-bold"
                                      >
                                        Dismiss
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-400 italic py-16">
                      Select a department from the left listing to configure Service Level Agreements, categories, and routing tags.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CLIENTS MANAGEMENT (GLOBAL ADMIN ONLY) */}
          {currentView === "clients" && (
            <ClientManagement token={token} />
          )}

          {/* VIEW: SYSTEM AUDIT LOGS */}
          {currentView === "audit-logs" && (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-200 p-6 flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 font-sans">System Audit Logs</h1>
                  <p className="text-sm text-zinc-500 mt-1">Read-only logging of user profiles, ticket updates, overrides, and assignments.</p>
                </div>
              </div>

              <div className="bg-white border border-zinc-200">
                {auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 italic text-sm">No audit logs written.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 text-xs">
                      <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase">
                        <tr>
                          <th className="px-6 py-3.5 text-left">Action Performed</th>
                          <th className="px-6 py-3.5 text-left">Operator Involved</th>
                          <th className="px-6 py-3.5 text-left">Entity Category</th>
                          <th className="px-6 py-3.5 text-left">Target Record ID</th>
                          <th className="px-6 py-3.5 text-left">Timestamp (UTC)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-zinc-700">
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-6 py-4 font-medium text-zinc-900">{log.action}</td>
                            <td className="px-6 py-4">
                              <span className="font-semibold block">{log.userFullName}</span>
                              <span className="text-[10px] text-zinc-400 font-mono block">{log.userEmail}</span>
                            </td>
                            <td className="px-6 py-4 font-mono font-medium text-zinc-500">{log.entityType}</td>
                            <td className="px-6 py-4 font-mono font-medium text-zinc-400">{log.entityId || "system"}</td>
                            <td className="px-6 py-4 font-mono text-zinc-500">{new Date(log.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}