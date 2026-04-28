"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  meApi,
  coursesApi,
  gamificationLeaderboardApi,
  tenantAnalyticsApi,
  knowledgeStatsApi,
  listUsersApi,
  addTeamMemberApi,
  getTeamMemberDetailApi,
  listAttendanceApi,
  getAttendanceSummaryApi,
  listLeaveRequestsApi,
  approveLeaveApi,
  rejectLeaveApi,
  listCourseAssignmentsApi,
  assignCoursesApi,
  courseProgressSummaryApi,
  mongoGetTeamProgressApi,
  mongoCreateTeamProgressApi,
  mongoDeleteTeamProgressApi,
  mongoPatchTeamProgressApi,
  mongoGetLeaderboardApi,
  mongoGetAttendanceApi,
  mongoCreateAttendanceApi,
  mongoUpdateAttendanceApi,
  mongoDeleteAttendanceApi,
  mongoGetLeaveRequestsApi,
  mongoPatchLeaveRequestApi,
  mongoListCoursesApi,
  mongoGetProfileApi,
  mongoUpsertProfileApi,
  type MongoCourseDoc,
  type MongoLeaveRequestDoc,
  type UserProfileDoc,
  type TeamProgressDoc,
  type LeaderboardDoc,
  type AttendenceDoc,
  type AttendenceInput,
  type CourseOut,
  type LeaderboardRowOut,
  type TenantAnalyticsOut,
  type KnowledgeStatsOut,
  type UserListOut,
  type TeamMemberDetailOut,
  type AttendanceRecordOut,
  type AttendanceSummaryOut,
  type LeaveRequestOut,
  type CourseAssignmentOut,
  type CourseProgressSummaryOut,
} from "@/lib/api";

/* ─── Types ─────────────────────────────────────────────────── */
type ManagerTab = "overview" | "team" | "scorecards" | "copilot" | "leaderboard" | "alerts" | "attendance" | "leaves" | "assignments";
type CopilotMsg = { role: "user" | "ai"; text: string; timestamp: Date };
type MetricsType = "team-members" | "needs-attention" | "completions" | "kpi-risks";
type TeamMemberRow = { name: string; role: string; avatar: string; kpi: number; completion: number; pitchScore: number; objectionScore: number; escalationScore: number; status: string };
type AttRow = { name: string; avatar: string; status: "present" | "absent" | "late" | "on_leave"; checkIn: string | null; checkOut: string | null };
type LeaveRow = { id: string; name: string; avatar: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: "pending" | "approved" | "rejected"; appliedDate: string; comment: string | null };
type AssignRow = { id: string; name: string; avatar: string; course: string; status: "not_started" | "in_progress" | "completed"; progress: number; deadline: string; assignedDate: string };

/* ─── Icon helper ───────────────────────────────────────────── */
function Icon({ d, size = 18, color = "currentColor" }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ─── Progress Bar ──────────────────────────────────────────── */
function ProgressBar({ value, max = 100, color = "#0891b2", height = 7 }: { value: number; max?: number; color?: string; height?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ background: "#f1f5f9", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  );
}

/* ─── KPI Trend Indicator ───────────────────────────────────── */
function Trend({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const good = inverse ? value < 0 : value >= 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: good ? "#059669" : "#dc2626" }}>
      <Icon d={good ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} size={13} color={good ? "#059669" : "#dc2626"} />
      {Math.abs(value)}%
    </span>
  );
}

/* ─── Badge ─────────────────────────────────────────────────── */
function Badge({ label, color = "#0891b2", bg = "#e0f2fe" }: { label: string; color?: string; bg?: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: "3px 9px", borderRadius: 99, letterSpacing: "0.03em" }}>{label}</span>;
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ label, value, sub, iconD, accent, trend, onValueClick, tooltip }: { label: string; value: string | number; sub?: string; iconD: string; accent: string; trend?: number; onValueClick?: () => void; tooltip?: string }) {
  const isClickable = !!onValueClick;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", borderTop: `3px solid ${accent}`, boxShadow: "0 1px 4px rgba(15,23,42,0.05)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={iconD} size={20} color={accent} />
        </div>
        {trend !== undefined && <Trend value={trend} />}
      </div>
      <div>
        {isClickable ? (
          <button
            onClick={onValueClick}
            title={tooltip || "Click to view details"}
            style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1.1, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3, fontFamily: "inherit" }}
          >
            {value}
          </button>
        ) : (
          <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{value}</div>
        )}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
        {isClickable && <div style={{ fontSize: 10, color: accent, marginTop: 3, opacity: 0.7 }}>Click to view details</div>}
      </div>
    </div>
  );
}

/* ─── Section Header ────────────────────────────────────────── */
function SectionHeader({ title, subtitle, iconD, action }: { title: string; subtitle?: string; iconD?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {iconD && (
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon d={iconD} size={17} color="#0891b2" />
          </div>
        )}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ─── Alert Item ────────────────────────────────────────────── */
function AlertItem({ type, title, body, time }: { type: "warning" | "danger" | "info" | "success"; title: string; body: string; time: string }) {
  const cfg = {
    warning: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" },
    danger:  { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" },
    info:    { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
    success: { color: "#059669", bg: "#f0fdf4", border: "#bbf7d0", icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
  }[type];
  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 16px", borderRadius: 11, background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 10 }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}><Icon d={cfg.icon} size={17} color={cfg.color} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3 }}>{body}</div>
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{time}</div>
    </div>
  );
}

/* ─── Skill Score Cell ──────────────────────────────────────── */
function SkillCell({ score }: { score: number }) {
  const color = score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";
  const bg = score >= 80 ? "#d1fae5" : score >= 60 ? "#fef3c7" : "#fee2e2";
  return (
    <div style={{ textAlign: "center" }}>
      <span style={{ fontSize: 12, fontWeight: 800, color, background: bg, padding: "3px 10px", borderRadius: 8, display: "inline-block" }}>{score}%</span>
    </div>
  );
}

/* ─── Copilot Message Bubble ────────────────────────────────── */
function CopilotBubble({ msg }: { msg: CopilotMsg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10, marginTop: 2 }}>
          <Icon d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" size={15} color="#fff" />
        </div>
      )}
      <div style={{ maxWidth: "72%", padding: "11px 15px", borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isUser ? "linear-gradient(135deg,#0891b2,#0e7490)" : "#f8fafc", border: isUser ? "none" : "1px solid #e2e8f0", color: isUser ? "#fff" : "#0f172a", fontSize: 13.5, lineHeight: 1.6, boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}>
        {msg.text}
        <div style={{ fontSize: 10, color: isUser ? "rgba(255,255,255,0.65)" : "#94a3b8", marginTop: 5, textAlign: "right" }}>
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10, marginTop: 2, fontSize: 13, fontWeight: 800, color: "#fff" }}>M</div>
      )}
    </div>
  );
}

/* ─── Modal Overlay ─────────────────────────────────────────── */
function ModalOverlay({ onClose, children, width = 560 }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(2px)" }}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(15,23,42,0.2)", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Metrics Modal ──────────────────────────────────────────── */
function MetricsModal({ type, members, onClose, onMemberClick }: { type: MetricsType; members: TeamMemberRow[]; onClose: () => void; onMemberClick: (m: TeamMemberRow) => void }) {
  const titles: Record<MetricsType, string> = {
    "team-members": "All Team Members",
    "needs-attention": "Members Needing Attention",
    "completions": "Completion Overview",
    "kpi-risks": "KPI At-Risk Members",
  };
  const filtered = type === "needs-attention"
    ? members.filter(m => m.status === "At Risk" || m.status === "Needs Training")
    : type === "kpi-risks"
    ? members.filter(m => m.kpi < 70)
    : members;

  const [search, setSearch] = React.useState("");
  const displayed = filtered.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase()));

  return (
    <ModalOverlay onClose={onClose} width={620}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{titles[type]}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{displayed.length} member{displayed.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d="M18 6L6 18M6 6l12 12" size={16} color="#64748b" />
        </button>
      </div>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or role…"
          style={{ width: "100%", padding: "9px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit", color: "#0f172a", background: "#fafafa" }}
        />
      </div>
      <div style={{ overflowY: "auto", padding: "14px 24px", flex: 1 }}>
        {displayed.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>No members found</div>
        )}
        {displayed.map(m => {
          const statusColors: Record<string, { color: string; bg: string }> = {
            "Top Performer": { color: "#059669", bg: "#d1fae5" },
            "On Track":      { color: "#2563eb", bg: "#dbeafe" },
            "At Risk":       { color: "#d97706", bg: "#fef3c7" },
            "Needs Training":{ color: "#dc2626", bg: "#fee2e2" },
          };
          const sc = statusColors[m.status] || { color: "#475569", bg: "#f3f4f6" };
          return (
            <div
              key={m.name}
              onClick={() => onMemberClick(m)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 10, border: "1px solid #f1f5f9", marginBottom: 8, cursor: "pointer", background: "#fafafa", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fafafa")}
            >
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{m.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{m.role} · KPI {m.kpi}% · Completion {m.completion}%</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, padding: "3px 10px", borderRadius: 99 }}>{m.status}</span>
              <Icon d="M9 18l6-6-6-6" size={16} color="#94a3b8" />
            </div>
          );
        })}
      </div>
    </ModalOverlay>
  );
}

/* ─── Add Member Modal ──────────────────────────────────────── */
function AddMemberModal({ onClose, onSuccess, token }: { onClose: () => void; onSuccess: (member: UserListOut) => void; token: string }) {
  const [form, setForm] = React.useState({ full_name: "", email: "", role: "employee", department: "", phone: "", joining_date: "" });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { setError("Full name is required"); return; }
    if (!form.email.trim()) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError("Enter a valid email address"); return; }
    setLoading(true);
    setError(null);
    try {
      const member = await addTeamMemberApi(token, {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        department: form.department.trim() || undefined,
        phone: form.phone.trim() || undefined,
        joining_date: form.joining_date || undefined,
      });
      setSuccess(true);
      setTimeout(() => { onSuccess(member); onClose(); }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13.5, outline: "none", fontFamily: "inherit", color: "#0f172a", background: "#fafafa", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 5, display: "block" as const };

  return (
    <ModalOverlay onClose={onClose} width={520}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Add Team Member</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Default password: Welcome@123</div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d="M18 6L6 18M6 6l12 12" size={16} color="#64748b" />
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={18} color="#059669" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>Member added successfully!</span>
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" size={17} color="#dc2626" />
            <span style={{ fontSize: 13, color: "#dc2626" }}>{error}</span>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Full Name *</label>
            <input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="e.g. Rohit Sharma" style={inputStyle} required />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Email Address *</label>
            <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="e.g. rohit@company.com" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Department</label>
            <input value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Sales, Support" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Phone (optional)</label>
            <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 9876543210" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Joining Date (optional)</label>
            <input type="date" value={form.joining_date} onChange={e => set("joining_date", e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#475569" }}>Cancel</button>
          <button type="submit" disabled={loading || success} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: loading || success ? "#94a3b8" : "#0891b2", cursor: loading || success ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? (
              <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Adding…</>
            ) : success ? "Added!" : "Add Member"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

/* ─── Member Detail Modal ───────────────────────────────────── */
function MemberDetailModal({ member, detail, detailLoading, onClose }: { member: TeamMemberRow | null; detail: TeamMemberDetailOut | null; detailLoading: boolean; onClose: () => void }) {
  if (!member) return null;
  const statusColors: Record<string, { color: string; bg: string }> = {
    "Top Performer": { color: "#059669", bg: "#d1fae5" },
    "On Track":      { color: "#2563eb", bg: "#dbeafe" },
    "At Risk":       { color: "#d97706", bg: "#fef3c7" },
    "Needs Training":{ color: "#dc2626", bg: "#fee2e2" },
  };
  const sc = statusColors[member.status] || { color: "#475569", bg: "#f3f4f6" };

  return (
    <ModalOverlay onClose={onClose} width={600}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{member.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{member.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>{member.role}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, background: sc.bg, padding: "2px 9px", borderRadius: 99 }}>{member.status}</span>
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon d="M18 6L6 18M6 6l12 12" size={16} color="#64748b" />
        </button>
      </div>

      <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
        {/* Performance Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "KPI Score",   value: `${member.kpi}%`, color: member.kpi >= 80 ? "#059669" : member.kpi >= 65 ? "#d97706" : "#dc2626" },
            { label: "Completion",  value: `${member.completion}%`, color: member.completion >= 80 ? "#059669" : member.completion >= 60 ? "#d97706" : "#dc2626" },
            { label: "Pitch Sim",   value: `${member.pitchScore}%`, color: member.pitchScore >= 80 ? "#059669" : member.pitchScore >= 60 ? "#d97706" : "#dc2626" },
            { label: "Objection",   value: `${member.objectionScore}%`, color: member.objectionScore >= 80 ? "#059669" : member.objectionScore >= 60 ? "#d97706" : "#dc2626" },
            { label: "Escalation",  value: `${member.escalationScore}%`, color: member.escalationScore >= 80 ? "#059669" : member.escalationScore >= 60 ? "#d97706" : "#dc2626" },
            ...(detail ? [{ label: "XP Points", value: detail.xp_points.toLocaleString(), color: "#7c3aed" }] : []),
          ].map(m => (
            <div key={m.label} style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fafafa", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Live DB metrics */}
        {detailLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd", marginBottom: 16 }}>
            <div style={{ width: 18, height: 18, border: "2px solid #bae6fd", borderTopColor: "#0891b2", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 13, color: "#0891b2", fontWeight: 600 }}>Loading live performance data…</span>
          </div>
        )}
        {detail && !detailLoading && (
          <div style={{ background: "#f8fafc", borderRadius: 11, border: "1px solid #e2e8f0", padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Live LMS Data</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {[
                { label: "Enrolled Courses",     value: detail.enrolled_courses },
                { label: "Assessments Done",      value: detail.assessments_completed },
                { label: "Avg Assessment Score",  value: `${detail.avg_assessment_score}%` },
                { label: "Simulations Completed", value: detail.simulations_completed },
                { label: "Level",                 value: `Level ${detail.level}` },
                { label: "Badges Earned",         value: detail.badges_count },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "#fff", border: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 12.5, color: "#475569" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{item.value}</span>
                </div>
              ))}
            </div>
            {detail.email && (
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#fff", border: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.5, color: "#475569" }}>Email</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0891b2" }}>{detail.email}</span>
              </div>
            )}
            {detail.skill_scores.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8 }}>Skill Scores</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {detail.skill_scores.map(s => (
                    <span key={s.skill_name} style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: s.score >= 80 ? "#d1fae5" : s.score >= 60 ? "#fef3c7" : "#fee2e2", color: s.score >= 80 ? "#059669" : s.score >= 60 ? "#d97706" : "#dc2626" }}>
                      {s.skill_name}: {s.score}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skill breakdown from mock data */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Simulation Scores</div>
          {[
            { label: "Pitch Simulation",   score: member.pitchScore },
            { label: "Objection Handling",  score: member.objectionScore },
            { label: "Escalation Handling", score: member.escalationScore },
          ].map(s => (
            <div key={s.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12.5, color: "#475569" }}>{s.label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: s.score >= 80 ? "#059669" : s.score >= 60 ? "#d97706" : "#dc2626" }}>{s.score}%</span>
              </div>
              <ProgressBar value={s.score} color={s.score >= 80 ? "#059669" : s.score >= 60 ? "#d97706" : "#dc2626"} height={6} />
            </div>
          ))}
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ─── Attendance Detail Modal ───────────────────────────────── */
function AttendanceDetailModal({ status, rows, onClose }: { status: string; rows: AttRow[]; onClose: () => void }) {
  const labels: Record<string, string> = { present: "Present Today", absent: "Absent Today", late: "Late Arrivals", on_leave: "On Leave" };
  const colors: Record<string, string> = { present: "#059669", absent: "#dc2626", late: "#d97706", on_leave: "#7c3aed" };
  const filtered = rows.filter(r => r.status === status);
  return (
    <ModalOverlay onClose={onClose} width={500}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{labels[status] || "Employees"}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{filtered.length} employee{filtered.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d="M18 6L6 18M6 6l12 12" size={16} color="#64748b" />
        </button>
      </div>
      <div style={{ overflowY: "auto", padding: "14px 24px", flex: 1 }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>No employees with this status today</div>}
        {filtered.map(r => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 10, border: "1px solid #f1f5f9", marginBottom: 8, background: "#fafafa" }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{r.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{r.name}</div>
              {r.checkIn && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>In: {r.checkIn} {r.checkOut ? `· Out: ${r.checkOut}` : ""}</div>}
              {!r.checkIn && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>No check-in recorded</div>}
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: colors[r.status], background: colors[r.status] + "18", padding: "3px 10px", borderRadius: 99 }}>{labels[r.status]}</span>
          </div>
        ))}
      </div>
    </ModalOverlay>
  );
}

/* ─── Assign Course Modal ───────────────────────────────────── */
function AssignCourseModal({ mongoCourses, pgCourses, teamMembers, token, onClose, onSuccess }: {
  mongoCourses: MongoCourseDoc[];
  pgCourses: CourseOut[];
  teamMembers: typeof TEAM_MEMBERS;
  token: string;
  onClose: () => void;
  onSuccess: (rows: AssignRow[]) => void;
}) {
  const [selectedCourseKey, setSelectedCourseKey] = React.useState("");
  const [catFilter, setCatFilter] = React.useState<"" | "Sales" | "Support" | "Operations">("");
  const [selectedNames, setSelectedNames] = React.useState<string[]>([]);
  const [deadline, setDeadline] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggleMember = (name: string) =>
    setSelectedNames(p => p.includes(name) ? p.filter(n => n !== name) : [...p, name]);

  // Build a unified course list: MongoDB courses first, then any PG courses not already covered
  const allCourses: { key: string; title: string; category: string; level: string; duration: string; instructor: string; modules: number; assignments: number; quizzes: number; isNew: boolean; isRecommended: boolean }[] = [
    ...mongoCourses.map(c => ({
      key: `mongo::${c._id}`,
      title: c.title,
      category: c.category,
      level: c.level,
      duration: c.duration,
      instructor: c.instructor,
      modules: c.modules?.length ?? 0,
      assignments: c.assignments?.length ?? 0,
      quizzes: c.quizzes?.length ?? 0,
      isNew: c.isNew,
      isRecommended: c.isRecommended,
    })),
    ...pgCourses.map(c => ({
      key: `pg::${c.id}`,
      title: c.title,
      category: c.category ?? "",
      level: (c as unknown as Record<string, string>)["level"] ?? "",
      duration: "",
      instructor: (c as unknown as Record<string, string>)["instructor_name"] ?? "",
      modules: 0,
      assignments: 0,
      quizzes: 0,
      isNew: false,
      isRecommended: false,
    })),
  ];

  const filtered = catFilter ? allCourses.filter(c => c.category === catFilter) : allCourses;
  const selected = allCourses.find(c => c.key === selectedCourseKey);

  const catColor: Record<string, string> = { Sales: "#0891b2", Support: "#7c3aed", Operations: "#dc2626" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourseKey) { setError("Please select a course"); return; }
    if (selectedNames.length === 0) { setError("Select at least one team member"); return; }
    setLoading(true); setError(null);
    // Try PG API for PG courses; MongoDB courses are tracked in local state
    if (selectedCourseKey.startsWith("pg::")) {
      const pgId = selectedCourseKey.replace("pg::", "");
      try { await assignCoursesApi(token, { course_id: pgId, user_ids: ["placeholder"], deadline: deadline || undefined, notes }); }
      catch { /* non-critical */ }
    }
    const newRows: AssignRow[] = selectedNames.map((name, i) => {
      const m = teamMembers.find(t => t.name === name)!;
      return {
        id: `new-${Date.now()}-${i}`,
        name: m.name,
        avatar: (m as unknown as Record<string, string>)["avatar"] ?? name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        course: selected?.title ?? "",
        status: "not_started" as const,
        progress: 0,
        deadline: deadline ? new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No deadline",
        assignedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      };
    });
    setSuccess(true);
    setTimeout(() => { onSuccess(newRows); onClose(); }, 1100);
    setLoading(false);
  }

  const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13.5, outline: "none", fontFamily: "inherit", color: "#0f172a", background: "#fafafa", boxSizing: "border-box" as const };

  return (
    <ModalOverlay onClose={onClose} width={620}>
      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Assign Course to Employee</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {allCourses.length} professional courses available · Sales · Support · Operations
          </div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d="M18 6L6 18M6 6l12 12" size={16} color="#64748b" />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
        {success && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
            <Icon d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={18} color="#059669" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>Course assigned successfully!</span>
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 13, color: "#dc2626" }}>{error}</div>
        )}

        {/* ── Category Filter ── */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 8 }}>Filter by Category</label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {(["", "Sales", "Support", "Operations"] as const).map(cat => (
              <button key={cat || "all"} type="button" onClick={() => { setCatFilter(cat); setSelectedCourseKey(""); }} style={{
                padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
                borderColor: catFilter === cat ? (catColor[cat] ?? "#4f46e5") : "#e2e8f0",
                background: catFilter === cat ? ((catColor[cat] ?? "#4f46e5") + "18") : "#f8fafc",
                color: catFilter === cat ? (catColor[cat] ?? "#4f46e5") : "#64748b",
                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
              }}>
                {cat || "All"} ({cat ? allCourses.filter(c => c.category === cat).length : allCourses.length})
              </button>
            ))}
          </div>
        </div>

        {/* ── Course Cards Grid ── */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 8 }}>
            Select Course * {selected && <span style={{ color: "#059669" }}>— {selected.title}</span>}
          </label>
          {filtered.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: 13, background: "#f8fafc", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
              No courses in this category yet. Go to Admin → Course Manager to add courses.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, maxHeight: 340, overflowY: "auto", padding: "2px 1px" }}>
              {filtered.map(course => {
                const isSelected = selectedCourseKey === course.key;
                const cc = catColor[course.category] ?? "#4f46e5";
                return (
                  <button
                    key={course.key}
                    type="button"
                    onClick={() => setSelectedCourseKey(course.key)}
                    style={{
                      textAlign: "left", padding: 0, borderRadius: 10, cursor: "pointer",
                      border: `2px solid ${isSelected ? cc : "#e2e8f0"}`,
                      background: isSelected ? `${cc}0d` : "#fafafa",
                      boxShadow: isSelected ? `0 0 0 3px ${cc}20` : "none",
                      transition: "all 0.12s", overflow: "hidden",
                    }}
                  >
                    <div style={{ height: 3, background: cc }} />
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: cc, background: `${cc}18`, padding: "2px 7px", borderRadius: 99 }}>{course.category}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", background: "#f1f5f9", padding: "2px 7px", borderRadius: 99 }}>{course.level}</span>
                        {course.isNew && <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "2px 7px", borderRadius: 99 }}>New</span>}
                        {course.isRecommended && <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "#fef3c7", padding: "2px 7px", borderRadius: 99 }}>⭐</span>}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: isSelected ? cc : "#0f172a", lineHeight: 1.35, marginBottom: 5 }}>{course.title}</div>
                      {course.instructor && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 5 }}>👩‍🏫 {course.instructor}</div>}
                      <div style={{ display: "flex", gap: 8, fontSize: 10.5, color: "#94a3b8" }}>
                        {course.duration && <span>⏱ {course.duration}</span>}
                        <span>📚 {course.modules}m</span>
                        <span>📝 {course.assignments}a</span>
                        <span>❓ {course.quizzes}q</span>
                      </div>
                      {isSelected && (
                        <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 700, color: cc }}>✓ Selected</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Team Member Selection ── */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 8 }}>Assign To *</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 210, overflowY: "auto", padding: "4px 0" }}>
            {teamMembers.map((m: any) => (
              <label key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${selectedNames.includes(m.name) ? "#0891b2" : "#e2e8f0"}`, background: selectedNames.includes(m.name) ? "#f0f9ff" : "#fafafa", cursor: "pointer" }}>
                <input type="checkbox" checked={selectedNames.includes(m.name)} onChange={() => toggleMember(m.name)} style={{ accentColor: "#0891b2", width: 14, height: 14 }} />
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{m.avatar}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{m.role}</div>
                </div>
                {selectedNames.includes(m.name) && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#0891b2", background: "#e0f2fe", padding: "2px 7px", borderRadius: 99 }}>Selected</span>
                )}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 7, fontSize: 12, color: "#64748b" }}>
            {selectedNames.length > 0 ? `${selectedNames.length} employee${selectedNames.length > 1 ? "s" : ""} selected` : "No employees selected"}
          </div>
        </div>

        {/* ── Deadline & Notes ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 }}>Deadline (optional)</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 }}>Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any instructions for the employee…" style={inputStyle} />
          </div>
        </div>

        {/* ── Assignment summary ── */}
        {selected && selectedNames.length > 0 && (
          <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#0369a1" }}>
            <strong>Summary:</strong> Assigning <strong>"{selected.title}"</strong> ({selected.category} · {selected.level}) to{" "}
            <strong>{selectedNames.join(", ")}</strong>
            {deadline && <> · Due <strong>{new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></>}.
          </div>
        )}

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#475569" }}>Cancel</button>
          <button type="submit" disabled={loading || success} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: loading || success ? "#94a3b8" : "#0891b2", cursor: loading || success ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading
              ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Assigning…</>
              : success ? "✓ Assigned!" : `Assign to ${selectedNames.length || ""} Employee${selectedNames.length !== 1 ? "s" : ""}`}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

/* ─── Leave Confirm Modal ───────────────────────────────────── */
function LeaveConfirmModal({ leave, action, onConfirm, onClose }: {
  leave: LeaveRow; action: "approve" | "reject";
  onConfirm: (comment: string) => void; onClose: () => void;
}) {
  const [comment, setComment] = React.useState("");
  const isApprove = action === "approve";
  return (
    <ModalOverlay onClose={onClose} width={460}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: isApprove ? "#d1fae5" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon d={isApprove ? "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"} size={18} color={isApprove ? "#059669" : "#dc2626"} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{isApprove ? "Approve" : "Reject"} Leave Request</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{leave.name} · {leave.type} · {leave.days} day{leave.days > 1 ? "s" : ""}</div>
        </div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "auto" }}>
          <Icon d="M18 6L6 18M6 6l12 12" size={16} color="#64748b" />
        </button>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#475569" }}>
          <strong>Reason:</strong> {leave.reason}<br />
          <strong>Period:</strong> {leave.startDate} → {leave.endDate}
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>Comment {isApprove ? "(optional)" : "(recommended)"}</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={isApprove ? "Add an approval note…" : "Reason for rejection…"}
          rows={3}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", color: "#0f172a", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#475569" }}>Cancel</button>
          <button onClick={() => onConfirm(comment)} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: isApprove ? "#059669" : "#dc2626", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            {isApprove ? "Approve Leave" : "Reject Leave"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ─── Mock data generators ──────────────────────────────────── */
const TEAM_MEMBERS = [
  { name: "Raju Sharma",    role: "Sales",      avatar: "RS", kpi: 68, completion: 72, pitchScore: 74, objectionScore: 62, escalationScore: 81, status: "At Risk" },
  { name: "Priya Mehta",    role: "Sales",      avatar: "PM", kpi: 91, completion: 95, pitchScore: 92, objectionScore: 88, escalationScore: 90, status: "Top Performer" },
  { name: "Arjun Verma",    role: "Support",    avatar: "AV", kpi: 55, completion: 48, pitchScore: 52, objectionScore: 45, escalationScore: 60, status: "Needs Training" },
  { name: "Neha Singh",     role: "Operations", avatar: "NS", kpi: 84, completion: 88, pitchScore: 79, objectionScore: 83, escalationScore: 87, status: "On Track" },
  { name: "Karan Patel",    role: "Sales",      avatar: "KP", kpi: 77, completion: 80, pitchScore: 80, objectionScore: 74, escalationScore: 76, status: "On Track" },
  { name: "Simran Kaur",    role: "Support",    avatar: "SK", kpi: 62, completion: 65, pitchScore: 60, objectionScore: 58, escalationScore: 67, status: "At Risk" },
];

const KPIS = [
  { team: "Sales",      metric: "Conversion Rate",    value: 72,  target: 85,  unit: "%",  trend: -8,  color: "#dc2626" },
  { team: "Support",    metric: "Resolution Time",     value: 4.2, target: 3.0, unit: "hr", trend: 12,  color: "#d97706" },
  { team: "Operations", metric: "Compliance Accuracy", value: 87,  target: 90,  unit: "%",  trend: 3,   color: "#059669" },
];

const ALERTS_DATA = [
  { type: "danger"  as const, title: "KPI Drop — Sales Team",          body: "Conversion rate dropped 12% this week. 3 reps skipped objection handling module.",      time: "2h ago"  },
  { type: "warning" as const, title: "Inactive Learners",               body: "Arjun Verma and Simran Kaur haven't logged in for 5+ days. Nudge recommended.",         time: "4h ago"  },
  { type: "warning" as const, title: "Simulation Overdue",              body: "Sales pitch simulation was scheduled for this week — 4 team members haven't started.",   time: "6h ago"  },
  { type: "info"    as const, title: "Course Deadline Approaching",     body: "Objection Handling Masterclass deadline is in 3 days. 2 employees at 40% completion.",   time: "1d ago"  },
  { type: "success" as const, title: "Priya Mehta — All Modules Done",  body: "Priya completed all assigned modules. She is ready for team lead simulation.",          time: "1d ago"  },
  { type: "info"    as const, title: "Assessment Results Available",    body: "6 employees submitted Quiz #3. Average score: 74%. 2 below passing threshold.",          time: "2d ago"  },
];

/* ─── Attendance & Leave seed data ──────────────────────────────── */
const ATTENDANCE_SEED: AttRow[] = [
  { name: "Raju Sharma",  avatar: "RS", status: "present",  checkIn: "09:05 AM", checkOut: "06:30 PM" },
  { name: "Priya Mehta",  avatar: "PM", status: "present",  checkIn: "08:55 AM", checkOut: "06:15 PM" },
  { name: "Arjun Verma",  avatar: "AV", status: "absent",   checkIn: null,       checkOut: null       },
  { name: "Neha Singh",   avatar: "NS", status: "late",     checkIn: "10:35 AM", checkOut: "07:00 PM" },
  { name: "Karan Patel",  avatar: "KP", status: "on_leave", checkIn: null,       checkOut: null       },
  { name: "Simran Kaur",  avatar: "SK", status: "present",  checkIn: "09:10 AM", checkOut: "06:20 PM" },
];

const WEEKLY_ATT = [
  { day: "Mon", present: 5, absent: 1, late: 0, leave: 0 },
  { day: "Tue", present: 4, absent: 1, late: 1, leave: 0 },
  { day: "Wed", present: 4, absent: 0, late: 1, leave: 1 },
  { day: "Thu", present: 3, absent: 1, late: 1, leave: 1 },
  { day: "Fri", present: 3, absent: 1, late: 0, leave: 2 },
];

function normalizeLeaveDoc(d: MongoLeaveRequestDoc): LeaveRow {
  const name = d.name ?? "";
  const avatar = d.avatar ?? name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const rawStatus = (d.status ?? "pending").toLowerCase();
  const status: LeaveRow["status"] =
    rawStatus === "approved" ? "approved" : rawStatus === "rejected" ? "rejected" : "pending";
  return {
    id: d._id ?? Math.random().toString(36).slice(2),
    name,
    avatar,
    type: d.type ?? "Leave",
    startDate: d.startDate ?? "",
    endDate: d.endDate ?? "",
    days: d.days ?? 0,
    reason: d.reason ?? "",
    status,
    appliedDate: d.appliedDate ?? d.created_at?.slice(0, 10) ?? "",
    comment: d.comment ?? null,
  };
}

const LEAVE_SEED: LeaveRow[] = [
  { id: "lr1", name: "Arjun Verma",  avatar: "AV", type: "Sick Leave",   startDate: "Apr 15, 2025", endDate: "Apr 17, 2025", days: 3, reason: "Fever and flu recovery.",         status: "pending",  appliedDate: "Apr 13, 2025", comment: null },
  { id: "lr2", name: "Karan Patel",  avatar: "KP", type: "Casual Leave", startDate: "Apr 18, 2025", endDate: "Apr 18, 2025", days: 1, reason: "Family function.",                 status: "approved", appliedDate: "Apr 12, 2025", comment: "Approved. Enjoy!" },
  { id: "lr3", name: "Simran Kaur",  avatar: "SK", type: "Earned Leave",  startDate: "Apr 22, 2025", endDate: "Apr 26, 2025", days: 5, reason: "Annual vacation trip.",            status: "pending",  appliedDate: "Apr 11, 2025", comment: null },
  { id: "lr4", name: "Raju Sharma",  avatar: "RS", type: "Sick Leave",   startDate: "Apr 05, 2025", endDate: "Apr 06, 2025", days: 2, reason: "Migraine — doctor visit.",         status: "rejected", appliedDate: "Apr 04, 2025", comment: "Critical deadline week. Please reschedule." },
  { id: "lr5", name: "Neha Singh",   avatar: "NS", type: "Casual Leave", startDate: "Apr 28, 2025", endDate: "Apr 28, 2025", days: 1, reason: "Personal errand.",                  status: "pending",  appliedDate: "Apr 13, 2025", comment: null },
];

const ASSIGNMENTS_SEED: AssignRow[] = [
  { id: "ca1", name: "Raju Sharma",  avatar: "RS", course: "Objection Handling Masterclass",       status: "in_progress", progress: 65,  deadline: "Apr 30, 2025", assignedDate: "Apr 01, 2025" },
  { id: "ca2", name: "Priya Mehta",  avatar: "PM", course: "Sales Fundamentals & Product Mastery", status: "completed",   progress: 100, deadline: "Apr 15, 2025", assignedDate: "Mar 20, 2025" },
  { id: "ca3", name: "Arjun Verma",  avatar: "AV", course: "Escalation Decision Trees",            status: "not_started", progress: 0,   deadline: "Apr 25, 2025", assignedDate: "Apr 05, 2025" },
  { id: "ca4", name: "Neha Singh",   avatar: "NS", course: "SOP Compliance Masterclass",           status: "in_progress", progress: 80,  deadline: "Apr 28, 2025", assignedDate: "Apr 02, 2025" },
  { id: "ca5", name: "Karan Patel",  avatar: "KP", course: "Pitch Simulation — Advanced",          status: "in_progress", progress: 45,  deadline: "Apr 30, 2025", assignedDate: "Apr 01, 2025" },
  { id: "ca6", name: "Simran Kaur",  avatar: "SK", course: "Objection Handling Masterclass",       status: "not_started", progress: 0,   deadline: "Apr 25, 2025", assignedDate: "Apr 05, 2025" },
];

function generateCopilotResponse(question: string, users: UserListOut[], courses: CourseOut[], analytics: TenantAnalyticsOut | null): string {
  const q = question.toLowerCase();

  if (q.includes("training") && (q.includes("who") || q.includes("need") || q.includes("week"))) {
    return `Based on current KPI data and training progress, here are the team members who need training this week:\n\n🔴 Arjun Verma (Support) — completion at 48%, KPI score 55%. Recommend: Escalation Training & Ticket Simulation.\n🟡 Simran Kaur (Support) — completion at 65%, KPI score 62%. Recommend: Objection Handling refresher.\n🟡 Raju Sharma (Sales) — conversion rate dropped 8%. Recommend: Pitch Simulator session.\n\nSuggested action: Schedule a group simulation session for the Support team and assign Raju the Objection Handling module this week.`;
  }
  if (q.includes("kpi") && (q.includes("drop") || q.includes("why") || q.includes("fell") || q.includes("low"))) {
    return `KPI Analysis — Root Cause Report:\n\n📉 Sales Conversion Rate is at 72% (target: 85%) — dropped 8% this week.\nRoot cause: 3 sales reps (Raju, Karan, Simran) skipped the Objection Handling module. CRM data shows calls where objections were raised had a 28% lower close rate.\n\n📈 Support Resolution Time increased to 4.2 hrs (target: 3.0 hrs).\nRoot cause: Arjun Verma and Simran Kaur have not completed the Escalation Decision Tree training. Ticket backlog increased 18% after their last incomplete module.\n\nRecommendation: Assign mandatory refresher courses and block calendar time for simulation practice.`;
  }
  if (q.includes("perform") && (q.includes("summar") || q.includes("team") || q.includes("week") || q.includes("report"))) {
    const total = users.length || 6;
    return `📊 Team Performance Summary — This Week:\n\n• Team Size: ${total} members\n• Average Training Completion: 74.7%\n• Top Performer: Priya Mehta (95% completion, 91 KPI score)\n• Needs Attention: Arjun Verma (48% completion, 55 KPI score)\n• Overall KPI Target Hit Rate: 2 out of 3 teams on track\n\n✅ Wins: Operations team compliance accuracy is at 87% and improving.\n⚠️ Watch: Sales conversion rate is below target. Support resolution time needs improvement.\n\nOverall engagement rate this week: 71% (target >70% — barely met). Recommend gamification nudges to boost participation.`;
  }
  if (q.includes("simulation") || q.includes("roleplay") || q.includes("refresher")) {
    return `Simulation & Refresher Recommendations:\n\n🎭 Pitch Simulator — Assign to:\n• Raju Sharma (pitch score: 74%, dropped from 82%)\n• Karan Patel (pitch score: 80%, stable but room to grow)\n\n🎯 Objection Handling Refresher — Assign to:\n• Arjun Verma (scored 45% on last quiz — below 60% threshold)\n• Simran Kaur (scored 58% — just below passing)\n• Raju Sharma (scored 62% — borderline)\n\n📞 Escalation Simulation — Assign to:\n• Arjun Verma (escalation score: 60% — needs immediate practice)\n• Simran Kaur (67% — needs reinforcement)\n\nSuggested: Schedule a 45-minute group simulation session for the Sales team this Friday. Auto-enroll Arjun and Simran in escalation training.`;
  }
  if (q.includes("next") && (q.includes("action") || q.includes("step") || q.includes("do") || q.includes("recommend"))) {
    return `Top 5 Recommended Actions for This Week:\n\n1️⃣ Assign Objection Handling module to Raju Sharma — conversion rate dropped 8%, directly linked to skipped module.\n\n2️⃣ Schedule Escalation Simulation for Arjun Verma & Simran Kaur — both below KPI threshold, haven't completed escalation training.\n\n3️⃣ Send nudge to 4 employees who haven't started Pitch Simulator — deadline is in 3 days.\n\n4️⃣ Recognize Priya Mehta — completed all modules, recommend her for Team Lead Simulation Track.\n\n5️⃣ Review Support team SOP workflows — resolution time increasing, suggests process knowledge gap alongside training gap.`;
  }
  if (q.includes("complet") || q.includes("course") || q.includes("assigned") || q.includes("done")) {
    return `Course Completion Status:\n\n✅ Completed All Modules:\n• Priya Mehta — 95% completion, all assessments passed\n• Neha Singh — 88% completion, on track\n• Karan Patel — 80% completion, progressing well\n\n⚠️ Partially Complete:\n• Raju Sharma — 72% completion, 2 modules pending\n• Simran Kaur — 65% completion, 3 modules pending\n\n🔴 Behind Schedule:\n• Arjun Verma — 48% completion, requires immediate intervention\n\nAverage team completion: 74.7% (target: >80%). Need to close the gap within this sprint.`;
  }
  if (q.includes("top") || q.includes("best") || q.includes("who is") || q.includes("level")) {
    return `Top Performers & Ready for Advancement:\n\n🏆 Priya Mehta (Sales)\n• Completion: 95% | KPI Score: 91 | All simulations passed\n• Status: Ready for Team Lead Simulation Track\n• Recommendation: Assign advanced leadership training module\n\n🥈 Neha Singh (Operations)\n• Completion: 88% | KPI Score: 84\n• Status: Strong performer, recommend cross-training with Sales basics\n\n🥉 Karan Patel (Sales)\n• Completion: 80% | KPI Score: 77\n• Status: On track, assign Pitch Simulator next to boost conversion rate\n\nSuggestion: Pair Priya as a peer coach with Arjun Verma to accelerate his progress.`;
  }
  // Default intelligent response
  const courseCount = courses.length;
  return `I've analyzed your team's current data. Here's a quick insight:\n\n📚 Active courses: ${courseCount}\n👥 Team members tracked: ${users.length || 6}\n📈 Analytics data: ${analytics ? "Live & synced" : "Loading..."}\n\nYou can ask me things like:\n• "Who needs training this week?"\n• "Why did our KPI drop?"\n• "Summarize team performance"\n• "Who should join a simulation?"\n• "What are the next recommended actions?"\n• "Who completed their courses?"\n• "Who is the top performer?"\n\nI'll analyze real training and KPI data to give you precise, actionable answers.`;
}

/* ─── Attendance Form Modal ──────────────────────────────────── */
function AttendanceFormModal({ existing, onClose, onSaved }: {
  existing: AttendenceDoc | null;
  onClose: () => void;
  onSaved: (doc: AttendenceDoc) => void;
}) {
  const isEdit = !!existing;
  const [form, setForm] = React.useState<AttendenceInput>({
    Name:        existing?.Name        ?? "",
    Role:        existing?.Role        ?? "",
    Status:      existing?.Status      ?? "Present",
    CheckIn:     existing?.["Check In"]    ?? "",
    CheckOut:    existing?.["Check Out"]   ?? "",
    HoursWorked: existing?.["Hours Worked"] ?? "",
    Note:        existing?.Note        ?? "",
    date:        existing?.date        ?? new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  const set = (k: keyof AttendenceInput, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.Name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr("");
    try {
      let doc: AttendenceDoc;
      if (isEdit && existing?._id) {
        doc = await mongoUpdateAttendanceApi(existing._id, form);
      } else {
        doc = await mongoCreateAttendanceApi(form);
      }
      onSaved(doc);
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, color: "#0f172a", fontFamily: "inherit", outline: "none", background: "#fafafa", boxSizing: "border-box" as const };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4, display: "block" as const };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "28px 30px", width: 480, maxWidth: "95vw", boxShadow: "0 20px 60px rgba(15,23,42,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{isEdit ? "Edit Attendance Record" : "Add Attendance Record"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Employee Name *</label>
            <input style={fieldStyle} value={form.Name} onChange={e => set("Name", e.target.value)} placeholder="e.g. Raju Sharma" />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <input style={fieldStyle} value={form.Role || ""} onChange={e => set("Role", e.target.value)} placeholder="e.g. Sales" />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={fieldStyle} value={form.Status} onChange={e => set("Status", e.target.value)}>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Check In</label>
            <input style={fieldStyle} value={form.CheckIn || ""} onChange={e => set("CheckIn", e.target.value)} placeholder="e.g. 9:05 AM" />
          </div>
          <div>
            <label style={labelStyle}>Check Out</label>
            <input style={fieldStyle} value={form.CheckOut || ""} onChange={e => set("CheckOut", e.target.value)} placeholder="e.g. 6:30 PM" />
          </div>
          <div>
            <label style={labelStyle}>Hours Worked</label>
            <input style={fieldStyle} value={form.HoursWorked || ""} onChange={e => set("HoursWorked", e.target.value)} placeholder="e.g. 9.4h" />
          </div>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" style={fieldStyle} value={form.date || ""} onChange={e => set("date", e.target.value)} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={labelStyle}>Note</label>
            <input style={fieldStyle} value={form.Note || ""} onChange={e => set("Note", e.target.value)} placeholder="e.g. On time, Early arrival..." />
          </div>
        </div>

        {err && <div style={{ marginTop: 12, fontSize: 12.5, color: "#dc2626", fontWeight: 600 }}>{err}</div>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#475569" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "10px 22px", borderRadius: 9, background: saving ? "#94a3b8" : "#0891b2", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}>
            {saving ? "Saving…" : isEdit ? "Update" : "Add Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Profile Modal ─────────────────────────────────────────── */
function ProfileModal({
  me, profile, saving, msg,
  onClose, onSave,
}: {
  me: { id: string; full_name: string; role: string; email: string };
  profile: UserProfileDoc | null;
  saving: boolean;
  msg: string | null;
  onClose: () => void;
  onSave: (data: Omit<UserProfileDoc, "_id" | "user_id" | "updated_at">) => void;
}) {
  const [form, setForm] = React.useState({
    full_name: profile?.full_name ?? me.full_name ?? "",
    email: profile?.email ?? me.email ?? "",
    phone: profile?.phone ?? "",
    bio: profile?.bio ?? "",
    avatar_url: profile?.avatar_url ?? "",
    department: profile?.department ?? "",
    title: profile?.title ?? "",
    street: profile?.address?.street ?? "",
    city: profile?.address?.city ?? "",
    state: profile?.address?.state ?? "",
    country: profile?.address?.country ?? "",
    zip: profile?.address?.zip ?? "",
    linkedin: profile?.links?.linkedin ?? "",
    github: profile?.links?.github ?? "",
    website: profile?.links?.website ?? "",
    twitter: profile?.links?.twitter ?? "",
  });

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      full_name: form.full_name || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      bio: form.bio || undefined,
      avatar_url: form.avatar_url || undefined,
      department: form.department || undefined,
      title: form.title || undefined,
      address: {
        street: form.street || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        zip: form.zip || undefined,
      },
      links: {
        linkedin: form.linkedin || undefined,
        github: form.github || undefined,
        website: form.website || undefined,
        twitter: form.twitter || undefined,
      },
    });
  };

  const initials = (form.full_name || me.full_name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13.5, color: "#0f172a", fontFamily: "inherit", background: "#fafafa", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5, display: "block" };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", backdropFilter: "blur(2px)" }}
    >
      <div style={{ width: 480, height: "100vh", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(15,23,42,0.18)", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#0891b2 0%,#0e7490 100%)", padding: "24px 24px 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>My Profile</div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="avatar" style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid rgba(255,255,255,0.5)", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0, border: "3px solid rgba(255,255,255,0.4)" }}>{initials}</div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{form.full_name || me.full_name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{form.title || me.role}</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{form.email || me.email}</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
          {msg && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: msg.includes("saved") ? "#f0fdf4" : "#fef2f2", border: `1px solid ${msg.includes("saved") ? "#bbf7d0" : "#fecaca"}`, color: msg.includes("saved") ? "#15803d" : "#dc2626", fontSize: 13 }}>{msg}</div>
          )}

          {/* Basic Info */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #f1f5f9" }}>Basic Information</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={lbl}>Full Name</label><input style={inp} value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Your full name" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Job Title</label><input style={inp} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Sales Manager" /></div>
                <div><label style={lbl}>Department</label><input style={inp} value={form.department} onChange={e => set("department", e.target.value)} placeholder="e.g. Sales" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Email</label><input style={inp} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@company.com" /></div>
                <div><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 00000 00000" /></div>
              </div>
              <div><label style={lbl}>Bio</label><textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="A short description about yourself…" /></div>
              <div><label style={lbl}>Profile Photo URL</label><input style={inp} value={form.avatar_url} onChange={e => set("avatar_url", e.target.value)} placeholder="https://example.com/photo.jpg" /></div>
            </div>
          </div>

          {/* Address */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #f1f5f9" }}>Address</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={lbl}>Street</label><input style={inp} value={form.street} onChange={e => set("street", e.target.value)} placeholder="123 Main Street" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>City</label><input style={inp} value={form.city} onChange={e => set("city", e.target.value)} placeholder="Mumbai" /></div>
                <div><label style={lbl}>State</label><input style={inp} value={form.state} onChange={e => set("state", e.target.value)} placeholder="Maharashtra" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Country</label><input style={inp} value={form.country} onChange={e => set("country", e.target.value)} placeholder="India" /></div>
                <div><label style={lbl}>PIN / ZIP</label><input style={inp} value={form.zip} onChange={e => set("zip", e.target.value)} placeholder="400001" /></div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #f1f5f9" }}>Links & Social</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={lbl}>LinkedIn</label><input style={inp} value={form.linkedin} onChange={e => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/username" /></div>
              <div><label style={lbl}>GitHub</label><input style={inp} value={form.github} onChange={e => set("github", e.target.value)} placeholder="https://github.com/username" /></div>
              <div><label style={lbl}>Personal Website</label><input style={inp} value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://yoursite.com" /></div>
              <div><label style={lbl}>Twitter / X</label><input style={inp} value={form.twitter} onChange={e => set("twitter", e.target.value)} placeholder="https://twitter.com/username" /></div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: saving ? "#94a3b8" : "#0891b2", color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function ManagerDashboard() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; full_name: string; role: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ManagerTab>("overview");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRowOut[]>([]);
  const [analytics, setAnalytics] = useState<TenantAnalyticsOut | null>(null);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStatsOut | null>(null);
  const [users, setUsers] = useState<UserListOut[]>([]);

  // MongoDB live data
  const [teamProgress, setTeamProgress] = useState<TeamProgressDoc[]>(TEAM_MEMBERS as unknown as TeamProgressDoc[]);
  const [mongoLb, setMongoLb] = useState<LeaderboardDoc[]>([]);
  const [mongoCourses, setMongoCourses] = useState<MongoCourseDoc[]>([]);
  const [mongoLastSync, setMongoLastSync] = useState<Date | null>(null);

  // Modals
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberRow | null>(null);
  const [memberDetail, setMemberDetail] = useState<TeamMemberDetailOut | null>(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [metricsModalType, setMetricsModalType] = useState<MetricsType>("team-members");

  // Attendance
  const [attendanceData, setAttendanceData] = useState<AttRow[]>(ATTENDANCE_SEED);
  const [mongoAttendance, setMongoAttendance] = useState<AttendenceDoc[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "absent" | "late" | "on_leave">("all");
  const [showAttendanceDetail, setShowAttendanceDetail] = useState(false);
  const [attendanceDetailStatus, setAttendanceDetailStatus] = useState<"present" | "absent" | "late" | "on_leave">("present");
  const [showAddAttendanceModal, setShowAddAttendanceModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendenceDoc | null>(null);

  // Leaves
  const [leaveData, setLeaveData] = useState<LeaveRow[]>(LEAVE_SEED);
  const [mongoLeaveLoaded, setMongoLeaveLoaded] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [pendingLeaveAction, setPendingLeaveAction] = useState<{ leave: LeaveRow; action: "approve" | "reject" } | null>(null);

  // Course Assignments
  const [courseAssignments, setCourseAssignments] = useState<AssignRow[]>(ASSIGNMENTS_SEED);
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);

  // Copilot
  const [copilotMessages, setCopilotMessages] = useState<CopilotMsg[]>([
    { role: "ai", text: "Hello! I'm your AI Manager Copilot. I have access to your team's KPIs, training progress, simulation scores, and performance data.\n\nAsk me anything — like \"Who needs training this week?\" or \"Why did our KPI drop?\" and I'll give you precise, data-driven answers.", timestamp: new Date() },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  // Alerts badge
  const unreadAlerts = ALERTS_DATA.filter(a => a.type === "danger" || a.type === "warning").length;

  /* ── Auth & Data Load ──────────────────────────────────────── */
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    const r = localStorage.getItem("user_role");
    if (!t || !r) { router.push("/login"); return; }
    if (r !== "manager") { router.push(`/dashboard/${r}`); return; }
    setToken(t);
  }, [router]);

  const loadData = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const [meRes, courseRes, lbRes, analyticsRes, statsRes, usersRes] = await Promise.all([
        meApi(t),
        coursesApi(t).catch(() => [] as CourseOut[]),
        gamificationLeaderboardApi(t).catch(() => ({ leaderboard: [] as LeaderboardRowOut[] })),
        tenantAnalyticsApi(t).catch(() => null),
        knowledgeStatsApi(t).catch(() => null),
        listUsersApi(t).catch(() => [] as UserListOut[]),
      ]);
      setMe({ id: meRes.id, full_name: meRes.full_name, role: meRes.role, email: meRes.email });
      setCourses(courseRes);
      // Load profile from MongoDB
      mongoGetProfileApi(meRes.id).then(p => setProfile(p)).catch(() => {});
      setLeaderboard(lbRes.leaderboard);
      setAnalytics(analyticsRes);
      setKnowledgeStats(statsRes);
      setUsers(usersRes);

      // Fetch MongoDB courses (admin-created training catalog)
      try {
        const mongoCoursesRes = await mongoListCoursesApi();
        setMongoCourses(mongoCoursesRes);
      } catch { /* non-critical */ }

      // Fetch live MongoDB data (Team_progress + Leaderboard collections)
      try {
        const [tpRaw, lbDocs] = await Promise.all([
          mongoGetTeamProgressApi(),
          mongoGetLeaderboardApi(),
        ]);
        // Normalize field names — MongoDB may have capitalized keys from older seed
        const tpDocs: TeamProgressDoc[] = tpRaw.map((d: any) => ({
          _id:             d._id,
          name:            d.name            ?? d.Name            ?? "",
          role:            d.role            ?? d.Role            ?? "",
          avatar:          d.avatar          ?? d.Avatar          ?? (d.name ?? d.Name ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          kpi:             d.kpi             ?? d["KPI Score (%)"]         ?? 0,
          completion:      d.completion      ?? d["Completion (%)"]        ?? 0,
          pitchScore:      d.pitchScore      ?? d["Pitch Simulation (%)"]  ?? 0,
          objectionScore:  d.objectionScore  ?? d["Objection Handling (%)"] ?? 0,
          escalationScore: d.escalationScore ?? d["Escalation Handling (%)"] ?? 0,
          status:          d.status          ?? d.Status          ?? "On Track",
          created_at:      d.created_at,
          updated_at:      d.updated_at,
        }));
        // Normalize leaderboard field names
        const lbNorm: LeaderboardDoc[] = lbDocs.map((d: any) => ({
          _id:          d._id,
          full_name:    d.full_name    ?? d.Name     ?? "",
          role:         d.role        ?? d.Role     ?? "",
          xp_points:   d.xp_points   ?? d["XP Points"]             ?? 0,
          level:        d.level       ?? d.Level                    ?? 1,
          badges_count: d.badges_count ?? d["Badges Earned"]        ?? 0,
          streak_days:  d.streak_days  ?? d["Learning Streak (days)"] ?? 0,
          completion:   d.completion  ?? d["Completion (%)"]        ?? 0,
          kpi:          d.kpi         ?? d["KPI Score (%)"]         ?? 0,
          created_at:   d.created_at,
          updated_at:   d.updated_at,
        }));
        if (tpDocs.length > 0) setTeamProgress(tpDocs);
        if (lbNorm.length > 0) setMongoLb(lbNorm);

        // Fetch attendance from MongoDB Attendence collection
        const attRaw = await mongoGetAttendanceApi().catch(() => []);
        if (attRaw.length > 0) setMongoAttendance(attRaw);

        // Fetch leave requests from MongoDB Leave_requests collection
        const leaveRaw = await mongoGetLeaveRequestsApi().catch(() => [] as MongoLeaveRequestDoc[]);
        if (leaveRaw.length > 0) {
          setLeaveData(leaveRaw.map(normalizeLeaveDoc));
          setMongoLeaveLoaded(true);
        }
      } catch { /* keep seed defaults */ }

    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (token) loadData(token); }, [token, loadData]);

  // ── MongoDB Auto-Sync (polls all MongoDB collections every 30s) ────
  const syncMongoData = useCallback(async () => {
    try {
      const [mongoCoursesRes, tpRaw, lbDocs, attRaw, leaveRaw] = await Promise.all([
        mongoListCoursesApi(),
        mongoGetTeamProgressApi(),
        mongoGetLeaderboardApi(),
        mongoGetAttendanceApi().catch(() => [] as any[]),
        mongoGetLeaveRequestsApi().catch(() => [] as MongoLeaveRequestDoc[]),
      ]);
      setMongoCourses(mongoCoursesRes);
      const tpDocs: TeamProgressDoc[] = tpRaw.map((d: any) => ({
        _id:             d._id,
        name:            d.name            ?? d.Name            ?? "",
        role:            d.role            ?? d.Role            ?? "",
        avatar:          d.avatar          ?? d.Avatar          ?? (d.name ?? d.Name ?? "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        kpi:             d.kpi             ?? d["KPI Score (%)"]          ?? 0,
        completion:      d.completion      ?? d["Completion (%)"]         ?? 0,
        pitchScore:      d.pitchScore      ?? d["Pitch Simulation (%)"]   ?? 0,
        objectionScore:  d.objectionScore  ?? d["Objection Handling (%)"] ?? 0,
        escalationScore: d.escalationScore ?? d["Escalation Handling (%)"] ?? 0,
        status:          d.status          ?? d.Status          ?? "On Track",
        created_at:      d.created_at,
        updated_at:      d.updated_at,
      }));
      const lbNorm: LeaderboardDoc[] = lbDocs.map((d: any) => ({
        _id:          d._id,
        full_name:    d.full_name    ?? d.Name            ?? "",
        role:         d.role         ?? d.Role            ?? "",
        xp_points:    d.xp_points    ?? d["XP Points"]              ?? 0,
        level:        d.level        ?? d.Level                     ?? 1,
        badges_count: d.badges_count ?? d["Badges Earned"]          ?? 0,
        streak_days:  d.streak_days  ?? d["Learning Streak (days)"] ?? 0,
        completion:   d.completion   ?? d["Completion (%)"]         ?? 0,
        kpi:          d.kpi          ?? d["KPI Score (%)"]          ?? 0,
        created_at:   d.created_at,
        updated_at:   d.updated_at,
      }));
      if (tpDocs.length > 0) setTeamProgress(tpDocs);
      if (lbNorm.length > 0) setMongoLb(lbNorm);
      if (attRaw.length > 0) setMongoAttendance(attRaw);
      if (leaveRaw.length > 0) setLeaveData(leaveRaw.map(normalizeLeaveDoc));
      setMongoLastSync(new Date());
    } catch { /* keep stale data on network error */ }
  }, []);

  const syncMongoRef = React.useRef(syncMongoData);
  useEffect(() => { syncMongoRef.current = syncMongoData; }, [syncMongoData]);

  useEffect(() => {
    const id = setInterval(() => { void syncMongoRef.current(); }, 30_000);
    return () => clearInterval(id);
  }, []);

  /* ── Profile ─────────────────────────────────────────────── */
  async function handleSaveProfile(data: Omit<UserProfileDoc, "_id" | "user_id" | "updated_at">) {
    if (!me) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await mongoUpsertProfileApi(me.id, data);
      setProfile(updated);
      setProfileMsg("Profile saved successfully!");
      setTimeout(() => setProfileMsg(null), 3000);
    } catch {
      setProfileMsg("Failed to save profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  /* ── Copilot ─────────────────────────────────────────────── */
  async function sendCopilotMessage(question: string) {
    if (!question.trim() || copilotLoading) return;
    const userMsg: CopilotMsg = { role: "user", text: question, timestamp: new Date() };
    setCopilotMessages(prev => [...prev, userMsg]);
    setCopilotInput("");
    setCopilotLoading(true);
    await new Promise(r => setTimeout(r, 1100 + Math.random() * 700));
    const aiText = generateCopilotResponse(question, users, courses, analytics);
    const aiMsg: CopilotMsg = { role: "ai", text: aiText, timestamp: new Date() };
    setCopilotMessages(prev => [...prev, aiMsg]);
    setCopilotLoading(false);
  }

  /* ── Handlers ────────────────────────────────────────────── */
  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  async function handleMemberClick(member: TeamMemberRow) {
    setSelectedMember(member);
    setMemberDetail(null);
    setShowMemberDetailModal(true);
    // Try to find the user in the live users list and fetch their details
    const liveUser = users.find(u =>
      u.full_name.toLowerCase() === member.name.toLowerCase() ||
      u.full_name.toLowerCase().includes(member.name.split(" ")[0].toLowerCase())
    );
    if (liveUser && token) {
      setMemberDetailLoading(true);
      try {
        const detail = await getTeamMemberDetailApi(token, liveUser.id);
        setMemberDetail(detail);
      } catch {
        setMemberDetail(null);
      } finally {
        setMemberDetailLoading(false);
      }
    }
  }

  function openMetrics(type: MetricsType) {
    setMetricsModalType(type);
    setShowMetricsModal(true);
  }

  function handleAddMemberSuccess(newMember: UserListOut) {
    setUsers(prev => [...prev, newMember]);
    // Mirror to MongoDB Team_progress collection
    const avatar = newMember.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    mongoCreateTeamProgressApi({
      name: newMember.full_name,
      role: newMember.department || newMember.role || "Employee",
      avatar,
      kpi: 0, completion: 0, pitchScore: 0, objectionScore: 0, escalationScore: 0,
      status: "New",
    }).then(doc => setTeamProgress(prev => [...prev, doc])).catch(() => {});
  }

  async function handleLeaveAction(leaveId: string, action: "approve" | "reject", comment: string) {
    const newStatus = action === "approve" ? "approved" : "rejected";
    setLeaveData(prev => prev.map(l =>
      l.id === leaveId ? { ...l, status: newStatus as LeaveRow["status"], comment } : l
    ));
    setPendingLeaveAction(null);

    // If data came from MongoDB (id is a valid ObjectId hex string), patch there
    if (mongoLeaveLoaded && /^[a-f0-9]{24}$/.test(leaveId)) {
      try {
        await mongoPatchLeaveRequestApi(leaveId, { status: newStatus, comment: comment || null });
      } catch { /* silent */ }
    } else if (token) {
      try {
        if (action === "approve") await approveLeaveApi(token, leaveId, comment);
        else await rejectLeaveApi(token, leaveId, comment);
      } catch { /* silent — local state already updated */ }
    }
  }

  function handleCourseAssigned(newRows: AssignRow[]) {
    setCourseAssignments(prev => [...prev, ...newRows]);
  }

  const initials = me?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "M";

  /* ── NAV ─────────────────────────────────────────────────── */
  const pendingLeaves = leaveData.filter(l => l.status === "pending").length;
  const NAV: { id: ManagerTab; label: string; iconD: string; badge?: number }[] = [
    { id: "overview",    label: "Overview",          iconD: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
    { id: "team",        label: "Team Progress",     iconD: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
    { id: "scorecards",  label: "Skill Scorecards",  iconD: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
    { id: "attendance",  label: "Attendance",        iconD: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" },
    { id: "leaves",      label: "Leave Requests",    iconD: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", badge: pendingLeaves },
    { id: "assignments", label: "Course Assignments",iconD: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
    { id: "copilot",     label: "AI Copilot",        iconD: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { id: "leaderboard", label: "Leaderboard",       iconD: "M18 20V10M12 20V4M6 20v-6" },
    { id: "alerts",      label: "Alerts",            iconD: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0", badge: unreadAlerts },
  ];

  /* ── Loading / Error ─────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f1f5f9", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 44, height: 44, border: "3px solid #e2e8f0", borderTopColor: "#0891b2", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>Loading Manager Dashboard...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f1f5f9", flexDirection: "column", gap: 12 }}>
      <Icon d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={40} color="#dc2626" />
      <div style={{ fontSize: 15, color: "#dc2626", fontWeight: 700 }}>{error}</div>
      <button onClick={() => token && loadData(token)} style={{ padding: "8px 20px", borderRadius: 8, background: "#0891b2", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>Retry</button>
    </div>
  );

  /* ── Render Tabs ─────────────────────────────────────────── */

  /* === OVERVIEW TAB === */
  function renderOverview() {
    const tm = teamProgress.length > 0 ? teamProgress : (TEAM_MEMBERS as unknown as TeamProgressDoc[]);
    const totalMembers = tm.length;
    const avgCompletion = totalMembers > 0 ? Math.round(tm.reduce((a, m) => a + m.completion, 0) / totalMembers) : 0;
    const avgKpi = totalMembers > 0 ? Math.round(tm.reduce((a, m) => a + m.kpi, 0) / totalMembers) : 0;
    const atRisk = tm.filter(m => m.status === "At Risk" || m.status === "Needs Training").length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* KPI stat row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Team Members"    value={totalMembers} iconD="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" accent="#0891b2" onValueClick={() => openMetrics("team-members")} tooltip="Click to view all team members" />
          <StatCard label="Avg Completion"  value={`${avgCompletion}%`} sub="Target: >80%" iconD="M9 11l3 3L22 4" accent="#7c3aed" trend={5} onValueClick={() => openMetrics("completions")} tooltip="Click to view completion details" />
          <StatCard label="Avg KPI Score"   value={`${avgKpi}%`} sub="Across all teams" iconD="M18 20V10M12 20V4M6 20v-6" accent="#059669" trend={-3} onValueClick={() => openMetrics("kpi-risks")} tooltip="Click to view KPI performance" />
          <StatCard label="Needs Attention" value={atRisk} sub="Members at risk" iconD="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" accent="#dc2626" onValueClick={() => openMetrics("needs-attention")} tooltip="Click to see members needing attention" />
        </div>

        {/* KPI Dashboard */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="KPI Dashboard" subtitle="Real-time KPIs linked to training completion" iconD="M18 20V10M12 20V4M6 20v-6" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {KPIS.map(kpi => (
              <div key={kpi.team} style={{ padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{kpi.team}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{kpi.metric}</div>
                  </div>
                  <Trend value={kpi.trend} inverse={kpi.team === "Support"} />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</span>
                  <span style={{ fontSize: 14, color: "#64748b", fontWeight: 600 }}>{kpi.unit}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>/ {kpi.target}{kpi.unit} target</span>
                </div>
                <ProgressBar value={kpi.unit === "hr" ? ((kpi.target / kpi.value) * 100) : kpi.value} color={kpi.color} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Current</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Target: {kpi.target}{kpi.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Loop */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Performance Loop" subtitle="Full cycle: how training connects to real-world KPI impact" iconD="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
          <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 6 }}>
            {[
              { step: "Training",   icon: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z", color: "#0891b2", desc: "Courses, lessons & SOPs" },
              { step: "Simulation", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",                         color: "#7c3aed", desc: "Roleplay & scenario practice" },
              { step: "Real Work",  icon: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 1.24 4.18 2 2 0 0 1 3.22 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6 6l.38-.38a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 17z", color: "#d97706", desc: "Live KPIs from CRM / calls" },
              { step: "AI Analysis",icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z", color: "#059669", desc: "AI correlates training ↔ KPI" },
              { step: "Optimization",icon: "M13 10V3L4 14h7v7l9-11h-7z",                                                             color: "#dc2626", desc: "Re-assign & improve content" },
            ].map((s, i, arr) => (
              <div key={s.step} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 120, padding: "16px 12px", background: s.color + "0d", borderRadius: 12, border: `1px solid ${s.color}30` }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon d={s.icon} size={22} color={s.color} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", textAlign: "center" }}>{s.step}</div>
                  <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", lineHeight: 1.4 }}>{s.desc}</div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ display: "flex", alignItems: "center", margin: "0 8px" }}>
                    <Icon d="M5 12h14M12 5l7 7-7 7" size={20} color="#94a3b8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights strip */}
        <div style={{ background: "linear-gradient(135deg,#0891b2 0%,#0e7490 100%)", border: "none", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>AI Copilot Insight</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>Sales conversion dropped 8% — Arjun needs escalation training immediately. Priya is ready for Team Lead track.</div>
            </div>
          </div>
          <button onClick={() => setActiveTab("copilot")} style={{ padding: "9px 18px", borderRadius: 9, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, flexShrink: 0, backdropFilter: "blur(4px)" }}>
            Ask Copilot
          </button>
        </div>
      </div>
    );
  }

  /* === TEAM PROGRESS TAB === */
  function renderTeamProgress() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader
            title="Team Progress Tracking"
            subtitle="Course completion, assessment scores & simulation results per employee"
            iconD="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            action={
              <button
                onClick={() => setShowAddMemberModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "none", background: "#0891b2", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(8,145,178,0.25)" }}
              >
                <Icon d="M12 5v14M5 12h14" size={15} color="#fff" />
                Add Member
              </button>
            }
          />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Employee", "Role", "KPI Score", "Completion", "Pitch Sim", "Objection", "Escalation", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamProgress.map((m, i) => {
                  const statusColors: Record<string, { color: string; bg: string }> = {
                    "Top Performer": { color: "#059669", bg: "#d1fae5" },
                    "On Track":      { color: "#2563eb", bg: "#dbeafe" },
                    "At Risk":       { color: "#d97706", bg: "#fef3c7" },
                    "Needs Training":{ color: "#dc2626", bg: "#fee2e2" },
                    "New":           { color: "#7c3aed", bg: "#f5f3ff" },
                  };
                  const sc = statusColors[m.status] || { color: "#475569", bg: "#f3f4f6" };
                  return (
                    <tr
                      key={m._id || m.name}
                      style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f0f9ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa")}
                    >
                      <td style={{ padding: "13px 14px" }}>
                        <button
                          onClick={() => handleMemberClick(m as unknown as TeamMemberRow)}
                          title="Click to view member details"
                          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{m.avatar}</div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0891b2", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>{m.name}</span>
                        </button>
                      </td>
                      <td style={{ padding: "13px 14px" }}><Badge label={m.role} color={m.role === "Sales" ? "#7c3aed" : m.role === "Support" ? "#0891b2" : "#059669"} bg={m.role === "Sales" ? "#f5f3ff" : m.role === "Support" ? "#e0f2fe" : "#d1fae5"} /></td>
                      <td style={{ padding: "13px 14px" }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: m.kpi >= 80 ? "#059669" : m.kpi >= 65 ? "#d97706" : "#dc2626" }}>{m.kpi}%</span>
                      </td>
                      <td style={{ padding: "13px 14px", minWidth: 140 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ProgressBar value={m.completion} color={m.completion >= 80 ? "#059669" : m.completion >= 60 ? "#d97706" : "#dc2626"} height={6} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", minWidth: 32 }}>{m.completion}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px" }}><SkillCell score={m.pitchScore} /></td>
                      <td style={{ padding: "13px 14px" }}><SkillCell score={m.objectionScore} /></td>
                      <td style={{ padding: "13px 14px" }}><SkillCell score={m.escalationScore} /></td>
                      <td style={{ padding: "13px 14px" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: sc.color, background: sc.bg, padding: "4px 10px", borderRadius: 99 }}>{m.status}</span>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleMemberClick(m as unknown as TeamMemberRow)} title="View details" style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon d="M9 18l6-6-6-6" size={14} color="#64748b" />
                          </button>
                          {m._id && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Remove ${m.name} from Team Progress?`)) return;
                                try {
                                  await mongoDeleteTeamProgressApi(m._id!);
                                  setTeamProgress(prev => prev.filter(x => x._id !== m._id));
                                } catch { alert("Failed to delete"); }
                              }}
                              title="Remove from MongoDB"
                              style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={13} color="#dc2626" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Live users from DB */}
          {users.filter(u => u.role === "employee").length > 0 && (
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0891b2", marginBottom: 8 }}>
                Live Team Members ({users.filter(u => u.role === "employee").length} from database)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {users.filter(u => u.role === "employee").map(u => (
                  <span key={u.id} style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "#fff", border: "1px solid #bae6fd", color: "#0891b2" }}>
                    {u.full_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Target Banner */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Completion Targets" subtitle="Overall training completion must exceed 80% this sprint" iconD="M9 11l3 3L22 4" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { label: "Training Completion", current: 75, target: 80, color: "#0891b2" },
              { label: "Assessment Pass Rate", current: 68, target: 75, color: "#7c3aed" },
              { label: "Simulation Completion", current: 58, target: 70, color: "#d97706" },
            ].map(t => (
              <div key={t.label} style={{ padding: "16px 18px", borderRadius: 11, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{t.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: t.current >= t.target ? "#059669" : "#dc2626" }}>{t.current}%</span>
                </div>
                <ProgressBar value={t.current} color={t.current >= t.target ? "#059669" : t.color} />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 7 }}>Target: {t.target}% — {t.current >= t.target ? "Achieved" : `${t.target - t.current}% gap`}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* === SKILL SCORECARDS TAB === */
  function renderScorecards() {
    const skills = ["Pitch", "Objection", "Escalation", "SOP", "Communication", "Product Know."];
    const fallbackMatrix: Record<string, number[]> = {
      "Raju Sharma":  [74, 62, 81, 70, 78, 68],
      "Priya Mehta":  [92, 88, 90, 91, 94, 87],
      "Arjun Verma":  [52, 45, 60, 55, 58, 50],
      "Neha Singh":   [79, 83, 87, 90, 82, 88],
      "Karan Patel":  [80, 74, 76, 77, 80, 75],
      "Simran Kaur":  [60, 58, 67, 62, 65, 60],
    };
    const activeMembers = teamProgress.length > 0 ? teamProgress : (TEAM_MEMBERS as unknown as TeamProgressDoc[]);
    const scoreMatrix: Record<string, number[]> = {};
    activeMembers.forEach(m => {
      scoreMatrix[m.name] = fallbackMatrix[m.name] ?? [
        Math.round(m.pitchScore ?? 70), Math.round(m.objectionScore ?? 70),
        Math.round(m.escalationScore ?? 70), Math.round((m.kpi ?? 70)),
        Math.round(m.completion ?? 70), Math.round((m.kpi ?? 70)),
      ];
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Skill Gap Analysis */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="AI Skill Gap Analysis" subtitle="AI-identified gaps — recommended training assignments" iconD="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { skill: "Objection Handling", gap: "High", members: "Arjun Verma, Simran Kaur, Raju Sharma", action: "Assign refresher module", urgency: "danger" as const },
              { skill: "Pitch Simulation",   gap: "Medium", members: "Arjun Verma, Simran Kaur",           action: "Schedule roleplay session", urgency: "warning" as const },
              { skill: "SOP Compliance",     gap: "Medium", members: "Arjun Verma, Raju Sharma",           action: "Assign SOP workflow module", urgency: "warning" as const },
              { skill: "Escalation",         gap: "High", members: "Arjun Verma",                          action: "Escalation decision tree training", urgency: "danger" as const },
              { skill: "Product Knowledge",  gap: "Low",  members: "Arjun Verma, Raju Sharma",             action: "Self-paced product module", urgency: "info" as const },
              { skill: "Communication",      gap: "Low",  members: "Arjun Verma, Simran Kaur",             action: "Communication basics refresher", urgency: "info" as const },
            ].map(g => {
              const cfg = { danger: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" }, warning: { color: "#d97706", bg: "#fffbeb", border: "#fde68a" }, info: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" } }[g.urgency];
              return (
                <div key={g.skill} style={{ padding: "15px 16px", borderRadius: 11, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a" }}>{g.skill}</div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: cfg.color, background: "#fff", padding: "2px 8px", borderRadius: 99, border: `1px solid ${cfg.border}` }}>{g.gap} Gap</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "#475569", marginBottom: 10 }}><strong>Who:</strong> {g.members}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color }}>→ {g.action}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scorecard Grid */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Per-Employee Skill Scorecards" subtitle="Color-coded skill breakdown — green ≥80%, amber 60–79%, red <60%" iconD="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          {activeMembers.map(m => {
            const scores = scoreMatrix[m.name] || [];
            const avg = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
            const avatarStr = m.avatar || m.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={m.name} style={{ marginBottom: 16, padding: "18px 20px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fafafa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{avatarStr}</div>
                  <div style={{ flex: 1 }}>
                    <button onClick={() => handleMemberClick(m as any)} title="Click to view member details" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit", textAlign: "left" }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: "#0891b2", textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>{m.name}</div>
                    </button>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{m.role} — Avg skill score: <strong style={{ color: avg >= 80 ? "#059669" : avg >= 60 ? "#d97706" : "#dc2626" }}>{avg}%</strong></div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: m.status === "Top Performer" ? "#059669" : m.status === "On Track" ? "#2563eb" : m.status === "At Risk" ? "#d97706" : "#dc2626", background: m.status === "Top Performer" ? "#d1fae5" : m.status === "On Track" ? "#dbeafe" : m.status === "At Risk" ? "#fef3c7" : "#fee2e2", padding: "4px 12px", borderRadius: 99 }}>{m.status}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                  {skills.map((sk, i) => (
                    <div key={sk}>
                      <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, marginBottom: 6, textAlign: "center" }}>{sk}</div>
                      <SkillCell score={scores[i] ?? 0} />
                      <div style={{ marginTop: 6 }}><ProgressBar value={scores[i] ?? 0} color={scores[i] >= 80 ? "#059669" : scores[i] >= 60 ? "#d97706" : "#dc2626"} height={4} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* === COPILOT TAB === */
  function renderCopilot() {
    const quickQ = [
      "Who needs training this week?",
      "Why did our KPI drop?",
      "Summarize team performance",
      "Who should join a simulation?",
      "What are the next recommended actions?",
      "Who completed their courses?",
      "Who is the top performer?",
    ];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 160px)" }}>
        {/* Header info */}
        <div style={{ background: "linear-gradient(135deg,#0891b2 0%,#0e7490 100%)", borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: 13, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Manager AI Copilot</div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>Powered by real-time KPI data, training progress & simulation scores. Ask anything about your team.</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", padding: "6px 14px", borderRadius: 99, border: "1px solid rgba(255,255,255,0.25)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Live Data</span>
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 1px 4px rgba(15,23,42,0.05)", minHeight: 0 }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
            {copilotMessages.map((msg, i) => <CopilotBubble key={i} msg={msg} />)}
            {copilotLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" size={15} color="#fff" />
                </div>
                <div style={{ padding: "11px 15px", borderRadius: "14px 14px 14px 4px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", gap: 6, alignItems: "center" }}>
                  {[0, 150, 300].map(delay => (
                    <div key={delay} style={{ width: 8, height: 8, borderRadius: "50%", background: "#0891b2", opacity: 0.7, animation: `bounce 1s ${delay}ms infinite` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Questions */}
          <div style={{ padding: "10px 22px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {quickQ.slice(0, 4).map(q => (
              <button key={q} onClick={() => sendCopilotMessage(q)} style={{ fontSize: 11.5, fontWeight: 600, color: "#0891b2", background: "#e0f2fe", border: "1px solid #bae6fd", padding: "5px 12px", borderRadius: 99, cursor: "pointer", whiteSpace: "nowrap" }}>{q}</button>
            ))}
          </div>
          <div style={{ padding: "0 22px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {quickQ.slice(4).map(q => (
              <button key={q} onClick={() => sendCopilotMessage(q)} style={{ fontSize: 11.5, fontWeight: 600, color: "#0891b2", background: "#e0f2fe", border: "1px solid #bae6fd", padding: "5px 12px", borderRadius: 99, cursor: "pointer", whiteSpace: "nowrap" }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "12px 22px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10 }}>
            <input
              value={copilotInput}
              onChange={e => setCopilotInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendCopilotMessage(copilotInput)}
              placeholder="Ask about your team — e.g. 'Who needs training this week?'"
              style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", fontFamily: "inherit", background: "#fafafa" }}
            />
            <button onClick={() => sendCopilotMessage(copilotInput)} disabled={copilotLoading || !copilotInput.trim()} style={{ padding: "11px 20px", borderRadius: 10, background: copilotLoading || !copilotInput.trim() ? "#94a3b8" : "#0891b2", color: "#fff", border: "none", cursor: copilotLoading || !copilotInput.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <Icon d="M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z" size={16} color="#fff" />
              Send
            </button>
          </div>
        </div>

        <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
      </div>
    );
  }

  /* === LEADERBOARD TAB === */
  function renderLeaderboard() {
    type LbRow = { user_id: string; full_name: string; level: number; xp_points: number; badges_count: number; streak_days: number };
    const lb: LbRow[] = mongoLb.length > 0
      ? mongoLb.map((r) => ({ user_id: r._id ?? String(Math.random()), full_name: r.full_name, level: r.level, xp_points: r.xp_points, badges_count: r.badges_count, streak_days: r.streak_days }))
      : leaderboard.length > 0
        ? leaderboard.map((r, i) => ({ user_id: r.user_id, full_name: r.full_name, level: r.level, xp_points: r.xp_points, badges_count: r.badges_count, streak_days: i + 1 }))
        : TEAM_MEMBERS.map((m, i) => ({ user_id: String(i), full_name: m.name, level: Math.floor(m.kpi / 20) + 1, xp_points: m.kpi * 12, badges_count: Math.floor(m.completion / 25), streak_days: Math.floor(m.completion / 10) + 1 }));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Engagement stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Team Engagement"   value="71%"  sub="Target: >70%"  iconD="M13 10V3L4 14h7v7l9-11h-7z" accent="#059669" trend={4}  />
          <StatCard label="Avg XP Points"     value="842"  sub="This month"     iconD="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" accent="#d97706" trend={12} />
          <StatCard label="Active Streaks"    value="4"    sub="Members >7 days" iconD="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" accent="#7c3aed" />
          <StatCard label="Micro-learning"    value="89"   sub="Sessions this week" iconD="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" accent="#0891b2" trend={8}  />
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Team Leaderboard" subtitle="Gamification rankings — XP points, badges & learning streaks" iconD="M18 20V10M12 20V4M6 20v-6" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lb.map((row, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isTop3 = i < 3;
              return (
                <div key={row.user_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 11, background: isTop3 ? (i === 0 ? "#fffbeb" : i === 1 ? "#f8fafc" : "#fdf4ff") : "#fafafa", border: `1px solid ${isTop3 ? (i === 0 ? "#fde68a" : i === 1 ? "#e2e8f0" : "#e9d5ff") : "#f1f5f9"}` }}>
                  <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", fontSize: i < 3 ? 22 : 14, fontWeight: 800, color: "#64748b", flexShrink: 0 }}>
                    {i < 3 ? medals[i] : `#${i + 1}`}
                  </div>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {row.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{row.full_name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Level {row.level} · {row.badges_count} badges · {row.streak_days}d streak</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: i === 0 ? "#d97706" : "#0891b2" }}>{row.xp_points?.toLocaleString() ?? 0}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>XP POINTS</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* === ALERTS TAB === */
  function renderAlerts() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <StatCard label="Critical Alerts"   value={ALERTS_DATA.filter(a => a.type === "danger").length}  iconD="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" accent="#dc2626" />
          <StatCard label="Warnings"          value={ALERTS_DATA.filter(a => a.type === "warning").length} iconD="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" accent="#d97706" />
          <StatCard label="Info / Updates"    value={ALERTS_DATA.filter(a => a.type === "info" || a.type === "success").length} iconD="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" accent="#2563eb" />
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Notifications & Alerts" subtitle="KPI drops, inactivity alerts, deadlines & simulation reminders" iconD="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Critical & Warnings</div>
            {ALERTS_DATA.filter(a => a.type === "danger" || a.type === "warning").map((a, i) => <AlertItem key={i} {...a} />)}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Info & Updates</div>
            {ALERTS_DATA.filter(a => a.type === "info" || a.type === "success").map((a, i) => <AlertItem key={i} {...a} />)}
          </div>
        </div>

        {/* Notification Channels */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Notification Delivery Channels" subtitle="How alerts are sent to managers and team members" iconD="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 1.24 4.18 2 2 0 0 1 3.22 2h3a2 2 0 0 1 2 1.72" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { channel: "Email", desc: "Daily digest + critical alerts", status: "Active", color: "#2563eb", iconD: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
              { channel: "WhatsApp", desc: "Instant KPI drop notifications", status: "Active", color: "#059669", iconD: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
              { channel: "Push Notification", desc: "Simulation reminders & deadlines", status: "Active", color: "#7c3aed", iconD: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" },
            ].map(ch => (
              <div key={ch.channel} style={{ padding: "16px 18px", borderRadius: 11, border: "1px solid #e2e8f0", background: "#fafafa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: ch.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon d={ch.iconD} size={18} color={ch.color} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{ch.channel}</div>
                </div>
                <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 10 }}>{ch.desc}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "3px 10px", borderRadius: 99 }}>{ch.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* === ATTENDANCE TAB === */
  function renderAttendance() {
    // Use live MongoDB data; fall back to seed data if MongoDB not loaded yet
    const liveRows: AttendenceDoc[] = mongoAttendance.length > 0 ? mongoAttendance : [];
    const seedFallback = liveRows.length === 0;

    // Status normalizer: MongoDB stores "Present"/"Absent"/"Late"/"On Leave"
    const normStatus = (s: string): "present" | "absent" | "late" | "on_leave" => {
      const lower = (s || "").toLowerCase().replace(" ", "_").replace("-", "_");
      if (lower === "on_leave") return "on_leave";
      if (lower === "late") return "late";
      if (lower === "absent") return "absent";
      return "present";
    };

    const attStatusCfg: Record<string, { label: string; color: string; bg: string }> = {
      present:  { label: "Present",  color: "#059669", bg: "#d1fae5" },
      absent:   { label: "Absent",   color: "#dc2626", bg: "#fee2e2" },
      late:     { label: "Late",     color: "#d97706", bg: "#fef3c7" },
      on_leave: { label: "On Leave", color: "#7c3aed", bg: "#f5f3ff" },
    };

    // Combine MongoDB rows with status filter
    const allRows = seedFallback
      ? attendanceData.map(r => ({ status: r.status, name: r.name, checkIn: r.checkIn, checkOut: r.checkOut, hours: null as string | null, note: null as string | null, _id: undefined as string | undefined, Role: "" }))
      : liveRows.map(d => ({
          _id: d._id,
          name: d.Name,
          Role: d.Role || "",
          status: normStatus(d.Status),
          checkIn: (d["Check In"] && d["Check In"] !== "Ab" && d["Check In"] !== "Ap") ? d["Check In"] : null,
          checkOut: (d["Check Out"] && d["Check Out"] !== "Ab" && d["Check Out"] !== "Ap") ? d["Check Out"] : null,
          hours: d["Hours Worked"] || null,
          note: d.Note || null,
        }));

    const present  = allRows.filter(r => r.status === "present").length;
    const absent   = allRows.filter(r => r.status === "absent").length;
    const late     = allRows.filter(r => r.status === "late").length;
    const onLeave  = allRows.filter(r => r.status === "on_leave").length;
    const total    = allRows.length || 1;

    const filtered = attendanceFilter === "all" ? allRows : allRows.filter(r => r.status === attendanceFilter);

    // Weekly summary derived from live data
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const weekSummary = days.map((day, idx) => {
      if (liveRows.length === 0) return WEEKLY_ATT[idx] || { day, present: 0, absent: 0, late: 0, leave: 0 };
      // For today's slot use live counts; other days use static data augmented with live total
      const isToday = idx === Math.min(new Date().getDay() - 1, 4);
      return isToday
        ? { day, present, absent, late, leave: onLeave }
        : { ...(WEEKLY_ATT[idx] || { day, present: 0, absent: 0, late: 0, leave: 0 }), day };
    });

    const handleDeleteAttendance = async (id: string, name: string) => {
      if (!confirm(`Remove attendance record for ${name}?`)) return;
      try {
        await mongoDeleteAttendanceApi(id);
        setMongoAttendance(prev => prev.filter(d => d._id !== id));
      } catch { alert("Failed to delete attendance record"); }
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <StatCard label="Present"  value={present}  sub={`${Math.round((present / total) * 100)}% of team`}  iconD="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" accent="#059669"
            onValueClick={() => { setAttendanceDetailStatus("present");  setShowAttendanceDetail(true); }} tooltip="Click to see who is present" />
          <StatCard label="Absent"   value={absent}   sub={`${Math.round((absent / total) * 100)}% of team`}   iconD="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" accent="#dc2626"
            onValueClick={() => { setAttendanceDetailStatus("absent");   setShowAttendanceDetail(true); }} tooltip="Click to see who is absent" />
          <StatCard label="Late"     value={late}     sub="Arrived after 9:30 AM" iconD="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" accent="#d97706"
            onValueClick={() => { setAttendanceDetailStatus("late");     setShowAttendanceDetail(true); }} tooltip="Click to see late arrivals" />
          <StatCard label="On Leave" value={onLeave}  sub="Approved leave today"  iconD="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" accent="#7c3aed"
            onValueClick={() => { setAttendanceDetailStatus("on_leave"); setShowAttendanceDetail(true); }} tooltip="Click to see employees on leave" />
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader
            title="Today's Attendance"
            subtitle={`${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}${liveRows.length > 0 ? " · Live MongoDB" : " · Seed data"}`}
            iconD="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
            action={
              <button onClick={() => setShowAddAttendanceModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 15px", borderRadius: 8, background: "#0891b2", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                <Icon d="M12 5v14M5 12h14" size={14} color="#fff" /> Add Record
              </button>
            }
          />
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {(["all", "present", "absent", "late", "on_leave"] as const).map(f => (
              <button key={f} onClick={() => setAttendanceFilter(f)}
                style={{ padding: "6px 14px", borderRadius: 99, border: `1.5px solid ${attendanceFilter === f ? "#0891b2" : "#e2e8f0"}`, background: attendanceFilter === f ? "#e0f2fe" : "#fafafa", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: attendanceFilter === f ? "#0891b2" : "#64748b" }}>
                {f === "all" ? "All" : f === "on_leave" ? "On Leave" : f.charAt(0).toUpperCase() + f.slice(1)}
                {f !== "all" && (
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: attendanceFilter === f ? "#0891b2" : "#94a3b8" }}>
                    ({allRows.filter(r => r.status === f).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Employee", "Role", "Status", "Check In", "Check Out", "Hours", "Note", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#94a3b8", fontSize: 13 }}>No records found</td></tr>
                )}
                {filtered.map((r, i) => {
                  const cfg = attStatusCfg[r.status];
                  const avatarStr = (r.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={r._id || r.name + i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{avatarStr}</div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{r.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 13, color: "#475569" }}>{r.Role || "—"}</td>
                      <td style={{ padding: "13px 14px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "4px 11px", borderRadius: 99 }}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 13, color: r.checkIn ? "#0f172a" : "#94a3b8" }}>{r.checkIn || "—"}</td>
                      <td style={{ padding: "13px 14px", fontSize: 13, color: r.checkOut ? "#0f172a" : "#94a3b8" }}>{r.checkOut || "—"}</td>
                      <td style={{ padding: "13px 14px", fontSize: 13, fontWeight: 700, color: r.hours ? "#0891b2" : "#94a3b8" }}>{r.hours || "—"}</td>
                      <td style={{ padding: "13px 14px", fontSize: 12, color: "#64748b", maxWidth: 180 }}>{r.note || "—"}</td>
                      <td style={{ padding: "13px 14px" }}>
                        {r._id && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button title="Edit" onClick={() => { const orig = mongoAttendance.find(d => d._id === r._id); if (orig) setEditingAttendance(orig); }}
                              style={{ padding: "5px 10px", borderRadius: 7, background: "#eff6ff", border: "1px solid #bfdbfe", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#2563eb" }}>Edit</button>
                            <button title="Delete" onClick={() => handleDeleteAttendance(r._id!, r.name)}
                              style={{ padding: "5px 10px", borderRadius: 7, background: "#fef2f2", border: "1px solid #fecaca", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#dc2626" }}>Del</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Weekly summary — computed from live MongoDB data */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Weekly Attendance Summary" subtitle="Day-by-day breakdown · today's slot uses live MongoDB counts" iconD="M18 20V10M12 20V4M6 20v-6" />
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {weekSummary.map(d => {
              const dayTotal = d.present + d.absent + d.late + d.leave || 1;
              return (
                <div key={d.day} style={{ flex: 1, minWidth: 90, padding: "14px 10px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fafafa", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{d.day}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                    {[
                      { label: "Present", val: d.present, color: "#059669" },
                      { label: "Absent",  val: d.absent,  color: "#dc2626" },
                      { label: "Late",    val: d.late,    color: "#d97706" },
                      { label: "Leave",   val: d.leave,   color: "#7c3aed" },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <span style={{ fontSize: 10.5, color: "#94a3b8", width: 44 }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: item.color }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 4, width: "100%" }}>
                    <ProgressBar value={d.present} max={dayTotal} color="#059669" height={5} />
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{Math.round((d.present / dayTotal) * 100)}% present</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add / Edit Attendance Modal */}
        {(showAddAttendanceModal || editingAttendance) && (
          <AttendanceFormModal
            existing={editingAttendance}
            onClose={() => { setShowAddAttendanceModal(false); setEditingAttendance(null); }}
            onSaved={(doc) => {
              if (editingAttendance) {
                setMongoAttendance(prev => prev.map(d => d._id === doc._id ? doc : d));
              } else {
                setMongoAttendance(prev => [...prev, doc]);
              }
              setShowAddAttendanceModal(false);
              setEditingAttendance(null);
            }}
          />
        )}
      </div>
    );
  }

  /* === LEAVE APPROVAL TAB === */
  function renderLeaves() {
    const pending  = leaveData.filter(l => l.status === "pending").length;
    const approved = leaveData.filter(l => l.status === "approved").length;
    const rejected = leaveData.filter(l => l.status === "rejected").length;

    const filtered = leaveFilter === "all" ? leaveData : leaveData.filter(l => l.status === leaveFilter);

    const leaveCfg: Record<string, { color: string; bg: string; border: string }> = {
      pending:  { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
      approved: { color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
      rejected: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <StatCard label="Pending Approval" value={pending}  sub="Awaiting your review" iconD="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" accent="#d97706" />
          <StatCard label="Approved"         value={approved} sub="This month"           iconD="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"     accent="#059669" />
          <StatCard label="Rejected"         value={rejected} sub="This month"           iconD="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" accent="#dc2626" />
        </div>

        {/* Cards */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Leave Requests" subtitle="Approve or reject requests from your team" iconD="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            {(["all", "pending", "approved", "rejected"] as const).map(f => (
              <button key={f} onClick={() => setLeaveFilter(f)}
                style={{ padding: "6px 14px", borderRadius: 99, border: `1.5px solid ${leaveFilter === f ? "#0891b2" : "#e2e8f0"}`, background: leaveFilter === f ? "#e0f2fe" : "#fafafa", cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: leaveFilter === f ? "#0891b2" : "#64748b" }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 800, color: leaveFilter === f ? "#0891b2" : "#94a3b8" }}>
                  ({f === "all" ? leaveData.length : leaveData.filter(l => l.status === f).length})
                </span>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontSize: 14 }}>No leave requests found</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(leave => {
              const cfg = leaveCfg[leave.status];
              return (
                <div key={leave.id} style={{ padding: "16px 20px", borderRadius: 12, border: `1px solid ${cfg.border}`, background: cfg.bg }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{leave.avatar}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{leave.name}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color, background: "#fff", padding: "2px 9px", borderRadius: 99, border: `1px solid ${cfg.border}` }}>{leave.status.toUpperCase()}</span>
                          <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>{leave.type}</span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#475569", marginTop: 4 }}>
                          {leave.startDate} → {leave.endDate} &nbsp;·&nbsp; <strong>{leave.days} day{leave.days > 1 ? "s" : ""}</strong>
                        </div>
                        <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3 }}>
                          <strong>Reason:</strong> {leave.reason}
                        </div>
                        {leave.comment && (
                          <div style={{ fontSize: 12, color: "#475569", marginTop: 4, background: "rgba(255,255,255,0.7)", padding: "5px 10px", borderRadius: 7 }}>
                            <strong>Manager note:</strong> {leave.comment}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Applied: {leave.appliedDate}</div>
                      </div>
                    </div>
                    {leave.status === "pending" && (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0, marginTop: 4 }}>
                        <button
                          onClick={() => setPendingLeaveAction({ leave, action: "approve" })}
                          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon d="M9 12l2 2 4-4" size={13} color="#fff" /> Approve
                        </button>
                        <button
                          onClick={() => setPendingLeaveAction({ leave, action: "reject" })}
                          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon d="M18 6L6 18M6 6l12 12" size={13} color="#fff" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* === COURSE ASSIGNMENT TAB === */
  function renderCourseAssignment() {
    const notStarted = courseAssignments.filter(a => a.status === "not_started").length;
    const inProgress = courseAssignments.filter(a => a.status === "in_progress").length;
    const completed  = courseAssignments.filter(a => a.status === "completed").length;

    const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
      not_started: { label: "Not Started", color: "#94a3b8", bg: "#f1f5f9" },
      in_progress: { label: "In Progress", color: "#d97706", bg: "#fef3c7" },
      completed:   { label: "Completed",   color: "#059669", bg: "#d1fae5" },
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <StatCard label="Not Started" value={notStarted} sub="Need follow-up" iconD="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" accent="#94a3b8" />
          <StatCard label="In Progress" value={inProgress} sub="Currently active"  iconD="M13 10V3L4 14h7v7l9-11h-7z"                          accent="#d97706" />
          <StatCard label="Completed"   value={completed}  sub="Course finished"   iconD="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"   accent="#059669" />
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader
            title="Course Assignments"
            subtitle="Track all assigned courses and their completion progress"
            iconD="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
            action={
              <button
                onClick={() => setShowAssignCourseModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 9, border: "none", background: "#0891b2", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: "0 2px 8px rgba(8,145,178,0.25)" }}>
                <Icon d="M12 5v14M5 12h14" size={15} color="#fff" />
                Assign Course
              </button>
            }
          />

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Employee", "Course", "Status", "Progress", "Deadline", "Assigned"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courseAssignments.map((a, i) => {
                  const cfg = statusCfg[a.status];
                  const isOverdue = a.status !== "completed" && new Date(a.deadline) < new Date();
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "13px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{a.avatar}</div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 13, color: "#0f172a", maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{a.course}</div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: "4px 10px", borderRadius: 99 }}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: "13px 14px", minWidth: 130 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ProgressBar value={a.progress} color={a.status === "completed" ? "#059669" : a.progress >= 50 ? "#d97706" : "#dc2626"} height={6} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", minWidth: 32 }}>{a.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 14px" }}>
                        <span style={{ fontSize: 12.5, color: isOverdue ? "#dc2626" : "#475569", fontWeight: isOverdue ? 700 : 400 }}>
                          {isOverdue && "⚠ "}{a.deadline}
                        </span>
                      </td>
                      <td style={{ padding: "13px 14px", fontSize: 12.5, color: "#64748b" }}>{a.assignedDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Progress overview */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 4px rgba(15,23,42,0.05)" }}>
          <SectionHeader title="Course Progress Overview" subtitle="Completion rates across all assignments" iconD="M9 11l3 3L22 4" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Completed",   value: completed,  total: courseAssignments.length, color: "#059669" },
              { label: "In Progress", value: inProgress, total: courseAssignments.length, color: "#d97706" },
              { label: "Not Started", value: notStarted, total: courseAssignments.length, color: "#dc2626" },
            ].map(item => (
              <div key={item.label} style={{ padding: "12px 16px", borderRadius: 10, border: "1px solid #f1f5f9", background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.value} / {item.total} ({Math.round((item.value / item.total) * 100)}%)</span>
                </div>
                <ProgressBar value={item.value} max={item.total} color={item.color} height={7} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Layout ──────────────────────────────────────────────── */
  const tabContent: Record<ManagerTab, () => React.ReactNode> = {
    overview:    renderOverview,
    team:        renderTeamProgress,
    scorecards:  renderScorecards,
    copilot:     renderCopilot,
    leaderboard: renderLeaderboard,
    alerts:      renderAlerts,
    attendance:  renderAttendance,
    leaves:      renderLeaves,
    assignments: renderCourseAssignment,
  };

  const tabTitles: Record<ManagerTab, { title: string; sub: string }> = {
    overview:    { title: "Manager Dashboard",        sub: "Real-time KPIs, performance loop & AI insights" },
    team:        { title: "Team Progress",            sub: "Training completion, assessments & simulation scores" },
    scorecards:  { title: "Skill Scorecards",         sub: "Per-employee skill breakdown & AI gap analysis" },
    copilot:     { title: "AI Manager Copilot",       sub: "Ask anything about your team — powered by live data" },
    leaderboard: { title: "Leaderboard & Engagement", sub: "Gamification, XP points & learning streaks" },
    alerts:      { title: "Notifications & Alerts",   sub: "KPI drops, inactivity, deadlines & simulation reminders" },
    attendance:  { title: "Attendance Management",    sub: "Daily attendance tracking, status filters & weekly summary" },
    leaves:      { title: "Leave Approval Workflow",  sub: "Review, approve or reject leave requests from your team" },
    assignments: { title: "Course Assignments",       sub: "Assign courses to team members and track completion progress" },
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9", fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", color: "#0f172a" }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        button { font-family: inherit; }
        input, textarea { font-family: inherit; }
      `}</style>

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <div style={{ width: 248, flexShrink: 0, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 18px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#0891b2 0%,#0e7490 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>AI LMS</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#0891b2", textTransform: "uppercase", letterSpacing: "0.07em" }}>Manager Portal</div>
          </div>
        </div>

        {/* User pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", margin: "10px 10px 4px", background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{initials}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{me?.full_name || "Manager"}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#0891b2", textTransform: "uppercase", letterSpacing: "0.05em" }}>Manager</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 8px 4px", marginTop: 4 }}>Navigation</div>
          {NAV.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", marginBottom: 2, borderRadius: 9, border: "none", background: isActive ? "#e0f2fe" : "transparent", cursor: "pointer", fontSize: 13.5, fontWeight: isActive ? 700 : 500, color: isActive ? "#0891b2" : "#475569", textAlign: "left", position: "relative", transition: "all 0.15s" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: isActive ? "#bae6fd" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon d={item.iconD} size={15} color={isActive ? "#0891b2" : "#64748b"} />
                </div>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: "#dc2626", padding: "1px 6px", borderRadius: 99, minWidth: 18, textAlign: "center" }}>{item.badge}</span>
                )}
                {isActive && <div style={{ position: "absolute", right: 10, width: 6, height: 6, borderRadius: "50%", background: "#0891b2" }} />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button onClick={logout} style={{ margin: "8px 10px 18px", display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 8, border: "1px solid #fee2e2", background: "#fff5f5", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#ef4444", width: "calc(100% - 20px)" }}>
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={16} color="#ef4444" />
          Sign Out
        </button>
      </div>

      {/* ── Main Area ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{tabTitles[activeTab].title}</h1>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{tabTitles[activeTab].sub}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* MongoDB live-sync indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#64748b", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
              {mongoLastSync
                ? `Synced ${mongoLastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Live sync active"}
            </div>
            {/* Knowledge stat pills */}
            {knowledgeStats && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: "#f0f9ff", border: "1px solid #bae6fd", fontSize: 12, fontWeight: 600, color: "#0891b2" }}>
                <Icon d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" size={14} color="#0891b2" />
                {knowledgeStats.total_items} Knowledge Items
              </div>
            )}
            {courses.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: "#fdf4ff", border: "1px solid #e9d5ff", fontSize: 12, fontWeight: 600, color: "#7c3aed" }}>
                <Icon d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" size={14} color="#7c3aed" />
                {courses.length} Courses
              </div>
            )}
            <button onClick={() => setActiveTab("alerts")} style={{ position: "relative", width: 36, height: 36, borderRadius: 9, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" size={17} color="#64748b" />
              {unreadAlerts > 0 && <span style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "50%", background: "#dc2626", border: "2px solid #fff" }} />}
            </button>
            <button onClick={() => token && loadData(token)} style={{ width: 36, height: 36, borderRadius: 9, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" size={17} color="#64748b" />
            </button>
            {/* Profile button */}
            <button onClick={() => setShowProfileModal(true)} title="My Profile" style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#0891b2,#0e7490)", border: "2px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 28px", flex: 1, overflowY: "auto" }}>
          {tabContent[activeTab]()}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showMetricsModal && (
        <MetricsModal
          type={metricsModalType}
          members={(teamProgress.length > 0 ? teamProgress : TEAM_MEMBERS) as unknown as TeamMemberRow[]}
          onClose={() => setShowMetricsModal(false)}
          onMemberClick={m => { setShowMetricsModal(false); handleMemberClick(m); }}
        />
      )}
      {showAddMemberModal && token && (
        <AddMemberModal
          token={token}
          onClose={() => setShowAddMemberModal(false)}
          onSuccess={handleAddMemberSuccess}
        />
      )}
      {showMemberDetailModal && (
        <MemberDetailModal
          member={selectedMember}
          detail={memberDetail}
          detailLoading={memberDetailLoading}
          onClose={() => { setShowMemberDetailModal(false); setSelectedMember(null); setMemberDetail(null); }}
        />
      )}
      {showAttendanceDetail && (
        <AttendanceDetailModal
          status={attendanceDetailStatus}
          rows={mongoAttendance.length > 0
            ? mongoAttendance.map(d => ({
                name: d.Name,
                avatar: d.Name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
                status: ((): "present" | "absent" | "late" | "on_leave" => {
                  const s = (d.Status || "").toLowerCase().replace(" ", "_");
                  if (s === "on_leave") return "on_leave";
                  if (s === "late") return "late";
                  if (s === "absent") return "absent";
                  return "present";
                })(),
                checkIn: (d["Check In"] && d["Check In"] !== "Ab" && d["Check In"] !== "Ap") ? d["Check In"] : null,
                checkOut: (d["Check Out"] && d["Check Out"] !== "Ab" && d["Check Out"] !== "Ap") ? d["Check Out"] : null,
              }))
            : attendanceData}
          onClose={() => setShowAttendanceDetail(false)}
        />
      )}
      {pendingLeaveAction && (
        <LeaveConfirmModal
          leave={pendingLeaveAction.leave}
          action={pendingLeaveAction.action}
          onConfirm={(comment) => handleLeaveAction(pendingLeaveAction.leave.id, pendingLeaveAction.action, comment)}
          onClose={() => setPendingLeaveAction(null)}
        />
      )}
      {showAssignCourseModal && token && (
        <AssignCourseModal
          mongoCourses={mongoCourses}
          pgCourses={courses}
          teamMembers={(teamProgress.length > 0 ? teamProgress : TEAM_MEMBERS) as unknown as typeof TEAM_MEMBERS}
          token={token}
          onClose={() => setShowAssignCourseModal(false)}
          onSuccess={(rows) => { handleCourseAssigned(rows); setShowAssignCourseModal(false); }}
        />
      )}
      {showProfileModal && me && (
        <ProfileModal
          me={me}
          profile={profile}
          saving={profileSaving}
          msg={profileMsg}
          onClose={() => setShowProfileModal(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}
