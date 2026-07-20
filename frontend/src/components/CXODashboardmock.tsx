import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  BarChart,
  Bar,
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
  CheckCircle2,
  PauseCircle,
  AlertTriangle,
  Clock,
  Percent,
  Building2,
  MapPin,
  Briefcase,
  Calendar,
  ChevronDown as ChevronDownIcon,
  Check,
  ChevronLeft,
  Gauge,
  X,
} from "lucide-react";

// ============================================================================
// Domain types — mirrors the Prisma schema (subset relevant to this view)
// ============================================================================

type TicketStatus = "OPEN" | "REOPENED" | "IN_PROGRESS" | "ON_HOLD" | "RESOLVED";
type TicketPriority = "P1" | "P2" | "P3" | "P4";

interface Department {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  departmentId: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  departmentId: string;
  categoryId: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  resolvedAt: Date | null;
  slaDeadline: Date | null;
  slaBreached: boolean;
  turnoverHours: number;
  // Captured only at ticket-raise time — never a full master list.
  // Sourced from Ticket.site (the free-text location field on the intake
  // form) — the schema has no separate per-ticket "state" column.
  site: string;
  clientName: string;
}

// ============================================================================
// Live data — pulled from GET /cxo-dashboard/analytics, scoped server-side
// to the departments this CXO/manager owns (Department.cxoId). The API
// returns lean rows; everything below (range/status/site/client filtering,
// KPI + chart aggregation) still happens client-side over that set, exactly
// as it did over the old in-memory mock arrays.
// ============================================================================

const API_BASE = "http://localhost:3000";

interface RawTicket {
  id: string;
  ticketNumber: string;
  departmentId: string;
  categoryId: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  resolvedAt: string | null;
  slaDeadline: string | null;
  slaBreached: boolean;
  turnOverTime: number | null; // seconds, only meaningful once resolved
  site: string | null;
  clientName: string;
}

interface AnalyticsResponse {
  departments: Department[];
  categories: Category[];
  tickets: RawTicket[];
}

function parseTicket(raw: RawTicket): Ticket {
  const createdAt = new Date(raw.createdAt);
  const resolvedAt = raw.resolvedAt ? new Date(raw.resolvedAt) : null;
  const isResolved = raw.status === "RESOLVED" && !!resolvedAt;
  const turnoverHours = isResolved
    ? raw.turnOverTime != null
      ? raw.turnOverTime / 3600
      : (resolvedAt!.getTime() - createdAt.getTime()) / 3600000
    : 0;
  return {
    id: raw.id,
    ticketNumber: raw.ticketNumber,
    departmentId: raw.departmentId,
    categoryId: raw.categoryId,
    status: raw.status,
    priority: raw.priority,
    createdAt,
    resolvedAt,
    slaDeadline: raw.slaDeadline ? new Date(raw.slaDeadline) : null,
    slaBreached: raw.slaBreached,
    turnoverHours,
    site: raw.site || "Unspecified",
    clientName: raw.clientName,
  };
}

// ============================================================================
// Formatting helpers
// ============================================================================

const fmtHours = (h: number) => (h < 1 ? `${Math.round(h * 60)}m` : h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

// ============================================================================
// Design system — identical palette/tokens to the HOD analytics console
// Primary:     #4B4EFC (500) · #1E22FB (600) · #0408E7 (700)
// Neutral:     #F9FAF8 (50)  · #E5E7EB (200) · #9CA3AF (400) · #6B7280 (500) · #111827 (900)
// Success:     #23C55E (500) · #16A34A (600)
// Warning:     #F59E0B (500) · #D97706 (600)
// Destructive: #EF4444 (500) · #DC2020 (600)
// ============================================================================

const C = {
  primary50: "#F5F5FF",
  primary100: "#E1E1FE",
  primary200: "#C7C8FD",
  primary500: "#4B4EFC",
  primary600: "#1E22FB",
  primary700: "#0408E7",
  primary800: "#0306BA",
  primary900: "#02058D",

  neutral0: "#FFFFFF",
  neutral50: "#F9FAF8",
  neutral100: "#F3F4F6",
  neutral200: "#E5E7EB",
  neutral300: "#D1D5DB",
  neutral400: "#9CA3AF",
  neutral500: "#6B7280",
  neutral600: "#4B5563",
  neutral700: "#374151",
  neutral800: "#1F2937",
  neutral900: "#111827",

  success50: "#F0FDF4",
  success200: "#BBF7D0",
  success500: "#23C55E",
  success600: "#16A34A",
  success700: "#15803D",

  warning50: "#FFFBEB",
  warning200: "#FDE68A",
  warning500: "#F59E0B",
  warning600: "#D97706",

  destructive50: "#FEF2F2",
  destructive200: "#FECACA",
  destructive500: "#EF4444",
  destructive600: "#DC2020",
  destructive700: "#B91C1C",
};

const ACCENT_PRIMARY = C.primary500;
const ACCENT_SECONDARY = C.primary700;
const ACCENT_CHART_A = C.primary600;
const ACCENT_CHART_B = C.success500;
const ACCENT_CHART_C = C.warning500;

const GRID_STROKE = C.neutral200;
const AXIS_TICK = C.neutral400;
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: `1px solid ${C.neutral200}`,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: C.primary500,
  REOPENED: C.destructive500,
  IN_PROGRESS: C.primary700,
  ON_HOLD: C.warning500,
  RESOLVED: C.success500,
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  REOPENED: "Reopened",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  RESOLVED: "Resolved",
};

// ============================================================================
// Small presentational primitives (mirrors HODDashboardmock.tsx)
// ============================================================================

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
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
    neutral: { bg: C.neutral100, text: C.neutral700 },
    critical: { bg: C.destructive50, text: C.destructive700 },
    warning: { bg: C.warning50, text: C.warning600 },
    good: { bg: C.success50, text: C.success700 },
    info: { bg: C.primary50, text: C.primary600 },
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3 min-w-0" style={{ border: `1px solid ${C.neutral200}` }}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: toneStyle[tone].bg, color: toneStyle[tone].text }}>
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

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
      style={{
        background: active ? C.primary600 : C.neutral100,
        color: active ? "#fff" : C.neutral600,
        border: `1px solid ${active ? C.primary600 : C.neutral200}`,
      }}
    >
      {label}
    </button>
  );
}

// ============================================================================
// Date range picker (identical behaviour to HODDashboardmock.tsx)
// ============================================================================

type PresetKey =
  | "today" | "yesterday" | "last24" | "thisweek" | "lastweek" | "last7"
  | "thismonth" | "lastmonth" | "last30" | "thisquarter" | "lastquarter"
  | "thisyear" | "last90" | "alltime" | "custom";

interface ResolvedRange { rangeStart: Date; rangeEnd: Date; prevRangeStart: Date; rangeLabel: string; }

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date) { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }
function startOfWeek(d: Date) { const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r; }
function endOfWeek(d: Date) { const r = endOfDay(d); r.setDate(r.getDate() + (6 - r.getDay())); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfQuarter(d: Date) { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); }
function endOfQuarter(d: Date) { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999); }
function addDays(d: Date, n: number) { return new Date(d.getTime() + n * 86400000); }
function fmtDateShort(d: Date) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }

function resolvePreset(key: PresetKey, customFrom?: Date, customTo?: Date): ResolvedRange {
  const now = new Date();
  const today = startOfDay(now);
  const ms1d = 86400000;
  let s: Date, e: Date, ps: Date;
  switch (key) {
    case "today": s = today; e = endOfDay(now); ps = addDays(today, -1); break;
    case "yesterday": s = addDays(today, -1); e = endOfDay(addDays(today, -1)); ps = addDays(today, -2); break;
    case "last24": s = new Date(now.getTime() - ms1d); e = now; ps = new Date(now.getTime() - ms1d * 2); break;
    case "thisweek": s = startOfWeek(today); e = endOfWeek(today); ps = addDays(startOfWeek(today), -7); break;
    case "lastweek": { const lws = addDays(startOfWeek(today), -7); s = lws; e = addDays(lws, 6); ps = addDays(lws, -7); break; }
    case "last7": s = addDays(today, -6); e = endOfDay(now); ps = addDays(today, -13); break;
    case "thismonth": s = startOfMonth(today); e = endOfMonth(today); ps = startOfMonth(addDays(startOfMonth(today), -1)); break;
    case "lastmonth": { const lm = addDays(startOfMonth(today), -1); s = startOfMonth(lm); e = endOfMonth(lm); ps = startOfMonth(addDays(s, -1)); break; }
    case "last30": s = addDays(today, -29); e = endOfDay(now); ps = addDays(today, -59); break;
    case "thisquarter": s = startOfQuarter(today); e = endOfQuarter(today); ps = addDays(startOfQuarter(today), -1); break;
    case "lastquarter": { const lqs = addDays(startOfQuarter(today), -1); s = startOfQuarter(lqs); e = endOfQuarter(lqs); ps = addDays(s, -1); break; }
    case "thisyear": s = new Date(today.getFullYear(), 0, 1); e = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999); ps = new Date(today.getFullYear() - 1, 0, 1); break;
    case "last90": s = addDays(today, -89); e = endOfDay(now); ps = addDays(today, -179); break;
    case "alltime": s = new Date(2020, 0, 1); e = now; ps = new Date(2019, 0, 1); break;
    case "custom":
      s = customFrom ? startOfDay(customFrom) : addDays(today, -6);
      e = customTo ? endOfDay(customTo) : endOfDay(now);
      ps = new Date(s.getTime() - (e.getTime() - s.getTime()));
      break;
    default: s = addDays(today, -6); e = endOfDay(now); ps = addDays(today, -13);
  }
  const labels: Record<PresetKey, string> = {
    today: "Today", yesterday: "Yesterday", last24: "Last 24 hours",
    thisweek: "This week", lastweek: "Last week", last7: "Last 7 days",
    thismonth: "This month", lastmonth: "Last month", last30: "Last 30 days",
    thisquarter: "This quarter", lastquarter: "Last quarter", thisyear: "This year", last90: "Last 90 days",
    alltime: "All time",
    custom: customFrom && customTo ? `${fmtDateShort(customFrom)} – ${fmtDateShort(customTo)}` : "Custom range",
  };
  return { rangeStart: s, rangeEnd: e, prevRangeStart: ps, rangeLabel: labels[key] };
}

const PRESET_GROUPS: { label: string; options: { key: PresetKey; label: string }[] }[] = [
  { label: "Recent", options: [{ key: "today", label: "Today" }, { key: "yesterday", label: "Yesterday" }, { key: "last24", label: "Last 24 hours" }] },
  { label: "Weekly", options: [{ key: "thisweek", label: "This week" }, { key: "lastweek", label: "Last week" }, { key: "last7", label: "Last 7 days" }] },
  { label: "Monthly", options: [{ key: "thismonth", label: "This month" }, { key: "lastmonth", label: "Last month" }, { key: "last30", label: "Last 30 days" }] },
  { label: "Longer range", options: [{ key: "thisquarter", label: "This quarter" }, { key: "lastquarter", label: "Last quarter" }, { key: "thisyear", label: "This year" }, { key: "last90", label: "Last 90 days" }] },
  { label: "Other", options: [{ key: "alltime", label: "All time" }, { key: "custom", label: "Custom range…" }] },
];

function DateRangePicker({ value, onChange }: { value: PresetKey; onChange: (key: PresetKey, from?: Date, to?: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"presets" | "custom">("presets");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const todayStr = new Date().toISOString().slice(0, 10);

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
  const customReady = !!(customFrom && customTo && !customInvalid);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) setView("presets"); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-medium transition-colors bg-white select-none"
        style={{ border: `1px solid ${open ? C.primary200 : C.neutral200}`, color: C.neutral700, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
      >
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: C.neutral400 }} />
        <span style={{ minWidth: "7rem", maxWidth: "14rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{triggerLabel}</span>
        <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200" style={{ color: C.neutral400, transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-40 bg-white rounded-xl overflow-hidden"
          style={{ top: "calc(100% + 6px)", width: view === "custom" ? 288 : 224, border: `1px solid ${C.neutral200}`, boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)" }}
          role="listbox"
        >
          {view === "presets" && (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {PRESET_GROUPS.map((group, gi) => (
                <div key={group.label}>
                  {gi > 0 && <div style={{ height: 1, background: C.neutral100, margin: "4px 0" }} />}
                  <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-2.5 pb-1" style={{ color: C.neutral400 }}>{group.label}</p>
                  {group.options.map(opt => {
                    const selected = value === opt.key;
                    return (
                      <button
                        key={opt.key}
                        role="option"
                        aria-selected={selected}
                        onClick={() => selectPreset(opt.key)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors"
                        style={{ background: selected ? C.primary50 : "transparent", color: selected ? C.primary800 : C.neutral700 }}
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

          {view === "custom" && (
            <div className="p-3 flex flex-col gap-3">
              <button onClick={() => setView("presets")} className="flex items-center gap-1 text-xs mb-1 w-fit" style={{ color: C.primary600, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.neutral400 }}>From</label>
                <input type="date" max={customTo || todayStr} value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="w-full h-9 rounded-lg px-3 text-sm" style={{ border: `1px solid ${customInvalid ? C.destructive500 : C.neutral200}`, background: C.neutral50, color: C.neutral800, outline: "none" }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.neutral400 }}>To</label>
                <input type="date" min={customFrom || undefined} max={todayStr} value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="w-full h-9 rounded-lg px-3 text-sm" style={{ border: `1px solid ${customInvalid ? C.destructive500 : C.neutral200}`, background: C.neutral50, color: C.neutral800, outline: "none" }} />
              </div>
              <p className="text-xs" style={{ color: C.destructive600, minHeight: 16 }}>{customInvalid ? "Start date must be before end date." : ""}</p>
              <button onClick={applyCustom} disabled={!customReady} className="w-full h-9 rounded-lg text-sm font-medium transition-opacity"
                style={{ background: C.primary600, color: "#fff", border: "none", opacity: customReady ? 1 : 0.4, cursor: customReady ? "pointer" : "not-allowed" }}>
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
// Generic multi-select filter — options are always passed in dynamically
// (never a hardcoded master list), so state/client lists only ever show
// values that actually occur on a raised ticket.
// ============================================================================

function MultiSelectFilter({
  label,
  icon,
  options,
  selected,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allSelected = selected.length === 0;
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id));
    else onChange([...selected, id]);
  };

  const triggerLabel = allSelected
    ? `All ${label.toLowerCase()}`
    : selected.length === 1
    ? options.find(o => o.id === selected[0])?.label ?? label
    : `${label} (${selected.length})`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-medium transition-colors bg-white select-none"
        style={{
          border: `1px solid ${open ? C.primary200 : C.neutral200}`,
          color: allSelected ? C.neutral700 : C.primary700,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          minWidth: "9rem",
        }}
      >
        <span className="flex-shrink-0" style={{ color: C.neutral400 }}>{icon}</span>
        <span className="flex-1 truncate text-left max-w-[9rem]">{triggerLabel}</span>
        <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200" style={{ color: C.neutral400, transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {open && (
        <div
          className="absolute left-0 z-40 bg-white rounded-xl overflow-hidden"
          style={{ top: "calc(100% + 6px)", width: 240, border: `1px solid ${C.neutral200}`, boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)" }}
        >
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            <button
              onClick={() => onChange([])}
              className="w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors"
              style={{ background: allSelected ? C.primary50 : "transparent", color: allSelected ? C.primary800 : C.neutral700 }}
              onMouseEnter={e => { if (!allSelected) e.currentTarget.style.background = C.neutral50; }}
              onMouseLeave={e => { if (!allSelected) e.currentTarget.style.background = "transparent"; }}
            >
              All {label.toLowerCase()}
              {allSelected && <Check className="w-3.5 h-3.5" style={{ color: C.primary600 }} />}
            </button>
            <div style={{ height: 1, background: C.neutral100, margin: "4px 0" }} />
            {options.length === 0 && <p className="px-3 py-3 text-xs" style={{ color: C.neutral400 }}>No options in current scope</p>}
            {options.map(opt => {
              const sel = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggle(opt.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left text-sm transition-colors"
                  style={{ background: sel ? C.primary50 : "transparent", color: sel ? C.primary800 : C.neutral700 }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = C.neutral50; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
                >
                  <span className="truncate">{opt.label}</span>
                  {sel && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-2" style={{ color: C.primary600 }} />}
                </button>
              );
            })}
          </div>
          <div style={{ height: 6 }} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main analytics view
// ============================================================================

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "REOPENED", "IN_PROGRESS", "ON_HOLD", "RESOLVED"];

interface ManagerAnalyticsProps {
  token: string;
  apiFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export default function ManagerAnalyticsMock({ token, apiFetch }: ManagerAnalyticsProps) {
  const requestFn = apiFetch || window.fetch;

  // ── live data ───────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const res = await requestFn(`${API_BASE}/cxo-dashboard/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || body?.message || `Failed to load analytics (${res.status})`);
        }
        const data: AnalyticsResponse = await res.json();
        if (cancelled) return;
        setDepartments(data.departments);
        setCategories(data.categories);
        setAllTickets(data.tickets.map(parseTicket));
        setLastLoadedAt(new Date());
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();
    return () => { cancelled = true; };
  }, [token]);

  const ALL_DEPARTMENTS = departments;
  const ALL_CATEGORIES = categories;
  const ALL_TICKETS = allTickets;
  const NOW = lastLoadedAt;

  // ── date range ──────────────────────────────────────────────────────────
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("thismonth");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const { rangeStart, rangeEnd, rangeLabel } = useMemo(
    () => resolvePreset(selectedPreset, customFrom, customTo),
    [selectedPreset, customFrom, customTo]
  );

  const handleRangeChange = (key: PresetKey, from?: Date, to?: Date) => {
    setSelectedPreset(key);
    if (key === "custom") { setCustomFrom(from); setCustomTo(to); }
  };

  // ── filters ─────────────────────────────────────────────────────────────
  // Empty array = "all" for every filter below.
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const inRange = (d: Date, from: Date, to: Date) => d.getTime() >= from.getTime() && d.getTime() <= to.getTime();

  // Departments currently in scope of the department filter — everything
  // downstream (site/client option lists, department chart) respects this.
  const deptScopedTickets = useMemo(
    () => (selectedDeptIds.length === 0 ? ALL_TICKETS : ALL_TICKETS.filter(t => selectedDeptIds.includes(t.departmentId))),
    [selectedDeptIds, ALL_TICKETS]
  );

  const availableStates = useMemo(
    () => Array.from(new Set(deptScopedTickets.map(t => t.site))).sort().map(s => ({ id: s, label: s })),
    [deptScopedTickets]
  );
  const availableClients = useMemo(
    () => Array.from(new Set(deptScopedTickets.map(t => t.clientName))).sort().map(c => ({ id: c, label: c })),
    [deptScopedTickets]
  );

  // Prune stale selections when the department filter narrows the available
  // sites/clients (keeps the filter bar internally consistent).
  useEffect(() => {
    const validStates = new Set(availableStates.map(s => s.id));
    setSelectedStates(prev => prev.filter(s => validStates.has(s)));
  }, [availableStates]);
  useEffect(() => {
    const validClients = new Set(availableClients.map(c => c.id));
    setSelectedClients(prev => prev.filter(c => validClients.has(c)));
  }, [availableClients]);

  // Fully filtered ticket set — every card, chart and TAT figure reads from this.
  const TICKETS = useMemo(() => {
    return ALL_TICKETS.filter(t =>
      (selectedDeptIds.length === 0 || selectedDeptIds.includes(t.departmentId)) &&
      (selectedStatuses.length === 0 || selectedStatuses.includes(t.status)) &&
      (selectedStates.length === 0 || selectedStates.includes(t.site)) &&
      (selectedClients.length === 0 || selectedClients.includes(t.clientName)) &&
      inRange(t.createdAt, rangeStart, rangeEnd)
    );
  }, [ALL_TICKETS, selectedDeptIds, selectedStatuses, selectedStates, selectedClients, rangeStart, rangeEnd]);

  const scopedDepartments = useMemo(
    () => (selectedDeptIds.length === 0 ? ALL_DEPARTMENTS : ALL_DEPARTMENTS.filter(d => selectedDeptIds.includes(d.id))),
    [selectedDeptIds, ALL_DEPARTMENTS]
  );

  const deptLabel = selectedDeptIds.length === 0
    ? "All departments"
    : selectedDeptIds.length === 1
    ? ALL_DEPARTMENTS.find(d => d.id === selectedDeptIds[0])?.name ?? "1 department"
    : `${selectedDeptIds.length} departments selected`;

  // ── KPIs ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalComplaints = TICKETS.length;
    const resolved = TICKETS.filter(t => t.status === "RESOLVED");
    const resolvedCount = resolved.length;
    const onHoldCount = TICKETS.filter(t => t.status === "ON_HOLD").length;
    const slaBreachedCount = TICKETS.filter(t => t.slaBreached).length;
    const resolutionRate = totalComplaints ? resolvedCount / totalComplaints : 0;
    const avgResolutionHours = resolvedCount ? resolved.reduce((s, t) => s + t.turnoverHours, 0) / resolvedCount : 0;
    return { totalComplaints, resolvedCount, onHoldCount, slaBreachedCount, resolutionRate, avgResolutionHours };
  }, [TICKETS]);

  // ── chart data ──────────────────────────────────────────────────────────
  const statusDistribution = useMemo(
    () => STATUS_OPTIONS.map(s => ({ status: s, name: STATUS_LABEL[s], count: TICKETS.filter(t => t.status === s).length })),
    [TICKETS]
  );

  const deptDistribution = useMemo(
    () => scopedDepartments
      .map(d => ({ name: d.name, count: TICKETS.filter(t => t.departmentId === d.id).length }))
      .sort((a, b) => b.count - a.count),
    [scopedDepartments, TICKETS]
  );

  const stateDistribution = useMemo(
    () => availableStates
      .map(s => ({ name: s.id, count: TICKETS.filter(t => t.site === s.id).length }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    [availableStates, TICKETS]
  );

  const clientDistribution = useMemo(
    () => availableClients
      .map(c => ({ name: c.id, count: TICKETS.filter(t => t.clientName === c.id).length }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    [availableClients, TICKETS]
  );

  // ── average TAT ─────────────────────────────────────────────────────────
  const tatByDept = useMemo(
    () => scopedDepartments.map(d => {
      const resolved = TICKETS.filter(t => t.departmentId === d.id && t.status === "RESOLVED");
      const avgHours = resolved.length ? resolved.reduce((s, t) => s + t.turnoverHours, 0) / resolved.length : 0;
      return { name: d.name, avgHours: Number(avgHours.toFixed(1)), resolvedCount: resolved.length };
    }),
    [scopedDepartments, TICKETS]
  );

  const overallAvgTat = useMemo(() => {
    const resolved = TICKETS.filter(t => t.status === "RESOLVED");
    return resolved.length ? resolved.reduce((s, t) => s + t.turnoverHours, 0) / resolved.length : 0;
  }, [TICKETS]);

  const [tatDeptId, setTatDeptId] = useState<string>("");
  useEffect(() => {
    if (scopedDepartments.length && !scopedDepartments.some(d => d.id === tatDeptId)) {
      setTatDeptId(scopedDepartments[0].id);
    }
  }, [scopedDepartments, tatDeptId]);

  const tatByCategory = useMemo(() => {
    const cats = ALL_CATEGORIES.filter(c => c.departmentId === tatDeptId);
    return cats.map(cat => {
      const resolved = TICKETS.filter(t => t.categoryId === cat.id && t.status === "RESOLVED");
      const avgHours = resolved.length ? resolved.reduce((s, t) => s + t.turnoverHours, 0) / resolved.length : 0;
      return { name: cat.name, avgHours: Number(avgHours.toFixed(1)), resolvedCount: resolved.length };
    });
  }, [tatDeptId, TICKETS]);

  const activeFilterCount =
    (selectedDeptIds.length ? 1 : 0) + (selectedStatuses.length ? 1 : 0) + (selectedStates.length ? 1 : 0) + (selectedClients.length ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedDeptIds([]);
    setSelectedStatuses([]);
    setSelectedStates([]);
    setSelectedClients([]);
  };

  if (loading && ALL_TICKETS.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: C.neutral50 }}>
        <p className="text-sm font-mono" style={{ color: C.neutral400 }}>Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans px-6" style={{ backgroundColor: C.neutral50 }}>
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-md text-center" style={{ border: `1px solid ${C.neutral200}` }}>
          <AlertTriangle className="w-6 h-6 mx-auto mb-3" style={{ color: C.destructive500 }} />
          <p className="text-sm font-medium mb-1" style={{ color: C.neutral800 }}>Couldn't load analytics</p>
          <p className="text-xs" style={{ color: C.neutral500 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (ALL_DEPARTMENTS.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans px-6" style={{ backgroundColor: C.neutral50 }}>
        <p className="text-sm" style={{ color: C.neutral500 }}>No departments are assigned to you yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: C.neutral50, color: C.neutral900 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-1 flex items-center gap-1.5" style={{ color: C.neutral400 }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: C.primary500 }} />
              Executive Console &middot; Analytics
            </p>
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: C.neutral900 }}>{deptLabel}</h1>
            <p className="text-sm mt-0.5" style={{ color: C.neutral500 }}>
              {ALL_DEPARTMENTS.length} departments under you &middot; as of {NOW.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-6 flex flex-wrap items-center gap-2" style={{ border: `1px solid ${C.neutral200}` }}>
          <span className="text-[11px] font-semibold uppercase tracking-widest px-1 flex items-center gap-1" style={{ color: C.neutral400 }}>Filters</span>

          <MultiSelectFilter
            label="Departments"
            icon={<Building2 className="w-3.5 h-3.5" />}
            options={ALL_DEPARTMENTS.map(d => ({ id: d.id, label: d.name }))}
            selected={selectedDeptIds}
            onChange={setSelectedDeptIds}
          />
          <MultiSelectFilter
            label="Status"
            icon={<CircleDot className="w-3.5 h-3.5" />}
            options={STATUS_OPTIONS.map(s => ({ id: s, label: STATUS_LABEL[s] }))}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
          />
          <MultiSelectFilter
            label="Site"
            icon={<MapPin className="w-3.5 h-3.5" />}
            options={availableStates}
            selected={selectedStates}
            onChange={setSelectedStates}
          />
          <MultiSelectFilter
            label="Clients"
            icon={<Briefcase className="w-3.5 h-3.5" />}
            options={availableClients}
            selected={selectedClients}
            onChange={setSelectedClients}
          />

          <div className="ml-auto flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 h-9 px-2.5 rounded-lg text-xs font-medium transition-colors"
                style={{ color: C.neutral500 }}
              >
                <X className="w-3.5 h-3.5" />
                Clear ({activeFilterCount})
              </button>
            )}
            <DateRangePicker value={selectedPreset} onChange={handleRangeChange} />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* KPI cards */}
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: C.neutral400 }}>Period: {rangeLabel}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard icon={<TicketIcon className="w-4 h-4" />} label="Total complaints" value={stats.totalComplaints.toString()} tone="neutral" />
              <KpiCard icon={<CheckCircle2 className="w-4 h-4" />} label="Resolved" value={stats.resolvedCount.toString()} tone="good" />
              <KpiCard icon={<PauseCircle className="w-4 h-4" />} label="On hold" value={stats.onHoldCount.toString()} tone="warning" />
              <KpiCard icon={<Percent className="w-4 h-4" />} label="Resolution rate" value={fmtPct(stats.resolutionRate)} tone="info" />
              <KpiCard
                icon={<AlertTriangle className="w-4 h-4" />}
                label="SLA breached"
                value={stats.slaBreachedCount.toString()}
                tone={stats.slaBreachedCount > 0 ? "critical" : "good"}
                pulse={stats.slaBreachedCount > 0}
              />
              <KpiCard icon={<Clock className="w-4 h-4" />} label="Avg. resolution time" value={fmtHours(stats.avgResolutionHours)} tone="neutral" />
            </div>
          </div>

          {/* Status distribution + department volume */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Ticket status distribution" subtitle={`All tickets in scope, by current status — ${rangeLabel}`}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusDistribution} dataKey="count" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {statusDistribution.map(s => (
                      <Cell key={s.status} fill={STATUS_COLOR[s.status]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontFamily: "ui-monospace" }} />
                </PieChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Tickets by department" subtitle={`Volume raised per department — ${rangeLabel}`}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptDistribution} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.neutral700 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={ACCENT_SECONDARY} radius={[0, 4, 4, 0]} name="Tickets" />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* State + client volume */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Tickets by site" subtitle="Only sites actually captured on raised tickets, top 10 shown">
              {stateDistribution.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: C.neutral400 }}>No tickets match the current filters</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, stateDistribution.length * 32)}>
                  <BarChart data={stateDistribution} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.neutral700 }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill={ACCENT_CHART_B} radius={[0, 4, 4, 0]} name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Tickets by client" subtitle="Only clients actually named on raised tickets, top 10 shown">
              {clientDistribution.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: C.neutral400 }}>No tickets match the current filters</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, clientDistribution.length * 32)}>
                  <BarChart data={clientDistribution} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.neutral700 }} axisLine={false} tickLine={false} width={130} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill={ACCENT_CHART_C} radius={[0, 4, 4, 0]} name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          {/* Average TAT analysis */}
          <SectionCard
            title="Average TAT analysis"
            subtitle={`Turnaround time on resolved tickets — ${rangeLabel}`}
            right={<Gauge className="w-4 h-4" style={{ color: C.neutral400 }} />}
          >
            <div className="flex flex-wrap items-baseline gap-3 pb-1">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: C.neutral400 }}>Overall avg. TAT</span>
              <span className="text-xl font-mono font-semibold" style={{ color: C.neutral900 }}>{fmtHours(overallAvgTat)}</span>
              <span className="text-xs" style={{ color: C.neutral400 }}>across {stats.resolvedCount} resolved tickets in scope</span>
            </div>

            <div>
              <p className="text-xs font-medium mb-2" style={{ color: C.neutral600 }}>By department</p>
              <ResponsiveContainer width="100%" height={Math.max(160, tatByDept.length * 42)}>
                <BarChart data={tatByDept} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} unit="h" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.neutral700 }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmtHours(v), "Avg. TAT"] as [string, string]} />
                  <Bar dataKey="avgHours" fill={ACCENT_CHART_A} radius={[0, 4, 4, 0]} name="Avg. TAT (hrs)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ height: 1, background: C.neutral100 }} />

            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p className="text-xs font-medium" style={{ color: C.neutral600 }}>By category, within a department</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {scopedDepartments.map(d => (
                    <Chip key={d.id} label={d.name} active={tatDeptId === d.id} onClick={() => setTatDeptId(d.id)} />
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(160, tatByCategory.length * 42)}>
                <BarChart data={tatByCategory} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: AXIS_TICK }} axisLine={false} tickLine={false} unit="h" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: C.neutral700 }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [fmtHours(v), "Avg. TAT"] as [string, string]} />
                  <Bar dataKey="avgHours" fill={ACCENT_PRIMARY} radius={[0, 4, 4, 0]} name="Avg. TAT (hrs)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
