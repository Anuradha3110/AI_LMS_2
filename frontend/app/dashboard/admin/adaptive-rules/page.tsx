/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adaptiveSeedApi, adaptiveOverviewApi, adaptiveRulesApi, adaptiveCreateRuleApi,
  adaptiveUpdateRuleApi, adaptiveDeleteRuleApi, adaptiveToggleRuleApi,
  adaptiveRoleConfigsApi, adaptiveUpdateRoleConfigApi,
  adaptiveGlobalConfigApi, adaptiveUpdateGlobalConfigApi,
  adaptiveTemplatesApi, adaptiveCreateTemplateApi, adaptiveDeleteTemplateApi,
  adaptiveAnalyticsApi, adaptiveWorkflowApi,
  adaptiveSubmitRuleApi, adaptiveApproveRuleApi, adaptiveRejectRuleApi, adaptivePublishRuleApi,
  adaptiveVersionsApi, adaptiveRollbackApi, adaptiveTestRuleApi,
  type AdaptiveRule, type AdaptiveRoleConfig, type AdaptiveGlobalConfig,
  type AdaptiveTemplate, type AdaptiveAnalytics, type AdaptiveOverview, type AdaptiveWorkflow,
} from "@/lib/api";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#f0f4ff",
  sidebar: "#1e1b4b",
  sidebarText: "#c7d2fe",
  sidebarActiveBg: "rgba(99,102,241,0.18)",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarSection: "#6366f1",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  muted: "#64748b",
  accent: "#6366f1",
  accent2: "#4f46e5",
  violet: "#7c3aed",
  success: "#059669",
  warning: "#d97706",
  error: "#dc2626",
  info: "#0891b2",
  headerBg: "#ffffff",
};

// ── Sidebar tree ──────────────────────────────────────────────────────────────
type TreeNode = { id: string; label: string; icon: string; children?: TreeNode[] };
const TREE: TreeNode[] = [
  { id: "overview", label: "Overview", icon: "◉",
    children: [
      { id: "overview-kpis", label: "Total Rules", icon: "·" },
      { id: "overview-active", label: "Active Rules", icon: "·" },
      { id: "overview-draft", label: "Draft Rules", icon: "·" },
      { id: "overview-pending", label: "Pending Approval", icon: "·" },
      { id: "overview-recent", label: "Recent Changes", icon: "·" },
    ],
  },
  { id: "global-rules", label: "Global Rules", icon: "⬡",
    children: [
      { id: "global-tone", label: "Default Tone", icon: "·" },
      { id: "global-safety", label: "Safety Policies", icon: "·" },
      { id: "global-compliance", label: "Compliance Rules", icon: "·" },
      { id: "global-language", label: "Language Rules", icon: "·" },
      { id: "global-escalation", label: "Escalation Triggers", icon: "·" },
      { id: "global-restricted", label: "Restricted Topics", icon: "·" },
    ],
  },
  { id: "role-rules", label: "Role-Based Rules", icon: "⬡",
    children: [
      { id: "role-admin", label: "Admin Rules", icon: "·" },
      { id: "role-manager", label: "Manager Rules", icon: "·" },
      { id: "role-employee", label: "Employee Rules", icon: "·" },
      { id: "role-instructor", label: "Instructor Rules", icon: "·" },
      { id: "role-learner", label: "Learner Rules", icon: "·" },
      { id: "role-hr", label: "HR Rules", icon: "·" },
    ],
  },
  { id: "learning-behavior", label: "Learning Behavior Rules", icon: "⬡",
    children: [
      { id: "lb-coaching", label: "Coaching Style", icon: "·" },
      { id: "lb-assessment", label: "Assessment Support", icon: "·" },
      { id: "lb-quiz", label: "Quiz Guidance", icon: "·" },
      { id: "lb-motivation", label: "Motivation Responses", icon: "·" },
      { id: "lb-feedback", label: "Feedback Style", icon: "·" },
      { id: "lb-nudges", label: "Progress Nudges", icon: "·" },
    ],
  },
  { id: "permissions", label: "Permission Controls", icon: "⬡",
    children: [
      { id: "perm-view", label: "View Permissions", icon: "·" },
      { id: "perm-data", label: "Data Access Limits", icon: "·" },
      { id: "perm-confidential", label: "Confidential Topics", icon: "·" },
      { id: "perm-role", label: "Role Restrictions", icon: "·" },
      { id: "perm-boundaries", label: "Response Boundaries", icon: "·" },
    ],
  },
  { id: "personalization", label: "Personalization Rules", icon: "⬡",
    children: [
      { id: "person-dept", label: "Department Based", icon: "·" },
      { id: "person-exp", label: "Experience Level", icon: "·" },
      { id: "person-skill", label: "Skill Level", icon: "·" },
      { id: "person-path", label: "Learning Path Based", icon: "·" },
      { id: "person-region", label: "Region / Language", icon: "·" },
    ],
  },
  { id: "templates", label: "Prompt Templates", icon: "⬡",
    children: [
      { id: "tmpl-greeting", label: "Greeting Templates", icon: "·" },
      { id: "tmpl-coaching", label: "Coaching Templates", icon: "·" },
      { id: "tmpl-support", label: "Support Templates", icon: "·" },
      { id: "tmpl-escalation", label: "Escalation Templates", icon: "·" },
      { id: "tmpl-summary", label: "Summary Templates", icon: "·" },
    ],
  },
  { id: "rule-builder", label: "Rule Builder", icon: "⬡",
    children: [
      { id: "rb-conditions", label: "Conditions", icon: "·" },
      { id: "rb-actions", label: "Actions", icon: "·" },
      { id: "rb-priority", label: "Priority Levels", icon: "·" },
      { id: "rb-enable", label: "Enable / Disable", icon: "·" },
      { id: "rb-conflict", label: "Conflict Detection", icon: "·" },
    ],
  },
  { id: "testing-lab", label: "Rule Testing Lab", icon: "⬡",
    children: [
      { id: "tl-admin", label: "Test as Admin", icon: "·" },
      { id: "tl-manager", label: "Test as Manager", icon: "·" },
      { id: "tl-employee", label: "Test as Employee", icon: "·" },
      { id: "tl-compare", label: "Compare Responses", icon: "·" },
      { id: "tl-simulate", label: "Simulate Scenarios", icon: "·" },
      { id: "tl-bias", label: "Bias Check", icon: "·" },
    ],
  },
  { id: "analytics", label: "Analytics", icon: "⬡",
    children: [
      { id: "an-usage", label: "Rule Usage", icon: "·" },
      { id: "an-accuracy", label: "Response Accuracy", icon: "·" },
      { id: "an-satisfaction", label: "Satisfaction Score", icon: "·" },
      { id: "an-escalation", label: "Escalation Rate", icon: "·" },
      { id: "an-failed", label: "Failed Responses", icon: "·" },
      { id: "an-suggestions", label: "Improvement Suggestions", icon: "·" },
    ],
  },
  { id: "approval", label: "Approval Workflow", icon: "⬡",
    children: [
      { id: "appr-drafts", label: "Drafts", icon: "·" },
      { id: "appr-review", label: "Reviewer Queue", icon: "·" },
      { id: "appr-approvals", label: "Approvals", icon: "·" },
      { id: "appr-rejected", label: "Rejected Changes", icon: "·" },
      { id: "appr-history", label: "Publish History", icon: "·" },
    ],
  },
  { id: "version-control", label: "Version Control", icon: "⬡",
    children: [
      { id: "vc-versions", label: "Rule Versions", icon: "·" },
      { id: "vc-rollback", label: "Rollback", icon: "·" },
      { id: "vc-changelog", label: "Change Logs", icon: "·" },
      { id: "vc-audit", label: "Audit Trail", icon: "·" },
    ],
  },
  { id: "settings", label: "Settings", icon: "⬡",
    children: [
      { id: "set-model", label: "AI Model Selection", icon: "·" },
      { id: "set-limits", label: "Response Limits", icon: "·" },
      { id: "set-language", label: "Default Language", icon: "·" },
      { id: "set-notifications", label: "Notification Settings", icon: "·" },
    ],
  },
];

function parentOf(id: string): string {
  for (const n of TREE) {
    if (n.children?.some((c) => c.id === id)) return n.id;
  }
  return id;
}

// ── Primitive components ──────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "22px 24px", boxShadow: "0 2px 12px rgba(99,102,241,0.06)", ...style }}>{children}</div>;
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 12 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text }}>{title}</h2>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: T.muted }}>{subtitle}</p>}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon }: { label: string; value: number | string; sub?: string; color: string; icon: string }) {
  return (
    <Card style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: T.text, lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 500, marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: color, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style, size = "md" }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost" | "success"; disabled?: boolean; style?: React.CSSProperties; size?: "sm" | "md" }) {
  const bg: Record<string, string> = { primary: `linear-gradient(135deg,${T.accent},${T.violet})`, secondary: "#f1f5f9", danger: "#fee2e2", ghost: "transparent", success: "#d1fae5" };
  const col: Record<string, string> = { primary: "#fff", secondary: T.text, danger: T.error, ghost: T.muted, success: T.success };
  const pad = size === "sm" ? "5px 12px" : "9px 18px";
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: bg[variant], color: col[variant], border: variant === "ghost" ? `1px solid ${T.border}` : "none", borderRadius: 9, padding: pad, fontSize: size === "sm" ? 12 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap", ...style }}>
      {children}
    </button>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 9999, textTransform: "capitalize" }}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active: ["#059669", "#d1fae5"], inactive: ["#dc2626", "#fee2e2"], draft: ["#d97706", "#fef3c7"],
    published: ["#4f46e5", "#ede9fe"], approved: ["#059669", "#d1fae5"], pending: ["#0891b2", "#dbeafe"],
    rejected: ["#dc2626", "#fee2e2"],
  };
  const [c, b] = map[status] ?? ["#64748b", "#f1f5f9"];
  return <Badge label={status} color={c} bg={b} />;
}

function Input({ value, onChange, placeholder, type = "text", style }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
    style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box", ...style }} />;
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />;
}

function Sel({ value, onChange, options, style }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; style?: React.CSSProperties }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ padding: "9px 10px", borderRadius: 9, border: `1.5px solid ${T.border}`, fontSize: 13, color: T.text, background: "#fff", outline: "none", ...style }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ width: 40, height: 22, borderRadius: 11, background: value ? T.accent : "#cbd5e1", position: "relative", transition: "background 0.2s", flexShrink: 0, cursor: "pointer" }} onClick={() => onChange(!value)}>
      <div style={{ position: "absolute", top: 3, left: value ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );
}

function FormRow({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: T.text, paddingTop: 9 }}>{label}{required && <span style={{ color: T.error }}> *</span>}</label>
      <div>{children}</div>
    </div>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [val, setVal] = useState("");
  const add = () => { const v = val.trim(); if (v && !tags.includes(v)) onChange([...tags, v]); setVal(""); };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {tags.map((t) => (
          <span key={t} style={{ background: "#ede9fe", color: T.violet, borderRadius: 9999, padding: "2px 10px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            {t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", color: T.violet, fontSize: 13, lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Input value={val} onChange={setVal} placeholder="Add tag, press Enter" style={{ flex: 1 }} />
        <Btn onClick={add} variant="secondary" size="sm">Add</Btn>
      </div>
    </div>
  );
}

function ProgressBar({ value, color = T.accent }: { value: number; color?: string }) {
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 99, height: 7, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${Math.min(value * 100, 100)}%`, background: color, height: "100%", borderRadius: 99, transition: "width 0.4s" }} />
    </div>
  );
}

function BarChart({ data, color = T.accent }: { data: { label: string; value: number }[]; color?: string }) {
  if (!data?.length) return <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontSize: 13 }}>No data</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>{d.value}</div>
          <div style={{ width: "100%", background: `${color}18`, borderRadius: "4px 4px 0 0", position: "relative", height: 90 }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: color, borderRadius: "4px 4px 0 0", height: `${(d.value / max) * 100}%`, transition: "height 0.5s" }} />
          </div>
          <div style={{ fontSize: 9, color: T.muted, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const safe = (data ?? []).filter((d) => d.value > 0);
  const total = safe.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  const r = 40, circum = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={100} height={100} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        {safe.map((d) => {
          const frac = d.value / total;
          const da = `${frac * circum} ${circum}`;
          const doff = -(offset * circum);
          offset += frac;
          return <circle key={d.label} cx={50} cy={50} r={r} fill="none" stroke={d.color} strokeWidth={17} strokeDasharray={da} strokeDashoffset={doff} style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }} />;
        })}
        <circle cx={50} cy={50} r={28} fill="white" />
        <text x={50} y={54} textAnchor="middle" fontSize={13} fontWeight="bold" fill={T.text}>{total}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(data ?? []).map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.muted }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text, marginLeft: "auto", paddingLeft: 10 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ values, color = T.accent }: { values: number[]; color?: string }) {
  if (!values || values.length < 2) return null;
  const w = 80, h = 28, min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * w, y: h - ((v - min) / range) * (h - 4) - 2 }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return <svg width={w} height={h} style={{ display: "inline-block", verticalAlign: "middle" }}><path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
}

function Spinner() {
  return <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTop: `3px solid ${T.accent}`, borderRadius: "50%", animation: "lf-spin 0.8s linear infinite" }} />;
}

function EmptyState({ msg }: { msg: string }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0", color: T.muted, fontSize: 14, flexDirection: "column", gap: 8 }}><span style={{ fontSize: 32 }}>📭</span>{msg}</div>;
}

// ── Sidebar tree item ─────────────────────────────────────────────────────────
function TreeItem({ node, depth, selected, onSelect }: { node: TreeNode; depth: number; selected: string; onSelect: (id: string) => void }) {
  const hasChildren = !!(node.children?.length);
  const isSelected = selected === node.id;
  const isAncestor = hasChildren && node.children!.some((c) => c.id === selected || c.children?.some((cc) => cc.id === selected));
  const [open, setOpen] = useState(isAncestor || isSelected);
  useEffect(() => { if (isAncestor) setOpen(true); }, [isAncestor]);
  const isChild = depth > 0;
  return (
    <div>
      <button
        onClick={() => { if (hasChildren) setOpen((o) => !o); onSelect(node.id); }}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
          padding: `${isChild ? 5 : 8}px ${8 + depth * 14}px`,
          background: isSelected ? T.sidebarActiveBg : "transparent",
          color: isSelected ? "#a5b4fc" : isChild ? "#94a3b8" : T.sidebarText,
          border: "none", cursor: "pointer", borderRadius: 8,
          fontSize: isChild ? 12 : 13,
          fontWeight: isSelected ? 700 : isChild ? 400 : 600,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = T.sidebarHover; }}
        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        {!isChild && <span style={{ fontSize: 10, color: isSelected ? "#a5b4fc" : "#6366f1" }}>{node.icon}</span>}
        {isChild && <span style={{ width: 6, height: 6, borderRadius: "50%", background: isSelected ? "#a5b4fc" : "#475569", flexShrink: 0 }} />}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</span>
        {hasChildren && <span style={{ fontSize: 10, color: "#6366f1", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▶</span>}
      </button>
      {hasChildren && open && (
        <div>{node.children!.map((c) => <TreeItem key={c.id} node={c} depth={depth + 1} selected={selected} onSelect={onSelect} />)}</div>
      )}
    </div>
  );
}

// ── Rule card ─────────────────────────────────────────────────────────────────
function RuleCard({ rule, onEdit, onDelete, onToggle, onSubmit }: {
  rule: AdaptiveRule; onEdit?: () => void; onDelete?: () => void; onToggle?: () => void; onSubmit?: () => void;
}) {
  const catColors: Record<string, string> = { global: "#6366f1", role_based: "#0891b2", learning_behavior: "#059669", permissions: "#d97706", personalization: "#7c3aed" };
  const catColor = catColors[rule.category] ?? T.muted;
  return (
    <Card style={{ marginBottom: 12, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{rule.name}</span>
            <StatusBadge status={rule.status} />
            <Badge label={rule.category.replace("_", " ")} color={catColor} bg={`${catColor}18`} />
            <span style={{ fontSize: 11, color: T.muted }}>P{rule.priority}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{rule.description}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {(rule.tags ?? []).slice(0, 4).map((t) => (
              <span key={t} style={{ background: "#f1f5f9", color: T.muted, fontSize: 10, padding: "1px 7px", borderRadius: 9999 }}>{t}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: T.muted }}>
            <span>Tone: <b style={{ color: T.text }}>{rule.tone}</b></span>
            <span>Depth: <b style={{ color: T.text }}>{rule.depth}</b></span>
            <span>v{rule.version ?? 1}</span>
            {rule.escalation_enabled && <span style={{ color: T.error, fontWeight: 700 }}>↑ Escalation On</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
          <Toggle value={rule.status === "active"} onChange={() => onToggle?.()} />
          <div style={{ display: "flex", gap: 6 }}>
            {onEdit && <Btn onClick={onEdit} variant="ghost" size="sm">Edit</Btn>}
            {onSubmit && rule.approval_status === "draft" && <Btn onClick={onSubmit} variant="secondary" size="sm">Submit</Btn>}
            {onDelete && <Btn onClick={onDelete} variant="danger" size="sm">Del</Btn>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Rule form ─────────────────────────────────────────────────────────────────
const EMPTY_RULE = { name: "", description: "", category: "global", sub_category: "tone", priority: 2, status: "draft", audience: ["global"], tone: "professional", formality: "formal", depth: "balanced", allowed_topics: [] as string[], restricted_topics: [] as string[], escalation_enabled: false, owner: "", tags: [] as string[], conditions: [] as any[] };

function RuleForm({ initial, onSave, onCancel }: { initial?: Partial<typeof EMPTY_RULE>; onSave: (d: typeof EMPTY_RULE) => void; onCancel: () => void }) {
  const [form, setForm] = useState<typeof EMPTY_RULE>({ ...EMPTY_RULE, ...(initial ?? {}) });
  const set = (k: keyof typeof EMPTY_RULE, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const TONES = ["professional", "analytical", "executive", "encouraging", "motivational", "empathetic", "collaborative", "nurturing", "inspiring", "constructive", "coaching"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
  const DEPTHS = ["balanced", "detailed", "summary", "beginner", "adaptive", "expert", "minimal", "careful"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
  const FORMALS = ["formal", "semi-formal", "casual", "adaptive"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
  const CATS = ["global", "role_based", "learning_behavior", "permissions", "personalization"].map((v) => ({ value: v, label: v.replace("_", " ") }));
  const PRIORITIES = [1, 2, 3, 4].map((v) => ({ value: String(v), label: `P${v} – ${["Critical", "High", "Medium", "Low"][v - 1]}` }));
  return (
    <Card>
      <SectionHeader title={initial?.name ? "Edit Rule" : "Create New Rule"} subtitle="Define how the AI assistant should behave for this rule" />
      <div style={{ maxWidth: 720 }}>
        <FormRow label="Rule Name" required><Input value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Employee Beginner Guidance" /></FormRow>
        <FormRow label="Description" required><Textarea value={form.description} onChange={(v) => set("description", v)} placeholder="Describe the purpose of this rule..." rows={2} /></FormRow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Category</div>
            <Sel value={form.category} onChange={(v) => set("category", v)} options={CATS} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Sub-Category</div>
            <Input value={form.sub_category} onChange={(v) => set("sub_category", v)} placeholder="e.g. tone, safety, coaching" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Tone</div>
            <Sel value={form.tone} onChange={(v) => set("tone", v)} options={TONES} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Formality</div>
            <Sel value={form.formality} onChange={(v) => set("formality", v)} options={FORMALS} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Depth</div>
            <Sel value={form.depth} onChange={(v) => set("depth", v)} options={DEPTHS} style={{ width: "100%" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Priority</div>
            <Sel value={String(form.priority)} onChange={(v) => set("priority", Number(v))} options={PRIORITIES} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Owner</div>
            <Input value={form.owner} onChange={(v) => set("owner", v)} placeholder="e.g. L&D Team" />
          </div>
        </div>
        <FormRow label="Allowed Topics"><TagInput tags={form.allowed_topics} onChange={(v) => set("allowed_topics", v)} /></FormRow>
        <FormRow label="Restricted Topics"><TagInput tags={form.restricted_topics} onChange={(v) => set("restricted_topics", v)} /></FormRow>
        <FormRow label="Tags"><TagInput tags={form.tags} onChange={(v) => set("tags", v)} /></FormRow>
        <FormRow label="Escalation Enabled">
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 4 }}>
            <Toggle value={form.escalation_enabled} onChange={(v) => set("escalation_enabled", v)} />
            <span style={{ fontSize: 12, color: T.muted }}>{form.escalation_enabled ? "Enabled — will escalate to human agent" : "Disabled"}</span>
          </div>
        </FormRow>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <Btn onClick={() => onSave(form)} disabled={!form.name || !form.description}>Save Rule</Btn>
          <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
        </div>
      </div>
    </Card>
  );
}

// ── Sections ──────────────────────────────────────────────────────────────────
function OverviewSection({ data, loading }: { data: AdaptiveOverview | null; loading: boolean }) {
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  if (!data) return <EmptyState msg="No overview data" />;
  const k = data.kpis;
  return (
    <div>
      <SectionHeader title="Adaptive Rules Overview" subtitle="Centralized governance dashboard for all AI behavioral rules" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 32 }}>
        <KpiCard label="Total Rules" value={k.total_rules} color={T.accent} icon="📋" />
        <KpiCard label="Active Rules" value={k.active_rules} sub="In production" color={T.success} icon="✅" />
        <KpiCard label="Draft Rules" value={k.draft_rules} sub="Being configured" color={T.warning} icon="📝" />
        <KpiCard label="Pending Approval" value={k.pending_approval} sub="Awaiting review" color={T.info} icon="⏳" />
        <KpiCard label="Total AI Usages" value={k.total_usage.toLocaleString()} sub="Across all rules" color={T.violet} icon="⚡" />
      </div>
      <SectionHeader title="Recent Changes" subtitle="Rules updated in the last 7 days" />
      {data.recent_changes.length === 0 ? <EmptyState msg="No recent changes" /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {data.recent_changes.map((r) => (
            <Card key={r.rule_id} style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{r.name}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>{r.category.replace("_", " ")} · v{r.version ?? 1} · by {r.created_by}</div>
                </div>
                <div style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>{r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "—"}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GlobalRulesSection({ config, onSave, loading }: { config: AdaptiveGlobalConfig | null; onSave: (k: string, v: any) => void; loading: boolean }) {
  const [form, setForm] = useState<Partial<AdaptiveGlobalConfig>>({});
  useEffect(() => { if (config) setForm(config); }, [config]);
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  if (!config) return <EmptyState msg="No global config" />;
  const TONES = ["professional", "analytical", "executive", "empathetic", "collaborative"].map((v) => ({ value: v, label: v }));
  const SAFETY = ["high", "medium", "low"].map((v) => ({ value: v, label: v }));
  const COMPLIANCE = ["strict", "standard", "lenient"].map((v) => ({ value: v, label: v }));
  const LANGS = [{ value: "en", label: "English" }, { value: "es", label: "Spanish" }, { value: "fr", label: "French" }, { value: "hi", label: "Hindi" }];
  const MODELS = ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768", "gemma-7b-it"].map((v) => ({ value: v, label: v }));
  return (
    <div>
      <SectionHeader title="Global AI Rules" subtitle="Configure foundational AI behavior that applies across all roles and interactions"
        action={<Btn onClick={() => onSave("global", form)}>Save All Changes</Btn>}
      />
      <div style={{ display: "grid", gap: 20 }}>
        {/* Tone & Behavior */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Default Tone & Behavior</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Default Tone</div>
              <Sel value={form.default_tone ?? "professional"} onChange={(v) => setForm((f) => ({ ...f, default_tone: v }))} options={TONES} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Safety Level</div>
              <Sel value={form.safety_level ?? "high"} onChange={(v) => setForm((f) => ({ ...f, safety_level: v }))} options={SAFETY} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Compliance Mode</div>
              <Sel value={form.compliance_mode ?? "strict"} onChange={(v) => setForm((f) => ({ ...f, compliance_mode: v }))} options={COMPLIANCE} style={{ width: "100%" }} />
            </div>
          </div>
        </Card>
        {/* Language & Model */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Language & AI Model</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Default Language</div>
              <Sel value={form.default_language ?? "en"} onChange={(v) => setForm((f) => ({ ...f, default_language: v }))} options={LANGS} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>AI Model</div>
              <Sel value={form.ai_model ?? "llama-3.1-8b-instant"} onChange={(v) => setForm((f) => ({ ...f, ai_model: v }))} options={MODELS} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Max Response Tokens</div>
              <Input value={String(form.max_response_tokens ?? 1200)} onChange={(v) => setForm((f) => ({ ...f, max_response_tokens: Number(v) }))} type="number" />
            </div>
          </div>
        </Card>
        {/* Escalation & Restrictions */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Escalation Triggers</h3>
          <TagInput tags={form.escalation_triggers ?? []} onChange={(v) => setForm((f) => ({ ...f, escalation_triggers: v }))} />
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Restricted Topics</h3>
          <TagInput tags={form.restricted_topics ?? []} onChange={(v) => setForm((f) => ({ ...f, restricted_topics: v }))} />
        </Card>
        {/* Feature Toggles */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Feature Toggles</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {([["Code Generation", "allow_code_generation"], ["External Links", "allow_external_links"], ["Fallback to Human", "fallback_to_human"], ["Session Memory", "session_memory"], ["Bias Detection", "bias_detection"], ["Content Moderation", "content_moderation"]] as [string, keyof AdaptiveGlobalConfig][]).map(([label, key]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderRadius: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</span>
                <Toggle value={!!(form as any)[key]} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function RoleRulesSection({ roleConfigs, rules, onSaveRole, loading }: {
  roleConfigs: AdaptiveRoleConfig[]; rules: AdaptiveRule[]; onSaveRole: (role: string, d: Partial<AdaptiveRoleConfig>) => void; loading: boolean;
}) {
  const [activeRole, setActiveRole] = useState("admin");
  const ROLES = ["admin", "manager", "employee", "instructor", "learner", "hr", "department_head"];
  const ROLE_ICONS: Record<string, string> = { admin: "👑", manager: "📊", employee: "👤", instructor: "🎓", learner: "📚", hr: "💼", department_head: "🏢" };
  const cfg = roleConfigs.find((r) => r.role === activeRole);
  const [form, setForm] = useState<Partial<AdaptiveRoleConfig>>({});
  useEffect(() => { if (cfg) setForm(cfg); }, [cfg, activeRole]);
  const TONES = ["professional", "analytical", "executive", "encouraging", "motivational", "empathetic", "collaborative", "nurturing", "strategic", "coaching", "adaptive"].map((v) => ({ value: v, label: v }));
  const DEPTHS = ["balanced", "detailed", "summary", "beginner", "adaptive", "expert", "minimal", "careful", "targeted"].map((v) => ({ value: v, label: v }));
  const FORMALS = ["formal", "semi-formal", "casual", "adaptive"].map((v) => ({ value: v, label: v }));
  const roleRules = rules.filter((r) => r.audience?.includes(activeRole) || r.sub_category === activeRole);
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  return (
    <div>
      <SectionHeader title="Role-Based Rules" subtitle="Configure AI behavior for each user role in the LMS platform" />
      {/* Role Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {ROLES.map((r) => (
          <button key={r} onClick={() => setActiveRole(r)}
            style={{ padding: "8px 16px", borderRadius: 24, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeRole === r ? T.accent : "#f1f5f9", color: activeRole === r ? "#fff" : T.muted, transition: "all 0.15s" }}>
            {ROLE_ICONS[r] ?? "👤"} {r.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>
      {cfg ? (
        <div style={{ display: "grid", gap: 20 }}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>{ROLE_ICONS[activeRole]} {cfg.display} Configuration</h3>
              <Btn onClick={() => onSaveRole(activeRole, form)} size="sm">Save Changes</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Tone</div>
                <Sel value={form.tone ?? "professional"} onChange={(v) => setForm((f) => ({ ...f, tone: v }))} options={TONES} style={{ width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Formality</div>
                <Sel value={form.formality ?? "formal"} onChange={(v) => setForm((f) => ({ ...f, formality: v }))} options={FORMALS} style={{ width: "100%" }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Response Depth</div>
                <Sel value={form.depth ?? "balanced"} onChange={(v) => setForm((f) => ({ ...f, depth: v }))} options={DEPTHS} style={{ width: "100%" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              {(["coaching_style", "assessment_support", "quiz_guidance", "feedback_style", "motivation_style", "data_access"] as const).map((k) => (
                <div key={k}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>{k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                  <Input value={(form as any)[k] ?? ""} onChange={(v) => setForm((f) => ({ ...f, [k]: v }))} placeholder={k.replace(/_/g, " ")} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Allowed Topics</div>
                <TagInput tags={form.allowed_topics ?? []} onChange={(v) => setForm((f) => ({ ...f, allowed_topics: v }))} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Restricted Topics</div>
                <TagInput tags={form.restricted_topics ?? []} onChange={(v) => setForm((f) => ({ ...f, restricted_topics: v }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle value={!!form.escalation_enabled} onChange={(v) => setForm((f) => ({ ...f, escalation_enabled: v }))} />
                <span style={{ fontSize: 13, color: T.text }}>Escalation Enabled</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle value={!!form.personalization} onChange={(v) => setForm((f) => ({ ...f, personalization: v }))} />
                <span style={{ fontSize: 13, color: T.text }}>Personalization</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Toggle value={!!form.bias_check} onChange={(v) => setForm((f) => ({ ...f, bias_check: v }))} />
                <span style={{ fontSize: 13, color: T.text }}>Bias Check</span>
              </div>
            </div>
          </Card>
          {/* Role-specific rules */}
          {roleRules.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: T.text }}>Rules Applied to {cfg.display}</h3>
              {roleRules.map((r) => (
                <Card key={r.rule_id} style={{ padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <StatusBadge status={r.status} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>P{r.priority} · {r.tone}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {/* Role matrix row */}
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Role Matrix Summary</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Role", "Tone", "Depth", "Data Access", "Escalation", "Personalization", "Max Tokens"].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roleConfigs.map((rc, i) => (
                    <tr key={rc.role} style={{ background: rc.role === activeRole ? "#ede9fe" : i % 2 === 0 ? "#fff" : "#fafafe", borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: T.text }}>{ROLE_ICONS[rc.role]} {rc.display}</td>
                      <td style={{ padding: "8px 12px", color: T.muted }}>{rc.tone}</td>
                      <td style={{ padding: "8px 12px", color: T.muted }}>{rc.depth}</td>
                      <td style={{ padding: "8px 12px", color: T.muted }}>{rc.data_access}</td>
                      <td style={{ padding: "8px 12px" }}><Badge label={rc.escalation_enabled ? "On" : "Off"} color={rc.escalation_enabled ? T.error : T.success} bg={rc.escalation_enabled ? "#fee2e2" : "#d1fae5"} /></td>
                      <td style={{ padding: "8px 12px" }}><Badge label={rc.personalization ? "Yes" : "No"} color={rc.personalization ? T.accent : T.muted} bg={rc.personalization ? "#ede9fe" : "#f1f5f9"} /></td>
                      <td style={{ padding: "8px 12px", color: T.muted }}>{rc.response_limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : <EmptyState msg="No config for this role" />}
    </div>
  );
}

function RuleBuilderSection({ rules, loading, onCreate, onUpdate, onDelete, onToggle, onSubmit }: {
  rules: AdaptiveRule[]; loading: boolean; onCreate: (d: any) => void; onUpdate: (id: string, d: any) => void; onDelete: (id: string) => void; onToggle: (id: string) => void; onSubmit: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<AdaptiveRule | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const filtered = rules.filter((r) => {
    const q = search.toLowerCase();
    const matchQ = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    const matchCat = !catFilter || r.category === catFilter;
    const matchSt = !statusFilter || r.status === statusFilter;
    return matchQ && matchCat && matchSt;
  });
  const CATS = [{ value: "", label: "All Categories" }, ...["global", "role_based", "learning_behavior", "permissions", "personalization"].map((v) => ({ value: v, label: v.replace("_", " ") }))];
  const STATUSES = [{ value: "", label: "All Status" }, { value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "inactive", label: "Inactive" }];
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  return (
    <div>
      <SectionHeader title="Rule Builder" subtitle="Create, configure, and manage all adaptive AI rules"
        action={<Btn onClick={() => { setEditRule(null); setShowForm(true); }}>+ New Rule</Btn>}
      />
      {(showForm || editRule) && (
        <div style={{ marginBottom: 24 }}>
          <RuleForm
            initial={editRule ?? undefined}
            onSave={(d) => { if (editRule) { onUpdate(editRule.rule_id, d); } else { onCreate(d); } setShowForm(false); setEditRule(null); }}
            onCancel={() => { setShowForm(false); setEditRule(null); }}
          />
        </div>
      )}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Input value={search} onChange={setSearch} placeholder="Search rules..." style={{ flex: "1 1 200px" }} />
          <Sel value={catFilter} onChange={setCatFilter} options={CATS} style={{ minWidth: 160 }} />
          <Sel value={statusFilter} onChange={setStatusFilter} options={STATUSES} style={{ minWidth: 130 }} />
          <span style={{ fontSize: 12, color: T.muted, alignSelf: "center" }}>{filtered.length} rules</span>
        </div>
      </Card>
      {filtered.length === 0 ? <EmptyState msg="No rules match the filters" /> : (
        filtered.map((r) => (
          <RuleCard key={r.rule_id} rule={r}
            onEdit={() => { setEditRule(r); setShowForm(false); }}
            onDelete={() => onDelete(r.rule_id)}
            onToggle={() => onToggle(r.rule_id)}
            onSubmit={() => onSubmit(r.rule_id)}
          />
        ))
      )}
    </div>
  );
}

function TemplatesSection({ templates, loading, onCreate, onDelete }: {
  templates: AdaptiveTemplate[]; loading: boolean; onCreate: (d: any) => void; onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "greeting", name: "", description: "", content: "", variables: [] as string[], applicable_roles: ["all"], status: "active" });
  const TYPES = ["greeting", "coaching", "support", "escalation", "summary"];
  const filtered = tab === "all" ? templates : templates.filter((t) => t.type === tab);
  const TYPE_COLORS: Record<string, string> = { greeting: "#6366f1", coaching: "#059669", support: "#0891b2", escalation: "#d97706", summary: "#7c3aed" };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  return (
    <div>
      <SectionHeader title="Prompt Templates" subtitle="Reusable AI prompt templates for consistent responses"
        action={<Btn onClick={() => setShowForm((v) => !v)}>+ New Template</Btn>}
      />
      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Create Template</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Type</div>
              <Sel value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={TYPES.map((t) => ({ value: t, label: t }))} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Name</div>
              <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Template name" />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Description</div>
            <Input value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Brief description" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Template Content (use {"{{variable}}"} for placeholders)</div>
            <Textarea value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} placeholder="Hello {{user_name}}! ..." rows={4} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={() => { onCreate(form); setShowForm(false); setForm({ type: "greeting", name: "", description: "", content: "", variables: [], applicable_roles: ["all"], status: "active" }); }} disabled={!form.name || !form.content}>Create Template</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Cancel</Btn>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", ...TYPES].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: tab === t ? (TYPE_COLORS[t] ?? T.accent) : "#f1f5f9", color: tab === t ? "#fff" : T.muted }}>
            {t.charAt(0).toUpperCase() + t.slice(1)} ({t === "all" ? templates.length : templates.filter((x) => x.type === t).length})
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {filtered.map((t) => (
          <Card key={t.template_id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: `${TYPE_COLORS[t.type] ?? T.accent}18`, color: TYPE_COLORS[t.type] ?? T.accent, fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 9999 }}>{t.type}</span>
              <StatusBadge status={t.status} />
              <span style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>Used {t.usage_count}×</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{t.name}</div>
            <div style={{ fontSize: 12, color: T.muted }}>{t.description}</div>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: T.muted, fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>{t.content}</div>
            {t.variables.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {t.variables.map((v) => <span key={v} style={{ background: "#ede9fe", color: T.violet, fontSize: 10, padding: "1px 7px", borderRadius: 9999 }}>{"{{"}{v}{"}}"}</span>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Btn onClick={() => navigator.clipboard?.writeText(t.content)} variant="ghost" size="sm">Copy</Btn>
              <Btn onClick={() => onDelete(t.template_id)} variant="danger" size="sm">Delete</Btn>
            </div>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && <EmptyState msg="No templates found" />}
    </div>
  );
}

function TestingLabSection({ rules, loading }: { rules: AdaptiveRule[]; loading: boolean }) {
  const [role, setRole] = useState("employee");
  const [role2, setRole2] = useState("manager");
  const [prompt, setPrompt] = useState("");
  const [ruleId, setRuleId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [result2, setResult2] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [mode, setMode] = useState<"single" | "compare">("single");
  const ROLES = ["admin", "manager", "employee", "instructor", "learner", "hr"].map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
  const runTest = async () => {
    if (!prompt.trim()) return;
    setTesting(true);
    try {
      const r1 = await adaptiveTestRuleApi({ prompt, role, ...(ruleId ? { rule_id: ruleId } : {}) });
      setResult(r1);
      if (mode === "compare") {
        const r2 = await adaptiveTestRuleApi({ prompt, role: role2 });
        setResult2(r2);
      }
    } catch { /* ignore */ } finally { setTesting(false); }
  };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  return (
    <div>
      <SectionHeader title="Rule Testing Lab" subtitle="Simulate AI responses before publishing rules to production" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["single", "compare"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: mode === m ? T.accent : "#f1f5f9", color: mode === m ? "#fff" : T.muted }}>
              {m === "single" ? "Single Test" : "Compare Roles"}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mode === "compare" ? "1fr 1fr 2fr" : "1fr 2fr", gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Primary Role</div>
            <Sel value={role} onChange={setRole} options={ROLES} style={{ width: "100%" }} />
          </div>
          {mode === "compare" && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Compare Role</div>
              <Sel value={role2} onChange={setRole2} options={ROLES} style={{ width: "100%" }} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Apply Specific Rule (optional)</div>
            <Sel value={ruleId} onChange={setRuleId} options={[{ value: "", label: "Use role defaults" }, ...rules.slice(0, 20).map((r) => ({ value: r.rule_id, label: r.name }))]} style={{ width: "100%" }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Test Prompt</div>
          <Textarea value={prompt} onChange={setPrompt} placeholder="Enter a question or scenario to test — e.g. 'How do I complete my assessment?'" rows={3} />
        </div>
        <Btn onClick={runTest} disabled={testing || !prompt.trim()}>{testing ? "Testing..." : "Run Test"}</Btn>
      </Card>
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: mode === "compare" && result2 ? "1fr 1fr" : "1fr", gap: 16 }}>
          {[{ r: result, lbl: `Response as ${role.charAt(0).toUpperCase() + role.slice(1)}` }, ...(mode === "compare" && result2 ? [{ r: result2, lbl: `Response as ${role2.charAt(0).toUpperCase() + role2.slice(1)}` }] : [])].map(({ r, lbl }) => (
            <Card key={lbl}>
              <div style={{ fontWeight: 700, fontSize: 14, color: T.accent, marginBottom: 10 }}>{lbl}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {Object.entries(r.applied_config ?? {}).map(([k, v]) => (
                  <span key={k} style={{ background: "#f1f5f9", color: T.muted, fontSize: 11, padding: "2px 8px", borderRadius: 9999 }}>{k}: <b>{String(v)}</b></span>
                ))}
              </div>
              {r.rule_applied && <div style={{ fontSize: 12, color: T.violet, fontWeight: 600, marginBottom: 10 }}>Rule: {r.rule_applied}</div>}
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: T.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.simulated_response}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsSection({ analytics, loading }: { analytics: AdaptiveAnalytics | null; loading: boolean }) {
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  if (!analytics) return <EmptyState msg="No analytics data" />;
  const s = analytics.summary;
  const IMPACT_COLORS: Record<string, [string, string]> = { critical: ["#dc2626", "#fee2e2"], high: ["#d97706", "#fef3c7"], medium: ["#0891b2", "#dbeafe"], low: ["#64748b", "#f1f5f9"] };
  return (
    <div>
      <SectionHeader title="Rule Analytics" subtitle="Monitor performance and effectiveness of all adaptive rules" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        <KpiCard label="Total AI Usages" value={s.total_usage.toLocaleString()} color={T.accent} icon="⚡" />
        <KpiCard label="Avg Accuracy" value={`${(s.avg_accuracy_rate * 100).toFixed(1)}%`} color={T.success} icon="🎯" />
        <KpiCard label="Avg Satisfaction" value={`${s.avg_satisfaction_score.toFixed(1)}/5`} color={T.violet} icon="⭐" />
        <KpiCard label="Total Escalations" value={s.total_escalations} color={T.warning} icon="↑" />
        <KpiCard label="Failed Responses" value={s.total_failures} color={T.error} icon="✗" />
        <KpiCard label="Approval Rate" value={`${(s.approval_rate * 100).toFixed(0)}%`} color={T.info} icon="✓" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: T.text }}>30-Day Usage Trend</h3>
          <BarChart data={analytics.daily_usage.slice(-14).map((v, i) => ({ label: `D-${13 - i}`, value: v }))} color={T.accent} />
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: T.text }}>Rules by Status</h3>
          <DonutChart data={analytics.status_distribution.map((d) => ({ label: d.status, value: d.count, color: { active: T.success, draft: T.warning, inactive: T.error }[d.status] ?? T.muted }))} />
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: T.text }}>Usage by Category</h3>
          <BarChart data={analytics.category_usage.map((d) => ({ label: d.category.replace("_", " "), value: d.usage }))} color={T.violet} />
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: T.text }}>Top Rules by Usage</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {analytics.top_rules.slice(0, 6).map((r) => (
              <div key={r.rule_id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: T.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{r.rule_name}</span>
                  <span style={{ color: T.muted, flexShrink: 0 }}>{r.total_usage} uses</span>
                </div>
                <ProgressBar value={r.total_usage / Math.max(...analytics.top_rules.map((x) => x.total_usage), 1)} />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.text }}>Improvement Suggestions</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {analytics.improvement_suggestions.map((s, i) => {
            const [c, b] = IMPACT_COLORS[s.impact] ?? IMPACT_COLORS.medium;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: `1px solid ${T.border}` }}>
                <Badge label={s.impact} color={c} bg={b} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>{s.rule}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{s.suggestion}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ApprovalSection({ workflow, loading, onApprove, onReject, onPublish, onSubmit }: {
  workflow: AdaptiveWorkflow | null; loading: boolean; onApprove: (id: string) => void; onReject: (id: string, r: string) => void; onPublish: (id: string) => void; onSubmit: (id: string) => void;
}) {
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  if (!workflow) return <EmptyState msg="No workflow data" />;
  const COLS: { key: keyof typeof workflow.workflow; label: string; color: string; bg: string }[] = [
    { key: "draft", label: "Draft", color: T.warning, bg: "#fef3c7" },
    { key: "pending", label: "In Review", color: T.info, bg: "#dbeafe" },
    { key: "approved", label: "Approved", color: T.success, bg: "#d1fae5" },
    { key: "published", label: "Published", color: T.accent, bg: "#ede9fe" },
    { key: "rejected", label: "Rejected", color: T.error, bg: "#fee2e2" },
  ];
  return (
    <div>
      <SectionHeader title="Approval Workflow" subtitle="Manage the Draft → Review → Approve → Publish lifecycle" />
      {/* Stepper */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {COLS.map((c, i) => (
            <React.Fragment key={c.key}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.bg, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, margin: "0 auto 6px" }}>{workflow.counts[c.key] ?? 0}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.label}</div>
              </div>
              {i < COLS.length - 1 && <div style={{ width: 40, height: 2, background: T.border, flexShrink: 0 }} />}
            </React.Fragment>
          ))}
        </div>
      </Card>
      {/* Kanban columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {COLS.map((col) => (
          <div key={col.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ background: col.bg, color: col.color, borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: "2px 10px" }}>{col.label}</span>
              <span style={{ fontSize: 12, color: T.muted }}>{workflow.counts[col.key] ?? 0}</span>
            </div>
            <div style={{ minHeight: 80 }}>
              {(workflow.workflow[col.key] ?? []).length === 0 ? (
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px", textAlign: "center", fontSize: 12, color: T.muted, border: `2px dashed ${T.border}` }}>Empty</div>
              ) : (workflow.workflow[col.key] ?? []).map((rule: AdaptiveRule) => (
                <div key={rule.rule_id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 10, boxShadow: "0 1px 4px rgba(99,102,241,0.06)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 4 }}>{rule.name}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>{rule.category.replace("_", " ")} · v{rule.version}</div>
                  {rule.rejection_reason && <div style={{ fontSize: 11, color: T.error, background: "#fee2e2", borderRadius: 6, padding: "4px 8px", marginBottom: 8 }}>Reason: {rule.rejection_reason}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {col.key === "draft" && <Btn onClick={() => onSubmit(rule.rule_id)} variant="secondary" size="sm">Submit</Btn>}
                    {col.key === "pending" && <><Btn onClick={() => onApprove(rule.rule_id)} variant="success" size="sm">Approve</Btn><Btn onClick={() => { setRejectModal({ id: rule.rule_id }); setRejectReason(""); }} variant="danger" size="sm">Reject</Btn></>}
                    {col.key === "approved" && <Btn onClick={() => onPublish(rule.rule_id)} size="sm">Publish</Btn>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <Card style={{ width: 420, maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: T.text }}>Reject Rule</h3>
            <Textarea value={rejectReason} onChange={setRejectReason} placeholder="Enter rejection reason..." rows={3} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <Btn onClick={() => { onReject(rejectModal.id, rejectReason || "Does not meet requirements"); setRejectModal(null); }} variant="danger">Reject</Btn>
              <Btn onClick={() => setRejectModal(null)} variant="ghost">Cancel</Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function VersionControlSection({ rules, loading }: { rules: AdaptiveRule[]; loading: boolean }) {
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [versions, setVersions] = useState<any[]>([]);
  const [vLoading, setVLoading] = useState(false);
  const loadVersions = async (id: string) => {
    setVLoading(true);
    try { const r = await adaptiveVersionsApi(id); setVersions(r.versions); } catch { setVersions([]); } finally { setVLoading(false); }
  };
  const rollback = async (version: number) => {
    if (!selectedRuleId) return;
    try { await adaptiveRollbackApi(selectedRuleId, version); await loadVersions(selectedRuleId); } catch { /* ignore */ }
  };
  const activeRules = rules.filter((r) => r.status === "active").slice(0, 30);
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  return (
    <div>
      <SectionHeader title="Version Control" subtitle="Track rule history, view change logs, and rollback to previous versions" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.muted, marginBottom: 8 }}>Select Rule to View History</div>
        <div style={{ display: "flex", gap: 12 }}>
          <Sel value={selectedRuleId} onChange={(v) => { setSelectedRuleId(v); if (v) loadVersions(v); }}
            options={[{ value: "", label: "— Select a rule —" }, ...activeRules.map((r) => ({ value: r.rule_id, label: r.name }))]}
            style={{ flex: 1 }} />
        </div>
      </Card>
      {vLoading && <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>}
      {!vLoading && selectedRuleId && versions.length === 0 && <EmptyState msg="No version history for this rule yet" />}
      {!vLoading && versions.length > 0 && (
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: T.border }} />
          {versions.map((v, i) => (
            <div key={v.version_id} style={{ position: "relative", marginBottom: 20 }}>
              <div style={{ position: "absolute", left: -20, top: 8, width: 12, height: 12, borderRadius: "50%", background: i === 0 ? T.accent : T.border, border: `2px solid #fff` }} />
              <Card style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ background: i === 0 ? "#ede9fe" : "#f1f5f9", color: i === 0 ? T.accent : T.muted, fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 9999 }}>v{v.version}</span>
                  {i === 0 && <span style={{ fontSize: 11, color: T.success, fontWeight: 700 }}>Current</span>}
                  <span style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>{v.created_at ? new Date(v.created_at).toLocaleString() : "—"}</span>
                </div>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 4 }}>{v.change_summary}</div>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Changed by: {v.changed_by}</div>
                {v.snapshot && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(v.snapshot).filter(([, val]) => val != null).map(([k, val]) => (
                      <span key={k} style={{ background: "#f1f5f9", color: T.muted, fontSize: 10, padding: "2px 8px", borderRadius: 9999 }}>{k}: <b>{String(val)}</b></span>
                    ))}
                  </div>
                )}
                {i > 0 && <div style={{ marginTop: 10 }}><Btn onClick={() => rollback(v.version)} variant="secondary" size="sm">Rollback to v{v.version}</Btn></div>}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsSection({ config, onSave, loading }: { config: AdaptiveGlobalConfig | null; onSave: (k: string, v: any) => void; loading: boolean }) {
  const [form, setForm] = useState<Partial<AdaptiveGlobalConfig>>({});
  useEffect(() => { if (config) setForm(config); }, [config]);
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  const MODELS = ["llama-3.1-8b-instant", "llama-3.1-70b-versatile", "mixtral-8x7b-32768", "gemma-7b-it"].map((v) => ({ value: v, label: v }));
  const LANGS = [{ value: "en", label: "English" }, { value: "es", label: "Spanish" }, { value: "fr", label: "French" }, { value: "hi", label: "Hindi" }, { value: "de", label: "German" }];
  return (
    <div>
      <SectionHeader title="Settings" subtitle="Platform-level AI configuration and notification preferences"
        action={<Btn onClick={() => onSave("global", form)}>Save Settings</Btn>}
      />
      <div style={{ display: "grid", gap: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>AI Model Selection</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Active Model</div>
              <Sel value={form.ai_model ?? "llama-3.1-8b-instant"} onChange={(v) => setForm((f) => ({ ...f, ai_model: v }))} options={MODELS} style={{ width: "100%" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Temperature ({form.temperature ?? 0.7})</div>
              <input type="range" min="0" max="1" step="0.1" value={form.temperature ?? 0.7} onChange={(e) => setForm((f) => ({ ...f, temperature: Number(e.target.value) }))} style={{ width: "100%", marginTop: 6 }} />
            </div>
          </div>
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Response Limits</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Max Response Tokens</div>
              <Input value={String(form.max_response_tokens ?? 1200)} onChange={(v) => setForm((f) => ({ ...f, max_response_tokens: Number(v) }))} type="number" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Response Format</div>
              <Sel value={"markdown"} onChange={() => {}} options={[{ value: "markdown", label: "Markdown" }, { value: "plain", label: "Plain Text" }]} style={{ width: "100%" }} />
            </div>
          </div>
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Default Language</h3>
          <Sel value={form.default_language ?? "en"} onChange={(v) => setForm((f) => ({ ...f, default_language: v }))} options={LANGS} style={{ width: 240 }} />
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: T.text }}>Notification Settings</h3>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Notification Email</div>
            <Input value={form.notification_email ?? ""} onChange={(v) => setForm((f) => ({ ...f, notification_email: v }))} placeholder="admin@company.com" style={{ maxWidth: 320 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["Fallback to Human", "fallback_to_human"], ["Session Memory", "session_memory"], ["Bias Detection", "bias_detection"], ["Content Moderation", "content_moderation"]].map(([label, key]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 400 }}>
                <span style={{ fontSize: 13, color: T.text }}>{label}</span>
                <Toggle value={!!(form as any)[key]} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function GenericSection({ title, subtitle, category, rules, loading }: { title: string; subtitle: string; category: string; rules: AdaptiveRule[]; loading: boolean }) {
  const filtered = rules.filter((r) => r.category === category);
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>;
  return (
    <div>
      <SectionHeader title={title} subtitle={subtitle} />
      {filtered.length === 0 ? (
        <Card><EmptyState msg={`No ${title.toLowerCase()} rules configured yet`} /></Card>
      ) : filtered.map((r) => (
        <RuleCard key={r.rule_id} rule={r} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdaptiveRulesPage() {
  const router = useRouter();
  const [active, setActive] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  // Data states
  const [overview, setOverview] = useState<AdaptiveOverview | null>(null);
  const [rules, setRules] = useState<AdaptiveRule[]>([]);
  const [roleConfigs, setRoleConfigs] = useState<AdaptiveRoleConfig[]>([]);
  const [globalConfig, setGlobalConfig] = useState<AdaptiveGlobalConfig | null>(null);
  const [templates, setTemplates] = useState<AdaptiveTemplate[]>([]);
  const [analytics, setAnalytics] = useState<AdaptiveAnalytics | null>(null);
  const [workflow, setWorkflow] = useState<AdaptiveWorkflow | null>(null);

  // Loading states
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingRoleCfg, setLoadingRoleCfg] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = useCallback(async () => {
    await adaptiveSeedApi().catch(() => {});
    const fetchOverview = async () => { setLoadingOverview(true); try { setOverview(await adaptiveOverviewApi()); } catch { } finally { setLoadingOverview(false); } };
    const fetchRules = async () => { setLoadingRules(true); try { const r = await adaptiveRulesApi({ limit: 100 }); setRules(r.rules); } catch { } finally { setLoadingRules(false); } };
    const fetchRoleCfg = async () => { setLoadingRoleCfg(true); try { const r = await adaptiveRoleConfigsApi(); setRoleConfigs(r.role_configs); } catch { } finally { setLoadingRoleCfg(false); } };
    const fetchGlobal = async () => { setLoadingGlobal(true); try { setGlobalConfig(await adaptiveGlobalConfigApi()); } catch { } finally { setLoadingGlobal(false); } };
    const fetchTemplates = async () => { setLoadingTemplates(true); try { const r = await adaptiveTemplatesApi(); setTemplates(r.templates); } catch { } finally { setLoadingTemplates(false); } };
    const fetchAnalytics = async () => { setLoadingAnalytics(true); try { setAnalytics(await adaptiveAnalyticsApi()); } catch { } finally { setLoadingAnalytics(false); } };
    const fetchWorkflow = async () => { setLoadingWorkflow(true); try { setWorkflow(await adaptiveWorkflowApi()); } catch { } finally { setLoadingWorkflow(false); } };
    await Promise.all([fetchOverview(), fetchRules(), fetchRoleCfg(), fetchGlobal(), fetchTemplates(), fetchAnalytics(), fetchWorkflow()]);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [ov, an] = await Promise.all([adaptiveOverviewApi(), adaptiveAnalyticsApi()]);
        setOverview(ov); setAnalytics(an);
      } catch { /* ignore */ }
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Handlers
  const handleCreateRule = async (d: any) => {
    try { await adaptiveCreateRuleApi(d); const r = await adaptiveRulesApi({ limit: 100 }); setRules(r.rules); showToast("Rule created successfully"); } catch { showToast("Failed to create rule", "error"); }
  };
  const handleUpdateRule = async (id: string, d: any) => {
    try { await adaptiveUpdateRuleApi(id, d); const r = await adaptiveRulesApi({ limit: 100 }); setRules(r.rules); showToast("Rule updated"); } catch { showToast("Failed to update rule", "error"); }
  };
  const handleDeleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    try { await adaptiveDeleteRuleApi(id); setRules((prev) => prev.filter((r) => r.rule_id !== id)); showToast("Rule deleted"); } catch { showToast("Failed to delete", "error"); }
  };
  const handleToggleRule = async (id: string) => {
    try { const r = await adaptiveToggleRuleApi(id); setRules((prev) => prev.map((x) => x.rule_id === id ? { ...x, status: r.new_status } : x)); showToast(`Rule ${r.new_status}`); } catch { showToast("Failed to toggle", "error"); }
  };
  const handleSubmitRule = async (id: string) => {
    try { await adaptiveSubmitRuleApi(id); const [r, wf] = await Promise.all([adaptiveRulesApi({ limit: 100 }), adaptiveWorkflowApi()]); setRules(r.rules); setWorkflow(wf); showToast("Submitted for review"); } catch { showToast("Failed to submit", "error"); }
  };
  const handleSaveGlobal = async (_: string, data: Partial<AdaptiveGlobalConfig>) => {
    try { await adaptiveUpdateGlobalConfigApi(data); setGlobalConfig(await adaptiveGlobalConfigApi()); showToast("Global config saved"); } catch { showToast("Failed to save", "error"); }
  };
  const handleSaveRole = async (role: string, data: Partial<AdaptiveRoleConfig>) => {
    try { await adaptiveUpdateRoleConfigApi(role, data); const r = await adaptiveRoleConfigsApi(); setRoleConfigs(r.role_configs); showToast("Role config saved"); } catch { showToast("Failed to save", "error"); }
  };
  const handleCreateTemplate = async (d: any) => {
    try { await adaptiveCreateTemplateApi(d); const r = await adaptiveTemplatesApi(); setTemplates(r.templates); showToast("Template created"); } catch { showToast("Failed to create", "error"); }
  };
  const handleDeleteTemplate = async (id: string) => {
    try { await adaptiveDeleteTemplateApi(id); setTemplates((p) => p.filter((t) => t.template_id !== id)); showToast("Template deleted"); } catch { showToast("Failed to delete", "error"); }
  };
  const handleApprove = async (id: string) => {
    try { await adaptiveApproveRuleApi(id); setWorkflow(await adaptiveWorkflowApi()); showToast("Rule approved"); } catch { showToast("Failed", "error"); }
  };
  const handleReject = async (id: string, reason: string) => {
    try { await adaptiveRejectRuleApi(id, reason); setWorkflow(await adaptiveWorkflowApi()); showToast("Rule rejected"); } catch { showToast("Failed", "error"); }
  };
  const handlePublish = async (id: string) => {
    try { await adaptivePublishRuleApi(id); const [r, wf] = await Promise.all([adaptiveRulesApi({ limit: 100 }), adaptiveWorkflowApi()]); setRules(r.rules); setWorkflow(wf); showToast("Rule published successfully!"); } catch { showToast("Failed to publish", "error"); }
  };

  const parentSection = parentOf(active);
  const effectiveSection = parentSection;

  const renderContent = () => {
    if (effectiveSection === "overview" || active === "overview") return <OverviewSection data={overview} loading={loadingOverview} />;
    if (effectiveSection === "global-rules") return <GlobalRulesSection config={globalConfig} onSave={handleSaveGlobal} loading={loadingGlobal} />;
    if (effectiveSection === "role-rules") return <RoleRulesSection roleConfigs={roleConfigs} rules={rules} onSaveRole={handleSaveRole} loading={loadingRoleCfg} />;
    if (effectiveSection === "learning-behavior") return <GenericSection title="Learning Behavior Rules" subtitle="Configure how AI coaches and supports learners across different learning activities" category="learning_behavior" rules={rules} loading={loadingRules} />;
    if (effectiveSection === "permissions") return <GenericSection title="Permission Controls" subtitle="Define data access boundaries and response restrictions for each role" category="permissions" rules={rules} loading={loadingRules} />;
    if (effectiveSection === "personalization") return <GenericSection title="Personalization Rules" subtitle="Tailor AI responses based on department, experience level, skill, and region" category="personalization" rules={rules} loading={loadingRules} />;
    if (effectiveSection === "templates") return <TemplatesSection templates={templates} loading={loadingTemplates} onCreate={handleCreateTemplate} onDelete={handleDeleteTemplate} />;
    if (effectiveSection === "rule-builder") return <RuleBuilderSection rules={rules} loading={loadingRules} onCreate={handleCreateRule} onUpdate={handleUpdateRule} onDelete={handleDeleteRule} onToggle={handleToggleRule} onSubmit={handleSubmitRule} />;
    if (effectiveSection === "testing-lab") return <TestingLabSection rules={rules} loading={loadingRules} />;
    if (effectiveSection === "analytics") return <AnalyticsSection analytics={analytics} loading={loadingAnalytics} />;
    if (effectiveSection === "approval") return <ApprovalSection workflow={workflow} loading={loadingWorkflow} onApprove={handleApprove} onReject={handleReject} onPublish={handlePublish} onSubmit={handleSubmitRule} />;
    if (effectiveSection === "version-control") return <VersionControlSection rules={rules} loading={loadingRules} />;
    if (effectiveSection === "settings") return <SettingsSection config={globalConfig} onSave={handleSaveGlobal} loading={loadingGlobal} />;
    return <OverviewSection data={overview} loading={loadingOverview} />;
  };

  const SECTION_LABELS: Record<string, string> = {
    overview: "Overview", "global-rules": "Global Rules", "role-rules": "Role-Based Rules",
    "learning-behavior": "Learning Behavior", permissions: "Permissions", personalization: "Personalization",
    templates: "Prompt Templates", "rule-builder": "Rule Builder", "testing-lab": "Rule Testing Lab",
    analytics: "Analytics", approval: "Approval Workflow", "version-control": "Version Control", settings: "Settings",
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "Inter, -apple-system, sans-serif", background: T.bg }}>
      {/* Sidebar */}
      <div style={{ width: sidebarCollapsed ? 56 : 256, background: T.sidebar, flexShrink: 0, display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden" }}>
        {/* Sidebar header */}
        <div style={{ padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#a5b4fc", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI Rules</div>
              <div style={{ fontSize: 11, color: "#6366f1", marginTop: 1 }}>Governance Workspace</div>
            </div>
          )}
          <button onClick={() => setSidebarCollapsed((v) => !v)} style={{ background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "#94a3b8", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
            {sidebarCollapsed ? "▶" : "◀"}
          </button>
        </div>
        {/* Back button */}
        {!sidebarCollapsed && (
          <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 12, fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.06)", width: "100%", textAlign: "left" }}>
            ← Back to Dashboard
          </button>
        )}
        {/* Tree */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
          {!sidebarCollapsed && TREE.map((node) => <TreeItem key={node.id} node={node} depth={0} selected={active} onSelect={setActive} />)}
          {sidebarCollapsed && TREE.map((node) => (
            <button key={node.id} onClick={() => setActive(node.id)} title={node.label}
              style={{ width: "100%", padding: "10px 0", display: "flex", alignItems: "center", justifyContent: "center", background: active === node.id || parentOf(active) === node.id ? T.sidebarActiveBg : "transparent", border: "none", cursor: "pointer", color: active === node.id || parentOf(active) === node.id ? "#a5b4fc" : "#6366f1", borderRadius: 8, marginBottom: 2, fontSize: 14 }}>
              {node.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.border}`, padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 16, flexShrink: 0, boxShadow: "0 1px 4px rgba(99,102,241,0.06)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{SECTION_LABELS[effectiveSection] ?? "Adaptive Rules"}</span>
            <span style={{ fontSize: 12, color: T.muted, marginLeft: 10 }}>AI Governance Workspace</span>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search rules..." style={{ padding: "7px 12px 7px 32px", borderRadius: 20, border: `1.5px solid ${T.border}`, fontSize: 12, outline: "none", width: 200, background: "#f8fafc" }} />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, fontSize: 13 }}>🔍</span>
            </div>
            <Btn onClick={() => { setActive("rule-builder"); }} size="sm">+ Add Rule</Btn>
            <Btn onClick={() => setActive("approval")} variant="secondary" size="sm">
              {(workflow?.counts.pending ?? 0) > 0 && <span style={{ background: T.error, color: "#fff", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, marginRight: 4 }}>{workflow?.counts.pending}</span>}
              Publish
            </Btn>
            <Btn onClick={loadAll} variant="ghost" size="sm" style={{ fontSize: 16 }}>↻</Btn>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg,${T.accent},${T.violet})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>A</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {renderContent()}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.type === "success" ? "#059669" : T.error, color: "#fff", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.18)", zIndex: 9999, transition: "opacity 0.3s" }}>
          {toast.type === "success" ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
