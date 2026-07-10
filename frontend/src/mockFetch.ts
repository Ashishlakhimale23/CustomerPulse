import { UserRole, TicketStatus, TicketPriority, SupportLevel } from "./types";

// Setup Mock Client DB in localStorage
const DB_KEY = "service_now_lite_db";

const initialDb = {
  companies: [
    {
      id: "company-default",
      name: "ServiceNow Lite Enterprise",
      domain: "company.com",
      createdAt: "2026-07-07T14:55:34.519Z",
      createdById: "system"
    }
  ],
  clients: [
    { id: "client-1", name: "Acme Corporation", createdAt: "2026-07-07T14:55:34.519Z" },
    { id: "client-2", name: "Initech Systems", createdAt: "2026-07-07T14:55:34.519Z" },
    { id: "client-3", name: "Stark Industries", createdAt: "2026-07-07T14:55:34.519Z" }
  ],
  departments: [
    {
      id: "dept-it",
      companyId: "company-default",
      name: "IT Support",
      description: "Technical assistance and hardware/software setup",
      createdAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "dept-hr",
      companyId: "company-default",
      name: "Human Resources",
      description: "Payroll, benefits, and workplace queries",
      createdAt: "2026-07-07T14:55:34.519Z"
    }
  ],
  users: [
    {
      id: "admin-user",
      companyId: "company-default",
      email: "admin@company.com",
      fullName: "System Admin",
      employeeId: "EMP001",
      passwordHash: "admin123",
      departmentId: "dept-it",
      managerId: null,
      role: "GLOBAL_ADMIN",
      supportLevel: "L4",
      isActive: true,
      isAvailableForAssignment: true,
      maxActiveTickets: 15,
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "it-agent-1",
      companyId: "company-default",
      email: "itagent1@company.com",
      fullName: "Sarah Connor (IT Agent)",
      employeeId: "EMP002",
      passwordHash: "agent123",
      departmentId: "dept-it",
      managerId: "admin-user",
      role: "AGENT",
      supportLevel: "L1",
      isActive: true,
      isAvailableForAssignment: true,
      maxActiveTickets: 10,
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "it-agent-2",
      companyId: "company-default",
      email: "itagent2@company.com",
      fullName: "John Connor (IT Senior Agent)",
      employeeId: "EMP003",
      passwordHash: "agent123",
      departmentId: "dept-it",
      managerId: "admin-user",
      role: "AGENT",
      supportLevel: "L2",
      isActive: true,
      isAvailableForAssignment: true,
      maxActiveTickets: 12,
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "hr-agent-1",
      companyId: "company-default",
      email: "hragent1@company.com",
      fullName: "Pam Beesly (HR Specialist)",
      employeeId: "EMP004",
      passwordHash: "agent123",
      departmentId: "dept-hr",
      managerId: null,
      role: "AGENT",
      supportLevel: "L1",
      isActive: true,
      isAvailableForAssignment: true,
      maxActiveTickets: 10,
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "user-ic0rni7eeydxv29p6bgcf",
      companyId: "company-default",
      email: "ashishlakhimale23@gmail.com",
      fullName: "joe",
      employeeId: "joe",
      passwordHash: "ashish123!",
      departmentId: "dept-it",
      managerId: null,
      role: "REQUESTER",
      supportLevel: null,
      isActive: true,
      isAvailableForAssignment: false,
      maxActiveTickets: 0,
      createdAt: "2026-07-07T15:20:10.449Z",
      updatedAt: "2026-07-07T15:20:10.449Z"
    },
    {
      id: "it-manager",
      companyId: "company-default",
      email: "itmanager@company.com",
      fullName: "Michael Scott (IT Manager)",
      employeeId: "EMP005",
      passwordHash: "manager123",
      departmentId: "dept-it",
      managerId: null,
      role: "DEPT_MANAGER",
      supportLevel: "L3",
      isActive: true,
      isAvailableForAssignment: false,
      maxActiveTickets: 0,
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "hr-manager",
      companyId: "company-default",
      email: "hrmanager@company.com",
      fullName: "Toby Flenderson (HR Manager)",
      employeeId: "EMP006",
      passwordHash: "manager123",
      departmentId: "dept-hr",
      managerId: null,
      role: "DEPT_MANAGER",
      supportLevel: "L3",
      isActive: true,
      isAvailableForAssignment: false,
      maxActiveTickets: 0,
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T14:55:34.519Z"
    }
  ],
  keywords: [
    {
      id: "kw-vpn",
      departmentId: "dept-it",
      name: "VPN",
      synonyms: ["remote", "pulse", "anyconnect", "forticlient"],
      createdAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "kw-pwd",
      departmentId: "dept-it",
      name: "Password Reset",
      synonyms: ["login", "credentials", "sso", "auth"],
      createdAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "kw-hw",
      departmentId: "dept-it",
      name: "Hardware",
      synonyms: ["laptop", "monitor", "keyboard", "mouse", "printer"],
      createdAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "kw-pay",
      departmentId: "dept-hr",
      name: "Payroll",
      synonyms: ["salary", "payslip", "bonus", "tax"],
      createdAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "kw-ben",
      departmentId: "dept-hr",
      name: "Benefits",
      synonyms: ["health", "insurance", "401k", "dental"],
      createdAt: "2026-07-07T14:55:34.519Z"
    }
  ],
  keywordSuggestions: [
    {
      id: "sug-1",
      departmentId: "dept-it",
      term: "slack",
      occurrenceCount: 4,
      status: "PENDING",
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "sug-2",
      departmentId: "dept-it",
      term: "excel",
      occurrenceCount: 2,
      status: "PENDING",
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T14:55:34.519Z"
    }
  ],
  userKeywords: [
    { userId: "it-agent-1", keywordId: "kw-pwd", proficiency: 3 },
    { userId: "it-agent-1", keywordId: "kw-hw", proficiency: 2 },
    { userId: "it-agent-2", keywordId: "kw-vpn", proficiency: 5 },
    { userId: "it-agent-2", keywordId: "kw-pwd", proficiency: 4 },
    { userId: "hr-agent-1", keywordId: "kw-pay", proficiency: 4 },
    { userId: "hr-agent-1", keywordId: "kw-ben", proficiency: 5 }
  ],
  ticketKeywords: [] as any[],
  categoryAgents: [
    { id: "ca-1", categoryId: "cat-it-login", userId: "it-agent-1", proficiency: 4, createdAt: "2026-07-07T14:55:34.519Z" },
    { id: "ca-2", categoryId: "cat-it-login", userId: "it-agent-2", proficiency: 3, createdAt: "2026-07-07T14:55:34.519Z" },
    { id: "ca-3", categoryId: "cat-it-network", userId: "it-agent-2", proficiency: 5, createdAt: "2026-07-07T14:55:34.519Z" },
    { id: "ca-4", categoryId: "cat-hr-payroll", userId: "hr-agent-1", proficiency: 5, createdAt: "2026-07-07T14:55:34.519Z" }
  ],
  ticketCategories: [
    { id: "cat-it-login", departmentId: "dept-it", name: "Login & SSO", defaultSlaHours: 4, defaultPriority: "P2", minSupportLevel: "L1" },
    { id: "cat-it-network", departmentId: "dept-it", name: "Network Access", defaultSlaHours: 8, defaultPriority: "P2", minSupportLevel: "L1" },
    { id: "cat-it-hardware", departmentId: "dept-it", name: "Hardware Issue", defaultSlaHours: 24, defaultPriority: "P3", minSupportLevel: "L1" },
    { id: "cat-hr-payroll", departmentId: "dept-hr", name: "Payroll", defaultSlaHours: 48, defaultPriority: "P3", minSupportLevel: "L1" },
    { id: "cat-hr-onboard", departmentId: "dept-hr", name: "Onboarding", defaultSlaHours: 72, defaultPriority: "P4", minSupportLevel: "L1" }
  ],
  tickets: [
    {
      id: "ticket-example-1",
      ticketNumber: "TKT00001",
      title: "Cannot connect to Cisco VPN",
      description: "Getting timeout error when trying to access internal files via Cisco VPN from home.",
      requesterId: "it-agent-1",
      departmentId: "dept-it",
      categoryId: "cat-it-network",
      representative: "Sarah Connor",
      employeeId: "EMP002",
      clientName: "Acme Corporation",
      clientEmail: "sarah@acme.com",
      dateOfOccurance: "2026-07-07T14:55:34.519Z",
      site: "Remote",
      state: "Open",
      status: "IN_PROGRESS",
      priority: "P2",
      internalPriority: "P2",
      assigneeId: "it-agent-2",
      assignedById: "system",
      assignmentMethod: "AUTO_KEYWORD",
      assignedAt: "2026-07-07T14:55:34.519Z",
      supportLevel: "L1",
      escalatedToId: null,
      escalatedAt: null,
      escalationReason: null,
      dueDate: "2026-07-07T22:55:34.519Z",
      slaDeadline: "2026-07-07T22:55:34.519Z",
      slaBreached: false,
      resolvedAt: "2026-07-07T15:15:38.017Z",
      closedAt: null,
      tags: ["vpn", "cisco"],
      createdAt: "2026-07-07T14:55:34.519Z",
      updatedAt: "2026-07-07T15:19:18.129Z"
    },
    {
      id: "ticket-iztlz1kh46s91ut6nows1j",
      ticketNumber: "TKT00002",
      title: "adsf",
      description: "adf",
      requesterId: "user-ic0rni7eeydxv29p6bgcf",
      departmentId: "dept-it",
      categoryId: "cat-it-network",
      representative: "saf",
      employeeId: "adf",
      clientName: "Acme Corporation",
      clientEmail: "ashishlakhimale23@gmail.com",
      dateOfOccurance: "2026-07-07T15:20:46.967Z",
      site: "Headquarters",
      state: "Manipur",
      status: "OPEN",
      priority: "P2",
      internalPriority: "P2",
      assigneeId: "it-agent-2",
      assignedById: "system",
      assignmentMethod: "AUTO_LOAD_BALANCE",
      assignedAt: "2026-07-07T15:20:50.096Z",
      supportLevel: "L1",
      escalatedToId: null,
      escalatedAt: null,
      escalationReason: null,
      dueDate: "2026-07-07T23:20:50.096Z",
      slaDeadline: "2026-07-07T23:20:50.096Z",
      slaBreached: false,
      resolvedAt: null,
      closedAt: null,
      tags: ["dsaf"],
      createdAt: "2026-07-07T15:20:50.096Z",
      updatedAt: "2026-07-07T15:20:50.096Z"
    }
  ],
  ticketComments: [
    {
      id: "comment-1",
      ticketId: "ticket-example-1",
      userId: "it-agent-2",
      commentText: "I am checking the firewall logs to see if your remote IP is blocked.",
      isInternal: true,
      createdAt: "2026-07-07T14:55:34.519Z"
    }
  ],
  ticketAttachments: [
    {
      id: "attach-1",
      ticketId: "ticket-example-1",
      fileName: "vpn_error.png",
      fileUrl: "https://example.com/vpn_error.png",
      uploadedBy: "it-agent-1",
      createdAt: "2026-07-07T14:55:34.519Z"
    }
  ],
  ticketEscalations: [] as any[],
  ticketStatusHistories: [
    {
      id: "sh-1",
      ticketId: "ticket-example-1",
      fromStatus: "NEW" as TicketStatus | null,
      status: "OPEN" as TicketStatus,
      changedById: "system",
      changedAt: "2026-07-07T14:55:34.519Z",
      note: "Auto-assigned to Sarah's senior John"
    },
    {
      id: "sh-8tvnhghb7ve7ioyjgk3r4",
      ticketId: "ticket-example-1",
      fromStatus: "OPEN" as TicketStatus | null,
      status: "RESOLVED" as TicketStatus,
      changedById: "admin-user",
      changedAt: "2026-07-07T15:15:38.017Z",
      note: "Ticket resolved by support agent."
    },
    {
      id: "sh-3ikod7e7bbfupd4yrnjtq",
      ticketId: "ticket-example-1",
      fromStatus: "RESOLVED" as TicketStatus | null,
      status: "IN_PROGRESS" as TicketStatus,
      changedById: "admin-user",
      changedAt: "2026-07-07T15:19:18.129Z",
      note: "Status manually changed to IN_PROGRESS"
    },
    {
      id: "sh-s0crxvw3dbfwmc41b38fp9",
      ticketId: "ticket-iztlz1kh46s91ut6nows1j",
      fromStatus: null as TicketStatus | null,
      status: "OPEN" as TicketStatus,
      changedById: "system",
      changedAt: "2026-07-07T15:20:50.096Z",
      note: "Ticket submitted. Auto-assigned to agent."
    }
  ],
  auditLogs: [
    {
      id: "audit-1",
      userId: "admin-user",
      action: "System Initialized",
      entityType: "System",
      entityId: "system",
      createdAt: "2026-07-07T14:55:34.519Z"
    },
    {
      id: "lf06ifcylat7q0ybpiwqn",
      userId: "it-agent-1",
      action: "Login successful",
      entityType: "User",
      entityId: "it-agent-1",
      createdAt: "2026-07-07T15:05:48.879Z"
    },
    {
      id: "bdkksn4hgs59z1rf0t36pg",
      userId: "admin-user",
      action: "Login successful",
      entityType: "User",
      entityId: "admin-user",
      createdAt: "2026-07-07T15:14:48.593Z"
    },
    {
      id: "h4cp11xjq3dvhj5mpvo0l9",
      userId: "admin-user",
      action: "Resolved Ticket TKT00001",
      entityType: "Ticket",
      entityId: "ticket-example-1",
      createdAt: "2026-07-07T15:15:38.017Z"
    },
    {
      id: "fbbx8ewqkz6vchf0ns66dh",
      userId: "admin-user",
      action: "Updated Ticket TKT00001",
      entityType: "Ticket",
      entityId: "ticket-example-1",
      createdAt: "2026-07-07T15:19:18.129Z"
    },
    {
      id: "cpgfnpo4jdmqyhbmjc49af",
      userId: "admin-user",
      action: "Status changed to IN_PROGRESS on TKT00001",
      entityType: "Ticket",
      entityId: "ticket-example-1",
      createdAt: "2026-07-07T15:19:19.012Z"
    },
    {
      id: "2h1s1k9uy3lltg0lp9449d",
      userId: "user-ic0rni7eeydxv29p6bgcf",
      action: "Public signup completed",
      entityType: "User",
      entityId: "user-ic0rni7eeydxv29p6bgcf",
      createdAt: "2026-07-07T15:20:10.449Z"
    },
    {
      id: "6idf789g90hmngxoer1hkj",
      userId: "user-ic0rni7eeydxv29p6bgcf",
      action: "Created Ticket TKT00002",
      entityType: "Ticket",
      entityId: "ticket-iztlz1kh46s91ut6nows1j",
      createdAt: "2026-07-07T15:20:50.096Z"
    },
    {
      id: "hik1oyl9d79jlk66szi4g",
      userId: "admin-user",
      action: "Login successful",
      entityType: "User",
      entityId: "admin-user",
      createdAt: "2026-07-07T15:25:06.513Z"
    }
  ],
  invitations: [
    {
      id: "invite-example",
      companyId: "company-default",
      email: "invited@company.com",
      invitedById: "admin-user",
      role: UserRole.EMPLOYEE,
      departmentId: "dept-it",
      categoryId: undefined as string | undefined,
      categoryIds: [] as string[],
      supportLevel: SupportLevel.L1,
      status: "PENDING" as any,
      token: "test-token-123",
      expiresAt: "2026-07-14T14:55:34.519Z",
      createdAt: "2026-07-07T14:55:34.519Z"
    }
  ]
};

// Ensure localStorage db exists
let db = initialDb;
const saved = localStorage.getItem(DB_KEY);
if (saved) {
  try {
    db = JSON.parse(saved);
  } catch (e) {
    db = initialDb;
  }
} else {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function saveDb() {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Generate uuid
function uuid() {
  return Math.random().toString(36).substr(2, 9);
}

// Simple Helper to retrieve auth user from headers
function getLoggedInUser(headers: HeadersInit | undefined): any | null {
  const auth = headers && (headers as any)["Authorization"];
  if (!auth || !auth.startsWith("Bearer ")) {
    // Try localStorage fallback for easier mock flow
    const localUser = localStorage.getItem("service_now_user");
    if (localUser) return JSON.parse(localUser);
    return null;
  }
  const token = auth.substring(7);
  // In our simple token system, user ID is the token, or token matches user id
  const user = db.users.find(u => u.id === token || token === "admin-token-123" && u.role === "GLOBAL_ADMIN");
  if (user) return user;
  if (token === "admin-token-123" || token === "system_token") {
    return db.users.find(u => u.role === "GLOBAL_ADMIN") || db.users[0];
  }
  return null;
}

// Override Global Fetch
const originalFetch = window.fetch;

const mockFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
  const method = init?.method?.toUpperCase() || "GET";
  const body = init?.body ? JSON.parse(init.body as string) : null;
  const headers = init?.headers;

  // Process only localhost requests (intercept all API calls to local backend)
  if (!urlStr.includes("localhost:3000")) {
    return originalFetch(input, init);
  }

  // Extract relative path from localhost URL (handles both /api/ prefix and without)
  const urlPath = urlStr.replace(/^https?:\/\/[^/]+/, "").split("?")[0].replace(/^\//, "");
  const path = urlPath.startsWith("api/") ? urlPath.slice(4) : urlPath;
  const searchParams = new URLSearchParams(urlStr.includes("?") ? urlStr.split("?")[1] : "");

  // Helper for consistent JSON responses
  const jsonResponse = (data: any, status = 200) => {
    return Promise.resolve(new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    }));
  };

  const loggedIn = getLoggedInUser(headers);

  try {
    // ============================================
    // AUTHENTICATION
    // ============================================
    if (path === "auth/login" && method === "POST") {
      const { email, password } = body;
      const user = db.users.find(u => u.email === email && u.passwordHash === password);
      if (!user) {
        return jsonResponse({ error: "Invalid credentials" }, 401);
      }
      // Add log
      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: user.id,
        action: "Login successful",
        entityType: "User",
        entityId: user.id,
        createdAt: new Date().toISOString()
      });
      saveDb();
      return jsonResponse({ token: user.id, user });
    }

    if (path === "auth/signup" && method === "POST") {
      const { email, password, fullName, employeeId } = body;
      if (!email || !password || !fullName || !employeeId) {
        return jsonResponse({ error: "All fields are required" }, 400);
      }
      if (db.users.some(u => u.email === email)) {
        return jsonResponse({ error: "Email already registered" }, 400);
      }
      const newUser = {
        id: "user-" + uuid(),
        companyId: "company-default",
        email,
        fullName,
        employeeId,
        passwordHash: password,
        departmentId: "dept-it",
        managerId: null,
        role: "REQUESTER",
        supportLevel: null,
        isActive: true,
        isAvailableForAssignment: false,
        maxActiveTickets: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.users.push(newUser);
      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: newUser.id,
        action: "Public signup completed",
        entityType: "User",
        entityId: newUser.id,
        createdAt: new Date().toISOString()
      });
      saveDb();
      return jsonResponse({ token: newUser.id, user: newUser });
    }

    // ============================================
    // PROTECTION GATES (Requires Login)
    // ============================================
    if (!loggedIn && !path.startsWith("invitations/accept")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // ============================================
    // COMPANIES
    // ============================================
    if (path === "companies/me" && method === "GET") {
      const comp = db.companies[0] || { id: "company-default", name: "ServiceNow Lite Enterprise" };
      return jsonResponse(comp);
    }

    // ============================================
    // AUDIT LOGS
    // ============================================
    if (path === "audit-logs") {
      if (method === "GET") {
        if (!["GLOBAL_ADMIN", "DEPT_ADMIN", "MANAGER", "DEPT_MANAGER"].includes(loggedIn.role)) {
          return jsonResponse({ error: "Forbidden" }, 403);
        }
        const userId = searchParams.get("userId");
        const entityType = searchParams.get("entityType");
        const entityId = searchParams.get("entityId");

        let logs = [...db.auditLogs];
        if (userId) logs = logs.filter(l => l.userId === userId);
        if (entityType) logs = logs.filter(l => l.entityType === entityType);
        if (entityId) logs = logs.filter(l => l.entityId === entityId);

        // Sort desc
        logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const joined = logs.map(l => {
          const userObj = db.users.find(u => u.id === l.userId);
          return {
            ...l,
            userEmail: userObj ? userObj.email : "system",
            userFullName: userObj ? userObj.fullName : "System"
          };
        });
        return jsonResponse(joined);
      }
      if (method === "POST") {
        const { action, entityType, entityId } = body;
        const newLog = {
          id: "audit-" + uuid(),
          userId: loggedIn.id,
          action,
          entityType,
          entityId,
          createdAt: new Date().toISOString()
        };
        db.auditLogs.push(newLog);
        saveDb();
        return jsonResponse(newLog);
      }
    }

    // ============================================
    // DEPARTMENTS & CATEGORIES
    // ============================================
    if (path === "departments" && method === "GET") {
      return jsonResponse(db.departments);
    }

    // Get categories for a department
    // e.g. departments/dept-it/categories
    const deptCatsMatch = path.match(/^departments\/([^/]+)\/categories$/);
    if (deptCatsMatch && method === "GET") {
      const deptId = deptCatsMatch[1];
      const categories = db.ticketCategories.filter(c => c.departmentId === deptId);
      return jsonResponse(categories);
    }

    if (deptCatsMatch && method === "POST") {
      const deptId = deptCatsMatch[1];
      if (!["GLOBAL_ADMIN", "DEPT_ADMIN"].includes(loggedIn.role)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const { name, defaultSlaHours, defaultPriority, minSupportLevel } = body;
      const newCat = {
        id: "cat-" + uuid(),
        departmentId: deptId,
        name,
        defaultSlaHours: Number(defaultSlaHours || 24),
        defaultPriority: defaultPriority || "P3",
        minSupportLevel: minSupportLevel || "L1"
      };
      db.ticketCategories.push(newCat);
      saveDb();
      return jsonResponse(newCat);
    }

    // Delete or edit category
    const singleCatMatch = path.match(/^categories\/([^/]+)$/);
    if (singleCatMatch && method === "DELETE") {
      const catId = singleCatMatch[1];
      if (!["GLOBAL_ADMIN", "DEPT_ADMIN"].includes(loggedIn.role)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      db.ticketCategories = db.ticketCategories.filter(c => c.id !== catId);
      saveDb();
      return jsonResponse({ success: true });
    }

    // ============================================
    // USERS (Agents/Operators/Managers)
    // ============================================
    if (path === "users" && method === "GET") {
      const deptId = searchParams.get("departmentId");
      let usersList = [...db.users];
      if (deptId) {
        usersList = usersList.filter(u => u.departmentId === deptId);
      }
      // Sanitize passwordHash before sending
      const sanitized = usersList.map(({ passwordHash, ...rest }) => rest);
      return jsonResponse(sanitized);
    }

    const singleUserMatch = path.match(/^users\/([^/]+)$/);
    if (singleUserMatch && method === "GET") {
      const uId = singleUserMatch[1];
      const found = db.users.find(u => u.id === uId);
      if (!found) return jsonResponse({ error: "User not found" }, 404);
      const { passwordHash, ...rest } = found;
      return jsonResponse(rest);
    }

    if (singleUserMatch && (method === "PUT" || method === "PATCH")) {
      const uId = singleUserMatch[1];
      if (!["GLOBAL_ADMIN", "DEPT_ADMIN", "MANAGER"].includes(loggedIn.role) && loggedIn.id !== uId) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const userIndex = db.users.findIndex(u => u.id === uId);
      if (userIndex === -1) return jsonResponse({ error: "User not found" }, 404);

      const fields = body;
      db.users[userIndex] = {
        ...db.users[userIndex],
        ...fields,
        updatedAt: new Date().toISOString()
      };
      saveDb();
      const { passwordHash, ...rest } = db.users[userIndex];
      return jsonResponse(rest);
    }

    if (path === "users/me/availability" && method === "PUT") {
      const userIndex = db.users.findIndex(u => u.id === loggedIn.id);
      if (userIndex === -1) return jsonResponse({ error: "User not found" }, 404);
      const { isAvailableForAssignment } = body;
      db.users[userIndex].isAvailableForAssignment = !!isAvailableForAssignment;
      db.users[userIndex].updatedAt = new Date().toISOString();
      saveDb();
      const { passwordHash, ...rest } = db.users[userIndex];
      return jsonResponse(rest);
    }

    // ============================================
    // INVITATIONS
    // ============================================
    if (path === "invitations") {
      if (method === "GET") {
        if (!["GLOBAL_ADMIN", "DEPT_ADMIN"].includes(loggedIn.role)) {
          return jsonResponse({ error: "Forbidden: Admin access only" }, 403);
        }
        let invites = [...db.invitations];
        if (loggedIn.role === "DEPT_ADMIN") {
          invites = invites.filter(i => i.departmentId === loggedIn.departmentId);
        }
        const joined = invites.map(i => {
          const dept = db.departments.find(d => d.id === i.departmentId);
          const cIds = (i as any).categoryIds;
          const ids = cIds && cIds.length > 0 ? cIds : (i.categoryId ? [i.categoryId] : []);
          const cats = ids.map(id => db.ticketCategories.find(c => c.id === id)).filter(Boolean);
          return {
            ...i,
            departmentName: dept ? dept.name : undefined,
            categoryName: cats.length > 0 ? cats.map(c => c!.name).join(", ") : undefined,
            categoryNames: cats.map(c => c!.name)
          };
        });
        return jsonResponse(joined);
      }
      if (method === "POST") {
        if (!["GLOBAL_ADMIN", "DEPT_ADMIN"].includes(loggedIn.role)) {
          return jsonResponse({ error: "Forbidden: Admin access only" }, 403);
        }
        const { email, role, departmentId, supportLevel, categoryId, categoryIds } = body;
        if (!email || !role) {
          return jsonResponse({ error: "Email and role are required" }, 400);
        }
        const resolvedCategoryIds = categoryIds && Array.isArray(categoryIds) ? categoryIds : (categoryId ? [categoryId] : []);
        const tokenVal = "token-" + uuid();
        const newInvite = {
          id: "invite-" + uuid(),
          companyId: loggedIn.companyId || "company-default",
          email,
          invitedById: loggedIn.id,
          role,
          departmentId: departmentId || loggedIn.departmentId || null,
          categoryId: resolvedCategoryIds[0] || null,
          categoryIds: resolvedCategoryIds,
          supportLevel: supportLevel || "L1",
          status: "PENDING" as any,
          token: tokenVal,
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          createdAt: new Date().toISOString()
        };
        db.invitations.push(newInvite);
        db.auditLogs.push({
          id: "audit-" + uuid(),
          userId: loggedIn.id,
          action: `Sent operator invitation to ${email}`,
          entityType: "Invitation",
          entityId: newInvite.id,
          createdAt: new Date().toISOString()
        });
        saveDb();
        return jsonResponse(newInvite);
      }
    }

    const inviteResendMatch = path.match(/^invitations\/([^/]+)\/resend$/);
    if (inviteResendMatch && method === "POST") {
      const inviteId = inviteResendMatch[1];
      const invite = db.invitations.find(i => i.id === inviteId);
      if (!invite) return jsonResponse({ error: "Invitation not found" }, 404);
      invite.expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: loggedIn.id,
        action: `Resent operator invitation to ${invite.email}`,
        entityType: "Invitation",
        entityId: invite.id,
        createdAt: new Date().toISOString()
      });
      saveDb();
      return jsonResponse(invite);
    }

    const inviteCancelMatch = path.match(/^invitations\/([^/]+)\/cancel$/);
    if (inviteCancelMatch && method === "POST") {
      const inviteId = inviteCancelMatch[1];
      const invite = db.invitations.find(i => i.id === inviteId);
      if (!invite) return jsonResponse({ error: "Invitation not found" }, 404);
      invite.status = "CANCELLED" as any;
      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: loggedIn.id,
        action: `Cancelled operator invitation to ${invite.email}`,
        entityType: "Invitation",
        entityId: invite.id,
        createdAt: new Date().toISOString()
      });
      saveDb();
      return jsonResponse(invite);
    }

    if (path === "invitations/accept" && method === "POST") {
      const { token, fullName, password } = body;
      const inviteIndex = db.invitations.findIndex(i => i.token === token);
      if (inviteIndex === -1) {
        return jsonResponse({ error: "Invitation link not found" }, 404);
      }
      const invite = db.invitations[inviteIndex];
      if (invite.status !== "PENDING" && invite.status !== "EXPIRED") {
        return jsonResponse({ error: "Invitation link already accepted or cancelled" }, 400);
      }
      if (new Date(invite.expiresAt).getTime() < Date.now()) {
        invite.status = "EXPIRED" as any;
        saveDb();
        return jsonResponse({ error: "Invitation has expired" }, 400);
      }

      const newUser = {
        id: "user-" + uuid(),
        companyId: invite.companyId,
        email: invite.email,
        fullName,
        employeeId: "EMP" + Math.floor(100 + Math.random() * 900),
        passwordHash: password,
        departmentId: invite.departmentId || "dept-it",
        managerId: invite.invitedById,
        role: invite.role,
        supportLevel: invite.supportLevel || "L1",
        isActive: true,
        isAvailableForAssignment: true,
        maxActiveTickets: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.users.push(newUser);
      invite.status = "ACCEPTED" as any;

      const cIds = (invite as any).categoryIds;
      const ids = cIds && cIds.length > 0 ? cIds : (invite.categoryId ? [invite.categoryId] : []);
      ids.forEach(catId => {
        if (catId) {
          db.categoryAgents.push({
            id: "ca-" + uuid(),
            categoryId: catId,
            userId: newUser.id,
            proficiency: 3,
            createdAt: new Date().toISOString()
          });
        }
      });

      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: newUser.id,
        action: `Accepted invitation and joined as ${invite.role}`,
        entityType: "User",
        entityId: newUser.id,
        createdAt: new Date().toISOString()
      });

      saveDb();
      return jsonResponse({ token: newUser.id, user: newUser });
    }


    // ============================================
    // KEYWORDS & SUGGESTIONS
    // ============================================
    if (path === "keywords") {
      if (method === "GET") {
        const deptId = searchParams.get("departmentId");
        let list = [...db.keywords];
        if (deptId) {
          list = list.filter(k => k.departmentId === deptId);
        }
        return jsonResponse(list);
      }
      if (method === "POST") {
        if (!["GLOBAL_ADMIN", "DEPT_ADMIN"].includes(loggedIn.role)) {
          return jsonResponse({ error: "Forbidden" }, 403);
        }
        const { departmentId, name, synonyms } = body;
        const newKw = {
          id: "kw-" + uuid(),
          departmentId,
          name,
          synonyms: synonyms || [],
          createdAt: new Date().toISOString()
        };
        db.keywords.push(newKw);
        saveDb();
        return jsonResponse(newKw);
      }
    }

    const singleKeywordMatch = path.match(/^keywords\/([^/]+)$/);
    if (singleKeywordMatch && method === "DELETE") {
      const kwId = singleKeywordMatch[1];
      if (!["GLOBAL_ADMIN", "DEPT_ADMIN"].includes(loggedIn.role)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      db.keywords = db.keywords.filter(k => k.id !== kwId);
      saveDb();
      return jsonResponse({ success: true });
    }

    const kwSugMatch = path.match(/^keywords\/departments\/([^/]+)\/suggestions$/);
    if (kwSugMatch && method === "GET") {
      const deptId = kwSugMatch[1];
      const statusFilter = searchParams.get("status");
      let list = db.keywordSuggestions.filter(s => s.departmentId === deptId);
      if (statusFilter) {
        list = list.filter(s => s.status === statusFilter);
      }
      return jsonResponse(list);
    }

    const promoteSugMatch = path.match(/^keywords\/suggestions\/([^/]+)\/promote$/);
    if (promoteSugMatch && method === "POST") {
      const sugId = promoteSugMatch[1];
      const sugIndex = db.keywordSuggestions.findIndex(s => s.id === sugId);
      if (sugIndex === -1) return jsonResponse({ error: "Suggestion not found" }, 404);
      db.keywordSuggestions[sugIndex].status = "PROMOTED";

      // Add to keywords
      const sug = db.keywordSuggestions[sugIndex];
      const newKw = {
        id: "kw-" + uuid(),
        departmentId: sug.departmentId,
        name: sug.term.charAt(0).toUpperCase() + sug.term.slice(1),
        synonyms: [],
        createdAt: new Date().toISOString()
      };
      db.keywords.push(newKw);
      saveDb();
      return jsonResponse(newKw);
    }

    const rejectSugMatch = path.match(/^keywords\/suggestions\/([^/]+)\/reject$/);
    if (rejectSugMatch && method === "POST") {
      const sugId = rejectSugMatch[1];
      const sugIndex = db.keywordSuggestions.findIndex(s => s.id === sugId);
      if (sugIndex === -1) return jsonResponse({ error: "Suggestion not found" }, 404);
      db.keywordSuggestions[sugIndex].status = "REJECTED";
      saveDb();
      return jsonResponse({ success: true });
    }

    // ============================================
    // TICKETS CRUD & BUSINESS LOGIC
    // ============================================
    if (path === "tickets") {
      if (method === "GET") {
        const isAll = searchParams.get("limit") === "all";
        const page = Number(searchParams.get("page") || 1);
        const limit = Number(searchParams.get("limit") || 10);
        const search = searchParams.get("search")?.toLowerCase() || "";
        const status = searchParams.get("status");
        const priority = searchParams.get("priority");
        const departmentId = searchParams.get("departmentId");
        const assigneeId = searchParams.get("assigneeId");
        const slaBreachedOnly = searchParams.get("slaBreachedOnly") === "true" || searchParams.get("slaBreached") === "true";

        let list = [...db.tickets];

        // Access levels filter
        if (loggedIn.role === "REQUESTER") {
          list = list.filter(t => t.requesterId === loggedIn.id);
        } else if (loggedIn.role === "AGENT") {
          // Can see assigned or same department
          list = list.filter(t => t.assigneeId === loggedIn.id || t.departmentId === loggedIn.departmentId);
        } else if (["MANAGER", "DEPT_MANAGER", "DEPT_ADMIN"].includes(loggedIn.role)) {
          list = list.filter(t => t.departmentId === loggedIn.departmentId);
        }

        // Search & Filters
        if (search) {
          list = list.filter(t =>
            t.title.toLowerCase().includes(search) ||
            t.description.toLowerCase().includes(search) ||
            t.ticketNumber.toLowerCase().includes(search) ||
            t.representative?.toLowerCase().includes(search) ||
            t.clientName?.toLowerCase().includes(search)
          );
        }
        if (status) {
          if (status === "ACTIVE") {
            list = list.filter(t => !["RESOLVED", "CLOSED"].includes(t.status));
          } else {
            list = list.filter(t => t.status === status);
          }
        }
        if (priority) list = list.filter(t => t.priority === priority);
        if (departmentId) list = list.filter(t => t.departmentId === departmentId);
        if (assigneeId) list = list.filter(t => t.assigneeId === assigneeId);
        if (slaBreachedOnly) list = list.filter(t => t.slaBreached);

        // Sort descending by creation
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (isAll) {
          const enrichedAll = list.map(t => {
            const dept = db.departments.find(d => d.id === t.departmentId);
            const cat = db.ticketCategories.find(c => c.id === t.categoryId);
            return {
              ...t,
              departmentName: dept ? dept.name : t.departmentId,
              categoryName: cat ? cat.name : t.categoryId
            };
          });
          return jsonResponse(enrichedAll);
        }

        const total = list.length;
        const totalPages = Math.ceil(total / limit);
        const paginated = list.slice((page - 1) * limit, page * limit);
        const enrichedPaginated = paginated.map(t => {
          const dept = db.departments.find(d => d.id === t.departmentId);
          const cat = db.ticketCategories.find(c => c.id === t.categoryId);
          return {
            ...t,
            departmentName: dept ? dept.name : t.departmentId,
            categoryName: cat ? cat.name : t.categoryId
          };
        });

        return jsonResponse({
          items: enrichedPaginated,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        });
      }

      if (method === "POST") {
        const {
          title,
          description,
          departmentId,
          departmentName,
          categoryId,
          categoryName,
          representative,
          employeeId,
          clientName,
          clientEmail,
          site,
          state,
          priority,
          tags
        } = body;

        let targetDeptId = departmentId;
        if (targetDeptId === "dept-other" || departmentName) {
          let otherDept = db.departments.find(d => d.id === "dept-other" || (departmentName && d.name.toLowerCase() === departmentName.toLowerCase()));
          if (!otherDept) {
            otherDept = {
              id: "dept-" + uuid(),
              companyId: loggedIn.companyId || "company-default",
              name: departmentName || "Other Department",
              description: "Custom department",
              createdAt: new Date().toISOString()
            };
            db.departments.push(otherDept);
          } else if (departmentName) {
            otherDept.name = departmentName;
          }
          targetDeptId = otherDept.id;
        }

        let targetCatId = categoryId;
        if (targetCatId === "cat-other" || categoryName) {
          let otherCat = db.ticketCategories.find(c => c.id === "cat-other" || (categoryName && c.name.toLowerCase() === categoryName.toLowerCase()));
          if (!otherCat) {
            otherCat = {
              id: "cat-" + uuid(),
              departmentId: targetDeptId,
              name: categoryName || "Other Category",
              defaultSlaHours: 24,
              defaultPriority: "P3",
              minSupportLevel: "L1"
            };
            db.ticketCategories.push(otherCat);
          } else if (categoryName) {
            otherCat.name = categoryName;
            otherCat.departmentId = targetDeptId;
          }
          targetCatId = otherCat.id;
        }

        const ticketNumber = "TKT" + String(db.tickets.length + 10000).padStart(5, "0");
        const category = db.ticketCategories.find(c => c.id === targetCatId);
        const finalPriority = priority || category?.defaultPriority || "P3";
        const finalSlaHours = category?.defaultSlaHours || 24;

        // Auto-assignment engine simulation
        let assigneeId = null;
        let assignedAt = null;
        let assignedById = "system";
        let assignmentMethod = "MANUAL";
        let targetSupportLevel = category?.minSupportLevel || "L1";

        // Try load balancing within department
        const eligibleAgents = db.users.filter(u =>
          u.departmentId === targetDeptId &&
          u.role === "AGENT" &&
          u.isActive &&
          u.isAvailableForAssignment
        );

        if (eligibleAgents.length > 0) {
          // Find agent with minimum current active tickets
          let minCount = Infinity;
          let selectedAgent = eligibleAgents[0];

          for (const agent of eligibleAgents) {
            const count = db.tickets.filter(t => t.assigneeId === agent.id && t.status !== "RESOLVED" && t.status !== "CLOSED").length;
            if (count < minCount && count < (agent.maxActiveTickets || 10)) {
              minCount = count;
              selectedAgent = agent;
            }
          }

          if (minCount !== Infinity) {
            assigneeId = selectedAgent.id;
            assignedAt = new Date().toISOString();
            assignmentMethod = "AUTO_LOAD_BALANCE";
          }
        }

        const newTicket = {
          id: "ticket-" + uuid(),
          ticketNumber,
          title,
          description,
          requesterId: loggedIn.id,
          departmentId: targetDeptId,
          categoryId: targetCatId,
          representative,
          employeeId,
          clientName,
          clientEmail,
          dateOfOccurance: new Date().toISOString(),
          site: site || "Headquarters",
          state: state || "Active",
          status: "OPEN" as TicketStatus,
          priority: finalPriority as TicketPriority,
          internalPriority: finalPriority as TicketPriority,
          assigneeId,
          assignedById,
          assignmentMethod,
          assignedAt,
          supportLevel: targetSupportLevel as SupportLevel,
          escalatedToId: null,
          escalatedAt: null,
          escalationReason: null,
          dueDate: new Date(Date.now() + finalSlaHours * 3600 * 1000).toISOString(),
          slaDeadline: new Date(Date.now() + finalSlaHours * 3600 * 1000).toISOString(),
          slaBreached: false,
          resolvedAt: null,
          closedAt: null,
          tags: tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        db.tickets.push(newTicket);

        // Status history log
        db.ticketStatusHistories.push({
          id: "sh-" + uuid(),
          ticketId: newTicket.id,
          fromStatus: null,
          status: "OPEN" as TicketStatus,
          changedById: "system",
          changedAt: new Date().toISOString(),
          note: assigneeId ? `Ticket submitted. Auto-assigned to ${db.users.find(u => u.id === assigneeId)?.fullName}.` : "Ticket submitted. Pending assignment."
        });

        // Audit Log
        db.auditLogs.push({
          id: "audit-" + uuid(),
          userId: loggedIn.id,
          action: `Created Ticket ${ticketNumber}`,
          entityType: "Ticket",
          entityId: newTicket.id,
          createdAt: new Date().toISOString()
        });

        saveDb();
        return jsonResponse(newTicket);
      }
    }

    const singleTicketMatch = path.match(/^tickets\/([^/]+)$/);
    if (singleTicketMatch) {
      const ticketId = singleTicketMatch[1];
      const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) return jsonResponse({ error: "Ticket not found" }, 404);

      if (method === "GET") {
        return jsonResponse(db.tickets[ticketIndex]);
      }

      if (method === "PUT") {
        const updates = body;
        const prevStatus = db.tickets[ticketIndex].status;

        db.tickets[ticketIndex] = {
          ...db.tickets[ticketIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };

        // Audit if status changed
        if (updates.status && updates.status !== prevStatus) {
          db.ticketStatusHistories.push({
            id: "sh-" + uuid(),
            ticketId,
            fromStatus: prevStatus as TicketStatus | null,
            status: updates.status as TicketStatus,
            changedById: loggedIn.id,
            changedAt: new Date().toISOString(),
            note: `Status manually changed to ${updates.status}`
          });

          db.auditLogs.push({
            id: "audit-" + uuid(),
            userId: loggedIn.id,
            action: `Status changed to ${updates.status} on ${db.tickets[ticketIndex].ticketNumber}`,
            entityType: "Ticket",
            entityId: ticketId,
            createdAt: new Date().toISOString()
          });
        }

        saveDb();
        return jsonResponse(db.tickets[ticketIndex]);
      }
    }

    // Assign / Reassign
    const ticketAssignMatch = path.match(/^tickets\/([^/]+)\/assign$/);
    if (ticketAssignMatch && method === "POST") {
      const ticketId = ticketAssignMatch[1];
      const { agentId } = body;
      const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) return jsonResponse({ error: "Ticket not found" }, 404);

      db.tickets[ticketIndex].assigneeId = agentId;
      db.tickets[ticketIndex].assignedAt = new Date().toISOString();
      db.tickets[ticketIndex].assignedById = loggedIn.id;
      db.tickets[ticketIndex].assignmentMethod = "MANUAL";
      db.tickets[ticketIndex].updatedAt = new Date().toISOString();

      const agent = db.users.find(u => u.id === agentId);
      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: loggedIn.id,
        action: `Assigned Ticket ${db.tickets[ticketIndex].ticketNumber} to ${agent ? agent.fullName : "Agent"}`,
        entityType: "Ticket",
        entityId: ticketId,
        createdAt: new Date().toISOString()
      });

      saveDb();
      return jsonResponse(db.tickets[ticketIndex]);
    }

    const ticketReassignMatch = path.match(/^tickets\/([^/]+)\/reassign$/);
    if (ticketReassignMatch && method === "POST") {
      const ticketId = ticketReassignMatch[1];
      const { agentId } = body;
      const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) return jsonResponse({ error: "Ticket not found" }, 404);

      db.tickets[ticketIndex].assigneeId = agentId;
      db.tickets[ticketIndex].assignedAt = new Date().toISOString();
      db.tickets[ticketIndex].assignedById = loggedIn.id;
      db.tickets[ticketIndex].assignmentMethod = "MANUAL";
      db.tickets[ticketIndex].updatedAt = new Date().toISOString();

      const agent = db.users.find(u => u.id === agentId);
      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: loggedIn.id,
        action: `Reassigned Ticket ${db.tickets[ticketIndex].ticketNumber} to ${agent ? agent.fullName : "Agent"}`,
        entityType: "Ticket",
        entityId: ticketId,
        createdAt: new Date().toISOString()
      });

      saveDb();
      return jsonResponse(db.tickets[ticketIndex]);
    }

    // Escalate Ticket
    const ticketEscalateMatch = path.match(/^tickets\/([^/]+)\/escalate$/);
    if (ticketEscalateMatch && method === "POST") {
      const ticketId = ticketEscalateMatch[1];
      const { reason } = body;
      const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) return jsonResponse({ error: "Ticket not found" }, 404);

      const levels: SupportLevel[] = [SupportLevel.L1, SupportLevel.L2, SupportLevel.L3, SupportLevel.L4];
      const currentLevelIndex = levels.indexOf(db.tickets[ticketIndex].supportLevel as SupportLevel || SupportLevel.L1);
      const nextLevel = levels[Math.min(currentLevelIndex + 1, levels.length - 1)];

      db.tickets[ticketIndex].supportLevel = nextLevel;
      db.tickets[ticketIndex].escalatedAt = new Date().toISOString();
      db.tickets[ticketIndex].escalationReason = reason;
      db.tickets[ticketIndex].updatedAt = new Date().toISOString();

      // Create escalation record
      const escalation = {
        id: "esc-" + uuid(),
        ticketId,
        fromLevel: levels[currentLevelIndex],
        toLevel: nextLevel,
        reason,
        escalatedById: loggedIn.id,
        createdAt: new Date().toISOString()
      };
      db.ticketEscalations.push(escalation);

      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: loggedIn.id,
        action: `Escalated Ticket ${db.tickets[ticketIndex].ticketNumber} to ${nextLevel}`,
        entityType: "Ticket",
        entityId: ticketId,
        createdAt: new Date().toISOString()
      });

      saveDb();
      return jsonResponse(db.tickets[ticketIndex]);
    }

    // Resolve & Reopen
    const ticketResolveMatch = path.match(/^tickets\/([^/]+)\/resolve$/);
    if (ticketResolveMatch && method === "POST") {
      const ticketId = ticketResolveMatch[1];
      const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) return jsonResponse({ error: "Ticket not found" }, 404);

      const prevStatus = db.tickets[ticketIndex].status;
      db.tickets[ticketIndex].status = "RESOLVED" as TicketStatus;
      db.tickets[ticketIndex].resolvedAt = new Date().toISOString();
      db.tickets[ticketIndex].updatedAt = new Date().toISOString();

      db.ticketStatusHistories.push({
        id: "sh-" + uuid(),
        ticketId,
        fromStatus: prevStatus as TicketStatus | null,
        status: "RESOLVED" as TicketStatus,
        changedById: loggedIn.id,
        changedAt: new Date().toISOString(),
        note: "Ticket resolved by support agent."
      });

      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: loggedIn.id,
        action: `Resolved Ticket ${db.tickets[ticketIndex].ticketNumber}`,
        entityType: "Ticket",
        entityId: ticketId,
        createdAt: new Date().toISOString()
      });

      saveDb();
      return jsonResponse(db.tickets[ticketIndex]);
    }

    const ticketReopenMatch = path.match(/^tickets\/([^/]+)\/reopen$/);
    if (ticketReopenMatch && method === "POST") {
      const ticketId = ticketReopenMatch[1];
      const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) return jsonResponse({ error: "Ticket not found" }, 404);

      const prevStatus = db.tickets[ticketIndex].status;
      db.tickets[ticketIndex].status = "IN_PROGRESS" as TicketStatus;
      db.tickets[ticketIndex].resolvedAt = null;
      db.tickets[ticketIndex].updatedAt = new Date().toISOString();

      db.ticketStatusHistories.push({
        id: "sh-" + uuid(),
        ticketId,
        fromStatus: prevStatus as TicketStatus | null,
        status: "IN_PROGRESS" as TicketStatus,
        changedById: loggedIn.id,
        changedAt: new Date().toISOString(),
        note: "Ticket reopened."
      });

      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: loggedIn.id,
        action: `Reopened Ticket ${db.tickets[ticketIndex].ticketNumber}`,
        entityType: "Ticket",
        entityId: ticketId,
        createdAt: new Date().toISOString()
      });

      saveDb();
      return jsonResponse(db.tickets[ticketIndex]);
    }

    // Status History
    const ticketStatusHistoryMatch = path.match(/^tickets\/([^/]+)\/status-history$/);
    if (ticketStatusHistoryMatch && method === "GET") {
      const ticketId = ticketStatusHistoryMatch[1];
      const histories = db.ticketStatusHistories.filter(sh => sh.ticketId === ticketId);
      histories.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

      const result = histories.map(sh => {
        let changerName = "System";
        let changerEmail = "";
        if (sh.changedById && sh.changedById !== "system") {
          const changer = db.users.find(u => u.id === sh.changedById);
          if (changer) {
            changerName = changer.fullName;
            changerEmail = changer.email;
          }
        }
        return {
          ...sh,
          changerName,
          changerEmail
        };
      });
      return jsonResponse(result);
    }

    // Escalations list
    const ticketEscalationsMatch = path.match(/^tickets\/([^/]+)\/escalations$/);
    if (ticketEscalationsMatch && method === "GET") {
      const ticketId = ticketEscalationsMatch[1];
      const escs = db.ticketEscalations.filter(e => e.ticketId === ticketId);
      escs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return jsonResponse(escs);
    }

    // Comments CRUD
    const ticketCommentsMatch = path.match(/^tickets\/([^/]+)\/comments$/);
    if (ticketCommentsMatch) {
      const ticketId = ticketCommentsMatch[1];
      if (method === "GET") {
        let list = db.ticketComments.filter(c => c.ticketId === ticketId);
        // Requester cannot see internal comments
        if (loggedIn.role === "REQUESTER") {
          list = list.filter(c => !c.isInternal);
        }
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const joined = list.map(c => {
          const u = db.users.find(user => user.id === c.userId);
          return {
            ...c,
            userFullName: u ? u.fullName : "System Agent",
            userEmail: u ? u.email : "agent@company.com",
            userRole: u ? u.role : "AGENT"
          };
        });
        return jsonResponse(joined);
      }
      if (method === "POST") {
        const { commentText, isInternal } = body;
        const newComment = {
          id: "comment-" + uuid(),
          ticketId,
          userId: loggedIn.id,
          commentText,
          isInternal: !!isInternal,
          createdAt: new Date().toISOString()
        };
        db.ticketComments.push(newComment);
        saveDb();
        return jsonResponse(newComment);
      }
    }

    // Attachments CRUD
    const ticketAttachmentsMatch = path.match(/^tickets\/([^/]+)\/attachments$/);
    if (ticketAttachmentsMatch) {
      const ticketId = ticketAttachmentsMatch[1];
      if (method === "GET") {
        const list = db.ticketAttachments.filter(a => a.ticketId === ticketId);
        return jsonResponse(list);
      }
      if (method === "POST") {
        const { fileName, fileUrl } = body;
        const newAttach = {
          id: "attach-" + uuid(),
          ticketId,
          fileName,
          fileUrl: fileUrl || "https://example.com/placeholder-doc.pdf",
          uploadedBy: loggedIn.fullName,
          createdAt: new Date().toISOString()
        };
        db.ticketAttachments.push(newAttach);
        saveDb();
        return jsonResponse(newAttach);
      }
    }

    // ============================================
    // ADMIN UTILITIES
    // ============================================
    if (path === "admin/run-sla-sweep" && method === "POST") {
      let count = 0;
      const now = new Date();
      db.tickets.forEach(t => {
        if (t.status !== "RESOLVED" && t.status !== "CLOSED" && !t.slaBreached) {
          if (new Date(t.slaDeadline).getTime() < now.getTime()) {
            t.slaBreached = true;
            count++;
            db.auditLogs.push({
              id: "audit-" + uuid(),
              userId: "system",
              action: `SLA Breached warning generated for ${t.ticketNumber}`,
              entityType: "Ticket",
              entityId: t.id,
              createdAt: now.toISOString()
            });
          }
        }
      });
      if (count > 0) saveDb();
      return jsonResponse({ success: true, processedCount: db.tickets.length, breachedCount: count });
    }

    if (path === "admin/expire-invitations" && method === "POST") {
      let count = 0;
      const now = new Date();
      db.invitations.forEach(i => {
        if (i.status === "PENDING" && new Date(i.expiresAt).getTime() < now.getTime()) {
          i.status = "EXPIRED" as any;
          count++;
        }
      });
      if (count > 0) saveDb();
      return jsonResponse({ success: true, expiredCount: count });
    }

    // ============================================
    // MANAGER DASHBOARD
    // ============================================
    if (path === "manager-dashboard/team" && method === "GET") {
      if (loggedIn.role !== "DEPT_MANAGER") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const deptId = loggedIn.departmentId;
      const dept = db.departments.find(d => d.id === deptId);
      const members = db.users.filter(u => u.departmentId === deptId && u.id !== loggedIn.id && u.isActive);

      const usersWithStats = members.map(u => {
        const assigned = db.tickets.filter(t => t.assigneeId === u.id);
        const activeAssigned = assigned.filter(t => t.status !== "RESOLVED");
        const openCount = assigned.filter(t => t.status === "OPEN").length;
        const inProgressCount = assigned.filter(t => t.status === "IN_PROGRESS").length;
        const resolvedCount = assigned.filter(t => t.status === "RESOLVED").length;
        const breachedCount = assigned.filter(t => t.slaBreached && t.status !== "RESOLVED").length;
        const requested = db.tickets.filter(t => t.requesterId === u.id).length;

        return {
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          isAvailableForAssignment: u.isAvailableForAssignment,
          activeTickets: activeAssigned.length,
          totalRequested: requested,
          openTickets: openCount,
          inProgressTickets: inProgressCount,
          resolvedTickets: resolvedCount,
          breachedTickets: breachedCount,
        };
      });

      return jsonResponse({
        departmentId: deptId,
        departmentName: dept?.name || "Unknown",
        users: usersWithStats,
      });
    }

    const managerUserTicketsMatch = path.match(/^manager-dashboard\/user\/([^/]+)\/tickets$/);
    if (managerUserTicketsMatch && method === "GET") {
      if (loggedIn.role !== "DEPT_MANAGER") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const targetUserId = managerUserTicketsMatch[1];
      const targetUser = db.users.find(u => u.id === targetUserId);
      if (!targetUser) return jsonResponse({ error: "User not found" }, 404);

      if (targetUser.departmentId !== loggedIn.departmentId && loggedIn.role !== "GLOBAL_ADMIN") {
        return jsonResponse({ error: "User is not in your department" }, 403);
      }

      let tickets = db.tickets.filter(t =>
        (t.assigneeId === targetUserId || t.requesterId === targetUserId) &&
        t.departmentId === loggedIn.departmentId
      );
      tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const enriched = tickets.map(t => {
        const requester = db.users.find(u => u.id === t.requesterId);
        const assignee = db.users.find(u => u.id === t.assigneeId);
        const dept = db.departments.find(d => d.id === t.departmentId);
        const cat = db.ticketCategories.find(c => c.id === t.categoryId);
        const ticketComments = db.ticketComments
          .filter(c => c.ticketId === t.id)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(c => {
            const commentUser = db.users.find(u => u.id === c.userId);
            return { ...c, user: { fullName: commentUser?.fullName || "User" } };
          });

        return {
          ...t,
          requester: requester ? { fullName: requester.fullName, email: requester.email } : undefined,
          assignee: assignee ? { fullName: assignee.fullName, email: assignee.email } : undefined,
          department: dept ? { name: dept.name } : undefined,
          category: cat ? { name: cat.name } : undefined,
          comments: ticketComments,
        };
      });

      return jsonResponse({
        user: { id: targetUserId, fullName: targetUser.fullName },
        tickets: enriched,
      });
    }

    if (path === "manager-dashboard/reassign" && method === "POST") {
      if (loggedIn.role !== "DEPT_MANAGER") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const { ticketId, newAssigneeId } = body;
      const ticketIndex = db.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) return jsonResponse({ error: "Ticket not found" }, 404);
      if (db.tickets[ticketIndex].assigneeId === newAssigneeId) {
        return jsonResponse({ error: "Ticket is already assigned to this user" }, 400);
      }

      const newAssignee = db.users.find(u => u.id === newAssigneeId);
      if (!newAssignee || !newAssignee.isActive) {
        return jsonResponse({ error: "New assignee not found or inactive" }, 400);
      }

      db.tickets[ticketIndex].assigneeId = newAssigneeId;
      db.tickets[ticketIndex].assignedById = loggedIn.id;
      db.tickets[ticketIndex].assignmentMethod = "MANUAL";
      db.tickets[ticketIndex].assignedAt = new Date().toISOString();
      db.tickets[ticketIndex].updatedAt = new Date().toISOString();

      db.auditLogs.push({
        id: "audit-" + uuid(),
        userId: loggedIn.id,
        action: `Reassigned Ticket ${db.tickets[ticketIndex].ticketNumber} to ${newAssignee.fullName}`,
        entityType: "Ticket",
        entityId: ticketId,
        createdAt: new Date().toISOString()
      });

      saveDb();
      return jsonResponse(db.tickets[ticketIndex]);
    }

    if (path === "manager-dashboard/set-manager" && method === "POST") {
      if (loggedIn.role !== "GLOBAL_ADMIN") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const { userId } = body;
      const userIndex = db.users.findIndex(u => u.id === userId);
      if (userIndex === -1) return jsonResponse({ error: "User not found" }, 404);
      if (!db.users[userIndex].departmentId) {
        return jsonResponse({ error: "User must belong to a department first" }, 400);
      }
      if (db.users[userIndex].role === "DEPT_MANAGER") {
        return jsonResponse({ error: "User is already a Department Manager" }, 400);
      }
      db.users[userIndex].role = "DEPT_MANAGER";
      db.users[userIndex].updatedAt = new Date().toISOString();
      saveDb();
      const { passwordHash, ...rest } = db.users[userIndex];
      return jsonResponse(rest);
    }

    // Return 404 for unhandled API endpoints
    return jsonResponse({ error: `Not Found: ${method} /api/${path}` }, 404);

  } catch (error: any) {
    console.error("Mock API Error:", error);
    return jsonResponse({ error: error.message || "Internal Mock API Error" }, 500);
  }
};

try {
  Object.defineProperty(window, "fetch", {
    value: mockFetch,
    configurable: true,
    writable: true,
    enumerable: true
  });
} catch (e) {
  try {
    (window as any).fetch = mockFetch;
  } catch (err) {
    console.error("Could not override window.fetch:", err);
  }
}
