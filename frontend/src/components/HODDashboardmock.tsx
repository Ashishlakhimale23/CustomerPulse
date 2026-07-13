import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Ticket as TicketIcon,
  CircleDot,
  AlertTriangle,
  PauseCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Flame,
  Layers,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  ChevronDown as ChevronDownIcon,
  Check,
  ChevronLeft,
} from "lucide-react";

// ============================================================================
// Domain types — mirrors the Prisma schema (subset relevant to this view)
// ============================================================================

type SupportLevel = "L1" | "L2";
type TicketPriority = "P1" | "P2" | "P3" | "P4";
type TicketStatus = "OPEN" | "IN_PROGRESS" | "ON_HOLD" | "RESOLVED";
type AssignmentMethod =
  | "AUTO_KEYWORD"
  | "AUTO_LOAD_BALANCE"
  | "MANUAL"
  | "ESCALATION"
  | "AUTO_CATEGORY";

interface Department {
  id: string;
  name: string;
  description: string;
}

interface Agent {
  id: string;
  fullName: string;
  supportLevel: SupportLevel;
  isAvailableForAssignment: boolean;
  maxActiveTickets: number;
  departmentId: string;
}

interface Category {
  id: string;
  name: string;
  defaultPriority: TicketPriority;
  departmentId: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  categoryId: string;
  departmentId: string;
  assigneeId: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  resolvedAt: Date | null;
  slaDeadline: Date;
  slaBreached: boolean;
  assignmentMethod: AssignmentMethod | null;
  isAutomaticEscalation: boolean;
  turnoverHours: number;
}

// ============================================================================
// Deterministic mock data — swap this block for real API/Prisma queries.
// HOD oversees 3 departments; every entity is scoped to a departmentId.
// ============================================================================

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260711);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const NOW = new Date();

// The HOD's departments
const ALL_DEPARTMENTS: Department[] = [
  { id: "d1", name: "Network & Infrastructure", description: "Network, VPN, hardware and security" },
  { id: "d2", name: "Software & Applications",  description: "App support, installs, access management" },
  { id: "d3", name: "People Operations",         description: "Payroll systems, HR tools, onboarding" },
];

const FIRST_NAMES = ["Priya", "Diego", "Meera", "Tom", "Farah", "Kwame", "Yuki", "Elena", "Sam", "Noor", "Lucas", "Aiko", "Ravi", "Ines"];
const LAST_NAMES  = ["Nair", "Solano", "Iyer", "Achterberg", "Haddad", "Boateng", "Tanaka", "Petrov", "Owusu", "Khan", "Ferreira", "Mori", "Deshmukh", "Costa"];

// ~4 agents per department
const ALL_AGENTS: Agent[] = Array.from({ length: 12 }, (_, i) => ({
  id: `a${i + 1}`,
  fullName: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
  supportLevel: rng() < 0.45 ? "L2" : "L1",
  isAvailableForAssignment: rng() > 0.1,
  maxActiveTickets: pick([10, 12, 15]),
  departmentId: ALL_DEPARTMENTS[i % ALL_DEPARTMENTS.length].id,
}));

const DEPT_CATEGORIES: Record<string, { name: string; priority: TicketPriority }[]> = {
  d1: [
    { name: "Network & VPN",      priority: "P2" },
    { name: "Hardware",           priority: "P3" },
    { name: "Security Incident",  priority: "P1" },
    { name: "Infrastructure",     priority: "P2" },
  ],
  d2: [
    { name: "Access & Permissions", priority: "P3" },
    { name: "Software Install",     priority: "P4" },
    { name: "App Errors",           priority: "P2" },
    { name: "Integrations",         priority: "P3" },
  ],
  d3: [
    { name: "Payroll Systems",  priority: "P2" },
    { name: "HR Tools",         priority: "P3" },
    { name: "Onboarding",       priority: "P3" },
    { name: "Benefits Portal",  priority: "P4" },
  ],
};

const ALL_CATEGORIES: Category[] = Object.entries(DEPT_CATEGORIES).flatMap(([deptId, cats], di) =>
  cats.map((c, ci) => ({
    id: `c${di * 4 + ci + 1}`,
    name: c.name,
    defaultPriority: c.priority,
    departmentId: deptId,
  }))
);

const STATUS_WEIGHTS: [TicketStatus, number][] = [
  ["OPEN", 0.28],
  ["IN_PROGRESS", 0.24],
  ["ON_HOLD", 0.12],
  ["RESOLVED", 0.36],
];
function weightedStatus(): TicketStatus {
  const r = rng();
  let acc = 0;
  for (const [s, w] of STATUS_WEIGHTS) {
    acc += w;
    if (r <= acc) return s;
  }
  return "RESOLVED";
}

const ALL_TICKETS: Ticket[] = Array.from({ length: 540 }, (_, i) => {
  const dept = pick(ALL_DEPARTMENTS);
  const deptCats = ALL_CATEGORIES.filter(c => c.departmentId === dept.id);
  const deptAgents = ALL_AGENTS.filter(a => a.departmentId === dept.id);
  const daysAgo = Math.floor(rng() * 90);
  const createdAt = new Date(NOW.getTime() - daysAgo * 86400000 - Math.floor(rng() * 86400000));
  const status = weightedStatus();
  const priority = pick<TicketPriority>(["P1", "P2", "P3", "P4", "P2", "P3"]);
  const slaHours = priority === "P1" ? 4 : priority === "P2" ? 24 : priority === "P3" ? 72 : 120;
  const slaDeadline = new Date(createdAt.getTime() + slaHours * 3600000);
  const isResolved = status === "RESOLVED";
  const resolutionHours = Math.max(0.5, rng() * slaHours * 1.6);
  const resolvedAt = isResolved ? new Date(createdAt.getTime() + resolutionHours * 3600000) : null;
  const referenceNow = isResolved ? (resolvedAt as Date) : NOW;
  const slaBreached = referenceNow.getTime() > slaDeadline.getTime();

  return {
    id: `t${i}`,
    ticketNumber: `TCK-${(1000 + i).toString()}`,
    title: "Ticket " + (1000 + i),
    categoryId: pick(deptCats).id,
    departmentId: dept.id,
    assigneeId: pick(deptAgents).id,
    status,
    priority,
    createdAt,
    resolvedAt,
    slaDeadline,
    slaBreached,
    assignmentMethod: pick<AssignmentMethod>(["AUTO_KEYWORD", "AUTO_LOAD_BALANCE", "MANUAL", "AUTO_CATEGORY"]),
    isAutomaticEscalation: rng() < 0.08,
    turnoverHours: isResolved ? resolutionHours : 0,
  };
});

// ============================================================================
// Formatting helpers
// ============================================================================

const fmtHours = (h: number) => (h < 1 ? `${Math.round(h * 60)}m` : h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const daysBetween = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 86400000);

// ============================================================================
// Design system — mapped from the uploaded color palette image
// Primary:     #4B4EFC (500) · #1E22FB (600) · #0408E7 (700)
// Neutral:     #F9FAF8 (50)  · #E5E7EB (200) · #9CA3AF (400) · #6B7280 (500) · #111827 (900)
// Success:     #23C55E (500) · #16A34A (600)
// Warning:     #F59E0B (500) · #D97706 (600)
// Destructive: #EF4444 (500) · #DC2020 (600)
// ============================================================================

const C = {
  // Primary
  primary50:  "#F5F5FF",
  primary100: "#E1E1FE",
  primary200: "#C7C8FD",
  primary500: "#4B4EFC",
  primary600: "#1E22FB",
  primary700: "#0408E7",
  primary800: "#0306BA",
  primary900: "#02058D",

  // Neutral
  neutral0:   "#FFFFFF",
  neutral50:  "#F9FAF8",
  neutral100: "#F3F4F6",
  neutral200: "#E5E7EB",
  neutral300: "#D1D5DB",
  neutral400: "#9CA3AF",
  neutral500: "#6B7280",
  neutral700: "#374151",
  neutral800: "#1F2937",
  neutral900: "#111827",

  // Success
  success50:  "#F0FDF4",
  success200: "#BBF7D0",
  success500: "#23C55E",
  success600: "#16A34A",
  success700: "#15803D",

  // Warning
  warning50:  "#FFFBEB",
  warning200: "#FDE68A",
  warning500: "#F59E0B",
  warning600: "#D97706",

  // Destructive
  destructive50:  "#FEF2F2",
  destructive200: "#FECACA",
  destructive500: "#EF4444",
  destructive600: "#DC2020",
  destructive700: "#B91C1C",
};

// Semantic aliases used throughout the component
const ACCENT_PRIMARY   = C.primary500;
const ACCENT_SECONDARY = C.primary700;
const ACCENT_CHART_A   = C.primary600;  // stacked bar slot A
const ACCENT_CHART_B   = C.success500;  // stacked bar slot B
const ACCENT_CHART_C   = C.warning500;  // stacked bar slot C

const GRID_STROKE  = C.neutral200;
const AXIS_TICK    = C.neutral400;
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: `1px solid ${C.neutral200}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN:        C.primary500,
  IN_PROGRESS: C.primary700,
  ON_HOLD:     C.warning500,
  RESOLVED:    C.success500,
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  P1: C.destructive500,
  P2: C.warning500,
  P3: C.primary500,
  P4: C.neutral400,
};

// ============================================================================
// Small presentational primitives
// ============================================================================

function SectionCard({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4" style={{ border: `1px solid ${C.neutral200}` }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: C.neutral800 }}>{title}</h3>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: C.neutral500 }}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone = "neutral",
  footnote,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "neutral" | "critical" | "warning" | "good" | "info";
  footnote?: string;
  pulse?: boolean;
}) {
  const toneStyle: Record<string, { bg: string; text: string }> = {
    neutral:     { bg: C.neutral100,        text: C.neutral700 },
    critical:    { bg: C.destructive50,     text: C.destructive700 },
    warning:     { bg: C.warning50,         text: C.warning600 },
    good:        { bg: C.success50,         text: C.success700 },
    info:        { bg: C.primary50,         text: C.primary600 },
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3 min-w-0" style={{ border: `1px solid ${C.neutral200}` }}>
      <div className="flex items-center justify-between">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: toneStyle[tone].bg, color: toneStyle[tone].text }}
        >
          {icon}
        </div>
        {pulse && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.destructive500 }}></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: C.destructive600 }}></span>
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-mono font-semibold tabular-nums tracking-tight" style={{ color: C.neutral900 }}>{value}</p>
        <p className="text-xs mt-1" style={{ color: C.neutral500 }}>{label}</p>
        {footnote && <p className="text-[11px] mt-0.5" style={{ color: C.neutral400 }}>{footnote}</p>}
      </div>
    </div>
  );
}

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs font-mono" style={{ color: C.neutral400 }}>—</span>;
  const diff = current - previous;
  const pct = previous === 0 ? 100 : Math.round((diff / previous) * 100);
  const positive = diff <= 0;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-mono" style={{ color: positive ? C.success600 : C.destructive500 }}>
      {diff === 0 ? null : positive ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
      {diff === 0 ? "flat" : `${Math.abs(pct)}%`}
    </span>
  );
}

// ============================================================================
// Export utilities
// ============================================================================

// Using a plain index-signature type for all export rows so toCSV/autoWidth
// can iterate columns generically without needing separate overloads per sheet.
type ExportRow = Record<string, string | number>;

// Build the four export datasets from the already-computed dashboard state
function buildExportData(params: {
  rangeLabel: string;
  stats: {
    totalTickets: number;
    openTickets: number;
    onHoldTickets: number;
    slaBreachedNow: number;
    createdThisPeriod: number;
    resolvedThisPeriod: number;
    avgResolutionHours: number;
    escalationsThisPeriod: number;
  };
  sortedAgentRows: Array<{
    agent: Agent;
    active: number;
    resolved: number;
    avgRes: number;
    breachRate: number;
    escalations: number;
    load: string;
  }>;
  categoryBreakdown: Array<{ name: string; count: number; breached: number }>;
  trendData: Array<{ date: string; created: number; resolved: number }>;
}): { summary: ExportRow[]; agents: ExportRow[]; categories: ExportRow[]; trends: ExportRow[] } {
  const { rangeLabel, stats, sortedAgentRows, categoryBreakdown, trendData } = params;

  const summary: ExportRow[] = [
    { Metric: "Period", Value: rangeLabel },
    { Metric: "Total Tickets (All Time)", Value: stats.totalTickets },
    { Metric: "Open Tickets", Value: stats.openTickets },
    { Metric: "On Hold Tickets", Value: stats.onHoldTickets },
    { Metric: "SLA Breached (Unresolved)", Value: stats.slaBreachedNow },
    { Metric: "Created (Period)", Value: stats.createdThisPeriod },
    { Metric: "Resolved (Period)", Value: stats.resolvedThisPeriod },
    { Metric: "Avg Resolution Time (Period)", Value: fmtHours(stats.avgResolutionHours) },
    { Metric: "Auto Escalations (Period)", Value: stats.escalationsThisPeriod },
  ];

  const agents: ExportRow[] = sortedAgentRows.map((r) => ({
    Agent: r.agent.fullName,
    "Active Tickets": r.active,
    "Max Capacity": r.agent.maxActiveTickets,
    "Load Status": r.load,
    "Resolved (Period)": r.resolved,
    "Avg Resolution Time": r.resolved ? fmtHours(r.avgRes) : "—",
    "SLA Breach Rate": fmtPct(r.breachRate),
    "Escalations (Period)": r.escalations,
  }));

  const categories: ExportRow[] = categoryBreakdown.map((c) => ({
    Category: c.name,
    "Tickets (Period)": c.count,
    "SLA Breached": c.breached,
    "Breach Rate": c.count > 0 ? fmtPct(c.breached / c.count) : "0.0%",
  }));

  const trends: ExportRow[] = trendData.map((d) => ({
    Date: d.date,
    "Tickets Created": d.created,
    "Tickets Resolved": d.resolved,
    "Net (Created - Resolved)": d.created - d.resolved,
  }));

  return { summary, agents, categories, trends };
}

// ============================================================================
// Date range picker
// ============================================================================

type PresetKey =
  | "today" | "yesterday" | "last24"
  | "thisweek" | "lastweek" | "last7"
  | "thismonth" | "lastmonth" | "last30"
  | "thisquarter" | "lastquarter" | "thisyear" | "last90"
  | "alltime" | "custom";

interface ResolvedRange {
  rangeStart: Date;
  rangeEnd: Date;
  prevRangeStart: Date;
  rangeLabel: string;
}

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function endOfDay(d: Date)   { const r = new Date(d); r.setHours(23,59,59,999); return r; }
function startOfWeek(d: Date) { const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r; }
function endOfWeek(d: Date)   { const r = endOfDay(d); r.setDate(r.getDate() + (6 - r.getDay())); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfQuarter(d: Date) { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); }
function endOfQuarter(d: Date)   { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999); }
function addDays(d: Date, n: number) { return new Date(d.getTime() + n * 86400000); }
function fmtDateShort(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function resolvePreset(key: PresetKey, customFrom?: Date, customTo?: Date): ResolvedRange {
  const now = new Date();
  const today = startOfDay(now);
  const ms1d = 86400000;
  let s: Date, e: Date, ps: Date;
  switch (key) {
    case "today":       s=today; e=endOfDay(now); ps=addDays(today,-1); break;
    case "yesterday":   s=addDays(today,-1); e=endOfDay(addDays(today,-1)); ps=addDays(today,-2); break;
    case "last24":      s=new Date(now.getTime()-ms1d); e=now; ps=new Date(now.getTime()-ms1d*2); break;
    case "thisweek":    s=startOfWeek(today); e=endOfWeek(today); ps=addDays(startOfWeek(today),-7); break;
    case "lastweek":    { const lws=addDays(startOfWeek(today),-7); s=lws; e=addDays(lws,6); ps=addDays(lws,-7); break; }
    case "last7":       s=addDays(today,-6); e=endOfDay(now); ps=addDays(today,-13); break;
    case "thismonth":   s=startOfMonth(today); e=endOfMonth(today); ps=startOfMonth(addDays(startOfMonth(today),-1)); break;
    case "lastmonth":   { const lm=addDays(startOfMonth(today),-1); s=startOfMonth(lm); e=endOfMonth(lm); ps=startOfMonth(addDays(s,-1)); break; }
    case "last30":      s=addDays(today,-29); e=endOfDay(now); ps=addDays(today,-59); break;
    case "thisquarter": s=startOfQuarter(today); e=endOfQuarter(today); ps=addDays(startOfQuarter(today),-1); break;
    case "lastquarter": { const lqs=addDays(startOfQuarter(today),-1); s=startOfQuarter(lqs); e=endOfQuarter(lqs); ps=addDays(s,-1); break; }
    case "thisyear":    s=new Date(today.getFullYear(),0,1); e=new Date(today.getFullYear(),11,31,23,59,59,999); ps=new Date(today.getFullYear()-1,0,1); break;
    case "last90":      s=addDays(today,-89); e=endOfDay(now); ps=addDays(today,-179); break;
    case "alltime":     s=new Date(2020,0,1); e=now; ps=new Date(2019,0,1); break;
    case "custom":
      s = customFrom ? startOfDay(customFrom) : addDays(today,-6);
      e = customTo   ? endOfDay(customTo)     : endOfDay(now);
      ps = new Date(s.getTime() - (e.getTime() - s.getTime()));
      break;
    default: s=addDays(today,-6); e=endOfDay(now); ps=addDays(today,-13);
  }
  const labels: Record<PresetKey, string> = {
    today:"Today", yesterday:"Yesterday", last24:"Last 24 hours",
    thisweek:"This week", lastweek:"Last week", last7:"Last 7 days",
    thismonth:"This month", lastmonth:"Last month", last30:"Last 30 days",
    thisquarter:"This quarter", lastquarter:"Last quarter", thisyear:"This year", last90:"Last 90 days",
    alltime:"All time",
    custom: customFrom && customTo
      ? `${fmtDateShort(customFrom)} – ${fmtDateShort(customTo)}`
      : "Custom range",
  };
  return { rangeStart: s, rangeEnd: e, prevRangeStart: ps, rangeLabel: labels[key] };
}

const PRESET_GROUPS: { label: string; options: { key: PresetKey; label: string }[] }[] = [
  { label: "Recent",  options: [{ key:"today",label:"Today"},{ key:"yesterday",label:"Yesterday"},{ key:"last24",label:"Last 24 hours"}] },
  { label: "Weekly",  options: [{ key:"thisweek",label:"This week"},{ key:"lastweek",label:"Last week"},{ key:"last7",label:"Last 7 days"}] },
  { label: "Monthly", options: [{ key:"thismonth",label:"This month"},{ key:"lastmonth",label:"Last month"},{ key:"last30",label:"Last 30 days"}] },
  { label: "Longer range", options: [{ key:"thisquarter",label:"This quarter"},{ key:"lastquarter",label:"Last quarter"},{ key:"thisyear",label:"This year"},{ key:"last90",label:"Last 90 days"}] },
  { label: "Other",   options: [{ key:"alltime",label:"All time"},{ key:"custom",label:"Custom range…"}] },
];

function DateRangePicker({ value, onChange }: { value: PresetKey; onChange: (key: PresetKey, from?: Date, to?: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"presets" | "custom">("presets");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const todayStr = NOW.toISOString().slice(0, 10);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setView("presets"); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setView("presets"); } };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", esc); };
  }, []);

  const resolved = resolvePreset(value);
  const triggerLabel = resolved.rangeLabel;

  const selectPreset = (key: PresetKey) => {
    if (key === "custom") { setView("custom"); return; }
    onChange(key);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    onChange("custom", new Date(customFrom), new Date(customTo));
    setOpen(false);
    setView("presets");
  };

  const customInvalid = !!(customFrom && customTo && customFrom > customTo);
  const customReady   = !!(customFrom && customTo && !customInvalid);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) setView("presets"); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-medium transition-colors bg-white select-none"
        style={{
          border: `1px solid ${open ? C.primary200 : C.neutral200}`,
          color: C.neutral700,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.neutral400 }} />
        <span style={{ minWidth: "7rem", maxWidth: "14rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {triggerLabel}
        </span>
        <ChevronDownIcon
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
          style={{ color: C.neutral400, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 z-40 bg-white rounded-xl overflow-hidden"
          style={{
            top: "calc(100% + 6px)",
            width: view === "custom" ? 288 : 224,
            border: `1px solid ${C.neutral200}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
          }}
          role="listbox"
        >
          {/* ── Preset list ── */}
          {view === "presets" && (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {PRESET_GROUPS.map((group, gi) => (
                <div key={group.label}>
                  {gi > 0 && <div style={{ height: 1, background: C.neutral100, margin: "4px 0" }} />}
                  <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-2.5 pb-1" style={{ color: C.neutral400 }}>
                    {group.label}
                  </p>
                  {group.options.map(opt => {
                    const selected = value === opt.key;
                    return (
                      <button
                        key={opt.key}
                        role="option"
                        aria-selected={selected}
                        onClick={() => selectPreset(opt.key)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors"
                        style={{
                          background: selected ? C.primary50 : "transparent",
                          color: selected ? C.primary800 : C.neutral700,
                        }}
                        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = C.neutral50; }}
                        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                      >
                        {opt.label}
                        {selected && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.primary600 }} />}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div style={{ height: 6 }} />
            </div>
          )}

          {/* ── Custom range sub-view ── */}
          {view === "custom" && (
            <div className="p-3 flex flex-col gap-3">
              <button
                onClick={() => setView("presets")}
                className="flex items-center gap-1 text-xs mb-1 w-fit"
                style={{ color: C.primary600, background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.neutral400 }}>From</label>
                <input
                  type="date"
                  max={customTo || todayStr}
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full h-9 rounded-lg px-3 text-sm"
                  style={{ border: `1px solid ${customInvalid ? C.destructive500 : C.neutral200}`, background: C.neutral50, color: C.neutral800, outline: "none" }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.neutral400 }}>To</label>
                <input
                  type="date"
                  min={customFrom || undefined}
                  max={todayStr}
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full h-9 rounded-lg px-3 text-sm"
                  style={{ border: `1px solid ${customInvalid ? C.destructive500 : C.neutral200}`, background: C.neutral50, color: C.neutral800, outline: "none" }}
                />
              </div>

              <p className="text-xs" style={{ color: C.destructive600, minHeight: 16 }}>
                {customInvalid ? "Start date must be before end date." : ""}
              </p>

              <button
                onClick={applyCustom}
                disabled={!customReady}
                className="w-full h-9 rounded-lg text-sm font-medium transition-opacity"
                style={{
                  background: C.primary600,
                  color: "#fff",
                  border: "none",
                  opacity: customReady ? 1 : 0.4,
                  cursor: customReady ? "pointer" : "not-allowed",
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main dashboard
// ============================================================================

export default function DepartmentDashboard() {
  // ── date range ──────────────────────────────────────────────────────────────
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("thisweek");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo,   setCustomTo]   = useState<Date | undefined>();

  const { rangeStart, rangeEnd, prevRangeStart, rangeLabel } = useMemo(
    () => resolvePreset(selectedPreset, customFrom, customTo),
    [selectedPreset, customFrom, customTo]
  );

  const handleRangeChange = (key: PresetKey, from?: Date, to?: Date) => {
    setSelectedPreset(key);
    if (key === "custom") { setCustomFrom(from); setCustomTo(to); }
  };

  // ── department filter ──────────────────────────────────────────────────────
  // "all" means the HOD is viewing across all their departments.
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [deptPickerOpen, setDeptPickerOpen] = useState(false);
  const deptPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (deptPickerRef.current && !deptPickerRef.current.contains(e.target as Node)) setDeptPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Derive the scoped data the rest of the dashboard reads from
  const TICKETS    = useMemo(() => selectedDeptId === "all" ? ALL_TICKETS    : ALL_TICKETS.filter(t => t.departmentId === selectedDeptId),    [selectedDeptId]);
  const AGENTS     = useMemo(() => selectedDeptId === "all" ? ALL_AGENTS     : ALL_AGENTS.filter(a => a.departmentId === selectedDeptId),     [selectedDeptId]);
  const CATEGORIES = useMemo(() => selectedDeptId === "all" ? ALL_CATEGORIES : ALL_CATEGORIES.filter(c => c.departmentId === selectedDeptId), [selectedDeptId]);

  const activeDept = ALL_DEPARTMENTS.find(d => d.id === selectedDeptId);
  const deptLabel  = activeDept ? activeDept.name : "All departments";

  const effectiveDays = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000));
  const [tab, setTab] = useState<"overview" | "agents" | "trends">("overview");
  const [sortKey, setSortKey] = useState<"active" | "resolved" | "avgRes" | "breach" | "escalations">("active");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [agentSearch, setAgentSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const inRange = (d: Date, from: Date, to: Date) => d.getTime() >= from.getTime() && d.getTime() <= to.getTime();

  const stats = useMemo(() => {
    const unresolved = TICKETS.filter((t) => t.status !== "RESOLVED");
    const totalTickets = TICKETS.length;
    const openTickets = TICKETS.filter((t) => t.status === "OPEN").length;
    const onHoldTickets = TICKETS.filter((t) => t.status === "ON_HOLD").length;
    const slaBreachedNow = unresolved.filter((t) => t.slaBreached).length;

    const createdThisPeriod = TICKETS.filter((t) => inRange(t.createdAt, rangeStart, rangeEnd));
    const createdPrevPeriod = TICKETS.filter((t) => inRange(t.createdAt, prevRangeStart, rangeStart));
    const resolvedThisPeriod = TICKETS.filter((t) => t.resolvedAt && inRange(t.resolvedAt, rangeStart, rangeEnd));
    const resolvedPrevPeriod = TICKETS.filter((t) => t.resolvedAt && inRange(t.resolvedAt, prevRangeStart, rangeStart));

    const avgResolutionHours = resolvedThisPeriod.length
      ? resolvedThisPeriod.reduce((s, t) => s + t.turnoverHours, 0) / resolvedThisPeriod.length
      : 0;

    const escalationsThisPeriod = TICKETS.filter((t) => inRange(t.createdAt, rangeStart, rangeEnd) && t.isAutomaticEscalation).length;

    return {
      totalTickets,
      openTickets,
      onHoldTickets,
      slaBreachedNow,
      createdThisPeriod: createdThisPeriod.length,
      createdPrevPeriod: createdPrevPeriod.length,
      resolvedThisPeriod: resolvedThisPeriod.length,
      resolvedPrevPeriod: resolvedPrevPeriod.length,
      avgResolutionHours,
      escalationsThisPeriod,
    };
  }, [rangeStart, rangeEnd, prevRangeStart, TICKETS]);

  const statusBreakdown = useMemo(() => {
    const statuses: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED"];
    return statuses.map((s) => ({
      status: s,
      count: TICKETS.filter((t) => t.status === s).length,
    }));
  }, [TICKETS]);

  const agingBuckets = useMemo(() => {
    const buckets = [
      { label: "0–1d", min: 0, max: 1, count: 0 },
      { label: "1–3d", min: 1, max: 3, count: 0 },
      { label: "3–7d", min: 3, max: 7, count: 0 },
      { label: "7d+", min: 7, max: Infinity, count: 0 },
    ];
    TICKETS.filter((t) => t.status !== "RESOLVED").forEach((t) => {
      const age = daysBetween(NOW, t.createdAt);
      const b = buckets.find((b) => age >= b.min && age < b.max);
      if (b) b.count += 1;
    });
    return buckets;
  }, [TICKETS]);

  const priorityBreakdown = useMemo(() => {
    const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];
    return priorities.map((p) => ({
      priority: p,
      count: TICKETS.filter((t) => t.priority === p && t.status !== "RESOLVED").length,
    }));
  }, [TICKETS]);

  const categoryBreakdown = useMemo(() => {
    return CATEGORIES.map((c) => {
      const tickets = TICKETS.filter((t) => t.categoryId === c.id && inRange(t.createdAt, rangeStart, rangeEnd));
      const breached = tickets.filter((t) => t.slaBreached).length;
      return { name: c.name, count: tickets.length, breached };
    }).sort((a, b) => b.count - a.count);
  }, [rangeStart, rangeEnd, TICKETS, AGENTS, CATEGORIES]);

  const trendData = useMemo(() => {
    const days = Math.min(effectiveDays, 60);
    return Array.from({ length: days }, (_, i) => {
      const dayStart = new Date(rangeStart.getTime() + i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const created = TICKETS.filter((t) => inRange(t.createdAt, dayStart, dayEnd)).length;
      const resolved = TICKETS.filter((t) => t.resolvedAt && inRange(t.resolvedAt, dayStart, dayEnd)).length;
      return {
        date: dayStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        created,
        resolved,
      };
    });
  }, [rangeStart, rangeEnd, effectiveDays, TICKETS]);

  const agentRows = useMemo(() => {
    return AGENTS.map((agent) => {
      const active = TICKETS.filter((t) => t.assigneeId === agent.id && t.status !== "RESOLVED").length;
      const resolvedInPeriod = TICKETS.filter(
        (t) => t.assigneeId === agent.id && t.resolvedAt && inRange(t.resolvedAt, rangeStart, rangeEnd)
      );
      const touched = TICKETS.filter(
        (t) => t.assigneeId === agent.id && (inRange(t.createdAt, rangeStart, rangeEnd) || (t.resolvedAt && inRange(t.resolvedAt, rangeStart, rangeEnd)))
      );
      const breachRate = touched.length ? touched.filter((t) => t.slaBreached).length / touched.length : 0;
      const avgRes = resolvedInPeriod.length ? resolvedInPeriod.reduce((s, t) => s + t.turnoverHours, 0) / resolvedInPeriod.length : 0;
      const capacityPct = active / agent.maxActiveTickets;
      const load: "Overloaded" | "Balanced" | "Available" = capacityPct >= 1 ? "Overloaded" : capacityPct >= 0.6 ? "Balanced" : "Available";
      const escalations = touched.filter((t) => t.isAutomaticEscalation).length;
      return {
        agent,
        active,
        capacityPct,
        resolved: resolvedInPeriod.length,
        avgRes,
        breachRate,
        escalations,
        load,
      };
    });
  }, [rangeStart, rangeEnd, TICKETS, AGENTS, CATEGORIES]);

  const sortedAgentRows = useMemo(() => {
    const rows = agentRows.filter((r) => r.agent.fullName.toLowerCase().includes(agentSearch.trim().toLowerCase()));
    const key = { active: "active", resolved: "resolved", avgRes: "avgRes", breach: "breachRate", escalations: "escalations" }[sortKey] as
      | "active"
      | "resolved"
      | "avgRes"
      | "breachRate"
      | "escalations";
    rows.sort((a, b) => {
      const diff = (a as any)[key] - (b as any)[key];
      return sortDir === "asc" ? diff : -diff;
    });
    return rows;
  }, [agentRows, sortKey, sortDir, agentSearch]);

  const assignmentMixData = useMemo(() => {
    const methods: AssignmentMethod[] = ["AUTO_KEYWORD", "AUTO_LOAD_BALANCE", "AUTO_CATEGORY", "MANUAL"];
    return [...AGENTS]
      .map((agent) => {
        const touched = TICKETS.filter(
          (t) => t.assigneeId === agent.id && (inRange(t.createdAt, rangeStart, rangeEnd) || (t.resolvedAt && inRange(t.resolvedAt, rangeStart, rangeEnd)))
        );
        const row: Record<string, string | number> = { name: agent.fullName };
        methods.forEach((m) => {
          row[m] = touched.filter((t) => t.assignmentMethod === m).length;
        });
        return row as { name: string } & Record<AssignmentMethod, number>;
      })
      .sort((a, b) => methods.reduce((s, m) => s + b[m], 0) - methods.reduce((s, m) => s + a[m], 0));
  }, [rangeStart, rangeEnd, TICKETS, AGENTS, CATEGORIES]);

  // Pre-build export data from existing computed state — no extra queries needed
  const exportData = useMemo(
    () => buildExportData({ rangeLabel, stats, sortedAgentRows, categoryBreakdown, trendData }),
    [rangeLabel, stats, sortedAgentRows, categoryBreakdown, trendData]
  );

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const totalUnresolved = statusBreakdown.filter((s) => s.status !== "RESOLVED").reduce((s, c) => s + c.count, 0) + statusBreakdown.find((s) => s.status === "RESOLVED")!.count;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.neutral50, color: C.neutral900 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-1 flex items-center gap-1.5" style={{ color: C.neutral400 }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: C.primary500 }} />
              IT Support &middot; HOD Console
            </p>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: C.neutral900 }}>{deptLabel}</h1>
            <p className="text-sm mt-0.5" style={{ color: C.neutral500 }}>
              {AGENTS.length} agent{AGENTS.length !== 1 ? "s" : ""} &middot; as of {NOW.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Department selector */}
            <div className="relative" ref={deptPickerRef}>
              <button
                onClick={() => setDeptPickerOpen(v => !v)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-medium transition-colors bg-white select-none"
                style={{
                  border: `1px solid ${deptPickerOpen ? C.primary200 : C.neutral200}`,
                  color: C.neutral700,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  minWidth: "10rem",
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeDept ? C.primary500 : C.neutral400 }} />
                <span className="flex-1 truncate text-left">{deptLabel}</span>
                <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200" style={{ color: C.neutral400, transform: deptPickerOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>

              {deptPickerOpen && (
                <div
                  className="absolute left-0 z-40 bg-white rounded-xl overflow-hidden"
                  style={{
                    top: "calc(100% + 6px)",
                    minWidth: "14rem",
                    border: `1px solid ${C.neutral200}`,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
                  }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-2.5 pb-1" style={{ color: C.neutral400 }}>Departments</p>
                  {[{ id: "all", name: "All departments", description: `${ALL_DEPARTMENTS.length} departments`, }, ...ALL_DEPARTMENTS].map(dept => {
                    const sel = selectedDeptId === dept.id;
                    const agentCount = dept.id === "all" ? ALL_AGENTS.length : ALL_AGENTS.filter(a => a.departmentId === dept.id).length;
                    return (
                      <button
                        key={dept.id}
                        onClick={() => { setSelectedDeptId(dept.id); setDeptPickerOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                        style={{ background: sel ? C.primary50 : "transparent", color: sel ? C.primary800 : C.neutral700 }}
                        onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.neutral50; }}
                        onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
                      >
                        <div>
                          <p className="text-sm font-medium">{dept.name}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: sel ? C.primary600 : C.neutral400 }}>{agentCount} agent{agentCount !== 1 ? "s" : ""}</p>
                        </div>
                        {sel && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-3" style={{ color: C.primary600 }} />}
                      </button>
                    );
                  })}
                  <div style={{ height: 6 }} />
                </div>
              )}
            </div>

            <DateRangePicker value={selectedPreset} onChange={handleRangeChange} />


          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-6 overflow-x-auto" style={{ borderBottom: `1px solid ${C.neutral200}` }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "agents", label: "Agents" },
            { id: "trends", label: "Trends & Categories" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`text-sm pb-3 -mb-px border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id ? "font-medium" : "border-transparent hover:opacity-80"
              }`}
              style={
                tab === t.id
                  ? { borderColor: ACCENT_PRIMARY, color: C.neutral900 }
                  : { color: C.neutral400 }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ================= OVERVIEW ================= */}
        {tab === "overview" && (
          <div className="flex flex-col gap-6">
            {/* Core KPIs */}
            <div>
              <p className="text-xs font-mono uppercase tracking-widest mb-2">Right now</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard icon={<TicketIcon className="w-4 h-4" />} label="Total tickets" value={stats.totalTickets.toString()} tone="neutral" footnote="All time, this department" />
                <KpiCard icon={<CircleDot className="w-4 h-4" />} label="Open tickets" value={stats.openTickets.toString()} tone="info" />
                <KpiCard
                  icon={<AlertTriangle className="w-4 h-4" />}
                  label="SLA breached"
                  value={stats.slaBreachedNow.toString()}
                  tone={stats.slaBreachedNow > 0 ? "critical" : "good"}
                  pulse={stats.slaBreachedNow > 0}
                  footnote="Unresolved, past deadline"
                />
                <KpiCard icon={<PauseCircle className="w-4 h-4" />} label="On hold" value={stats.onHoldTickets.toString()} tone="warning" />
              </div>
            </div>

            {/* Secondary KPIs */}
            <div>
              <p className="text-xs font-mono uppercase tracking-widest mb-2">Period: {rangeLabel}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <KpiCard
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Resolved"
                  value={stats.resolvedThisPeriod.toString()}
                  tone="good"
                  footnote={`vs ${stats.resolvedPrevPeriod} prior period`}
                />
                <KpiCard icon={<Clock className="w-4 h-4" />} label="Avg. resolution time" value={fmtHours(stats.avgResolutionHours)} tone="neutral" />
                <KpiCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="New tickets"
                  value={stats.createdThisPeriod.toString()}
                  tone="neutral"
                  footnote={`vs ${stats.createdPrevPeriod} prior period`}
                />
              </div>
            </div>

            {/* Lifecycle bar — signature element: the ticket pipeline as a single proportional strip */}
            <SectionCard title="Ticket lifecycle" subtitle="Where every ticket in the department currently sits">
              <div className="flex h-8 w-full rounded-md overflow-hidden" style={{ border: `1px solid ${C.neutral200}` }}>
                {statusBreakdown.map((s) => (
                  <div
                    key={s.status}
                    style={{ width: `${(s.count / totalUnresolved) * 100}%`, backgroundColor: STATUS_COLOR[s.status] }}
                    className="h-full transition-all"
                    title={`${s.status}: ${s.count}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {statusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLOR[s.status] }} />
                    <span style={{ color: C.neutral500 }}>{s.status.replace("_", " ")}</span>
                    <span className="font-mono font-medium" style={{ color: C.neutral800 }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Aging open tickets" subtitle="Unresolved tickets by time since creation — spot what's stalling">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={agingBuckets} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="label" type="category" tick={{ fontSize: 12, fill: C.neutral700 }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {agingBuckets.map((b, i) => (
                        <Cell key={i} fill={i === agingBuckets.length - 1 ? C.destructive600 : i >= 2 ? C.warning600 : ACCENT_SECONDARY} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="Open priority mix" subtitle="Unresolved tickets by priority level">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={priorityBreakdown} dataKey="count" nameKey="priority" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {priorityBreakdown.map((p) => (
                        <Cell key={p.priority} fill={PRIORITY_COLOR[p.priority]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: "ui-monospace" }} />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            <SectionCard
              title="Escalations"
              subtitle={`${stats.escalationsThisPeriod} automatic escalations in {rangeLabel}`}
              right={<Flame style={{ color: C.destructive500 }} className="w-4 h-4" />}
            >
              <p className="text-sm" style={{ color: C.neutral500 }}>
                Automatic escalations fire when a ticket breaches its SLA before being picked up. A rising count usually means either
                understaffing for a category, or a keyword/routing rule that needs retuning.
              </p>
            </SectionCard>
          </div>
        )}

        {/* ================= AGENTS ================= */}
        {tab === "agents" && (
          <div className="flex flex-col gap-6">
            <SectionCard title="How tickets get assigned" subtitle={`Assignment method mix per agent — ${rangeLabel}, all ${AGENTS.length} agents, scroll for more`}>
              <div className="max-h-[420px] overflow-y-auto pr-1">
                <ResponsiveContainer width="100%" height={Math.max(240, assignmentMixData.length * 42)}>
                  <BarChart data={assignmentMixData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.neutral700 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="AUTO_LOAD_BALANCE" stackId="a" fill={ACCENT_PRIMARY} name="Auto: load balance" barSize={14} />
                    <Bar dataKey="AUTO_KEYWORD" stackId="a" fill={ACCENT_SECONDARY} name="Auto: keyword" barSize={14} />
                    <Bar dataKey="AUTO_CATEGORY" stackId="a" fill={ACCENT_CHART_C} name="Auto: category" barSize={14} />
                    <Bar dataKey="MANUAL" stackId="a" fill={C.neutral400} radius={[0, 4, 4, 0]} name="Manual" barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs" style={{ color: C.neutral500 }}>
                A heavy manual share for an agent usually means the routing rules aren't picking them up automatically — worth checking their
                category/keyword coverage.
              </p>
            </SectionCard>

            <SectionCard
              title="Agent performance"
              subtitle={`Sorted by ${sortKey === "active" ? "active load" : sortKey === "resolved" ? "resolved" : sortKey === "avgRes" ? "avg. resolution time" : sortKey === "breach" ? "SLA breach rate" : "escalations"} — ${rangeLabel}`}
              right={
                <input
                  type="text"
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Search agent by name…"
                  className="text-sm px-3 py-1.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 w-56"
                  style={{ boxShadow: "none" }}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 2px ${C.primary500}33`)}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                />
              }
            >
              <div className="overflow-x-auto overflow-y-auto max-h-[480px] -mx-5">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-xs uppercase tracking-wide">
                      <th className="px-5 py-2 font-medium">Agent</th>
                      <th className="px-5 py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("active")}>
                        <span className="inline-flex items-center gap-1">
                          Active / capacity {sortKey === "active" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </span>
                      </th>
                      <th className="px-5 py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("resolved")}>
                        <span className="inline-flex items-center gap-1">
                          Resolved {sortKey === "resolved" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </span>
                      </th>
                      <th className="px-5 py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("avgRes")}>
                        <span className="inline-flex items-center gap-1">
                          Avg. resolution {sortKey === "avgRes" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </span>
                      </th>
                      <th className="px-5 py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("breach")}>
                        <span className="inline-flex items-center gap-1">
                          SLA breach rate {sortKey === "breach" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </span>
                      </th>
                      <th className="px-5 py-2 font-medium cursor-pointer select-none" onClick={() => toggleSort("escalations")}>
                        <span className="inline-flex items-center gap-1">
                          Escalations {sortKey === "escalations" && (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </span>
                      </th>
                      <th className="px-5 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAgentRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-6 text-center text-sm" style={{ color: C.neutral400 }}>
                          No agents match "{agentSearch}"
                        </td>
                      </tr>
                    )}
                    {sortedAgentRows.map((row) => (
                      <tr key={row.agent.id} className="last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-medium" style={{ color: C.neutral800 }}>{row.agent.fullName}</p>
                          {!row.agent.isAvailableForAssignment && <p className="text-[11px]">Not accepting new tickets</p>}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono w-12" style={{ color: C.neutral800 }}>
                              {row.active}/{row.agent.maxActiveTickets}
                            </span>
                            <div className="w-20 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(row.capacityPct, 1) * 100}%`,
                                  backgroundColor: row.load === "Overloaded" ? C.destructive600 : row.load === "Balanced" ? C.warning600 : C.success600,
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-mono" style={{ color: C.neutral800 }}>{row.resolved}</td>
                        <td className="px-5 py-3 font-mono" style={{ color: C.neutral800 }}>{row.resolved ? fmtHours(row.avgRes) : "—"}</td>
                        <td className="px-5 py-3 font-mono" style={{ color: C.neutral800 }}>{fmtPct(row.breachRate)}</td>
                        <td className="px-5 py-3 font-mono font-medium" style={{ color: row.escalations > 0 ? C.destructive500 : C.neutral800 }}>{row.escalations}</td>
                        <td className="px-5 py-3">
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={
                              row.load === "Overloaded"
                                ? { backgroundColor: C.destructive50, color: C.destructive700 }
                                : row.load === "Balanced"
                                ? { backgroundColor: C.warning50, color: C.warning600 }
                                : { backgroundColor: C.success50, color: C.success700 }
                            }
                          >
                            {row.load}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ================= TRENDS & CATEGORIES ================= */}
        {tab === "trends" && (
          <div className="flex flex-col gap-6">
            <SectionCard title="Inflow vs. resolved" subtitle={`Daily tickets created vs. resolved — ${rangeLabel} (up to 60 days shown)`}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="created" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT_PRIMARY} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={ACCENT_PRIMARY} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.success600} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.success600} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: AXIS_TICK }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="created" stroke={ACCENT_PRIMARY} fill="url(#created)" strokeWidth={2} name="Created" />
                  <Area type="monotone" dataKey="resolved" stroke={C.success600} fill="url(#resolved)" strokeWidth={2} name="Resolved" />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Volume by category" subtitle={`Tickets created in {rangeLabel}`}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.neutral700 }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill={ACCENT_CHART_C} radius={[0, 4, 4, 0]} name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="SLA breach rate trend" subtitle="Share of touched tickets that breached SLA, per week">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={Array.from({ length: Math.max(1, Math.floor(effectiveDays / 7)) }, (_, i) => {
                      const weekStart = new Date(rangeStart.getTime() + i * 7 * 86400000);
                      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
                      const touched = TICKETS.filter(
                        (t) => inRange(t.createdAt, weekStart, weekEnd) || (t.resolvedAt && inRange(t.resolvedAt, weekStart, weekEnd))
                      );
                      const rate = touched.length ? touched.filter((t) => t.slaBreached).length / touched.length : 0;
                      return { week: `Wk ${i + 1}`, rate: Number((rate * 100).toFixed(1)) };
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Breach rate"] as [string, string]} />
                    <Line type="monotone" dataKey="rate" stroke={C.destructive600} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            <SectionCard title="Category health" subtitle="Breach counts alongside volume — flags categories that need more coverage" right={<Layers style={{ color: C.neutral400 }} className="w-4 h-4" />}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categoryBreakdown.map((c) => (
                  <div key={c.name} className="rounded-lg p-3" style={{ border: `1px solid ${C.neutral100}` }}>
                    <p className="text-xs truncate" style={{ color: C.neutral500 }}>{c.name}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="font-mono text-lg font-semibold" style={{ color: C.neutral900 }}>{c.count}</span>
                      {c.breached > 0 && <span className="text-[11px] font-mono" style={{ color: C.destructive500 }}>{c.breached} breached</span>}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}