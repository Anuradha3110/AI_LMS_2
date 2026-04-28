"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  kwSeedApi, kwOverviewApi, kwCoursesApi, kwModulesApi, kwLessonsApi,
  kwAssessmentsApi, kwAnalyticsApi, kwContentListApi, kwContentCreateApi,
  kwContentDeleteApi, kwArticlesApi, kwArticleCreateApi, kwArticleDeleteApi,
  kwCertificatesApi, kwCertificateCreateApi, kwCollaborationApi,
  kwCollaborationCreateApi, kwCollaborationUpdateStatusApi,
} from "@/lib/api";

/* ─── Tree ──────────────────────────────────────────────────────────── */
type TreeNode = { id: string; label: string; icon: string; children?: TreeNode[] };
const TREE: TreeNode[] = [
  { id: "overview", label: "Overview", icon: "🏠" },
  {
    id: "course-management", label: "Course Management", icon: "📚",
    children: [
      { id: "courses-all", label: "All Courses", icon: "📋" },
      { id: "courses-published", label: "Published", icon: "✅" },
      { id: "courses-draft", label: "Drafts", icon: "📝" },
      { id: "courses-archived", label: "Archived", icon: "🗄️" },
    ],
  },
  {
    id: "curriculum", label: "Curriculum Structure", icon: "🗂️",
    children: [
      { id: "curriculum-modules", label: "Modules", icon: "📦" },
      { id: "curriculum-lessons", label: "Lessons", icon: "📖" },
    ],
  },
  {
    id: "content-library", label: "Content Library", icon: "🎬",
    children: [
      { id: "content-all", label: "All Content", icon: "🗂️" },
      { id: "content-video", label: "Videos", icon: "▶️" },
      { id: "content-document", label: "Documents", icon: "📄" },
      { id: "content-image", label: "Images", icon: "🖼️" },
    ],
  },
  { id: "assessments", label: "Assessments", icon: "📊" },
  { id: "certificates", label: "Certificates", icon: "🏆" },
  {
    id: "knowledge-base", label: "Knowledge Base", icon: "💡",
    children: [
      { id: "kb-all", label: "All Articles", icon: "📰" },
      { id: "kb-create", label: "New Article", icon: "✏️" },
    ],
  },
  { id: "collaboration", label: "Collaboration", icon: "🤝" },
  { id: "analytics", label: "Content Analytics", icon: "📈" },
  { id: "localization", label: "Localization", icon: "🌍" },
  { id: "ai-tools", label: "AI Tools", icon: "🤖" },
  { id: "import-export", label: "Import / Export", icon: "⬆️" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

/* ─── Theme ──────────────────────────────────────────────────────────── */
const T = {
  bg: "#f0f4ff", sidebar: "#1e1b4b", sidebarText: "#c7d2fe",
  sidebarActiveBg: "rgba(99,102,241,0.15)", sidebarHover: "rgba(255,255,255,0.05)",
  card: "#ffffff", border: "#e2e8f0", text: "#0f172a", muted: "#64748b",
  accent: "#6366f1", accent2: "#4f46e5", success: "#059669",
  warning: "#d97706", error: "#dc2626", info: "#0891b2",
};

/* ─── Primitives ──────────────────────────────────────────────────────── */
function fmt(dt: string | undefined | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return String(dt); }
}

function Badge({ s }: { s?: string }) {
  const v = (s ?? "").toLowerCase();
  const map: Record<string, [string, string]> = {
    published: ["#d1fae5", "#065f46"], draft: ["#fef3c7", "#92400e"],
    archived: ["#f1f5f9", "#475569"], active: ["#dbeafe", "#1d4ed8"],
    completed: ["#d1fae5", "#065f46"], inactive: ["#fee2e2", "#991b1b"],
    resolved: ["#d1fae5", "#065f46"], open: ["#dbeafe", "#1d4ed8"],
    pending: ["#fef3c7", "#92400e"], video: ["#fce7f3", "#9d174d"],
    pdf: ["#dbeafe", "#1d4ed8"], audio: ["#ede9fe", "#5b21b6"],
    image: ["#d1fae5", "#065f46"], scorm: ["#fef3c7", "#92400e"],
    faq: ["#dbeafe", "#1d4ed8"], article: ["#ede9fe", "#5b21b6"],
    policy: ["#fee2e2", "#991b1b"], guideline: ["#d1fae5", "#065f46"],
    guide: ["#fef3c7", "#92400e"], note: ["#fce7f3", "#9d174d"],
    review: ["#dbeafe", "#1d4ed8"], comment: ["#ede9fe", "#5b21b6"],
    approval: ["#fef3c7", "#92400e"],
  };
  const [bg, color] = map[v] ?? ["#f1f5f9", "#475569"];
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 9999, textTransform: "capitalize", whiteSpace: "nowrap" }}>{s || "—"}</span>;
}

function KpiCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 12px rgba(99,102,241,0.06)" }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 500, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>{title}</h2>
      {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: T.muted }}>{subtitle}</p>}
    </div>
  );
}

function Card({ children, style, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return <div onClick={onClick} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 22, boxShadow: "0 2px 12px rgba(99,102,241,0.06)", ...style }}>{children}</div>;
}

function Tbl({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${T.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ background: "#f8fafc" }}>
          {headers.map((h) => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>)}
        </tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Tr({ i, children }: { i: number; children: React.ReactNode }) {
  return <tr style={{ background: i % 2 === 0 ? "#fff" : "#fafafe", borderBottom: `1px solid ${T.border}` }}>{children}</tr>;
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "10px 14px", color: T.text, verticalAlign: "middle", ...style }}>{children}</td>;
}

function Input({ value, onChange, placeholder, style }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    style={{ padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box", ...style }} />;
}

function Sel({ value, onChange, options, style }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; style?: React.CSSProperties }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "#fff", outline: "none", ...style }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost"; disabled?: boolean; style?: React.CSSProperties }) {
  const bg = variant === "primary" ? `linear-gradient(135deg,${T.accent},${T.accent2})` : variant === "danger" ? "#fee2e2" : variant === "ghost" ? "transparent" : "#f1f5f9";
  const color = variant === "primary" ? "#fff" : variant === "danger" ? T.error : T.text;
  const border = variant === "ghost" ? `1px solid ${T.border}` : "none";
  return <button onClick={onClick} disabled={disabled}
    style={{ background: bg, color, border, borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap", ...style }}>{children}</button>;
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onChange(!value)}>
      <div style={{ width: 38, height: 22, borderRadius: 11, background: value ? T.accent : "#cbd5e1", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: 3, left: value ? 18 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
      </div>
      <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ─── Charts ─────────────────────────────────────────────────────────── */
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  if (!data || data.length === 0) return <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>No data</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 110, paddingTop: 8 }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{d.value}</div>
          <div style={{ width: "100%", background: `${color}20`, borderRadius: "4px 4px 0 0", position: "relative", height: 76 }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: color, borderRadius: "4px 4px 0 0", height: `${(d.value / max) * 100}%`, transition: "height 0.4s ease" }} />
          </div>
          <div style={{ fontSize: 9, color: T.muted, textAlign: "center", maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const safeData = (data ?? []).filter((d) => d.value > 0);
  const total = safeData.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const r = 40, cx = 50, cy = 50, circum = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={100} height={100} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        {safeData.length > 0 ? safeData.map((d) => {
          const frac = d.value / total;
          const dashArr = `${frac * circum} ${circum}`;
          const dashOffset = -(offset * circum);
          offset += frac;
          return <circle key={d.label} cx={cx} cy={cy} r={r} fill="none" stroke={d.color} strokeWidth={16}
            strokeDasharray={dashArr} strokeDashoffset={dashOffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />;
        }) : <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={16} />}
        <circle cx={cx} cy={cy} r={28} fill="white" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill={T.text}>{total === 1 && safeData.length === 0 ? 0 : total}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {(data ?? []).map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.muted }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text, marginLeft: "auto", paddingLeft: 8 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Tree Sidebar ──────────────────────────────────────────────────── */
function TreeItem({ node, depth, selected, onSelect }: { node: TreeNode; depth: number; selected: string; onSelect: (id: string) => void }) {
  const hasChildren = !!(node.children?.length);
  const isParentOfSelected = hasChildren && node.children!.some((c) => c.id === selected || node.children!.some((cc) => cc.children?.some((ccc) => ccc.id === selected)));
  const [open, setOpen] = useState(isParentOfSelected);
  const isSelected = selected === node.id;

  useEffect(() => { if (isParentOfSelected) setOpen(true); }, [isParentOfSelected]);

  return (
    <div>
      <button onClick={() => { if (hasChildren) setOpen((o) => !o); onSelect(node.id); }}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: `7px ${8 + depth * 14}px`, background: isSelected ? T.sidebarActiveBg : "transparent", color: isSelected ? "#a5b4fc" : T.sidebarText, border: "none", cursor: "pointer", borderRadius: 8, fontSize: 13, fontWeight: isSelected ? 700 : 500, transition: "background 0.15s" }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = T.sidebarHover; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: 14 }}>{node.icon}</span>
        <span style={{ flex: 1 }}>{node.label}</span>
        {hasChildren && <span style={{ fontSize: 9, opacity: 0.6, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▶</span>}
      </button>
      {hasChildren && open && <div>{node.children!.map((child) => <TreeItem key={child.id} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />)}</div>}
    </div>
  );
}

/* ─── Form Row ──────────────────────────────────────────────────────── */
function FormRow({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ gridColumn: full ? "1/-1" : undefined }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function KnowledgeWorkspace() {
  const [selected, setSelected] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseStatus, setCourseStatus] = useState("");
  const [contentType, setContentType] = useState("");
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Raw API response shapes (matching actual backend)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ov, setOv] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [an, setAn] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesTotal, setCoursesTotal] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [modules, setModules] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lessons, setLessons] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [quizzes, setQuizzes] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assignments, setAssignments] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [content, setContent] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [articles, setArticles] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [certificates, setCertificates] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [collaboration, setCollaboration] = useState<any[]>([]);

  // Forms
  const [showContentForm, setShowContentForm] = useState(false);
  const [newContent, setNewContent] = useState({ title: "", type: "video", format: "", tags: "", uploaded_by: "", course: "" });
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [newArticle, setNewArticle] = useState({ type: "article", title: "", content: "", tags: "", author: "" });
  const [showCertForm, setShowCertForm] = useState(false);
  const [newCert, setNewCert] = useState({ type: "issued", name: "", course: "", issued_to: "", email: "", score: "" });
  const [showCollabForm, setShowCollabForm] = useState(false);
  const [newCollab, setNewCollab] = useState({ type: "note", author: "", course: "", content: "", priority: "medium" });

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    workspace_name: "Knowledge Workspace", default_language: "en", content_approval: true,
    auto_publish: false, max_file_size_mb: "500", allowed_types: "video,pdf,pptx,docx,mp3,png,jpg",
    enable_comments: true, enable_ratings: true, enable_ai: true,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Localization state
  const [locales] = useState([
    { code: "en", name: "English", flag: "🇺🇸", status: "primary", progress: 100 },
    { code: "hi", name: "Hindi", flag: "🇮🇳", status: "active", progress: 72 },
    { code: "es", name: "Spanish", flag: "🇪🇸", status: "active", progress: 58 },
    { code: "fr", name: "French", flag: "🇫🇷", status: "active", progress: 45 },
    { code: "de", name: "German", flag: "🇩🇪", status: "draft", progress: 20 },
    { code: "ar", name: "Arabic", flag: "🇸🇦", status: "draft", progress: 10 },
  ]);
  const [activeLocale, setActiveLocale] = useState("en");

  // AI Tools state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTool, setAiTool] = useState("summarize");

  // Import/Export state
  const [importFormat, setImportFormat] = useState("csv");
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportScope, setExportScope] = useState("courses");
  const [importMsg, setImportMsg] = useState("");

  const showMsg = useCallback((text: string, type: "success" | "error" = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await kwSeedApi().catch(() => null);
      const [ovRes, anRes, csRes, msRes, lsRes, asRes, ctRes, arRes, ceRes, coRes] = await Promise.all([
        kwOverviewApi().catch(() => null),
        kwAnalyticsApi().catch(() => null),
        kwCoursesApi({ status: courseStatus, search }).catch(() => ({ courses: [], total: 0, page: 1, pages: 1 })),
        kwModulesApi().catch(() => ({ modules: [], total: 0 })),
        kwLessonsApi().catch(() => ({ lessons: [], total: 0 })),
        kwAssessmentsApi().catch(() => ({ quizzes: [], assignments: [], total_quizzes: 0, total_assignments: 0 })),
        kwContentListApi({ type: contentType }).catch(() => ({ items: [], total: 0 })),
        kwArticlesApi().catch(() => ({ articles: [], total: 0 })),
        kwCertificatesApi().catch(() => ({ certificates: [], total: 0 })),
        kwCollaborationApi().catch(() => ({ items: [], total: 0 })),
      ]);
      setOv(ovRes);
      setAn(anRes);
      setCourses((csRes as { courses: any[] })?.courses ?? []);
      setCoursesTotal((csRes as { total: number })?.total ?? 0);
      setModules((msRes as { modules: any[] })?.modules ?? []);
      setLessons((lsRes as { lessons: any[] })?.lessons ?? []);
      setQuizzes((asRes as { quizzes: any[] })?.quizzes ?? []);
      setAssignments((asRes as { assignments: any[] })?.assignments ?? []);
      setContent((ctRes as { items: any[] })?.items ?? []);
      setArticles((arRes as { articles: any[] })?.articles ?? []);
      setCertificates((ceRes as { certificates: any[] })?.certificates ?? []);
      setCollaboration((coRes as { items: any[] })?.items ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [courseStatus, contentType, search]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const map: Record<string, string> = { "content-video": "video", "content-document": "pdf", "content-image": "image", "content-all": "" };
    if (selected in map) setContentType(map[selected]);
  }, [selected]);

  /* ─── Handlers ─── */
  async function handleDeleteContent(id: string) {
    try { await kwContentDeleteApi(id); showMsg("Deleted."); void load(); }
    catch (e) { showMsg(e instanceof Error ? e.message : "Failed", "error"); }
  }

  async function handleCreateContent() {
    if (!newContent.title) { showMsg("Title is required", "error"); return; }
    try {
      await kwContentCreateApi({ ...newContent, tags: newContent.tags.split(",").map((t) => t.trim()).filter(Boolean) } as any);
      showMsg("Content item added."); setShowContentForm(false);
      setNewContent({ title: "", type: "video", format: "", tags: "", uploaded_by: "", course: "" });
      void load();
    } catch (e) { showMsg(e instanceof Error ? e.message : "Failed", "error"); }
  }

  async function handleCreateArticle() {
    if (!newArticle.title) { showMsg("Title is required", "error"); return; }
    try {
      await kwArticleCreateApi({ ...newArticle, tags: newArticle.tags.split(",").map((t) => t.trim()).filter(Boolean) } as any);
      showMsg("Article published."); setShowArticleForm(false);
      setNewArticle({ type: "article", title: "", content: "", tags: "", author: "" });
      void load();
    } catch (e) { showMsg(e instanceof Error ? e.message : "Failed", "error"); }
  }

  async function handleDeleteArticle(id: string) {
    try { await kwArticleDeleteApi(id); showMsg("Deleted."); void load(); }
    catch (e) { showMsg(e instanceof Error ? e.message : "Failed", "error"); }
  }

  async function handleCreateCert() {
    if (!newCert.name) { showMsg("Certificate name is required", "error"); return; }
    try {
      await kwCertificateCreateApi({ ...newCert, score: newCert.score ? Number(newCert.score) : 0 } as any);
      showMsg("Certificate issued."); setShowCertForm(false);
      setNewCert({ type: "issued", name: "", course: "", issued_to: "", email: "", score: "" });
      void load();
    } catch (e) { showMsg(e instanceof Error ? e.message : "Failed", "error"); }
  }

  async function handleCreateCollab() {
    if (!newCollab.content) { showMsg("Content is required", "error"); return; }
    try {
      await kwCollaborationCreateApi(newCollab as any);
      showMsg("Item created."); setShowCollabForm(false);
      setNewCollab({ type: "note", author: "", course: "", content: "", priority: "medium" });
      void load();
    } catch (e) { showMsg(e instanceof Error ? e.message : "Failed", "error"); }
  }

  async function handleCollabStatus(collabId: string, status: string) {
    try { await kwCollaborationUpdateStatusApi(collabId, status); void load(); }
    catch { /* silent */ }
  }

  function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiOutput("");
    // Simulated AI output (UI demo — replace with real API call)
    const outputs: Record<string, string> = {
      summarize: `**Summary:**\n${aiPrompt.slice(0, 120)}...\n\nKey Points:\n• Main concept clearly identified\n• Supporting evidence provided\n• Actionable takeaways highlighted\n• Suitable for all learner levels`,
      quiz: `**Generated Quiz Questions:**\n\n1. What is the primary objective described in this content?\n   a) Understanding fundamentals  b) Advanced application  c) Assessment preparation  d) None of the above\n   *Answer: a)*\n\n2. Which concept is most emphasized?\n   a) Theory  b) Practice  c) Both equally  d) Neither\n   *Answer: c)*\n\n3. What is the recommended learning approach?\n   *Answer: [Open-ended — based on learner context]*`,
      outline: `**Course Outline:**\n\n📚 Module 1: Introduction\n  • 1.1 Overview & Objectives\n  • 1.2 Key Concepts\n  • 1.3 Prerequisites\n\n📚 Module 2: Core Content\n  • 2.1 Theoretical Framework\n  • 2.2 Practical Application\n  • 2.3 Case Studies\n\n📚 Module 3: Assessment\n  • 3.1 Knowledge Check\n  • 3.2 Practical Exercise\n  • 3.3 Certification Criteria`,
      tags: `**Suggested Tags:**\n\n🏷️ Content Tags: learning, education, training, professional-development\n🏷️ Skill Tags: analytical-thinking, problem-solving, communication\n🏷️ Level Tags: beginner-friendly, intermediate, expert-track\n🏷️ Topic Tags: based on "${aiPrompt.slice(0, 40)}"`,
    };
    setTimeout(() => {
      setAiOutput(outputs[aiTool] ?? "AI output generated successfully.");
      setAiLoading(false);
    }, 1200);
  }

  /* ─── Render panels ─── */
  function renderContent() {
    if (loading) return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
        <div style={{ fontSize: 28 }}>⏳</div>
        <span style={{ fontSize: 16, color: T.muted }}>Loading workspace data…</span>
      </div>
    );

    /* ── OVERVIEW ── */
    if (selected === "overview") {
      const courses_stat = ov?.courses ?? {};
      const curriculum_stat = ov?.curriculum ?? {};
      const kpis = [
        { label: "Total Courses", value: courses_stat.total ?? 0, icon: "📚", color: T.accent },
        { label: "Published", value: courses_stat.published ?? 0, icon: "✅", color: T.success },
        { label: "Draft", value: courses_stat.draft ?? 0, icon: "📝", color: T.warning },
        { label: "Archived", value: courses_stat.archived ?? 0, icon: "🗄️", color: T.muted },
        { label: "Total Modules", value: curriculum_stat.modules ?? 0, icon: "📦", color: "#7c3aed" },
        { label: "Total Lessons", value: curriculum_stat.lessons ?? 0, icon: "📖", color: T.info },
        { label: "Content Items", value: ov?.content_library ?? 0, icon: "🎬", color: "#ec4899" },
        { label: "KB Articles", value: ov?.knowledge_base ?? 0, icon: "💡", color: T.success },
        { label: "Certificates", value: ov?.certificates_issued ?? 0, icon: "🏆", color: "#d97706" },
        { label: "Open Reviews", value: ov?.open_reviews ?? 0, icon: "🔍", color: T.error },
      ];
      const byCategory: Record<string, number> = {};
      if (ov?.by_category) {
        for (const [cat, v] of Object.entries(ov.by_category as Record<string, number>)) byCategory[cat] = v;
      }
      const byLevel: Record<string, number> = {};
      if (ov?.by_level) {
        for (const [lvl, v] of Object.entries(ov.by_level as Record<string, number>)) byLevel[lvl] = v;
      }
      return (
        <>
          <SectionHeader title="Knowledge Workspace Overview" subtitle="All learning content at a glance" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: 12, marginBottom: 24 }}>
            {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Courses by Status</div>
              <DonutChart data={[
                { label: "Published", value: courses_stat.published ?? 0, color: T.success },
                { label: "Draft", value: courses_stat.draft ?? 0, color: T.warning },
                { label: "Archived", value: courses_stat.archived ?? 0, color: "#94a3b8" },
              ]} />
            </Card>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Courses by Category</div>
              <BarChart data={Object.entries(byCategory).slice(0, 8).map(([label, value]) => ({ label, value }))} color={T.accent} />
            </Card>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Courses by Level</div>
              <BarChart data={Object.entries(byLevel).map(([label, value]) => ({ label, value }))} color="#7c3aed" />
            </Card>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Recent Course Updates</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(ov?.recent_updates ?? []).slice(0, 5).map((r: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{r.title}</span>
                    <Badge s={r.status} />
                  </div>
                ))}
                {(ov?.recent_updates ?? []).length === 0 && <div style={{ fontSize: 13, color: T.muted }}>No recent updates.</div>}
              </div>
            </Card>
          </div>
        </>
      );
    }

    /* ── COURSES ── */
    if (["courses-all", "courses-published", "courses-draft", "courses-archived", "course-management"].includes(selected)) {
      const statusMap: Record<string, string> = { "courses-published": "Published", "courses-draft": "Draft", "courses-archived": "Archived" };
      const filterStatus = statusMap[selected] ?? courseStatus;
      const display = filterStatus ? courses.filter((c) => (c.status ?? "").toLowerCase() === filterStatus.toLowerCase()) : courses;
      return (
        <>
          <SectionHeader title="Course Management" subtitle={`${display.length} of ${coursesTotal} courses`} />
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <Input value={search} onChange={setSearch} placeholder="Search courses…" style={{ maxWidth: 280 }} />
            <Sel value={courseStatus} onChange={setCourseStatus} options={[{ value: "", label: "All Statuses" }, { value: "Published", label: "Published" }, { value: "Draft", label: "Draft" }, { value: "Archived", label: "Archived" }]} />
          </div>
          <Card style={{ padding: 0 }}>
            <Tbl headers={["Title", "Category", "Level", "Status", "Modules", "Enrollments", "Rating", "Updated"]}>
              {display.map((c, i) => (
                <Tr key={c._id ?? i} i={i}>
                  <Td><span style={{ fontWeight: 600, color: T.accent }}>{c.title}</span></Td>
                  <Td style={{ color: T.muted, fontSize: 12 }}>{c.category || "—"}</Td>
                  <Td style={{ fontSize: 12 }}>{c.level || "—"}</Td>
                  <Td><Badge s={c.status} /></Td>
                  <Td>{(c.modules ?? []).length}</Td>
                  <Td>{c.enrolledUsers ?? 0}</Td>
                  <Td>{"⭐".repeat(Math.round(c.rating ?? 0)).slice(0, 5) || "—"}</Td>
                  <Td style={{ color: T.muted, fontSize: 12 }}>{fmt(c.updatedAt)}</Td>
                </Tr>
              ))}
              {display.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: T.muted }}>No courses found.</td></tr>}
            </Tbl>
          </Card>
        </>
      );
    }

    /* ── MODULES ── */
    if (selected === "curriculum-modules" || selected === "curriculum") {
      return (
        <>
          <SectionHeader title="Curriculum — Modules" subtitle={`${modules.length} modules`} />
          <Card style={{ padding: 0 }}>
            <Tbl headers={["Module Title", "Course", "Category", "Order", "Lessons", "Duration"]}>
              {modules.map((m, i) => (
                <Tr key={i} i={i}>
                  <Td><span style={{ fontWeight: 600 }}>{m.module_title || m.title || "—"}</span></Td>
                  <Td style={{ color: T.muted, fontSize: 12 }}>{m.course_title || "—"}</Td>
                  <Td style={{ fontSize: 12 }}>{m.category || "—"}</Td>
                  <Td>#{m.order ?? i + 1}</Td>
                  <Td>{m.lessons_count ?? 0}</Td>
                  <Td style={{ fontSize: 12, color: T.muted }}>{m.duration || "—"}</Td>
                </Tr>
              ))}
              {modules.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: T.muted }}>No modules found.</td></tr>}
            </Tbl>
          </Card>
        </>
      );
    }

    /* ── LESSONS ── */
    if (selected === "curriculum-lessons") {
      return (
        <>
          <SectionHeader title="Curriculum — Lessons" subtitle={`${lessons.length} lessons`} />
          <Card style={{ padding: 0 }}>
            <Tbl headers={["Lesson", "Module", "Course", "Category", "Module #", "Lesson #"]}>
              {lessons.map((l, i) => (
                <Tr key={i} i={i}>
                  <Td><span style={{ fontWeight: 600 }}>{l.lesson_title || l.title || "—"}</span></Td>
                  <Td style={{ color: T.muted, fontSize: 12 }}>{l.module_title || "—"}</Td>
                  <Td style={{ color: T.muted, fontSize: 12 }}>{l.course_title || "—"}</Td>
                  <Td style={{ fontSize: 12 }}>{l.category || "—"}</Td>
                  <Td>#{(l.module_index ?? 0) + 1}</Td>
                  <Td>#{(l.lesson_index ?? 0) + 1}</Td>
                </Tr>
              ))}
              {lessons.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: T.muted }}>No lessons found.</td></tr>}
            </Tbl>
          </Card>
        </>
      );
    }

    /* ── CONTENT LIBRARY ── */
    if (["content-library", "content-all", "content-video", "content-document", "content-image"].includes(selected)) {
      const typeLabel = selected === "content-video" ? "Videos" : selected === "content-document" ? "Documents" : selected === "content-image" ? "Images" : "All Content";
      return (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <SectionHeader title={`Content Library — ${typeLabel}`} subtitle={`${content.length} items`} />
            <Btn onClick={() => setShowContentForm(!showContentForm)}>+ Add Content</Btn>
          </div>
          {showContentForm && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>New Content Item</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormRow label="Title *"><Input value={newContent.title} onChange={(v) => setNewContent({ ...newContent, title: v })} placeholder="Content title" /></FormRow>
                <FormRow label="Type">
                  <Sel value={newContent.type} onChange={(v) => setNewContent({ ...newContent, type: v })} options={["video", "pdf", "presentation", "audio", "image", "resource"].map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
                </FormRow>
                <FormRow label="Format (e.g. MP4, PDF)"><Input value={newContent.format} onChange={(v) => setNewContent({ ...newContent, format: v })} placeholder="MP4" /></FormRow>
                <FormRow label="Uploaded By"><Input value={newContent.uploaded_by} onChange={(v) => setNewContent({ ...newContent, uploaded_by: v })} placeholder="Your name" /></FormRow>
                <FormRow label="Course"><Input value={newContent.course} onChange={(v) => setNewContent({ ...newContent, course: v })} placeholder="Related course title" /></FormRow>
                <FormRow label="Tags (comma-separated)"><Input value={newContent.tags} onChange={(v) => setNewContent({ ...newContent, tags: v })} placeholder="tag1, tag2" /></FormRow>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn onClick={() => void handleCreateContent()}>Save Content</Btn>
                <Btn variant="secondary" onClick={() => setShowContentForm(false)}>Cancel</Btn>
              </div>
            </Card>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
            {content.map((item) => (
              <div key={item.item_id ?? item._id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, boxShadow: "0 2px 8px rgba(99,102,241,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                  <Badge s={item.type} />
                  <button onClick={() => void handleDeleteContent(item.item_id ?? item._id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: T.error, padding: 2 }}>✕</button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{item.course || "—"}</div>
                <div style={{ display: "flex", gap: 8, fontSize: 11, color: T.muted, marginBottom: 8 }}>
                  <span>📄 {item.format || "—"}</span>
                  <span>💾 {item.size || "—"}</span>
                  <span>👁 {item.views ?? 0}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(item.tags ?? []).map((tag: string) => <span key={tag} style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 10, padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>{tag}</span>)}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>By {item.uploaded_by || "—"} · {fmt(item.created_at)}</div>
              </div>
            ))}
            {content.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 48, color: T.muted }}>No content items found. Add one above.</div>}
          </div>
        </>
      );
    }

    /* ── ASSESSMENTS ── */
    if (selected === "assessments") {
      return (
        <>
          <SectionHeader title="Assessments" subtitle={`${quizzes.length} quizzes · ${assignments.length} assignments`} />
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📝</span> Quizzes ({quizzes.length})
            </div>
            <Card style={{ padding: 0 }}>
              <Tbl headers={["Quiz Title", "Course", "Category", "Questions", "Pass Score", "Time Limit"]}>
                {quizzes.map((q, i) => (
                  <Tr key={i} i={i}>
                    <Td><span style={{ fontWeight: 600 }}>{q.quiz_title || q.title || "—"}</span></Td>
                    <Td style={{ color: T.muted, fontSize: 12 }}>{q.course_title || "—"}</Td>
                    <Td style={{ fontSize: 12 }}>{q.category || "—"}</Td>
                    <Td>{q.questions ?? "—"}</Td>
                    <Td>{q.passing_score ?? "—"}%</Td>
                    <Td style={{ fontSize: 12 }}>{q.time_limit ?? "—"} min</Td>
                  </Tr>
                ))}
                {quizzes.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: T.muted }}>No quizzes found.</td></tr>}
              </Tbl>
            </Card>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📋</span> Assignments ({assignments.length})
            </div>
            <Card style={{ padding: 0 }}>
              <Tbl headers={["Assignment Title", "Course", "Category", "Max Score", "Status", "Due Date"]}>
                {assignments.map((a, i) => (
                  <Tr key={i} i={i}>
                    <Td><span style={{ fontWeight: 600 }}>{a.assignment_title || a.title || "—"}</span></Td>
                    <Td style={{ color: T.muted, fontSize: 12 }}>{a.course_title || "—"}</Td>
                    <Td style={{ fontSize: 12 }}>{a.category || "—"}</Td>
                    <Td>{a.max_score ?? "—"}</Td>
                    <Td><Badge s={a.status} /></Td>
                    <Td style={{ fontSize: 12, color: T.muted }}>{fmt(a.due_date)}</Td>
                  </Tr>
                ))}
                {assignments.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: T.muted }}>No assignments found.</td></tr>}
              </Tbl>
            </Card>
          </div>
        </>
      );
    }

    /* ── CERTIFICATES ── */
    if (selected === "certificates") {
      return (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <SectionHeader title="Certificates" subtitle={`${certificates.length} total`} />
            <Btn onClick={() => setShowCertForm(!showCertForm)}>+ Issue Certificate</Btn>
          </div>
          {showCertForm && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>Issue New Certificate</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormRow label="Certificate Name *"><Input value={newCert.name} onChange={(v) => setNewCert({ ...newCert, name: v })} placeholder="e.g. Course Completion" /></FormRow>
                <FormRow label="Issued To"><Input value={newCert.issued_to} onChange={(v) => setNewCert({ ...newCert, issued_to: v })} placeholder="Recipient full name" /></FormRow>
                <FormRow label="Email"><Input value={newCert.email} onChange={(v) => setNewCert({ ...newCert, email: v })} placeholder="recipient@email.com" /></FormRow>
                <FormRow label="Score (%)"><Input value={newCert.score} onChange={(v) => setNewCert({ ...newCert, score: v })} placeholder="e.g. 90" /></FormRow>
                <FormRow label="Course" full><Input value={newCert.course} onChange={(v) => setNewCert({ ...newCert, course: v })} placeholder="Related course title" /></FormRow>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn onClick={() => void handleCreateCert()}>Issue Certificate</Btn>
                <Btn variant="secondary" onClick={() => setShowCertForm(false)}>Cancel</Btn>
              </div>
            </Card>
          )}
          <Card style={{ padding: 0 }}>
            <Tbl headers={["Name", "Type", "Course", "Issued To", "Score", "Date", "Status"]}>
              {certificates.map((c, i) => (
                <Tr key={c.cert_id ?? c._id ?? i} i={i}>
                  <Td><span style={{ fontWeight: 600 }}>{c.name || c.title || "—"}</span></Td>
                  <Td><Badge s={c.type} /></Td>
                  <Td style={{ color: T.muted, fontSize: 12 }}>{c.course || "—"}</Td>
                  <Td>{c.issued_to || "—"}</Td>
                  <Td>{c.score != null ? `${c.score}%` : "—"}</Td>
                  <Td style={{ fontSize: 12 }}>{fmt(c.issued_at ?? c.created_at)}</Td>
                  <Td><Badge s={c.issued_to ? "issued" : "template"} /></Td>
                </Tr>
              ))}
              {certificates.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: T.muted }}>No certificates yet.</td></tr>}
            </Tbl>
          </Card>
        </>
      );
    }

    /* ── KNOWLEDGE BASE ── */
    if (["knowledge-base", "kb-all", "kb-create"].includes(selected)) {
      return (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <SectionHeader title="Knowledge Base" subtitle={`${articles.length} articles`} />
            <Btn onClick={() => setShowArticleForm(!showArticleForm)}>+ New Article</Btn>
          </div>
          {showArticleForm && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>New Article</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormRow label="Title *"><Input value={newArticle.title} onChange={(v) => setNewArticle({ ...newArticle, title: v })} placeholder="Article title" /></FormRow>
                <FormRow label="Type">
                  <Sel value={newArticle.type} onChange={(v) => setNewArticle({ ...newArticle, type: v })} options={["faq", "article", "policy", "guideline", "guide"].map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
                </FormRow>
                <FormRow label="Author"><Input value={newArticle.author} onChange={(v) => setNewArticle({ ...newArticle, author: v })} placeholder="Your name" /></FormRow>
                <FormRow label="Tags (comma-separated)"><Input value={newArticle.tags} onChange={(v) => setNewArticle({ ...newArticle, tags: v })} placeholder="tag1, tag2" /></FormRow>
                <FormRow label="Content" full>
                  <textarea value={newArticle.content} onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })} placeholder="Write your article content here…" rows={5}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </FormRow>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn onClick={() => void handleCreateArticle()}>Publish Article</Btn>
                <Btn variant="secondary" onClick={() => setShowArticleForm(false)}>Cancel</Btn>
              </div>
            </Card>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {articles.map((a) => (
              <Card key={a.article_id ?? a._id} style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{a.title}</span>
                      <Badge s={a.type} />
                      <Badge s={a.status} />
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, lineHeight: 1.6 }}>
                      {(a.content ?? "").slice(0, 180)}{(a.content ?? "").length > 180 ? "…" : ""}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: T.muted, flexWrap: "wrap" }}>
                      <span>👤 {a.author || "—"}</span>
                      <span>👁 {a.views ?? 0} views</span>
                      <span>🗓 {fmt(a.created_at)}</span>
                    </div>
                    {(a.tags ?? []).length > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                        {(a.tags ?? []).map((tag: string) => <span key={tag} style={{ background: "#ede9fe", color: "#6d28d9", fontSize: 10, padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <button onClick={() => void handleDeleteArticle(a.article_id ?? a._id)}
                    style={{ background: "#fee2e2", color: T.error, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", marginLeft: 16, whiteSpace: "nowrap" }}>Delete</button>
                </div>
              </Card>
            ))}
            {articles.length === 0 && <div style={{ textAlign: "center", padding: 48, color: T.muted }}>No articles yet. Create your first one above.</div>}
          </div>
        </>
      );
    }

    /* ── COLLABORATION ── */
    if (selected === "collaboration") {
      return (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <SectionHeader title="Collaboration" subtitle={`${collaboration.length} items`} />
            <Btn onClick={() => setShowCollabForm(!showCollabForm)}>+ New Item</Btn>
          </div>
          {showCollabForm && (
            <Card style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: T.text }}>New Collaboration Item</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormRow label="Type">
                  <Sel value={newCollab.type} onChange={(v) => setNewCollab({ ...newCollab, type: v })} options={["note", "review", "comment", "approval"].map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
                </FormRow>
                <FormRow label="Priority">
                  <Sel value={newCollab.priority} onChange={(v) => setNewCollab({ ...newCollab, priority: v })} options={["high", "medium", "low"].map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))} />
                </FormRow>
                <FormRow label="Author"><Input value={newCollab.author} onChange={(v) => setNewCollab({ ...newCollab, author: v })} placeholder="Your name" /></FormRow>
                <FormRow label="Course"><Input value={newCollab.course} onChange={(v) => setNewCollab({ ...newCollab, course: v })} placeholder="Related course" /></FormRow>
                <FormRow label="Content *" full>
                  <textarea value={newCollab.content} onChange={(e) => setNewCollab({ ...newCollab, content: e.target.value })} placeholder="Describe the note, review, or comment…" rows={3}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </FormRow>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn onClick={() => void handleCreateCollab()}>Create Item</Btn>
                <Btn variant="secondary" onClick={() => setShowCollabForm(false)}>Cancel</Btn>
              </div>
            </Card>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {collaboration.map((item) => {
              const priorityColor: Record<string, string> = { high: T.error, medium: T.warning, low: T.success };
              return (
                <Card key={item.collab_id ?? item._id} style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <Badge s={item.type} />
                        <Badge s={item.status} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: priorityColor[item.priority] ?? T.muted, padding: "2px 8px", borderRadius: 9999, background: `${priorityColor[item.priority] ?? T.muted}18` }}>
                          {(item.priority ?? "medium").toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6, marginBottom: 8 }}>{item.content || "—"}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: T.muted, flexWrap: "wrap" }}>
                        <span>👤 {item.author || "—"}</span>
                        <span>📚 {item.course || "—"}</span>
                        <span>🗓 {fmt(item.created_at)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 16 }}>
                      {item.status !== "resolved" && <button onClick={() => void handleCollabStatus(item.collab_id ?? item._id, "resolved")}
                        style={{ background: "#d1fae5", color: "#065f46", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Resolve</button>}
                      {item.status === "open" && <button onClick={() => void handleCollabStatus(item.collab_id ?? item._id, "pending")}
                        style={{ background: "#fef3c7", color: "#92400e", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Pending</button>}
                    </div>
                  </div>
                </Card>
              );
            })}
            {collaboration.length === 0 && <div style={{ textAlign: "center", padding: 48, color: T.muted }}>No collaboration items yet.</div>}
          </div>
        </>
      );
    }

    /* ── CONTENT ANALYTICS ── */
    if (selected === "analytics") {
      const byCategory = an?.by_category ?? {};
      const coursesByStatus = an?.courses_by_status ?? {};
      const coursesByLevel = an?.courses_by_level ?? {};
      const contentByType = an?.content_by_type ?? {};
      const kbByType = an?.kb_by_type ?? {};
      const monthlyArr: { label: string; value: number }[] = (an?.monthly_courses ?? []).map((m: any) => ({ label: m.month, value: m.count }));
      const completionByLevel: { label: string; value: number }[] = Object.entries(an?.completion_by_level ?? {}).map(([label, value]) => ({ label, value: value as number }));
      const topEnrolled: any[] = an?.top_enrolled ?? [];
      return (
        <>
          <SectionHeader title="Content Analytics" subtitle="Learning content performance and distribution" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Course Status Breakdown</div>
              <DonutChart data={Object.entries(coursesByStatus).map(([label, value], i) => ({
                label: label.charAt(0).toUpperCase() + label.slice(1), value: value as number,
                color: [T.success, T.warning, "#94a3b8", T.info][i % 4],
              }))} />
            </Card>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Courses by Category</div>
              <BarChart data={Object.entries(byCategory).slice(0, 8).map(([label, v]: [string, any]) => ({ label, value: v?.count ?? 0 }))} color={T.accent} />
            </Card>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Courses by Level</div>
              <BarChart data={Object.entries(coursesByLevel).map(([label, value]) => ({ label, value: value as number }))} color="#7c3aed" />
            </Card>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Content by Type</div>
              <DonutChart data={Object.entries(contentByType).map(([label, value], i) => ({
                label: label.charAt(0).toUpperCase() + label.slice(1), value: value as number,
                color: ["#f59e0b", T.info, "#ec4899", "#7c3aed", T.success][i % 5],
              }))} />
            </Card>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Knowledge Base by Type</div>
              <DonutChart data={Object.entries(kbByType).map(([label, value], i) => ({
                label: label.charAt(0).toUpperCase() + label.slice(1), value: value as number,
                color: [T.info, "#7c3aed", T.error, T.success, T.warning][i % 5],
              }))} />
            </Card>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Completion Rate by Level (%)</div>
              <BarChart data={completionByLevel} color={T.success} />
            </Card>
            {monthlyArr.length > 0 && (
              <Card style={{ gridColumn: "1/-1" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Monthly Course Creation</div>
                <BarChart data={monthlyArr} color={T.accent} />
              </Card>
            )}
          </div>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>Top Enrolled Courses</div>
            <Tbl headers={["Course", "Category", "Enrolled", "Rating"]}>
              {topEnrolled.map((c, i) => (
                <Tr key={i} i={i}>
                  <Td><span style={{ fontWeight: 600 }}>{c.title}</span></Td>
                  <Td style={{ color: T.muted, fontSize: 12 }}>{c.category || "—"}</Td>
                  <Td>{c.enrolled}</Td>
                  <Td>{"⭐".repeat(Math.round(c.rating ?? 0)).slice(0, 5) || "—"}</Td>
                </Tr>
              ))}
              {topEnrolled.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", padding: 24, color: T.muted }}>No data.</td></tr>}
            </Tbl>
          </Card>
        </>
      );
    }

    /* ── LOCALIZATION ── */
    if (selected === "localization") {
      return (
        <>
          <SectionHeader title="Localization" subtitle="Manage multi-language content and translation workflows" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {locales.map((locale) => (
              <Card key={locale.code} style={{ padding: 18, cursor: "pointer", border: `2px solid ${activeLocale === locale.code ? T.accent : T.border}` }}
                onClick={() => setActiveLocale(locale.code)}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{locale.flag}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{locale.name}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>Code: {locale.code.toUpperCase()}</div>
                    </div>
                  </div>
                  <Badge s={locale.status} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3 }}>
                    <div style={{ width: `${locale.progress}%`, height: "100%", background: locale.progress === 100 ? T.success : locale.progress > 50 ? T.accent : T.warning, borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.muted, minWidth: 32 }}>{locale.progress}%</span>
                </div>
              </Card>
            ))}
          </div>
          <Card>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 16 }}>Translation Settings — {locales.find((l) => l.code === activeLocale)?.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <FormRow label="Fallback Language">
                <Sel value="en" onChange={() => {}} options={locales.map((l) => ({ value: l.code, label: `${l.flag} ${l.name}` }))} />
              </FormRow>
              <FormRow label="Auto-translate Missing Strings">
                <Toggle value={true} onChange={() => {}} label="Enabled" />
              </FormRow>
              <FormRow label="RTL Support">
                <Toggle value={activeLocale === "ar"} onChange={() => {}} label={activeLocale === "ar" ? "Enabled" : "Disabled"} />
              </FormRow>
              <FormRow label="Translation Memory">
                <Toggle value={true} onChange={() => {}} label="Enabled" />
              </FormRow>
            </div>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>Translation Progress by Section</div>
              {["Course Titles", "Lesson Content", "Assessment Questions", "Certificate Templates", "UI Labels"].map((section, i) => {
                const pct = [100, 72, 58, 45, 88][i];
                return (
                  <div key={section} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: T.muted, minWidth: 170 }}>{section}</span>
                    <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? T.success : T.accent, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.muted, minWidth: 32 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <Btn onClick={() => showMsg("Translation export started.")}>Export Strings</Btn>
              <Btn variant="secondary" onClick={() => showMsg("Import from CSV — select file.")}>Import Translations</Btn>
            </div>
          </Card>
        </>
      );
    }

    /* ── AI TOOLS ── */
    if (selected === "ai-tools") {
      const tools = [
        { id: "summarize", label: "Summarize Content", icon: "📝", desc: "Generate concise summaries from lesson text" },
        { id: "quiz", label: "Generate Quiz", icon: "❓", desc: "Auto-create quiz questions from any content" },
        { id: "outline", label: "Course Outline", icon: "🗂️", desc: "Build a full course outline from a topic prompt" },
        { id: "tags", label: "Smart Tagging", icon: "🏷️", desc: "Suggest relevant tags for content categorization" },
      ];
      return (
        <>
          <SectionHeader title="AI Tools" subtitle="AI-powered content generation and enrichment" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
            {tools.map((tool) => (
              <div key={tool.id} onClick={() => setAiTool(tool.id)} style={{ background: aiTool === tool.id ? `${T.accent}10` : T.card, border: `2px solid ${aiTool === tool.id ? T.accent : T.border}`, borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.15s" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{tool.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 }}>{tool.label}</div>
                <div style={{ fontSize: 12, color: T.muted }}>{tool.desc}</div>
              </div>
            ))}
          </div>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>
              {tools.find((t) => t.id === aiTool)?.icon} {tools.find((t) => t.id === aiTool)?.label}
            </div>
            <FormRow label="Input Prompt / Content">
              <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={aiTool === "summarize" ? "Paste lesson text to summarize…" : aiTool === "quiz" ? "Paste content to generate quiz questions…" : aiTool === "outline" ? "Enter course topic (e.g. 'Advanced Sales Techniques')…" : "Paste content to generate tags…"}
                rows={5} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box", marginTop: 4 }} />
            </FormRow>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Btn onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()}>
                {aiLoading ? "⏳ Generating…" : "✨ Generate"}
              </Btn>
              <Btn variant="secondary" onClick={() => { setAiPrompt(""); setAiOutput(""); }}>Clear</Btn>
            </div>
          </Card>
          {aiOutput && (
            <Card style={{ background: "#f8faff", border: `1px solid ${T.accent}30` }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.accent, marginBottom: 10 }}>✨ AI Output</div>
              <pre style={{ fontSize: 13, color: T.text, whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0, fontFamily: "inherit" }}>{aiOutput}</pre>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn onClick={() => { navigator.clipboard.writeText(aiOutput); showMsg("Copied to clipboard!"); }}>📋 Copy</Btn>
                <Btn variant="secondary" onClick={() => setAiOutput("")}>Dismiss</Btn>
              </div>
            </Card>
          )}
          <Card style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 12 }}>AI Feature Settings</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Toggle value={true} onChange={() => {}} label="Auto-tag new content on upload" />
              <Toggle value={true} onChange={() => {}} label="Generate quiz on lesson completion" />
              <Toggle value={false} onChange={() => {}} label="Auto-translate content (Beta)" />
              <Toggle value={true} onChange={() => {}} label="AI copilot for learners" />
              <Toggle value={false} onChange={() => {}} label="Sentiment analysis on feedback" />
              <Toggle value={true} onChange={() => {}} label="Smart content recommendations" />
            </div>
          </Card>
        </>
      );
    }

    /* ── IMPORT / EXPORT ── */
    if (selected === "import-export") {
      return (
        <>
          <SectionHeader title="Import / Export" subtitle="Bulk import courses and export content packages" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Import */}
            <Card>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 4 }}>⬆️ Import Content</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>Import courses, modules, and content from external sources.</div>
              <FormRow label="Import Format">
                <Sel value={importFormat} onChange={setImportFormat} options={[
                  { value: "csv", label: "CSV — Course List" },
                  { value: "scorm", label: "SCORM 1.2 / 2004 Package" },
                  { value: "json", label: "JSON — Custom Format" },
                  { value: "xls", label: "Excel (.xlsx)" },
                ]} />
              </FormRow>
              <div style={{ marginTop: 12 }}>
                <div style={{ border: `2px dashed ${T.border}`, borderRadius: 10, padding: "28px 20px", textAlign: "center", background: "#f8fafc", cursor: "pointer" }}
                  onClick={() => { setImportMsg("📎 File selected. Click Import to begin processing."); }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                  <div style={{ fontSize: 13, color: T.muted }}>Click to select file or drag & drop</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Supports: {importFormat === "csv" ? ".csv" : importFormat === "scorm" ? ".zip (SCORM)" : importFormat === "json" ? ".json" : ".xlsx"}</div>
                </div>
              </div>
              {importMsg && <div style={{ marginTop: 10, fontSize: 13, color: T.info, padding: "8px 12px", background: "#dbeafe", borderRadius: 8 }}>{importMsg}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn onClick={() => { showMsg("Import started. You will be notified when complete."); setImportMsg(""); }}>Start Import</Btn>
                <Btn variant="secondary" onClick={() => setImportMsg("")}>Clear</Btn>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8 }}>IMPORT HISTORY</div>
                {[
                  { file: "courses_batch_april.csv", date: "Apr 25, 2026", status: "success", records: 12 },
                  { file: "sales_track_v2.zip", date: "Apr 18, 2026", status: "success", records: 4 },
                  { file: "compliance_2025.xlsx", date: "Apr 10, 2026", status: "error", records: 0 },
                ].map((h, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                    <span style={{ color: T.text }}>{h.file}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ color: T.muted }}>{h.date}</span>
                      <Badge s={h.status} />
                      {h.records > 0 && <span style={{ color: T.muted }}>{h.records} records</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Export */}
            <Card>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 4 }}>⬇️ Export Content</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>Export your content library and course data.</div>
              <FormRow label="Export Scope">
                <Sel value={exportScope} onChange={setExportScope} options={[
                  { value: "courses", label: "All Courses" },
                  { value: "modules", label: "Modules & Lessons" },
                  { value: "content", label: "Content Library" },
                  { value: "kb", label: "Knowledge Base Articles" },
                  { value: "certs", label: "Certificates" },
                  { value: "all", label: "Everything (Full Backup)" },
                ]} />
              </FormRow>
              <div style={{ marginTop: 12 }}>
                <FormRow label="Export Format">
                  <Sel value={exportFormat} onChange={setExportFormat} options={[
                    { value: "csv", label: "CSV — Spreadsheet" },
                    { value: "json", label: "JSON — Machine Readable" },
                    { value: "pdf", label: "PDF — Report" },
                    { value: "scorm", label: "SCORM Package" },
                  ]} />
                </FormRow>
              </div>
              <div style={{ marginTop: 16, padding: "12px 16px", background: "#f8fafc", borderRadius: 10, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>EXPORT SUMMARY</div>
                <div style={{ fontSize: 13, color: T.text }}>
                  Scope: <strong>{exportScope}</strong> · Format: <strong>{exportFormat.toUpperCase()}</strong>
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                  Estimated records: {exportScope === "courses" ? coursesTotal : exportScope === "modules" ? modules.length : exportScope === "content" ? content.length : exportScope === "kb" ? articles.length : exportScope === "certs" ? certificates.length : "All"} items
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <Btn onClick={() => showMsg(`Export started — ${exportScope} as ${exportFormat.toUpperCase()}. Download will begin shortly.`)}>⬇️ Export Now</Btn>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 8 }}>EXPORT HISTORY</div>
                {[
                  { file: "courses_export_apr26.csv", date: "Apr 26, 2026", size: "142 KB" },
                  { file: "full_backup_apr15.json", date: "Apr 15, 2026", size: "4.8 MB" },
                  { file: "kb_articles_apr01.csv", date: "Apr 1, 2026", size: "38 KB" },
                ].map((h, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
                    <span style={{ color: T.accent, cursor: "pointer", textDecoration: "underline" }}>{h.file}</span>
                    <div style={{ display: "flex", gap: 8, color: T.muted }}>
                      <span>{h.date}</span>
                      <span>{h.size}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      );
    }

    /* ── SETTINGS ── */
    if (selected === "settings") {
      return (
        <>
          <SectionHeader title="Knowledge Settings" subtitle="Configure workspace behavior, permissions, and integrations" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 16 }}>⚙️ General Settings</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormRow label="Workspace Name">
                  <Input value={settingsForm.workspace_name} onChange={(v) => setSettingsForm({ ...settingsForm, workspace_name: v })} placeholder="Knowledge Workspace" />
                </FormRow>
                <FormRow label="Default Language">
                  <Sel value={settingsForm.default_language} onChange={(v) => setSettingsForm({ ...settingsForm, default_language: v })} options={[
                    { value: "en", label: "English" }, { value: "hi", label: "Hindi" },
                    { value: "es", label: "Spanish" }, { value: "fr", label: "French" },
                  ]} />
                </FormRow>
                <FormRow label="Max Upload Size (MB)">
                  <Input value={settingsForm.max_file_size_mb} onChange={(v) => setSettingsForm({ ...settingsForm, max_file_size_mb: v })} placeholder="500" />
                </FormRow>
                <FormRow label="Allowed File Types">
                  <Input value={settingsForm.allowed_types} onChange={(v) => setSettingsForm({ ...settingsForm, allowed_types: v })} placeholder="video,pdf,pptx,docx" />
                </FormRow>
              </div>
            </Card>

            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 16 }}>🔒 Access & Permissions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Toggle value={settingsForm.content_approval} onChange={(v) => setSettingsForm({ ...settingsForm, content_approval: v })} label="Require content approval before publishing" />
                <Toggle value={settingsForm.auto_publish} onChange={(v) => setSettingsForm({ ...settingsForm, auto_publish: v })} label="Auto-publish approved content" />
                <Toggle value={settingsForm.enable_comments} onChange={(v) => setSettingsForm({ ...settingsForm, enable_comments: v })} label="Enable learner comments on content" />
                <Toggle value={settingsForm.enable_ratings} onChange={(v) => setSettingsForm({ ...settingsForm, enable_ratings: v })} label="Enable content ratings & reviews" />
                <Toggle value={settingsForm.enable_ai} onChange={(v) => setSettingsForm({ ...settingsForm, enable_ai: v })} label="Enable AI tools for content creators" />
              </div>
            </Card>

            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 16 }}>🔗 Integrations</div>
              {[
                { name: "Google Drive", icon: "📁", status: "connected", desc: "Sync content from Drive folders" },
                { name: "YouTube", icon: "▶️", status: "connected", desc: "Embed YouTube videos as lessons" },
                { name: "Zoom", icon: "🎥", status: "disconnected", desc: "Schedule and record live sessions" },
                { name: "Slack", icon: "💬", status: "disconnected", desc: "Send notifications to Slack channels" },
                { name: "SCORM Cloud", icon: "☁️", status: "disconnected", desc: "Host SCORM packages externally" },
              ].map((int) => (
                <div key={int.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>{int.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{int.name}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{int.desc}</div>
                    </div>
                  </div>
                  <button onClick={() => showMsg(`${int.name} ${int.status === "connected" ? "disconnected" : "connection initiated"}.`)}
                    style={{ background: int.status === "connected" ? "#d1fae5" : "#f1f5f9", color: int.status === "connected" ? "#065f46" : T.muted, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    {int.status === "connected" ? "Connected ✓" : "Connect"}
                  </button>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 16 }}>🎨 Branding</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormRow label="Primary Color">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="color" defaultValue="#6366f1" style={{ width: 40, height: 36, borderRadius: 6, border: `1px solid ${T.border}`, cursor: "pointer" }} />
                    <span style={{ fontSize: 13, color: T.muted }}>#6366f1 (Indigo)</span>
                  </div>
                </FormRow>
                <FormRow label="Certificate Logo">
                  <div style={{ border: `2px dashed ${T.border}`, borderRadius: 8, padding: "12px 16px", textAlign: "center", fontSize: 13, color: T.muted, cursor: "pointer" }}>
                    Click to upload logo (PNG, SVG, max 2MB)
                  </div>
                </FormRow>
                <FormRow label="Footer Text">
                  <Input value="© 2026 AI-LMS Platform. All rights reserved." onChange={() => {}} placeholder="Footer text for certificates" />
                </FormRow>
              </div>
            </Card>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setSettingsSaved(false)}>Reset to Defaults</Btn>
            <Btn onClick={() => { setSettingsSaved(true); showMsg("Settings saved successfully."); }}>💾 Save Settings</Btn>
          </div>
          {settingsSaved && <div style={{ marginTop: 10, textAlign: "right", fontSize: 13, color: T.success }}>✓ Settings saved</div>}
        </>
      );
    }

    return <div style={{ textAlign: "center", padding: 48, color: T.muted }}>Select a section from the sidebar to get started.</div>;
  }

  /* ─── Layout ─── */
  const flatTree = TREE.flatMap((n) => [n, ...(n.children ?? [])]);
  const pageTitle = flatTree.find((n) => n.id === selected)?.label ?? "Knowledge Workspace";

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: "'Inter',-apple-system,sans-serif", overflow: "hidden" }}>

      {/* Sidebar */}
      <aside style={{ width: 240, background: T.sidebar, display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ padding: "18px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📚</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#e0e7ff" }}>Knowledge</div>
              <div style={{ fontSize: 11, color: "#818cf8" }}>Workspace</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "8px 8px 0" }}>
          <button onClick={() => window.history.back()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "6px 12px", color: T.sidebarText, fontSize: 12, cursor: "pointer", width: "100%" }}>
            ← Back to Dashboard
          </button>
        </div>
        <nav style={{ padding: "10px 6px", flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", letterSpacing: "0.1em", padding: "4px 8px 8px", textTransform: "uppercase" }}>Navigation</div>
          {TREE.map((node) => <TreeItem key={node.id} node={node} depth={0} selected={selected} onSelect={setSelected} />)}
        </nav>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "12px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text }}>{pageTitle}</h1>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Admin · Knowledge Workspace</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Input value={search} onChange={setSearch} placeholder="Search…" style={{ width: 200 }} />
            <Btn variant="ghost" onClick={() => void load()} style={{ padding: "7px 14px" }}>↻ Refresh</Btn>
          </div>
        </header>

        {msg && (
          <div style={{ margin: "10px 22px 0", padding: "10px 16px", borderRadius: 10, background: msg.type === "error" ? "#fee2e2" : "#d1fae5", color: msg.type === "error" ? T.error : T.success, fontSize: 13, fontWeight: 600 }}>
            {msg.type === "success" ? "✓ " : "✕ "}{msg.text}
          </div>
        )}

        <main style={{ flex: 1, overflowY: "auto", padding: 22 }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
