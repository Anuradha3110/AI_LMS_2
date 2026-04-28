/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  perfOverviewApi, perfLearnerPerformanceApi, perfInstructorPerformanceApi,
  perfCoursePerformanceApi, perfAssessmentPerformanceApi, perfEngagementApi,
  perfRevenueApi, perfDepartmentReportsApi, perfBenchmarksApi, perfAlertsApi,
  perfResolveAlertApi, perfAiInsightsApi, perfSeedApi,
  PerfOverview, PerfLearnerPerformance, PerfInstructorPerformance,
  PerfCoursePerformance, PerfAssessmentPerformance, PerfEngagement,
  PerfRevenue, PerfAlert, PerfBenchmark,
} from "@/lib/api";

// ─── Theme ────────────────────────────────────────────────────────────────────
const mkT = (dark: boolean) => ({
  bg: dark ? "#0f172a" : "#f1f5f9",
  sidebar: dark ? "#1e293b" : "#ffffff",
  card: dark ? "#1e293b" : "#ffffff",
  border: dark ? "#334155" : "#e2e8f0",
  text: dark ? "#f1f5f9" : "#0f172a",
  muted: dark ? "#94a3b8" : "#64748b",
  accent: "#6366f1",
  accent2: "#10b981",
  accent3: "#f59e0b",
  danger: "#ef4444",
  hover: dark ? "#334155" : "#f8fafc",
  pill: dark ? "#334155" : "#e2e8f0",
});

// ─── Sidebar tree structure ────────────────────────────────────────────────────
const TREE = [
  { id: "overview", label: "Overview", icon: "📊", children: [
    { id: "kpi-dashboard", label: "KPI Dashboard" },
    { id: "trend-charts", label: "Trend Charts" },
    { id: "score-distribution", label: "Score Distribution" },
    { id: "alerts-summary", label: "Alerts Summary" },
  ]},
  { id: "learner-performance", label: "Learner Performance", icon: "🎓", children: [
    { id: "progress-tracker", label: "Progress Tracker" },
    { id: "at-risk-learners", label: "At-Risk Learners" },
    { id: "quiz-score-analysis", label: "Quiz Score Analysis" },
    { id: "completion-status", label: "Completion Status" },
    { id: "certificates-earned", label: "Certificates Earned" },
    { id: "learner-comparison", label: "Learner Comparison" },
  ]},
  { id: "instructor-performance", label: "Instructor Performance", icon: "👨‍🏫", children: [
    { id: "instructor-scoreboard", label: "Instructor Scoreboard" },
    { id: "student-ratings", label: "Student Ratings" },
    { id: "content-creation", label: "Content Creation Rate" },
    { id: "instructor-comparison", label: "Instructor Comparison" },
  ]},
  { id: "course-performance", label: "Course Performance", icon: "📚", children: [
    { id: "enrollment-overview", label: "Enrollment Overview" },
    { id: "completion-dropoff", label: "Completion & Dropoff" },
    { id: "popular-courses", label: "Popular Courses" },
    { id: "low-performing-courses", label: "Low Performing" },
    { id: "course-ratings", label: "Course Ratings" },
  ]},
  { id: "assessment-performance", label: "Assessment Performance", icon: "📝", children: [
    { id: "quiz-pass-rate", label: "Quiz Pass Rate" },
    { id: "score-dist-as", label: "Score Distribution" },
    { id: "failed-attempts", label: "Failed Attempts" },
    { id: "difficulty-analysis", label: "Difficulty Analysis" },
  ]},
  { id: "engagement-analytics", label: "Engagement Analytics", icon: "📈", children: [
    { id: "daily-active-users", label: "Daily Active Users" },
    { id: "session-duration", label: "Session Duration" },
    { id: "feature-usage", label: "Feature Usage" },
    { id: "retention-rates", label: "Retention Rates" },
    { id: "peak-hours", label: "Peak Hours" },
  ]},
  { id: "revenue-performance", label: "Revenue Performance", icon: "💰", children: [
    { id: "monthly-revenue", label: "Monthly Revenue" },
    { id: "revenue-by-course", label: "Revenue by Course" },
    { id: "refund-tracking", label: "Refund Tracking" },
    { id: "revenue-forecast", label: "Revenue Forecast" },
  ]},
  { id: "department-reports", label: "Department Reports", icon: "🏢", children: [
    { id: "team-progress", label: "Team Progress" },
    { id: "skill-improvement", label: "Skill Improvement" },
    { id: "dept-comparison", label: "Cross-Department" },
  ]},
  { id: "benchmarks-goals", label: "Benchmarks & Goals", icon: "🎯", children: [
    { id: "kpi-targets", label: "KPI Targets" },
    { id: "goal-achievement", label: "Goal Achievement" },
    { id: "historical-comparison", label: "Historical Comparison" },
  ]},
  { id: "reports-exports", label: "Reports & Exports", icon: "📤", children: [
    { id: "custom-reports", label: "Custom Reports" },
    { id: "export-center", label: "Export Center" },
    { id: "report-templates", label: "Report Templates" },
  ]},
  { id: "alerts-risks", label: "Alerts & Risks", icon: "⚠️", children: [
    { id: "active-alerts", label: "Active Alerts" },
    { id: "risk-matrix", label: "Risk Matrix" },
    { id: "resolved-alerts", label: "Resolved Alerts" },
  ]},
  { id: "ai-insights", label: "AI Insights", icon: "🤖", children: [
    { id: "dropout-predictions", label: "Dropout Predictions" },
    { id: "recommendations", label: "Recommendations" },
    { id: "revenue-forecasting", label: "Revenue Forecasting" },
    { id: "kpi-analysis", label: "KPI Analysis" },
  ]},
  { id: "settings", label: "Settings", icon: "⚙️", children: [
    { id: "kpi-config", label: "KPI Configuration" },
    { id: "scoring-rules", label: "Scoring Rules" },
    { id: "report-permissions", label: "Report Permissions" },
    { id: "notification-rules", label: "Notification Rules" },
  ]},
];

// Section groups for panel switching
const SECTION_PANELS: Record<string, string> = {
  "overview": "overview", "kpi-dashboard": "overview", "trend-charts": "overview",
  "score-distribution": "overview", "alerts-summary": "overview",
  "learner-performance": "learner", "progress-tracker": "learner", "at-risk-learners": "learner",
  "quiz-score-analysis": "learner", "completion-status": "learner", "certificates-earned": "learner", "learner-comparison": "learner",
  "instructor-performance": "instructor", "instructor-scoreboard": "instructor",
  "student-ratings": "instructor", "content-creation": "instructor", "instructor-comparison": "instructor",
  "course-performance": "course", "enrollment-overview": "course", "completion-dropoff": "course",
  "popular-courses": "course", "low-performing-courses": "course", "course-ratings": "course",
  "assessment-performance": "assessment", "quiz-pass-rate": "assessment", "score-dist-as": "assessment",
  "failed-attempts": "assessment", "difficulty-analysis": "assessment",
  "engagement-analytics": "engagement", "daily-active-users": "engagement", "session-duration": "engagement",
  "feature-usage": "engagement", "retention-rates": "engagement", "peak-hours": "engagement",
  "revenue-performance": "revenue", "monthly-revenue": "revenue", "revenue-by-course": "revenue",
  "refund-tracking": "revenue", "revenue-forecast": "revenue",
  "department-reports": "departments", "team-progress": "departments", "skill-improvement": "departments", "dept-comparison": "departments",
  "benchmarks-goals": "benchmarks", "kpi-targets": "benchmarks", "goal-achievement": "benchmarks", "historical-comparison": "benchmarks",
  "reports-exports": "reports", "custom-reports": "reports", "export-center": "reports", "report-templates": "reports",
  "alerts-risks": "alerts", "active-alerts": "alerts", "risk-matrix": "alerts", "resolved-alerts": "alerts",
  "ai-insights": "ai", "dropout-predictions": "ai", "recommendations": "ai", "revenue-forecasting": "ai", "kpi-analysis": "ai",
  "settings": "settings", "kpi-config": "settings", "scoring-rules": "settings", "report-permissions": "settings", "notification-rules": "settings",
};

// ─── SVG Chart Components ──────────────────────────────────────────────────────

function LineChart({ data, color = "#6366f1", height = 80, showDots = true }: {
  data: number[]; color?: string; height?: number; showDots?: boolean;
}) {
  if (!data || data.length < 2) return null;
  const w = 300; const h = height;
  const min = Math.min(...data); const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 10) - 5,
  }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={`lg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#lg-${color.replace("#", "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  );
}

function BarChart({ data, color = "#6366f1", height = 100 }: {
  data: Array<{ label: string; value: number }>; color?: string; height?: number;
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value)) || 1;
  const w = 300; const h = height; const barW = w / data.length - 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }}>
      {data.map((d, i) => {
        const bh = ((d.value / max) * (h - 20));
        const x = i * (w / data.length) + 2;
        const y = h - bh - 15;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="3" fill={color} fillOpacity="0.85" />
            <text x={x + barW / 2} y={h - 2} textAnchor="middle" fontSize="8" fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart({ segments, size = 90 }: {
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
}) {
  const total = segments.reduce((s, g) => s + g.value, 0) || 1;
  const r = 30; const cx = size / 2; const cy = size / 2;
  let angle = -Math.PI / 2;
  const arcs = segments.map(seg => {
    const sweep = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle); const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle); const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...seg, d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a, i) => (
        <path key={i} d={a.d} fill={a.color} stroke="white" strokeWidth="1" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="white" />
    </svg>
  );
}

function Sparkline({ values, color = "#6366f1" }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return <span style={{ color }}>—</span>;
  const w = 60; const h = 24;
  const min = Math.min(...values); const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Shared UI Components ──────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ borderRadius: 16, padding: "20px 24px", ...style }}>{children}</div>;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: color + "22", color, borderRadius: 99, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>{subtitle}</p>}
    </div>
  );
}

function Stat({ label, value, trend, color = "#6366f1", spark }: {
  label: string; value: string | number; trend?: number; color?: string; spark?: number[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color }}>{value}</span>
        {spark && <Sparkline values={spark} color={color} />}
      </div>
      {trend !== undefined && (
        <span style={{ fontSize: 12, color: trend >= 0 ? "#10b981" : "#ef4444", fontWeight: 600 }}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% vs last month
        </span>
      )}
    </div>
  );
}

function ProgressBar({ value, max = 100, color = "#6366f1", showLabel = true }: {
  value: number; max?: number; color?: string; showLabel?: boolean;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 99, transition: "width 0.4s" }} />
      </div>
      {showLabel && <span style={{ fontSize: 12, color: "#64748b", minWidth: 32 }}>{value.toFixed(0)}%</span>}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981",
  };
  return <Badge label={severity.toUpperCase()} color={map[severity] ?? "#94a3b8"} />;
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200 }}>
      <div style={{
        width: 40, height: 40, border: "4px solid #e2e8f0",
        borderTop: "4px solid #6366f1", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── TreeItem Sidebar Component ────────────────────────────────────────────────
type TreeNode = { id: string; label: string; icon?: string; children?: TreeNode[] };

function TreeItem({ node, depth, activePanel, onSelect, T }: {
  node: TreeNode; depth: number; activePanel: string; onSelect: (id: string) => void; T: ReturnType<typeof mkT>;
}) {
  const [open, setOpen] = useState(depth === 0 ? true : false);
  const isActive = SECTION_PANELS[node.id] === activePanel || node.id === activePanel;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        onClick={() => {
          if (hasChildren) setOpen(o => !o);
          onSelect(node.id);
        }}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: `7px ${12 + depth * 14}px`,
          cursor: "pointer", borderRadius: 10, margin: "1px 8px",
          background: isActive && !hasChildren ? T.accent + "18" : "transparent",
          color: isActive && !hasChildren ? T.accent : T.text,
          fontWeight: hasChildren ? 700 : 500,
          fontSize: depth === 0 ? 13 : 12.5,
          transition: "background 0.15s",
          userSelect: "none",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = isActive && !hasChildren ? T.accent + "18" : T.hover)}
        onMouseLeave={e => (e.currentTarget.style.background = isActive && !hasChildren ? T.accent + "18" : "transparent")}
      >
        {node.icon && <span style={{ fontSize: 14 }}>{node.icon}</span>}
        <span style={{ flex: 1, lineHeight: 1.4 }}>{node.label}</span>
        {hasChildren && <span style={{ fontSize: 10, color: T.muted }}>{open ? "▼" : "▶"}</span>}
      </div>
      {hasChildren && open && node.children!.map(ch => (
        <TreeItem key={ch.id} node={ch} depth={depth + 1} activePanel={activePanel} onSelect={onSelect} T={T} />
      ))}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export default function PerformanceWorkspacePage() {
  const [isDark, setIsDark] = useState(false);
  const T = mkT(isDark);
  const [activePanel, setActivePanel] = useState("overview");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  // Data states
  const [overview, setOverview] = useState<PerfOverview | null>(null);
  const [learner, setLearner] = useState<PerfLearnerPerformance | null>(null);
  const [instructor, setInstructor] = useState<PerfInstructorPerformance | null>(null);
  const [course, setCourse] = useState<PerfCoursePerformance | null>(null);
  const [assessment, setAssessment] = useState<PerfAssessmentPerformance | null>(null);
  const [engagement, setEngagement] = useState<PerfEngagement | null>(null);
  const [revenue, setRevenue] = useState<PerfRevenue | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [benchmarks, setBenchmarks] = useState<PerfBenchmark[]>([]);
  const [alerts, setAlerts] = useState<PerfAlert[]>([]);
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({});
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const setLoad = (k: string, v: boolean) => setLoading(l => ({ ...l, [k]: v }));

  const loadOverview = useCallback(async () => {
    setLoad("overview", true);
    try { setOverview(await perfOverviewApi()); } catch { /* silent */ } finally { setLoad("overview", false); }
  }, []);

  const loadLearner = useCallback(async () => {
    setLoad("learner", true);
    try { setLearner(await perfLearnerPerformanceApi({ department: deptFilter, search })); } catch { /* silent */ } finally { setLoad("learner", false); }
  }, [deptFilter, search]);

  const loadInstructor = useCallback(async () => {
    setLoad("instructor", true);
    try { setInstructor(await perfInstructorPerformanceApi()); } catch { /* silent */ } finally { setLoad("instructor", false); }
  }, []);

  const loadCourse = useCallback(async () => {
    setLoad("course", true);
    try { setCourse(await perfCoursePerformanceApi()); } catch { /* silent */ } finally { setLoad("course", false); }
  }, []);

  const loadAssessment = useCallback(async () => {
    setLoad("assessment", true);
    try { setAssessment(await perfAssessmentPerformanceApi()); } catch { /* silent */ } finally { setLoad("assessment", false); }
  }, []);

  const loadEngagement = useCallback(async () => {
    setLoad("engagement", true);
    try { setEngagement(await perfEngagementApi()); } catch { /* silent */ } finally { setLoad("engagement", false); }
  }, []);

  const loadRevenue = useCallback(async () => {
    setLoad("revenue", true);
    try { setRevenue(await perfRevenueApi()); } catch { /* silent */ } finally { setLoad("revenue", false); }
  }, []);

  const loadDepartments = useCallback(async () => {
    setLoad("departments", true);
    try { const r = await perfDepartmentReportsApi(); setDepartments(r.departments ?? []); } catch { /* silent */ } finally { setLoad("departments", false); }
  }, []);

  const loadBenchmarks = useCallback(async () => {
    setLoad("benchmarks", true);
    try { const r = await perfBenchmarksApi(); setBenchmarks(r.benchmarks ?? []); } catch { /* silent */ } finally { setLoad("benchmarks", false); }
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoad("alerts", true);
    try { const r = await perfAlertsApi(); setAlerts(r.alerts ?? []); setAlertCounts(r.counts ?? {}); } catch { /* silent */ } finally { setLoad("alerts", false); }
  }, []);

  const loadAi = useCallback(async () => {
    setLoad("ai", true);
    try { setAiInsights(await perfAiInsightsApi()); } catch { /* silent */ } finally { setLoad("ai", false); }
  }, []);

  useEffect(() => { loadOverview(); loadAlerts(); }, [loadOverview, loadAlerts]);
  useEffect(() => {
    const panel = SECTION_PANELS[activePanel] ?? activePanel;
    if (panel === "learner" && !learner) loadLearner();
    if (panel === "instructor" && !instructor) loadInstructor();
    if (panel === "course" && !course) loadCourse();
    if (panel === "assessment" && !assessment) loadAssessment();
    if (panel === "engagement" && !engagement) loadEngagement();
    if (panel === "revenue" && !revenue) loadRevenue();
    if (panel === "departments" && departments.length === 0) loadDepartments();
    if (panel === "benchmarks" && benchmarks.length === 0) loadBenchmarks();
    if (panel === "ai" && !aiInsights) loadAi();
  }, [activePanel]);

  const handleSeed = async () => {
    setSeeding(true); setSeedMsg("");
    try { await perfSeedApi(); setSeedMsg("Data seeded successfully!"); loadOverview(); loadAlerts(); } catch { setSeedMsg("Seed failed."); } finally { setSeeding(false); }
  };

  const resolveAlert = async (id: string) => {
    try { await perfResolveAlertApi(id); loadAlerts(); } catch { /* silent */ }
  };

  const handleSelect = (id: string) => {
    const panel = SECTION_PANELS[id] ?? id;
    setActivePanel(panel);
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n));
  const fmtRs = (n: number) => `₹${fmt(n)}`;

  // ─── Panel renderers ─────────────────────────────────────────────────────────

  const renderOverview = () => {
    if (loading.overview) return <LoadingSpinner />;
    const ov = overview;
    const trendValues = (ov?.trend_data ?? []).map((t: any) => t.revenue);
    const enrollValues = (ov?.trend_data ?? []).map((t: any) => t.enrollments);
    const scoreDist = ov?.score_distribution;

    const kpis = [
      { label: "Active Learners", value: fmt(ov?.active_learners ?? 0), trend: ov?.active_learners_trend, color: "#6366f1", spark: enrollValues },
      { label: "Completion Rate", value: `${(ov?.completion_rate ?? 0).toFixed(1)}%`, trend: ov?.completion_rate_trend, color: "#10b981" },
      { label: "Avg Quiz Score", value: `${(ov?.avg_quiz_score ?? 0).toFixed(1)}%`, trend: ov?.avg_quiz_score_trend, color: "#f59e0b" },
      { label: "Total Revenue", value: fmtRs(ov?.total_revenue ?? 0), trend: ov?.total_revenue_trend, color: "#6366f1", spark: trendValues },
      { label: "New Enrollments", value: fmt(ov?.new_enrollments ?? 0), trend: ov?.new_enrollments_trend, color: "#10b981" },
      { label: "Daily Active Users", value: fmt(ov?.current_dau ?? 0), color: "#f59e0b" },
      { label: "Active Alerts", value: String(ov?.active_alerts ?? 0), color: "#ef4444" },
    ];

    return (
      <div>
        <SectionHeader title="Performance Overview" subtitle="Executive-level KPIs and business metrics" />

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          {kpis.map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} trend={k.trend} color={k.color} spark={k.spark} />
            </Card>
          ))}
        </div>

        {/* Revenue Trend Chart */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.text }}>Revenue & Enrollment Trend (12 months)</h3>
            <div style={{ marginBottom: 8 }}>
              <LineChart data={trendValues} color="#6366f1" height={100} />
            </div>
            <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
              {(ov?.trend_data ?? []).slice(-4).map((t: any, i: number) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: T.muted }}>{t.month}</div>
                  <div style={{ fontWeight: 700, color: "#6366f1", fontSize: 13 }}>{fmtRs(t.revenue)}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{t.enrollments} enroll</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Score Distribution Donut */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.text }}>Score Distribution</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <DonutChart size={100} segments={[
                { value: scoreDist?.["90-100"] ?? 0, color: "#10b981", label: "90-100" },
                { value: scoreDist?.["80-89"] ?? 0, color: "#6366f1", label: "80-89" },
                { value: scoreDist?.["70-79"] ?? 0, color: "#f59e0b", label: "70-79" },
                { value: scoreDist?.["60-69"] ?? 0, color: "#f97316", label: "60-69" },
                { value: scoreDist?.below_60 ?? 0, color: "#ef4444", label: "<60" },
              ]} />
              <div style={{ fontSize: 12 }}>
                {[
                  ["90-100", scoreDist?.["90-100"] ?? 0, "#10b981"],
                  ["80-89", scoreDist?.["80-89"] ?? 0, "#6366f1"],
                  ["70-79", scoreDist?.["70-79"] ?? 0, "#f59e0b"],
                  ["60-69", scoreDist?.["60-69"] ?? 0, "#f97316"],
                  ["< 60", scoreDist?.below_60 ?? 0, "#ef4444"],
                ].map(([l, v, c], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: c as string, display: "inline-block" }} />
                    <span style={{ color: T.muted }}>{l}:</span>
                    <span style={{ fontWeight: 700, color: T.text }}>{v as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Alert Summary */}
        {alerts.filter(a => !a.resolved).slice(0, 3).length > 0 && (
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: T.text }}>Active Alerts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alerts.filter(a => !a.resolved).slice(0, 3).map(a => (
                <div key={a.alert_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.hover, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <SeverityBadge severity={a.severity} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{a.entity_name} — {a.description}</div>
                  </div>
                  <button onClick={() => resolveAlert(a.alert_id)} style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderLearner = () => {
    if (loading.learner && !learner) return <LoadingSpinner />;
    const lp = learner;
    const statusDist = lp?.status_distribution;
    const byDept = lp?.by_department ?? {};

    return (
      <div>
        <SectionHeader title="Learner Performance" subtitle="Track individual and cohort progress across courses" />

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Learners", value: fmt(lp?.total ?? 0), color: "#6366f1" },
            { label: "Avg Completion", value: `${(lp?.avg_completion ?? 0).toFixed(1)}%`, color: "#10b981" },
            { label: "Avg Quiz Score", value: `${(lp?.avg_quiz_score ?? 0).toFixed(1)}%`, color: "#f59e0b" },
            { label: "Certificates Issued", value: fmt(lp?.certificates_total ?? 0), color: "#8b5cf6" },
          ].map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} color={k.color} />
            </Card>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Completion Status Donut */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Completion Status Distribution</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <DonutChart size={110} segments={[
                { value: statusDist?.completed ?? 0, color: "#10b981", label: "Completed" },
                { value: statusDist?.in_progress ?? 0, color: "#6366f1", label: "In Progress" },
                { value: statusDist?.not_started ?? 0, color: "#94a3b8", label: "Not Started" },
                { value: statusDist?.at_risk ?? 0, color: "#ef4444", label: "At Risk" },
              ]} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["Completed", statusDist?.completed ?? 0, "#10b981"],
                  ["In Progress", statusDist?.in_progress ?? 0, "#6366f1"],
                  ["Not Started", statusDist?.not_started ?? 0, "#94a3b8"],
                  ["At Risk", statusDist?.at_risk ?? 0, "#ef4444"],
                ].map(([l, v, c], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 2, background: c as string, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: T.muted, minWidth: 90 }}>{l}</span>
                    <span style={{ fontWeight: 700, color: T.text }}>{v as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* By Department */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>By Department</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(byDept).slice(0, 5).map(([dept, data]: [string, any], i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{dept}</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{data.count} learners · {data.avg_score?.toFixed(0)}% score</span>
                  </div>
                  <ProgressBar value={data.avg_score ?? 0} color="#6366f1" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* At-Risk Learners */}
        {(lp?.at_risk ?? []).length > 0 && (
          <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>⚠️ At-Risk Learners ({lp?.at_risk_count ?? 0})</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Name", "Department", "Completion %", "Avg Score", "Last Active", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(lp?.at_risk ?? []).map((lr: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "10px 12px", color: T.text, fontWeight: 600 }}>{lr.name}</td>
                      <td style={{ padding: "10px 12px", color: T.muted }}>{lr.department}</td>
                      <td style={{ padding: "10px 12px" }}><ProgressBar value={lr.completion_pct ?? 0} color="#ef4444" /></td>
                      <td style={{ padding: "10px 12px", color: "#f59e0b", fontWeight: 700 }}>{(lr.avg_quiz_score ?? 0).toFixed(1)}%</td>
                      <td style={{ padding: "10px 12px", color: T.muted }}>{lr.last_active ? new Date(lr.last_active).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "10px 12px" }}><Badge label={lr.status ?? "at_risk"} color="#ef4444" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* All Learners Table */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>All Learners ({lp?.total ?? 0})</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Name", "Dept", "Completion", "Quiz Score", "Certificates", "Courses", "Status"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(lp?.learners ?? []).slice(0, 15).map((lr: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "9px 12px", color: T.text, fontWeight: 600 }}>{lr.name}</td>
                    <td style={{ padding: "9px 12px", color: T.muted }}>{lr.department}</td>
                    <td style={{ padding: "9px 12px", minWidth: 100 }}><ProgressBar value={lr.completion_pct ?? 0} color="#6366f1" /></td>
                    <td style={{ padding: "9px 12px", color: lr.avg_quiz_score >= 70 ? "#10b981" : "#ef4444", fontWeight: 700 }}>{(lr.avg_quiz_score ?? 0).toFixed(1)}%</td>
                    <td style={{ padding: "9px 12px", color: T.text }}>{lr.certificates ?? 0}</td>
                    <td style={{ padding: "9px 12px", color: T.muted }}>{lr.courses_enrolled ?? 0}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <Badge label={lr.status ?? "active"} color={lr.status === "at_risk" ? "#ef4444" : lr.status === "completed" ? "#10b981" : "#6366f1"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderInstructor = () => {
    if (loading.instructor && !instructor) return <LoadingSpinner />;
    const ip = instructor;

    return (
      <div>
        <SectionHeader title="Instructor Performance" subtitle="Monitor instructor effectiveness and student outcomes" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Instructors", value: String(ip?.total ?? 0), color: "#6366f1" },
            { label: "Avg Rating", value: `${(ip?.avg_rating ?? 0).toFixed(1)} ★`, color: "#f59e0b" },
            { label: "Avg Completion Rate", value: `${(ip?.avg_completion ?? 0).toFixed(1)}%`, color: "#10b981" },
          ].map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} color={k.color} />
            </Card>
          ))}
        </div>

        {/* Top Instructors */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>🏆 Top Instructors</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(ip?.top_instructors ?? []).map((ins: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: T.hover, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6"][i % 4], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>
                  {ins.name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{ins.name}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{ins.department} · {ins.courses_created} courses · {ins.total_students} students</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "#f59e0b", fontSize: 16 }}>{(ins.avg_rating ?? 0).toFixed(1)} ★</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{(ins.completion_rate ?? 0).toFixed(0)}% completion</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "#10b981", fontSize: 14 }}>{fmtRs(ins.revenue_generated ?? 0)}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>revenue</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* All Instructors Table */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>All Instructors</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Instructor", "Department", "Courses", "Students", "Avg Rating", "Completion", "Revenue", "Status"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(ip?.instructors ?? []).map((ins: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ fontWeight: 600, color: T.text }}>{ins.name}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{ins.email}</div>
                    </td>
                    <td style={{ padding: "9px 12px", color: T.muted }}>{ins.department}</td>
                    <td style={{ padding: "9px 12px", color: T.text }}>{ins.courses_created}</td>
                    <td style={{ padding: "9px 12px", color: T.text }}>{ins.total_students}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ color: "#f59e0b", fontWeight: 700 }}>{(ins.avg_rating ?? 0).toFixed(1)} ★</span>
                    </td>
                    <td style={{ padding: "9px 12px", minWidth: 100 }}><ProgressBar value={ins.completion_rate ?? 0} color="#10b981" /></td>
                    <td style={{ padding: "9px 12px", color: "#10b981", fontWeight: 700 }}>{fmtRs(ins.revenue_generated ?? 0)}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <Badge label={ins.status ?? "active"} color={ins.status === "active" ? "#10b981" : "#f59e0b"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderCourse = () => {
    if (loading.course && !course) return <LoadingSpinner />;
    const cp = course;

    return (
      <div>
        <SectionHeader title="Course Performance" subtitle="Enrollment trends, completion rates, and content effectiveness" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Courses", value: String(cp?.total ?? 0), color: "#6366f1" },
            { label: "Avg Completion", value: `${(cp?.avg_completion ?? 0).toFixed(1)}%`, color: "#10b981" },
            { label: "Avg Rating", value: `${(cp?.avg_rating ?? 0).toFixed(1)} ★`, color: "#f59e0b" },
            { label: "Categories", value: String(Object.keys(cp?.by_category ?? {}).length), color: "#8b5cf6" },
          ].map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} color={k.color} />
            </Card>
          ))}
        </div>

        {/* Popular Courses */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>🔥 Popular Courses</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(cp?.popular_courses ?? []).slice(0, 5).map((c: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: T.hover, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: ["#f59e0b","#94a3b8","#cd7c2f","#6366f1","#10b981"][i], minWidth: 28 }}>#{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: T.text }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{c.instructor} · {c.category} · {c.level}</div>
                </div>
                <div style={{ textAlign: "right", minWidth: 80 }}>
                  <div style={{ fontWeight: 700, color: "#6366f1" }}>{c.enrollments} enrolled</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{(c.completion_rate ?? 0).toFixed(0)}% complete</div>
                </div>
                <div style={{ textAlign: "right", minWidth: 70 }}>
                  <div style={{ fontWeight: 700, color: "#f59e0b" }}>{(c.avg_rating ?? 0).toFixed(1)} ★</div>
                  <div style={{ fontSize: 12, color: "#10b981" }}>{fmtRs(c.revenue ?? 0)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Low Performing */}
        {(cp?.low_performing ?? []).length > 0 && (
          <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>📉 Low Performing Courses</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(cp?.low_performing ?? []).slice(0, 4).map((c: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "#ef444408", borderRadius: 10, border: `1px solid #ef444430` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: T.text }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{c.category} · Drop-off: {(c.drop_off_rate ?? 0).toFixed(1)}%</div>
                  </div>
                  <div style={{ minWidth: 130 }}>
                    <ProgressBar value={c.completion_rate ?? 0} color="#ef4444" />
                  </div>
                  <Badge label="Needs Attention" color="#ef4444" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* All Courses Table */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>All Courses</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Title", "Category", "Instructor", "Enrollments", "Completion", "Rating", "Revenue"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(cp?.courses ?? []).slice(0, 15).map((c: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "9px 12px", color: T.text, fontWeight: 600, maxWidth: 200 }}>{c.title}</td>
                    <td style={{ padding: "9px 12px", color: T.muted }}>{c.category}</td>
                    <td style={{ padding: "9px 12px", color: T.muted }}>{c.instructor}</td>
                    <td style={{ padding: "9px 12px", color: "#6366f1", fontWeight: 700 }}>{c.enrollments}</td>
                    <td style={{ padding: "9px 12px", minWidth: 100 }}><ProgressBar value={c.completion_rate ?? 0} color="#10b981" /></td>
                    <td style={{ padding: "9px 12px", color: "#f59e0b", fontWeight: 700 }}>{(c.avg_rating ?? 0).toFixed(1)} ★</td>
                    <td style={{ padding: "9px 12px", color: "#10b981", fontWeight: 700 }}>{fmtRs(c.revenue ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderAssessment = () => {
    if (loading.assessment && !assessment) return <LoadingSpinner />;
    const ap = assessment;
    const sdist = ap?.score_distribution ?? {};
    const diffBreakdown = ap?.difficulty_breakdown ?? {};

    return (
      <div>
        <SectionHeader title="Assessment Performance" subtitle="Quiz analytics, pass rates, and difficulty insights" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Avg Pass Rate", value: `${(ap?.avg_pass_rate ?? 0).toFixed(1)}%`, color: "#10b981" },
            { label: "Avg Score", value: `${(ap?.avg_score ?? 0).toFixed(1)}%`, color: "#6366f1" },
            { label: "Total Attempts", value: fmt(ap?.total_attempts ?? 0), color: "#f59e0b" },
            { label: "Failed Learners", value: String(ap?.failed_learners ?? 0), color: "#ef4444" },
          ].map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} color={k.color} />
            </Card>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Score Distribution */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Score Distribution</h3>
            <BarChart height={110} data={Object.entries(sdist).map(([l, v]) => ({ label: l, value: v as number }))} color="#6366f1" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {Object.entries(sdist).map(([l, v], i) => (
                <div key={i} style={{ background: T.pill, borderRadius: 8, padding: "4px 10px", fontSize: 12 }}>
                  <span style={{ color: T.muted }}>{l}: </span><span style={{ fontWeight: 700, color: T.text }}>{v as number}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Difficulty Breakdown */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Difficulty Breakdown</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(diffBreakdown).map(([diff, data]: [string, any], i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <Badge label={diff} color={diff === "Easy" ? "#10b981" : diff === "Medium" ? "#f59e0b" : "#ef4444"} />
                    <span style={{ fontSize: 12, color: T.muted }}>{data.count} assessments · {(data.avg_pass_rate ?? 0).toFixed(1)}% pass rate</span>
                  </div>
                  <ProgressBar value={data.avg_pass_rate ?? 0} color={diff === "Easy" ? "#10b981" : diff === "Medium" ? "#f59e0b" : "#ef4444"} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Assessment Table */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>All Assessments ({ap?.total ?? 0})</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Assessment", "Course", "Attempts", "Pass Rate", "Avg Score", "Failed", "Difficulty"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(ap?.assessments ?? []).map((a: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "9px 12px", color: T.text, fontWeight: 600 }}>{a.assessment_name}</td>
                    <td style={{ padding: "9px 12px", color: T.muted, maxWidth: 150 }}>{a.course_title}</td>
                    <td style={{ padding: "9px 12px", color: T.text }}>{a.total_attempts}</td>
                    <td style={{ padding: "9px 12px", minWidth: 100 }}><ProgressBar value={a.pass_rate ?? 0} color="#10b981" /></td>
                    <td style={{ padding: "9px 12px", color: "#6366f1", fontWeight: 700 }}>{(a.avg_score ?? 0).toFixed(1)}%</td>
                    <td style={{ padding: "9px 12px", color: "#ef4444", fontWeight: 700 }}>{a.failed_count ?? 0}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <Badge label={a.difficulty ?? "Medium"} color={a.difficulty === "Easy" ? "#10b981" : a.difficulty === "Hard" ? "#ef4444" : "#f59e0b"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderEngagement = () => {
    if (loading.engagement && !engagement) return <LoadingSpinner />;
    const eg = engagement;
    const dauData = (eg?.dau_trend ?? []).slice(-14).map((d: any) => d.dau);
    const featureData = Object.entries(eg?.feature_usage ?? {}).map(([k, v]) => ({ label: k.replace("_", " ").slice(0, 8), value: v as number }));

    return (
      <div>
        <SectionHeader title="Engagement Analytics" subtitle="User activity, session patterns, and platform retention" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Avg Session (min)", value: String(Math.round(eg?.avg_session_minutes ?? 0)), color: "#6366f1" },
            { label: "Bounce Rate", value: `${(eg?.bounce_rate ?? 0).toFixed(1)}%`, color: "#f59e0b" },
            { label: "7-Day Retention", value: `${(eg?.retention_7d ?? 0).toFixed(1)}%`, color: "#10b981" },
            { label: "30-Day Retention", value: `${(eg?.retention_30d ?? 0).toFixed(1)}%`, color: "#8b5cf6" },
          ].map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} color={k.color} />
            </Card>
          ))}
        </div>

        {/* DAU Trend */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: T.text }}>Daily Active Users (Last 14 Days)</h3>
          <LineChart data={dauData} color="#6366f1" height={120} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: T.muted }}>
            <span>14 days ago</span>
            <span>Today: {dauData[dauData.length - 1] ?? 0} DAU</span>
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          {/* Feature Usage */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Feature Usage</h3>
            <BarChart data={featureData} color="#10b981" height={100} />
          </Card>

          {/* Peak Hours */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Peak Activity Hours</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(eg?.peak_hours ?? []).slice(0, 5).map((p: any, i: number) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: T.muted, fontSize: 12, minWidth: 50 }}>{String(p.hour).padStart(2, "0")}:00</span>
                  <div style={{ flex: 1, background: T.border, borderRadius: 4, height: 8, overflow: "hidden" }}>
                    <div style={{ width: `${(p.sessions / 200) * 100}%`, background: "#6366f1", height: "100%", borderRadius: 4 }} />
                  </div>
                  <span style={{ color: T.text, fontWeight: 700, fontSize: 12, minWidth: 40 }}>{p.sessions}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent DAU table */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Daily Engagement Data</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Date", "DAU", "WAU", "Sessions", ""].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: T.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(eg?.dau_trend ?? []).slice(-10).reverse().map((d: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: "9px 12px", color: T.muted }}>{d.date ? new Date(d.date).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: "9px 12px", color: "#6366f1", fontWeight: 700 }}>{d.dau}</td>
                    <td style={{ padding: "9px 12px", color: "#10b981", fontWeight: 700 }}>{d.wau ?? "—"}</td>
                    <td style={{ padding: "9px 12px", color: T.text }}>{d.sessions}</td>
                    <td style={{ padding: "9px 12px", minWidth: 80 }}>
                      <Sparkline values={[d.dau - 10, d.dau - 5, d.dau]} color="#6366f1" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderRevenue = () => {
    if (loading.revenue && !revenue) return <LoadingSpinner />;
    const rv = revenue;
    const monthlyRev = (rv?.monthly_data ?? []).map((m: any) => m.revenue);

    return (
      <div>
        <SectionHeader title="Revenue Performance" subtitle="Financial metrics, course revenue, and refund analytics" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Revenue", value: fmtRs(rv?.total_revenue ?? 0), color: "#10b981" },
            { label: "This Month", value: fmtRs(rv?.current_month_revenue ?? 0), color: "#6366f1" },
            { label: "Total Refunds", value: String(rv?.total_refunds ?? 0), color: "#ef4444" },
            { label: "Refund Rate", value: `${(rv?.refund_rate ?? 0).toFixed(1)}%`, color: "#f59e0b" },
          ].map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} color={k.color} />
            </Card>
          ))}
        </div>

        {/* Monthly Revenue Chart */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: T.text }}>Monthly Revenue Trend (12 months)</h3>
          <LineChart data={monthlyRev} color="#10b981" height={120} />
          <div style={{ display: "flex", gap: 12, overflowX: "auto", marginTop: 12, paddingBottom: 4 }}>
            {(rv?.monthly_data ?? []).map((m: any, i: number) => (
              <div key={i} style={{ textAlign: "center", minWidth: 70 }}>
                <div style={{ fontSize: 11, color: T.muted }}>{m.label}</div>
                <div style={{ fontWeight: 700, color: "#10b981", fontSize: 13 }}>{fmtRs(m.revenue)}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{m.new_enrollments}↑</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Revenue by Course */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Revenue by Course</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(rv?.revenue_by_course ?? []).slice(0, 7).map((c: any, i: number) => {
                const maxRev = Math.max(...(rv?.revenue_by_course ?? []).map((x: any) => x.revenue)) || 1;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{c.course?.length > 30 ? c.course.slice(0, 30) + "…" : c.course}</span>
                      <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>{fmtRs(c.revenue)}</span>
                    </div>
                    <ProgressBar value={(c.revenue / maxRev) * 100} color="#10b981" showLabel={false} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Monthly Breakdown</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {["Month", "Revenue", "New", "Refunds"].map(h => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: T.muted, fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rv?.monthly_data ?? []).slice(-6).reverse().map((m: any, i: number) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px 10px", color: T.muted }}>{m.label}</td>
                      <td style={{ padding: "8px 10px", color: "#10b981", fontWeight: 700 }}>{fmtRs(m.revenue)}</td>
                      <td style={{ padding: "8px 10px", color: "#6366f1" }}>{m.new_enrollments}</td>
                      <td style={{ padding: "8px 10px", color: "#ef4444" }}>{m.refunds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderDepartments = () => {
    if (loading.departments && departments.length === 0) return <LoadingSpinner />;

    return (
      <div>
        <SectionHeader title="Department Reports" subtitle="Team-level performance, skill improvement, and cross-department comparison" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
          {departments.map((dept: any, i: number) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{dept.department}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{dept.team_count} team members</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "#10b981", fontSize: 16 }}>{(dept.avg_completion ?? 0).toFixed(0)}%</div>
                  <div style={{ fontSize: 11, color: T.muted }}>completion</div>
                </div>
              </div>
              <ProgressBar value={dept.avg_completion ?? 0} color="#6366f1" />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12 }}>
                <span style={{ color: T.muted }}>Avg Score: <strong style={{ color: "#f59e0b" }}>{(dept.avg_score ?? 0).toFixed(0)}%</strong></span>
                <span style={{ color: T.muted }}>At Risk: <strong style={{ color: "#ef4444" }}>{dept.at_risk_count ?? 0}</strong></span>
                <span style={{ color: T.muted }}>Certs: <strong style={{ color: "#8b5cf6" }}>{dept.certificates_issued ?? 0}</strong></span>
              </div>
            </Card>
          ))}
        </div>

        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Department Comparison</h3>
          <BarChart
            data={departments.map((d: any) => ({ label: d.department?.slice(0, 8), value: d.avg_completion ?? 0 }))}
            color="#6366f1" height={120}
          />
        </Card>
      </div>
    );
  };

  const renderBenchmarks = () => {
    if (loading.benchmarks && benchmarks.length === 0) return <LoadingSpinner />;

    return (
      <div>
        <SectionHeader title="Benchmarks & Goals" subtitle="KPI target tracking and progress toward business goals" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "On Track", value: String(benchmarks.filter(b => b.status === "on_track").length), color: "#10b981" },
            { label: "At Risk", value: String(benchmarks.filter(b => b.status === "at_risk").length), color: "#f59e0b" },
            { label: "Behind", value: String(benchmarks.filter(b => b.status === "behind").length), color: "#ef4444" },
          ].map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} color={k.color} />
            </Card>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {benchmarks.map((b, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{b.kpi_name}</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{b.period}</span>
                  </div>
                  <ProgressBar
                    value={(b.current_value / b.target_value) * 100}
                    color={b.status === "on_track" ? "#10b981" : b.status === "at_risk" ? "#f59e0b" : "#ef4444"}
                    showLabel={false}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
                    <span style={{ color: T.muted }}>Current: <strong style={{ color: T.text }}>{b.current_value}{b.unit}</strong></span>
                    <span style={{ color: T.muted }}>Target: <strong style={{ color: "#6366f1" }}>{b.target_value}{b.unit}</strong></span>
                    <span style={{ color: b.trend >= 0 ? "#10b981" : "#ef4444" }}>{b.trend >= 0 ? "▲" : "▼"} {Math.abs(b.trend).toFixed(1)}%</span>
                  </div>
                </div>
                <Badge
                  label={b.status === "on_track" ? "On Track" : b.status === "at_risk" ? "At Risk" : "Behind"}
                  color={b.status === "on_track" ? "#10b981" : b.status === "at_risk" ? "#f59e0b" : "#ef4444"}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div>
      <SectionHeader title="Reports & Exports" subtitle="Generate and download performance reports in multiple formats" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          { title: "Learner Progress Report", desc: "Complete learner completion and score data", icon: "🎓" },
          { title: "Instructor Performance Report", desc: "Instructor ratings and course delivery metrics", icon: "👨‍🏫" },
          { title: "Revenue Analytics Report", desc: "Monthly revenue, enrollments, and refunds", icon: "💰" },
          { title: "Assessment Summary Report", desc: "Pass rates, score distributions, failed attempts", icon: "📝" },
          { title: "Department Report", desc: "Team progress and cross-department comparison", icon: "🏢" },
          { title: "Executive KPI Report", desc: "High-level business KPIs for leadership", icon: "📊" },
        ].map((r, i) => (
          <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{r.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 }}>{r.title}</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>{r.desc}</div>
            <div style={{ display: "flex", gap: 10 }}>
              {["PDF", "Excel", "CSV"].map(fmt => (
                <button key={fmt} style={{
                  background: T.pill, border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: T.text,
                }}>
                  {fmt}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.text }}>Custom Report Builder</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Date From", type: "date" },
            { label: "Date To", type: "date" },
            { label: "Department", type: "select", opts: ["All", "Sales", "Support", "Engineering", "Marketing"] },
          ].map((f, i) => (
            <div key={i}>
              <label style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>{f.label}</label>
              {f.type === "select" ? (
                <select style={{ display: "block", width: "100%", marginTop: 6, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.hover, color: T.text, fontSize: 13 }}>
                  {f.opts?.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type} style={{ display: "block", width: "100%", marginTop: 6, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.hover, color: T.text, fontSize: 13, boxSizing: "border-box" }} />
              )}
            </div>
          ))}
        </div>
        <button style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          Generate Report
        </button>
      </Card>
    </div>
  );

  const renderAlerts = () => {
    if (loading.alerts && alerts.length === 0) return <LoadingSpinner />;
    const activeAlerts = alerts.filter(a => !a.resolved);
    const resolvedAlerts = alerts.filter(a => a.resolved);

    return (
      <div>
        <SectionHeader title="Alerts & Risks" subtitle="Monitor risks, resolve alerts, and configure alert rules" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total Alerts", value: String(alertCounts.total ?? alerts.length), color: "#6366f1" },
            { label: "Active", value: String(alertCounts.active ?? activeAlerts.length), color: "#ef4444" },
            { label: "Critical", value: String(alertCounts.critical ?? 0), color: "#ef4444" },
            { label: "Resolved", value: String(resolvedAlerts.length), color: "#10b981" },
          ].map((k, i) => (
            <Card key={i} style={{ background: T.card, border: `1px solid ${T.border}` }}>
              <Stat label={k.label} value={k.value} color={k.color} />
            </Card>
          ))}
        </div>

        <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Active Alerts ({activeAlerts.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activeAlerts.map(a => (
              <div key={a.alert_id} style={{
                padding: "14px 16px", borderRadius: 12, border: `1px solid ${a.severity === "critical" ? "#ef4444" : a.severity === "high" ? "#f97316" : T.border}`,
                background: a.severity === "critical" ? "#ef444408" : a.severity === "high" ? "#f9731608" : T.hover,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <SeverityBadge severity={a.severity} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{a.title}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.muted, marginBottom: 6 }}>{a.description}</div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: T.muted }}>
                      <span>Entity: <strong style={{ color: T.text }}>{a.entity_name}</strong></span>
                      <span>Type: {a.entity_type}</span>
                      <span>Value: <strong style={{ color: "#ef4444" }}>{a.metric_value}</strong> (threshold: {a.threshold})</span>
                      <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(a.alert_id)}
                    style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                  >
                    ✓ Resolve
                  </button>
                </div>
              </div>
            ))}
            {activeAlerts.length === 0 && (
              <div style={{ textAlign: "center", color: "#10b981", fontWeight: 600, padding: "20px 0" }}>
                ✓ No active alerts — all clear!
              </div>
            )}
          </div>
        </Card>

        {resolvedAlerts.length > 0 && (
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>Resolved Alerts ({resolvedAlerts.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {resolvedAlerts.slice(0, 5).map(a => (
                <div key={a.alert_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: T.hover, borderRadius: 10, opacity: 0.8 }}>
                  <span style={{ color: "#10b981", fontSize: 16 }}>✓</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{a.title}</span>
                    <span style={{ fontSize: 12, color: T.muted, marginLeft: 10 }}>{a.entity_name}</span>
                  </div>
                  <Badge label="Resolved" color="#10b981" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderAi = () => {
    if (loading.ai && !aiInsights) return <LoadingSpinner />;
    const ai = aiInsights;

    return (
      <div>
        <SectionHeader title="AI Insights" subtitle="Machine learning predictions, smart recommendations, and forecasting" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* Dropout Risk */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>🚨 Dropout Risk Predictions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(ai?.dropout_risk ?? []).slice(0, 5).map((d: any, i: number) => (
                <div key={i} style={{ padding: "10px 14px", background: T.hover, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{d.learner}</span>
                    <span style={{ background: d.risk_score > 0.7 ? "#ef444422" : "#f5940022", color: d.risk_score > 0.7 ? "#ef4444" : "#f59e0b", borderRadius: 99, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
                      Risk: {(d.risk_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>{d.department} · {d.reason}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recommendations */}
          <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>💡 Smart Recommendations</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(ai?.recommendations ?? []).slice(0, 5).map((r: any, i: number) => (
                <div key={i} style={{ padding: "10px 14px", background: T.hover, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Badge label={r.type} color="#6366f1" />
                    <span style={{ fontWeight: 600, color: T.text, fontSize: 13 }}>{r.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>{r.description}</div>
                  <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Impact: {r.impact}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Revenue Forecast */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>📈 Revenue Forecast (Next 3 Months)</h3>
          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 1 }}>
              <LineChart data={(ai?.revenue_forecast ?? []).map((f: any) => f.predicted)} color="#10b981" height={100} showDots />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
              {(ai?.revenue_forecast ?? []).map((f: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: T.hover, borderRadius: 8 }}>
                  <span style={{ color: T.muted, fontSize: 13 }}>{f.month}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#10b981", fontSize: 13 }}>{fmtRs(f.predicted)}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{f.confidence}% confidence</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* KPI Analysis */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: T.text }}>🎯 KPI Analysis</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(ai?.kpi_analysis ?? []).map((k: any, i: number) => (
              <div key={i} style={{ padding: "14px 16px", background: T.hover, borderRadius: 12, border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 700, color: "#6366f1", fontSize: 14, marginBottom: 6 }}>{k.kpi}</div>
                <div style={{ fontSize: 13, color: T.text, marginBottom: 6 }}>{k.insight}</div>
                <div style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>→ {k.action}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const renderSettings = () => (
    <div>
      <SectionHeader title="Settings" subtitle="Configure KPIs, scoring rules, permissions, and notifications" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* KPI Config */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.text }}>KPI Configuration</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Completion Rate Target", default: "80" },
              { label: "Quiz Pass Rate Target", default: "75" },
              { label: "DAU Target", default: "250" },
              { label: "Monthly Revenue Target (₹)", default: "150000" },
            ].map((f, i) => (
              <div key={i}>
                <label style={{ fontSize: 12, color: T.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>{f.label}</label>
                <input defaultValue={f.default} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.hover, color: T.text, fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
            <button style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Save KPI Config</button>
          </div>
        </Card>

        {/* Scoring Rules */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.text }}>Scoring Rules</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "At-Risk Threshold (completion %)", default: "30" },
              { label: "Low Performing Score (%)", default: "50" },
              { label: "Alert Trigger: Quiz Pass Rate <", default: "60" },
              { label: "Dropout Risk Score Threshold", default: "0.7" },
            ].map((f, i) => (
              <div key={i}>
                <label style={{ fontSize: 12, color: T.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>{f.label}</label>
                <input defaultValue={f.default} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.hover, color: T.text, fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
            <button style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Save Rules</button>
          </div>
        </Card>

        {/* Report Permissions */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.text }}>Report Permissions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { role: "Admin", reports: ["All Reports", "Export All", "AI Insights"] },
              { role: "Manager", reports: ["Department Reports", "Learner Reports"] },
              { role: "Instructor", reports: ["My Course Reports", "My Learner Scores"] },
            ].map((p, i) => (
              <div key={i} style={{ padding: "12px 14px", background: T.hover, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 700, color: T.text, fontSize: 13, marginBottom: 8 }}>{p.role}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {p.reports.map(r => <Badge key={r} label={r} color="#6366f1" />)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Notification Rules */}
        <Card style={{ background: T.card, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: T.text }}>Notification Rules</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Learner At Risk", enabled: true },
              { label: "Low Completion Alert", enabled: true },
              { label: "Revenue Drop", enabled: true },
              { label: "Low Instructor Rating", enabled: false },
              { label: "Daily Summary Report", enabled: true },
              { label: "Weekly KPI Report", enabled: true },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: T.hover, borderRadius: 10, border: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{r.label}</span>
                <div style={{
                  width: 40, height: 22, borderRadius: 99, cursor: "pointer",
                  background: r.enabled ? "#6366f1" : T.border, position: "relative",
                }}>
                  <div style={{
                    position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "#fff",
                    top: 2, left: r.enabled ? 20 : 2, transition: "left 0.2s",
                  }} />
                </div>
              </div>
            ))}
            <button style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13, marginTop: 6 }}>Save Notification Config</button>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderPanel = () => {
    const panel = SECTION_PANELS[activePanel] ?? activePanel;
    switch (panel) {
      case "overview": return renderOverview();
      case "learner": return renderLearner();
      case "instructor": return renderInstructor();
      case "course": return renderCourse();
      case "assessment": return renderAssessment();
      case "engagement": return renderEngagement();
      case "revenue": return renderRevenue();
      case "departments": return renderDepartments();
      case "benchmarks": return renderBenchmarks();
      case "reports": return renderReports();
      case "alerts": return renderAlerts();
      case "ai": return renderAi();
      case "settings": return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", color: T.text }}>
      {/* Sidebar */}
      <div style={{
        width: 260, minHeight: "100vh", background: T.sidebar, borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: T.accent }}>📊 Performance</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Admin Workspace</div>
        </div>

        {/* Seed button */}
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
          <button
            onClick={handleSeed}
            disabled={seeding}
            style={{ width: "100%", background: seeding ? T.pill : "#6366f1", color: seeding ? T.muted : "#fff", border: "none", borderRadius: 8, padding: "7px 14px", cursor: seeding ? "default" : "pointer", fontWeight: 600, fontSize: 12 }}
          >
            {seeding ? "Seeding…" : "⚡ Seed Demo Data"}
          </button>
          {seedMsg && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, textAlign: "center" }}>{seedMsg}</div>}
        </div>

        {/* Tree */}
        <div style={{ padding: "8px 0", flex: 1 }}>
          {TREE.map(node => (
            <TreeItem key={node.id} node={node} depth={0} activePanel={SECTION_PANELS[activePanel] ?? activePanel} onSelect={handleSelect} T={T} />
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div style={{
          padding: "14px 28px", background: T.card, borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", gap: 16, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search learners, courses, instructors…"
              style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.hover, color: T.text, fontSize: 13, width: 280, outline: "none" }}
            />
          </div>

          {/* Dept filter */}
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: T.hover, color: T.text, fontSize: 13, cursor: "pointer" }}
          >
            <option value="">All Departments</option>
            {["Sales", "Support", "Engineering", "Marketing", "HR", "Finance", "Operations"].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Alert indicator */}
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => handleSelect("alerts-risks")}>
            <span style={{ fontSize: 20 }}>🔔</span>
            {alerts.filter(a => !a.resolved).length > 0 && (
              <span style={{ position: "absolute", top: -4, right: -6, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {alerts.filter(a => !a.resolved).length}
              </span>
            )}
          </div>

          {/* Dark mode */}
          <button
            onClick={() => setIsDark(d => !d)}
            style={{ background: T.pill, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: T.text, fontWeight: 600 }}
          >
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
          {renderPanel()}
        </div>
      </div>
    </div>
  );
}
