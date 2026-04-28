"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  mongoAuditLogsApi, mongoAuditKpisApi, mongoAuditAnalyticsApi,
  mongoAuditLiveFeedApi, mongoAuditAlertsApi, mongoAuditResolveAlertApi,
  mongoAuditSeedApi, mongoAuditGenerateApi, getAuditExportUrl,
  type AdminAuditLog, type AdminAuditKpis,
  type AdminSecurityAlert, type AdminAuditAnalytics,
} from "@/lib/api";

/* ─── Types ─────────────────────────────────────────────────────────── */
type SortDir = 1 | -1;
type Filters = {
  q: string; dateFrom: string; dateTo: string;
  role: string; action: string; status: string; severity: string; page: string;
};

/* ─── Theme ──────────────────────────────────────────────────────────── */
const T = {
  light: {
    bg:         "#f1f5f9",
    card:       "#ffffff",
    cardHover:  "#f8fafc",
    border:     "#e2e8f0",
    borderAccent: "#c7d2fe",
    text:       "#0f172a",
    textMuted:  "#64748b",
    textDim:    "#94a3b8",
    header:     "#ffffff",
    tableHead:  "#f8fafc",
    tableRow:   "#ffffff",
    tableHover: "#f0f9ff",
    input:      "#ffffff",
    shadow:     "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    shadowLg:   "0 4px 16px rgba(0,0,0,0.08)",
  },
  dark: {
    bg:         "#0f172a",
    card:       "#1e293b",
    cardHover:  "#263347",
    border:     "#334155",
    borderAccent: "#4338ca",
    text:       "#f1f5f9",
    textMuted:  "#94a3b8",
    textDim:    "#64748b",
    header:     "#1e293b",
    tableHead:  "#1a2744",
    tableRow:   "#1e293b",
    tableHover: "#1e3a5f",
    input:      "#0f172a",
    shadow:     "0 1px 3px rgba(0,0,0,0.4)",
    shadowLg:   "0 4px 16px rgba(0,0,0,0.4)",
  },
};

/* ─── Color helpers ──────────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  failed:  { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  warning: { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
};
const STATUS_COLORS_DARK: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: "#14532d", text: "#86efac", dot: "#22c55e" },
  failed:  { bg: "#450a0a", text: "#fca5a5", dot: "#ef4444" },
  warning: { bg: "#451a03", text: "#fcd34d", dot: "#f59e0b" },
};
const SEV_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#fee2e2", text: "#b91c1c" },
  high:     { bg: "#ffedd5", text: "#9a3412" },
  medium:   { bg: "#fef3c7", text: "#92400e" },
  low:      { bg: "#dbeafe", text: "#1e40af" },
  info:     { bg: "#dbeafe", text: "#1e40af" },
};
const SEV_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#450a0a", text: "#fca5a5" },
  high:     { bg: "#431407", text: "#fdba74" },
  medium:   { bg: "#451a03", text: "#fcd34d" },
  low:      { bg: "#1e3a5f", text: "#93c5fd" },
  info:     { bg: "#1e3a5f", text: "#93c5fd" },
};
const CAT_COLORS: Record<string, string> = {
  auth:     "#8b5cf6",
  learning: "#0891b2",
  content:  "#059669",
  admin:    "#d97706",
  security: "#ef4444",
};
const ROLE_COLORS: Record<string, string> = {
  admin:            "#6366f1",
  manager:          "#0891b2",
  employee:         "#059669",
  "hr-admin":       "#ec4899",
  "content-creator":"#7c3aed",
  viewer:           "#64748b",
  "senior-employee":"#d97706",
};

/* ─── SVG Icon ───────────────────────────────────────────────────────── */
function Icon({ d, size = 16, color = "currentColor", strokeWidth = 1.8 }: {
  d: string; size?: number; color?: string; strokeWidth?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ─── Sparkline ──────────────────────────────────────────────────────── */
function Sparkline({ data, color = "#6366f1", h = 36, w = 100 }: {
  data: number[]; color?: string; h?: number; w?: number;
}) {
  if (!data.length) return <div style={{ width: w, height: h }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const areaPts = [
    `0,${h}`, ...data.map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }), `${w},${h}`
  ].join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#sg-${color.replace("#", "")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Mini bar ───────────────────────────────────────────────────────── */
function MiniBar({ label, count, max, color, isDark }: {
  label: string; count: number; max: number; color: string; isDark: boolean;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  const th = isDark ? T.dark : T.light;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: th.textMuted, textTransform: "capitalize",
          maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label.replace(/_/g, " ")}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: color }}>{count}</span>
      </div>
      <div style={{ background: isDark ? "#334155" : "#e2e8f0", borderRadius: 4, height: 5, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color, borderRadius: 4,
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

/* ─── Donut chart (simple) ───────────────────────────────────────────── */
function StatusDonut({ success, failed, warning, size = 64 }: {
  success: number; failed: number; warning: number; size?: number;
}) {
  const total = success + failed + warning || 1;
  const r = 22; const circ = 2 * Math.PI * r;
  const sPct = success / total; const fPct = failed / total; const wPct = warning / total;
  const s1 = circ * sPct; const s2 = circ * fPct; const s3 = circ * wPct;
  const o1 = 0; const o2 = circ - s1; const o3 = circ - s1 - s2;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#22c55e" strokeWidth="6"
        strokeDasharray={`${s1} ${circ - s1}`} strokeDashoffset={-o1}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#ef4444" strokeWidth="6"
        strokeDasharray={`${s2} ${circ - s2}`} strokeDashoffset={-(o2)}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f59e0b" strokeWidth="6"
        strokeDasharray={`${s3} ${circ - s3}`} strokeDashoffset={-(o3)}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />
      <text x="28" y="32" textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b">
        {total}
      </text>
    </svg>
  );
}

/* ─── KPI Card ───────────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon, color, trend, isDark }: {
  label: string; value: string | number; sub?: string; icon: string;
  color: string; trend?: number; isDark: boolean;
}) {
  const th = isDark ? T.dark : T.light;
  return (
    <div style={{
      background: th.card, border: `1px solid ${th.border}`, borderRadius: 12,
      padding: "16px 20px", flex: 1, minWidth: 140,
      boxShadow: th.shadow, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -10, right: -10, width: 60, height: 60,
        borderRadius: "50%", background: color + "18", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "22",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: th.textMuted, textTransform: "uppercase",
          letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: th.text, lineHeight: 1 }}>{value}</div>
      {(sub || trend !== undefined) && (
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          {trend !== undefined && (
            <span style={{ fontSize: 11, fontWeight: 700,
              color: trend >= 0 ? "#059669" : "#dc2626",
              display: "flex", alignItems: "center", gap: 2 }}>
              <Icon d={trend >= 0 ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} size={11}
                color={trend >= 0 ? "#059669" : "#dc2626"} />
              {Math.abs(trend)}%
            </span>
          )}
          {sub && <span style={{ fontSize: 11, color: th.textDim }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

/* ─── Live feed item ─────────────────────────────────────────────────── */
function LiveFeedItem({ entry, isDark, isNew }: {
  entry: AdminAuditLog; isDark: boolean; isNew?: boolean;
}) {
  const th    = isDark ? T.dark : T.light;
  const sc    = isDark ? STATUS_COLORS_DARK : STATUS_COLORS;
  const sCol  = sc[entry.status] ?? sc.warning;
  const catCol = CAT_COLORS[entry.action_category] ?? "#6366f1";
  const ts = new Date(entry.timestamp);
  const timeStr = ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div style={{
      display: "flex", gap: 10, padding: "10px 12px", borderRadius: 8,
      background: isNew ? (isDark ? "#1e3a5f" : "#eff6ff") : "transparent",
      borderLeft: `3px solid ${catCol}`,
      marginBottom: 4,
      transition: "background 0.5s ease",
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: `linear-gradient(135deg, ${catCol}44, ${catCol}22)`,
        border: `2px solid ${catCol}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800, color: catCol, flexShrink: 0,
      }}>
        {entry.user_avatar}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: th.text }}>{entry.user_name}</span>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: sCol.dot, flexShrink: 0 }} />
        </div>
        <div style={{ fontSize: 11, color: catCol, fontWeight: 600, marginTop: 1 }}>
          {entry.action.replace(/_/g, " ")}
        </div>
        <div style={{ fontSize: 10, color: th.textDim, marginTop: 2 }}>
          {entry.page} · {timeStr}
        </div>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: sCol.text,
        background: sCol.bg, borderRadius: 5, padding: "2px 6px",
        alignSelf: "flex-start", flexShrink: 0,
      }}>
        {entry.status}
      </div>
    </div>
  );
}

/* ─── Alert Item ─────────────────────────────────────────────────────── */
function AlertItem({ alert, onResolve, isDark }: {
  alert: AdminSecurityAlert; onResolve: (id: string) => void; isDark: boolean;
}) {
  const th   = isDark ? T.dark : T.light;
  const cols = isDark ? SEV_COLORS_DARK : SEV_COLORS;
  const c    = cols[alert.severity] ?? cols.low;
  const sevIcon: Record<string, string> = {
    critical: "🔴", high: "🟠", medium: "🟡", low: "🔵",
  };
  return (
    <div style={{
      background: isDark ? "#1a2233" : "#fafafa",
      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
      borderLeft: `3px solid ${c.text}`,
      borderRadius: 8, padding: "10px 12px", marginBottom: 8,
      opacity: alert.status === "resolved" ? 0.55 : 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 11 }}>{sevIcon[alert.severity] ?? "⚪"}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: th.text }}>{alert.title}</span>
          </div>
          <p style={{ fontSize: 11, color: th.textMuted, margin: 0, lineHeight: 1.4 }}>
            {alert.description}
          </p>
          {alert.user_email && (
            <span style={{ fontSize: 10, color: th.textDim, marginTop: 3, display: "block" }}>
              {alert.user_email} · {alert.ip_address}
            </span>
          )}
        </div>
        {alert.status === "active" && (
          <button onClick={() => onResolve(alert.alert_id)} style={{
            border: "none", borderRadius: 6, padding: "4px 8px",
            fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0,
            background: isDark ? "#334155" : "#e2e8f0", color: th.textMuted,
          }}>
            Resolve
          </button>
        )}
        {alert.status === "resolved" && (
          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, flexShrink: 0 }}>✓ Resolved</span>
        )}
      </div>
    </div>
  );
}

/* ─── Main page component ────────────────────────────────────────────── */
export default function AuditLogsPage() {
  const router = useRouter();
  const [isDark,   setIsDark]   = useState(false);
  const [isLive,   setIsLive]   = useState(true);
  const [loading,  setLoading]  = useState(true);
  const [seeding,  setSeeding]  = useState(false);
  const [refreshTs, setRefreshTs] = useState(Date.now());

  /* Data state */
  const [logs,     setLogs]     = useState<AdminAuditLog[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [kpis,     setKpis]     = useState<AdminAuditKpis | null>(null);
  const [analytics, setAnalytics] = useState<AdminAuditAnalytics | null>(null);
  const [alerts,   setAlerts]   = useState<AdminSecurityAlert[]>([]);
  const [liveFeed, setLiveFeed] = useState<AdminAuditLog[]>([]);
  const [newIds,   setNewIds]   = useState<Set<string>>(new Set());

  /* Filters & pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy,   setSortBy]   = useState("timestamp");
  const [sortDir,  setSortDir]  = useState<SortDir>(-1);
  const [filters,  setFilters]  = useState<Filters>({
    q: "", dateFrom: "", dateTo: "", role: "", action: "", status: "", severity: "", page: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  /* Refs for polling */
  const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kpiIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevFeedIds     = useRef<Set<string>>(new Set());

  const th = isDark ? T.dark : T.light;

  /* ── Auth check ──────────────────────────────────────────────────── */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.push("/login"); return; }
  }, [router]);

  /* ── Fetch logs (table) ──────────────────────────────────────────── */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await mongoAuditLogsApi({
        page: currentPage, limit: 50,
        q:         filters.q         || undefined,
        date_from: filters.dateFrom  || undefined,
        date_to:   filters.dateTo    || undefined,
        user_role: filters.role      || undefined,
        action:    filters.action    || undefined,
        status:    filters.status    || undefined,
        severity:  filters.severity  || undefined,
        page_name: filters.page      || undefined,
        sort_by:   sortBy,
        sort_dir:  sortDir,
      });
      setLogs(res.logs);
      setTotal(res.total);
      setPages(res.pages);
    } catch { /* silent */ }
    finally   { setLoading(false); }
  }, [currentPage, sortBy, sortDir, filters]);

  /* ── Fetch KPIs ──────────────────────────────────────────────────── */
  const fetchKpis = useCallback(async () => {
    try { setKpis(await mongoAuditKpisApi()); } catch { /* silent */ }
  }, []);

  /* ── Fetch analytics ─────────────────────────────────────────────── */
  const fetchAnalytics = useCallback(async () => {
    try { setAnalytics(await mongoAuditAnalyticsApi()); } catch { /* silent */ }
  }, []);

  /* ── Fetch security alerts ───────────────────────────────────────── */
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await mongoAuditAlertsApi();
      setAlerts(res.alerts);
    } catch { /* silent */ }
  }, []);

  /* ── Fetch live feed ─────────────────────────────────────────────── */
  const fetchLiveFeed = useCallback(async () => {
    try {
      const res = await mongoAuditLiveFeedApi(18);
      const newEntries = res.entries;
      const newOnes = newEntries.filter(e => !prevFeedIds.current.has(e.log_id));
      if (newOnes.length > 0) {
        const newIdSet = new Set(newOnes.map(e => e.log_id));
        setNewIds(newIdSet);
        setTimeout(() => setNewIds(new Set()), 3000);
      }
      prevFeedIds.current = new Set(newEntries.map(e => e.log_id));
      setLiveFeed(newEntries);
    } catch { /* silent */ }
  }, []);

  /* ── Resolve alert ───────────────────────────────────────────────── */
  const handleResolveAlert = useCallback(async (alertId: string) => {
    try {
      await mongoAuditResolveAlertApi(alertId);
      setAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, status: "resolved" } : a));
    } catch { /* silent */ }
  }, []);

  /* ── Seed if empty ───────────────────────────────────────────────── */
  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      await mongoAuditSeedApi();
      setRefreshTs(Date.now());
    } catch { /* silent */ }
    finally { setSeeding(false); }
  }, []);

  /* ── Generate one live log (demo button) ─────────────────────────── */
  const handleGenerate = useCallback(async () => {
    try { await mongoAuditGenerateApi(); } catch { /* silent */ }
  }, []);

  /* ── Initial load + auto-seed ───────────────────────────────────── */
  useEffect(() => {
    const init = async () => {
      // Seed first (idempotent — does nothing if data already exists)
      try { await mongoAuditSeedApi(); } catch { /* backend might not be ready yet */ }
      // Then load all panels in parallel
      void fetchLogs();
      void fetchKpis();
      void fetchAnalytics();
      void fetchAlerts();
      void fetchLiveFeed();
    };
    void init();
  }, [fetchLogs, fetchKpis, fetchAnalytics, fetchAlerts, fetchLiveFeed, refreshTs]);

  /* ── Live polling ────────────────────────────────────────────────── */
  useEffect(() => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    if (isLive) {
      liveIntervalRef.current = setInterval(() => { void fetchLiveFeed(); }, 6000);
    }
    return () => { if (liveIntervalRef.current) clearInterval(liveIntervalRef.current); };
  }, [isLive, fetchLiveFeed]);

  /* ── KPI auto-refresh every 30s ──────────────────────────────────── */
  useEffect(() => {
    kpiIntervalRef.current = setInterval(() => { void fetchKpis(); }, 30000);
    return () => { if (kpiIntervalRef.current) clearInterval(kpiIntervalRef.current); };
  }, [fetchKpis]);

  /* ── Sort column handler ─────────────────────────────────────────── */
  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => (d === -1 ? 1 : -1) as SortDir);
    else { setSortBy(col); setSortDir(-1); }
    setCurrentPage(1);
  };

  /* ── Filter change ───────────────────────────────────────────────── */
  const setFilter = (key: keyof Filters, val: string) => {
    setFilters(f => ({ ...f, [key]: val }));
    setCurrentPage(1);
  };

  /* ── Export CSV ──────────────────────────────────────────────────── */
  const handleExport = () => {
    const url = getAuditExportUrl({
      date_from: filters.dateFrom || undefined,
      date_to:   filters.dateTo   || undefined,
      user_role: filters.role     || undefined,
      action:    filters.action   || undefined,
      status:    filters.status   || undefined,
    });
    window.open(url, "_blank");
  };

  /* ── Helpers ─────────────────────────────────────────────────────── */
  const fmtDuration = (ms: number) =>
    ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  const fmtTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const sortIcon = (col: string) =>
    sortBy === col ? (sortDir === -1 ? " ↓" : " ↑") : "";

  const activeAlerts = alerts.filter(a => a.status === "active");
  const dailyCounts  = analytics?.daily_events?.map(d => d.count) ?? [];
  const hourlyCounts = analytics?.hourly_events?.slice(-12)?.map(d => d.count) ?? [];
  const successCount = (analytics?.status_distribution ?? []).find(s => s.status === "success")?.count ?? 0;
  const failedCount  = (analytics?.status_distribution ?? []).find(s => s.status === "failed")?.count  ?? 0;
  const warnCount    = (analytics?.status_distribution ?? []).find(s => s.status === "warning")?.count ?? 0;
  const topActions   = analytics?.action_distribution?.slice(0, 6) ?? [];
  const maxAction    = topActions.reduce((m, a) => Math.max(m, a.count), 1);

  /* ══════════════════════════════════════════════════════════════════ */
  /* RENDER                                                            */
  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ background: th.bg, minHeight: "100vh", fontFamily: "'Inter','Segoe UI',sans-serif", color: th.text }}>

      {/* ── Top Header ────────────────────────────────────────────── */}
      <div style={{
        background: th.header, borderBottom: `1px solid ${th.border}`,
        padding: "14px 24px", boxShadow: th.shadow, position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>

          {/* Back + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 4 }}>
            <button onClick={() => router.back()} style={{
              border: `1px solid ${th.border}`, background: "transparent", borderRadius: 8,
              padding: "6px 10px", cursor: "pointer", color: th.textMuted, display: "flex", alignItems: "center",
            }}>
              <Icon d="M19 12H5M12 19l-7-7 7-7" size={15} color={th.textMuted} />
            </button>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: th.text }}>Audit Logs</span>
                {isLive && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
                      boxShadow: "0 0 0 3px #22c55e33",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: "0.05em" }}>LIVE</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: th.textDim }}>
                {total.toLocaleString()} total events · Enterprise Workspace
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
              <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" size={15} color={th.textDim} />
            </div>
            <input
              value={filters.q}
              onChange={e => setFilter("q", e.target.value)}
              placeholder="Search users, actions, pages…"
              style={{
                width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                border: `1px solid ${th.border}`, borderRadius: 8,
                background: th.input, color: th.text, fontSize: 13,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "dateFrom" as keyof Filters, placeholder: "From date", type: "date", w: 130 },
              { key: "dateTo"   as keyof Filters, placeholder: "To date",   type: "date", w: 130 },
            ].map(f => (
              <input key={f.key} type={f.type} value={filters[f.key]}
                onChange={e => setFilter(f.key, e.target.value)}
                style={{
                  border: `1px solid ${th.border}`, borderRadius: 8,
                  padding: "7px 10px", fontSize: 12, background: th.input, color: th.text,
                  width: f.w, cursor: "pointer", outline: "none",
                }}
              />
            ))}
            {[
              { key: "role"    as keyof Filters, opts: ["admin","manager","employee","hr-admin","content-creator","viewer","senior-employee"], label: "Role" },
              { key: "status"  as keyof Filters, opts: ["success","failed","warning"],                                                         label: "Status" },
              { key: "severity"as keyof Filters, opts: ["info","warning","critical"],                                                           label: "Severity" },
            ].map(f => (
              <select key={f.key} value={filters[f.key]} onChange={e => setFilter(f.key, e.target.value)}
                style={{
                  border: `1px solid ${th.border}`, borderRadius: 8, padding: "7px 10px",
                  fontSize: 12, background: th.input, color: th.text, cursor: "pointer", outline: "none",
                }}>
                <option value="">{f.label}</option>
                {f.opts.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button onClick={handleGenerate} title="Simulate live event" style={{
              border: `1px solid ${th.border}`, borderRadius: 8, padding: "7px 12px",
              background: "transparent", color: th.textMuted, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Icon d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" size={13} />
              Simulate
            </button>

            <button onClick={handleExport} style={{
              border: `1px solid ${th.border}`, borderRadius: 8, padding: "7px 14px",
              background: "transparent", color: th.textMuted, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Icon d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" size={13} />
              CSV
            </button>

            <button
              onClick={() => setIsLive(l => !l)}
              style={{
                border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12,
                fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                background: isLive ? "#22c55e" : (isDark ? "#334155" : "#e2e8f0"),
                color: isLive ? "#fff" : th.textMuted,
                transition: "all 0.2s",
              }}>
              <Icon d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" size={13} />
              {isLive ? "Live ON" : "Live OFF"}
            </button>

            <button onClick={() => setIsDark(d => !d)} style={{
              border: `1px solid ${th.border}`, borderRadius: 8,
              padding: "7px 10px", background: "transparent", color: th.textMuted, cursor: "pointer",
              display: "flex", alignItems: "center",
            }}>
              <Icon d={isDark
                ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                : "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"}
                size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, padding: "16px 24px 0", flexWrap: "wrap" }}>
        <KpiCard label="Total Events"     value={(kpis?.total_events ?? 0).toLocaleString()}
          sub="all time" icon="📊" color="#6366f1" trend={kpis?.events_trend} isDark={isDark} />
        <KpiCard label="Active Users"     value={kpis?.active_users ?? 0}
          sub="last hour" icon="👥" color="#0891b2" isDark={isDark} />
        <KpiCard label="Failed Logins"    value={kpis?.failed_logins_24h ?? 0}
          sub="last 24h" icon="🔐" color="#ef4444" isDark={isDark} />
        <KpiCard label="Avg Session Time" value={kpis ? `${kpis.avg_session_sec}s` : "—"}
          sub="response time" icon="⏱️" color="#059669" isDark={isDark} />
        <KpiCard label="Active Alerts"    value={kpis?.active_alerts ?? 0}
          sub={kpis?.critical_alerts ? `${kpis.critical_alerts} critical` : "none critical"}
          icon="🚨" color="#f59e0b" isDark={isDark} />
      </div>

      {/* ── 3-Column layout ───────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, padding: 24, alignItems: "flex-start" }}>

        {/* ── LEFT — Live Activity Feed ─────────────────────────── */}
        <div style={{
          width: 270, flexShrink: 0, background: th.card,
          border: `1px solid ${th.border}`, borderRadius: 14,
          boxShadow: th.shadow, overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px 10px", borderBottom: `1px solid ${th.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: isLive ? "#22c55e" : "#94a3b8",
                boxShadow: isLive ? "0 0 0 3px #22c55e33" : "none",
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>Live Activity</span>
            </div>
            <span style={{ fontSize: 10, color: th.textDim }}>
              {isLive ? "6s refresh" : "paused"}
            </span>
          </div>

          {/* Category legend */}
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${th.border}`, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(CAT_COLORS).map(([cat, col]) => (
              <span key={cat} style={{
                fontSize: 9, fontWeight: 700, color: col,
                background: col + "18", borderRadius: 5, padding: "2px 6px",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                {cat}
              </span>
            ))}
          </div>

          <div style={{ maxHeight: 540, overflowY: "auto", padding: "8px 10px" }}>
            {liveFeed.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, color: th.textDim, fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
                No activity yet
                <br />
                <button onClick={handleSeed} disabled={seeding} style={{
                  marginTop: 12, border: "none", borderRadius: 8, padding: "6px 14px",
                  background: "#6366f1", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700,
                }}>
                  {seeding ? "Seeding…" : "Seed Data"}
                </button>
              </div>
            ) : (
              liveFeed.map(e => (
                <LiveFeedItem key={e.log_id} entry={e} isDark={isDark} isNew={newIds.has(e.log_id)} />
              ))
            )}
          </div>
        </div>

        {/* ── CENTER — Audit Table ──────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: th.card, border: `1px solid ${th.border}`,
            borderRadius: 14, boxShadow: th.shadow, overflow: "hidden",
          }}>
            {/* Table header bar */}
            <div style={{
              padding: "14px 20px", borderBottom: `1px solid ${th.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>Audit Table</span>
                <span style={{
                  background: isDark ? "#334155" : "#f1f5f9", borderRadius: 20, padding: "2px 10px",
                  fontSize: 11, fontWeight: 700, color: th.textMuted,
                }}>
                  {total.toLocaleString()} records
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => { void fetchLogs(); void fetchKpis(); }} style={{
                  border: `1px solid ${th.border}`, borderRadius: 8, padding: "5px 10px",
                  background: "transparent", cursor: "pointer", color: th.textMuted,
                  display: "flex", alignItems: "center", gap: 4, fontSize: 11,
                }}>
                  <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" size={13} />
                  Refresh
                </button>
                {Object.values(filters).some(v => v !== "") && (
                  <button onClick={() => {
                    setFilters({ q: "", dateFrom: "", dateTo: "", role: "", action: "", status: "", severity: "", page: "" });
                    setCurrentPage(1);
                  }} style={{
                    border: `1px solid #ef4444`, borderRadius: 8, padding: "5px 10px",
                    background: "transparent", cursor: "pointer", color: "#ef4444", fontSize: 11, fontWeight: 700,
                  }}>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: th.tableHead }}>
                    {[
                      { key: "timestamp",   label: "Time" },
                      { key: "user_name",   label: "User" },
                      { key: "action",      label: "Action" },
                      { key: "page",        label: "Page" },
                      { key: "entity_name", label: "Entity" },
                      { key: "duration_ms", label: "Duration" },
                      { key: "device",      label: "Device" },
                      { key: "status",      label: "Status" },
                    ].map(col => (
                      <th key={col.key}
                        onClick={() => col.key !== "device" && col.key !== "entity_name" && handleSort(col.key)}
                        style={{
                          padding: "10px 14px", textAlign: "left", fontWeight: 700,
                          fontSize: 11, textTransform: "uppercase",
                          letterSpacing: "0.05em", whiteSpace: "nowrap",
                          cursor: col.key !== "device" && col.key !== "entity_name" ? "pointer" : "default",
                          userSelect: "none",
                          borderBottom: `1px solid ${th.border}`,
                          background: sortBy === col.key ? (isDark ? "#1a2744" : "#eef2ff") : "transparent",
                          color: sortBy === col.key ? "#6366f1" : th.textMuted,
                        }}>
                        {col.label}{sortIcon(col.key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} style={{ padding: "12px 14px" }}>
                            <div style={{
                              height: 12, borderRadius: 4,
                              background: isDark ? "#334155" : "#f1f5f9",
                              width: `${60 + Math.random() * 40}%`,
                              animation: "pulse 1.5s ease-in-out infinite",
                            }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: th.textDim }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
                        No logs found.{" "}
                        <button onClick={handleSeed} disabled={seeding}
                          style={{ border: "none", background: "none", color: "#6366f1", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                          {seeding ? "Seeding…" : "Seed sample data"}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => {
                      const sc  = isDark ? STATUS_COLORS_DARK : STATUS_COLORS;
                      const sCol = sc[log.status] ?? sc.warning;
                      const catCol = CAT_COLORS[log.action_category] ?? "#6366f1";
                      const roleCol = ROLE_COLORS[log.user_role] ?? "#6366f1";
                      return (
                        <tr key={log.log_id} style={{
                          borderBottom: `1px solid ${th.border}`,
                          background: idx % 2 === 0 ? th.tableRow : (isDark ? "#1a2233" : "#fafbfd"),
                          transition: "background 0.15s",
                        }}
                          onMouseEnter={e => (e.currentTarget.style.background = th.tableHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? th.tableRow : (isDark ? "#1a2233" : "#fafbfd"))}
                        >
                          {/* Time */}
                          <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: th.textMuted, fontSize: 11 }}>
                            {fmtTime(log.timestamp)}
                          </td>
                          {/* User */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: "50%",
                                background: `linear-gradient(135deg, ${roleCol}33, ${roleCol}11)`,
                                border: `1.5px solid ${roleCol}44`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 9, fontWeight: 800, color: roleCol, flexShrink: 0,
                              }}>
                                {log.user_avatar}
                              </div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: th.text, whiteSpace: "nowrap" }}>
                                  {log.user_name}
                                </div>
                                <div style={{ fontSize: 10, color: roleCol, fontWeight: 600 }}>
                                  {log.user_role}
                                </div>
                              </div>
                            </div>
                          </td>
                          {/* Action */}
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, color: catCol,
                              background: catCol + "18", borderRadius: 6, padding: "3px 8px",
                              whiteSpace: "nowrap",
                            }}>
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </td>
                          {/* Page */}
                          <td style={{ padding: "10px 14px", fontSize: 11, color: th.textMuted, whiteSpace: "nowrap" }}>
                            {log.page}
                          </td>
                          {/* Entity */}
                          <td style={{ padding: "10px 14px", fontSize: 11, color: th.textMuted,
                            maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.entity_name ?? <span style={{ color: th.textDim }}>—</span>}
                          </td>
                          {/* Duration */}
                          <td style={{ padding: "10px 14px", fontSize: 11, color: th.textMuted, whiteSpace: "nowrap" }}>
                            <span style={{
                              fontVariantNumeric: "tabular-nums",
                              color: log.duration_ms > 3000 ? "#f59e0b" : th.textMuted,
                            }}>
                              {fmtDuration(log.duration_ms)}
                            </span>
                          </td>
                          {/* Device */}
                          <td style={{ padding: "10px 14px", fontSize: 10, color: th.textDim, whiteSpace: "nowrap" }}>
                            <div>{log.browser}</div>
                            <div>{log.os}</div>
                          </td>
                          {/* Status */}
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: sCol.text,
                              background: sCol.bg, borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap",
                            }}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{
              padding: "12px 20px", borderTop: `1px solid ${th.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, color: th.textDim }}>
                Page {currentPage} of {pages} · {total.toLocaleString()} records
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { label: "«", page: 1 },
                  { label: "‹", page: currentPage - 1 },
                  { label: "›", page: currentPage + 1 },
                  { label: "»", page: pages },
                ].map(({ label, page: pg }) => (
                  <button key={label} onClick={() => { if (pg >= 1 && pg <= pages) setCurrentPage(pg); }}
                    disabled={pg < 1 || pg > pages}
                    style={{
                      border: `1px solid ${th.border}`, borderRadius: 6, padding: "4px 10px",
                      background: "transparent", cursor: pg < 1 || pg > pages ? "not-allowed" : "pointer",
                      color: pg < 1 || pg > pages ? th.textDim : th.textMuted, fontSize: 12, fontWeight: 600,
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Security + Analytics ─────────────────────── */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Security Alerts */}
          <div style={{
            background: th.card, border: `1px solid ${th.border}`,
            borderRadius: 14, boxShadow: th.shadow, overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 16px 10px", borderBottom: `1px solid ${th.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 15 }}>🛡️</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>Security Alerts</span>
              </div>
              {activeAlerts.length > 0 && (
                <span style={{
                  background: "#fee2e2", color: "#b91c1c", borderRadius: 20,
                  padding: "2px 9px", fontSize: 10, fontWeight: 800,
                }}>
                  {activeAlerts.length} active
                </span>
              )}
            </div>
            <div style={{ padding: "10px 12px", maxHeight: 320, overflowY: "auto" }}>
              {alerts.length === 0 ? (
                <div style={{ textAlign: "center", padding: 20, color: th.textDim, fontSize: 12 }}>
                  No alerts
                </div>
              ) : (
                alerts.slice(0, 6).map(a => (
                  <AlertItem key={a.alert_id} alert={a} onResolve={handleResolveAlert} isDark={isDark} />
                ))
              )}
            </div>
          </div>

          {/* Activity Trend — 7 days sparkline */}
          <div style={{
            background: th.card, border: `1px solid ${th.border}`,
            borderRadius: 14, boxShadow: th.shadow, padding: "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>7-Day Activity</span>
              <span style={{ fontSize: 10, color: th.textDim }}>events/day</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: th.text }}>
                  {dailyCounts.reduce((a, b) => a + b, 0)}
                </div>
                <div style={{ fontSize: 10, color: th.textDim }}>total this week</div>
              </div>
              <Sparkline data={dailyCounts} color="#6366f1" h={44} w={140} />
            </div>

            {/* Daily bars */}
            <div style={{ display: "flex", gap: 3, marginTop: 12, alignItems: "flex-end", height: 40 }}>
              {(analytics?.daily_events ?? []).map((d, i) => {
                const maxD = Math.max(...(analytics?.daily_events ?? []).map(x => x.count), 1);
                const h2 = Math.max(4, (d.count / maxD) * 36);
                return (
                  <div key={i} title={`${d.date}: ${d.count} events`} style={{
                    flex: 1, height: h2, borderRadius: "3px 3px 0 0",
                    background: i === (analytics?.daily_events ?? []).length - 1
                      ? "#6366f1" : (isDark ? "#334155" : "#e2e8f0"),
                    transition: "height 0.4s ease", cursor: "default",
                  }} />
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              {(analytics?.daily_events ?? []).map((d, i) => (
                <span key={i} style={{ fontSize: 9, color: th.textDim, flex: 1, textAlign: "center" }}>
                  {d.date.split("/")[1]}
                </span>
              ))}
            </div>
          </div>

          {/* Status distribution donut */}
          <div style={{
            background: th.card, border: `1px solid ${th.border}`,
            borderRadius: 14, boxShadow: th.shadow, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: th.text, marginBottom: 12 }}>
              Status Distribution
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <StatusDonut success={successCount} failed={failedCount} warning={warnCount} size={72} />
              <div style={{ flex: 1 }}>
                {[
                  { label: "Success", count: successCount, color: "#22c55e" },
                  { label: "Failed",  count: failedCount,  color: "#ef4444" },
                  { label: "Warning", count: warnCount,    color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                      <span style={{ fontSize: 11, color: th.textMuted }}>{s.label}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: th.text }}>
                      {s.count.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div style={{
            background: th.card, border: `1px solid ${th.border}`,
            borderRadius: 14, boxShadow: th.shadow, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: th.text, marginBottom: 12 }}>
              Top Actions
            </div>
            {topActions.map((a, i) => (
              <MiniBar key={a.action} label={a.action} count={a.count} max={maxAction}
                color={["#6366f1","#0891b2","#059669","#d97706","#ef4444","#8b5cf6"][i % 6]}
                isDark={isDark} />
            ))}
          </div>

          {/* Top Active Users */}
          <div style={{
            background: th.card, border: `1px solid ${th.border}`,
            borderRadius: 14, boxShadow: th.shadow, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: th.text, marginBottom: 12 }}>
              Most Active Users
            </div>
            {(analytics?.top_users ?? []).map((u, i) => {
              const roleCol = ROLE_COLORS[u.role] ?? "#6366f1";
              const maxU = Math.max(...(analytics?.top_users ?? []).map(x => x.count), 1);
              return (
                <div key={u.email} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, ${roleCol}33, ${roleCol}11)`,
                    border: `1.5px solid ${roleCol}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 800, color: roleCol,
                  }}>
                    {u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: th.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.name}
                    </div>
                    <div style={{ height: 4, background: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 3, marginTop: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${(u.count / maxU) * 100}%`, height: "100%",
                        background: roleCol, borderRadius: 3, transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: roleCol, flexShrink: 0 }}>
                    {u.count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recommended Actions */}
          <div style={{
            background: th.card, border: `1px solid ${th.border}`,
            borderRadius: 14, boxShadow: th.shadow, padding: "14px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>💡</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: th.text }}>Recommended Actions</span>
            </div>
            {[
              { icon: "🔒", text: "Enforce 2FA for all admin accounts", priority: "high" },
              { icon: "📋", text: "Review export permissions for HR roles", priority: "medium" },
              { icon: "⚠️", text: "Investigate off-hours access patterns", priority: "medium" },
              { icon: "🗄️", text: "Archive logs older than 90 days", priority: "low" },
            ].map((rec, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                padding: "7px 0", borderBottom: i < 3 ? `1px solid ${th.border}` : "none",
              }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{rec.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 11, color: th.text, lineHeight: 1.4 }}>{rec.text}</p>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: rec.priority === "high" ? "#ef4444" : rec.priority === "medium" ? "#f59e0b" : "#22c55e",
                  }}>
                    {rec.priority} priority
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
        {/* ── END RIGHT ─────────────────────────────────────────── */}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
