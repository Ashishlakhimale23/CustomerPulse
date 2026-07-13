import React, { useEffect, useMemo, useRef, useState } from "react"; 
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  Ticket, FolderOpen, AlertTriangle, PauseCircle, CheckCircle2,
  Building2, ChevronDown, ChevronLeft, ArrowUpRight, ArrowDownRight, Users, Flame,
  ShieldAlert, TrendingUp, CalendarDays, Download,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens (brand palette supplied by client)
// ---------------------------------------------------------------------------
const C = {
  purple: "#1E22FB",     // primary-600 — main brand accent
  blue: "#4B4EFC",       // primary-500 — secondary accent
  teal: "#9CA3AF",       // neutral-400 — muted, used for lowest-priority / neutral series
  cyan: "#7375FD",       // primary-400 — lighter accent (secondary status tone)
  darkTeal: "#16A34A",   // success-600 — resolved / good states
  mist: "#E1E1FE",       // primary-100 — closest we have to primary-50, used for selected bg
  ink: "#111827",        // neutral-900
  slate: "#4B5563",      // neutral-600
  hairline: "#E5E7EB",   // neutral-200
  divider: "#F3F4F6",    // neutral-100
  canvas: "#F9FAFB",     // neutral-50
  danger: "#DC2626",     // destructive-600
  dangerTint: "#FEE2E2", // destructive-100
  amber: "#D97706",      // warning-600
  amberTint: "#FEF3C7",  // warning-100
  successTint: "#DCFCE7",// success-100
  muted: "#9CA3AF",      // neutral-400, empty-state text
};

const DEPT_CHART_COLORS = [C.purple, C.darkTeal, C.amber, C.slate, C.blue];

const STATUS_COLOR: Record<string, string> = {
  Open: C.blue,
  "In Progress": C.cyan,
  "On Hold": C.amber,
  Resolved: C.darkTeal,
};

const PRIORITY_COLOR: Record<string, string> = {
  P1: C.danger,
  P2: C.amber,
  P3: C.purple,
  P4: C.teal,
};

// ---------------------------------------------------------------------------
// Mock data — shaped like the Prisma schema (Ticket.status / priority / slaBreached,
// Department, CategoryAgent headcount, TicketStatusHistory-derived TAT).
// ---------------------------------------------------------------------------
type DeptKey = "it" | "hr" | "finance" | "facilities" | "security";

interface DeptSnapshot {
  key: DeptKey;
  name: string;
  manager: string;
  agents: number;
  open: number;
  inProgress: number;
  onHold: number;
  resolved: number;
  slaBreached: number;
  avgTatHrs: number;
  tatDeltaPct: number; // negative = improved (faster)
  priority: { P1: number; P2: number; P3: number; P4: number };
}

const DEPARTMENTS: DeptSnapshot[] = [
  { key: "it", name: "IT Support", manager: "Ramesh Iyer", agents: 12,
    open: 86, inProgress: 54, onHold: 21, resolved: 267, slaBreached: 34,
    avgTatHrs: 18.4, tatDeltaPct: -6.2, priority: { P1: 22, P2: 61, P3: 210, P4: 135 } },
  { key: "finance", name: "Finance & Payroll", manager: "Alka Desai", agents: 6,
    open: 41, inProgress: 18, onHold: 15, resolved: 129, slaBreached: 28,
    avgTatHrs: 27.6, tatDeltaPct: 11.8, priority: { P1: 18, P2: 39, P3: 96, P4: 50 } },
  { key: "security", name: "Security & Compliance", manager: "Vikram Suri", agents: 3,
    open: 27, inProgress: 9, onHold: 5, resolved: 56, slaBreached: 15,
    avgTatHrs: 22.3, tatDeltaPct: 4.1, priority: { P1: 20, P2: 24, P3: 32, P4: 21 } },
  { key: "hr", name: "HR Operations", manager: "Neha Kapoor", agents: 5,
    open: 22, inProgress: 14, onHold: 9, resolved: 111, slaBreached: 6,
    avgTatHrs: 9.2, tatDeltaPct: -14.5, priority: { P1: 3, P2: 15, P3: 78, P4: 60 } },
  { key: "facilities", name: "Facilities", manager: "Sanjay Rao", agents: 4,
    open: 19, inProgress: 11, onHold: 6, resolved: 98, slaBreached: 4,
    avgTatHrs: 11.1, tatDeltaPct: -3.0, priority: { P1: 2, P2: 12, P3: 70, P4: 50 } },
];

const DEPT_LABEL: Record<DeptKey, string> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.key, d.name])
) as Record<DeptKey, string>;

const fmt = (n: number) => n.toLocaleString("en-IN");

// small deterministic PRNG so the mock trend series is stable across renders
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260712);

// "current moment" the whole mock dataset is anchored to
const NOW = new Date(2026, 6, 12, 15, 30, 0); // Jul 12, 2026, 3:30pm
const BASELINE_DAYS = 182; // ~6 months — the reference window the mock totals below were tuned for

// ---------------------------------------------------------------------------
// Date-range math
// ---------------------------------------------------------------------------
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => { const x = startOfDay(d); const day = x.getDay(); const diff = day === 0 ? 6 : day - 1; return addDays(x, -diff); }; // Monday start
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfQuarter = (d: Date) => { const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1); };
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

type PresetKey =
  | "today" | "yesterday" | "last24h"
  | "thisWeek" | "lastWeek" | "last7d"
  | "thisMonth" | "lastMonth" | "last30d"
  | "thisQuarter" | "lastQuarter" | "thisYear" | "last90d"
  | "allTime" | "custom";

const PRESET_GROUPS: { label: string; options: { key: PresetKey; label: string }[] }[] = [
  { label: "Recent", options: [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "last24h", label: "Last 24 hours" },
  ] },
  { label: "Weekly", options: [
    { key: "thisWeek", label: "This Week" },
    { key: "lastWeek", label: "Last Week" },
    { key: "last7d", label: "Last 7 Days" },
  ] },
  { label: "Monthly", options: [
    { key: "thisMonth", label: "This Month" },
    { key: "lastMonth", label: "Last Month" },
    { key: "last30d", label: "Last 30 Days" },
  ] },
  { label: "Longer range", options: [
    { key: "thisQuarter", label: "This Quarter" },
    { key: "lastQuarter", label: "Last Quarter" },
    { key: "thisYear", label: "This Year" },
    { key: "last90d", label: "Last 90 Days" },
  ] },
  { label: "Other", options: [
    { key: "allTime", label: "All Time" },
    { key: "custom", label: "Custom Range…" },
  ] },
];
const PRESET_LABEL: Record<PresetKey, string> = Object.fromEntries(
  PRESET_GROUPS.flatMap((g) => g.options).map((o) => [o.key, o.label])
) as Record<PresetKey, string>;

interface DateRange { start: Date; end: Date; }

function resolvePresetRange(key: PresetKey, custom: { from: Date; to: Date } | null): DateRange {
  switch (key) {
    case "today": return { start: startOfDay(NOW), end: NOW };
    case "yesterday": { const y = addDays(NOW, -1); return { start: startOfDay(y), end: endOfDay(y) }; }
    case "last24h": return { start: new Date(NOW.getTime() - 24 * 3_600_000), end: NOW };
    case "thisWeek": return { start: startOfWeek(NOW), end: NOW };
    case "lastWeek": { const s = startOfWeek(NOW); const prevEnd = addDays(s, -1); return { start: startOfWeek(prevEnd), end: endOfDay(prevEnd) }; }
    case "last7d": return { start: addDays(NOW, -7), end: NOW };
    case "thisMonth": return { start: startOfMonth(NOW), end: NOW };
    case "lastMonth": { const s = startOfMonth(NOW); const prevEnd = addDays(s, -1); return { start: startOfMonth(prevEnd), end: endOfDay(prevEnd) }; }
    case "last30d": return { start: addDays(NOW, -30), end: NOW };
    case "thisQuarter": return { start: startOfQuarter(NOW), end: NOW };
    case "lastQuarter": { const s = startOfQuarter(NOW); const prevEnd = addDays(s, -1); return { start: startOfQuarter(prevEnd), end: endOfDay(prevEnd) }; }
    case "thisYear": return { start: startOfYear(NOW), end: NOW };
    case "last90d": return { start: addDays(NOW, -90), end: NOW };
    case "allTime": return { start: addDays(NOW, -365), end: NOW }; // full span of the mock dataset
    case "custom": return custom ? { start: startOfDay(custom.from), end: endOfDay(custom.to) } : { start: startOfWeek(NOW), end: NOW };
  }
}

function getPreviousRange(range: DateRange): DateRange {
  const durationMs = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - durationMs), end: new Date(range.start.getTime() - 1) };
}

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Trend datasets — every point carries a real Date so arbitrary custom
// ranges (not just fixed presets) can filter them correctly.
// ---------------------------------------------------------------------------
const DAILY_DAYS_BACK = 120;
const DAILY_DATES = Array.from({ length: DAILY_DAYS_BACK }, (_, i) => addDays(startOfDay(NOW), -(DAILY_DAYS_BACK - 1 - i)));

const VOLUME_TREND_DAILY = DAILY_DATES.map((date, i) => {
  const trend = 6 + (i / (DAILY_DAYS_BACK - 1)) * 3.2;
  const weekendDip = i % 7 >= 5 ? 0.55 : 1;
  const created = Math.max(1, Math.round(trend * weekendDip + (rng() - 0.5) * 3));
  const resolved = Math.max(1, Math.round(trend * 0.95 * weekendDip + (rng() - 0.5) * 3));
  return { date, month: formatShort(date), created, resolved };
});

// org-wide monthly created vs resolved (12 calendar months, ending this month)
const MONTHLY_CREATED = [148, 156, 163, 159, 141, 168, 172, 189, 205, 198, 224, 236];
const MONTHLY_RESOLVED = [141, 149, 155, 162, 148, 160, 158, 176, 190, 201, 209, 214];
const MONTH_DATES = Array.from({ length: 12 }, (_, i) => new Date(NOW.getFullYear(), NOW.getMonth() - (11 - i), 1));
const VOLUME_TREND_FULL = MONTH_DATES.map((date, i) => ({
  date, month: date.toLocaleDateString("en-US", { month: "short" }), created: MONTHLY_CREATED[i], resolved: MONTHLY_RESOLVED[i],
}));

// per-department SLA compliance % trend (12 months)
const SLA_TREND: Record<DeptKey, number[]> = {
  it: [90, 89, 88, 87, 86, 87, 88, 87, 85, 86, 89, 91],
  finance: [82, 81, 80, 78, 77, 78, 79, 76, 74, 72, 75, 78],
  security: [85, 86, 84, 83, 82, 83, 83, 81, 80, 84, 85, 84],
  hr: [93, 94, 95, 95, 96, 96, 95, 96, 94, 97, 97, 98],
  facilities: [94, 95, 96, 95, 96, 97, 96, 95, 97, 98, 97, 98],
};
const SLA_TREND_DATA_FULL = MONTH_DATES.map((date, i) => {
  const row: Record<string, number | string | Date> = { date, month: date.toLocaleDateString("en-US", { month: "short" }) };
  DEPARTMENTS.forEach((d) => (row[d.key] = SLA_TREND[d.key][i]));
  return row as { date: Date; month: string } & Record<DeptKey, number>;
});

// per-department daily SLA% — random walk anchored to that department's latest monthly figure
const SLA_TREND_DAILY_BY_DEPT: Record<DeptKey, number[]> = Object.fromEntries(
  DEPARTMENTS.map((d) => {
    let v = SLA_TREND[d.key][SLA_TREND[d.key].length - 1];
    const series = DAILY_DATES.map(() => {
      v = Math.min(100, Math.max(55, v + (rng() - 0.5) * 4));
      return Math.round(v);
    });
    return [d.key, series];
  })
) as Record<DeptKey, number[]>;
const SLA_TREND_DATA_DAILY = DAILY_DATES.map((date, i) => {
  const row: Record<string, number | string | Date> = { date, month: formatShort(date) };
  DEPARTMENTS.forEach((d) => (row[d.key] = SLA_TREND_DAILY_BY_DEPT[d.key][i]));
  return row as { date: Date; month: string } & Record<DeptKey, number>;
});

function filterByRange<T extends { date: Date }>(arr: T[], range: DateRange, wholeMonth: boolean): T[] {
  const floor = wholeMonth ? startOfMonth(range.start).getTime() : startOfDay(range.start).getTime();
  return arr.filter((p) => p.date.getTime() >= floor && p.date.getTime() <= range.end.getTime());
}

interface AtRiskTicket {
  id: string;
  dept: DeptKey;
  title: string;
  priority: "P1" | "P2" | "P3" | "P4";
  ageHrs: number;
  assignee: string;
  status: "Breached" | "At risk";
}

const AT_RISK: AtRiskTicket[] = [
  { id: "TKT-10432", dept: "finance", title: "Vendor payment batch stuck in approval", priority: "P1", ageHrs: 41, assignee: "A. Desai", status: "Breached" },
  { id: "TKT-10471", dept: "it", title: "VPN gateway intermittent drops – Pune office", priority: "P1", ageHrs: 26, assignee: "R. Iyer", status: "Breached" },
  { id: "TKT-10501", dept: "security", title: "Access review overdue for contractor accounts", priority: "P1", ageHrs: 19, assignee: "V. Suri", status: "At risk" },
  { id: "TKT-10488", dept: "finance", title: "Payroll variance – Q2 reconciliation", priority: "P2", ageHrs: 34, assignee: "S. Nair", status: "Breached" },
  { id: "TKT-10512", dept: "it", title: "ERP login failures after SSO rollout", priority: "P1", ageHrs: 14, assignee: "P. Mehta", status: "At risk" },
  { id: "TKT-10460", dept: "security", title: "Firewall rule exception pending sign-off", priority: "P2", ageHrs: 22, assignee: "V. Suri", status: "At risk" },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
function KpiCard({
  icon: Icon, label, value, sub, accent, delta,
}: {
  icon: any; label: string; value: string; sub: string; accent: string; delta?: { value: string; good: boolean };
}) {
  return (
    <div className="flex-1 min-w-[176px] rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-[0_1px_2px_rgba(20,20,43,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}17` }}>
          <Icon size={18} style={{ color: accent }} strokeWidth={2.25} />
        </div>
        {delta && (
          <span className="flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: delta.good ? C.darkTeal : C.danger }}>
            {delta.good ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
            {delta.value}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: C.ink }}>{value}</div>
      <div className="text-[13px] font-medium mt-0.5" style={{ color: C.slate }}>{label}</div>
      <div className="text-[11px] mt-1.5" style={{ color: "#9AA1B4" }}>{sub}</div>
    </div>
  );
}

function SectionCard({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] p-5 shadow-[0_1px_2px_rgba(20,20,43,0.04)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: C.ink }}>{title}</h3>
          {subtitle && <p className="text-[12px] mt-0.5" style={{ color: C.slate }}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick, dotColor }: { label: string; active: boolean; onClick: () => void; dotColor?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-colors whitespace-nowrap ${
        active ? "text-white border-transparent" : "bg-white border-[#E5E7EB] hover:border-[#D1D5DB]"
      }`}
      style={{ backgroundColor: active ? C.purple : undefined, color: active ? "white" : C.slate }}
    >
      {dotColor && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? "white" : dotColor }} />}
      {label}
    </button>
  );
}

function Legend2({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: C.slate }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: it.color }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-[140px] text-center px-6">
      <p className="text-[12.5px]" style={{ color: C.muted }}>{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date range filter — dropdown trigger + grouped presets + custom sub-view
// ---------------------------------------------------------------------------
function DateRangeFilter({
  rangeKey, onSelectPreset, onApplyCustom, customRange,
}: {
  rangeKey: PresetKey;
  onSelectPreset: (key: PresetKey) => void;
  onApplyCustom: (from: Date, to: Date) => void;
  customRange: { from: Date; to: Date } | null;
}) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [fromStr, setFromStr] = useState(customRange ? toDateInputValue(customRange.from) : "");
  const [toStr, setToStr] = useState(customRange ? toDateInputValue(customRange.to) : toDateInputValue(NOW));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustom(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setShowCustom(false); }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  const todayStr = toDateInputValue(NOW);
  const fromDate = fromStr ? new Date(fromStr + "T00:00:00") : null;
  const toDate = toStr ? new Date(toStr + "T00:00:00") : null;
  const isAfter = !!(fromDate && toDate && fromDate.getTime() > toDate.getTime());
  const isValid = !!fromStr && !!toStr && !isAfter;

  const triggerLabel = rangeKey === "custom" && customRange
    ? `${formatShort(customRange.from)} – ${formatShort(customRange.to)}, ${customRange.to.getFullYear()}`
    : PRESET_LABEL[rangeKey];

  function openCustomView() {
    setShowCustom(true);
    if (!fromStr) setFromStr(customRange ? toDateInputValue(customRange.from) : toDateInputValue(addDays(NOW, -7)));
    if (!toStr) setToStr(customRange ? toDateInputValue(customRange.to) : todayStr);
  }

  function handleApply() {
    if (!isValid || !fromDate || !toDate) return;
    onApplyCustom(fromDate, toDate);
    setOpen(false);
    setShowCustom(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white text-[13px] font-medium transition-colors"
        style={{ borderColor: open ? C.blue : C.hairline, color: C.ink }}
      >
        <CalendarDays size={14} style={{ color: C.muted }} />
        {triggerLabel}
        <ChevronDown size={14} style={{ color: C.muted, transform: open ? "rotate(180deg)" : undefined, transition: "transform 120ms" }} />
      </button>

      {open && !showCustom && (
        <div className="absolute right-0 mt-1.5 w-56 h-[320px] overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(20,20,43,0.12)] py-1.5 z-20">
          {PRESET_GROUPS.map((group, gi) => (
            <div key={group.label}>
              {gi > 0 && <div className="my-1.5 border-t" style={{ borderColor: C.divider }} />}
              <div className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-wide uppercase" style={{ color: C.muted }}>
                {group.label}
              </div>
              {group.options.map((opt) => {
                const active = rangeKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => (opt.key === "custom" ? openCustomView() : (onSelectPreset(opt.key), setOpen(false)))}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[12.5px] text-left transition-colors"
                    style={{ backgroundColor: active ? C.mist : "transparent", color: active ? C.purple : C.ink }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = C.canvas; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {opt.label}
                    {active && <span style={{ color: C.purple }}>✓</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {open && showCustom && (
        <div className="absolute right-0 mt-1.5 w-72 rounded-lg border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(20,20,43,0.12)] p-3 z-20">
          <button
            onClick={() => setShowCustom(false)}
            className="flex items-center gap-1 text-[12px] font-medium mb-3"
            style={{ color: C.slate }}
          >
            <ChevronLeft size={14} /> Back
          </button>

          <label className="block text-[11px] font-medium mb-1" style={{ color: C.slate }}>From</label>
          <input
            type="date"
            value={fromStr}
            max={toStr || todayStr}
            onChange={(e) => setFromStr(e.target.value)}
            className="w-full mb-3 px-2.5 py-1.5 rounded-md border text-[12.5px]"
            style={{ borderColor: C.hairline, color: C.ink }}
          />

          <label className="block text-[11px] font-medium mb-1" style={{ color: C.slate }}>To</label>
          <input
            type="date"
            value={toStr}
            max={todayStr}
            onChange={(e) => setToStr(e.target.value)}
            className="w-full mb-2 px-2.5 py-1.5 rounded-md border text-[12.5px]"
            style={{ borderColor: C.hairline, color: C.ink }}
          />

          {isAfter && (
            <p className="text-[11px] mb-2" style={{ color: C.danger }}>"From" date must be before "To" date.</p>
          )}

          <button
            onClick={handleApply}
            disabled={!isValid}
            className="w-full py-2 rounded-md text-[13px] font-semibold text-white transition-opacity"
            style={{ backgroundColor: C.purple, opacity: isValid ? 1 : 0.4, cursor: isValid ? "pointer" : "not-allowed" }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function CXODashboard() {
  const [selected, setSelected] = useState<DeptKey | "all">("all");
  const [rangeKey, setRangeKey] = useState<PresetKey>("thisWeek");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | null>(null);

  function handleSelectPreset(key: PresetKey) {
    setRangeKey(key);
  }
  function handleApplyCustom(from: Date, to: Date) {
    setCustomRange({ from, to });
    setRangeKey("custom");
  }

  const range = useMemo(() => resolvePresetRange(rangeKey, customRange), [rangeKey, customRange]);
  const previousRange = useMemo(() => getPreviousRange(range), [range]);
  const rangeDays = (range.end.getTime() - range.start.getTime()) / 86_400_000;
  const useDaily = rangeDays <= 35;

  // continuous scaling factor derived from the actual selected window length,
  // relative to the ~6-month baseline the mock department totals were tuned for.
  // short windows (Today, Last 24 hours) legitimately round down to 0 for
  // smaller departments — that's intentional, it's what drives the empty states.
  const factor = Math.min(rangeDays / BASELINE_DAYS, 2.2);

  const scaledDepartments: DeptSnapshot[] = useMemo(
    () =>
      DEPARTMENTS.map((d) => ({
        ...d,
        open: Math.round(d.open * factor),
        inProgress: Math.round(d.inProgress * factor),
        onHold: Math.round(d.onHold * factor),
        resolved: Math.round(d.resolved * factor),
        slaBreached: Math.round(d.slaBreached * factor),
        priority: {
          P1: Math.round(d.priority.P1 * factor),
          P2: Math.round(d.priority.P2 * factor),
          P3: Math.round(d.priority.P3 * factor),
          P4: Math.round(d.priority.P4 * factor),
        },
      })),
    [factor]
  );

  const volumeTrend = useMemo(
    () => filterByRange(useDaily ? VOLUME_TREND_DAILY : VOLUME_TREND_FULL, range, !useDaily),
    [range, useDaily]
  );
  const slaTrendData = useMemo(
    () => filterByRange(useDaily ? SLA_TREND_DATA_DAILY : SLA_TREND_DATA_FULL, range, !useDaily),
    [range, useDaily]
  );
  const previousVolumeTrend = useMemo(
    () => filterByRange(useDaily ? VOLUME_TREND_DAILY : VOLUME_TREND_FULL, previousRange, !useDaily),
    [previousRange, useDaily]
  );
  const previousSlaTrendData = useMemo(
    () => filterByRange(useDaily ? SLA_TREND_DATA_DAILY : SLA_TREND_DATA_FULL, previousRange, !useDaily),
    [previousRange, useDaily]
  );
  // thin out x-axis labels for dense daily series so they don't collide
  const xAxisInterval = volumeTrend.length > 10 ? Math.max(0, Math.ceil(volumeTrend.length / 7) - 1) : 0;

  const volumeIsEmpty = volumeTrend.every((p) => p.created === 0 && p.resolved === 0);
  function avgCompliance(rows: { [k: string]: any }[]): number | null {
    const vals: number[] = [];
    rows.forEach((r) => DEPARTMENTS.forEach((d) => { const v = r[d.key]; if (typeof v === "number") vals.push(v); }));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  const slaTrendIsEmpty = slaTrendData.length === 0;

  // real (not proportionally-scaled) deltas vs the immediately preceding period of equal length
  const resolvedSum = volumeTrend.reduce((s, p) => s + p.resolved, 0);
  const prevResolvedSum = previousVolumeTrend.reduce((s, p) => s + p.resolved, 0);
  const resolvedDeltaPct = prevResolvedSum > 0 ? Math.round(((resolvedSum - prevResolvedSum) / prevResolvedSum) * 1000) / 10 : null;

  const currentCompliance = avgCompliance(slaTrendData);
  const previousCompliance = avgCompliance(previousSlaTrendData);
  const breachedDeltaPct =
    currentCompliance != null && previousCompliance != null && 100 - previousCompliance > 0
      ? Math.round((((100 - currentCompliance) - (100 - previousCompliance)) / (100 - previousCompliance)) * 1000) / 10
      : null;

  const scope: DeptSnapshot[] = useMemo(
    () => (selected === "all" ? scaledDepartments : scaledDepartments.filter((d) => d.key === selected)),
    [selected, scaledDepartments]
  );

  const totals = useMemo(() => {
    const total = scope.reduce((s, d) => s + d.open + d.inProgress + d.onHold + d.resolved, 0);
    const open = scope.reduce((s, d) => s + d.open, 0);
    const onHold = scope.reduce((s, d) => s + d.onHold, 0);
    const slaBreached = scope.reduce((s, d) => s + d.slaBreached, 0);
    const resolved = scope.reduce((s, d) => s + d.resolved, 0);
    const closedTickets = resolved + slaBreached;
    const slaCompliance = closedTickets > 0 ? Math.round(((closedTickets - slaBreached) / closedTickets) * 100) : null;
    const avgTat = scope.reduce((s, d) => s + d.avgTatHrs, 0) / scope.length;
    return { total, open, onHold, slaBreached, resolved, slaCompliance, avgTat };
  }, [scope]);

  const priorityTotals = useMemo(() => {
    const p = { P1: 0, P2: 0, P3: 0, P4: 0 };
    scope.forEach((d) => {
      p.P1 += d.priority.P1; p.P2 += d.priority.P2; p.P3 += d.priority.P3; p.P4 += d.priority.P4;
    });
    return p;
  }, [scope]);
  const priorityMax = Math.max(...Object.values(priorityTotals));
  const priorityIsEmpty = priorityMax === 0;

  const pulseData = scaledDepartments.map((d) => {
    const total = d.open + d.inProgress + d.onHold + d.resolved;
    const closed = d.resolved + d.slaBreached;
    return {
      key: d.key,
      name: d.name,
      Open: d.open,
      "In Progress": d.inProgress,
      "On Hold": d.onHold,
      Resolved: d.resolved,
      total,
      slaPct: closed > 0 ? Math.round((d.resolved / closed) * 100) : null,
    };
  }).sort((a, b) => b.total - a.total);
  const pulseIsEmpty = pulseData.every((r) => r.total === 0);

  const riskFiltered = selected === "all" ? AT_RISK : AT_RISK.filter((t) => t.dept === selected);


  const gaugeCirc = 2 * Math.PI * 42;
  const gaugeOffset = totals.slaCompliance != null ? gaugeCirc - (totals.slaCompliance / 100) * gaugeCirc : gaugeCirc;
  const gaugeColor = totals.slaCompliance == null ? C.hairline : totals.slaCompliance >= 90 ? C.darkTeal : totals.slaCompliance >= 80 ? C.amber : C.danger;

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: C.canvas, fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="max-w-[1240px] mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.blue})` }}>
              <img src={"../../assets/logo.jpg"} alt=""  />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[18px] font-bold" style={{ color: C.ink }}>SML OPERATIONS — Executive Overview</h1>
              </div>
              <p className="text-[12.5px]" style={{ color: C.slate }}>Org-wide ticket performance across all departments · updated moments ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeFilter
              rangeKey={rangeKey}
              onSelectPreset={handleSelectPreset}
              onApplyCustom={handleApplyCustom}
              customRange={customRange}
            />


            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E5E7EB]">
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold" style={{ backgroundColor: C.purple }}>PK</div>
              <div className="leading-tight">
                <div className="text-[12.5px] font-semibold" style={{ color: C.ink }}>Priya Kulkarni</div>
                <div className="text-[11px]" style={{ color: C.slate }}>CXO</div>
              </div>
            </div>
          </div>
        </div>

        {/* Department filter chips */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          <Chip label="All departments" active={selected === "all"} onClick={() => setSelected("all")} />
          {DEPARTMENTS.map((d) => (
            <Chip key={d.key} label={d.name} active={selected === d.key} onClick={() => setSelected(d.key)} dotColor={C.purple} />
          ))}
        </div>

        {/* KPI row */}
        <div className="flex gap-3 flex-wrap mb-5">
          <KpiCard icon={Ticket} label="Total tickets" value={fmt(totals.total)} sub={selected === "all" ? "across 5 departments" : DEPT_LABEL[selected]} accent={C.purple} />
          <KpiCard icon={FolderOpen} label="Open tickets" value={fmt(totals.open)} sub={totals.total > 0 ? `${Math.round((totals.open / totals.total) * 100)}% of total volume` : "no tickets in this window"} accent={C.blue} />
          <KpiCard
            icon={AlertTriangle} label="SLA breached" value={fmt(totals.slaBreached)} sub="needs escalation review" accent={C.danger}
            delta={breachedDeltaPct != null ? { value: `${Math.abs(breachedDeltaPct)}%`, good: breachedDeltaPct <= 0 } : undefined}
          />
          <KpiCard icon={PauseCircle} label="On hold" value={fmt(totals.onHold)} sub="awaiting requester / 3rd party" accent={C.amber} />
          <KpiCard
            icon={CheckCircle2} label="Resolved" value={fmt(totals.resolved)} sub="in selected period" accent={C.darkTeal}
            delta={resolvedDeltaPct != null ? { value: `${Math.abs(resolvedDeltaPct)}%`, good: resolvedDeltaPct >= 0 } : undefined}
          />
          <KpiCard icon={TrendingUp} label="Avg turnaround" value={`${totals.avgTat.toFixed(1)}h`} sub="request to resolution" accent={C.cyan} />
        </div>

        {/* Signature: Department Pulse + SLA gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 mb-4">
          <SectionCard
            title="Department pulse"
            subtitle="Live ticket mix per department, ranked by volume — scan for imbalance at a glance"
            right={<Legend2 items={[
              { label: "Open", color: C.blue }, { label: "In progress", color: C.cyan },
              { label: "On hold", color: C.amber }, { label: "Resolved", color: C.darkTeal },
            ]} />}
          >
            {pulseIsEmpty ? (
              <EmptyState message="No tickets in the selected window." />
            ) : (
              <div className="space-y-3.5">
                {pulseData.map((row) => (
                  <div key={row.key} className={`rounded-lg -mx-2 px-2 py-1.5 transition-colors ${selected === row.key ? "bg-[#E1E1FE]" : ""}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold" style={{ color: C.ink }}>{row.name}</span>
                        <span className="text-[11px]" style={{ color: C.slate }}>{fmt(row.total)} tickets</span>
                      </div>
                      {row.slaPct != null ? (
                        <span
                          className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ color: row.slaPct >= 90 ? C.darkTeal : row.slaPct >= 80 ? C.amber : C.danger,
                                   backgroundColor: row.slaPct >= 90 ? C.successTint : row.slaPct >= 80 ? C.amberTint : C.dangerTint }}
                        >
                          {row.slaPct}% SLA
                        </span>
                      ) : (
                        <span className="text-[11px]" style={{ color: C.muted }}>No closed tickets</span>
                      )}
                    </div>
                    {row.total > 0 ? (
                      <div className="h-3.5 w-full rounded-full overflow-hidden flex bg-[#F0F1F6]">
                        {(["Open", "In Progress", "On Hold", "Resolved"] as const).map((s) => {
                          const w = (row[s] / row.total) * 100;
                          return w > 0 ? <div key={s} style={{ width: `${w}%`, backgroundColor: STATUS_COLOR[s] }} /> : null;
                        })}
                      </div>
                    ) : (
                      <div className="h-3.5 w-full rounded-full bg-[#F0F1F6]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Org SLA compliance" subtitle="Resolved within deadline">
            <div className="flex flex-col items-center justify-center h-full pt-1">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#F0F1F6" strokeWidth="9" />
                  <circle
                    cx="50" cy="50" r="42" fill="none" stroke={gaugeColor} strokeWidth="9"
                    strokeDasharray={gaugeCirc} strokeDashoffset={gaugeOffset} strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold" style={{ color: C.ink }}>{totals.slaCompliance != null ? `${totals.slaCompliance}%` : "—"}</span>
                  <span className="text-[10px]" style={{ color: C.slate }}>target 90%</span>
                </div>
              </div>
              <p className="text-[11.5px] text-center mt-3 leading-snug" style={{ color: C.slate }}>
                {totals.slaCompliance == null
                  ? "No resolved tickets in this window yet."
                  : totals.slaCompliance >= 90
                  ? "Within target across the selected scope."
                  : "Below the 90% target — Finance and Security are the main drag."}
              </p>
            </div>
          </SectionCard>
        </div>

        {/* Trend row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <SectionCard title="Ticket volume trend" subtitle={`Created vs. resolved, organisation-wide · ${PRESET_LABEL[rangeKey].toLowerCase()}`}>
            {volumeIsEmpty ? (
              <EmptyState message="No tickets created or resolved in this window." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={volumeTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="createdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.purple} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={C.purple} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.blue} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={C.blue} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hairline} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11.5, fill: C.slate }} axisLine={{ stroke: C.hairline }} tickLine={false} interval={xAxisInterval} />
                  <YAxis tick={{ fontSize: 11.5, fill: C.slate }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.hairline}` }} />
                  <Area type="monotone" dataKey="created" name="Created" stroke={C.purple} fill="url(#createdGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke={C.blue} fill="url(#resolvedGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <SectionCard title="SLA compliance trend" subtitle={`By department, against 90% target · ${PRESET_LABEL[rangeKey].toLowerCase()}`}>
            {slaTrendIsEmpty ? (
              <EmptyState message="No resolved tickets to score in this window." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={slaTrendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hairline} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11.5, fill: C.slate }} axisLine={{ stroke: C.hairline }} tickLine={false} interval={xAxisInterval} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 11.5, fill: C.slate }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.hairline}` }} />
                  <ReferenceLine y={90} stroke={C.slate} strokeDasharray="4 4" label={{ value: "Target", fontSize: 10, fill: C.slate, position: "insideTopRight" }} />
                  {DEPARTMENTS.map((d, i) => (
                    <Line
                      key={d.key} type="monotone" dataKey={d.key} name={d.name}
                      stroke={DEPT_CHART_COLORS[i % DEPT_CHART_COLORS.length]}
                      strokeWidth={selected === "all" || selected === d.key ? 2.25 : 1}
                      strokeOpacity={selected === "all" || selected === d.key ? 1 : 0.25}
                      dot={false}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </div>

        {/* Priority + At risk row */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 mb-4">
          <SectionCard title="Priority mix" subtitle={selected === "all" ? "All departments" : DEPT_LABEL[selected]}>
            {priorityIsEmpty ? (
              <EmptyState message="No tickets created in this window." />
            ) : (
              <>
                <div className="space-y-3 mt-1">
                  {(["P1", "P2", "P3", "P4"] as const).map((p) => (
                    <div key={p}>
                      <div className="flex items-center justify-between text-[12px] mb-1">
                        <span className="font-semibold" style={{ color: C.ink }}>{p} {p === "P1" && <span className="text-[10px] font-medium" style={{ color: C.slate }}>· critical</span>}</span>
                        <span style={{ color: C.slate }}>{fmt(priorityTotals[p])}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[#F0F1F6] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(priorityTotals[p] / priorityMax) * 100}%`, backgroundColor: PRIORITY_COLOR[p] }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-center gap-2">
                  <Flame size={15} style={{ color: C.danger }} />
                  <p className="text-[11.5px]" style={{ color: C.slate }}>
                    P1 volume is up in Security & Compliance — worth a staffing check.
                  </p>
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            title="At-risk & breached tickets"
            subtitle="P1/P2 tickets breached or approaching SLA deadline — live backlog, not date-filtered"
            right={<span className="flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: C.danger }}><ShieldAlert size={14} />{riskFiltered.length} flagged</span>}
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left" style={{ color: C.slate }}>
                    <th className="font-medium pb-2 px-1">Ticket</th>
                    <th className="font-medium pb-2 px-1">Department</th>
                    <th className="font-medium pb-2 px-1">Priority</th>
                    <th className="font-medium pb-2 px-1">Age</th>
                    <th className="font-medium pb-2 px-1">Assignee</th>
                    <th className="font-medium pb-2 px-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {riskFiltered.map((t) => (
                    <tr key={t.id} className="border-t" style={{ borderColor: C.hairline }}>
                      <td className="py-2 px-1">
                        <div className="font-semibold" style={{ color: C.ink }}>{t.id}</div>
                        <div className="text-[11.5px]" style={{ color: C.slate }}>{t.title}</div>
                      </td>
                      <td className="py-2 px-1" style={{ color: C.slate }}>{DEPT_LABEL[t.dept]}</td>
                      <td className="py-2 px-1">
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold text-white" style={{ backgroundColor: PRIORITY_COLOR[t.priority] }}>{t.priority}</span>
                      </td>
                      <td className="py-2 px-1" style={{ color: C.slate }}>{t.ageHrs}h</td>
                      <td className="py-2 px-1" style={{ color: C.slate }}>{t.assignee}</td>
                      <td className="py-2 px-1">
                        <span
                          className="px-1.5 py-0.5 rounded text-[11px] font-semibold"
                          style={{
                            color: t.status === "Breached" ? C.danger : C.amber,
                            backgroundColor: t.status === "Breached" ? C.dangerTint : C.amberTint,
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {riskFiltered.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center" style={{ color: C.muted }}>No flagged tickets in this department.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Department performance table */}
        <SectionCard title="Department performance" subtitle="Headcount, load, and turnaround at a glance">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left" style={{ color: C.slate }}>
                  <th className="font-medium pb-2 px-1">Department</th>
                  <th className="font-medium pb-2 px-1">Manager</th>
                  <th className="font-medium pb-2 px-1">Agents</th>
                  <th className="font-medium pb-2 px-1">Total tickets</th>
                  <th className="font-medium pb-2 px-1">Open / agent</th>
                  <th className="font-medium pb-2 px-1">Avg TAT</th>
                  <th className="font-medium pb-2 px-1">SLA breached</th>
                  <th className="font-medium pb-2 px-1">SLA %</th>
                </tr>
              </thead>
              <tbody>
                {scaledDepartments.map((d) => {
                  const total = d.open + d.inProgress + d.onHold + d.resolved;
                  const closed = d.resolved + d.slaBreached;
                  const slaPct = closed > 0 ? Math.round((d.resolved / closed) * 100) : null;
                  const perAgent = (d.open / d.agents).toFixed(1);
                  return (
                    <tr key={d.key} className={`border-t ${selected === d.key ? "bg-[#E1E1FE]" : ""}`} style={{ borderColor: C.hairline }}>
                      <td className="py-2.5 px-1 font-semibold" style={{ color: C.ink }}>{d.name}</td>
                      <td className="py-2.5 px-1" style={{ color: C.slate }}>{d.manager}</td>
                      <td className="py-2.5 px-1" style={{ color: C.slate }}>
                        <span className="inline-flex items-center gap-1"><Users size={12} />{d.agents}</span>
                      </td>
                      <td className="py-2.5 px-1" style={{ color: C.slate }}>{fmt(total)}</td>
                      <td className="py-2.5 px-1" style={{ color: Number(perAgent) > 8 ? C.danger : C.slate, fontWeight: Number(perAgent) > 8 ? 600 : 400 }}>{perAgent}</td>
                      <td className="py-2.5 px-1">
                        <span className="inline-flex items-center gap-1" style={{ color: d.tatDeltaPct > 0 ? C.danger : C.darkTeal }}>
                          {d.avgTatHrs.toFixed(1)}h
                          {d.tatDeltaPct > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        </span>
                      </td>
                      <td className="py-2.5 px-1" style={{ color: C.slate }}>{d.slaBreached}</td>
                      <td className="py-2.5 px-1">
                        {slaPct != null ? (
                          <span
                            className="px-1.5 py-0.5 rounded text-[11px] font-semibold"
                            style={{
                              color: slaPct >= 90 ? C.darkTeal : slaPct >= 80 ? C.amber : C.danger,
                              backgroundColor: slaPct >= 90 ? C.successTint : slaPct >= 80 ? C.amberTint : C.dangerTint,
                            }}
                          >
                            {slaPct}%
                          </span>
                        ) : (
                          <span className="text-[11px]" style={{ color: C.muted }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <p className="text-center text-[11px] mt-6" style={{ color: "#9AA1B4" }}>
          Figures are illustrative sample data for layout purposes — wire up to your ticket API to go live.
        </p>
      </div>
    </div>
  );
}