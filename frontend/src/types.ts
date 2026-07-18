export enum UserRole {
  GLOBAL_ADMIN = "GLOBAL_ADMIN",
  HOD = "HOD",
  AGENT = "AGENT",
  REQUESTER = "REQUESTER",
  CXO = "CXO"
}

export enum SupportLevel {
  L1 = "L1",
  L2 = "L2",
  L3 = "L3",
  L4 = "L4"
}

export enum TicketPriority {
  P1 = "P1",
  P2 = "P2",
  P3 = "P3",
  P4 = "P4"
}

export enum TicketStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING = "PENDING",
  ON_HOLD = "ON_HOLD",
  RESOLVED = "RESOLVED",
  REOPENED  = "REOPENED"
}

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED"
}

export interface User {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  employeeId?: string;
  departments: string[];
  managerId?: string;
  role: UserRole;
  supportLevel?: SupportLevel;
  isActive: boolean;
  isAvailableForAssignment: boolean;
  maxActiveTickets: number;
  _count: {
    ticketsAssigned : number
  };
  createdAt: string;
  updatedAt: string;
  skills?: { id: string; proficiency: number; name: string }[];
}

export interface RequestorDirectoryEntry {
  id: string;
  fullName: string;
  email: string;
  employeeId?: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  isActive: boolean;
  createdAt: string;
  _count: { ticketsRequested: number };
}

export interface AdminMessage {
  id: string;
  userId: string;
  fromAdminId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  fromAdmin?: { fullName: string };
}

export interface Project {
  id: string;
  name: string;
  isShutdownJob: boolean;
  clientId: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  isKeyClient: boolean;
  projects: Project[];
  createdAt: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  createdAt: string;
  _count :{
    agents : number,
    tickets : number
  } 
}

export interface DepartmentSuggestions {
  id : string,
  name : string
}

export interface SubDepartment {
  id: string;
  departmentId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface TicketCategory {
  id: string;
  departmentId: string;
  // Optional - when set, this category only shows up once this
  // sub-department is selected. When unset it's a department-wide category.
  subDepartmentId?: string | null;
  name: string;
  defaultSlaMinutes?: number;
  defaultPriority: TicketPriority;
  // NOTE: only ever populated in responses to GLOBAL_ADMIN / HOD - the
  // backend strips these two fields out for every other role.
  isWorkStopping?: boolean;
  isSafetyViolation?: boolean;
}

export interface Keyword {
  id: string;
  departmentId: string;
  name: string;
  synonyms: string[];
  createdAt: string;
}

export interface KeywordSuggestion {
  id: string;
  departmentId: string;
  term: string;
  occurrenceCount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  promotedKeywordId?: string;
  reviewedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  commentText: string;
  isInternal: boolean;
  createdAt: string;
  user?: { fullName: string };
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  requesterId: string;
  departmentId: string;
  categoryId?: string;
  representative?: string;
  employeeId?: string;
  clientName: string;
  clientEmail: string;
  dateOfOccurance: string;
  site: string;
  state: string;
  // NOTE(added): requester's designation at the client org, and the project
  // (under the ticket's client) this issue relates to.
  designation?: "CEO" | "COO" | "CXO" | "HOD" | "EMPLOYEE";
  projectId?: string;
  status: TicketStatus;
  priority: TicketPriority;
  internalPriority: TicketPriority;
  assigneeId?: string;
  assignedById?: string;
  assignmentMethod?: string;
  assignedAt?: string;
  supportLevel?: SupportLevel;
  dueDate?: string;
  slaDeadline?: string;
  slaBreached: boolean;
  resolvedAt?: string;
  closedAt?: string;
  // SLA/TAT pause-resume bookkeeping - see backend slaClock.service.ts.
  holdStartedAt?: string;
  totalHoldMinutes?: number;
  slaRemainingMinutes?: number;
  turnOverTime?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  requester?: { fullName: string; email: string; employeeId?: string; role?: UserRole,id :string };
  assignee?: { fullName: string; email: string; supportLevel?: SupportLevel };
  department?: { id:string , name: string };
  category?: { name: string; defaultSlaMinutes?: number };
  comments?: TicketComment[];
}

export interface Comment {
  id: string;
  ticketId: string;
  userId: string;
  commentText: string;
  isInternal: boolean;
  createdAt: string;
  user:{
    fullName : string,
    role : string,
  } 
  userRole?: string;
}

export interface Attachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
  uploaderName?: string;
}

export interface Escalation {
  id: string;
  ticketId: string;
  fromLevel?: SupportLevel;
  toLevel: SupportLevel;
  escalatedById: string;
  escalatedToId: string;
  reason: string;
  isAutomatic: boolean;
  createdAt: string;
  escalatedBy?: {fullName:string};
  escalatedTo?: {fullName:string};
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
  userEmail?: string;
  userFullName?: string;
}

export interface Invitation {
  id: string;
  companyId: string;
  email: string;
  invitedById: string;
  role: UserRole;
  department:[{
    name :string}];
  categoryId?: string;
  categoryIds?: string[];
  supportLevel?: SupportLevel;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
  departmentName?: string;
  categoryName?: string;
  categoryNames?: string[];
}

export interface DepartmentTeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isAvailableForAssignment: boolean;
  activeTickets: number;
  totalRequested: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  onHoldTickets: number;
  breachedTickets: number;
  escalatedTickets: number;
  departmentId?: string;
  departmentName?: string;
}

export interface DepartmentTeam {
  departmentId: string;
  departmentName: string;
  users: DepartmentTeamMember[];
}

export interface TicketStatusHistory {
  id: string;
  ticketId: string;
  fromStatus: TicketStatus | null;
  status: TicketStatus;
  changedBy: {
    fullName :string
  };
  changedAt: string;
  note?: string;
  changerName?: string;
  changerEmail?: string;
}

export const PAGES = { 
  DASHBOARD : "DASHBOARD",
  ASSINGED_TICKETS : "ASSINGED_TICKETS",
  USER_DIRECTORY :  "USER_DIRECTORY",
  CLIENTS : "CLIENTS",
  PENDING_INVITES : "PENDING_INVITES",
  DEPARTMENTS : "DEPARTMENTS",
  AUDIT_LOGS : "AUDIT_LOGS",
  ON_HOLD : "ON_HOLD",
  HOD_DASHBOARD : "HOD_DASHBOARD",
  CXO_DASHBOARD : "CXO_DASHBOARD",
  NEW_TICKET : "NEW_TICKET",
  MY_TICKETS : "MY_TICKETS",
  BREACHED_TICKETS : "BREACHED_TICKETS",
  PROFILE : "PROFILE",
  TICKET_DETAILS : "TICKET_DETAILS",
  RESOLVED_TICKETS : "RESOLVED_TICKETS",
  AGENT_ANALYTICS : "AGENT_ANALYTICS",
  HOD_ANALYTICS : "HOD_ANALYTICS",
  CXO_ANALYTICS : "CXO_ANALYTICS",
  REQUESTOR_DIRECTORY : "REQUESTOR_DIRECTORY"
}


export interface metric {
        openTickets : number
        assignedTickets : number,
        slaBreachedTickets : number,
        resolvedTickets : number,
        onhold : number
}

export const ROLES = {
  GLOBAL_ADMIN : "GLOBAL_ADMIN",
  HOD : "HOD",
  AGENT : "AGENT",
  REQUESTER : "REQUESTER",
  CXO : "CXO"
}
