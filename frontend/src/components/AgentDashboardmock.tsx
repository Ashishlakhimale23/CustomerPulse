import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Timer,
  PauseCircle,
  RotateCcw,
  Search,
  Bell,
  ChevronDown,
  Building2,
  ArrowUpRight,
  Flame,
  CircleDot,
  Check,
  Calendar,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Domain types                                                       */
/* ------------------------------------------------------------------ */
type TicketStatus = "OPEN" | "IN_PROGRESS" | "ON_HOLD" | "RESOLVED" | "REOPENED";
type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type TicketTab = "OPEN" | "BREACHED" | "ALL";

type DateRangeKey =
  | "Today"
  | "Yesterday"
  | "Last 24 hours"
  | "This Week"
  | "Last Week"
  | "Last 7 Days"
  | "This Month"
  | "Last Month"
  | "Last 30 Days"
  | "This Quarter"
  | "Last Quarter"
  | "This Year"
  | "Last 90 Days"
  | "All Time"
  | "Custom Range…";

interface StatusSegment {
  status: TicketStatus;
  hours: number;
}

interface MockTicket {
  id: string;
  subject: string;
  requester: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: number;
  dueAt: number;
  resolvedAt: number | null;
  tatHours: number;
  dueInHrs: number;
  slaBreached: boolean;
  segments: StatusSegment[];
}

interface StatusMeta {
  label: string;
  fg: string;
  bg: string;
  dot: string;
}

interface PriorityMeta {
  label: string;
  fg: string;
  bg: string;
}

interface KpiTrend {
  direction: "up" | "down";
  value: string;
}

interface CustomBounds {
  start: number;
  end: number;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  Design tokens — pulled 1:1 from the supplied palette              */
/* ------------------------------------------------------------------ */
type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

const C: Record<"primary" | "neutral" | "success" | "warning" | "destructive", Scale> = {
  primary: { 50: "#F5F5FF", 100: "#E1E1FE", 200: "#C3C4FE", 300: "#9999FD", 400: "#7373FD", 500: "#4B4FFC", 600: "#1E22FB", 700: "#0408E7", 800: "#0308BA", 900: "#02058D" },
  neutral: { 50: "#FBFAFB", 100: "#F3F4F6", 200: "#E5E7EB", 300: "#D1D5DB", 400: "#9CA3AF", 500: "#6B7280", 600: "#4B5563", 700: "#374151", 800: "#1F2937", 900: "#0B0E14" },
  success: { 50: "#F0FDF4", 100: "#DCFCE7", 200: "#BBF7D0", 300: "#86EFAC", 400: "#4ADE80", 500: "#22C55E", 600: "#16A34A", 700: "#15803D", 800: "#166534", 900: "#14532D" },
  warning: { 50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D", 400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309", 800: "#92400E", 900: "#78350F" },
  destructive: { 50: "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA", 300: "#FCA5A5", 400: "#F87171", 500: "#EF4444", 600: "#DC2626", 700: "#B91C1C", 800: "#991B1B", 900: "#7F1D1D" },
};

const STATUS_META: Record<TicketStatus, StatusMeta> = {
  OPEN: { label: "OPEN", fg: C.primary[700], bg: C.primary[50], dot: C.primary[500] },
  IN_PROGRESS: { label: "In Progress", fg: C.primary[800], bg: C.primary[100], dot: C.primary[600] },
  ON_HOLD: { label: "On Hold", fg: C.warning[800], bg: C.warning[100], dot: C.warning[500] },
  RESOLVED: { label: "Resolved", fg: C.success[800], bg: C.success[100], dot: C.success[500] },
  REOPENED: { label: "Reopened", fg: C.destructive[800], bg: C.destructive[100], dot: C.destructive[500] },
};

const PRIORITY_META: Record<TicketPriority, PriorityMeta> = {
  LOW: { label: "Low", fg: C.neutral[600], bg: C.neutral[100] },
  MEDIUM: { label: "Medium", fg: C.primary[700], bg: C.primary[50] },
  HIGH: { label: "High", fg: C.warning[700], bg: C.warning[100] },
  URGENT: { label: "Urgent", fg: C.destructive[700], bg: C.destructive[100] },
};

const STATUS_ORDER: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD", "RESOLVED", "REOPENED"];
const PRIORITY_ORDER: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const OPEN_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ON_HOLD", "REOPENED"];
const SLA_HOURS: Record<TicketPriority, number> = { URGENT: 4, HIGH: 8, MEDIUM: 24, LOW: 48 };
const BASE_TAT_HOURS: Record<TicketPriority, number> = { URGENT: 4, HIGH: 7, MEDIUM: 12, LOW: 20 };
const DEPT_TARGET_TAT = 8;
const DAY_MS = 86400000;
const NOW = Date.now();

/* ------------------------------------------------------------------ */
/*  Mock data generator                                                */
/*  Swap TICKET_POOL and the useMemo blocks in the component for real  */
/*  fetches once the Prisma-backed route is wired up.                  */
/* ------------------------------------------------------------------ */
const SUBJECTS: string[] = [
  "Payment gateway timeout on checkout",
  "Unable to reset password via email link",
  "Export to CSV missing last column",
  "Dashboard widgets not loading on Safari",
  "Bulk invoice upload fails at row 200",
  "Typo in monthly invoice PDF footer",
  "API rate limit hit during sync job",
  "Refund not reflecting after 3 days",
  "Add SSO for enterprise workspace",
  "Notification emails delayed by ~1hr",
  "Two-factor login loop on mobile app",
  "Custom report builder throws 500 error",
  "Slack integration stopped posting alerts",
  "Duplicate entries after CSV import",
  "Search results not updating live",
  "Attachment upload capped unexpectedly",
  "Timezone mismatch in scheduled reports",
  "User role permissions not saving",
];
const REQUESTERS: string[] = ["R. Sinha", "A. Verma", "M. Iqbal", "K. Das", "S. Rao", "P. Nair", "T. Bose", "N. Kapoor", "V. Menon", "L. Chawla", "H. Pillai", "J. Fernandes"];

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1337);
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function statusForAge(ageDays: number): TicketStatus {
  const r = rand();
  if (ageDays < 0.5) return r < 0.7 ? "OPEN" : "IN_PROGRESS";
  if (ageDays < 2) return r < 0.15 ? "OPEN" : r < 0.65 ? "IN_PROGRESS" : r < 0.85 ? "ON_HOLD" : "RESOLVED";
  if (ageDays < 10) return r < 0.15 ? "IN_PROGRESS" : r < 0.6 ? "RESOLVED" : r < 0.9 ? "RESOLVED" : "REOPENED";
  return r < 0.25 ? "RESOLVED" : r < 0.85 ? "RESOLVED" : "REOPENED";
}

function buildTicket(i: number): MockTicket {
  const ageDays = rand() * 150;
  const createdAt = NOW - ageDays * DAY_MS;
  const priority = pick(PRIORITY_ORDER);
  const status = statusForAge(ageDays);
  const baseTat = BASE_TAT_HOURS[priority];
  const tatHours = Math.max(0.5, baseTat + (rand() - 0.4) * baseTat);
  const dueAt = createdAt + SLA_HOURS[priority] * 3600000;
  const isResolvedLike = status === "RESOLVED" ;
  const resolvedAt = isResolvedLike ? createdAt + tatHours * 3600000 : null;
  const elapsedHours = isResolvedLike ? tatHours : (NOW - createdAt) / 3600000;
  const slaBreached = isResolvedLike ? (resolvedAt as number) > dueAt : NOW > dueAt;

  const segments: StatusSegment[] = [];
  if (status === "OPEN") {
    segments.push({ status: "OPEN", hours: elapsedHours });
  } else if (status === "ON_HOLD") {
    segments.push({ status: "OPEN", hours: elapsedHours * 0.15 }, { status: "IN_PROGRESS", hours: elapsedHours * 0.35 }, { status: "ON_HOLD", hours: elapsedHours * 0.5 });
  } else if (status === "REOPENED") {
    segments.push(
      { status: "OPEN", hours: elapsedHours * 0.1 },
      { status: "IN_PROGRESS", hours: elapsedHours * 0.5 },
      { status: "RESOLVED", hours: elapsedHours * 0.2 },
      { status: "REOPENED", hours: elapsedHours * 0.2 }
    );
  } else {
    segments.push({ status: "OPEN", hours: elapsedHours * 0.2 }, { status: "IN_PROGRESS", hours: elapsedHours * 0.8 });
  }

  return {
    id: `TCK-${4200 + i}`,
    subject: pick(SUBJECTS),
    requester: pick(REQUESTERS),
    priority,
    status,
    createdAt,
    dueAt,
    resolvedAt,
    tatHours: Number(tatHours.toFixed(1)),
    dueInHrs: Math.round((dueAt - NOW) / 3600000),
    slaBreached,
    segments,
  };
}

const TICKET_POOL: MockTicket[] = Array.from({ length: 240 }, (_, i) => buildTicket(i)).sort((a, b) => b.createdAt - a.createdAt);

const RANGE_WINDOWS: Record<Exclude<DateRangeKey, "Custom Range…">, [since: number, until: number]> = {
  Today: [1, 0],
  Yesterday: [2, 1],
  "Last 24 hours": [1, 0],
  "This Week": [7, 0],
  "Last Week": [14, 7],
  "Last 7 Days": [7, 0],
  "This Month": [30, 0],
  "Last Month": [60, 30],
  "Last 30 Days": [30, 0],
  "This Quarter": [90, 0],
  "Last Quarter": [180, 90],
  "This Year": [365, 0],
  "Last 90 Days": [90, 0],
  "All Time": [100000, 0],
};

function getRangeBounds(range: DateRangeKey): { start: number; end: number } {
  const window = range === "Custom Range…" ? RANGE_WINDOWS["This Week"] : RANGE_WINDOWS[range];
  const [sinceDays, untilDays] = window;
  return { start: NOW - sinceDays * DAY_MS, end: NOW - untilDays * DAY_MS };
}

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toInputDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function relativeTime(ts: number): string {
  const hours = (NOW - ts) / 3600000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface TrendPoint {
  day: string;
  you: number;
  target: number;
}

function buildTrend(tickets: MockTicket[], start: number, end: number): TrendPoint[] {
  const spanDays = Math.max(1, (end - start) / DAY_MS);
  const bucketCount = Math.min(14, Math.max(4, Math.round(spanDays)));
  const bucketSize = (end - start) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({ from: start + i * bucketSize, to: start + (i + 1) * bucketSize, sum: 0, count: 0 }));
  tickets.forEach((t) => {
    const b = buckets.find((bk) => t.createdAt >= bk.from && t.createdAt < bk.to) ?? buckets[buckets.length - 1];
    b.sum += t.tatHours;
    b.count += 1;
  });
  return buckets.map((b) => ({ day: formatDay(b.from), you: b.count ? Number((b.sum / b.count).toFixed(1)) : 0, target: DEPT_TARGET_TAT }));
}

const DATE_RANGE_GROUPS: { label: string; options: DateRangeKey[] }[] = [
  { label: "Recent", options: ["Today", "Yesterday", "Last 24 hours"] },
  { label: "Weekly", options: ["This Week", "Last Week", "Last 7 Days"] },
  { label: "Monthly", options: ["This Month", "Last Month", "Last 30 Days"] },
  { label: "Longer range", options: ["This Quarter", "Last Quarter", "This Year", "Last 90 Days"] },
  { label: "Other", options: ["All Time", "Custom Range…"] },
];

/* ------------------------------------------------------------------ */
/*  Small presentational components                                    */
/* ------------------------------------------------------------------ */
function Badge({ meta, showDot = true }: { meta: StatusMeta | PriorityMeta; showDot?: boolean }) {
  const dot = "dot" in meta ? meta.dot : undefined;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap" style={{ color: meta.fg, backgroundColor: meta.bg }}>
      {showDot && dot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />}
      {meta.label}
    </span>
  );
}

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  tone: { bg: string; fg: string };
  trend?: KpiTrend;
}

function KpiCard({ icon: Icon, label, value, sub, tone, trend }: KpiCardProps) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ borderColor: C.neutral[200], backgroundColor: "#fff" }}>
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: tone.bg }}>
          <Icon size={18} style={{ color: tone.fg }} />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: trend.direction === "up" ? C.success[600] : C.destructive[600] }}>
            {trend.direction === "up" ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-semibold tabular-nums" style={{ color: C.neutral[900] }}>
          {value}
        </div>
        <div className="text-sm mt-0.5" style={{ color: C.neutral[500] }}>
          {label}
        </div>
      </div>
      {sub && (
        <div className="text-xs" style={{ color: C.neutral[400] }}>
          {sub}
        </div>
      )}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, subtitle, action, children, className = "" }: SectionCardProps) {
  return (
    <div className={`rounded-2xl border p-5 ${className}`} style={{ borderColor: C.neutral[200], backgroundColor: "#fff" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: C.neutral[800] }}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: C.neutral[400] }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

interface DateRangePickerProps {
  activeKey: DateRangeKey;
  displayLabel: string;
  onSelectPreset: (key: DateRangeKey) => void;
  onApplyCustom: (startMs: number, endMs: number, label: string) => void;
}

function DateRangePicker({ activeKey, displayLabel, onSelectPreset, onApplyCustom }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "custom">("list");
  const [fromVal, setFromVal] = useState<string>(() => toInputDate(NOW - 7 * DAY_MS));
  const [toVal, setToVal] = useState<string>(() => toInputDate(NOW));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
        setView("list");
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setView("list");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const invalidRange = new Date(fromVal) > new Date(toVal);

  function applyCustom() {
    if (invalidRange) return;
    const start = new Date(fromVal + "T00:00:00").getTime();
    const end = new Date(toVal + "T23:59:59").getTime();
    const label = `${new Date(fromVal + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(
      toVal + "T00:00:00"
    ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    onApplyCustom(start, end, label);
    setOpen(false);
    setView("list");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium"
        style={{ borderColor: open ? C.primary[300] : C.neutral[200], color: C.neutral[700] }}
      >
        <Calendar size={14} style={{ color: C.neutral[400] }} />
        {displayLabel}
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && view === "list" && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border shadow-lg z-20 py-2 max-h-80 overflow-y-auto" style={{ borderColor: C.neutral[200], backgroundColor: "#fff" }}>
          {DATE_RANGE_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-1 pt-1 border-t" : ""} style={{ borderColor: C.neutral[100] }}>
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.neutral[400] }}>
                {group.label}
              </div>
              {group.options.map((opt) => {
                const isCustom = opt === "Custom Range…";
                const selected = opt === activeKey;
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      if (isCustom) {
                        setView("custom");
                        return;
                      }
                      onSelectPreset(opt);
                      setOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-left"
                    style={{ color: selected ? C.primary[700] : C.neutral[700], backgroundColor: selected ? C.primary[50] : "transparent" }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                      if (!selected) e.currentTarget.style.backgroundColor = C.neutral[50];
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                      if (!selected) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {opt}
                    {selected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {open && view === "custom" && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border shadow-lg z-20 p-4" style={{ borderColor: C.neutral[200], backgroundColor: "#fff" }}>
          <button type="button" onClick={() => setView("list")} className="text-xs font-medium mb-3 flex items-center gap-1" style={{ color: C.neutral[500] }}>
            <ChevronDown size={12} style={{ transform: "rotate(90deg)" }} />
            Back
          </button>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: C.neutral[600] }}>
              From
              <input type="date" value={fromVal} max={toVal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFromVal(e.target.value)} className="rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.neutral[200], color: C.neutral[800] }} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: C.neutral[600] }}>
              To
              <input type="date" value={toVal} min={fromVal} max={toInputDate(NOW)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToVal(e.target.value)} className="rounded-lg border px-2.5 py-1.5 text-sm" style={{ borderColor: C.neutral[200], color: C.neutral[800] }} />
            </label>

            {invalidRange && (
              <p className="text-xs" style={{ color: C.destructive[600] }}>
                Start date must be before end date.
              </p>
            )}

            <button type="button" onClick={applyCustom} disabled={invalidRange} className="mt-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ backgroundColor: C.primary[600] }}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                     */
/* ------------------------------------------------------------------ */
export default function AgentDashboard() {
  const [range, setRange] = useState<DateRangeKey>("This Week");
  const [customBounds, setCustomBounds] = useState<CustomBounds | null>(null);
  const [tab, setTab] = useState<TicketTab>("OPEN");

  const { start, end } = useMemo(() => {
    if (range === "Custom Range…" && customBounds) return { start: customBounds.start, end: customBounds.end };
    return getRangeBounds(range);
  }, [range, customBounds]);

  const displayLabel = range === "Custom Range…" && customBounds ? customBounds.label : range;

  function handleApplyCustom(startMs: number, endMs: number, label: string) {
    setCustomBounds({ start: startMs, end: endMs, label });
    setRange("Custom Range…");
  }

  const ticketsInRange = useMemo(() => TICKET_POOL.filter((t) => t.createdAt >= start && t.createdAt <= end), [start, end]);

  const prevTickets = useMemo(() => {
    const span = end - start;
    return TICKET_POOL.filter((t) => t.createdAt >= start - span && t.createdAt < start);
  }, [start, end]);

  const kpis = useMemo(() => {
    const open = ticketsInRange.filter((t) => OPEN_STATUSES.includes(t.status)).length;
    const resolved = ticketsInRange.filter((t) => t.status === "RESOLVED" ).length;
    const breached = ticketsInRange.filter((t) => t.slaBreached).length;
    const tatVals = ticketsInRange.map((t) => t.tatHours);
    const avgTat = tatVals.length ? tatVals.reduce((s, v) => s + v, 0) / tatVals.length : 0;
    const compliance = ticketsInRange.length ? Math.round(((ticketsInRange.length - breached) / ticketsInRange.length) * 100) : 100;

    const prevOpen = prevTickets.filter((t) => OPEN_STATUSES.includes(t.status)).length;
    const prevResolved = prevTickets.filter((t) => t.status === "RESOLVED").length;
    const prevTatVals = prevTickets.map((t) => t.tatHours);
    const prevAvgTat = prevTatVals.length ? prevTatVals.reduce((s, v) => s + v, 0) / prevTatVals.length : avgTat;
    const prevBreached = prevTickets.filter((t) => t.slaBreached).length;
    const prevCompliance = prevTickets.length ? Math.round(((prevTickets.length - prevBreached) / prevTickets.length) * 100) : compliance;

    const openTrend: KpiTrend = { direction: open <= prevOpen ? "up" : "down", value: `${Math.abs(open - prevOpen)} vs prior period` };
    const resolvedTrend: KpiTrend = { direction: resolved >= prevResolved ? "up" : "down", value: `${Math.abs(resolved - prevResolved)} vs prior period` };
    const tatTrendDelta: KpiTrend = { direction: avgTat <= prevAvgTat ? "up" : "down", value: `${Math.abs(avgTat - prevAvgTat).toFixed(1)}h vs prior` };
    const complianceTrend: KpiTrend = { direction: compliance >= prevCompliance ? "up" : "down", value: `${Math.abs(compliance - prevCompliance)}% vs prior` };

    return { open, resolved, breached, avgTat: avgTat.toFixed(1), compliance, total: ticketsInRange.length, openTrend, resolvedTrend, tatTrendDelta, complianceTrend };
  }, [ticketsInRange, prevTickets]);

  const statusData = useMemo(
    () =>
      STATUS_ORDER.map((s) => ({ name: STATUS_META[s].label, value: ticketsInRange.filter((t) => t.status === s).length, color: STATUS_META[s].dot })).filter((d) => d.value > 0),
    [ticketsInRange]
  );

  const priorityData = useMemo(
    () => PRIORITY_ORDER.map((p) => ({ name: PRIORITY_META[p].label, value: ticketsInRange.filter((t) => t.priority === p).length, fill: PRIORITY_META[p].fg })),
    [ticketsInRange]
  );

  const tatTrend = useMemo(() => buildTrend(ticketsInRange, start, end), [ticketsInRange, start, end]);

  const filteredTickets = useMemo(() => {
    if (tab === "ALL") return ticketsInRange;
    if (tab === "OPEN") return ticketsInRange.filter((t) => OPEN_STATUSES.includes(t.status));
    return ticketsInRange.filter((t) => t.slaBreached);
  }, [ticketsInRange, tab]);

  const featuredTimeInStatus = useMemo(() => ticketsInRange.filter((t) => OPEN_STATUSES.includes(t.status)).slice(0, 5), [ticketsInRange]);

  const deptComparison = useMemo(() => {
    const you = Number(kpis.avgTat);
    const dept = Number((you * 1.18 + 0.6).toFixed(1));
    return [
      { name: "You", value: you, fill: C.primary[600] },
      { name: "Dept avg", value: dept, fill: C.neutral[300] },
      { name: "Target", value: DEPT_TARGET_TAT, fill: C.warning[400] },
    ];
  }, [kpis.avgTat]);

  const deptSnapshot = useMemo(() => {
    const deptOpen = Math.round(kpis.open * 4.6 + 3);
    const deptAvgTat = (Number(kpis.avgTat) * 1.18 + 0.6).toFixed(1);
    const deptBreached = Math.round(kpis.breached * 3.4 + 1);
    const deptCompliance = Math.max(60, 100 - deptBreached * 2);
    const yourShare = deptOpen ? Math.round((kpis.open / deptOpen) * 100) : 0;
    return { deptOpen, deptAvgTat, deptBreached, deptCompliance, yourShare };
  }, [kpis]);

  interface ActivityItem {
    ticket: string;
    from: TicketStatus;
    to: TicketStatus;
    when: string;
  }

  const activity: ActivityItem[] = useMemo(
    () =>
      ticketsInRange.slice(0, 6).map((t) => ({
        ticket: t.id,
        from: t.segments.length > 1 ? t.segments[t.segments.length - 2].status : "OPEN",
        to: t.status,
        when: relativeTime(t.createdAt),
      })),
    [ticketsInRange]
  );

  const deptSnapshotRows: { label: string; value: string | number; icon: LucideIcon; tone: Scale }[] = [
    { label: "Open tickets (dept)", value: deptSnapshot.deptOpen, icon: Ticket, tone: C.primary },
    { label: "Avg TAT (dept)", value: `${deptSnapshot.deptAvgTat}h`, icon: Clock, tone: C.warning },
    { label: "SLA compliance (dept)", value: `${deptSnapshot.deptCompliance}%`, icon: CheckCircle2, tone: C.success },
    { label: "Breached (dept)", value: deptSnapshot.deptBreached, icon: AlertTriangle, tone: C.destructive },
  ];

  const tatDiff = deptComparison[1].value - deptComparison[0].value;

  return (
    <div className="min-h-screen w-full font-sans" style={{ backgroundColor: C.neutral[50] }}>
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* ---------------- Top bar ---------------- */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: C.primary[600], color: "#fff" }}>
              RA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold" style={{ color: C.neutral[900] }}>
                  Riya Ahluwalia
                </h1>
                <span className="text-[11px] font-semibold uppercase tracking-wide rounded-md px-2 py-0.5" style={{ backgroundColor: C.primary[50], color: C.primary[700] }}>
                  Agent
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: C.neutral[500] }}>
                <Building2 size={12} />
                · reports to D. Sharma
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
            <DateRangePicker activeKey={range} displayLabel={displayLabel} onSelectPreset={setRange} onApplyCustom={handleApplyCustom} />
            
          </div>
        </div>

        {/* ---------------- KPI row ---------------- */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <KpiCard icon={Ticket} label="Open tickets" value={kpis.open} tone={{ bg: C.primary[50], fg: C.primary[600] }} sub={`${kpis.total} total in ${displayLabel.toLowerCase()}`} trend={kpis.openTrend} />
          <KpiCard icon={CheckCircle2} label="Resolved" value={kpis.resolved} tone={{ bg: C.success[50], fg: C.success[600] }} sub="Resolved + closed in range" trend={kpis.resolvedTrend} />
          <KpiCard icon={Timer} label="Avg. resolution time" value={`${kpis.avgTat}h`} tone={{ bg: C.warning[50], fg: C.warning[600] }} sub={`Dept target: ${DEPT_TARGET_TAT}h`} trend={kpis.tatTrendDelta} />
          <KpiCard icon={CircleDot} label="SLA compliance" value={`${kpis.compliance}%`} tone={{ bg: C.primary[50], fg: C.primary[700] }} sub={`${kpis.total} tickets in range`} trend={kpis.complianceTrend} />
          <KpiCard icon={Flame} label="SLA breached" value={kpis.breached} tone={{ bg: C.destructive[50], fg: C.destructive[600] }} sub="Needs immediate action" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ---------------- Left / main column ---------------- */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-5">
              <SectionCard title="Ticket status mix" subtitle="All tickets currently on your desk" className="sm:col-span-3">
                <div className="flex items-center gap-6">
                  <div style={{ width: 150, height: 150 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={statusData} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                          {statusData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.neutral[200]}`, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    {statusData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2" style={{ color: C.neutral[600] }}>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                          {d.name}
                        </span>
                        <span className="font-semibold tabular-nums" style={{ color: C.neutral[800] }}>
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="By priority" subtitle="Open + closed" className="sm:col-span-2">
                <div style={{ width: "100%", height: 150 }}>
                  <ResponsiveContainer>
                    <BarChart data={priorityData} margin={{ left: -20 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.neutral[500] }} axisLine={{ stroke: C.neutral[200] }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: C.neutral[400] }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.neutral[200]}`, fontSize: 12 }} cursor={{ fill: C.neutral[50] }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {priorityData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>

            <SectionCard title="Turnaround time trend" subtitle={`Your average resolution time vs. department target — ${displayLabel}`}>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={tatTrend} margin={{ left: -20, right: 10 }}>
                    <CartesianGrid vertical={false} stroke={C.neutral[100]} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.neutral[400] }} axisLine={{ stroke: C.neutral[200] }} tickLine={false} interval={Math.max(0, Math.floor(tatTrend.length / 7))} />
                    <YAxis tick={{ fontSize: 11, fill: C.neutral[400] }} axisLine={false} tickLine={false} unit="h" />
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.neutral[200]}`, fontSize: 12 }} />
                    <ReferenceLine y={DEPT_TARGET_TAT} stroke={C.warning[400]} strokeDasharray="4 4" label={{ value: `Target ${DEPT_TARGET_TAT}h`, position: "insideTopRight", fontSize: 10, fill: C.warning[600] }} />
                    <Line type="monotone" dataKey="you" stroke={C.primary[600]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Where time is going" subtitle="Time-in-status for your active tickets — spot what's stuck in queue vs. actually being worked">
              <div className="flex flex-col gap-3">
                {featuredTimeInStatus.length === 0 && (
                  <div className="text-xs py-3 text-center" style={{ color: C.neutral[400] }}>
                    No open tickets created in this range.
                  </div>
                )}
                {featuredTimeInStatus.map((t) => {
                  const total = t.segments.reduce((s, seg) => s + seg.hours, 0);
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <div className="w-32 shrink-0">
                        <div className="text-xs font-semibold" style={{ color: C.neutral[800] }}>
                          {t.id}
                        </div>
                        <div className="text-[11px] truncate" style={{ color: C.neutral[400] }}>
                          {t.subject}
                        </div>
                      </div>
                      <div className="flex-1 h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: C.neutral[100] }}>
                        {t.segments.map((seg, i) => (
                          <div key={i} style={{ width: `${(seg.hours / total) * 100}%`, backgroundColor: STATUS_META[seg.status].dot }} title={`${STATUS_META[seg.status].label}: ${seg.hours.toFixed(1)}h`} />
                        ))}
                      </div>
                      <div className="w-14 text-right text-xs font-medium tabular-nums" style={{ color: C.neutral[500] }}>
                        {total.toFixed(1)}h
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-2 mt-1 border-t" style={{ borderColor: C.neutral[100] }}>
                  {(["OPEN", "IN_PROGRESS", "ON_HOLD"] as TicketStatus[]).map((s) => (
                    <span key={s} className="flex items-center gap-1.5 text-[11px]" style={{ color: C.neutral[500] }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_META[s].dot }} />
                      {STATUS_META[s].label}
                    </span>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="My tickets"
              subtitle="Assigned to you"
              action={
                <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: C.neutral[100] }}>
                  {(
                    [
                      ["OPEN", "Open"],
                      ["BREACHED", "Breached"],
                      ["ALL", "All"],
                    ] as [TicketTab, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
                      style={tab === key ? { backgroundColor: "#fff", color: C.neutral[900], boxShadow: "0 1px 2px rgba(0,0,0,0.06)" } : { color: C.neutral[500] }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left" style={{ color: C.neutral[400] }}>
                      <th className="px-1 pb-2 font-medium text-xs">Ticket</th>
                      <th className="px-1 pb-2 font-medium text-xs">Status</th>
                      <th className="px-1 pb-2 font-medium text-xs">Requester</th>
                      <th className="px-1 pb-2 font-medium text-xs text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-xs py-6" style={{ color: C.neutral[400] }}>
                          No tickets match this filter in {displayLabel}.
                        </td>
                      </tr>
                    )}
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="border-t" style={{ borderColor: C.neutral[100] }}>
                        <td className="px-1 py-2.5">
                          <div className="font-semibold text-xs" style={{ color: C.neutral[800] }}>
                            {t.id}
                          </div>
                          <div className="text-xs truncate max-w-[220px]" style={{ color: C.neutral[500] }}>
                            {t.subject}
                          </div>
                        </td>
                        
                        <td className="px-1 py-2.5">
                          <Badge meta={STATUS_META[t.status]} />
                        </td>
                        <td className="px-1 py-2.5 text-xs" style={{ color: C.neutral[600] }}>
                          {t.requester}
                        </td>
                        <td className="px-1 py-2.5 text-right">
                          {t.slaBreached ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: C.destructive[600] }}>
                              <AlertTriangle size={12} />
                              {Math.abs(t.dueInHrs)}h overdue
                            </span>
                          ) : (
                            <span className="text-xs tabular-nums" style={{ color: C.neutral[500] }}>
                              in {t.dueInHrs}h
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* ---------------- Right / side column ---------------- */}
          <div className="flex flex-col gap-5">
            <SectionCard title="You vs. department" subtitle={`Avg. resolution time (hours) — ${displayLabel}`}>
              <div style={{ width: "100%", height: 140 }}>
                <ResponsiveContainer>
                  <BarChart layout="vertical" data={deptComparison} margin={{ left: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: C.neutral[600] }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.neutral[200]}`, fontSize: 12 }} cursor={{ fill: C.neutral[50] }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                      {deptComparison.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs mt-1" style={{ color: C.neutral[400] }}>
                {tatDiff >= 0 ? (
                  <>
                    You're resolving <span style={{ color: C.success[600], fontWeight: 600 }}>{tatDiff.toFixed(1)}h faster</span> than the Technical Support department average.
                  </>
                ) : (
                  <>
                    You're <span style={{ color: C.destructive[600], fontWeight: 600 }}>{Math.abs(tatDiff).toFixed(1)}h slower</span> than the Technical Support department average.
                  </>
                )}
              </p>
            </SectionCard>

            <SectionCard title="Department snapshot" subtitle={`Technical Support · 6 agents · ${displayLabel}`}>
              <div className="flex flex-col gap-3">
                {deptSnapshotRows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs" style={{ color: C.neutral[500] }}>
                      <r.icon size={14} style={{ color: r.tone[500] }} />
                      {r.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: C.neutral[800] }}>
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: C.neutral[100] }}>
                <span style={{ color: C.neutral[400] }}>Your share of dept. open load</span>
                <span className="font-semibold flex items-center gap-1" style={{ color: C.primary[600] }}>
                  {deptSnapshot.yourShare}% <ArrowUpRight size={12} />
                </span>
              </div>
            </SectionCard>

            <SectionCard title="Recent activity" subtitle="Status changes on your tickets">
              <div className="flex flex-col gap-4">
                {activity.length === 0 && (
                  <div className="text-xs py-3 text-center" style={{ color: C.neutral[400] }}>
                    No activity in this range.
                  </div>
                )}
                {activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: STATUS_META[a.to].bg }}>
                      {a.to === "RESOLVED" ? (
                        <CheckCircle2 size={13} style={{ color: STATUS_META[a.to].fg }} />
                      ) : a.to === "ON_HOLD" ? (
                        <PauseCircle size={13} style={{ color: STATUS_META[a.to].fg }} />
                      ) : a.to === "REOPENED" ? (
                        <RotateCcw size={13} style={{ color: STATUS_META[a.to].fg }} />
                      ) : (
                        <CircleDot size={13} style={{ color: STATUS_META[a.to].fg }} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs" style={{ color: C.neutral[700] }}>
                        <span className="font-semibold">{a.ticket}</span> moved <span style={{ color: STATUS_META[a.from].fg }}>{STATUS_META[a.from].label}</span> →{" "}
                        <span style={{ color: STATUS_META[a.to].fg }}>{STATUS_META[a.to].label}</span>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: C.neutral[400] }}>
                        {a.when}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}