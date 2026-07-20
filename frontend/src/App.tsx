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
  Trash,
  Ticket,
  Upload,
  Download
} from "lucide-react";

import {
  User as UserType,
  UserRole,
  Ticket as TicketType,
  Department,
  TicketCategory,
  SubDepartment,
  Keyword,
  KeywordSuggestion,
  Invitation,
  AuditLog,
  Client,
  TicketStatus,
  TicketPriority,
  SupportLevel,
  DepartmentSuggestions,
  DepartmentBulkUploadResult,
  PAGES,
  metric
} from "./types";

import ClientManagement from "./components/ClientManagement";
import TicketDetail from "./components/TicketDetail";
import { TicketForm } from "./components/TicketForm";
import { Profile } from "./components/profile";
import { UserDirectory } from "./components/userDirectory";
import { InvitationComponent } from "./components/Invitation";
import { Dashboard } from "./components/Dashboard";
import TicketsTable from "./components/TicketsTable"
import ManagerDashboard from "./components/ManagerDashboard"
import GlobalAdminTicketSearch from "./components/GlobalAdminTicketSearch"
import AgentTicketSearch from "./components/AgentTicketSearch"
import AgentDashboard from "./components/AgentDashboardmock";
import DepartmentDashboard from "./components/HODDashboardmock";
import CXODashboardMock from "./components/CXODashboardmock";
import { RequestorDirectory } from "./components/RequestorDirectory";
import { CXODashboard } from "./components/CxoDashboard";

export const SanghviLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="6" width="88" height="88" rx="20" stroke="#E21D24" strokeWidth="12" fill="none" />
    <path 
      d="M50 20 C64 32, 57 44, 50 48 C43 52, 36 64, 50 80 C36 68, 43 56, 50 52 C57 48, 64 36, 50 20 Z" 
      fill="#E21D24" 
    />
  </svg>
);


// ====================== AUTH SHELL (public / unauthenticated frame) ======================
// Shared "front door" layout for login, signup, forgot-password and invite-accept.
// Left panel sells the product to whoever lands here — requester, agent, HOD or CXO.
// Right panel hosts the actual form for whichever step the visitor is on.
const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full flex bg-white font-sans">
    <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] relative flex-col justify-between bg-[#111214] text-white px-12 py-11 overflow-hidden">
      {/* faint grid texture */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(225,53,42,0.25) 0%, rgba(225,53,42,0) 70%)" }}
      />

      <div className="relative z-10 flex items-center gap-3">
        <img src={"../assets/logo.jpg"} className="w-8 h-8" />
        <span className="text-[11px] font-mono font-semibold tracking-[0.28em] text-slate-400 uppercase">
          Sanghvi Group
        </span>
      </div>

      <div className="relative z-10">
        <p className="font-mono text-[11px] tracking-[0.28em] text-red-400 uppercase mb-4">
          Internal Operations Platform
        </p>
        <h1 className="font-display text-[2.65rem] leading-[1.08] font-semibold text-white mb-5">
          Every ticket
          <br />
          has a <span className="text-red-500">pulse.</span>
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-sm mb-10">
          One sign-in for requesters raising issues, agents resolving them, and leaders watching it
          all move. Customer Pulse keeps everyone on the same beat.
        </p>

        <svg viewBox="0 0 380 56" className="w-full max-w-sm h-12 mb-9" fill="none" aria-hidden="true">
          <path
            d="M0 30 H108 L128 8 L150 52 L172 16 L188 30 H380"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={420}
            style={{ strokeDasharray: 420, animation: "pulse-draw 2.4s ease-out forwards" }}
          />
          <circle cx="150" cy="52" r="3.5" fill="#ef4444" style={{ animation: "pulse-dot 1.8s ease-in-out infinite 1.2s" }} />
        </svg>

        
      </div>

      <div className="relative z-10 flex items-center gap-2 text-[11px] font-mono text-slate-500">
      </div>
    </div>

    <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 bg-white">
      <div className="w-full max-w-sm">
        <div className="lg:hidden flex items-center gap-2.5 mb-9">
          <SanghviLogo className="w-8 h-8" />
          <span className="text-xs font-mono font-semibold tracking-[0.22em] text-slate-500 uppercase">
            Customer Pulse
          </span>
        </div>
        {children}
      </div>
    </div>
  </div>
);

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

  // Forgot Password State
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotOtpVerified, setForgotOtpVerified] = useState(false);

  // Accept Invite State
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");

  const [inviteCategoryIds, setInviteCategoryIds] = useState<string[]>([]);
  const [inviteDeptCategories, setInviteDeptCategories] = useState<any[]>([]);

  // Navigation State
  const [currentView, setCurrentView] = useState<string>(PAGES.DASHBOARD);
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

  // Bulk Upload Departments Dialog state
  const [showBulkUploadDeptDialog, setShowBulkUploadDeptDialog] = useState(false);
  const [bulkDeptFile, setBulkDeptFile] = useState<File | null>(null);
  const [bulkDeptUploading, setBulkDeptUploading] = useState(false);
  const [bulkDeptResult, setBulkDeptResult] = useState<DepartmentBulkUploadResult | null>(null);

  // Department Config state
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [deptCategoriesList, setDeptCategoriesList] = useState<TicketCategory[]>([]);
  const [deptKeywordsList, setDeptKeywordsList] = useState<Keyword[]>([]);
  const [deptSuggestionsList, setDeptSuggestionsList] = useState<KeywordSuggestion[]>([]);

  // Sub-Department Config state (optional grouping within a department)
  const [deptSubDepartmentsList, setDeptSubDepartmentsList] = useState<SubDepartment[]>([]);
  const [newSubDeptName, setNewSubDeptName] = useState("");
  const [newSubDeptDescription, setNewSubDeptDescription] = useState("");

  // Category and Keyword Creator states
  const [newCatName, setNewCatName] = useState("");
  const [newCatSla, setNewCatSla] = useState("1440");
  const [newCatPriority, setNewCatPriority] = useState<TicketPriority>(TicketPriority.P3);
  // Optional - leave "" to make the category department-wide
  const [newCatSubDepartmentId, setNewCatSubDepartmentId] = useState("");
  // Admin-only flags: never shown/known outside GLOBAL_ADMIN / HOD
  const [newCatIsWorkStopping, setNewCatIsWorkStopping] = useState(false);
  const [newCatIsSafetyViolation, setNewCatIsSafetyViolation] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatSla, setEditCatSla] = useState("1440");
  const [editCatPriority, setEditCatPriority] = useState<TicketPriority>(TicketPriority.P3);
  const [editCatSubDepartmentId, setEditCatSubDepartmentId] = useState("");
  const [editCatIsWorkStopping, setEditCatIsWorkStopping] = useState(false);
  const [editCatIsSafetyViolation, setEditCatIsSafetyViolation] = useState(false);
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
  const [resovled,setResolved] = useState<TicketType[]>([])
  const [onhold,setOnhold] = useState<TicketType[]>([])

  // Status filter shared by the My Tickets / Personal Workload / SLA Breached pages
  const [personalStatusFilter, setPersonalStatusFilter] = useState("");

  // Role based check short hands
  const isStaff = user ? ["HOD","CXO", "AGENT"].includes(user.role) : false;
  const isAdmin = user ? ["GLOBAL_ADMIN"].includes(user.role) : false;
  const isGlobalAdmin = user ? user.role === "GLOBAL_ADMIN" : false;
  const isManager = user ? ["HOD"].includes(user.role) : false;
  const isCxo = user ? ["CXO"].includes(user.role) : false
  const isAgent = user ? ["AGENT"].includes(user.role) : false

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

  // Load screen data based on view
  useEffect(() => {
    if (!token) return;
    if (currentView === PAGES.DASHBOARD) {
      fetchMetrics()
    } else if (currentView === PAGES.USER_DIRECTORY) {
      fetchUsers();
      fetchDepartments();
    } else if (currentView === PAGES.PENDING_INVITES) {
      fetchInvitations();
      fetchDepartments();
    } else if (currentView === PAGES.DEPARTMENTS) {
      fetchDepartments();
    } else if (currentView === PAGES.CLIENTS) {
      fetchClients()
    } else if (currentView === PAGES.AUDIT_LOGS){
      fetchAuditLogs();
    } else if (currentView === PAGES.NEW_TICKET) {
      fetchDepartments();
      fetchClients();
    } else if (currentView === PAGES.TICKET_DETAILS) {
      fetchDepartments();
      fetchClients();
    } else if (currentView == PAGES.MY_TICKETS){
      fetchMytickets()
    } else if (currentView == PAGES.ASSINGED_TICKETS){
      fetchAssignedTickets()
    } else if (currentView == PAGES.BREACHED_TICKETS){
      fetchbreachedTickets()
    }else if(currentView == PAGES.RESOLVED_TICKETS){
      fetchResolvedTickets()
    }else if(currentView == PAGES.ON_HOLD){
      fetchOnholdTickets()
    }

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

  const fetchAssignedTickets = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/tickets/assigned/${user?.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setAssigned(data);
      }
    } catch (err) {}
  };
  const fetchOnholdTickets = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/tickets/onhold/${user?.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setOnhold(data);
      }
    } catch (err) {}
  };
  const fetchResolvedTickets = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/tickets/resolved/${user?.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setResolved(data);
      }
    } catch (err) {}
  };

  const fetchbreachedTickets = async () => {
    try {
      const res = await fetch(
        `http://localhost:3000/tickets/breached/${user?.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setBreached(data);
      }
    } catch (err) {}
  };

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
          const res = await fetch(
            `http://localhost:3000/users/metric/${user.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          if (res.ok) {
            const data = await res.json();
            setMetric(data.data);
          }
        } catch (err) {}
      };


  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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
      setCurrentView(PAGES.DASHBOARD);
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
    setSuccess("");
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

      setSuccess(data.message || "Registration submitted. An admin will review your account before you can sign in.");
      setSignupMode(false);
      setSignupEmail("");
      setSignupPassword("");
      setSignupFullName("");
      setSignupEmployeeId("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password - Step 1: request an OTP by email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send verification code");

      setSuccess(data.message || "If an account exists for this email, a verification code has been sent.");
      setForgotStep("verify");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password - Step 2: verify the OTP the user received by email
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid or expired code");

      setForgotOtpVerified(true);
      setSuccess("Code verified. Choose a new password.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password - Step 3: set the new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: forgotOtp, password: forgotNewPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reset password");

      setSuccess(data.message || "Password reset successfully. You can now log in.");
      // Reset all forgot-password state and drop back to the login form
      // pre-filled with the email so the user can sign straight in.
      setLoginEmail(forgotEmail);
      setLoginPassword("");
      setForgotMode(false);
      setForgotStep("request");
      setForgotOtpVerified(false);
      setForgotEmail("");
      setForgotOtp("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exitForgotPasswordFlow = () => {
    setForgotMode(false);
    setForgotStep("request");
    setForgotOtpVerified(false);
    setForgotEmail("");
    setForgotOtp("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setError("");
    setSuccess("");
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
      setCurrentView(PAGES.DASHBOARD);
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
    setCurrentView(PAGES.DASHBOARD);
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

      // 1b. Fetch sub-departments (optional grouping within the department)
      const subDeptRes = await fetch(`http://localhost:3000/departments/${deptId}/subdepartments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (subDeptRes.ok) {
        setDeptSubDepartmentsList(await subDeptRes.json());
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

  // Download the .xlsx template admins fill in for bulk department upload
  const handleDownloadDeptTemplate = async () => {
    try {
      const res = await fetch("http://localhost:3000/departments/bulk-upload/template", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "department_bulk_upload_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download template");
    }
  };

  // Bulk Upload Departments - sends the selected .xlsx/.xls to the backend
  // and shows a per-row created/skipped/error summary.
  const handleBulkUploadDepartments = async () => {
    if (!bulkDeptFile) return;
    setBulkDeptUploading(true);
    setBulkDeptResult(null);
    try {
      const formData = new FormData();
      formData.append("file", bulkDeptFile);
      const res = await fetch("http://localhost:3000/departments/bulk-upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload departments");

      setBulkDeptResult(data);
      fetchDepartments();
      setSuccess(`Bulk upload complete: ${data.createdCount} department(s) created.`);
    } catch (err: any) {
      setError(err.message || "Failed to upload departments");
    } finally {
      setBulkDeptUploading(false);
    }
  };

  // Create Sub-Department (optional grouping within the selected department)
  const handleCreateSubDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubDeptName || !selectedDeptId) return;
    try {
      const res = await fetch(`http://localhost:3000/departments/${selectedDeptId}/subdepartments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSubDeptName,
          description: newSubDeptDescription || undefined
        })
      });
      if (res.ok) {
        setNewSubDeptName("");
        setNewSubDeptDescription("");
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Sub-department added to Department.");
      }
    } catch (err) {}
  };

  // Delete Sub-Department - categories mapped to it fall back to being
  // department-wide rather than being deleted (handled by the backend).
  const handleDeleteSubDepartment = async (subDeptId: string) => {
    try {
      const res = await fetch(`http://localhost:3000/subdepartments/${subDeptId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Sub-department deleted.");
      }
    } catch (err) {}
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
          defaultSlaMinutes: Number(newCatSla),
          defaultPriority: newCatPriority,
          minSupportLevel: newCatLevel,
          subDepartmentId: newCatSubDepartmentId || undefined,
          isWorkStopping: newCatIsWorkStopping,
          isSafetyViolation: newCatIsSafetyViolation
        })
      });
      if (res.ok) {
        setNewCatName("");
        setNewCatSubDepartmentId("");
        setNewCatIsWorkStopping(false);
        setNewCatIsSafetyViolation(false);
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Category added to Department.");
      }
    } catch (err) {}
  };

  // Delete Category
  const handleDeleteCategory = async (catId: string) => {
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

  // Start editing a category
  const handleStartEditCategory = (c: TicketCategory) => {
    setEditingCategoryId(c.id);
    setEditCatName(c.name);
    setEditCatSla(String(c.defaultSlaMinutes));
    setEditCatPriority(c.defaultPriority as TicketPriority);
    setEditCatSubDepartmentId(c.subDepartmentId || "");
    setEditCatIsWorkStopping(!!c.isWorkStopping);
    setEditCatIsSafetyViolation(!!c.isSafetyViolation);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
  };

  // Update Category (name, SLA deadline, priority)
  const handleUpdateCategory = async (catId: string) => {
    if (!editCatName) return;
    try {
      const res = await fetch(`http://localhost:3000/categories/${catId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editCatName,
          defaultSlaMinutes: Number(editCatSla),
          defaultPriority: editCatPriority,
          subDepartmentId: editCatSubDepartmentId || null,
          isWorkStopping: editCatIsWorkStopping,
          isSafetyViolation: editCatIsSafetyViolation,
        })
      });
      if (res.ok) {
        setEditingCategoryId(null);
        handleSelectDeptConfig(selectedDeptId);
        setSuccess("Category updated.");
      }
    } catch (err) {}
  };

  

  // Create Keyword
  const handleCreateKeyword = async (e: React.FormEvent) => {
    e.preventDefault()
 
    try {

      let synonyms = newKwSynonyms.split(",")
      const res = await fetch("http://localhost:3000/keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          departmentId: selectedDeptId,
          name: newKwName,
          synonyms: synonyms 
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

  const handleDeleteDepartment= async (kwId: string) => {
     
    try {
      const res = await fetch(`http://localhost:3000/departments/${kwId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDepartments(departments.filter(department => department.id != kwId))
        handleSelectDeptConfig("");
        setSuccess("department removed.");
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
        body: JSON.stringify({ name: term, synonyms: synonymsInput.split(",") })
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

  // ====================== PUBLIC UNAUTHENTICATED SCENE ======================

  if (!token) {
    // 1. Accept Invitation Form
    if (inviteToken) {
      return (
        <AuthShell>
          <span className="inline-flex p-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl mb-4">
            <Mail size={20} />
          </span>
          <h1 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">Accept invitation</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-7">Set up your profile to join Customer Pulse.</p>

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
              className="w-full bg-[#E1352A] hover:bg-[#c62a20] text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-60"
            >
              {loading ? "Activating profile…" : "Activate account & sign in"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setInviteToken(null)}
              className="text-xs text-red-600 hover:text-red-700 font-semibold hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </AuthShell>
      );
    }

    // 2. Forgot Password (OTP request -> verify + reset)
    if (forgotMode) {
      return (
        <AuthShell>
          <span className="inline-flex p-2.5 bg-red-50 border border-red-100 text-red-600 rounded-xl mb-4">
            <Key size={20} />
          </span>
          <h1 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">Reset password</h1>
          <p className="text-sm text-slate-500 mt-1.5 mb-7">
            {forgotStep === "request"
              ? "Enter your account email and we'll send you a verification code."
              : forgotOtpVerified
              ? "Choose a new password for your account."
              : "Enter the 6-digit code we emailed you."}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 rounded-lg">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 rounded-lg">
              {success}
            </div>
          )}

          {forgotStep === "request" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate email</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E1352A] hover:bg-[#c62a20] text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-60"
              >
                {loading ? "Sending code…" : "Send verification code"}
              </button>
            </form>
          )}

          {forgotStep === "verify" && !forgotOtpVerified && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white tracking-[0.3em] text-center font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">Sent to {forgotEmail}. Expires in 10 minutes.</p>
              </div>
              <button
                type="submit"
                disabled={loading || forgotOtp.length !== 6}
                className="w-full bg-[#E1352A] hover:bg-[#c62a20] text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify code"}
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
                className="w-full text-xs text-red-600 hover:text-red-700 font-semibold hover:underline"
              >
                Resend code
              </button>
            </form>
          )}

          {forgotStep === "verify" && forgotOtpVerified && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New password</label>
                <input
                  type="password"
                  placeholder="Choose a new password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm new password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200"
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#E1352A] hover:bg-[#c62a20] text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-60"
              >
                {loading ? "Resetting…" : "Reset password"}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <button
              onClick={exitForgotPasswordFlow}
              className="text-xs text-red-600 hover:text-red-700 font-semibold hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </AuthShell>
      );
    }

    // 3. Main Login / Public Requester Signup
      return (
      <AuthShell>
        <h1 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
          {signupMode ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-sm text-slate-500 mt-1.5 mb-7">
          {signupMode
            ? "Self-register as a requester to raise, view, and track tickets."
            : "Sign in to Customer Pulse — for requesters, agents, and leadership alike."}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 rounded-lg">
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 rounded-lg">
            {success}
          </div>
        )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="admin@company.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200"
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
                className="w-full text-sm p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200"
                required
              />
            </div>

            <div className="flex justify-end -mt-2">
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setForgotEmail(loginEmail);
                  setError("");
                  setSuccess("");
                }}
                className="text-[11px] text-red-600 hover:text-red-700 font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E1352A] hover:bg-[#c62a20] text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in to Customer Pulse"}
            </button>

            
          </form>

          <p className="mt-7 text-center text-[11px] text-slate-400">
            Trouble getting in? Contact your department admin for access.
          </p>
      </AuthShell>
    );
  }

  // ====================== AUTHENTICATED SYSTEM SHELL ======================

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 selection:bg-slate-200 selection:text-slate-900">
      {/* Top Navigation Banner */}
      <header className="bg-white text-slate-900 h-14 flex items-center justify-between px-6 shrink-0 border-b border-slate-200 shadow-xs select-none">
        <div className="flex items-center gap-3">
          <img src={"../assets/logo.jpg"} className="w-10 h-10" />
          <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            Customer Pulse
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-900">
              {user?.fullName}
            </div>
            <div className="text-[10px] text-slate-500 font-mono tracking-wider flex items-center justify-end gap-1.5 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {user?.role}
            </div>
          </div>

          <span className="text-slate-300">|</span>

          {/* Profile link */}
          <button
            onClick={() => setCurrentView(PAGES.PROFILE)}
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
            Navigation
          </div>

          <div className="flex-1 py-2 space-y-0.5 overflow-y-auto">
            <button
              onClick={() => setCurrentView(PAGES.DASHBOARD)}
              className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                currentView === PAGES.DASHBOARD
                  ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                  : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
              }`}
            >
              <Activity size={15} />
              <span>Service Dashboard</span>
            </button>

            {isGlobalAdmin && (
              <button
                onClick={() => setCurrentView(PAGES.GLOBAL_TICKET_SEARCH)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.GLOBAL_TICKET_SEARCH
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Search size={15} />
                <span>All Tickets</span>
              </button>
            )}

            {isManager ? (
              <button
                onClick={() => setCurrentView(PAGES.HOD_DASHBOARD)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.HOD_DASHBOARD
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Users size={15} />
                <span>Manager Dashboard</span>
              </button>
            ) : null}

            {isManager ? (
              <button
                onClick={() => setCurrentView(PAGES.HOD_ANALYTICS)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.HOD_ANALYTICS
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Layers size={15} />
                <span>Department Analytics</span>
              </button>
            ) : null}

            

            {isCxo ? (
              <button
                onClick={() => setCurrentView(PAGES.CXO_DASHBOARD)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.CXO_DASHBOARD
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Layers size={15} />
                <span>Executive Dashboard</span>
              </button>
            ) : null}
            
            {isCxo ? (
              <button
                onClick={() => setCurrentView(PAGES.CXO_ANALYTICS)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.CXO_ANALYTICS
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Layers size={15} />
                <span>Executive Analytics</span>
              </button>
            ) : null}

            {/* Staff / Agent Directory */}
            {isGlobalAdmin && (
              <button
                onClick={() => setCurrentView(PAGES.USER_DIRECTORY)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.USER_DIRECTORY
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Users size={15} />
                <span>Staff Directory</span>
              </button>
            )}

            {/* Requestor Directory (self-registered requesters awaiting/approved for access) */}
            {isGlobalAdmin && (
              <button
                onClick={() => setCurrentView(PAGES.REQUESTOR_DIRECTORY)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.REQUESTOR_DIRECTORY
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <User size={15} />
                <span>Users Directory</span>
              </button>
            )}

            {/* Admin invitations list */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView(PAGES.PENDING_INVITES)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.PENDING_INVITES
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Mail size={15} />
                <span>Invitations</span>
              </button>
            )}

            {/* Department SLA / Priority config */}
            {isAdmin && (
              <button
                onClick={() => {
                  setCurrentView(PAGES.DEPARTMENTS);
                  setSelectedDeptId("");
                }}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.DEPARTMENTS
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Layers size={15} />
                <span>Departments</span>
              </button>
            )}

            {
              isAgent && (
              <button
                onClick={() => setCurrentView(PAGES.AGENT_TICKET_SEARCH)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.AGENT_TICKET_SEARCH
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Search size={15} />
                <span>My Tickets Search</span>
              </button>
            )}

            {
              isAgent && (
              <button
                onClick={() => {
                  setCurrentView(PAGES.AGENT_ANALYTICS);
                  setSelectedDeptId("");
                }}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.AGENT_ANALYTICS
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Layers size={15} />
                <span>Personal Analytics</span>
              </button>
            )}

            {/* Clients Management (Global Admin only) */}
            {isGlobalAdmin && (
              <button
                onClick={() => setCurrentView(PAGES.CLIENTS)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.CLIENTS
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
                }`}
              >
                <Settings size={15} />
                <span>Clients Database</span>
              </button>
            )}

            {/* System Audit logs */}
            {isAdmin && (
              <button
                onClick={() => setCurrentView(PAGES.AUDIT_LOGS)}
                className={`w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer ${
                  currentView === PAGES.AUDIT_LOGS
                    ? "bg-slate-100 text-slate-900 border-l-4 border-slate-900 font-semibold"
                    : "hover:bg-slate-50 hover:text-slate-900 text-slate-500 transition-colors"
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
          {error && currentView !== PAGES.TICKET_DETAILS && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
              <ShieldAlert size={16} />
              {error}
            </div>
          )}

          {success && currentView !== PAGES.TICKET_DETAILS && (
            <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle size={16} />
              {success}
            </div>
          )}


          {/* AGENT ANAYLTICS*/}
          {
            currentView == PAGES.CXO_ANALYTICS && (
              <CXODashboardMock token={token}/>
            )
          }
          {
            currentView == PAGES.HOD_ANALYTICS && (
              <CXODashboardMock token={token}/>
            )
          }
          {
            currentView == PAGES.CXO_DASHBOARD&& (
              <CXODashboard setCurrentView={setCurrentView} setSelectedTicketId={setSelectedTicketId} token={token} currentUser={user!}/>
            )
          }
          {
            currentView == PAGES.AGENT_ANALYTICS && (
              <AgentDashboard token={token}/>
            )
          }

          {/* VIEW: DASHBOARD */}
          {currentView === PAGES.DASHBOARD && (
            <Dashboard
              token={token}
              setCurrentView={setCurrentView}
              user={user!}
              setSelectedTicketId={setSelectedTicketId}
              metric={metric!}
            />
          )}

          {/* VIEW: GLOBAL ADMIN - company-wide ticket search */}
          {currentView === PAGES.GLOBAL_TICKET_SEARCH && isGlobalAdmin && (
            <GlobalAdminTicketSearch
              token={token}
              currentUser={user!}
              setSelectedTicketId={setSelectedTicketId}
              setCurrentView={setCurrentView}
            />
          )}

          {/* VIEW: AGENT - own/assigned ticket search */}
          {currentView === PAGES.AGENT_TICKET_SEARCH && isAgent && (
            <AgentTicketSearch
              token={token}
              currentUser={user!}
              setSelectedTicketId={setSelectedTicketId}
              setCurrentView={setCurrentView}
            />
          )}

          {/* VIEW: MANAGER DASHBOARD */}
          {currentView === PAGES.HOD_DASHBOARD && (
            <ManagerDashboard
              token={token}
              currentUser={user!}
              setSelectedTicketId={setSelectedTicketId}
              setCurrentView={setCurrentView}
              departments={departments}
            />
          )}

          {/* VIEW: CREATE TICKET (FORM) */}
          {currentView === PAGES.NEW_TICKET && (
            <TicketForm
              setSelectedTicketId={setSelectedTicketId}
              setCurrentView={setCurrentView}
              setError={setError}
              setSuccess={setSuccess}
              token={token}
              clients={clients}
              departments={departments}
            />
          )}

          {/* VIEW: TICKET DETAIL (COMPLEX TABS) */}
          {currentView === PAGES.TICKET_DETAILS && (
            <TicketDetail
              ticketId={selectedTicketId}
              token={token}
              currentUser={user!}
              metric={metric!}
              setCurrentView={setCurrentView}
              onBack={() => setCurrentView(PAGES.DASHBOARD)}
              departments={departments}
              clients={clients}
            />
          )}

          {/* VIEW: PROFILE */}
          {currentView === PAGES.PROFILE && (
            <Profile
              token={token}
              setSuccess={setSuccess}
              setUser={setUser}
              user={user!}
            />
          )}

          {/* VIEW: USERS DIRECTORY */}
          {currentView === PAGES.USER_DIRECTORY && isGlobalAdmin && (
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

          {/* VIEW: REQUESTOR DIRECTORY */}
          {currentView === PAGES.REQUESTOR_DIRECTORY && isGlobalAdmin && (
            <RequestorDirectory
              token={token}
              setError={setError}
              setSuccess={setSuccess}
            />
          )}

          {/* VIEW: INVITATIONS */}
          {currentView === PAGES.PENDING_INVITES && (
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

          {currentView === PAGES.MY_TICKETS && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setPersonalStatusFilter("");
                    setCurrentView(PAGES.DASHBOARD);
                  }}
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
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div className="text-sm">
                <TicketsTable
                  tickets={
                    personalStatusFilter
                      ? mytickets.filter(
                          (t) => t.status === personalStatusFilter,
                        )
                      : mytickets
                  }
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  setSelectedTicketId={setSelectedTicketId}
                />
              </div>
            </div>
          )}

          {currentView === PAGES.ASSINGED_TICKETS && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setPersonalStatusFilter("");
                    setCurrentView(PAGES.DASHBOARD);
                  }}
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
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div className="text-sm">
                <TicketsTable
                  tickets={
                    personalStatusFilter
                      ? assigned.filter(
                          (t) => t.status === personalStatusFilter,
                        )
                      : assigned
                  }
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  setSelectedTicketId={setSelectedTicketId}
                />
              </div>
            </div>
          )}


          {currentView === PAGES.RESOLVED_TICKETS && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setPersonalStatusFilter("");
                    setCurrentView(PAGES.DASHBOARD);
                  }}
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
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div className="text-sm">
                <TicketsTable
                  tickets={
                    personalStatusFilter
                      ? assigned.filter(
                          (t) => t.status === personalStatusFilter,
                        )
                      : resovled 
                  }
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  setSelectedTicketId={setSelectedTicketId}
                />
              </div>
            </div>
          )}

          {currentView === PAGES.ON_HOLD    && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setPersonalStatusFilter("");
                    setCurrentView(PAGES.DASHBOARD);
                  }}
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
                  <option value="ON_HOLD">ON HOLD</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div className="text-sm">
                <TicketsTable
                  tickets={
                    personalStatusFilter
                      ? assigned.filter(
                          (t) => t.status === personalStatusFilter,
                        )
                      : onhold 
                  }
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  setSelectedTicketId={setSelectedTicketId}
                />
              </div>
            </div>
          )}



          {currentView === PAGES.BREACHED_TICKETS && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setPersonalStatusFilter("");
                    setCurrentView(PAGES.DASHBOARD);
                  }}
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
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div className="text-sm">
                <TicketsTable
                  tickets={
                    personalStatusFilter
                      ? breached.filter(
                          (t) => t.status === personalStatusFilter,
                        )
                      : breached
                  }
                  currentView={currentView}
                  setCurrentView={setCurrentView}
                  setSelectedTicketId={setSelectedTicketId}
                />
              </div>
            </div>
          )}

          {/* VIEW: DEPARTMENTS & SLA POLICY */}
          {currentView === PAGES.DEPARTMENTS && (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-200 p-6 flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-zinc-900">
                    Departments SLA & Knowledge Index
                  </h1>
                  <p className="text-sm text-zinc-500 mt-1">
                    Configure service parameters, categories, and tags.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setBulkDeptFile(null);
                      setBulkDeptResult(null);
                      setShowBulkUploadDeptDialog(true);
                    }}
                    className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold px-4 py-2.5 cursor-pointer flex items-center gap-2 rounded-lg transition-all"
                  >
                    <Upload size={16} /> Bulk Upload
                  </button>
                  <button
                    onClick={() => setShowAddDeptDialog(true)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 cursor-pointer flex items-center gap-2 rounded-lg transition-all"
                  >
                    <Plus size={16} /> Add Department
                  </button>
                </div>
              </div>

              {/* Bulk Upload Departments Dialog */}
              {showBulkUploadDeptDialog && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-zinc-900">
                        Bulk Upload Departments
                      </h2>
                      <button
                        onClick={() => setShowBulkUploadDeptDialog(false)}
                        className="text-zinc-400 hover:text-zinc-700 text-xl leading-none cursor-pointer"
                      >
                        ×
                      </button>
                    </div>

                    <p className="text-xs text-zinc-500 mb-4">
                      Upload an .xlsx or .xls file with a "name" and optional
                      "description" column - one row per department.
                    </p>

                    <button
                      type="button"
                      onClick={handleDownloadDeptTemplate}
                      className="w-full mb-4 text-xs font-semibold text-zinc-700 border border-dashed border-zinc-300 hover:bg-zinc-50 rounded-lg px-4 py-2.5 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> Download Template
                    </button>

                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Select File
                      </label>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setBulkDeptFile(e.target.files?.[0] || null)}
                        className="w-full text-sm p-2 border border-zinc-200 rounded-lg bg-white"
                      />
                    </div>

                    {bulkDeptResult && (
                      <div className="mb-4 text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2 max-h-52 overflow-y-auto">
                        <div className="flex gap-4 font-mono">
                          <span className="text-emerald-600 font-bold">
                            Created: {bulkDeptResult.createdCount}
                          </span>
                          <span className="text-amber-600 font-bold">
                            Skipped: {bulkDeptResult.skippedCount}
                          </span>
                          <span className="text-red-600 font-bold">
                            Errors: {bulkDeptResult.errorCount}
                          </span>
                        </div>
                        {bulkDeptResult.skipped.length > 0 && (
                          <div>
                            <p className="font-semibold text-zinc-600">Skipped rows:</p>
                            {bulkDeptResult.skipped.map((s, i) => (
                              <p key={i} className="text-zinc-500">
                                Row {s.row} ({s.name}): {s.reason}
                              </p>
                            ))}
                          </div>
                        )}
                        {bulkDeptResult.errors.length > 0 && (
                          <div>
                            <p className="font-semibold text-zinc-600">Row errors:</p>
                            {bulkDeptResult.errors.map((e, i) => (
                              <p key={i} className="text-red-500">
                                Row {e.row}: {e.reason}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowBulkUploadDeptDialog(false)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 px-4 py-2.5 cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        disabled={!bulkDeptFile || bulkDeptUploading}
                        onClick={handleBulkUploadDepartments}
                        className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2.5 rounded-lg cursor-pointer"
                      >
                        {bulkDeptUploading ? "Uploading..." : "Upload"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Department Dialog */}
              {showAddDeptDialog && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-zinc-900">
                        Add Department
                      </h2>
                      <button
                        onClick={() => setShowAddDeptDialog(false)}
                        className="text-zinc-400 hover:text-zinc-700 text-xl leading-none cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                    <form
                      onSubmit={handleCreateDepartment}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Department Name
                        </label>
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
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Description
                        </label>
                        <textarea
                          placeholder="Optional description"
                          value={newDeptDescription}
                          onChange={(e) =>
                            setNewDeptDescription(e.target.value)
                          }
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
                  <h3 className="text-xs uppercase font-mono font-bold text-zinc-500 tracking-wider">
                    Select Department
                  </h3>
                  {departments.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDeptConfig(d.id)}
                      className={`p-4 border cursor-pointer select-none ${
                        selectedDeptId === d.id
                          ? "bg-white border-[#30b380] shadow-xs"
                          : "bg-white border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="text-[10px] font-mono text-zinc-400 block uppercase font-bold">
                        Scope ID: {d.id}
                      </span>
                      <h4 className="text-sm font-semibold text-zinc-950 mt-1">
                        {d.name}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1">
                        {d.description}
                      </p>
                      <div className="flex justify-between gap-4 mt-3 pt-2.5 border-t border-zinc-100 text-[10px] font-mono text-zinc-400">
                        <div className="flex gap-4 w-fit">
                          <span>Staff: {d._count.agents || 0}</span>
                          <span>Tickets logged: {d._count.tickets || 0}</span>
                        </div>
                        <div className="flex   ">
                          <Trash className="w-4 h-4 text-red-400" onClick={(e)=>{
                            e.stopPropagation()
                            handleDeleteDepartment(d.id)
                          }
                          }/>
                          
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Config panel detail for categories/keywords */}
                <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 h-fit">
                  {selectedDeptId ? (
                    <div className="space-y-8">
                      {/* Sub-Section: Sub-Departments (optional grouping) */}
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 border-b pb-2 mb-4 flex justify-between items-center">
                          <span>Sub-Departments (optional)</span>
                        </h3>

                        {/* inline sub-department creator */}
                        <form
                          onSubmit={handleCreateSubDepartment}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-3 border border-zinc-200 mb-4"
                        >
                          <input
                            type="text"
                            placeholder="Sub-Department Name"
                            value={newSubDeptName}
                            onChange={(e) => setNewSubDeptName(e.target.value)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Description (optional)"
                            value={newSubDeptDescription}
                            onChange={(e) => setNewSubDeptDescription(e.target.value)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                          />
                          <button
                            type="submit"
                            className="bg-zinc-800 text-white text-xs py-1 cursor-pointer font-bold hover:bg-zinc-700"
                          >
                            Add Sub-Department
                          </button>
                        </form>

                        {deptSubDepartmentsList.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">
                            No sub-departments added yet - categories in this department are department-wide by default.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {deptSubDepartmentsList.map((sd) => (
                              <span
                                key={sd.id}
                                className="inline-flex items-center gap-2 text-xs bg-zinc-100 border border-zinc-200 px-2.5 py-1.5"
                              >
                                {sd.name}
                                <Trash
                                  className="w-3 h-3 text-red-400 cursor-pointer"
                                  onClick={() => handleDeleteSubDepartment(sd.id)}
                                />
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sub-Section: Categories */}
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 border-b pb-2 mb-4 flex justify-between items-center">
                          <span>
                            Department Categories & SLA Configurations
                          </span>
                        </h3>

                        {/* inline category creator */}
                        <form
                          onSubmit={handleCreateCategory}
                          className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-50 p-3 border border-zinc-200 mb-4"
                        >
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
                            placeholder="SLA Minutes (e.g. 1440)"
                            value={newCatSla}
                            onChange={(e) => setNewCatSla(e.target.value)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                            min={1}
                            required
                          />
                          <select
                            value={newCatPriority}
                            onChange={(e) =>
                              setNewCatPriority(
                                e.target.value as TicketPriority,
                              )
                            }
                            className="text-xs p-2 border border-zinc-300 bg-white"
                          >
                            <option value="P1">P1 - Critical</option>
                            <option value="P2">P2 - High</option>
                            <option value="P3">P3 - Moderate</option>
                            <option value="P4">P4 - Low</option>
                          </select>
                          <select
                            value={newCatSubDepartmentId}
                            onChange={(e) => setNewCatSubDepartmentId(e.target.value)}
                            className="text-xs p-2 border border-zinc-300 bg-white"
                          >
                            <option value="">-- Department-wide (no sub-dept) --</option>
                            {deptSubDepartmentsList.map((sd) => (
                              <option key={sd.id} value={sd.id}>{sd.name}</option>
                            ))}
                          </select>

                          {/* Admin-only classification - never surfaced to requesters/agents */}
                          <label className="text-xs flex items-center gap-1.5 bg-white border border-zinc-300 p-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newCatIsWorkStopping}
                              onChange={(e) => setNewCatIsWorkStopping(e.target.checked)}
                            />
                            Work Stopping
                          </label>
                          <label className="text-xs flex items-center gap-1.5 bg-white border border-zinc-300 p-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newCatIsSafetyViolation}
                              onChange={(e) => setNewCatIsSafetyViolation(e.target.checked)}
                            />
                            Safety Violation
                          </label>

                          <button
                            type="submit"
                            className="bg-zinc-800 text-white text-xs py-1 cursor-pointer font-bold hover:bg-zinc-700"
                          >
                            Add Category
                          </button>
                        </form>

                        {/* List categories */}
                        {deptCategoriesList.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">
                            No categories mapped to this department yet.
                          </p>
                        ) : (
                          <div className="overflow-x-auto border border-zinc-200">
                            <table className="min-w-full divide-y divide-zinc-200 text-xs">
                              <thead className="bg-zinc-50 text-zinc-600">
                                <tr>
                                  <th className="px-4 py-2.5 text-left">
                                    Category Name
                                  </th>
                                  <th className="px-4 py-2.5 text-left">
                                    Sub-Department
                                  </th>
                                  <th className="px-4 py-2.5 text-left">
                                    SLA SLA Deadline
                                  </th>
                                  <th className="px-4 py-2.5 text-left">
                                    Priority
                                  </th>
                                  <th className="px-4 py-2.5 text-left">
                                    Flags (admin-only)
                                  </th>
                                  <th className="px-4 py-2.5 text-right">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 text-zinc-700">
                                {deptCategoriesList.map((c) =>
                                  editingCategoryId === c.id ? (
                                    <tr key={c.id} className="bg-zinc-50">
                                      <td className="px-4 py-2.5">
                                        <input
                                          type="text"
                                          value={editCatName}
                                          onChange={(e) => setEditCatName(e.target.value)}
                                          className="text-xs p-1.5 border border-zinc-300 bg-white w-full"
                                        />
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <select
                                          value={editCatSubDepartmentId}
                                          onChange={(e) => setEditCatSubDepartmentId(e.target.value)}
                                          className="text-xs p-1.5 border border-zinc-300 bg-white"
                                        >
                                          <option value="">-- Department-wide --</option>
                                          {deptSubDepartmentsList.map((sd) => (
                                            <option key={sd.id} value={sd.id}>{sd.name}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <input
                                          type="number"
                                          min={1}
                                          value={editCatSla}
                                          onChange={(e) => setEditCatSla(e.target.value)}
                                          className="text-xs p-1.5 border border-zinc-300 bg-white w-24"
                                        />
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <select
                                          value={editCatPriority}
                                          onChange={(e) =>
                                            setEditCatPriority(e.target.value as TicketPriority)
                                          }
                                          className="text-xs p-1.5 border border-zinc-300 bg-white"
                                        >
                                          <option value="P1">P1 - Critical</option>
                                          <option value="P2">P2 - High</option>
                                          <option value="P3">P3 - Moderate</option>
                                          <option value="P4">P4 - Low</option>
                                        </select>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <label className="flex items-center gap-1 mb-1">
                                          <input
                                            type="checkbox"
                                            checked={editCatIsWorkStopping}
                                            onChange={(e) => setEditCatIsWorkStopping(e.target.checked)}
                                          />
                                          Work Stopping
                                        </label>
                                        <label className="flex items-center gap-1">
                                          <input
                                            type="checkbox"
                                            checked={editCatIsSafetyViolation}
                                            onChange={(e) => setEditCatIsSafetyViolation(e.target.checked)}
                                          />
                                          Safety Violation
                                        </label>
                                      </td>
                                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                        <button
                                          onClick={() => handleUpdateCategory(c.id)}
                                          className="text-teal-700 hover:text-teal-900 font-bold mr-3"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={handleCancelEditCategory}
                                          className="text-zinc-500 hover:text-zinc-700 font-bold"
                                        >
                                          Cancel
                                        </button>
                                      </td>
                                    </tr>
                                  ) : (
                                    <tr key={c.id}>
                                      <td className="px-4 py-2.5 font-medium">
                                        {c.name}
                                      </td>
                                      <td className="px-4 py-2.5 text-zinc-500">
                                        {deptSubDepartmentsList.find((sd) => sd.id === c.subDepartmentId)?.name || (
                                          <span className="italic text-zinc-400">Department-wide</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 font-mono">
                                        {c.defaultSlaMinutes} minutes
                                      </td>
                                      <td className="px-4 py-2.5 font-mono font-bold text-teal-800">
                                        {c.defaultPriority}
                                      </td>
                                      <td className="px-4 py-2.5 space-x-1">
                                        {c.isWorkStopping && (
                                          <span className="inline-block bg-red-100 text-red-700 font-bold px-1.5 py-0.5">
                                            Work Stopping
                                          </span>
                                        )}
                                        {c.isSafetyViolation && (
                                          <span className="inline-block bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5">
                                            Safety Violation
                                          </span>
                                        )}
                                        {!c.isWorkStopping && !c.isSafetyViolation && (
                                          <span className="text-zinc-400 italic">—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                        <button
                                          onClick={() => handleStartEditCategory(c)}
                                          className="text-zinc-600 hover:text-zinc-900 font-bold mr-3"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteCategory(c.id)
                                          }
                                          className="text-red-500 hover:text-red-700 font-bold"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  )
                                )}
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
                        <form
                          onSubmit={handleCreateKeyword}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-3 border border-zinc-200 mb-4"
                        >
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
                          <p className="text-xs text-zinc-400 italic">
                            No routing tags declared yet.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {deptKeywordsList.map((k) => (
                              <span
                                key={k.id}
                                className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-800 text-xs px-2.5 py-1 border border-zinc-200"
                              >
                                <strong className="text-[#032d26]">
                                  {k.name}
                                </strong>
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
                            Auto-mined over time from unmatched tickets
                            narrative text.
                          </span>
                        </h3>

                        {deptSuggestionsList.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic text-center py-4 bg-zinc-50 border border-dashed">
                            No keyword suggestions accumulated. Matchers are
                            optimized.
                          </p>
                        ) : (
                          <div className="overflow-x-auto border border-zinc-200">
                            <table className="min-w-full divide-y divide-zinc-200 text-xs">
                              <thead className="bg-zinc-50 text-zinc-600 font-semibold uppercase">
                                <tr>
                                  <th className="px-4 py-3 text-left">
                                    Suggested Term
                                  </th>
                                  <th className="px-4 py-3 text-left">
                                    Occurrences Count
                                  </th>
                                  <th className="px-4 py-3 text-right">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 text-zinc-700">
                                {deptSuggestionsList.map((s) => (
                                  <tr key={s.id}>
                                    <td className="px-4 py-3 font-mono font-bold text-[#032d26]">
                                      {s.term}
                                    </td>
                                    <td className="px-4 py-3 font-mono">
                                      {s.occurrenceCount} matches
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                      <button
                                        onClick={() =>
                                          handlePromoteSuggestion(s.id, s.term)
                                        }
                                        className="text-emerald-700 hover:underline font-bold"
                                      >
                                        Promote to Keyword
                                      </button>
                                      <span className="text-zinc-300">|</span>
                                      <button
                                        onClick={() =>
                                          handleRejectSuggestion(s.id)
                                        }
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
                      Select a department from the left listing to configure
                      Service Level Agreements, categories, and routing tags.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CLIENTS MANAGEMENT (GLOBAL ADMIN ONLY) */}
          {currentView === PAGES.CLIENTS && <ClientManagement token={token} />}

          {/* VIEW: SYSTEM AUDIT LOGS */}
          {currentView === PAGES.AUDIT_LOGS && (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-200 p-6 flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 font-sans">
                    System Audit Logs
                  </h1>
                  <p className="text-sm text-zinc-500 mt-1">
                    Read-only logging of user profiles, ticket updates,
                    overrides, and assignments.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-zinc-200">
                {auditLogs.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 italic text-sm">
                    No audit logs written.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 text-xs">
                      <thead className="bg-zinc-50 text-zinc-600 font-bold uppercase">
                        <tr>
                          <th className="px-6 py-3.5 text-left">
                            Action Performed
                          </th>
                          <th className="px-6 py-3.5 text-left">
                            User Involved
                          </th>
                          <th className="px-6 py-3.5 text-left">
                            Entity Category
                          </th>
                          <th className="px-6 py-3.5 text-left">
                            Target Record ID
                          </th>
                          <th className="px-6 py-3.5 text-left">
                            Timestamp (UTC)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-zinc-700">
                        {auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="px-6 py-4 font-medium text-zinc-900">
                              {log.action}
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold block">
                                {log.userFullName}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono block">
                                {log.userEmail}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono font-medium text-zinc-500">
                              {log.entityType}
                            </td>
                            <td className="px-6 py-4 font-mono font-medium text-zinc-400">
                              {log.entityId || "system"}
                            </td>
                            <td className="px-6 py-4 font-mono text-zinc-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
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
