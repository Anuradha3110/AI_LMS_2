"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  assessmentQuestionsApi,
  assessmentsApi,
  completeLessonApi,
  coursesApi,
  createBlueprintApi,
  generateLmsApi,
  jobStatusApi,
  ingestKpiApi,
  gamificationMeApi,
  gamificationLeaderboardApi,
  integrationsWebhooksApi,
  createWebhookApi,
  createBlueprintFromKnowledgeApi,
  lessonsApi,
  knowledgeItemsApi,
  knowledgeStatsApi,
  listBlueprintsApi,
  meApi,
  modulesApi,
  nextLessonRecommendationsApi,
  submitAssessmentApi,
  tutorFeedbackApi,
  startSimulationApi,
  submitSimulationApi,
  tenantAnalyticsApi,
  syncTenantDataApi,
  tenantProfileApi,
  simulationAttemptApi,
  upsertTenantProfileApi,
  createCourseApi,
  updateCourseApi,
  publishCourseApi,
  createModuleApi,
  createLessonApi,
  createModuleAssessmentApi,
  listModuleAssessmentsApi,
  addAssessmentQuestionApi,
  createAssignmentApi,
  listModuleAssignmentsApi,
  enrollUserApi,
  listCourseEnrollmentsApi,
  listUsersApi,
  listCourseFeedbackApi,
  selfEnrollApi,
  issueCertificateApi,
  listMyCertificatesApi,
  type AssessmentOut,
  type AssessmentQuestionOut,
  type AssignmentOut,
  type BlueprintOut,
  type CertificateOut,
  type CourseFeedbackOut,
  type CourseOut,
  type EnrollmentOut,
  type KpiIngestOut,
  type LessonOut,
  type ModuleOut,
  type NextLessonRecommendationOut,
  type TutorFeedbackOut,
  type JobStatusOut,
  type GamificationProfileOut,
  type LeaderboardRowOut,
  type UserListOut,
  type WebhookOut,
  type SimulationScenarioOut,
  type SimulationAttemptOut,
  type KnowledgeStatsOut,
  type KnowledgeItemOut,
  type TenantProfileOut,
  type TenantAnalyticsOut,
  // ─── New imports ───────────────────────────────────────────────
  listApiKeysApi, createApiKeyApi, revokeApiKeyApi, type ApiKeyOut,
  listEmbedConfigsApi, createEmbedConfigApi, type EmbedConfigOut,
  listAuditLogsApi, type AuditLogOut,
  listQuestionBankApi, createBankQuestionApi, deleteBankQuestionApi, type QuestionBankOut,
  listWebsiteSourcesApi, createWebsiteSourceApi, triggerSourceSyncApi, type WebsiteSourceOut,
  listLearningPathsApi, createLearningPathApi, type LearningPathOut,
  listNotificationsApi, markNotificationReadApi, markAllNotificationsReadApi, type NotificationOut,
  listDepartmentsApi, createDepartmentApi, type DepartmentOut,
  listBadgeDefinitionsApi, createBadgeDefinitionApi, type BadgeDefinitionOut,
  listXpHistoryApi, type XpTransactionOut,
  listAdaptiveRulesApi, createAdaptiveRuleApi, deleteAdaptiveRuleApi, type AdaptiveRuleOut,
  getAiUsageSummaryApi, listAiCacheApi, generateAiQuestionsApi, type AiUsageSummaryOut, type AiCacheEntryOut,
  listWebhookDeliveryLogsApi, listWebhooksNewApi, deleteWebhookNewApi, type WebhookDeliveryLogOut,
  listExternalIntegrationsApi, createExternalIntegrationApi, type ExternalIntegrationOut,
  listAnalyticsSnapshotsApi, type AnalyticsSnapshotOut,
  listLeaveTypesApi, createLeaveTypeApi, type LeaveTypeOut,
  registerTenantApi,
  mongoListCoursesApi, mongoCreateCourseApi, mongoUpdateCourseApi, mongoDeleteCourseApi,
  mongoPatchCourseApi, mongoSeedCoursesApi, mongoGetCourseStatsApi,
  mongoGetProfileApi, mongoUpsertProfileApi,
  getLearningFlowAnalyticsApi,
  getLearningFlowDebugApi,
  type LearningFlowAnalytics,
  type LfEmployeePerformance,
  type LfDebugResult,
  type MongoCourseDoc, type MongoCourseStatsDoc,
  type UserProfileDoc,
  getAssessmentAnalyticsApi,
  syncAssessmentAnalyticsApi,
  createAssessmentEntryApi,
  generateAIQuizApi,
  type AssessmentAnalytics,
  type AsAssessmentRow,
  type AsAIQuestion,
  generateAiModuleApi,
  regenerateLessonApi,
  rewriteContentApi,
  translateContentApi,
  saveAiStudioDraftApi,
  listAiStudioDraftsApi,
  getAiStudioDraftApi,
  deleteAiStudioDraftApi,
  type AiStudioCourse,
  type AiStudioDraft,
  type AiStudioLesson,
  acGetRolesApi,
  acCreateRoleApi,
  acUpdateRoleApi,
  acDeleteRoleApi,
  acUpdatePermissionsApi,
  acMoveRoleApi,
  acGetAuditApi,
  acGetAlertsApi,
  acGetAnalyticsApi,
  acExportRolesApi,
  acResolveAlertApi,
  type AcRole,
  type AcRolesData,
  type AcTreeNode,
  type AcAuditEntry,
  type AcSecurityAlert,
  type AcAnalytics,
  type AcPermissions,
} from "@/lib/api";

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  if (role === "employee") return "Employee";
  return role;
}

type DashboardTab = "overview" | "learning" | "ai" | "knowledge" | "performance" | "modules" | "audit-log" | "adaptive-rules" | "notifications" | "courses-mongo" | "onboarding" | "integrations" | "question-bank" | "api-keys" | "website-sources" | "analytics-snapshots" | "embed-configs" | "ai-usage" | "departments" | "leave-types" | "learning-paths" | "xp-history" | "copilot" | "access-control" | "_performance_legacy";

/* ─── Copilot Types ─────────────────────────────────────────────── */
type CopilotMsg = { role: "user" | "ai"; text: string; timestamp: Date };

/* ─── SVG Icon helpers ──────────────────────────────────────────── */
function Icon({ d, size = 18, color = "currentColor" }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ─── Copilot Message Bubble ────────────────────────────────────── */
function CopilotBubble({ msg, userInitial }: { msg: CopilotMsg; userInitial: string }) {
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
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0891b2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 10, marginTop: 2, fontSize: 13, fontWeight: 800, color: "#fff" }}>{userInitial}</div>
      )}
    </div>
  );
}

/* ─── Copilot AI Response Generator ────────────────────────────── */
function generateCopilotResponse(question: string, role: string, courses: { title?: string }[], users: { full_name?: string }[]): string {
  const q = question.toLowerCase();
  const roleLabel = role === "admin" ? "Administrator" : "Employee";

  if (q.includes("course") && (q.includes("available") || q.includes("list") || q.includes("what") || q.includes("enroll"))) {
    const count = courses.length;
    const titles = courses.slice(0, 3).map(c => `• ${c.title || "Untitled"}`).join("\n");
    return `📚 Available Courses (${count} total):\n\n${titles}${count > 3 ? `\n• ...and ${count - 3} more` : ""}\n\nYou can enroll in any course from the Learning tab. Completion of assigned courses contributes to your performance metrics.`;
  }
  if (q.includes("progress") || q.includes("completion") || q.includes("how am i doing") || q.includes("performance")) {
    return `📊 Performance Overview:\n\nBased on your current training data:\n\n✅ Completed modules contribute directly to your KPI score\n📈 Consistent completion improves your leaderboard ranking\n🎯 Simulation practice is weighted heavily in performance reviews\n\nVisit the Performance tab for detailed analytics, or the Learning tab to continue active courses. Keep your streak going for bonus XP!`;
  }
  if (q.includes("recommend") || q.includes("next") || q.includes("what should") || q.includes("suggest")) {
    return `🎯 Personalized Recommendations:\n\n1️⃣ Complete any in-progress courses first — partial completion doesn't count toward your KPI score.\n2️⃣ Attempt the AI Coach simulation exercises — they improve real-world performance scores by up to 23%.\n3️⃣ Review Knowledge Base articles related to your role for quick skill boosts.\n4️⃣ Check the Leaderboard — top performers get recognized in team reviews.\n5️⃣ Maintain your daily streak for bonus XP and badge achievements.\n\nWould you like me to focus on any specific area?`;
  }
  if (q.includes("leaderboard") || q.includes("rank") || q.includes("top") || q.includes("xp") || q.includes("badge")) {
    return `🏆 Leaderboard & Gamification:\n\nXP is earned by:\n• Completing lessons (+50 XP each)\n• Passing assessments (+100 XP)\n• Simulation completions (+150 XP)\n• Daily login streaks (+10 XP/day)\n• Perfect quiz scores (+25 bonus XP)\n\nBadges unlock at milestone completions. Check the Overview tab to see your current XP balance and badge count. Consistent engagement is the fastest path to the top of the leaderboard!`;
  }
  if (q.includes("simulation") || q.includes("roleplay") || q.includes("practice")) {
    return `🎭 Simulation Practice Guide:\n\nThe AI simulation engine lets you practice real workplace scenarios:\n\n• Sales pitch simulations — improve conversion skills\n• Objection handling — scored on response quality\n• Escalation scenarios — for support roles\n• Compliance walkthroughs — for operations\n\nEach simulation generates a performance score that feeds into your KPI dashboard. Aim for 80%+ to unlock the next difficulty tier. Find simulations in the AI Coach tab.`;
  }
  if (q.includes("kpi") || q.includes("metric") || q.includes("score")) {
    return `📈 Understanding Your KPI Score:\n\nYour KPI score is calculated from:\n\n• Training completion rate (40% weight)\n• Assessment scores (30% weight)\n• Simulation performance (20% weight)\n• Engagement consistency (10% weight)\n\nTarget score: 80+ for "On Track" status. Scores below 60 trigger manager review. Check the Performance tab for a detailed breakdown of each component and where you can improve most efficiently.`;
  }
  if (role === "admin" && (q.includes("user") || q.includes("team") || q.includes("employee") || q.includes("staff"))) {
    const count = users.length;
    return `👥 User Management Insights:\n\n• Total users in system: ${count}\n• User roles: Admin, Manager, Employee\n• New users can be invited via the tenant onboarding flow\n\nFor detailed user analytics, check the Performance tab. The Audit Log tracks all user activity. Use Adaptive Rules to auto-assign courses based on role or KPI thresholds.`;
  }
  if (role === "admin" && (q.includes("system") || q.includes("admin") || q.includes("configure") || q.includes("setup"))) {
    return `⚙️ Admin Quick Reference:\n\n• Module Builder — create and publish new courses with lessons, quizzes, and assessments\n• Course Manager — manage MongoDB course catalog\n• Knowledge Base — upload and organize learning materials\n• Adaptive Rules — auto-trigger course assignments based on performance\n• Audit Log — full activity trail for compliance\n• Notifications — broadcast announcements to all users\n\nAll changes are logged. Use the Performance tab to monitor system-wide training impact.`;
  }
  // Default response
  return `Hello! I'm your AI ${roleLabel} Copilot.\n\nI can help you with:\n• "What courses are available?"\n• "How am I doing on my training?"\n• "What should I do next?"\n• "Explain the leaderboard system"\n• "How do simulations work?"\n• "What is my KPI score based on?"\n${role === "admin" ? '• "How many users are in the system?"\n• "What admin tools are available?"\n' : ""}\nAsk me anything about your learning journey or platform features!`;
}

/* ─── Profile Panel (slide-in from right) ───────────────────────── */
function ProfilePanel({
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
  const accentColor = me.role === "admin" ? "#7c3aed" : "#059669";
  const accentGrad = me.role === "admin"
    ? "linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%)"
    : "linear-gradient(135deg,#059669 0%,#047857 100%)";

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

  const initials = (form.full_name || me.full_name || "U").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13.5, color: "#0f172a", fontFamily: "inherit", background: "#fafafa", outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5, display: "block" };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", backdropFilter: "blur(2px)" }}
    >
      <div style={{ width: 480, height: "100vh", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(15,23,42,0.18)", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ background: accentGrad, padding: "24px 24px 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>My Profile</div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
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

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #f1f5f9" }}>Basic Information</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={lbl}>Full Name</label><input style={inp} value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Your full name" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Job Title</label><input style={inp} value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Sales Executive" /></div>
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

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #f1f5f9" }}>Links & Social</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={lbl}>LinkedIn</label><input style={inp} value={form.linkedin} onChange={e => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/username" /></div>
              <div><label style={lbl}>GitHub</label><input style={inp} value={form.github} onChange={e => set("github", e.target.value)} placeholder="https://github.com/username" /></div>
              <div><label style={lbl}>Personal Website</label><input style={inp} value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://yoursite.com" /></div>
              <div><label style={lbl}>Twitter / X</label><input style={inp} value={form.twitter} onChange={e => set("twitter", e.target.value)} placeholder="https://twitter.com/username" /></div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: "11px 0", borderRadius: 9, border: "none", background: saving ? "#94a3b8" : accentColor, color: "#fff", fontWeight: 700, fontSize: 14, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const NAV_ITEMS: { id: DashboardTab; label: string; iconD: string; adminOnly?: boolean; hideForAdmin?: boolean }[] = [
  { id: "overview",      label: "Overview",      iconD: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "learning",      label: "Learning",       iconD: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
  { id: "modules",       label: "AI Learning Studio", iconD: "M4 6h16M4 10h16M4 14h16M4 18h16", adminOnly: true },
  { id: "knowledge",     label: "Knowledge",      iconD: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z", adminOnly: true },
  { id: "performance",   label: "Performance",    iconD: "M18 20V10M12 20V4M6 20v-6", adminOnly: true },
  { id: "audit-log",     label: "Audit Log",      iconD: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8", adminOnly: true },
  { id: "adaptive-rules",label: "Adaptive Rules", iconD: "M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3", adminOnly: true },
  { id: "notifications", label: "Notifications",  iconD: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0", hideForAdmin: true },
  { id: "courses-mongo", label: "Course Manager", iconD: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", adminOnly: true },
  { id: "copilot",       label: "AI Copilot",    iconD: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { id: "access-control", label: "Access Control", iconD: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", adminOnly: true },
];

/* ─── Reusable UI atoms ─────────────────────────────────────────── */
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ ...s.card, ...style }}>{children}</div>;
}

function CardHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div style={s.cardHeader}>
      {icon && (
        <div style={s.cardIconWrap}>
          <Icon d={icon} size={16} color="#4f46e5" />
        </div>
      )}
      <div>
        <div style={s.cardTitle}>{title}</div>
        {subtitle && <div style={s.cardSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

function Badge({ label, color = "#4f46e5", bg = "#eef2ff" }: { label: string; color?: string; bg?: string }) {
  return (
    <span style={{ ...s.badge, color, background: bg }}>{label}</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    succeeded: { color: "#059669", bg: "#d1fae5" },
    failed:    { color: "#dc2626", bg: "#fee2e2" },
    pending:   { color: "#d97706", bg: "#fef3c7" },
    running:   { color: "#2563eb", bg: "#dbeafe" },
    active:    { color: "#059669", bg: "#d1fae5" },
    inactive:  { color: "#6b7280", bg: "#f3f4f6" },
  };
  const { color, bg } = map[status.toLowerCase()] ?? { color: "#6b7280", bg: "#f3f4f6" };
  return <Badge label={status} color={color} bg={bg} />;
}

function MsgBox({ msg, type = "info" }: { msg: string; type?: "info" | "success" | "error" }) {
  const styles: Record<string, React.CSSProperties> = {
    info:    { background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" },
    success: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d" },
    error:   { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" },
  };
  const icons: Record<string, string> = {
    info:    "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    success: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
    error:   "M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  };
  return (
    <div style={{ ...s.msgBox, ...styles[type] }}>
      <Icon d={icons[type]} size={16} />
      <span>{msg}</span>
    </div>
  );
}

function StatCard({ label, value, iconD, accent }: { label: string; value: number | string; iconD: string; accent: string }) {
  return (
    <div style={{ ...s.statCard, borderTop: `3px solid ${accent}` }}>
      <div style={{ ...s.statIconWrap, background: accent + "18" }}>
        <Icon d={iconD} size={20} color={accent} />
      </div>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );
}

function StyledInput({ value, onChange, placeholder, type = "text", required, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; style?: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      required={required}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...s.input, ...(focused ? s.inputFocused : {}), ...style }}
    />
  );
}

function StyledTextarea({ value, onChange, placeholder, rows = 4, required, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  rows?: number; required?: boolean; style?: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      required={required}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...s.input, ...(focused ? s.inputFocused : {}), resize: "vertical", ...style }}
    />
  );
}

function StyledSelect({ value, onChange, children, style }: {
  value: string; onChange: (v: string) => void;
  children: React.ReactNode; style?: React.CSSProperties;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...s.input, ...(focused ? s.inputFocused : {}), cursor: "pointer", ...style }}
    >
      {children}
    </select>
  );
}

function PrimaryBtn({ children, onClick, type = "button", disabled }: {
  children: React.ReactNode; onClick?: () => void;
  type?: "button" | "submit"; disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...s.primaryBtn, ...(disabled ? s.btnDisabled : {}) }}>
      {children}
    </button>
  );
}

function SecondaryBtn({ children, onClick, type = "button" }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} style={s.secondaryBtn}>
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={s.ghostBtn}>
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={s.fieldLabel}>{children}</label>;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const params = useParams<{ role: string }>();
  const role = params.role;

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [me, setMe] = useState<null | { id: string; role: string; full_name: string; email: string }>(null);
  const [courses, setCourses] = useState<CourseOut[]>([]);
  const [modules, setModules] = useState<ModuleOut[]>([]);
  const [lessons, setLessons] = useState<LessonOut[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOut[]>([]);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestionOut[]>([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({});
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [recommendations, setRecommendations] = useState<NextLessonRecommendationOut[]>([]);
  const [blueprints, setBlueprints] = useState<BlueprintOut[]>([]);
  const [documentsText, setDocumentsText] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [onboardingMessage, setOnboardingMessage] = useState<string | null>(null);
  const [assessmentMessage, setAssessmentMessage] = useState<string | null>(null);
  const [learningMessage, setLearningMessage] = useState<string | null>(null);
  const [selectedLessonIdForTutor, setSelectedLessonIdForTutor] = useState<string>("");
  const [learnerAnswer, setLearnerAnswer] = useState("");
  const [tutorResult, setTutorResult] = useState<TutorFeedbackOut | null>(null);
  const [tutorMessage, setTutorMessage] = useState<string | null>(null);
  const [activeJobStatus, setActiveJobStatus] = useState<JobStatusOut | null>(null);
  const [isPollingJob, setIsPollingJob] = useState(false);
  const [simulationTeam, setSimulationTeam] = useState("Sales");
  const [simulationFocus, setSimulationFocus] = useState("objection_handling");
  const [simulationScenario, setSimulationScenario] = useState<SimulationScenarioOut | null>(null);
  const [simulationResponse, setSimulationResponse] = useState("");
  const [simulationAttempt, setSimulationAttempt] = useState<SimulationAttemptOut | null>(null);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);
  const [kpiUserId, setKpiUserId] = useState("");
  const [kpiMetricsText, setKpiMetricsText] = useState('{"conversion_rate": 72, "resolution_time": 64}');
  const [kpiResult, setKpiResult] = useState<KpiIngestOut | null>(null);
  const [kpiMessage, setKpiMessage] = useState<string | null>(null);
  const [gamificationProfile, setGamificationProfile] = useState<GamificationProfileOut | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRowOut[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookOut[]>([]);
  const [knowledgeStats, setKnowledgeStats] = useState<KnowledgeStatsOut | null>(null);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItemOut[]>([]);
  const [knowledgeTabFilter, setKnowledgeTabFilter] = useState("");
  const [tenantProfile, setTenantProfile] = useState<TenantProfileOut | null>(null);
  const [tenantAnalytics, setTenantAnalytics] = useState<TenantAnalyticsOut | null>(null);
  const [knowledgeMessage, setKnowledgeMessage] = useState<string | null>(null);
  const [webhookProvider, setWebhookProvider] = useState("slack");
  const [webhookEventName, setWebhookEventName] = useState("progress.updated");
  const [webhookTargetUrl, setWebhookTargetUrl] = useState("");
  const [integrationMessage, setIntegrationMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // ── New Feature States ────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState<ApiKeyOut[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [newApiKeyRaw, setNewApiKeyRaw] = useState<string | null>(null);
  const [embedConfigs, setEmbedConfigs] = useState<EmbedConfigOut[]>([]);
  const [newEmbedName, setNewEmbedName] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogOut[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankOut[]>([]);
  const [qbFilter, setQbFilter] = useState<{ domain?: string; difficulty?: string; review_status?: string }>({});
  const [newQuestion, setNewQuestion] = useState({ question_text: "", question_type: "mcq", options_json: '{"a":"","b":"","c":"","d":""}', correct_answer_json: '{"index":0}', explanation: "", difficulty: "medium", domain: "", is_ai_generated: false });
  const [websiteSources, setWebsiteSources] = useState<WebsiteSourceOut[]>([]);
  const [newSource, setNewSource] = useState({ name: "", source_type: "url_scrape", source_uri: "" });
  const [learningPaths, setLearningPaths] = useState<LearningPathOut[]>([]);
  const [newPathTitle, setNewPathTitle] = useState("");
  const [newPathRole, setNewPathRole] = useState("");
  const [notifications, setNotifications] = useState<NotificationOut[]>([]);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinitionOut[]>([]);
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeIcon, setNewBadgeIcon] = useState("🏆");
  const [xpHistory, setXpHistory] = useState<XpTransactionOut[]>([]);
  const [adaptiveRules, setAdaptiveRules] = useState<AdaptiveRuleOut[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState('{"score_below": 70}');
  const [newRuleAction, setNewRuleAction] = useState('{"recommend": "remedial_lesson"}');
  const [aiUsageSummary, setAiUsageSummary] = useState<AiUsageSummaryOut | null>(null);
  const [aiCacheEntries, setAiCacheEntries] = useState<AiCacheEntryOut[]>([]);
  const [analyticsSnapshots, setAnalyticsSnapshots] = useState<AnalyticsSnapshotOut[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOut[]>([]);
  const [newLeaveTypeName, setNewLeaveTypeName] = useState("");
  const [newLeaveTypeDays, setNewLeaveTypeDays] = useState("12");
  const [featureMsg, setFeatureMsg] = useState<string | null>(null);
  const [aiGenTopic, setAiGenTopic] = useState("");
  const [aiGenCount, setAiGenCount] = useState("5");

  // ── MongoDB Course Manager State ──────────────────────────────────
  const [mongoCourses, setMongoCourses] = useState<MongoCourseDoc[]>([]);
  const [mongoCourseStats, setMongoCourseStats] = useState<MongoCourseStatsDoc | null>(null);
  const [mongoCourseMsg, setMongoCourseMsg] = useState<string | null>(null);
  const [mongoLastSync, setMongoLastSync] = useState<Date | null>(null);
  const [mongoCourseFilter, setMongoCourseFilter] = useState<{ category: string; status: string; search: string }>({ category: "", status: "", search: "" });
  const [learningCatFilter, setLearningCatFilter] = useState("");
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<MongoCourseDoc | null>(null);
  const [courseForm, setCourseForm] = useState<{
    title: string; description: string; category: string; level: string;
    duration: string; instructor: string; status: string;
    isRecommended: boolean; isNew: boolean; tags: string;
  }>({
    title: "", description: "", category: "Sales", level: "Beginner",
    duration: "", instructor: "", status: "Draft",
    isRecommended: false, isNew: true, tags: "",
  });

  // ── Learning Flow Analytics State ────────────────────────────────
  const [lfData, setLfData] = useState<LearningFlowAnalytics | null>(null);
  const [lfLoading, setLfLoading] = useState(false);
  const [lfSyncing, setLfSyncing] = useState(false);
  const [lfLastSync, setLfLastSync] = useState<Date | null>(null);
  const [lfActiveTab, setLfActiveTab] = useState<"employee" | "manager" | "team" | "insights">("employee");
  const [lfSearch, setLfSearch] = useState("");
  const [lfDark, setLfDark] = useState(false);
  const [lfCategoryFilter, setLfCategoryFilter] = useState("all");
  const [lfStatusFilter, setLfStatusFilter] = useState("all");
  const [lfExpandedEmp, setLfExpandedEmp] = useState<string | null>(null);
  const [lfDebug, setLfDebug] = useState<LfDebugResult | null>(null);
  const [lfDebugOpen, setLfDebugOpen] = useState(false);

  // ── Assessment Analytics State ────────────────────────────────────
  const [asData, setAsData] = useState<AssessmentAnalytics | null>(null);
  const [asLoading, setAsLoading] = useState(false);
  const [asSyncing, setAsSyncing] = useState(false);
  const [asLastSync, setAsLastSync] = useState<Date | null>(null);
  const [asActiveTab, setAsActiveTab] = useState<"overview"|"table"|"ai"|"create">("overview");
  const [asSearch, setAsSearch] = useState("");
  const [asCatFilter, setAsCatFilter] = useState("all");
  const [asStatusFilter, setAsStatusFilter] = useState("all");
  const [asDark, setAsDark] = useState(false);
  const [asExpandedRow, setAsExpandedRow] = useState<string | null>(null);
  // Create Assessment modal state
  const [asCreateCourseId, setAsCreateCourseId] = useState("");
  const [asCreateTitle, setAsCreateTitle] = useState("");
  const [asCreateQCount, setAsCreateQCount] = useState(10);
  const [asCreatePass, setAsCreatePass] = useState(70);
  const [asCreateTime, setAsCreateTime] = useState(20);
  const [asCreateMsg, setAsCreateMsg] = useState<string | null>(null);
  const [asCreating, setAsCreating] = useState(false);
  // AI Quiz generation
  const [asAIQuizResult, setAsAIQuizResult] = useState<AsAIQuestion[] | null>(null);
  const [asAIGenerating, setAsAIGenerating] = useState(false);
  const [asAIQuizCourseId, setAsAIQuizCourseId] = useState("");

  // ── Module Builder State ──────────────────────────────────────────
  type MgrStep = "course" | "modules" | "lessons" | "quiz" | "assignments" | "users" | "settings" | "preview" | "publish" | "feedback";
  const [mgrStep, setMgrStep] = useState<MgrStep>("course");
  const [mgrMessage, setMgrMessage] = useState<string | null>(null);
  const [mgrCourse, setMgrCourse] = useState<CourseOut | null>(null);
  const [mgrModules, setMgrModules] = useState<ModuleOut[]>([]);
  const [mgrLessons, setMgrLessons] = useState<LessonOut[]>([]);
  const [mgrAssessments, setMgrAssessments] = useState<AssessmentOut[]>([]);
  const [mgrAssignments, setMgrAssignments] = useState<AssignmentOut[]>([]);
  const [mgrEnrollments, setMgrEnrollments] = useState<EnrollmentOut[]>([]);
  const [mgrUsers, setMgrUsers] = useState<UserListOut[]>([]);
  const [mgrFeedback, setMgrFeedback] = useState<CourseFeedbackOut[]>([]);
  const [mgrSelModule, setMgrSelModule] = useState<ModuleOut | null>(null);
  const [mgrMongoCourse, setMgrMongoCourse] = useState<MongoCourseDoc | null>(null);
  const [mgrMongoModuleIdx, setMgrMongoModuleIdx] = useState<number>(-1);
  // Course form
  const [mgrCourseTitle, setMgrCourseTitle] = useState("");
  const [mgrCourseDesc, setMgrCourseDesc] = useState("");
  const [mgrCourseObj, setMgrCourseObj] = useState("");
  const [mgrCourseCat, setMgrCourseCat] = useState("");
  const [mgrCourseThumbnail, setMgrCourseThumbnail] = useState("");
  const [mgrCourseDuration, setMgrCourseDuration] = useState("0");
  const [mgrCourseTracking, setMgrCourseTracking] = useState(true);
  const [mgrCourseCert, setMgrCourseCert] = useState(false);
  const [mgrCourseInstructor, setMgrCourseInstructor] = useState("");
  const [mgrCourseLevel, setMgrCourseLevel] = useState("");
  const [mgrCourseTags, setMgrCourseTags] = useState<string[]>([]);
  // Module form
  const [mgrModTitle, setMgrModTitle] = useState("");
  const [mgrModDesc, setMgrModDesc] = useState("");
  const [mgrModSection, setMgrModSection] = useState("");
  const [mgrModOrder, setMgrModOrder] = useState("0");
  // Lesson form
  const [mgrLessonTitle, setMgrLessonTitle] = useState("");
  const [mgrLessonContent, setMgrLessonContent] = useState("");
  const [mgrLessonVideo, setMgrLessonVideo] = useState("");
  const [mgrLessonSubtitle, setMgrLessonSubtitle] = useState("");
  const [mgrLessonReading, setMgrLessonReading] = useState("");
  const [mgrLessonDownload, setMgrLessonDownload] = useState("");
  const [mgrLessonOrder, setMgrLessonOrder] = useState("0");
  // Quiz form
  const [mgrQuizTitle, setMgrQuizTitle] = useState("");
  const [mgrQuizType, setMgrQuizType] = useState("quiz");
  const [mgrQuizPassing, setMgrQuizPassing] = useState("60");
  const [mgrQuizTime, setMgrQuizTime] = useState("0");
  const [mgrQuizMarks, setMgrQuizMarks] = useState("1");
  const [mgrSelAssessment, setMgrSelAssessment] = useState<AssessmentOut | null>(null);
  const [mgrQuestionText, setMgrQuestionText] = useState("");
  const [mgrQuestionType, setMgrQuestionType] = useState("mcq");
  const [mgrQOptA, setMgrQOptA] = useState("");
  const [mgrQOptB, setMgrQOptB] = useState("");
  const [mgrQOptC, setMgrQOptC] = useState("");
  const [mgrQOptD, setMgrQOptD] = useState("");
  const [mgrQCorrect, setMgrQCorrect] = useState("0");
  const [mgrQMarks, setMgrQMarks] = useState("1");
  const [mgrQuestionsAdded, setMgrQuestionsAdded] = useState(0);
  // Assignment form
  const [mgrAssignTitle, setMgrAssignTitle] = useState("");
  const [mgrAssignDesc, setMgrAssignDesc] = useState("");
  const [mgrAssignGuide, setMgrAssignGuide] = useState("");
  const [mgrAssignDeadline, setMgrAssignDeadline] = useState("");
  // Enrollment form
  const [mgrEnrollUserId, setMgrEnrollUserId] = useState("");
  const [mgrEnrollAccess, setMgrEnrollAccess] = useState("full");
  const [mgrEnrollType, setMgrEnrollType] = useState("manual");
  // Certificates
  const [myCertificates, setMyCertificates] = useState<CertificateOut[]>([]);
  const [certMessage, setCertMessage] = useState<string | null>(null);
  const [showCertModal, setShowCertModal] = useState<CertificateOut | null>(null);

  // ── AI Learning Studio State ──────────────────────────────────────
  const [alsTopic, setAlsTopic] = useState("");
  const [alsAudience, setAlsAudience] = useState("Intermediate");
  const [alsDuration, setAlsDuration] = useState(4);
  const [alsNumLessons, setAlsNumLessons] = useState(6);
  const [alsLanguage, setAlsLanguage] = useState("English");
  const [alsTone, setAlsTone] = useState("Professional");
  const [alsGoal, setAlsGoal] = useState("");
  const [alsPromptExtra, setAlsPromptExtra] = useState("");
  const [alsGenerating, setAlsGenerating] = useState(false);
  const [alsData, setAlsData] = useState<AiStudioCourse | null>(null);
  const [alsDraftId, setAlsDraftId] = useState<string | null>(null);
  const [alsDrafts, setAlsDrafts] = useState<AiStudioDraft[]>([]);
  const [alsDraftsLoading, setAlsDraftsLoading] = useState(false);
  const [alsSaving, setAlsSaving] = useState(false);
  const [alsPublishing, setAlsPublishing] = useState(false);
  const [alsMsg, setAlsMsg] = useState<string | null>(null);
  const [alsMsgType, setAlsMsgType] = useState<"success" | "error">("success");
  const [alsDark, setAlsDark] = useState(false);
  const [alsOutputTab, setAlsOutputTab] = useState<"overview" | "lessons" | "quizzes" | "assignments">("overview");
  const [alsExpandedLesson, setAlsExpandedLesson] = useState<string | null>(null);
  const [alsRegenKey, setAlsRegenKey] = useState<string | null>(null);
  const [alsEditKey, setAlsEditKey] = useState<string | null>(null);
  const [alsEditText, setAlsEditText] = useState("");
  const [alsRewriteTone, setAlsRewriteTone] = useState("Conversational");
  const [alsTranslateTo, setAlsTranslateTo] = useState("Spanish");
  const [alsRewriting, setAlsRewriting] = useState(false);
  const [alsTranslating, setAlsTranslating] = useState(false);
  const [alsAiGenerated, setAlsAiGenerated] = useState(false);

  // ── Access Control Centre State ───────────────────────────────────
  const [accData, setAccData] = useState<AcRolesData | null>(null);
  const [accLoading, setAccLoading] = useState(false);
  const [accSelectedRole, setAccSelectedRole] = useState<AcRole | null>(null);
  const [accCenterTab, setAccCenterTab] = useState<"permissions" | "users" | "scope" | "audit">("permissions");
  const [accDark, setAccDark] = useState(false);
  const [accTreeSearch, setAccTreeSearch] = useState("");
  const [accTopSearch, setAccTopSearch] = useState("");
  const [accExpanded, setAccExpanded] = useState<Set<string>>(new Set(["super-admin", "admin", "manager"]));
  const [accAudit, setAccAudit] = useState<AcAuditEntry[]>([]);
  const [accAlerts, setAccAlerts] = useState<AcSecurityAlert[]>([]);
  const [accAlertCounts, setAccAlertCounts] = useState<Record<string, number>>({});
  const [accAnalytics, setAccAnalytics] = useState<AcAnalytics | null>(null);
  const [accMsg, setAccMsg] = useState<string | null>(null);
  const [accMsgType, setAccMsgType] = useState<"success" | "error">("success");
  const [accSavingPerms, setAccSavingPerms] = useState(false);
  const [accCreateOpen, setAccCreateOpen] = useState(false);
  const [accNewName, setAccNewName] = useState("");
  const [accNewDesc, setAccNewDesc] = useState("");
  const [accNewColor, setAccNewColor] = useState("#6366f1");
  const [accNewIcon, setAccNewIcon] = useState("👤");
  const [accNewParent, setAccNewParent] = useState("");
  const [accCreating, setAccCreating] = useState(false);
  const [accDragging, setAccDragging] = useState<string | null>(null);
  const [accDragOver, setAccDragOver] = useState<string | null>(null);
  const [accLocalPerms, setAccLocalPerms] = useState<AcPermissions | null>(null);
  const [accShowAuditPanel, setAccShowAuditPanel] = useState(false);
  const [accEditRole, setAccEditRole] = useState(false);
  const [accEditName, setAccEditName] = useState("");
  const [accEditDesc, setAccEditDesc] = useState("");

  // ── Profile State ────────────────────────────────────────────────
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileDoc | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // ── AI Copilot State ──────────────────────────────────────────────
  const [copilotMessages, setCopilotMessages] = useState<CopilotMsg[]>([
    { role: "ai", text: "Hello! I'm your AI Copilot. I have access to your training data, course catalog, and performance metrics.\n\nAsk me anything — like \"What courses are available?\" or \"What should I do next?\" and I'll give you data-driven answers.", timestamp: new Date() },
  ]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);

  const expectedRole = useMemo(() => role ?? "", [role]);
  const canManageOnboarding = me?.role === "admin" || me?.role === "manager";

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedRole = localStorage.getItem("user_role");
    if (!token || !savedRole) { router.push("/login"); return; }
    setAccessToken(token);
    if (savedRole !== expectedRole) { router.push(`/dashboard/${savedRole}`); return; }
  }, [expectedRole, router]);

  async function loadDashboardData(token: string) {
    const meRes = await meApi(token);
    setMe({ id: meRes.id, role: meRes.role, full_name: meRes.full_name, email: meRes.email });
    // Load MongoDB profile
    mongoGetProfileApi(meRes.id).then(p => setUserProfile(p)).catch(() => {});

    const [courseRes, recRes, assessmentRes, gamificationRes, leaderboardRes, certRes] = await Promise.all([
      coursesApi(token).catch(() => [] as CourseOut[]),
      nextLessonRecommendationsApi(token).catch(() => ({ next_lessons: [] as NextLessonRecommendationOut[] })),
      assessmentsApi(token).catch(() => [] as AssessmentOut[]),
      gamificationMeApi(token).catch(() => null as unknown as GamificationProfileOut),
      gamificationLeaderboardApi(token).catch(() => ({ leaderboard: [] as LeaderboardRowOut[] })),
      listMyCertificatesApi(token).catch(() => [] as CertificateOut[]),
    ]);
    setMyCertificates(certRes);

    setCourses(courseRes);
    setRecommendations(recRes.next_lessons);
    setAssessments(assessmentRes);
    setGamificationProfile(gamificationRes);
    setLeaderboard(leaderboardRes.leaderboard);

    if (courseRes.length > 0) {
      const cId = selectedCourseId || courseRes[0].id;
      setSelectedCourseId(cId);
      const modRes = await modulesApi(token, cId);
      setModules(modRes);
      if (modRes.length > 0) {
        const mId = selectedModuleId || modRes[0].id;
        setSelectedModuleId(mId);
        const lessonRes = await lessonsApi(token, mId);
        setLessons(lessonRes);
        if (lessonRes.length > 0 && !selectedLessonIdForTutor) setSelectedLessonIdForTutor(lessonRes[0].id);
      } else { setLessons([]); }
    } else { setModules([]); setLessons([]); }

    if (assessmentRes.length > 0) {
      const aId = selectedAssessmentId || assessmentRes[0].id;
      setSelectedAssessmentId(aId);
      try {
        const questionRes = await assessmentQuestionsApi(token, aId);
        setAssessmentQuestions(questionRes);
      } catch { setAssessmentQuestions([]); }
    } else { setAssessmentQuestions([]); }

    if (meRes.role === "admin" || meRes.role === "manager") {
      try {
        const [blueprintRes, webhookRes, statsRes, itemsRes, profileRes, analyticsRes] = await Promise.all([
          listBlueprintsApi(token),
          integrationsWebhooksApi(token),
          knowledgeStatsApi(token),
          knowledgeItemsApi(token, knowledgeTabFilter, 15),
          tenantProfileApi(token),
          tenantAnalyticsApi(token),
        ]);
        setBlueprints(blueprintRes);
        setWebhooks(webhookRes);
        setKnowledgeStats(statsRes);
        setKnowledgeItems(itemsRes);
        setTenantProfile(profileRes);
        setTenantAnalytics(analyticsRes);
      } catch { setBlueprints([]); setWebhooks([]); setKnowledgeStats(null); setKnowledgeItems([]); setTenantProfile(null); setTenantAnalytics(null); }

      // ── Load new features for admin/manager ──────────────────────
      try {
        const [deptRes, leaveRes, lpRes] = await Promise.all([
          listDepartmentsApi(token),
          listLeaveTypesApi(token),
          listLearningPathsApi(token),
        ]);
        setDepartments(deptRes);
        setLeaveTypes(leaveRes);
        setLearningPaths(lpRes);
      } catch { /* non-critical */ }

      if (meRes.role === "admin") {
        try {
          const [keysRes, embedRes, snapshotRes] = await Promise.all([
            listApiKeysApi(token),
            listEmbedConfigsApi(token),
            listAnalyticsSnapshotsApi(token),
          ]);
          setApiKeys(keysRes);
          setEmbedConfigs(embedRes);
          setAnalyticsSnapshots(snapshotRes);
        } catch { /* non-critical */ }
      }
    } else {
      setBlueprints([]); setWebhooks([]); setKnowledgeStats(null);
      setKnowledgeItems([]); setTenantProfile(null); setTenantAnalytics(null);
    }

    // ── Load MongoDB courses for all roles ────────────────────────
    try {
      const [mongoCoursesRes, mongoStatsRes] = await Promise.all([
        mongoListCoursesApi(),
        mongoGetCourseStatsApi(),
      ]);
      setMongoCourses(mongoCoursesRes);
      setMongoCourseStats(mongoStatsRes);
    } catch { /* non-critical — MongoDB may not have courses yet */ }

    // ── Load for all roles ──────────────────────────────────────────
    try {
      const [notifRes, xpRes] = await Promise.all([
        listNotificationsApi(token),
        listXpHistoryApi(token),
      ]);
      setNotifications(notifRes);
      setXpHistory(xpRes);
    } catch { /* non-critical */ }
  }

  useEffect(() => {
    async function run() {
      if (!accessToken) return;
      setLoading(true); setError(null);
      try { await loadDashboardData(accessToken); }
      catch (err) { setError(err instanceof Error ? err.message : "Failed to load dashboard data"); }
      finally { setLoading(false); }
    }
    run();
  }, [accessToken]);

  useEffect(() => {
    async function refreshKnowledgeItems() {
      if (!accessToken || !canManageOnboarding) return;
      try { const items = await knowledgeItemsApi(accessToken, knowledgeTabFilter, 15); setKnowledgeItems(items); } catch { /* keep prior */ }
    }
    void refreshKnowledgeItems();
  }, [accessToken, canManageOnboarding, knowledgeTabFilter]);

  useEffect(() => {
    if (activeTab === "courses-mongo") void handleLoadMongoCourses();
    if (activeTab === "learning") {
      void fetchLearningFlow(true);
      void fetchAssessmentAnalytics(true);
    }
    if (activeTab === "access-control" && !accData) void accLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Auto-refresh learning flow analytics every 30s while on the Learning tab
  useEffect(() => {
    if (activeTab !== "learning") return;
    const id = setInterval(() => {
      void fetchLearningFlow();
      void fetchAssessmentAnalytics();
    }, 30_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ── MongoDB Auto-Sync (polls all MongoDB collections every 30s) ────
  const syncMongoData = useCallback(async () => {
    try {
      const [mongoCoursesRes, mongoStatsRes] = await Promise.all([
        mongoListCoursesApi(),
        mongoGetCourseStatsApi(),
      ]);
      setMongoCourses(mongoCoursesRes);
      setMongoCourseStats(mongoStatsRes);
      setMongoLastSync(new Date());
    } catch { /* non-critical — keep stale data if network error */ }
  }, []);

  // Stable ref so the interval always calls the latest closure
  const syncMongoRef = useRef(syncMongoData);
  useEffect(() => { syncMongoRef.current = syncMongoData; }, [syncMongoData]);

  useEffect(() => {
    const id = setInterval(() => { void syncMongoRef.current(); }, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Learning Flow Analytics fetch ────────────────────────────────
  async function fetchLearningFlow(force = false) {
    if (force) setLfSyncing(true);
    else if (!lfData) setLfLoading(true);
    try {
      const data = await getLearningFlowAnalyticsApi(force);
      setLfData(data);
      setLfLastSync(new Date());
    } catch { /* keep stale */ }
    finally { setLfLoading(false); setLfSyncing(false); }
  }

  // ── Assessment Analytics fetch ────────────────────────────────────
  async function fetchAssessmentAnalytics(force = false) {
    if (force) setAsSyncing(true);
    else if (!asData) setAsLoading(true);
    try {
      const data = await getAssessmentAnalyticsApi(force);
      setAsData(data);
      setAsLastSync(new Date());
    } catch { /* keep stale */ }
    finally { setAsLoading(false); setAsSyncing(false); }
  }

  async function handleCreateAssessment() {
    if (!asCreateCourseId || !asCreateTitle.trim()) { setAsCreateMsg("Please fill Course and Title."); return; }
    setAsCreating(true); setAsCreateMsg(null);
    try {
      const res = await createAssessmentEntryApi({ course_id: asCreateCourseId, title: asCreateTitle, question_count: asCreateQCount, passing_score: asCreatePass, time_limit_mins: asCreateTime });
      setAsCreateMsg(`Assessment "${res.assessment.assessment_name}" created.`);
      setAsCreateTitle(""); setAsCreateQCount(10); setAsCreatePass(70); setAsCreateTime(20);
      await fetchAssessmentAnalytics(true);
    } catch (e) { setAsCreateMsg(e instanceof Error ? e.message : "Failed to create."); }
    finally { setAsCreating(false); }
  }

  async function handleGenerateAIQuiz(courseId: string, category: string) {
    setAsAIGenerating(true); setAsAIQuizCourseId(courseId); setAsAIQuizResult(null);
    try {
      const res = await generateAIQuizApi({ course_id: courseId, category, count: 5 });
      setAsAIQuizResult(res.questions);
    } catch { setAsAIQuizResult(null); }
    finally { setAsAIGenerating(false); }
  }

  async function pollJobUntilDone(token: string, jobId: string): Promise<JobStatusOut> {
    setIsPollingJob(true);
    try {
      for (let i = 0; i < 120; i += 1) {
        const status = await jobStatusApi(token, jobId);
        setActiveJobStatus(status);
        if (status.status === "succeeded" || status.status === "failed") return status;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      throw new Error("Job timed out. Please check again shortly.");
    } finally { setIsPollingJob(false); }
  }

  async function handleCreateBlueprint(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setOnboardingMessage(null);
    try {
      const created = await createBlueprintApi(accessToken, { website_url: websiteUrl || undefined, documents_text: documentsText, questionnaire: {} });
      setOnboardingMessage(`Blueprint created (${created.id.slice(0, 8)}...).`);
      setDocumentsText("");
      await loadDashboardData(accessToken);
    } catch (err) { setOnboardingMessage(err instanceof Error ? err.message : "Failed to create blueprint"); }
  }

  async function handleGenerateLms(blueprintId: string) {
    if (!accessToken) return;
    setOnboardingMessage(null);
    try {
      const enqueued = await generateLmsApi(accessToken, blueprintId);
      setOnboardingMessage(`${enqueued.message} (job: ${enqueued.job_id.slice(0, 8)}...)`);
      const finalStatus = await pollJobUntilDone(accessToken, enqueued.job_id);
      setOnboardingMessage(finalStatus.status === "succeeded" ? "LMS generation completed." : finalStatus.error_message || "LMS generation failed.");
      await loadDashboardData(accessToken);
    } catch (err) { setOnboardingMessage(err instanceof Error ? err.message : "Failed to generate LMS"); }
  }

  async function handleSyncTenantData() {
    if (!accessToken) return;
    setKnowledgeMessage(null);
    try {
      const res = await syncTenantDataApi(accessToken, {});
      setKnowledgeMessage(`Synced ${res.synced_tabs} tabs, upserted ${res.upserted_items} items.`);
      await loadDashboardData(accessToken);
    } catch (err) { setKnowledgeMessage(err instanceof Error ? err.message : "Failed to sync tenant data"); }
  }

  async function handleCreateBlueprintFromKnowledge() {
    if (!accessToken) return;
    setOnboardingMessage(null);
    try {
      const created = await createBlueprintFromKnowledgeApi(accessToken);
      setOnboardingMessage(`Knowledge blueprint created (${created.id.slice(0, 8)}...).`);
      await loadDashboardData(accessToken);
    } catch (err) { setOnboardingMessage(err instanceof Error ? err.message : "Failed to create knowledge blueprint"); }
  }

  async function handleSaveTenantProfile() {
    if (!accessToken || !tenantProfile || me?.role !== "admin") return;
    setKnowledgeMessage(null);
    try {
      await upsertTenantProfileApi(accessToken, {
        business_domain: tenantProfile.business_domain,
        role_template_json: tenantProfile.role_template_json,
        taxonomy_mapping_json: tenantProfile.taxonomy_mapping_json,
        generation_prefs_json: tenantProfile.generation_prefs_json,
        connectors_json: tenantProfile.connectors_json,
        labels_json: tenantProfile.labels_json,
      });
      setKnowledgeMessage("Tenant configuration saved.");
      await loadDashboardData(accessToken);
    } catch (err) { setKnowledgeMessage(err instanceof Error ? err.message : "Failed to save tenant configuration"); }
  }

  async function handleCourseChange(courseId: string) {
    if (!accessToken) return;
    setSelectedCourseId(courseId);
    const modRes = await modulesApi(accessToken, courseId);
    setModules(modRes);
    if (modRes.length > 0) {
      setSelectedModuleId(modRes[0].id);
      const lessonRes = await lessonsApi(accessToken, modRes[0].id);
      setLessons(lessonRes);
    } else { setSelectedModuleId(""); setLessons([]); }
  }

  async function handleModuleChange(moduleId: string) {
    if (!accessToken) return;
    setSelectedModuleId(moduleId);
    const lessonRes = await lessonsApi(accessToken, moduleId);
    setLessons(lessonRes);
    setSelectedLessonIdForTutor(lessonRes[0]?.id || "");
  }

  async function handleCompleteLesson(lessonId: string) {
    if (!accessToken) return;
    setLearningMessage(null);
    try {
      await completeLessonApi(accessToken, lessonId);
      setLearningMessage("Lesson marked as complete.");
      await loadDashboardData(accessToken);
    } catch (err) { setLearningMessage(err instanceof Error ? err.message : "Failed to update lesson progress"); }
  }

  async function handleAssessmentChange(assessmentId: string) {
    if (!accessToken) return;
    setSelectedAssessmentId(assessmentId);
    const qs = await assessmentQuestionsApi(accessToken, assessmentId);
    setAssessmentQuestions(qs);
    setAssessmentAnswers({});
  }

  async function handleSubmitAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !selectedAssessmentId) return;
    setAssessmentMessage(null);
    try {
      const res = await submitAssessmentApi(accessToken, { assessment_id: selectedAssessmentId, answers: assessmentAnswers });
      setAssessmentMessage(`Assessment submitted. Score: ${res.score}`);
      await loadDashboardData(accessToken);
    } catch (err) { setAssessmentMessage(err instanceof Error ? err.message : "Failed to submit assessment"); }
  }

  async function handleTutorFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !selectedLessonIdForTutor || !learnerAnswer.trim()) return;
    setTutorMessage(null); setTutorResult(null);
    try {
      const enqueued = await tutorFeedbackApi(accessToken, { lesson_id: selectedLessonIdForTutor, learner_answer: learnerAnswer });
      setTutorMessage(`Tutor job queued (${enqueued.job_id.slice(0, 8)}...).`);
      const finalStatus = await pollJobUntilDone(accessToken, enqueued.job_id);
      if (finalStatus.status === "succeeded") {
        const result = finalStatus.result_json;
        setTutorResult({ feedback: String(result.feedback || ""), follow_up_question: String(result.follow_up_question || ""), confidence_score: Number(result.confidence_score || 0) });
        setTutorMessage("Tutor feedback ready.");
      } else { setTutorMessage(finalStatus.error_message || "Tutor feedback failed."); }
    } catch (err) { setTutorMessage(err instanceof Error ? err.message : "Failed to get tutor feedback"); }
  }

  async function handleStartSimulation(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSimulationMessage(null); setSimulationAttempt(null);
    try {
      const scenario = await startSimulationApi(accessToken, { team: simulationTeam, focus_topic: simulationFocus });
      setSimulationScenario(scenario);
      setSimulationMessage("Simulation started. Submit your response for evaluation.");
    } catch (err) { setSimulationMessage(err instanceof Error ? err.message : "Failed to start simulation"); }
  }

  async function handleSubmitSimulation(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !simulationScenario || !simulationResponse.trim()) return;
    setSimulationMessage(null);
    try {
      const enqueued = await submitSimulationApi(accessToken, { scenario_id: simulationScenario.id, user_response_text: simulationResponse });
      const finalStatus = await pollJobUntilDone(accessToken, enqueued.job_id);
      if (finalStatus.status !== "succeeded") { setSimulationMessage(finalStatus.error_message || "Simulation evaluation failed."); return; }
      const attemptId = String(finalStatus.result_json.attempt_id || "");
      if (!attemptId) { setSimulationMessage("Simulation completed but attempt result was missing."); return; }
      const attempt = await simulationAttemptApi(accessToken, attemptId);
      setSimulationAttempt(attempt);
      setSimulationMessage("Simulation evaluation completed.");
    } catch (err) { setSimulationMessage(err instanceof Error ? err.message : "Failed to evaluate simulation"); }
  }

  async function handleIngestKpi(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !kpiUserId.trim()) return;
    setKpiMessage(null); setKpiResult(null);
    try {
      const parsed = JSON.parse(kpiMetricsText) as Record<string, number>;
      const normalized: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) normalized[key] = Number(value);
      const res = await ingestKpiApi(accessToken, { user_id: kpiUserId.trim(), metrics: normalized });
      setKpiResult(res);
      setKpiMessage("KPI metrics ingested successfully.");
      await loadDashboardData(accessToken);
    } catch (err) { setKpiMessage(err instanceof Error ? err.message : "Failed to ingest KPI metrics"); }
  }

  async function handleCopyMyUserId() {
    if (!accessToken) return;
    try { const u = await meApi(accessToken); await navigator.clipboard.writeText(u.id); setKpiMessage("Your user ID was copied to clipboard."); }
    catch (err) { setKpiMessage(err instanceof Error ? err.message : "Failed to copy user ID"); }
  }

  async function handleUseMyUserIdForKpi() {
    if (!accessToken) return;
    try { const u = await meApi(accessToken); setKpiUserId(u.id); setKpiMessage("KPI target user set to your user ID."); }
    catch (err) { setKpiMessage(err instanceof Error ? err.message : "Failed to fetch your user ID"); }
  }

  async function handleCreateWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setIntegrationMessage(null);
    try {
      await createWebhookApi(accessToken, { provider: webhookProvider.trim().toLowerCase(), event_name: webhookEventName.trim().toLowerCase(), target_url: webhookTargetUrl.trim() });
      setWebhookTargetUrl("");
      setIntegrationMessage("Webhook registered.");
      const updated = await integrationsWebhooksApi(accessToken);
      setWebhooks(updated);
    } catch (err) { setIntegrationMessage(err instanceof Error ? err.message : "Failed to register webhook"); }
  }

  // ── Module Builder Handlers ──────────────────────────────────────
  async function handleMgrCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setMgrMessage(null);
    try {
      const payload = {
        title: mgrCourseTitle, description: mgrCourseDesc, objectives: mgrCourseObj,
        category: mgrCourseCat, thumbnail_url: mgrCourseThumbnail,
        level: mgrCourseLevel,
        duration_hours: parseInt(mgrCourseDuration) || 0,
        progress_tracking_enabled: mgrCourseTracking, certification_enabled: mgrCourseCert,
        instructor_name: mgrCourseInstructor,
        tags: mgrCourseTags,
      };
      let c: CourseOut;
      if (mgrCourse) {
        c = await updateCourseApi(accessToken, mgrCourse.id, payload);
        setMgrMessage(`Course "${c.title}" updated.`);
      } else {
        c = await createCourseApi(accessToken, payload);
        setMgrMessage(`Course "${c.title}" created. Now add modules.`);
      }
      setMgrCourse(c);
      setMgrStep("modules");
      await loadDashboardData(accessToken);
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to save course"); }
  }

  async function handleMgrAddModule(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !mgrCourse) return;
    setMgrMessage(null);
    try {
      const mod = await createModuleApi(accessToken, mgrCourse.id, {
        title: mgrModTitle, description: mgrModDesc, section_title: mgrModSection,
        order_index: parseInt(mgrModOrder) || mgrModules.length,
      });
      setMgrModules((prev) => [...prev, mod]);
      setMgrSelModule(mod);
      setMgrMessage(`Module "${mod.title}" added.`);
      setMgrModTitle(""); setMgrModDesc(""); setMgrModSection(""); setMgrModOrder(String(mgrModules.length + 1));
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to add module"); }
  }

  async function handleMgrAddLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !mgrSelModule) return;
    setMgrMessage(null);
    try {
      const reading = mgrLessonReading.trim() ? [{ label: "Reading Material", url: mgrLessonReading }] : [];
      const downloads = mgrLessonDownload.trim() ? [{ label: "Download", url: mgrLessonDownload }] : [];
      const lesson = await createLessonApi(accessToken, mgrSelModule.id, {
        title: mgrLessonTitle, content_text: mgrLessonContent,
        video_url: mgrLessonVideo, subtitle_url: mgrLessonSubtitle,
        reading_materials: reading, downloadable_resources: downloads,
        order_index: parseInt(mgrLessonOrder) || mgrLessons.length,
      });
      setMgrLessons((prev) => [...prev, lesson]);
      setMgrMessage(`Lesson "${lesson.title}" added.`);
      setMgrLessonTitle(""); setMgrLessonContent(""); setMgrLessonVideo("");
      setMgrLessonSubtitle(""); setMgrLessonReading(""); setMgrLessonDownload("");
      setMgrLessonOrder(String(mgrLessons.length + 1));
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to add lesson"); }
  }

  async function handleMgrCreateQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !mgrSelModule) return;
    setMgrMessage(null);
    try {
      const assessment = await createModuleAssessmentApi(accessToken, mgrSelModule.id, {
        title: mgrQuizTitle, assessment_type: mgrQuizType,
        passing_score: parseInt(mgrQuizPassing) || 60,
        time_limit_minutes: parseInt(mgrQuizTime) || 0,
        marks_per_question: parseInt(mgrQuizMarks) || 1,
      });
      setMgrSelAssessment(assessment);
      setMgrAssessments((prev) => [...prev, assessment]);
      setMgrMessage(`Quiz "${assessment.title}" created. Now add questions.`);
      setMgrQuizTitle("");
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to create quiz"); }
  }

  async function handleMgrAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !mgrSelAssessment) return;
    setMgrMessage(null);
    try {
      await addAssessmentQuestionApi(accessToken, mgrSelAssessment.id, {
        question_text: mgrQuestionText, question_type: mgrQuestionType,
        options_json: { a: mgrQOptA, b: mgrQOptB, c: mgrQOptC, d: mgrQOptD },
        correct_answer_index: parseInt(mgrQCorrect) || 0,
        marks: parseInt(mgrQMarks) || 1,
      });
      setMgrQuestionsAdded((n) => n + 1);
      setMgrMessage(`Question ${mgrQuestionsAdded + 1} added.`);
      setMgrQuestionText(""); setMgrQOptA(""); setMgrQOptB(""); setMgrQOptC(""); setMgrQOptD("");
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to add question"); }
  }

  async function handleMgrCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !mgrSelModule) return;
    setMgrMessage(null);
    try {
      const assignment = await createAssignmentApi(accessToken, {
        module_id: mgrSelModule.id, title: mgrAssignTitle,
        description: mgrAssignDesc, guidelines: mgrAssignGuide,
        deadline: mgrAssignDeadline || null,
      });
      setMgrAssignments((prev) => [...prev, assignment]);
      setMgrMessage(`Assignment "${assignment.title}" created.`);
      setMgrAssignTitle(""); setMgrAssignDesc(""); setMgrAssignGuide(""); setMgrAssignDeadline("");
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to create assignment"); }
  }

  async function handleMgrLoadUsers() {
    if (!accessToken) return;
    try {
      const users = await listUsersApi(accessToken);
      setMgrUsers(users);
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to load users"); }
  }

  async function handleMgrEnroll(e: React.FormEvent, overrideUserId?: string) {
    e.preventDefault();
    const userId = overrideUserId ?? mgrEnrollUserId;
    if (!accessToken || !mgrCourse || !userId) return;
    // Validate UUID format before sending to the API
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      setMgrMessage(`Invalid User ID format: "${userId}". Please select a user from the table.`);
      return;
    }
    setMgrMessage(null);
    try {
      const enr = await enrollUserApi(accessToken, {
        user_id: userId, course_id: mgrCourse.id,
        access_type: mgrEnrollAccess, enrollment_type: mgrEnrollType,
      });
      setMgrEnrollments((prev) => [...prev, enr]);
      const user = mgrUsers.find((u) => u.id === userId);
      setMgrMessage(`${user ? user.full_name : "User"} enrolled successfully.`);
      setMgrEnrollUserId("");
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to enroll user"); }
  }

  async function handleMgrPublish() {
    if (!accessToken || !mgrCourse) return;
    setMgrMessage(null);
    try {
      const updated = await publishCourseApi(accessToken, mgrCourse.id);
      setMgrCourse(updated);
      setMgrMessage(`Course is now ${updated.status === "published" ? "LIVE" : "back to draft"}.`);
      await loadDashboardData(accessToken);
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to publish course"); }
  }

  async function handleMgrLoadFeedback() {
    if (!accessToken || !mgrCourse) return;
    try {
      const fb = await listCourseFeedbackApi(accessToken, mgrCourse.id);
      setMgrFeedback(fb);
    } catch (err) { setMgrMessage(err instanceof Error ? err.message : "Failed to load feedback"); }
  }

  // ── AI Learning Studio Handlers ──────────────────────────────────

  async function handleAlsGenerate() {
    if (!alsTopic.trim()) { setAlsMsg("Please enter a topic first."); setAlsMsgType("error"); return; }
    setAlsGenerating(true); setAlsMsg(null);
    try {
      const res = await generateAiModuleApi({
        topic: alsTopic, audience_level: alsAudience, duration_weeks: alsDuration,
        num_lessons: alsNumLessons, language: alsLanguage, tone: alsTone,
        learning_goal: alsGoal, additional_prompt: alsPromptExtra,
      });
      setAlsData(res.data); setAlsDraftId(null); setAlsAiGenerated(res.ai_generated);
      setAlsOutputTab("overview");
      setAlsMsg(res.ai_generated ? "Module generated with AI ✨" : "Module generated (offline fallback mode)");
      setAlsMsgType("success");
    } catch (e) {
      setAlsMsg(e instanceof Error ? e.message : "Generation failed. Check the backend is running.");
      setAlsMsgType("error");
    } finally { setAlsGenerating(false); }
  }

  async function handleAlsLoadDrafts() {
    setAlsDraftsLoading(true);
    try {
      const res = await listAiStudioDraftsApi();
      setAlsDrafts(res.drafts);
    } catch { /* silently fail */ }
    finally { setAlsDraftsLoading(false); }
  }

  async function handleAlsLoadDraft(draftId: string) {
    try {
      const res = await getAiStudioDraftApi(draftId);
      setAlsData(res.generated_data);
      setAlsDraftId(res.draft_id);
      const inp = res.inputs as Record<string, unknown>;
      if (inp.topic) setAlsTopic(String(inp.topic));
      if (inp.audience_level) setAlsAudience(String(inp.audience_level));
      if (inp.duration_weeks) setAlsDuration(Number(inp.duration_weeks));
      if (inp.num_lessons) setAlsNumLessons(Number(inp.num_lessons));
      if (inp.language) setAlsLanguage(String(inp.language));
      if (inp.tone) setAlsTone(String(inp.tone));
      if (inp.learning_goal) setAlsGoal(String(inp.learning_goal));
      setAlsOutputTab("overview");
      setAlsMsg("Draft loaded"); setAlsMsgType("success");
    } catch (e) {
      setAlsMsg("Failed to load draft"); setAlsMsgType("error");
    }
  }

  async function handleAlsDeleteDraft(draftId: string) {
    try {
      await deleteAiStudioDraftApi(draftId);
      setAlsDrafts(prev => prev.filter(d => d.draft_id !== draftId));
    } catch { /* silently fail */ }
  }

  async function handleAlsSaveDraft() {
    if (!alsData) return;
    setAlsSaving(true);
    try {
      const res = await saveAiStudioDraftApi({
        title: alsData.title,
        generated_data: alsData,
        inputs: { topic: alsTopic, audience_level: alsAudience, duration_weeks: alsDuration, num_lessons: alsNumLessons, language: alsLanguage, tone: alsTone, learning_goal: alsGoal, additional_prompt: alsPromptExtra },
        draft_id: alsDraftId || undefined,
      });
      setAlsDraftId(res.draft_id);
      setAlsMsg("Draft saved ✓"); setAlsMsgType("success");
    } catch (e) {
      setAlsMsg("Failed to save draft"); setAlsMsgType("error");
    } finally { setAlsSaving(false); }
  }

  async function handleAlsPublish() {
    if (!alsData || !accessToken) return;
    setAlsPublishing(true); setAlsMsg(null);
    try {
      const course = await createCourseApi(accessToken, {
        title: alsData.title, description: alsData.description,
        objectives: alsData.objectives, category: alsData.category,
        level: alsData.level, duration_hours: Math.round(alsData.estimated_hours),
        progress_tracking_enabled: true, certification_enabled: false,
        tags: alsData.tags,
      });
      for (let mi = 0; mi < alsData.modules.length; mi++) {
        const m = alsData.modules[mi];
        const mod = await createModuleApi(accessToken, course.id, {
          title: m.title, description: m.description,
          section_title: m.section_title, order_index: mi,
        });
        for (let li = 0; li < m.lessons.length; li++) {
          const l = m.lessons[li];
          await createLessonApi(accessToken, mod.id, {
            title: l.title, content_text: l.content_text,
            order_index: li, reading_materials: [], downloadable_resources: [],
          });
        }
        if (m.quiz?.questions?.length > 0) {
          const assessment = await createModuleAssessmentApi(accessToken, mod.id, {
            title: m.quiz.title, assessment_type: "quiz",
            passing_score: m.quiz.passing_score || 70,
            time_limit_minutes: 20, marks_per_question: 1,
          });
          for (const q of m.quiz.questions) {
            await addAssessmentQuestionApi(accessToken, assessment.id, {
              question_text: q.question, question_type: "mcq",
              options_json: q.options, correct_answer_index: q.correct_index, marks: 1,
            });
          }
        }
        if (m.assignment?.title) {
          await createAssignmentApi(accessToken, {
            module_id: mod.id, title: m.assignment.title,
            description: m.assignment.description,
            guidelines: m.assignment.guidelines, deadline: null,
          });
        }
      }
      await publishCourseApi(accessToken, course.id);
      await loadDashboardData(accessToken);
      setMgrCourse(course);
      setAlsMsg(`"${course.title}" published and now live! 🎉`); setAlsMsgType("success");
    } catch (e) {
      setAlsMsg(e instanceof Error ? e.message : "Publish failed"); setAlsMsgType("error");
    } finally { setAlsPublishing(false); }
  }

  function handleAlsExport() {
    if (!alsData) return;
    const blob = new Blob([JSON.stringify(alsData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${alsData.title.replace(/\s+/g, "_")}_module.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function handleAlsRegenLesson(mi: number, li: number) {
    if (!alsData) return;
    const key = `m${mi}l${li}`;
    setAlsRegenKey(key);
    const lesson = alsData.modules[mi].lessons[li];
    try {
      const res = await regenerateLessonApi({
        lesson_title: lesson.title, topic: alsTopic || alsData.title,
        tone: alsTone, language: alsLanguage,
      });
      const next = JSON.parse(JSON.stringify(alsData)) as AiStudioCourse;
      next.modules[mi].lessons[li] = { ...lesson, ...res.lesson };
      setAlsData(next);
    } catch { /* silently fail */ }
    finally { setAlsRegenKey(null); }
  }

  function handleAlsEditLesson(mi: number, li: number) {
    if (!alsData) return;
    const key = `m${mi}l${li}`;
    setAlsEditKey(key);
    setAlsEditText(alsData.modules[mi].lessons[li].content_text);
  }

  function handleAlsSaveEdit(mi: number, li: number) {
    if (!alsData || !alsEditKey) return;
    const next = JSON.parse(JSON.stringify(alsData)) as AiStudioCourse;
    next.modules[mi].lessons[li].content_text = alsEditText;
    setAlsData(next);
    setAlsEditKey(null); setAlsEditText("");
  }

  async function handleAlsRewrite() {
    if (!alsData) return;
    setAlsRewriting(true);
    try {
      const fullContent = alsData.modules.map(m =>
        m.lessons.map(l => l.content_text).join("\n\n")
      ).join("\n\n");
      const res = await rewriteContentApi({ content: fullContent.slice(0, 3000), new_tone: alsRewriteTone, language: alsLanguage });
      setAlsMsg(`Content rewritten in ${alsRewriteTone} tone ✓`); setAlsMsgType("success");
    } catch { setAlsMsg("Rewrite failed"); setAlsMsgType("error"); }
    finally { setAlsRewriting(false); }
  }

  async function handleAlsTranslate() {
    if (!alsData) return;
    setAlsTranslating(true);
    try {
      const next = JSON.parse(JSON.stringify(alsData)) as AiStudioCourse;
      for (const m of next.modules) {
        for (const l of m.lessons) {
          const res = await translateContentApi({ content: l.content_text, target_language: alsTranslateTo });
          l.content_text = res.content;
        }
      }
      setAlsData(next);
      setAlsMsg(`Content translated to ${alsTranslateTo} ✓`); setAlsMsgType("success");
    } catch { setAlsMsg("Translation failed"); setAlsMsgType("error"); }
    finally { setAlsTranslating(false); }
  }

  // ── Access Control Centre Handlers ───────────────────────────────

  async function accLoad() {
    setAccLoading(true);
    try {
      const [rolesRes, alertsRes, analyticsRes, auditRes] = await Promise.all([
        acGetRolesApi(),
        acGetAlertsApi(),
        acGetAnalyticsApi(),
        acGetAuditApi(30),
      ]);
      setAccData(rolesRes);
      setAccAlerts(alertsRes.alerts);
      setAccAlertCounts(alertsRes.counts);
      setAccAnalytics(analyticsRes);
      setAccAudit(auditRes.entries);
    } catch (e) {
      setAccMsg("Failed to load access control data"); setAccMsgType("error");
    } finally { setAccLoading(false); }
  }

  function accSelectRole(role: AcRole) {
    setAccSelectedRole(role);
    setAccLocalPerms(JSON.parse(JSON.stringify(role.permissions)) as AcPermissions);
    setAccCenterTab("permissions");
    setAccEditRole(false);
    setAccEditName(role.name);
    setAccEditDesc(role.description);
  }

  async function accSavePermissions() {
    if (!accSelectedRole || !accLocalPerms) return;
    setAccSavingPerms(true);
    try {
      const res = await acUpdatePermissionsApi(accSelectedRole.role_id, {
        permissions: accLocalPerms, changed_by: me?.email || "admin",
      });
      setAccSelectedRole(res.role);
      setAccMsg(`Permissions updated (${res.changes} changes saved) ✓`); setAccMsgType("success");
      await accLoad();
    } catch (e) {
      setAccMsg(e instanceof Error ? e.message : "Save failed"); setAccMsgType("error");
    } finally { setAccSavingPerms(false); }
  }

  async function accHandleCreate() {
    if (!accNewName.trim()) return;
    setAccCreating(true);
    try {
      const res = await acCreateRoleApi({
        name: accNewName, description: accNewDesc,
        color: accNewColor, icon: accNewIcon,
        parent_id: accNewParent || undefined,
      });
      setAccMsg(`Role "${res.role.name}" created ✓`); setAccMsgType("success");
      setAccCreateOpen(false); setAccNewName(""); setAccNewDesc(""); setAccNewParent("");
      await accLoad();
    } catch (e) {
      setAccMsg(e instanceof Error ? e.message : "Create failed"); setAccMsgType("error");
    } finally { setAccCreating(false); }
  }

  async function accHandleDelete(roleId: string, roleName: string) {
    if (!window.confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    try {
      await acDeleteRoleApi(roleId);
      setAccMsg(`Role "${roleName}" deleted`); setAccMsgType("success");
      if (accSelectedRole?.role_id === roleId) setAccSelectedRole(null);
      await accLoad();
    } catch (e) {
      setAccMsg(e instanceof Error ? e.message : "Delete failed"); setAccMsgType("error");
    }
  }

  async function accHandleDrop(targetRoleId: string) {
    if (!accDragging || accDragging === targetRoleId) { setAccDragging(null); setAccDragOver(null); return; }
    try {
      await acMoveRoleApi(accDragging, targetRoleId);
      setAccMsg("Role moved ✓"); setAccMsgType("success");
      await accLoad();
    } catch (e) {
      setAccMsg(e instanceof Error ? e.message : "Move failed"); setAccMsgType("error");
    } finally { setAccDragging(null); setAccDragOver(null); }
  }

  async function accHandleExport() {
    try {
      const data = await acExportRolesApi();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `roles_export_${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch { setAccMsg("Export failed"); setAccMsgType("error"); }
  }

  async function accResolveAlert(alertId: string) {
    try {
      await acResolveAlertApi(alertId);
      setAccAlerts(prev => prev.map(a => a.alert_id === alertId ? { ...a, resolved: true } : a));
    } catch { /* silently fail */ }
  }

  async function accSaveRoleMeta() {
    if (!accSelectedRole) return;
    try {
      const res = await acUpdateRoleApi(accSelectedRole.role_id, { name: accEditName, description: accEditDesc });
      setAccSelectedRole(res.role); setAccEditRole(false);
      setAccMsg("Role updated ✓"); setAccMsgType("success");
      await accLoad();
    } catch (e) { setAccMsg(e instanceof Error ? e.message : "Update failed"); setAccMsgType("error"); }
  }

  async function handleSelfEnroll(courseId: string) {
    if (!accessToken) return;
    setCertMessage(null);
    try {
      await selfEnrollApi(accessToken, courseId);
      setCertMessage("Successfully enrolled! You can now access this course.");
      await loadDashboardData(accessToken);
    } catch (err) {
      setCertMessage(err instanceof Error ? err.message : "Failed to enroll");
    }
  }

  async function handleClaimCertificate(courseId: string) {
    if (!accessToken) return;
    setCertMessage(null);
    try {
      const cert = await issueCertificateApi(accessToken, courseId);
      setMyCertificates((prev) => {
        const exists = prev.find((c) => c.id === cert.id);
        return exists ? prev : [cert, ...prev];
      });
      setShowCertModal(cert);
      setCertMessage("Certificate issued successfully!");
    } catch (err) {
      setCertMessage(err instanceof Error ? err.message : "Failed to issue certificate");
    }
  }

  async function handleMgrSelectModule(mod: ModuleOut) {
    if (!accessToken) return;
    setMgrSelModule(mod);
    try {
      const [lessonRes, assessRes, assignRes] = await Promise.all([
        lessonsApi(accessToken, mod.id),
        listModuleAssessmentsApi(accessToken, mod.id),
        listModuleAssignmentsApi(accessToken, mod.id),
      ]);
      setMgrLessons(lessonRes);
      setMgrAssessments(assessRes);
      setMgrAssignments(assignRes);
    } catch { /* keep prior state */ }
  }

  async function handleMgrSelectCourse(course: CourseOut) {
    if (!accessToken) return;
    setMgrMongoCourse(null);
    setMgrMongoModuleIdx(-1);
    setMgrCourse(course);
    setMgrCourseTitle(course.title); setMgrCourseDesc(course.description);
    setMgrCourseObj(course.objectives); setMgrCourseCat(course.category);
    setMgrCourseThumbnail(course.thumbnail_url);
    setMgrCourseDuration(String(course.duration_hours));
    setMgrCourseTracking(course.progress_tracking_enabled);
    setMgrCourseCert(course.certification_enabled);
    setMgrCourseInstructor(course.instructor_name || "");
    setMgrCourseLevel(course.level || "");
    setMgrCourseTags(course.tags_json || []);
    try {
      const mods = await modulesApi(accessToken, course.id);
      setMgrModules(mods);
      if (mods.length > 0) await handleMgrSelectModule(mods[0]);
      const enrs = await listCourseEnrollmentsApi(accessToken, course.id);
      setMgrEnrollments(enrs);
    } catch { /* keep prior state */ }
    setMgrStep("modules");
  }

  // ── MongoDB Course Handlers ──────────────────────────────────────

  async function handleLoadMongoCourses() {
    try {
      const [courses, stats] = await Promise.all([
        mongoListCoursesApi({
          category: mongoCourseFilter.category || undefined,
          status: mongoCourseFilter.status || undefined,
          search: mongoCourseFilter.search || undefined,
        }),
        mongoGetCourseStatsApi(),
      ]);
      setMongoCourses(courses);
      setMongoCourseStats(stats);
    } catch (e) {
      setMongoCourseMsg(`Error loading courses: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function openNewCourseModal() {
    setEditingCourse(null);
    setCourseForm({ title: "", description: "", category: "Sales", level: "Beginner", duration: "", instructor: "", status: "Draft", isRecommended: false, isNew: true, tags: "" });
    setShowCourseModal(true);
  }

  function openEditCourseModal(course: MongoCourseDoc) {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      duration: course.duration,
      instructor: course.instructor,
      status: course.status,
      isRecommended: course.isRecommended,
      isNew: course.isNew,
      tags: (course.tags || []).join(", "),
    });
    setShowCourseModal(true);
  }

  async function handleSaveCourse(e: React.FormEvent) {
    e.preventDefault();
    setMongoCourseMsg(null);
    const payload = {
      title: courseForm.title,
      description: courseForm.description,
      category: courseForm.category,
      level: courseForm.level,
      duration: courseForm.duration,
      instructor: courseForm.instructor,
      status: courseForm.status,
      isRecommended: courseForm.isRecommended,
      isNew: courseForm.isNew,
      tags: courseForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
      modules: editingCourse?.modules || [],
      assignments: editingCourse?.assignments || [],
      quizzes: editingCourse?.quizzes || [],
      rating: editingCourse?.rating || 0,
      enrolledUsers: editingCourse?.enrolledUsers || 0,
      thumbnail: editingCourse?.thumbnail || "",
    };
    try {
      if (editingCourse?._id) {
        await mongoUpdateCourseApi(editingCourse._id, payload);
        setMongoCourseMsg(`Course "${payload.title}" updated successfully.`);
      } else {
        await mongoCreateCourseApi(payload);
        setMongoCourseMsg(`Course "${payload.title}" created successfully.`);
      }
      setShowCourseModal(false);
      await handleLoadMongoCourses();
    } catch (e) {
      setMongoCourseMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleArchiveCourse(id: string, title: string) {
    if (!confirm(`Archive course "${title}"? It will be hidden from learners.`)) return;
    try {
      await mongoPatchCourseApi(id, { status: "Archived" });
      setMongoCourseMsg(`Course "${title}" archived.`);
      await handleLoadMongoCourses();
    } catch (e) {
      setMongoCourseMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleDeleteCourse(id: string, title: string) {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    try {
      await mongoDeleteCourseApi(id);
      setMongoCourseMsg(`Course "${title}" deleted.`);
      await handleLoadMongoCourses();
    } catch (e) {
      setMongoCourseMsg(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleSeedCourses() {
    if (!confirm("This will insert 10 default professional courses into MongoDB. Continue?")) return;
    try {
      const result = await mongoSeedCoursesApi(false);
      setMongoCourseMsg(result.seeded ? `Seeded ${result.inserted_count} default courses successfully!` : "Courses already seeded. Use Force Reseed to overwrite.");
      await handleLoadMongoCourses();
    } catch (e) {
      setMongoCourseMsg(`Seed error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleReseedCourses() {
    if (!confirm("WARNING: This will DELETE all existing courses and re-insert the 10 defaults. Continue?")) return;
    try {
      const result = await mongoSeedCoursesApi(true);
      setMongoCourseMsg(`Force re-seeded ${result.inserted_count} courses.`);
      await handleLoadMongoCourses();
    } catch (e) {
      setMongoCourseMsg(`Reseed error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /* ── Profile ──────────────────────────────────────────────────── */
  async function handleSaveProfile(data: Omit<UserProfileDoc, "_id" | "user_id" | "updated_at">) {
    if (!me) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const updated = await mongoUpsertProfileApi(me.id, data);
      setUserProfile(updated);
      setProfileMsg("Profile saved successfully!");
      setTimeout(() => setProfileMsg(null), 3000);
    } catch {
      setProfileMsg("Failed to save profile. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  }

  /* ── Copilot ──────────────────────────────────────────────────── */
  async function sendCopilotMessage(question: string) {
    if (!question.trim() || copilotLoading) return;
    const userMsg: CopilotMsg = { role: "user", text: question, timestamp: new Date() };
    setCopilotMessages(prev => [...prev, userMsg]);
    setCopilotInput("");
    setCopilotLoading(true);
    await new Promise(r => setTimeout(r, 1100 + Math.random() * 700));
    const aiText = generateCopilotResponse(question, me?.role ?? "employee", courses, mgrUsers);
    const aiMsg: CopilotMsg = { role: "ai", text: aiText, timestamp: new Date() };
    setCopilotMessages(prev => [...prev, aiMsg]);
    setCopilotLoading(false);
  }

  /* ─── Role badge color ─── */
  const roleAccent = me?.role === "admin" ? "#7c3aed" : me?.role === "manager" ? "#0891b2" : "#059669";

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div style={s.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        * { box-sizing: border-box; }
        body { margin:0; }
        button:hover { filter: brightness(0.95); }
      `}</style>

      {/* ── Sidebar ── */}
      <aside style={s.sidebar}>
        {/* Logo */}
        <div style={s.sidebarLogo}>
          <div style={s.logoMark}>
            <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
              <path d="M10 32 L22 12 L34 32" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 25 L29 25" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <circle cx="22" cy="12" r="3" fill="white" />
            </svg>
          </div>
          <span style={s.logoText}>AI-LMS</span>
        </div>

        {/* User pill */}
        <div style={s.userPill}>
          <div style={{ ...s.avatarCircle, background: roleAccent }}>
            {me ? me.full_name.charAt(0).toUpperCase() : "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={s.userName}>{me?.full_name ?? "Loading…"}</div>
            <div style={{ ...s.userRole, color: roleAccent }}>{me ? roleLabel(me.role) : ""}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          <div style={s.navSection}>WORKSPACE</div>
          {NAV_ITEMS.filter((item) => (!item.adminOnly || canManageOnboarding) && !(item.hideForAdmin && canManageOnboarding)).map((item) => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => {
                if (item.id === "audit-log") {
                  router.push("/dashboard/admin/audit-logs");
                } else if (item.id === "knowledge") {
                  router.push("/dashboard/admin/knowledge");
                } else if (item.id === "performance") {
                  router.push("/dashboard/admin/performance");
                } else if (item.id === "adaptive-rules") {
                  router.push("/dashboard/admin/adaptive-rules");
                } else {
                  setActiveTab(item.id);
                }
              }}
                style={{ ...s.navBtn, ...(active ? s.navBtnActive : {}) }}>
                <span style={{ ...s.navIcon, ...(active ? s.navIconActive : {}) }}>
                  <Icon d={item.iconD} size={16} color={active ? "#4f46e5" : "#64748b"} />
                </span>
                {item.label}
                {active && <span style={s.navActiveDot} />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <button style={s.logoutBtn} onClick={() => { localStorage.clear(); router.push("/login"); }}>
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={16} color="#ef4444" />
          Sign Out
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={s.main}>
        {/* Top bar */}
        <header style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>{NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? "Dashboard"}</h1>
            <div style={s.pageBreadcrumb}>AI-LMS &rsaquo; {roleLabel(expectedRole)} &rsaquo; {NAV_ITEMS.find((n) => n.id === activeTab)?.label}</div>
          </div>
          <div style={s.topBarRight}>
            {canManageOnboarding && (
              <>
                <SecondaryBtn onClick={() => void handleCopyMyUserId()}>Copy My ID</SecondaryBtn>
                <SecondaryBtn onClick={() => void handleUseMyUserIdForKpi()}>Use My ID for KPI</SecondaryBtn>
              </>
            )}
            {isPollingJob && (
              <div style={s.pollingBadge}>
                <span style={s.spinner} />
                Job running…
              </div>
            )}
            {/* MongoDB live-sync indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#64748b", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }} />
              {mongoLastSync
                ? `Synced ${mongoLastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Live sync active"}
            </div>
            {/* Profile button */}
            <button
              onClick={() => setShowProfilePanel(true)}
              title="My Profile"
              style={{ width: 36, height: 36, borderRadius: "50%", background: me?.role === "admin" ? "linear-gradient(135deg,#7c3aed,#6d28d9)" : "linear-gradient(135deg,#059669,#047857)", border: "2px solid #e9d5ff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0, overflow: "hidden" }}
            >
              {userProfile?.avatar_url
                ? <img src={userProfile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (me ? me.full_name.charAt(0).toUpperCase() : "?")}
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={s.content}>
          {loading && (
            <div style={s.loadingOverlay}>
              <div style={s.loadingSpinner} />
              <span style={{ color: "#64748b", marginTop: 12, fontSize: 14 }}>Loading dashboard…</span>
            </div>
          )}
          {error && <MsgBox msg={error} type="error" />}

          {/* ─── OVERVIEW ─── */}
          {activeTab === "overview" && (
            <>
              {/* Stats — driven by MongoDB Training Catalog when PostgreSQL is empty */}
              {(() => {
                const totalCourses = courses.length || mongoCourses.length;
                const totalModules = modules.length || mongoCourses.reduce((s, c) => s + (c.modules?.length ?? 0), 0);
                const totalLessons = lessons.length || mongoCourses.reduce((s, c) => s + (c.modules?.reduce((ms, m) => ms + (m.lessons?.length ?? 0), 0) ?? 0), 0);
                const totalAssignments = mongoCourses.reduce((s, c) => s + (c.assignments?.length ?? 0), 0);
                const totalQuizzes = mongoCourses.reduce((s, c) => s + (c.quizzes?.length ?? 0), 0);
                const publishedCourses = mongoCourses.filter(c => c.status === "Published").length;
                return (
                  <div style={s.statsGrid}>
                    <StatCard label="Total Courses" value={totalCourses} iconD="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" accent="#4f46e5" />
                    <StatCard label="Published" value={publishedCourses} iconD="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" accent="#059669" />
                    <StatCard label="Total Modules" value={totalModules} iconD="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" accent="#0891b2" />
                    <StatCard label="Total Lessons" value={totalLessons} iconD="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" accent="#7c3aed" />
                    <StatCard label="Assignments" value={totalAssignments} iconD="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" accent="#f59e0b" />
                    <StatCard label="Quizzes" value={totalQuizzes} iconD="M9 11l3 3L22 4" accent="#ec4899" />
                    {mongoCourseStats && <StatCard label="Sales Courses" value={mongoCourseStats.by_category.Sales} iconD="M12 2l3.09 6.26L22 9.27l-5 4.87" accent="#0891b2" />}
                    {mongoCourseStats && <StatCard label="Support Courses" value={mongoCourseStats.by_category.Support} iconD="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07" accent="#7c3aed" />}
                    {mongoCourseStats && <StatCard label="Ops Courses" value={mongoCourseStats.by_category.Operations} iconD="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" accent="#dc2626" />}
                    {gamificationProfile && (
                      <StatCard label="XP Points" value={gamificationProfile.xp_points} iconD="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" accent="#ec4899" />
                    )}
                    <StatCard label="Knowledge Items" value={knowledgeStats?.total_items ?? 0} iconD="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" accent="#f59e0b" />
                  </div>
                );
              })()}

              {/* Gamification quick view */}
              {gamificationProfile && (
                <Card>
                  <CardHeader title="Your Progress" subtitle="Gamification & streak" icon="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  <div style={s.xpRow}>
                    {[
                      { label: "Level", value: gamificationProfile.level, color: "#7c3aed" },
                      { label: "XP",    value: gamificationProfile.xp_points, color: "#4f46e5" },
                      { label: "Badges", value: gamificationProfile.badges_count, color: "#f59e0b" },
                      { label: "Streak", value: `${gamificationProfile.streak_days}d`, color: "#059669" },
                    ].map((item) => (
                      <div key={item.label} style={{ ...s.xpTile, borderColor: item.color + "33" }}>
                        <div style={{ ...s.xpValue, color: item.color }}>{item.value}</div>
                        <div style={s.xpLabel}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  {gamificationProfile.badges.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                      {gamificationProfile.badges.slice(0, 5).map((badge) => (
                        <Badge key={`${badge.badge_code}-${badge.awarded_at}`} label={badge.badge_name} color="#7c3aed" bg="#f5f3ff" />
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Active job */}
              {activeJobStatus && (
                <Card>
                  <CardHeader title="Background Job" subtitle="Last async task" icon="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                    <StatusBadge status={activeJobStatus.status} />
                    <span style={{ fontSize: 14, color: "#374151" }}>{activeJobStatus.job_type}</span>
                  </div>
                  {activeJobStatus.error_message && <MsgBox msg={activeJobStatus.error_message} type="error" />}
                </Card>
              )}

              {/* ── MongoDB Training Catalog (Overview) ── */}
              {mongoCourses.length > 0 && (
                <Card>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                    <CardHeader
                      title="Training Catalog"
                      subtitle={`${mongoCourses.length} professional courses · Sales · Support · Operations`}
                      icon="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    />
                    <button onClick={() => setActiveTab("courses-mongo")} style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "1.5px solid #4f46e5", background: "#eef2ff", color: "#4f46e5", cursor: "pointer" }}>
                      Manage All →
                    </button>
                  </div>

                  {/* Category stat pills */}
                  {mongoCourseStats && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                      {[
                        { label: "All", count: mongoCourseStats.total, color: "#4f46e5", bg: "#eef2ff", cat: "" },
                        { label: "Sales", count: mongoCourseStats.by_category.Sales, color: "#0891b2", bg: "#e0f2fe", cat: "Sales" },
                        { label: "Support", count: mongoCourseStats.by_category.Support, color: "#7c3aed", bg: "#f5f3ff", cat: "Support" },
                        { label: "Operations", count: mongoCourseStats.by_category.Operations, color: "#dc2626", bg: "#fee2e2", cat: "Operations" },
                      ].map(({ label, count, color, bg }) => (
                        <span key={label} style={{ fontSize: 12.5, fontWeight: 700, padding: "5px 12px", borderRadius: 20, background: bg, color, border: `1.5px solid ${color}25` }}>
                          {label} <span style={{ opacity: 0.7 }}>({count})</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                    {mongoCourses.slice(0, 6).map((course) => {
                      const catColor: Record<string, string> = { Sales: "#0891b2", Support: "#7c3aed", Operations: "#dc2626" };
                      const cc = catColor[course.category] ?? "#4f46e5";
                      return (
                        <div key={course._id} style={{ borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fafafa", overflow: "hidden" }}>
                          <div style={{ height: 3, background: cc }} />
                          <div style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                              <Badge label={course.category} color={cc} bg={`${cc}15`} />
                              <Badge label={course.level} color="#374151" bg="#f1f5f9" />
                              {course.isNew && <Badge label="New" color="#7c3aed" bg="#f5f3ff" />}
                              {course.isRecommended && <Badge label="⭐" color="#d97706" bg="#fef3c7" />}
                            </div>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginBottom: 5, lineHeight: 1.3 }}>{course.title}</div>
                            <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {course.description}
                            </div>
                            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#94a3b8" }}>
                              {course.instructor && <span>👩‍🏫 {course.instructor}</span>}
                              {course.duration && <span>⏱ {course.duration}</span>}
                              <span>📚 {course.modules?.length ?? 0} modules</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {mongoCourses.length > 6 && (
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                      <button onClick={() => setActiveTab("learning")} style={{ fontSize: 13, fontWeight: 600, color: "#4f46e5", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        View all {mongoCourses.length} courses in Learning tab →
                      </button>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {/* ─── LEARNING ─── */}
          {(activeTab === "learning" || activeTab === "overview") && activeTab === "learning" && (
            <>
              {/* ── MongoDB Professional Courses (Learning tab) ── */}
              {mongoCourses.length > 0 && (
                <Card>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
                    <CardHeader
                      title="Professional Training Courses"
                      subtitle={`${mongoCourses.length} courses across Sales, Support & Operations`}
                      icon="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    />
                    {canManageOnboarding && (
                      <button onClick={() => setActiveTab("courses-mongo")} style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 8, border: "1.5px solid #4f46e5", background: "#eef2ff", color: "#4f46e5", cursor: "pointer" }}>
                        Manage Courses →
                      </button>
                    )}
                  </div>

                  {/* Category filter tabs */}
                  {(() => {
                    const filtered = learningCatFilter ? mongoCourses.filter(c => c.category === learningCatFilter) : mongoCourses;
                    const catColor: Record<string, string> = { Sales: "#0891b2", Support: "#7c3aed", Operations: "#dc2626" };
                    return (
                      <>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, marginTop: 8 }}>
                          {["", "Sales", "Support", "Operations"].map((cat) => (
                            <button key={cat || "all"} onClick={() => setLearningCatFilter(cat)} style={{
                              padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
                              borderColor: learningCatFilter === cat ? (catColor[cat] ?? "#4f46e5") : "#e2e8f0",
                              background: learningCatFilter === cat ? ((catColor[cat] ?? "#4f46e5") + "15") : "#f8fafc",
                              color: learningCatFilter === cat ? (catColor[cat] ?? "#4f46e5") : "#64748b",
                              fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                            }}>
                              {cat || "All"} ({cat ? mongoCourses.filter(c => c.category === cat).length : mongoCourses.length})
                            </button>
                          ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
                          {filtered.map((course) => {
                            const cc = catColor[course.category] ?? "#4f46e5";
                            const statusStyle: Record<string, { color: string; bg: string }> = {
                              Published: { color: "#059669", bg: "#d1fae5" },
                              Draft: { color: "#d97706", bg: "#fef3c7" },
                              Archived: { color: "#6b7280", bg: "#f3f4f6" },
                            };
                            const ss = statusStyle[course.status] ?? { color: "#6b7280", bg: "#f3f4f6" };
                            return (
                              <div key={course._id} style={{ borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column" }}>
                                <div style={{ height: 4, background: cc }} />
                                <div style={{ padding: "14px 16px", flex: 1 }}>
                                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                                    <Badge label={course.category} color={cc} bg={`${cc}15`} />
                                    <Badge label={course.level} color="#374151" bg="#f1f5f9" />
                                    <Badge label={course.status} color={ss.color} bg={ss.bg} />
                                    {course.isNew && <Badge label="New" color="#7c3aed" bg="#f5f3ff" />}
                                    {course.isRecommended && <Badge label="⭐ Recommended" color="#d97706" bg="#fef3c7" />}
                                  </div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6, lineHeight: 1.3 }}>{course.title}</div>
                                  <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5, marginBottom: 10, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                    {course.description}
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11.5, color: "#94a3b8" }}>
                                    {course.instructor && <span>👩‍🏫 {course.instructor}</span>}
                                    {course.duration && <span>⏱ {course.duration}</span>}
                                    <span>📚 {course.modules?.length ?? 0} modules</span>
                                    <span>📝 {course.assignments?.length ?? 0} assignments</span>
                                    <span>❓ {course.quizzes?.length ?? 0} quizzes</span>
                                  </div>
                                </div>
                                {course.modules && course.modules.length > 0 && (
                                  <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Modules</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                      {course.modules.slice(0, 3).map((mod, idx) => (
                                        <div key={idx} style={{ fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ width: 18, height: 18, borderRadius: "50%", background: cc + "20", color: cc, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</span>
                                          {mod.title}
                                        </div>
                                      ))}
                                      {course.modules.length > 3 && <div style={{ fontSize: 11, color: "#94a3b8", marginLeft: 24 }}>+{course.modules.length - 3} more modules</div>}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </Card>
              )}

              {/* Certificate Modal */}
              {showCertModal && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
                  onClick={() => setShowCertModal(null)}>
                  <div style={{ background: "#fff", borderRadius: 16, maxWidth: 680, width: "100%", padding: 0, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}
                    onClick={(e) => e.stopPropagation()}>
                    {/* Certificate Template */}
                    <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #4f46e5 50%, #7c3aed 100%)", padding: "40px 48px", textAlign: "center", position: "relative" }}>
                      <div style={{ position: "absolute", top: 16, right: 16, opacity: 0.15, fontSize: 120, lineHeight: 1 }}>✦</div>
                      <div style={{ fontSize: 12, letterSpacing: "0.25em", color: "#bfdbfe", textTransform: "uppercase", marginBottom: 8 }}>Certificate of Completion</div>
                      <div style={{ fontSize: 11, color: "#93c5fd", marginBottom: 24 }}>This certifies that</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 6 }}>{showCertModal.recipient_name}</div>
                      <div style={{ fontSize: 13, color: "#bfdbfe", marginBottom: 24 }}>has successfully completed</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#fde68a", marginBottom: 6, lineHeight: 1.3 }}>{showCertModal.course_title}</div>
                      <div style={{ fontSize: 12, color: "#93c5fd", marginBottom: 32 }}>
                        {showCertModal.template_data_json?.category ? `Category: ${String(showCertModal.template_data_json.category)} · ` : ""}
                        {showCertModal.template_data_json?.duration_hours ? `${String(showCertModal.template_data_json.duration_hours)} hours` : ""}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24 }}>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.4)", paddingTop: 8, fontSize: 12, color: "#bfdbfe" }}>{showCertModal.instructor_name}</div>
                          <div style={{ fontSize: 11, color: "#93c5fd" }}>Instructor</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 22, marginBottom: 4 }}>🎓</div>
                          <div style={{ fontSize: 10, color: "#93c5fd" }}>AI-LMS Platform</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.4)", paddingTop: 8, fontSize: 12, color: "#bfdbfe" }}>{new Date(showCertModal.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
                          <div style={{ fontSize: 11, color: "#93c5fd" }}>Date of Issue</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: "16px 24px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>Certificate No: <code style={{ color: "#4f46e5", fontWeight: 600 }}>{showCertModal.certificate_number}</code></div>
                      <button onClick={() => setShowCertModal(null)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Close</button>
                    </div>
                  </div>
                </div>
              )}

              {/* My Certificates */}
              {myCertificates.length > 0 && (
                <Card>
                  <CardHeader title="My Certificates" subtitle={`${myCertificates.length} earned`} icon="M12 15l-2 5L8 18l-5 3 3-5-2-2 7-7 1 1zm9-13l-4 4-2-2 4-4 2 2zM5 13l-2 2 2 2 2-2-2-2z" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
                    {myCertificates.map((cert) => (
                      <div key={cert.id} style={{ padding: "14px 18px", borderRadius: 12, background: "linear-gradient(135deg, #eef2ff, #f5f3ff)", border: "2px solid #c7d2fe", minWidth: 260, cursor: "pointer" }}
                        onClick={() => setShowCertModal(cert)}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>🎓</div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#3730a3", marginBottom: 4 }}>{cert.course_title}</div>
                        <div style={{ fontSize: 12, color: "#6366f1" }}>{cert.certificate_number}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{new Date(cert.issued_at).toLocaleDateString()}</div>
                        <div style={{ marginTop: 8, fontSize: 11, color: "#4f46e5", fontWeight: 600 }}>Click to view certificate →</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {certMessage && <MsgBox msg={certMessage} type={certMessage.toLowerCase().includes("fail") || certMessage.toLowerCase().includes("error") ? "error" : "success"} />}

              {/* ── Learning Flow Analytics Card ─────────────────────── */}
              {(() => {
                const lfBg     = lfDark ? "#0f172a" : "#ffffff";
                const lfCard   = lfDark ? "#1e293b" : "#f8fafc";
                const lfBorder = lfDark ? "#334155" : "#e2e8f0";
                const lfText   = lfDark ? "#f1f5f9" : "#0f172a";
                const lfMuted  = lfDark ? "#94a3b8" : "#64748b";
                const lfInput  = lfDark ? "#0f172a" : "#ffffff";

                const lfSM: Record<string,{color:string;bg:string;dot:string}> = {
                  "Excellent":       {color:"#059669",bg:"#d1fae5",dot:"#10b981"},
                  "Moderate":        {color:"#d97706",bg:"#fef3c7",dot:"#f59e0b"},
                  "Needs Attention": {color:"#dc2626",bg:"#fee2e2",dot:"#ef4444"},
                };
                const lfAC = ["#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7"];
                const lfAvBg  = (n:string) => lfAC[(n.charCodeAt(0)||0)%lfAC.length];
                const lfInits = (n:string) => n.trim().split(" ").map(p=>p[0]).join("").toUpperCase().slice(0,2);

                const lfTimeAgo = lfLastSync ? (()=>{
                  const d=Math.floor((Date.now()-lfLastSync.getTime())/1000);
                  if(d<60) return `${d}s ago`;
                  if(d<3600) return `${Math.floor(d/60)}m ago`;
                  return `${Math.floor(d/3600)}h ago`;
                })() : null;

                const lfTabs = [
                  {id:"employee" as const, label:"Employee Performance", icon:"👥"},
                  {id:"manager"  as const, label:"Manager Activity",     icon:"👔"},
                  {id:"team"     as const, label:"Team Overview",        icon:"🏆"},
                  {id:"insights" as const, label:"AI Insights",          icon:"🤖"},
                ];

                const lfEF = (lfData?.employee_performance ?? []).filter((e:LfEmployeePerformance)=>{
                  const q=lfSearch.toLowerCase();
                  if(q && !e.employee_name.toLowerCase().includes(q) && !e.department.toLowerCase().includes(q)) return false;
                  if(lfCategoryFilter!=="all" && !e.department.toLowerCase().includes(lfCategoryFilter.toLowerCase())) return false;
                  if(lfStatusFilter!=="all" && e.status!==lfStatusFilter) return false;
                  return true;
                });
                const lfMF = (lfData?.manager_activity??[]).filter(m=>!lfSearch||m.manager_name.toLowerCase().includes(lfSearch.toLowerCase()));
                const lfTF = (lfData?.team_performance??[]).filter(t=>!lfSearch||t.team_name.toLowerCase().includes(lfSearch.toLowerCase()));

                return (
                  <div className="lf-slide-in" style={{borderRadius:16,overflow:"hidden",border:`1.5px solid ${lfBorder}`,background:lfBg,boxShadow:"0 4px 28px rgba(0,0,0,0.08)"}}>

                    {/* gradient header */}
                    <div style={{background:"linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#0891b2 100%)",padding:"20px 24px",position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",top:-24,right:-24,width:130,height:130,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
                      <div style={{position:"absolute",bottom:-28,left:90,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,position:"relative"}}>
                        <div style={{display:"flex",alignItems:"center",gap:12}}>
                          <div style={{width:46,height:46,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📊</div>
                          <div>
                            <div style={{fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>Learning Flow Analytics</div>
                            <div style={{fontSize:12,color:"rgba(255,255,255,0.68)",marginTop:2}}>Employee · Manager · Team · AI Insights — auto-synced</div>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          {lfTimeAgo&&<span style={{fontSize:11,color:"rgba(255,255,255,0.55)",background:"rgba(0,0,0,0.22)",padding:"3px 9px",borderRadius:20}}>Last sync: {lfTimeAgo}</span>}
                          <button onClick={()=>void fetchLearningFlow(true)} disabled={lfSyncing}
                            style={{fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.14)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:5,opacity:lfSyncing?0.7:1}}>
                            <span className={lfSyncing?"lf-spin":""} style={{display:"inline-block"}}>↻</span>
                            {lfSyncing?"Syncing…":"Sync Now"}
                          </button>
                          <button onClick={()=>setLfDark(!lfDark)} title="Toggle dark mode"
                            style={{fontSize:15,padding:"5px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.1)",color:"#fff",cursor:"pointer"}}>
                            {lfDark?"☀":"◐"}
                          </button>
                          <button title="Run diagnostics"
                            onClick={()=>{
                              setLfDebugOpen(v=>!v);
                              if(!lfDebug) getLearningFlowDebugApi().then(setLfDebug).catch(()=>{});
                            }}
                            style={{fontSize:12,padding:"5px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.1)",color:"#fff",cursor:"pointer"}}>
                            🔎 Debug
                          </button>
                        </div>
                      </div>

                      {/* KPI tiles */}
                      {lfData&&(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:10,marginTop:16}}>
                          {([
                            {label:"Total Learners", value:lfData.ai_insights.total_employees,    icon:"👥",clr:"#bfdbfe"},
                            {label:"Avg Completion", value:`${lfData.ai_insights.avg_completion}%`,icon:"📈",clr:"#bbf7d0"},
                            {label:"Avg Score",      value:lfData.ai_insights.avg_score,           icon:"⭐",clr:"#fde68a"},
                            {label:"Active Courses", value:lfData.ai_insights.published_courses,   icon:"📚",clr:"#ddd6fe"},
                          ] as {label:string;value:string|number;icon:string;clr:string}[]).map(k=>(
                            <div key={k.label} style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(255,255,255,0.14)"}}>
                              <div style={{fontSize:18}}>{k.icon}</div>
                              <div style={{fontSize:22,fontWeight:800,color:k.clr,lineHeight:1.1,marginTop:4}}>{k.value}</div>
                              <div style={{fontSize:10.5,color:"rgba(255,255,255,0.58)",marginTop:2}}>{k.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Debug Panel */}
                    {lfDebugOpen&&(
                      <div className="lf-slide-in" style={{background:lfDark?"#0f172a":"#f8fafc",borderBottom:`1px solid ${lfBorder}`,borderTop:`1px solid ${lfBorder}`,padding:"14px 18px"}}>
                        {!lfDebug?(
                          <div style={{display:"flex",alignItems:"center",gap:8,color:lfMuted,fontSize:13}}>
                            <div className="lf-spin" style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${lfBorder}`,borderTopColor:"#4f46e5",flexShrink:0}}/>
                            Loading debug info…
                          </div>
                        ):(
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:10}}>
                              <span style={{fontSize:13,fontWeight:700,color:lfText}}>🔎 Collection Snapshot</span>
                              <span style={{fontSize:12,padding:"2px 8px",borderRadius:12,background:lfDebug.team_progress.count>0?"#dcfce7":"#fee2e2",color:lfDebug.team_progress.count>0?"#15803d":"#dc2626",fontWeight:600}}>Team_progress: {lfDebug.team_progress.count} docs</span>
                              <span style={{fontSize:12,padding:"2px 8px",borderRadius:12,background:lfDark?"#1e293b":"#f1f5f9",color:lfMuted}}>Users: {lfDebug.users.count} ({lfDebug.users.employee_count} employees)</span>
                              <span style={{fontSize:12,padding:"2px 8px",borderRadius:12,background:lfDark?"#1e293b":"#f1f5f9",color:lfMuted}}>Courses: {lfDebug.courses.count}</span>
                              <button onClick={()=>{setLfDebug(null);getLearningFlowDebugApi().then(setLfDebug).catch(()=>{});}}
                                style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:`1px solid ${lfBorder}`,background:lfCard,color:lfText,cursor:"pointer",marginLeft:"auto"}}>
                                ↻ Refresh
                              </button>
                            </div>
                            {lfDebug.team_progress.count===0?(
                              <div style={{padding:"10px 14px",borderRadius:8,background:lfDark?"#1e0707":"#fef2f2",border:"1px solid #fca5a5",color:"#dc2626",fontSize:12}}>
                                ⚠️ <b>Team_progress returned 0 documents.</b> The backend may need to be restarted with the updated code, or collection name casing may differ. Check that the Motor connection points to "Team_progress" in the "webx" database.
                              </div>
                            ):(
                              <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${lfBorder}`}}>
                                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                                  <thead>
                                    <tr style={{background:lfDark?"#1e293b":"#f1f5f9"}}>
                                      {["Name","Role","Completion","KPI","Status"].map(h=>(
                                        <th key={h} style={{padding:"6px 10px",textAlign:h==="Completion"||h==="KPI"?"right":"left",color:lfMuted,fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lfDebug.team_progress.docs.map((d,i)=>(
                                      <tr key={i} style={{borderTop:`1px solid ${lfBorder}`}}>
                                        <td style={{padding:"5px 10px",color:lfText,fontWeight:500}}>{d.name||<em style={{color:lfMuted}}>—</em>}</td>
                                        <td style={{padding:"5px 10px",color:lfMuted}}>{d.role||"—"}</td>
                                        <td style={{padding:"5px 10px",textAlign:"right",color:d.completion!=null?(d.completion>=80?"#059669":d.completion>=50?"#d97706":"#dc2626"):lfMuted}}>{d.completion!=null?`${d.completion}%`:"—"}</td>
                                        <td style={{padding:"5px 10px",textAlign:"right",color:lfMuted}}>{d.kpi!=null?d.kpi:"—"}</td>
                                        <td style={{padding:"5px 10px",color:lfMuted}}>{d.status||"—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* tab bar */}
                    <div style={{display:"flex",borderBottom:`1px solid ${lfBorder}`,background:lfCard,overflowX:"auto"}}>
                      {lfTabs.map(tab=>(
                        <button key={tab.id} onClick={()=>setLfActiveTab(tab.id)}
                          style={{padding:"12px 15px",fontSize:13,fontWeight:lfActiveTab===tab.id?700:500,color:lfActiveTab===tab.id?"#4f46e5":lfMuted,background:"transparent",border:"none",borderBottom:`2.5px solid ${lfActiveTab===tab.id?"#4f46e5":"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
                          {tab.icon} {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* search + filter bar */}
                    <div style={{padding:"12px 18px",background:lfCard,borderBottom:`1px solid ${lfBorder}`,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                      <div style={{position:"relative",flex:1,minWidth:180}}>
                        <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:lfMuted}}>🔍</span>
                        <input value={lfSearch} onChange={e=>setLfSearch(e.target.value)} placeholder="Search employees, managers, teams…"
                          style={{width:"100%",padding:"7px 10px 7px 30px",borderRadius:8,border:`1.5px solid ${lfBorder}`,background:lfInput,color:lfText,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      {lfActiveTab==="employee"&&(
                        <>
                          <select value={lfCategoryFilter} onChange={e=>setLfCategoryFilter(e.target.value)}
                            style={{padding:"7px 10px",borderRadius:8,border:`1.5px solid ${lfBorder}`,background:lfInput,color:lfText,fontSize:13,cursor:"pointer"}}>
                            <option value="all">All Depts</option>
                            <option value="Sales">Sales</option>
                            <option value="Support">Support</option>
                            <option value="Operations">Operations</option>
                          </select>
                          <select value={lfStatusFilter} onChange={e=>setLfStatusFilter(e.target.value)}
                            style={{padding:"7px 10px",borderRadius:8,border:`1.5px solid ${lfBorder}`,background:lfInput,color:lfText,fontSize:13,cursor:"pointer"}}>
                            <option value="all">All Status</option>
                            <option value="Excellent">Excellent</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Needs Attention">Needs Attention</option>
                          </select>
                        </>
                      )}
                      {lfData&&<span style={{fontSize:11,color:lfMuted,marginLeft:"auto"}}>{lfData.courses_synced} courses · {lfData.users_synced} users synced</span>}
                    </div>

                    {/* content area */}
                    <div style={{background:lfBg,padding:"20px 18px",minHeight:220}}>

                      {lfLoading&&!lfData&&(
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:14}}>
                          <div className="lf-spin" style={{width:36,height:36,borderRadius:"50%",border:`3px solid ${lfBorder}`,borderTopColor:"#4f46e5"}}/>
                          <div style={{fontSize:13,color:lfMuted}}>Loading analytics…</div>
                        </div>
                      )}

                      {!lfLoading&&!lfData&&(
                        <div style={{textAlign:"center",padding:"50px 20px"}}>
                          <div style={{fontSize:42,marginBottom:12}}>📊</div>
                          <div style={{fontSize:15,fontWeight:600,color:lfText,marginBottom:8}}>No analytics data yet</div>
                          <div style={{fontSize:13,color:lfMuted,marginBottom:18}}>Click Sync Now to load performance data from your courses and users.</div>
                          <button onClick={()=>void fetchLearningFlow(true)}
                            style={{padding:"10px 24px",borderRadius:8,border:"none",background:"#4f46e5",color:"#fff",fontWeight:600,cursor:"pointer",fontSize:13}}>
                            Load Analytics
                          </button>
                        </div>
                      )}

                      {lfData&&(
                        <>
                          {/* employee performance */}
                          {lfActiveTab==="employee"&&(
                            <div className="lf-slide-in">
                              {lfEF.length===0
                                ? <div style={{textAlign:"center",padding:"40px",color:lfMuted}}>No employees match your filters.</div>
                                : (
                                  <div style={{overflowX:"auto"}}>
                                    <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"0 6px",fontSize:13}}>
                                      <thead>
                                        <tr>
                                          {["#","Employee","Role / Dept","Modules","Progress","Done","Score","KPI","Status"].map(h=>(
                                            <th key={h} style={{padding:"6px 10px",textAlign:"left",color:lfMuted,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {lfEF.map((emp:LfEmployeePerformance,idx:number)=>{
                                          const ss=lfSM[emp.status]??lfSM["Moderate"];
                                          const bar=emp.completion_pct>=80?"#059669":emp.completion_pct>=50?"#d97706":"#dc2626";
                                          const isEx=lfExpandedEmp===emp.employee_id;
                                          return(
                                            <React.Fragment key={emp.employee_id}>
                                              <tr onClick={()=>setLfExpandedEmp(isEx?null:emp.employee_id)}
                                                style={{background:lfDark?"#1e293b":"#fff",cursor:"pointer",boxShadow:`0 1px 3px rgba(0,0,0,${lfDark?"0.3":"0.04"})`}}>
                                                <td style={{padding:"11px 10px",borderRadius:"8px 0 0 8px",color:lfMuted,fontWeight:600,fontSize:12}}>{idx+1}</td>
                                                <td style={{padding:"11px 10px"}}>
                                                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                                                    <div style={{width:34,height:34,borderRadius:"50%",background:lfAvBg(emp.employee_name),color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{lfInits(emp.employee_name)}</div>
                                                    <div>
                                                      <div style={{fontWeight:600,color:lfText,fontSize:13}}>{emp.employee_name}</div>
                                                      <div style={{fontSize:10.5,color:lfMuted}}>{emp.email}</div>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td style={{padding:"11px 10px"}}>
                                                  <span style={{padding:"3px 9px",borderRadius:20,background:lfDark?"#334155":"#f1f5f9",color:lfText,fontSize:11,fontWeight:600}}>{emp.department}</span>
                                                </td>
                                                <td style={{padding:"11px 10px",color:lfText,fontWeight:600}}>
                                                  {emp.modules_completed}<span style={{color:lfMuted,fontWeight:400}}>/{emp.modules_assigned}</span>
                                                </td>
                                                <td style={{padding:"11px 10px",minWidth:110}}>
                                                  <div style={{height:7,borderRadius:4,background:lfDark?"#334155":"#e2e8f0",overflow:"hidden"}}>
                                                    <div style={{height:"100%",width:`${emp.completion_pct}%`,background:bar,borderRadius:4,transition:"width 0.5s ease"}}/>
                                                  </div>
                                                </td>
                                                <td style={{padding:"11px 10px",color:bar,fontWeight:700}}>{emp.completion_pct}%</td>
                                                <td style={{padding:"11px 10px",color:lfText,fontWeight:600}}>{emp.avg_score}</td>
                                                <td style={{padding:"11px 10px"}}>
                                                  {emp.kpi != null
                                                    ? <span style={{fontSize:12,fontWeight:700,color:"#0891b2"}}>{emp.kpi}%</span>
                                                    : <span style={{fontSize:11,color:lfMuted}}>—</span>
                                                  }
                                                </td>
                                                <td style={{padding:"11px 10px",borderRadius:"0 8px 8px 0"}}>
                                                  <span style={{padding:"4px 10px",borderRadius:20,background:ss.bg,color:ss.color,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                                                    <span style={{width:6,height:6,borderRadius:"50%",background:ss.dot,flexShrink:0}}/>
                                                    {emp.status}
                                                  </span>
                                                  {emp.tp_status&&<div style={{fontSize:10,color:lfMuted,marginTop:2}}>{emp.tp_status}</div>}
                                                </td>
                                              </tr>
                                              {isEx&&(
                                                <tr style={{background:lfDark?"#0f172a":"#f8fafc"}}>
                                                  <td colSpan={9} style={{padding:"12px 14px 16px 52px"}}>
                                                    {/* simulation score badges */}
                                                    {(emp.kpi!=null||emp.pitch_score!=null||emp.objection_score!=null||emp.escalation_score!=null)&&(
                                                      <div style={{marginBottom:12}}>
                                                        <div style={{fontSize:10.5,fontWeight:700,color:lfMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Simulation Scores</div>
                                                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                                          {([
                                                            {label:"KPI",         val:emp.kpi,           color:"#0891b2"},
                                                            {label:"Pitch",       val:emp.pitch_score,   color:"#7c3aed"},
                                                            {label:"Objection",   val:emp.objection_score,color:"#d97706"},
                                                            {label:"Escalation",  val:emp.escalation_score,color:"#059669"},
                                                          ] as {label:string;val:number|null|undefined;color:string}[]).filter(s=>s.val!=null).map(s=>{
                                                            const v=s.val as number;
                                                            return(
                                                              <div key={s.label} style={{display:"flex",flexDirection:"column",alignItems:"center",background:lfDark?"#1e293b":"#fff",border:`1px solid ${lfBorder}`,borderRadius:10,padding:"8px 14px",minWidth:72}}>
                                                                <span style={{fontSize:18,fontWeight:800,color:v>=80?"#059669":v>=60?"#d97706":"#dc2626"}}>{v}%</span>
                                                                <span style={{fontSize:10,color:lfMuted,fontWeight:600,marginTop:2}}>{s.label}</span>
                                                                <div style={{width:"100%",height:3,borderRadius:2,background:lfDark?"#334155":"#e2e8f0",marginTop:5}}>
                                                                  <div style={{height:"100%",width:`${v}%`,background:s.color,borderRadius:2}}/>
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                          {emp.tp_status&&(
                                                            <div style={{display:"flex",alignItems:"center",padding:"8px 14px",background:lfDark?"#1e293b":"#fff",border:`1px solid ${lfBorder}`,borderRadius:10,fontSize:12,color:emp.tp_status==="On Track"?"#059669":emp.tp_status==="At Risk"?"#d97706":"#dc2626",fontWeight:700,gap:5}}>
                                                              <span>{emp.tp_status==="On Track"?"✅":emp.tp_status==="At Risk"?"⚠️":"🔴"}</span>
                                                              {emp.tp_status}
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    )}
                                                    {/* action required */}
                                                    {emp.action_required&&(
                                                      <div style={{marginBottom:12,padding:"8px 12px",borderRadius:8,background:lfDark?"#1c1917":"#fffbeb",border:`1px solid ${lfDark?"#44403c":"#fde68a"}`,display:"flex",alignItems:"flex-start",gap:8}}>
                                                        <span style={{fontSize:14}}>🎯</span>
                                                        <div>
                                                          <span style={{fontSize:10.5,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:"0.05em"}}>Action Required</span>
                                                          <div style={{fontSize:12,color:lfDark?"#d4d4d4":lfText,marginTop:2}}>{emp.action_required}</div>
                                                        </div>
                                                      </div>
                                                    )}
                                                    {/* course breakdown */}
                                                    {emp.courses.length>0&&(
                                                      <>
                                                        <div style={{fontSize:10.5,fontWeight:700,color:lfMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Course Breakdown</div>
                                                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
                                                          {emp.courses.map((c,ci)=>{
                                                            const cpct=c.modules_total>0?Math.round(c.modules_done/c.modules_total*100):0;
                                                            const ccc:Record<string,string>={Sales:"#0891b2",Support:"#7c3aed",Operations:"#dc2626"};
                                                            const col2=ccc[c.category]??"#4f46e5";
                                                            return(
                                                              <div key={ci} style={{background:lfDark?"#1e293b":"#fff",borderRadius:8,padding:"10px 12px",border:`1px solid ${lfBorder}`}}>
                                                                <div style={{fontSize:10.5,fontWeight:700,color:col2,marginBottom:4}}>{c.category}</div>
                                                                <div style={{fontSize:12,fontWeight:600,color:lfText,marginBottom:6,lineHeight:1.3}}>{c.course_title}</div>
                                                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                                                  <div style={{flex:1,height:5,borderRadius:3,background:lfDark?"#334155":"#e2e8f0"}}>
                                                                    <div style={{height:"100%",width:`${cpct}%`,background:col2,borderRadius:3}}/>
                                                                  </div>
                                                                  <span style={{fontSize:11,color:lfMuted,fontWeight:600}}>{c.modules_done}/{c.modules_total}</span>
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      </>
                                                    )}
                                                    <div style={{fontSize:11,color:lfMuted,marginTop:10}}>
                                                      Last active: {new Date(emp.last_active).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )
                              }
                            </div>
                          )}

                          {/* manager activity */}
                          {lfActiveTab==="manager"&&(
                            <div className="lf-slide-in" style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(285px,1fr))",gap:16}}>
                              {lfMF.length===0
                                ? <div style={{gridColumn:"1/-1",textAlign:"center",padding:"40px",color:lfMuted}}>No manager data available.</div>
                                : lfMF.map(mgr=>{
                                  const la=new Date(mgr.last_activity);
                                  const hAgo=Math.floor((Date.now()-la.getTime())/3600000);
                                  const tLbl=hAgo<1?"Just now":hAgo<24?`${hAgo}h ago`:`${Math.floor(hAgo/24)}d ago`;
                                  const abg=lfAvBg(mgr.manager_name);
                                  return(
                                    <div key={mgr.manager_id} style={{background:lfDark?"#1e293b":"#fff",borderRadius:14,border:`1.5px solid ${lfBorder}`,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
                                      <div style={{height:3,background:`linear-gradient(90deg,${abg},${abg}88)`}}/>
                                      <div style={{padding:"16px 18px"}}>
                                        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                                          <div style={{width:44,height:44,borderRadius:"50%",background:abg,color:"#fff",fontSize:16,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{lfInits(mgr.manager_name)}</div>
                                          <div style={{flex:1}}>
                                            <div style={{fontWeight:700,fontSize:14,color:lfText}}>{mgr.manager_name}</div>
                                            <div style={{fontSize:11,color:lfMuted}}>{mgr.job_title||"Manager"}</div>
                                            {mgr.department&&<div style={{fontSize:11,color:abg,fontWeight:600,marginTop:1}}>{mgr.department}</div>}
                                          </div>
                                          <span style={{fontSize:10,color:lfMuted,background:lfDark?"#334155":"#f1f5f9",padding:"3px 8px",borderRadius:20}}>{tLbl}</span>
                                        </div>
                                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                                          {([
                                            {lbl:"Created",  val:mgr.courses_created,  clr:"#4f46e5"},
                                            {lbl:"Edited",   val:mgr.courses_edited,   clr:"#0891b2"},
                                            {lbl:"Published",val:mgr.courses_published,clr:"#059669"},
                                            {lbl:"Pending",  val:mgr.approval_pending, clr:mgr.approval_pending>0?"#d97706":"#94a3b8"},
                                          ] as {lbl:string;val:number;clr:string}[]).map(st=>(
                                            <div key={st.lbl} style={{background:lfDark?"#0f172a":"#f8fafc",borderRadius:8,padding:"10px 12px",border:`1px solid ${lfBorder}`,textAlign:"center"}}>
                                              <div style={{fontSize:22,fontWeight:800,color:st.clr}}>{st.val}</div>
                                              <div style={{fontSize:10.5,color:lfMuted,fontWeight:600}}>{st.lbl}</div>
                                            </div>
                                          ))}
                                        </div>
                                        {mgr.approval_pending>0&&(
                                          <div style={{padding:"8px 12px",borderRadius:8,background:"#fef3c7",border:"1px solid #fde68a",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                                            <span>⚠️</span>
                                            <span style={{fontSize:12,color:"#92400e",fontWeight:600}}>{mgr.approval_pending} course{mgr.approval_pending>1?"s":""} pending approval</span>
                                          </div>
                                        )}
                                        {mgr.courses.length>0&&(
                                          <div>
                                            <div style={{fontSize:10.5,fontWeight:700,color:lfMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Recent Courses</div>
                                            <div style={{display:"flex",flexDirection:"column",gap:4}}>
                                              {mgr.courses.slice(0,4).map((c,ci)=>{
                                                const scl:Record<string,string>={Published:"#059669",Draft:"#d97706",Archived:"#6b7280"};
                                                const ccl:Record<string,string>={Sales:"#0891b2",Support:"#7c3aed",Operations:"#dc2626"};
                                                return(
                                                  <div key={ci} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:`1px solid ${lfBorder}`}}>
                                                    <span style={{width:7,height:7,borderRadius:"50%",background:ccl[c.category]??"#4f46e5",flexShrink:0}}/>
                                                    <span style={{fontSize:12,color:lfText,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</span>
                                                    <span style={{fontSize:10,color:scl[c.status]??"#6b7280",fontWeight:600}}>{c.status}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              }
                            </div>
                          )}

                          {/* team overview */}
                          {lfActiveTab==="team"&&(
                            <div className="lf-slide-in" style={{display:"flex",flexDirection:"column",gap:12}}>
                              {lfTF.length===0
                                ? <div style={{textAlign:"center",padding:"40px",color:lfMuted}}>No team data available.</div>
                                : lfTF.map((team,idx)=>{
                                  const rkC=["#f59e0b","#94a3b8","#cd7c32"][idx]??"#e2e8f0";
                                  const rkT=idx<3?"#fff":"#64748b";
                                  const barC=team.completion_rate>=80?"#059669":team.completion_rate>=50?"#d97706":"#dc2626";
                                  return(
                                    <div key={team.team_name} style={{background:lfDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${lfBorder}`,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                                      <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                                        <div style={{width:38,height:38,borderRadius:"50%",background:rkC,color:rkT,fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>#{team.ranking}</div>
                                        <div style={{flex:1,minWidth:110}}>
                                          <div style={{fontWeight:700,fontSize:15,color:lfText}}>{team.team_name}</div>
                                          <div style={{fontSize:12,color:lfMuted}}>{team.total_learners} learner{team.total_learners!==1?"s":""}</div>
                                        </div>
                                        <div style={{flex:2,minWidth:140}}>
                                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                            <span style={{fontSize:11,color:lfMuted}}>Completion</span>
                                            <span style={{fontSize:12,fontWeight:700,color:barC}}>{team.completion_rate}%</span>
                                          </div>
                                          <div style={{height:8,borderRadius:4,background:lfDark?"#334155":"#e2e8f0"}}>
                                            <div style={{height:"100%",width:`${team.completion_rate}%`,background:barC,borderRadius:4,transition:"width 0.6s ease"}}/>
                                          </div>
                                        </div>
                                        <div style={{textAlign:"center",minWidth:68}}>
                                          <div style={{fontSize:22,fontWeight:800,color:lfText}}>{team.avg_score}</div>
                                          <div style={{fontSize:10,color:lfMuted}}>Avg Score</div>
                                        </div>
                                      </div>
                                      {team.members.length>0&&(
                                        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${lfBorder}`,display:"flex",gap:10,flexWrap:"wrap"}}>
                                          {team.members.map((m,mi)=>{
                                            const ms=lfSM[m.status]??lfSM["Moderate"];
                                            return(
                                              <div key={mi} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:lfMuted}}>
                                                <span style={{width:6,height:6,borderRadius:"50%",background:ms.dot,flexShrink:0}}/>
                                                {m.name.split(" ")[0]} <span style={{color:ms.color,fontWeight:600}}>({m.completion}%)</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              }
                            </div>
                          )}

                          {/* ai insights */}
                          {lfActiveTab==="insights"&&(
                            <div className="lf-slide-in" style={{display:"flex",flexDirection:"column",gap:20}}>
                              <div style={{background:"linear-gradient(135deg,#ede9fe,#dbeafe)",borderRadius:12,padding:"14px 18px",border:"1px solid #c7d2fe",display:"flex",flexWrap:"wrap",gap:16,alignItems:"center"}}>
                                <span style={{fontSize:30}}>🤖</span>
                                <div>
                                  <div style={{fontSize:14,fontWeight:700,color:"#3730a3"}}>AI Learning Intelligence</div>
                                  <div style={{fontSize:12,color:"#4f46e5"}}>{lfData.ai_insights.total_employees} learners · {lfData.ai_insights.courses_count} courses · {lfData.ai_insights.delayed_learners_count} need attention</div>
                                </div>
                                <div style={{marginLeft:"auto",display:"flex",gap:14,flexWrap:"wrap"}}>
                                  {([{lbl:"Completion",val:`${lfData.ai_insights.avg_completion}%`,clr:"#4f46e5"},{lbl:"Avg Score",val:`${lfData.ai_insights.avg_score}`,clr:"#7c3aed"}] as {lbl:string;val:string;clr:string}[]).map(s=>(
                                    <div key={s.lbl} style={{textAlign:"center"}}>
                                      <div style={{fontSize:20,fontWeight:800,color:s.clr}}>{s.val}</div>
                                      <div style={{fontSize:10,color:"#6366f1"}}>{s.lbl}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:16}}>

                                {/* delayed learners */}
                                <div style={{background:lfDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${lfDark?"#334155":"#fecaca"}`,overflow:"hidden"}}>
                                  <div style={{background:"#fee2e2",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>⚠️</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#991b1b"}}>Delayed Learners</div>
                                      <div style={{fontSize:11,color:"#dc2626"}}>{lfData.ai_insights.delayed_learners_count} employees behind schedule</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                                    {lfData.ai_insights.delayed_learners_count===0
                                      ? <div style={{textAlign:"center",padding:"10px 0",color:"#059669",fontSize:12}}>All learners on track ✓</div>
                                      : lfData.ai_insights.delayed_learners.slice(0,6).map((dl:LfEmployeePerformance,i:number)=>(
                                        <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                                          <div style={{width:28,height:28,borderRadius:"50%",background:lfAvBg(dl.employee_name),color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{lfInits(dl.employee_name)}</div>
                                          <div style={{flex:1}}>
                                            <div style={{fontSize:12,fontWeight:600,color:lfText}}>{dl.employee_name}</div>
                                            <div style={{height:4,borderRadius:2,background:"#fee2e2",marginTop:3}}><div style={{height:"100%",width:`${dl.completion_pct}%`,background:"#ef4444",borderRadius:2}}/></div>
                                          </div>
                                          <span style={{fontSize:11,fontWeight:700,color:"#ef4444"}}>{dl.completion_pct}%</span>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>

                                {/* top teams */}
                                <div style={{background:lfDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${lfDark?"#334155":"#bbf7d0"}`,overflow:"hidden"}}>
                                  <div style={{background:"#d1fae5",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>🏆</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#065f46"}}>Top Performing Teams</div>
                                      <div style={{fontSize:11,color:"#059669"}}>Teams exceeding targets</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
                                    {lfData.ai_insights.top_performing_teams.length===0
                                      ? <div style={{textAlign:"center",padding:"10px 0",color:lfMuted,fontSize:12}}>No teams above target yet.</div>
                                      : lfData.ai_insights.top_performing_teams.slice(0,5).map((t,i)=>(
                                        <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                                          <span style={{fontSize:14}}>{(["🥇","🥈","🥉","4️⃣","5️⃣"])[i]??""}</span>
                                          <div style={{flex:1}}>
                                            <div style={{fontSize:12,fontWeight:600,color:lfText}}>{t.team}</div>
                                            <div style={{height:4,borderRadius:2,background:"#d1fae5",marginTop:3}}><div style={{height:"100%",width:`${t.completion}%`,background:"#059669",borderRadius:2}}/></div>
                                          </div>
                                          <span style={{fontSize:11,fontWeight:700,color:"#059669"}}>{t.completion}%</span>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>

                                {/* most active managers */}
                                <div style={{background:lfDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${lfDark?"#334155":"#ddd6fe"}`,overflow:"hidden"}}>
                                  <div style={{background:"#ede9fe",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>⚡</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#4c1d95"}}>Most Active Managers</div>
                                      <div style={{fontSize:11,color:"#7c3aed"}}>By recent content activity</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
                                    {lfData.ai_insights.most_active_managers.length===0
                                      ? <div style={{textAlign:"center",padding:"10px 0",color:lfMuted,fontSize:12}}>No manager activity yet.</div>
                                      : lfData.ai_insights.most_active_managers.map((mgr,i)=>{
                                        const la=new Date(mgr.last_active);
                                        const hA=Math.floor((Date.now()-la.getTime())/3600000);
                                        const tLb=hA<1?"Just now":hA<24?`${hA}h ago`:`${Math.floor(hA/24)}d ago`;
                                        return(
                                          <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                                            <div style={{width:30,height:30,borderRadius:"50%",background:lfAvBg(mgr.name),color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{lfInits(mgr.name)}</div>
                                            <div style={{flex:1}}>
                                              <div style={{fontSize:12,fontWeight:600,color:lfText}}>{mgr.name}</div>
                                              <div style={{fontSize:10,color:lfMuted}}>{mgr.courses} courses · {tLb}</div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    }
                                  </div>
                                </div>

                                {/* interventions */}
                                <div style={{background:lfDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${lfDark?"#334155":"#fde68a"}`,overflow:"hidden"}}>
                                  <div style={{background:"#fef3c7",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>💡</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#92400e"}}>Recommended Interventions</div>
                                      <div style={{fontSize:11,color:"#d97706"}}>AI-suggested action items</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
                                    {lfData.ai_insights.recommended_interventions.length===0
                                      ? <div style={{textAlign:"center",padding:"10px 0",color:"#059669",fontSize:12}}>No interventions needed ✓</div>
                                      : lfData.ai_insights.recommended_interventions.slice(0,4).map((inv,i)=>(
                                        <div key={i} style={{padding:"10px 12px",borderRadius:8,background:lfDark?"#0f172a":"#fffbeb",border:`1px solid ${lfDark?"#334155":"#fde68a"}`}}>
                                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                            <span style={{fontSize:12,fontWeight:700,color:lfText}}>{inv.employee}</span>
                                            <span style={{fontSize:10,color:"#d97706",fontWeight:600}}>{inv.completion_pct}% done</span>
                                          </div>
                                          <div style={{fontSize:11,color:lfMuted,lineHeight:1.5}}>
                                            <span style={{fontWeight:600,color:"#d97706"}}>{inv.department}</span> · {inv.recommendation}
                                          </div>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>

                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ── Assessment Analytics Card ──────────────────────── */}
              {(() => {
                const asBg     = asDark ? "#0f172a" : "#ffffff";
                const asCard   = asDark ? "#1e293b" : "#f8fafc";
                const asBorder = asDark ? "#334155" : "#e2e8f0";
                const asText   = asDark ? "#f1f5f9" : "#0f172a";
                const asMuted  = asDark ? "#94a3b8" : "#64748b";
                const asInput  = asDark ? "#0f172a" : "#ffffff";

                const asStatusStyle: Record<string,{bg:string;color:string;dot:string}> = {
                  "Active":       {bg:"#d1fae5",color:"#059669",dot:"#10b981"},
                  "Needs Review": {bg:"#fef3c7",color:"#d97706",dot:"#f59e0b"},
                  "Pending":      {bg:asDark?"#1e293b":"#f1f5f9",color:asMuted,dot:"#94a3b8"},
                };
                const asDiffStyle: Record<string,{bg:string;color:string}> = {
                  "Easy":   {bg:"#d1fae5",color:"#059669"},
                  "Medium": {bg:"#fef3c7",color:"#d97706"},
                  "Hard":   {bg:"#fee2e2",color:"#dc2626"},
                };
                const asCatColor: Record<string,string> = {Sales:"#0891b2",Support:"#7c3aed",Operations:"#dc2626"};
                const round1 = (n: number) => Math.round(n * 10) / 10;

                const asTimeAgo = asLastSync ? (() => {
                  const s = Math.floor((Date.now()-asLastSync.getTime())/1000);
                  return s<60?"Just now":s<3600?`${Math.floor(s/60)}m ago`:`${Math.floor(s/3600)}h ago`;
                })() : null;

                const filteredAs = (asData?.assessments ?? []).filter(a => {
                  const q = asSearch.toLowerCase();
                  if (q && !a.course_title.toLowerCase().includes(q) && !a.assessment_name.toLowerCase().includes(q)) return false;
                  if (asCatFilter !== "all" && a.course_category !== asCatFilter) return false;
                  if (asStatusFilter !== "all" && a.status !== asStatusFilter) return false;
                  return true;
                });

                return (
                  <div style={{borderRadius:16,overflow:"hidden",border:`1.5px solid ${asBorder}`,boxShadow:`0 4px 24px rgba(0,0,0,${asDark?"0.4":"0.07"})`,marginBottom:24,background:asBg}}>

                    {/* ── gradient header ── */}
                    <div style={{background:"linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f4c75 100%)",padding:"22px 24px 18px"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
                        <div style={{display:"flex",alignItems:"center",gap:14}}>
                          <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>📋</div>
                          <div>
                            <div style={{fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>Assessment Analytics</div>
                            <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:2}}>Course assessments · Attempt tracking · AI-driven insights</div>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                          {asTimeAgo && <span style={{fontSize:11,color:"rgba(255,255,255,0.5)",background:"rgba(0,0,0,0.2)",padding:"3px 9px",borderRadius:20}}>Last sync: {asTimeAgo}</span>}
                          <button onClick={()=>void fetchAssessmentAnalytics(true)} disabled={asSyncing}
                            style={{fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.12)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:5,opacity:asSyncing?0.7:1}}>
                            <span className={asSyncing?"lf-spin":""} style={{display:"inline-block"}}>↻</span>
                            {asSyncing?"Syncing…":"Sync Now"}
                          </button>
                          <button onClick={()=>setAsDark(v=>!v)}
                            style={{fontSize:12,padding:"5px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.3)",background:"rgba(255,255,255,0.1)",color:"#fff",cursor:"pointer"}}>
                            {asDark?"☀️ Light":"🌙 Dark"}
                          </button>
                        </div>
                      </div>

                      {/* KPI tiles */}
                      {asData && (
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(105px,1fr))",gap:10}}>
                          {([
                            {label:"Total Courses",    value:asData.kpis.total_courses,            icon:"📚",clr:"#bfdbfe"},
                            {label:"With Assessments", value:asData.kpis.courses_with_assessments, icon:"✅",clr:"#bbf7d0"},
                            {label:"Total Quizzes",    value:asData.kpis.total_assessments,        icon:"📝",clr:"#ddd6fe"},
                            {label:"Pending",          value:asData.kpis.pending_assessments,      icon:"⏳",clr:"#fde68a"},
                            {label:"Avg Pass Rate",    value:`${asData.kpis.avg_pass_rate}%`,      icon:"🎯",clr:"#a7f3d0"},
                            {label:"Failed Learners",  value:asData.kpis.failed_learners,          icon:"⚠️",clr:"#fca5a5"},
                            {label:"Total Attempts",   value:asData.kpis.total_attempts,           icon:"🔁",clr:"#c7d2fe"},
                          ] as {label:string;value:string|number;icon:string;clr:string}[]).map(k=>(
                            <div key={k.label} style={{background:"rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(255,255,255,0.12)"}}>
                              <div style={{fontSize:17}}>{k.icon}</div>
                              <div style={{fontSize:20,fontWeight:800,color:k.clr,lineHeight:1.1,marginTop:4}}>{k.value}</div>
                              <div style={{fontSize:10,color:"rgba(255,255,255,0.52)",marginTop:2}}>{k.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── tab bar ── */}
                    <div style={{display:"flex",borderBottom:`1px solid ${asBorder}`,background:asCard,overflowX:"auto"}}>
                      {([
                        {id:"overview",label:"Overview",     icon:"📊"},
                        {id:"table",   label:"All Assessments",icon:"📋"},
                        {id:"ai",      label:"AI Insights",  icon:"🤖"},
                        {id:"create",  label:"Create / Generate",icon:"➕"},
                      ] as {id:string;label:string;icon:string}[]).map(tab=>(
                        <button key={tab.id} onClick={()=>setAsActiveTab(tab.id as typeof asActiveTab)}
                          style={{padding:"12px 16px",fontSize:13,fontWeight:asActiveTab===tab.id?700:500,color:asActiveTab===tab.id?"#0891b2":asMuted,background:"transparent",border:"none",borderBottom:`2.5px solid ${asActiveTab===tab.id?"#0891b2":"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
                          {tab.icon} {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* ── search + filter (table tab only) ── */}
                    {asActiveTab==="table" && (
                      <div style={{padding:"12px 18px",background:asCard,borderBottom:`1px solid ${asBorder}`,display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                        <div style={{position:"relative",flex:1,minWidth:200}}>
                          <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:asMuted}}>🔍</span>
                          <input value={asSearch} onChange={e=>setAsSearch(e.target.value)} placeholder="Search course or assessment name…"
                            style={{width:"100%",padding:"7px 10px 7px 30px",borderRadius:8,border:`1.5px solid ${asBorder}`,background:asInput,color:asText,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                        </div>
                        <select value={asCatFilter} onChange={e=>setAsCatFilter(e.target.value)}
                          style={{padding:"7px 10px",borderRadius:8,border:`1.5px solid ${asBorder}`,background:asInput,color:asText,fontSize:13,cursor:"pointer"}}>
                          <option value="all">All Categories</option>
                          <option value="Sales">Sales</option>
                          <option value="Support">Support</option>
                          <option value="Operations">Operations</option>
                        </select>
                        <select value={asStatusFilter} onChange={e=>setAsStatusFilter(e.target.value)}
                          style={{padding:"7px 10px",borderRadius:8,border:`1.5px solid ${asBorder}`,background:asInput,color:asText,fontSize:13,cursor:"pointer"}}>
                          <option value="all">All Status</option>
                          <option value="Active">Active</option>
                          <option value="Needs Review">Needs Review</option>
                          <option value="Pending">Pending</option>
                        </select>
                        <span style={{fontSize:11,color:asMuted,marginLeft:"auto"}}>{filteredAs.length} assessments</span>
                      </div>
                    )}

                    {/* ── content area ── */}
                    <div style={{background:asBg,padding:"20px 18px",minHeight:200}}>

                      {asLoading && !asData && (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px",gap:14}}>
                          <div className="lf-spin" style={{width:36,height:36,borderRadius:"50%",border:`3px solid ${asBorder}`,borderTopColor:"#0891b2"}}/>
                          <div style={{fontSize:13,color:asMuted}}>Loading assessment analytics…</div>
                        </div>
                      )}

                      {!asLoading && !asData && (
                        <div style={{textAlign:"center",padding:"50px 20px"}}>
                          <div style={{fontSize:42,marginBottom:12}}>📋</div>
                          <div style={{fontSize:15,fontWeight:600,color:asText,marginBottom:8}}>No assessment data yet</div>
                          <div style={{fontSize:13,color:asMuted,marginBottom:18}}>Click Sync Now to compute analytics from your course quizzes.</div>
                          <button onClick={()=>void fetchAssessmentAnalytics(true)} style={{padding:"10px 24px",borderRadius:8,border:"none",background:"#0891b2",color:"#fff",fontWeight:600,cursor:"pointer",fontSize:13}}>Load Analytics</button>
                        </div>
                      )}

                      {asData && (
                        <>
                          {/* ── OVERVIEW TAB ── */}
                          {asActiveTab==="overview" && (
                            <div className="lf-slide-in">
                              {/* Pass Rate by Category */}
                              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
                                {(["Sales","Support","Operations"] as const).map(cat=>{
                                  const catAs = asData.assessments.filter(a=>a.course_category===cat && a.attempts>0);
                                  const avgPR = catAs.length ? round1(catAs.reduce((s,a)=>s+a.pass_rate,0)/catAs.length) : 0;
                                  const avgSc = catAs.length ? round1(catAs.reduce((s,a)=>s+a.avg_score,0)/catAs.length) : 0;
                                  const color = asCatColor[cat] ?? "#4f46e5";
                                  return (
                                    <div key={cat} style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,padding:"16px 18px"}}>
                                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                                        <div style={{width:10,height:10,borderRadius:"50%",background:color,flexShrink:0}}/>
                                        <span style={{fontSize:14,fontWeight:700,color:asText}}>{cat}</span>
                                        <span style={{marginLeft:"auto",fontSize:11,color:asMuted}}>{catAs.length} assessments</span>
                                      </div>
                                      <div style={{display:"flex",gap:16,marginBottom:10}}>
                                        <div><div style={{fontSize:22,fontWeight:800,color:avgPR>=70?"#059669":avgPR>=50?"#d97706":"#dc2626"}}>{avgPR}%</div><div style={{fontSize:10,color:asMuted}}>Pass Rate</div></div>
                                        <div><div style={{fontSize:22,fontWeight:800,color:color}}>{avgSc}</div><div style={{fontSize:10,color:asMuted}}>Avg Score</div></div>
                                      </div>
                                      <div style={{height:8,borderRadius:4,background:asDark?"#334155":"#e2e8f0",overflow:"hidden"}}>
                                        <div style={{height:"100%",width:`${avgPR}%`,background:color,borderRadius:4,transition:"width 0.6s ease"}}/>
                                      </div>
                                      {/* mini assessment list */}
                                      <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:6}}>
                                        {catAs.slice(0,3).map((a,i)=>(
                                          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                                            <span style={{fontSize:10,fontWeight:600,color:asMuted,width:16,flexShrink:0}}>{i+1}</span>
                                            <span style={{fontSize:11,color:asText,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.assessment_name}</span>
                                            <span style={{fontSize:11,fontWeight:700,color:a.pass_rate>=70?"#059669":a.pass_rate>=50?"#d97706":"#dc2626"}}>{a.pass_rate}%</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Top & Bottom performers */}
                              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
                                {/* Top 5 by pass rate */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,overflow:"hidden"}}>
                                  <div style={{background:"#d1fae5",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>🏆</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#065f46"}}>Top Performing Assessments</div>
                                      <div style={{fontSize:11,color:"#059669"}}>Highest pass rates</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                                    {[...asData.assessments].filter(a=>a.attempts>0).sort((a,b)=>b.pass_rate-a.pass_rate).slice(0,5).map((a,i)=>(
                                      <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                                        <span style={{fontSize:14}}>{(["🥇","🥈","🥉","4️⃣","5️⃣"])[i]??""}</span>
                                        <div style={{flex:1,minWidth:0}}>
                                          <div style={{fontSize:12,fontWeight:600,color:asText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.assessment_name}</div>
                                          <div style={{fontSize:10,color:asMuted}}>{a.course_title}</div>
                                        </div>
                                        <span style={{fontSize:12,fontWeight:700,color:"#059669",flexShrink:0}}>{a.pass_rate}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Bottom 5 by pass rate */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,overflow:"hidden"}}>
                                  <div style={{background:"#fee2e2",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>⚠️</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#991b1b"}}>Needs Attention</div>
                                      <div style={{fontSize:11,color:"#dc2626"}}>Lowest pass rates</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                                    {[...asData.assessments].filter(a=>a.attempts>0).sort((a,b)=>a.pass_rate-b.pass_rate).slice(0,5).map((a,i)=>(
                                      <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                                        <div style={{width:22,height:22,borderRadius:"50%",background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#dc2626",flexShrink:0}}>{i+1}</div>
                                        <div style={{flex:1,minWidth:0}}>
                                          <div style={{fontSize:12,fontWeight:600,color:asText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.assessment_name}</div>
                                          <div style={{fontSize:10,color:asMuted}}>{a.course_title}</div>
                                        </div>
                                        <div style={{textAlign:"right",flexShrink:0}}>
                                          <div style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>{a.pass_rate}%</div>
                                          <div style={{fontSize:10,color:asMuted}}>{a.failed_count} failed</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Difficulty distribution */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,overflow:"hidden"}}>
                                  <div style={{background:"#ede9fe",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>📊</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#4c1d95"}}>Difficulty Distribution</div>
                                      <div style={{fontSize:11,color:"#7c3aed"}}>Based on avg score</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"16px"}}>
                                    {(["Easy","Medium","Hard"] as const).map(diff=>{
                                      const cnt = asData.assessments.filter(a=>a.difficulty===diff).length;
                                      const pct = asData.assessments.length ? Math.round(cnt/asData.assessments.length*100) : 0;
                                      const s = asDiffStyle[diff];
                                      return (
                                        <div key={diff} style={{marginBottom:10}}>
                                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                            <span style={{fontSize:12,fontWeight:600,padding:"2px 8px",borderRadius:20,background:s.bg,color:s.color}}>{diff}</span>
                                            <span style={{fontSize:12,color:asMuted}}>{cnt} ({pct}%)</span>
                                          </div>
                                          <div style={{height:8,borderRadius:4,background:asDark?"#334155":"#e2e8f0"}}>
                                            <div style={{height:"100%",width:`${pct}%`,background:s.color,borderRadius:4,transition:"width 0.5s"}}/>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── TABLE TAB ── */}
                          {asActiveTab==="table" && (
                            <div className="lf-slide-in" style={{overflowX:"auto"}}>
                              {filteredAs.length===0
                                ? <div style={{textAlign:"center",padding:"40px",color:asMuted}}>No assessments match your filters.</div>
                                : (
                                  <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"0 5px",fontSize:13}}>
                                    <thead>
                                      <tr>
                                        {["#","Course","Assessment","Questions","Difficulty","Attempts","Avg Score","Pass Rate","Status","Actions"].map(h=>(
                                          <th key={h} style={{padding:"6px 10px",textAlign:"left",color:asMuted,fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filteredAs.map((a:AsAssessmentRow,idx:number)=>{
                                        const ss = asStatusStyle[a.status] ?? asStatusStyle["Pending"];
                                        const ds = asDiffStyle[a.difficulty] ?? asDiffStyle["Medium"];
                                        const bar = a.pass_rate>=70?"#059669":a.pass_rate>=50?"#d97706":"#dc2626";
                                        const isEx = asExpandedRow===a.assessment_id;
                                        return (
                                          <React.Fragment key={a.assessment_id}>
                                            <tr onClick={()=>setAsExpandedRow(isEx?null:a.assessment_id)}
                                              style={{background:asDark?"#1e293b":"#fff",cursor:"pointer",boxShadow:`0 1px 3px rgba(0,0,0,${asDark?"0.3":"0.04"})`}}>
                                              <td style={{padding:"10px 10px",borderRadius:"8px 0 0 8px",color:asMuted,fontWeight:600,fontSize:12}}>{idx+1}</td>
                                              <td style={{padding:"10px 10px"}}>
                                                <div style={{fontWeight:600,color:asText,fontSize:12,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.course_title}</div>
                                                <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
                                                  <span style={{width:6,height:6,borderRadius:"50%",background:asCatColor[a.course_category]??"#4f46e5",flexShrink:0}}/>
                                                  <span style={{fontSize:10,color:asMuted}}>{a.course_category}</span>
                                                </div>
                                              </td>
                                              <td style={{padding:"10px 10px"}}>
                                                <div style={{fontSize:12,fontWeight:600,color:asText,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.assessment_name}</div>
                                                <div style={{fontSize:10,color:asMuted,marginTop:2}}>{a.time_limit_mins} min · Pass {a.passing_score}%</div>
                                              </td>
                                              <td style={{padding:"10px 10px",color:asText,fontWeight:600,textAlign:"center"}}>{a.question_count}</td>
                                              <td style={{padding:"10px 10px"}}>
                                                <span style={{padding:"3px 9px",borderRadius:20,background:ds.bg,color:ds.color,fontSize:11,fontWeight:600}}>{a.difficulty}</span>
                                              </td>
                                              <td style={{padding:"10px 10px",color:asText,fontWeight:600,textAlign:"center"}}>{a.attempts}</td>
                                              <td style={{padding:"10px 10px",color:asText,fontWeight:700}}>{a.avg_score}</td>
                                              <td style={{padding:"10px 10px",minWidth:100}}>
                                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                                  <div style={{flex:1,height:6,borderRadius:3,background:asDark?"#334155":"#e2e8f0",overflow:"hidden"}}>
                                                    <div style={{height:"100%",width:`${a.pass_rate}%`,background:bar,borderRadius:3,transition:"width 0.5s"}}/>
                                                  </div>
                                                  <span style={{fontSize:12,fontWeight:700,color:bar,flexShrink:0}}>{a.pass_rate}%</span>
                                                </div>
                                              </td>
                                              <td style={{padding:"10px 10px"}}>
                                                <span style={{padding:"3px 9px",borderRadius:20,background:ss.bg,color:ss.color,fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:4}}>
                                                  <span style={{width:5,height:5,borderRadius:"50%",background:ss.dot}}/>
                                                  {a.status}
                                                </span>
                                              </td>
                                              <td style={{padding:"10px 10px",borderRadius:"0 8px 8px 0"}}>
                                                <div style={{display:"flex",gap:4}}>
                                                  <button onClick={e=>{e.stopPropagation();void handleGenerateAIQuiz(a.course_id,a.course_category);}}
                                                    title="Generate AI Quiz"
                                                    style={{fontSize:11,padding:"4px 8px",borderRadius:6,border:`1px solid ${asBorder}`,background:asDark?"#334155":"#ede9fe",color:"#7c3aed",cursor:"pointer",fontWeight:600}}>
                                                    🤖 AI Quiz
                                                  </button>
                                                  <button onClick={e=>{e.stopPropagation();setAsCreateCourseId(a.course_id);setAsActiveTab("create");}}
                                                    title="New assessment for this course"
                                                    style={{fontSize:11,padding:"4px 8px",borderRadius:6,border:`1px solid ${asBorder}`,background:asDark?"#334155":"#e0f2fe",color:"#0891b2",cursor:"pointer",fontWeight:600}}>
                                                    ➕
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                            {isEx && (
                                              <tr style={{background:asDark?"#0f172a":"#f8fafc"}}>
                                                <td colSpan={10} style={{padding:"12px 14px 16px 42px"}}>
                                                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:12}}>
                                                    {[
                                                      {label:"Passed",val:a.passed_count,color:"#059669",bg:"#d1fae5"},
                                                      {label:"Failed",val:a.failed_count,color:"#dc2626",bg:"#fee2e2"},
                                                      {label:"Pass Threshold",val:`${a.passing_score}%`,color:"#0891b2",bg:"#e0f2fe"},
                                                      {label:"Time Limit",val:`${a.time_limit_mins} min`,color:"#7c3aed",bg:"#ede9fe"},
                                                    ].map(m=>(
                                                      <div key={m.label} style={{background:m.bg,borderRadius:8,padding:"10px 14px"}}>
                                                        <div style={{fontSize:18,fontWeight:800,color:m.color}}>{m.val}</div>
                                                        <div style={{fontSize:10,color:m.color,opacity:0.7,marginTop:2}}>{m.label}</div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                  {a.retest_candidates.length>0 && (
                                                    <div style={{marginBottom:10}}>
                                                      <div style={{fontSize:10.5,fontWeight:700,color:asMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Learners Who Need Retest</div>
                                                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                                        {a.retest_candidates.map((name,i)=>(
                                                          <span key={i} style={{padding:"3px 10px",borderRadius:20,background:asDark?"#1e293b":"#fef3c7",border:`1px solid ${asDark?"#334155":"#fde68a"}`,fontSize:11,color:asDark?asMuted:"#92400e",fontWeight:600}}>
                                                            ⚠️ {name}
                                                          </span>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                  <div style={{fontSize:11,color:asMuted}}>
                                                    Last attempt: {new Date(a.last_attempt_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                                                    {a.created_manually && <span style={{marginLeft:10,padding:"2px 7px",borderRadius:10,background:"#ede9fe",color:"#7c3aed",fontSize:10,fontWeight:700}}>Manually Created</span>}
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )
                              }
                            </div>
                          )}

                          {/* ── AI INSIGHTS TAB ── */}
                          {asActiveTab==="ai" && (
                            <div className="lf-slide-in">
                              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>

                                {/* Low performing */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,overflow:"hidden"}}>
                                  <div style={{background:"#fee2e2",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>📉</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#991b1b"}}>Low Performing Courses</div>
                                      <div style={{fontSize:11,color:"#dc2626"}}>Pass rate below 60%</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                                    {asData.ai_insights.low_performing_courses.length===0
                                      ? <div style={{textAlign:"center",padding:"12px 0",color:"#059669",fontSize:12}}>All courses above threshold ✓</div>
                                      : asData.ai_insights.low_performing_courses.map((a,i)=>(
                                        <div key={i} style={{borderLeft:`3px solid #dc2626`,paddingLeft:10}}>
                                          <div style={{fontSize:12,fontWeight:600,color:asText}}>{a.course_title}</div>
                                          <div style={{fontSize:11,color:asMuted}}>{a.assessment_name}</div>
                                          <div style={{display:"flex",gap:8,marginTop:4}}>
                                            <span style={{fontSize:11,fontWeight:700,color:"#dc2626"}}>{a.pass_rate}% pass</span>
                                            <span style={{fontSize:11,color:asMuted}}>·</span>
                                            <span style={{fontSize:11,color:asMuted}}>{a.attempts} attempts</span>
                                          </div>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>

                                {/* Hardest assessments */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,overflow:"hidden"}}>
                                  <div style={{background:"#fef3c7",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>🔥</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#92400e"}}>Hardest Assessments</div>
                                      <div style={{fontSize:11,color:"#d97706"}}>Lowest average scores</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                                    {asData.ai_insights.hardest_assessments.map((a,i)=>(
                                      <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                                        <div style={{width:28,height:28,borderRadius:8,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#d97706",flexShrink:0}}>{i+1}</div>
                                        <div style={{flex:1,minWidth:0}}>
                                          <div style={{fontSize:12,fontWeight:600,color:asText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.assessment_name}</div>
                                          <div style={{fontSize:10,color:asMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.course_title}</div>
                                        </div>
                                        <div style={{textAlign:"right",flexShrink:0}}>
                                          <div style={{fontSize:13,fontWeight:800,color:"#d97706"}}>{a.avg_score}</div>
                                          <div style={{fontSize:10,color:asMuted}}>avg score</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Learners needing retest */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,overflow:"hidden"}}>
                                  <div style={{background:"#e0f2fe",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>🔄</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#0c4a6e"}}>Learners Needing Retest</div>
                                      <div style={{fontSize:11,color:"#0891b2"}}>{asData.ai_insights.learners_needing_retest.length} flagged</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                                    {asData.ai_insights.learners_needing_retest.length===0
                                      ? <div style={{textAlign:"center",padding:"12px 0",color:"#059669",fontSize:12}}>No retests needed ✓</div>
                                      : asData.ai_insights.learners_needing_retest.map((l,i)=>(
                                        <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                                          <div style={{width:30,height:30,borderRadius:"50%",background:"#0891b2",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{(l.name||"?")[0].toUpperCase()}</div>
                                          <div style={{flex:1}}>
                                            <div style={{fontSize:12,fontWeight:600,color:asText}}>{l.name}</div>
                                            <div style={{fontSize:10,color:asMuted}}>{l.status}{l.kpi!=null?` · KPI ${l.kpi}%`:""}</div>
                                          </div>
                                          <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"#fee2e2",color:"#dc2626",fontWeight:600}}>{l.courses.length} course{l.courses.length!==1?"s":""}</span>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>

                                {/* Suggested improvements */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,overflow:"hidden",gridColumn:"1/-1"}}>
                                  <div style={{background:"#ede9fe",padding:"12px 16px",display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>💡</span>
                                    <div>
                                      <div style={{fontSize:13,fontWeight:700,color:"#4c1d95"}}>AI-Suggested Improvements</div>
                                      <div style={{fontSize:11,color:"#7c3aed"}}>For low-pass-rate assessments</div>
                                    </div>
                                  </div>
                                  <div style={{padding:"14px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:10}}>
                                    {asData.ai_insights.suggested_improvements.length===0
                                      ? <div style={{textAlign:"center",padding:"12px 0",color:"#059669",fontSize:12}}>No improvements needed — all assessments performing well ✓</div>
                                      : asData.ai_insights.suggested_improvements.map((s,i)=>(
                                        <div key={i} style={{padding:"12px 14px",borderRadius:10,background:asDark?"#0f172a":"#faf5ff",border:`1px solid ${asDark?"#4c1d95":"#ddd6fe"}`}}>
                                          <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",marginBottom:4}}>{s.assessment_name}</div>
                                          <div style={{fontSize:10.5,color:asMuted,marginBottom:8}}>{s.course_title} · Pass rate: <b style={{color:"#dc2626"}}>{s.pass_rate}%</b></div>
                                          <div style={{fontSize:12,color:asDark?asText:"#3b0764",lineHeight:1.5}}>💡 {s.suggestion}</div>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>

                              </div>
                            </div>
                          )}

                          {/* ── CREATE / GENERATE TAB ── */}
                          {asActiveTab==="create" && (
                            <div className="lf-slide-in">
                              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>

                                {/* Create Assessment form */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,padding:"18px 20px"}}>
                                  <div style={{fontSize:14,fontWeight:700,color:asText,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>➕</span> Create New Assessment
                                  </div>
                                  <div style={{fontSize:12,color:asMuted,marginBottom:16}}>Link a new assessment to any course</div>
                                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                                    <div>
                                      <label style={{fontSize:11,fontWeight:600,color:asMuted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Course *</label>
                                      <select value={asCreateCourseId} onChange={e=>setAsCreateCourseId(e.target.value)}
                                        style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${asCreateCourseId?"#0891b2":asBorder}`,background:asInput,color:asText,fontSize:13,cursor:"pointer",outline:"none"}}>
                                        <option value="">Select a course…</option>
                                        {mongoCourses.map(c=>(
                                          <option key={c._id} value={c._id??""}>
                                            [{c.category}] {c.title}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label style={{fontSize:11,fontWeight:600,color:asMuted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Assessment Title *</label>
                                      <input value={asCreateTitle} onChange={e=>setAsCreateTitle(e.target.value)} placeholder="e.g. Module 3 Knowledge Check"
                                        style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${asCreateTitle?"#0891b2":asBorder}`,background:asInput,color:asText,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                                    </div>
                                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                                      <div>
                                        <label style={{fontSize:11,fontWeight:600,color:asMuted,display:"block",marginBottom:4}}>Questions</label>
                                        <input type="number" min={1} max={100} value={asCreateQCount} onChange={e=>setAsCreateQCount(Number(e.target.value))}
                                          style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1.5px solid ${asBorder}`,background:asInput,color:asText,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                                      </div>
                                      <div>
                                        <label style={{fontSize:11,fontWeight:600,color:asMuted,display:"block",marginBottom:4}}>Pass %</label>
                                        <input type="number" min={1} max={100} value={asCreatePass} onChange={e=>setAsCreatePass(Number(e.target.value))}
                                          style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1.5px solid ${asBorder}`,background:asInput,color:asText,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                                      </div>
                                      <div>
                                        <label style={{fontSize:11,fontWeight:600,color:asMuted,display:"block",marginBottom:4}}>Time (min)</label>
                                        <input type="number" min={1} max={300} value={asCreateTime} onChange={e=>setAsCreateTime(Number(e.target.value))}
                                          style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1.5px solid ${asBorder}`,background:asInput,color:asText,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                                      </div>
                                    </div>
                                    <button onClick={()=>void handleCreateAssessment()} disabled={asCreating}
                                      style={{padding:"10px 0",borderRadius:8,border:"none",background:"#0891b2",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13,opacity:asCreating?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                                      {asCreating?<><span className="lf-spin" style={{display:"inline-block"}}>↻</span> Creating…</>:"✅ Create Assessment"}
                                    </button>
                                    {asCreateMsg && (
                                      <div style={{padding:"8px 12px",borderRadius:8,background:asCreateMsg.includes("created")?"#d1fae5":"#fee2e2",color:asCreateMsg.includes("created")?"#065f46":"#991b1b",fontSize:12,fontWeight:500}}>
                                        {asCreateMsg}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* AI Quiz Generator */}
                                <div style={{background:asDark?"#1e293b":"#fff",borderRadius:12,border:`1.5px solid ${asBorder}`,padding:"18px 20px"}}>
                                  <div style={{fontSize:14,fontWeight:700,color:asText,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                                    <span style={{fontSize:18}}>🤖</span> Generate AI Quiz
                                  </div>
                                  <div style={{fontSize:12,color:asMuted,marginBottom:16}}>Auto-generate quiz questions from a course category</div>
                                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                                    <div>
                                      <label style={{fontSize:11,fontWeight:600,color:asMuted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Select Course</label>
                                      <select value={asAIQuizCourseId} onChange={e=>setAsAIQuizCourseId(e.target.value)}
                                        style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${asBorder}`,background:asInput,color:asText,fontSize:13,cursor:"pointer",outline:"none"}}>
                                        <option value="">Choose course…</option>
                                        {mongoCourses.map(c=>(
                                          <option key={c._id} value={c._id??""}>
                                            [{c.category}] {c.title}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <button onClick={()=>{
                                        const course = mongoCourses.find(c=>c._id===asAIQuizCourseId);
                                        if(!asAIQuizCourseId||!course){setAsCreateMsg("Select a course first.");return;}
                                        void handleGenerateAIQuiz(asAIQuizCourseId, course.category||"Sales");
                                      }}
                                      disabled={asAIGenerating||!asAIQuizCourseId}
                                      style={{padding:"10px 0",borderRadius:8,border:"none",background:"#7c3aed",color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13,opacity:(asAIGenerating||!asAIQuizCourseId)?0.7:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                                      {asAIGenerating?<><span className="lf-spin" style={{display:"inline-block"}}>↻</span> Generating…</>:"✨ Generate Questions"}
                                    </button>
                                    {asAIQuizResult && (
                                      <div style={{marginTop:4}}>
                                        <div style={{fontSize:11,fontWeight:700,color:asMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>{asAIQuizResult.length} Questions Generated</div>
                                        <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto"}}>
                                          {asAIQuizResult.map((q,qi)=>(
                                            <div key={q.id} style={{background:asDark?"#0f172a":"#f8fafc",borderRadius:8,padding:"10px 12px",border:`1px solid ${asBorder}`}}>
                                              <div style={{fontSize:12,fontWeight:600,color:asText,marginBottom:6}}>Q{qi+1}. {q.question}</div>
                                              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                                                {q.options.map((opt,oi)=>(
                                                  <div key={oi} style={{fontSize:11,color:oi===q.answer_index?"#059669":asMuted,fontWeight:oi===q.answer_index?700:400,padding:"2px 0",display:"flex",alignItems:"center",gap:6}}>
                                                    <span style={{width:16,height:16,borderRadius:"50%",background:oi===q.answer_index?"#d1fae5":"transparent",border:`1px solid ${oi===q.answer_index?"#059669":asBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0}}>{oi===q.answer_index?"✓":""}</span>
                                                    {opt}
                                                  </div>
                                                ))}
                                              </div>
                                              <div style={{marginTop:6}}>
                                                <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:(asDiffStyle[q.difficulty]??asDiffStyle["Medium"]).bg,color:(asDiffStyle[q.difficulty]??asDiffStyle["Medium"]).color,fontWeight:600}}>{q.difficulty}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </div>
                          )}

                        </>
                      )}
                    </div>

                    {/* footer */}
                    {asData && (
                      <div style={{background:asCard,borderTop:`1px solid ${asBorder}`,padding:"8px 18px",display:"flex",alignItems:"center",gap:10,fontSize:11,color:asMuted}}>
                        <span>📋 {asData.assessments.length} assessments across {asData.courses_synced} courses</span>
                        <span>·</span>
                        <span>👥 {asData.tp_synced} employees tracked</span>
                        <span style={{marginLeft:"auto"}}>Assessment Analytics v1.0</span>
                      </div>
                    )}
                  </div>
                );
              })()}

            </>
          )}

          {/* ─── ONBOARDING ─── */}
          {canManageOnboarding && activeTab === "onboarding" && (
            <>
              <Card>
                <CardHeader title="Create Blueprint" subtitle="Generate LMS from documents or URL" icon="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                <form onSubmit={handleCreateBlueprint} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <FormField label="Website URL (optional)">
                    <StyledInput value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://your-company.com" type="url" />
                  </FormField>
                  <FormField label="Document / SOP Text">
                    <StyledTextarea value={documentsText} onChange={setDocumentsText}
                      placeholder="Paste SOP or document text for blueprint generation…" rows={6} required />
                  </FormField>
                  <div><PrimaryBtn type="submit">Create Blueprint</PrimaryBtn></div>
                </form>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <SecondaryBtn onClick={() => void handleSyncTenantData()}>Sync Namadarshan Sheet Data</SecondaryBtn>
                  <SecondaryBtn onClick={() => void handleCreateBlueprintFromKnowledge()}>Create Blueprint From Synced Data</SecondaryBtn>
                </div>
                {onboardingMessage && <div style={{ marginTop: 10 }}><MsgBox msg={onboardingMessage} type="info" /></div>}
                {knowledgeMessage && <div style={{ marginTop: 10 }}><MsgBox msg={knowledgeMessage} type="success" /></div>}
              </Card>

              <Card>
                <CardHeader title="Available Blueprints" subtitle={`${blueprints.length} blueprints`} icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
                {blueprints.length === 0 ? (
                  <div style={s.emptyState}>No blueprints yet. Create one above.</div>
                ) : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {["Blueprint ID", "Version", "Created", "Action"].map((h) => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {blueprints.map((b) => (
                          <tr key={b.id} style={s.tr}>
                            <td style={s.td}><code style={s.code}>{b.id.slice(0, 12)}…</code></td>
                            <td style={s.td}><Badge label={`v${b.version}`} /></td>
                            <td style={s.td}>{new Date(b.created_at).toLocaleString()}</td>
                            <td style={s.td}>
                              <GhostBtn onClick={() => void handleGenerateLms(b.id)}>Generate LMS</GhostBtn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── KNOWLEDGE — redirects to dedicated workspace ─── */}
          {canManageOnboarding && activeTab === "knowledge" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
              <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(99,102,241,0.08)", maxWidth: 440 }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📚</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Knowledge Workspace</div>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                  Manage courses, curriculum, content library, knowledge base articles, certificates, and collaboration spaces — all in one enterprise workspace.
                </div>
                <button onClick={() => router.push("/dashboard/admin/knowledge")} style={{
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "12px 28px",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                }}>
                  Open Knowledge Workspace →
                </button>
              </div>
            </div>
          )}

          {/* ─── PERFORMANCE ─── */}
          {activeTab === "performance" && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 480 }}>
              <div style={{ textAlign: "center", maxWidth: 520, padding: "40px 32px", background: "#ffffff", borderRadius: 24, boxShadow: "0 8px 40px rgba(99,102,241,0.12)", border: "1px solid #e0e7ff" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Performance Workspace</div>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                  Enterprise-level analytics for learner success, instructor efficiency, course outcomes, revenue metrics, and AI-powered business KPIs.
                </div>
                <button onClick={() => router.push("/dashboard/admin/performance")} style={{
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "12px 28px",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                }}>
                  Open Performance Workspace →
                </button>
              </div>
            </div>
          )}

          {/* ─── PERFORMANCE (legacy gamification) ─── */}
          {activeTab === "_performance_legacy" && (
            <>
              {/* Gamification full */}
              <Card>
                <CardHeader title="Gamification Profile" subtitle="Your achievements" icon="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                {gamificationProfile ? (
                  <>
                    <div style={s.xpRow}>
                      {[
                        { label: "Level", value: gamificationProfile.level, color: "#7c3aed" },
                        { label: "XP",    value: gamificationProfile.xp_points, color: "#4f46e5" },
                        { label: "Badges", value: gamificationProfile.badges_count, color: "#f59e0b" },
                        { label: "Streak", value: `${gamificationProfile.streak_days}d`, color: "#059669" },
                      ].map((item) => (
                        <div key={item.label} style={{ ...s.xpTile, borderColor: item.color + "33" }}>
                          <div style={{ ...s.xpValue, color: item.color }}>{item.value}</div>
                          <div style={s.xpLabel}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                    {gamificationProfile.badges.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
                        {gamificationProfile.badges.map((badge) => (
                          <Badge key={`${badge.badge_code}-${badge.awarded_at}`} label={badge.badge_name} color="#7c3aed" bg="#f5f3ff" />
                        ))}
                      </div>
                    ) : <div style={{ ...s.emptyState, marginTop: 14 }}>No badges yet. Keep learning!</div>}
                  </>
                ) : <div style={s.emptyState}>Loading gamification profile…</div>}
              </Card>

              {/* Leaderboard */}
              <Card>
                <CardHeader title="Leaderboard" subtitle="Tenant ranking" icon="M18 20V10M12 20V4M6 20v-6" />
                {leaderboard.length === 0 ? (
                  <div style={s.emptyState}>No leaderboard entries yet.</div>
                ) : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>{["Rank", "Name", "Role", "XP", "Level", "Badges"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((row, idx) => (
                          <tr key={row.user_id} style={{ ...s.tr, ...(idx === 0 ? s.trGold : idx === 1 ? s.trSilver : idx === 2 ? s.trBronze : {}) }}>
                            <td style={s.td}>
                              <span style={s.rank}>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}</span>
                            </td>
                            <td style={{ ...s.td, fontWeight: 600 }}>{row.full_name}</td>
                            <td style={s.td}><Badge label={row.role} /></td>
                            <td style={{ ...s.td, fontWeight: 700, color: "#4f46e5" }}>{row.xp_points}</td>
                            <td style={s.td}>L{row.level}</td>
                            <td style={s.td}>{row.badges_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* KPI Ingestion (admin/manager only) */}
              {canManageOnboarding && (
                <Card>
                  <CardHeader title="KPI Ingestion" subtitle="Ingest performance metrics for a user" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
                  <form onSubmit={handleIngestKpi} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <FormField label="Target User UUID">
                      <StyledInput value={kpiUserId} onChange={setKpiUserId} placeholder="Paste user UUID…" required />
                    </FormField>
                    <FormField label="KPI Metrics JSON">
                      <StyledTextarea value={kpiMetricsText} onChange={setKpiMetricsText} rows={4}
                        style={{ fontFamily: "monospace", fontSize: 13 }} required />
                    </FormField>
                    <div style={{ display: "flex", gap: 10 }}>
                      <PrimaryBtn type="submit">Ingest KPI Metrics</PrimaryBtn>
                      <SecondaryBtn onClick={() => void handleUseMyUserIdForKpi()}>Use My ID</SecondaryBtn>
                    </div>
                  </form>
                  {kpiMessage && <div style={{ marginTop: 10 }}><MsgBox msg={kpiMessage} type="info" /></div>}
                  {kpiResult?.updated_skills?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={s.weakSkillsTitle}>Updated Skills</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {kpiResult.updated_skills.map((item) => (
                          <Badge key={item.skill_name} label={`${item.skill_name}: ${item.score}`} color="#059669" bg="#d1fae5" />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              )}
            </>
          )}

          {/* ─── INTEGRATIONS ─── */}
          {canManageOnboarding && activeTab === "integrations" && (
            <>
              <Card>
                <CardHeader title="Register Webhook" subtitle="Connect external services" icon="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                <form onSubmit={handleCreateWebhook} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FormField label="Provider">
                      <StyledInput value={webhookProvider} onChange={setWebhookProvider} placeholder="slack, teams, zapier…" required />
                    </FormField>
                    <FormField label="Event Name">
                      <StyledInput value={webhookEventName} onChange={setWebhookEventName} placeholder="progress.updated…" required />
                    </FormField>
                  </div>
                  <FormField label="Target URL">
                    <StyledInput value={webhookTargetUrl} onChange={setWebhookTargetUrl} type="url" placeholder="https://hooks.example.com/…" required />
                  </FormField>
                  <div><PrimaryBtn type="submit">Register Webhook</PrimaryBtn></div>
                </form>
                {integrationMessage && <div style={{ marginTop: 10 }}><MsgBox msg={integrationMessage} type="success" /></div>}
              </Card>

              <Card>
                <CardHeader title="Registered Webhooks" subtitle={`${webhooks.length} active`} icon="M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3" />
                {webhooks.length === 0 ? (
                  <div style={s.emptyState}>No webhooks registered yet.</div>
                ) : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>{["Provider", "Event", "Target URL", "Status"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {webhooks.map((hook) => (
                          <tr key={hook.id} style={s.tr}>
                            <td style={s.td}><Badge label={hook.provider} color="#7c3aed" bg="#f5f3ff" /></td>
                            <td style={s.td}><code style={s.code}>{hook.event_name}</code></td>
                            <td style={{ ...s.td, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hook.target_url}</td>
                            <td style={s.td}><StatusBadge status={hook.is_active ? "active" : "inactive"} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── QUESTION BANK ─── */}
          {canManageOnboarding && activeTab === "question-bank" && (
            <>
              {featureMsg && <MsgBox msg={featureMsg} type={featureMsg.includes("Error") ? "error" : "success"} />}
              <Card>
                <CardHeader title="AI Question Generator" subtitle="Generate questions automatically" icon="M12 2a10 10 0 1 0 10 10" />
                <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <FormField label="Topic">
                      <StyledInput value={aiGenTopic} onChange={setAiGenTopic} placeholder="e.g. Customer Communication" />
                    </FormField>
                  </div>
                  <div style={{ width: 90 }}>
                    <FormField label="Count">
                      <StyledInput value={aiGenCount} onChange={setAiGenCount} type="number" placeholder="5" />
                    </FormField>
                  </div>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken || !aiGenTopic) return;
                    setFeatureMsg(null);
                    try {
                      const res = await generateAiQuestionsApi(accessToken, { topic: aiGenTopic, count: parseInt(aiGenCount) || 5 });
                      setFeatureMsg(`Generated ${res.generated} questions successfully`);
                      const updated = await listQuestionBankApi(accessToken);
                      setQuestionBank(updated);
                    } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                  }}>Generate</PrimaryBtn>
                </div>
              </Card>
              <Card>
                <CardHeader title="Question Bank" subtitle={`${questionBank.length} questions`} icon="M9 11l3 3L22 4" />
                <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  {["easy","medium","hard"].map(d => (
                    <button key={d} onClick={async () => {
                      setQbFilter(f => ({ ...f, difficulty: f.difficulty === d ? undefined : d }));
                      if (!accessToken) return;
                      const res = await listQuestionBankApi(accessToken, { difficulty: qbFilter.difficulty === d ? undefined : d });
                      setQuestionBank(res);
                    }} style={{ ...s.filterChip, ...(qbFilter.difficulty === d ? s.filterChipActive : {}) }}>{d}</button>
                  ))}
                  <GhostBtn onClick={async () => {
                    setQbFilter({});
                    if (!accessToken) return;
                    const res = await listQuestionBankApi(accessToken);
                    setQuestionBank(res);
                  }}>All</GhostBtn>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken) return;
                    const res = await listQuestionBankApi(accessToken, qbFilter);
                    setQuestionBank(res);
                  }}>Refresh</PrimaryBtn>
                </div>
                {questionBank.length === 0 ? (
                  <div style={s.emptyState}>No questions yet. Use AI Generate above or add manually.</div>
                ) : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead><tr>{["Question","Domain","Difficulty","Status","Used","Action"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {questionBank.slice(0, 20).map(q => (
                          <tr key={q.id} style={s.tr}>
                            <td style={{ ...s.td, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.question_text}</td>
                            <td style={s.td}><Badge label={q.domain || "—"} /></td>
                            <td style={s.td}><Badge label={q.difficulty} color={q.difficulty === "easy" ? "#059669" : q.difficulty === "hard" ? "#dc2626" : "#d97706"} bg={q.difficulty === "easy" ? "#d1fae5" : q.difficulty === "hard" ? "#fee2e2" : "#fef3c7"} /></td>
                            <td style={s.td}><StatusBadge status={q.review_status} /></td>
                            <td style={s.td}>{q.usage_count}</td>
                            <td style={s.td}>
                              <GhostBtn onClick={async () => {
                                if (!accessToken) return;
                                try { await deleteBankQuestionApi(accessToken, q.id); setQuestionBank(p => p.filter(x => x.id !== q.id)); setFeatureMsg("Question deleted"); } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : ""}`); }
                              }}>Delete</GhostBtn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
              <Card>
                <CardHeader title="Add Question Manually" subtitle="Create a new bank question" icon="M12 5v14 M5 12h14" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FormField label="Question Text">
                    <StyledTextarea value={newQuestion.question_text} onChange={v => setNewQuestion(q => ({ ...q, question_text: v }))} rows={2} />
                  </FormField>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <FormField label="Difficulty">
                      <select value={newQuestion.difficulty} onChange={e => setNewQuestion(q => ({ ...q, difficulty: e.target.value }))} style={{ ...s.input, padding: "9px 12px" }}>
                        {["easy","medium","hard"].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Domain">
                      <StyledInput value={newQuestion.domain} onChange={v => setNewQuestion(q => ({ ...q, domain: v }))} placeholder="sales, hr…" />
                    </FormField>
                    <FormField label="Correct Index (0-3)">
                      <StyledInput value={newQuestion.correct_answer_json} onChange={v => setNewQuestion(q => ({ ...q, correct_answer_json: v }))} placeholder='{"index":0}' />
                    </FormField>
                  </div>
                  <FormField label='Options JSON (e.g. {"a":"Opt A","b":"Opt B","c":"Opt C","d":"Opt D"})'>
                    <StyledInput value={newQuestion.options_json} onChange={v => setNewQuestion(q => ({ ...q, options_json: v }))} />
                  </FormField>
                  <FormField label="Explanation">
                    <StyledInput value={newQuestion.explanation} onChange={v => setNewQuestion(q => ({ ...q, explanation: v }))} placeholder="Why is this the correct answer?" />
                  </FormField>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken || !newQuestion.question_text) return;
                    setFeatureMsg(null);
                    try {
                      let opts, ans;
                      try { opts = JSON.parse(newQuestion.options_json); } catch { opts = {}; }
                      try { ans = JSON.parse(newQuestion.correct_answer_json); } catch { ans = { index: 0 }; }
                      await createBankQuestionApi(accessToken, { ...newQuestion, options_json: opts, correct_answer_json: ans });
                      setFeatureMsg("Question added to bank");
                      const updated = await listQuestionBankApi(accessToken);
                      setQuestionBank(updated);
                    } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                  }}>Add to Bank</PrimaryBtn>
                </div>
              </Card>
            </>
          )}

          {/* ─── API KEYS ─── */}
          {canManageOnboarding && activeTab === "api-keys" && (
            <>
              {featureMsg && <MsgBox msg={featureMsg} type={featureMsg.includes("Error") ? "error" : "success"} />}
              {newApiKeyRaw && (
                <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 10, padding: "14px 18px", marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, color: "#15803d", marginBottom: 6 }}>New API Key — copy it now, it won't be shown again:</div>
                  <code style={{ fontSize: 14, color: "#166534", background: "#dcfce7", padding: "6px 10px", borderRadius: 6, display: "block", wordBreak: "break-all" }}>{newApiKeyRaw}</code>
                  <div style={{ marginTop: 8 }}><GhostBtn onClick={() => setNewApiKeyRaw(null)}>Dismiss</GhostBtn></div>
                </div>
              )}
              <Card>
                <CardHeader title="Create API Key" subtitle="Generate a new key for external access" icon="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778" />
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <FormField label="Key Name">
                      <StyledInput value={newApiKeyName} onChange={setNewApiKeyName} placeholder="e.g. Production App Key" />
                    </FormField>
                  </div>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken || !newApiKeyName) return;
                    setFeatureMsg(null);
                    try {
                      const res = await createApiKeyApi(accessToken, { name: newApiKeyName });
                      setNewApiKeyRaw(res.raw_key);
                      setNewApiKeyName("");
                      const updated = await listApiKeysApi(accessToken);
                      setApiKeys(updated);
                      setFeatureMsg("API key created");
                    } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                  }}>Create Key</PrimaryBtn>
                </div>
              </Card>
              <Card>
                <CardHeader title="API Keys" subtitle={`${apiKeys.length} keys`} icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12" />
                {apiKeys.length === 0 ? <div style={s.emptyState}>No API keys yet.</div> : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead><tr>{["Name","Prefix","Status","Created","Action"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {apiKeys.map(k => (
                          <tr key={k.id} style={s.tr}>
                            <td style={{ ...s.td, fontWeight: 600 }}>{k.name}</td>
                            <td style={s.td}><code style={s.code}>{k.prefix}…</code></td>
                            <td style={s.td}><StatusBadge status={k.is_active ? "active" : "inactive"} /></td>
                            <td style={s.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                            <td style={s.td}>
                              <GhostBtn onClick={async () => {
                                if (!accessToken) return;
                                try { await revokeApiKeyApi(accessToken, k.id); setApiKeys(p => p.filter(x => x.id !== k.id)); setFeatureMsg("Key revoked"); } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : ""}`); }
                              }}>Revoke</GhostBtn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── EMBED CONFIGS ─── */}
          {canManageOnboarding && activeTab === "embed-configs" && (
            <>
              {featureMsg && <MsgBox msg={featureMsg} type={featureMsg.includes("Error") ? "error" : "success"} />}
              <Card>
                <CardHeader title="Create Embed Config" subtitle="Configure LMS widget for any website" icon="M16 18l6-6-6-6 M8 6l-6 6 6 6" />
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <FormField label="Config Name">
                      <StyledInput value={newEmbedName} onChange={setNewEmbedName} placeholder="e.g. Main Website Widget" />
                    </FormField>
                  </div>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken || !newEmbedName) return;
                    setFeatureMsg(null);
                    try {
                      await createEmbedConfigApi(accessToken, { name: newEmbedName });
                      setNewEmbedName("");
                      const updated = await listEmbedConfigsApi(accessToken);
                      setEmbedConfigs(updated);
                      setFeatureMsg("Embed config created");
                    } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                  }}>Create Config</PrimaryBtn>
                </div>
              </Card>
              <Card>
                <CardHeader title="Embed Configurations" subtitle={`${embedConfigs.length} configs`} icon="M16 18l6-6-6-6" />
                {embedConfigs.length === 0 ? <div style={s.emptyState}>No embed configs yet.</div> : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead><tr>{["Name","Embed Token","Status","Created"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {embedConfigs.map(cfg => (
                          <tr key={cfg.id} style={s.tr}>
                            <td style={{ ...s.td, fontWeight: 600 }}>{cfg.name}</td>
                            <td style={s.td}><code style={{ ...s.code, fontSize: 11 }}>{cfg.embed_token?.slice(0, 20)}…</code></td>
                            <td style={s.td}><StatusBadge status={cfg.is_active ? "active" : "inactive"} /></td>
                            <td style={s.td}>{new Date(cfg.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 8, fontSize: 13, color: "#475569" }}>
                  <strong>Integration snippet:</strong><br />
                  <code style={{ fontSize: 11, color: "#4f46e5" }}>{"<script src=\"https://cdn.ai-lms.io/embed.js\" data-token=\"YOUR_EMBED_TOKEN\"></script>"}</code>
                </div>
              </Card>
            </>
          )}

          {/* ─── AUDIT LOG — redirects to dedicated workspace ─── */}
          {canManageOnboarding && activeTab === "audit-log" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
              <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(99,102,241,0.08)", maxWidth: 420 }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Audit Logs Workspace</div>
                <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                  Enterprise-grade audit logs with live activity feed, security alerts, analytics, and CSV export.
                </div>
                <button onClick={() => router.push("/dashboard/admin/audit-logs")} style={{
                  background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff",
                  border: "none", borderRadius: 10, padding: "12px 28px",
                  fontSize: 14, fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                }}>
                  Open Audit Logs Workspace →
                </button>
              </div>
            </div>
          )}

          {/* ─── WEBSITE SOURCES ─── */}
          {canManageOnboarding && activeTab === "website-sources" && (
            <>
              {featureMsg && <MsgBox msg={featureMsg} type={featureMsg.includes("Error") ? "error" : "success"} />}
              <Card>
                <CardHeader title="Add Data Source" subtitle="Connect external data for knowledge ingestion" icon="M3 15a4 4 0 0 0 4 4h9a5 5 0 0 0 1.8-9.7" />
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 3fr auto", gap: 10, alignItems: "flex-end" }}>
                  <FormField label="Name">
                    <StyledInput value={newSource.name} onChange={v => setNewSource(s => ({ ...s, name: v }))} placeholder="My Google Sheet" />
                  </FormField>
                  <FormField label="Type">
                    <select value={newSource.source_type} onChange={e => setNewSource(s => ({ ...s, source_type: e.target.value }))} style={{ ...s.input, padding: "9px 12px" }}>
                      {["url_scrape","pdf","google_sheets","rest_api","csv","manual","youtube"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </FormField>
                  <FormField label="URI / URL">
                    <StyledInput value={newSource.source_uri} onChange={v => setNewSource(s => ({ ...s, source_uri: v }))} placeholder="https://…" />
                  </FormField>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken || !newSource.name || !newSource.source_uri) return;
                    setFeatureMsg(null);
                    try {
                      await createWebsiteSourceApi(accessToken, newSource);
                      setNewSource({ name: "", source_type: "url_scrape", source_uri: "" });
                      const updated = await listWebsiteSourcesApi(accessToken);
                      setWebsiteSources(updated);
                      setFeatureMsg("Data source created");
                    } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                  }}>Add</PrimaryBtn>
                </div>
              </Card>
              <Card>
                <CardHeader title="Data Sources" subtitle={`${websiteSources.length} sources`} icon="M3 15a4 4 0 0 0 4 4h9" />
                <PrimaryBtn onClick={async () => {
                  if (!accessToken) return;
                  const res = await listWebsiteSourcesApi(accessToken);
                  setWebsiteSources(res);
                }}>Refresh</PrimaryBtn>
                {websiteSources.length === 0 ? <div style={{ ...s.emptyState, marginTop: 14 }}>No data sources configured.</div> : (
                  <div style={{ ...s.tableWrap, marginTop: 14 }}>
                    <table style={s.table}>
                      <thead><tr>{["Name","Type","URI","Status","Last Sync","Action"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {websiteSources.map(src => (
                          <tr key={src.id} style={s.tr}>
                            <td style={{ ...s.td, fontWeight: 600 }}>{src.name}</td>
                            <td style={s.td}><Badge label={src.source_type} color="#0891b2" bg="#e0f2fe" /></td>
                            <td style={{ ...s.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{src.source_uri}</td>
                            <td style={s.td}><StatusBadge status={src.sync_status || "idle"} /></td>
                            <td style={s.td}>{src.last_synced_at ? new Date(src.last_synced_at).toLocaleDateString() : "—"}</td>
                            <td style={s.td}>
                              <PrimaryBtn onClick={async () => {
                                if (!accessToken) return;
                                try { const j = await triggerSourceSyncApi(accessToken, src.id); setFeatureMsg(`Sync job started: ${j.job_id.slice(0,8)}…`); } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : ""}`); }
                              }}>Sync</PrimaryBtn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── ANALYTICS SNAPSHOTS ─── */}
          {canManageOnboarding && activeTab === "analytics-snapshots" && (
            <>
              <Card>
                <CardHeader title="Analytics Snapshots" subtitle="Historical daily snapshots" icon="M23 6l-9.5 9.5-5-5L1 18" />
                <PrimaryBtn onClick={async () => {
                  if (!accessToken) return;
                  const res = await listAnalyticsSnapshotsApi(accessToken);
                  setAnalyticsSnapshots(res);
                }}>Load Snapshots</PrimaryBtn>
                {analyticsSnapshots.length === 0 ? <div style={{ ...s.emptyState, marginTop: 14 }}>No snapshots yet. Snapshots are generated nightly by the Celery scheduler.</div> : (
                  <div style={{ ...s.tableWrap, marginTop: 14 }}>
                    <table style={s.table}>
                      <thead><tr>{["Date","Active Users","Completions","Avg Score","Content Items","AI Jobs"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {analyticsSnapshots.map(snap => (
                          <tr key={snap.id} style={s.tr}>
                            <td style={{ ...s.td, fontWeight: 600 }}>{snap.snapshot_date}</td>
                            <td style={s.td}>{snap.active_users}</td>
                            <td style={s.td}>{snap.total_completions}</td>
                            <td style={s.td}>{snap.avg_score?.toFixed(1)}</td>
                            <td style={s.td}>{snap.content_items}</td>
                            <td style={s.td}>{snap.ai_jobs_run}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── ADAPTIVE RULES ─── */}
          {canManageOnboarding && activeTab === "adaptive-rules" && (
            <>
              {featureMsg && <MsgBox msg={featureMsg} type={featureMsg.includes("Error") ? "error" : "success"} />}
              <Card>
                <CardHeader title="Create Adaptive Rule" subtitle="Trigger actions based on learner conditions" icon="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <FormField label="Rule Name">
                    <StyledInput value={newRuleName} onChange={setNewRuleName} placeholder="e.g. Low Score Remediation" />
                  </FormField>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FormField label='Trigger Condition JSON (e.g. {"score_below": 70})'>
                      <StyledInput value={newRuleTrigger} onChange={setNewRuleTrigger} />
                    </FormField>
                    <FormField label='Action JSON (e.g. {"recommend": "remedial_lesson"})'>
                      <StyledInput value={newRuleAction} onChange={setNewRuleAction} />
                    </FormField>
                  </div>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken || !newRuleName) return;
                    setFeatureMsg(null);
                    try {
                      let trigger, action;
                      try { trigger = JSON.parse(newRuleTrigger); } catch { trigger = {}; }
                      try { action = JSON.parse(newRuleAction); } catch { action = {}; }
                      await createAdaptiveRuleApi(accessToken, { name: newRuleName, trigger_condition: trigger, action });
                      setNewRuleName(""); setNewRuleTrigger('{"score_below": 70}'); setNewRuleAction('{"recommend": "remedial_lesson"}');
                      const updated = await listAdaptiveRulesApi(accessToken);
                      setAdaptiveRules(updated);
                      setFeatureMsg("Adaptive rule created");
                    } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                  }}>Create Rule</PrimaryBtn>
                </div>
              </Card>
              <Card>
                <CardHeader title="Active Rules" subtitle={`${adaptiveRules.length} rules`} icon="M22 4L12 14.01l-3-3" />
                <PrimaryBtn onClick={async () => {
                  if (!accessToken) return;
                  const res = await listAdaptiveRulesApi(accessToken);
                  setAdaptiveRules(res);
                }}>Refresh</PrimaryBtn>
                {adaptiveRules.length === 0 ? <div style={{ ...s.emptyState, marginTop: 14 }}>No adaptive rules yet.</div> : (
                  <div style={{ ...s.tableWrap, marginTop: 14 }}>
                    <table style={s.table}>
                      <thead><tr>{["Name","Trigger","Action","Status","Action"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {adaptiveRules.map(rule => (
                          <tr key={rule.id} style={s.tr}>
                            <td style={{ ...s.td, fontWeight: 600 }}>{rule.name}</td>
                            <td style={s.td}><code style={{ ...s.code, fontSize: 11 }}>{JSON.stringify(rule.trigger_condition).slice(0, 40)}</code></td>
                            <td style={s.td}><code style={{ ...s.code, fontSize: 11 }}>{JSON.stringify(rule.action).slice(0, 40)}</code></td>
                            <td style={s.td}><StatusBadge status={rule.is_active ? "active" : "inactive"} /></td>
                            <td style={s.td}>
                              <GhostBtn onClick={async () => {
                                if (!accessToken) return;
                                try { await deleteAdaptiveRuleApi(accessToken, rule.id); setAdaptiveRules(p => p.filter(r => r.id !== rule.id)); setFeatureMsg("Rule deleted"); } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : ""}`); }
                              }}>Delete</GhostBtn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── AI USAGE ─── */}
          {canManageOnboarding && activeTab === "ai-usage" && (
            <>
              <Card>
                <CardHeader title="AI Usage Summary" subtitle="Tokens, cache hits, feature breakdown" icon="M12 2a10 10 0 1 0 10 10" />
                <PrimaryBtn onClick={async () => {
                  if (!accessToken) return;
                  try {
                    const [summary, cache] = await Promise.all([getAiUsageSummaryApi(accessToken), listAiCacheApi(accessToken)]);
                    setAiUsageSummary(summary);
                    setAiCacheEntries(cache);
                  } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : ""}`); }
                }}>Load AI Stats</PrimaryBtn>
                {aiUsageSummary && (
                  <div style={{ marginTop: 14 }}>
                    <div style={s.analyticsGrid}>
                      {[
                        { label: "Total Calls", value: aiUsageSummary.total_calls },
                        { label: "Total Tokens", value: aiUsageSummary.total_tokens?.toLocaleString() },
                        { label: "Cache Hits", value: aiUsageSummary.cache_hits },
                        { label: "Cache Hit Rate", value: `${aiUsageSummary.cache_hit_rate?.toFixed(1)}%` },
                      ].map(item => (
                        <div key={item.label} style={s.analyticsTile}>
                          <div style={s.analyticsValue}>{item.value}</div>
                          <div style={s.analyticsLabel}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                    {Object.entries(aiUsageSummary.by_feature || {}).length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={s.weakSkillsTitle}>By Feature</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                          {Object.entries(aiUsageSummary.by_feature).map(([feat, count]) => (
                            <Badge key={feat} label={`${feat}: ${count}`} color="#4f46e5" bg="#eef2ff" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
              <Card>
                <CardHeader title="AI Cache Entries" subtitle="Cached LLM responses" icon="M12 8v4l3 3" />
                {aiCacheEntries.length === 0 ? <div style={s.emptyState}>Load AI Stats to see cache entries.</div> : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead><tr>{["Type","Model","Tokens","Expires","Created"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {aiCacheEntries.map(e => (
                          <tr key={e.id} style={s.tr}>
                            <td style={s.td}><Badge label={e.content_type} /></td>
                            <td style={s.td}><code style={s.code}>{e.model_used}</code></td>
                            <td style={s.td}>{e.tokens_used}</td>
                            <td style={s.td}>{e.expires_at ? new Date(e.expires_at).toLocaleDateString() : "Never"}</td>
                            <td style={s.td}>{new Date(e.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── DEPARTMENTS ─── */}
          {activeTab === "departments" && (
            <>
              {featureMsg && <MsgBox msg={featureMsg} type={featureMsg.includes("Error") ? "error" : "success"} />}
              <Card>
                <CardHeader title="Departments" subtitle={`${departments.length} departments`} icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <FormField label="New Department Name">
                      <StyledInput value={newDeptName} onChange={setNewDeptName} placeholder="e.g. Engineering" />
                    </FormField>
                  </div>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken || !newDeptName) return;
                    setFeatureMsg(null);
                    try {
                      await createDepartmentApi(accessToken, { name: newDeptName });
                      setNewDeptName("");
                      const updated = await listDepartmentsApi(accessToken);
                      setDepartments(updated);
                      setFeatureMsg("Department created");
                    } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                  }}>Add</PrimaryBtn>
                </div>
                {departments.length === 0 ? <div style={s.emptyState}>No departments yet.</div> : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {departments.map(d => (
                      <div key={d.id} style={{ padding: "10px 16px", borderRadius: 8, background: "#eef2ff", border: "1px solid #c7d2fe", fontSize: 14, fontWeight: 600, color: "#3730a3" }}>
                        {d.name}
                        <div style={{ fontSize: 11, fontWeight: 400, color: "#6366f1", marginTop: 2 }}>{new Date(d.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── LEAVE TYPES ─── */}
          {activeTab === "leave-types" && (
            <>
              {featureMsg && <MsgBox msg={featureMsg} type={featureMsg.includes("Error") ? "error" : "success"} />}
              <Card>
                <CardHeader title="Leave Types" subtitle="Configurable leave categories" icon="M8 2v4 M16 2v4 M3 10h18" />
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
                  <FormField label="Leave Type Name">
                    <StyledInput value={newLeaveTypeName} onChange={setNewLeaveTypeName} placeholder="e.g. Earned Leave" />
                  </FormField>
                  <FormField label="Days Allowed">
                    <StyledInput value={newLeaveTypeDays} onChange={setNewLeaveTypeDays} type="number" placeholder="15" />
                  </FormField>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken || !newLeaveTypeName) return;
                    setFeatureMsg(null);
                    try {
                      await createLeaveTypeApi(accessToken, { name: newLeaveTypeName, days_allowed: parseInt(newLeaveTypeDays) || 12 });
                      setNewLeaveTypeName(""); setNewLeaveTypeDays("12");
                      const updated = await listLeaveTypesApi(accessToken);
                      setLeaveTypes(updated);
                      setFeatureMsg("Leave type created");
                    } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                  }}>Add</PrimaryBtn>
                </div>
                {leaveTypes.length === 0 ? <div style={s.emptyState}>No leave types configured.</div> : (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead><tr>{["Name","Days Allowed","Carry Forward","Created"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {leaveTypes.map(lt => (
                          <tr key={lt.id} style={s.tr}>
                            <td style={{ ...s.td, fontWeight: 600 }}>{lt.name}</td>
                            <td style={s.td}>{lt.days_allowed}</td>
                            <td style={s.td}><Badge label={lt.carry_forward ? "Yes" : "No"} color={lt.carry_forward ? "#059669" : "#dc2626"} bg={lt.carry_forward ? "#d1fae5" : "#fee2e2"} /></td>
                            <td style={s.td}>{new Date(lt.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── LEARNING PATHS ─── */}
          {activeTab === "learning-paths" && (
            <>
              {featureMsg && <MsgBox msg={featureMsg} type={featureMsg.includes("Error") ? "error" : "success"} />}
              {canManageOnboarding && (
                <Card>
                  <CardHeader title="Create Learning Path" subtitle="Ordered course sequences by role" icon="M3 3h7v7H3z" />
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <FormField label="Path Title">
                        <StyledInput value={newPathTitle} onChange={setNewPathTitle} placeholder="e.g. Sales Onboarding Path" />
                      </FormField>
                    </div>
                    <div style={{ flex: 1 }}>
                      <FormField label="Target Role">
                        <StyledInput value={newPathRole} onChange={setNewPathRole} placeholder="employee, manager…" />
                      </FormField>
                    </div>
                    <PrimaryBtn onClick={async () => {
                      if (!accessToken || !newPathTitle) return;
                      setFeatureMsg(null);
                      try {
                        await createLearningPathApi(accessToken, { title: newPathTitle, target_role: newPathRole });
                        setNewPathTitle(""); setNewPathRole("");
                        const updated = await listLearningPathsApi(accessToken);
                        setLearningPaths(updated);
                        setFeatureMsg("Learning path created");
                      } catch (e) { setFeatureMsg(`Error: ${e instanceof Error ? e.message : String(e)}`); }
                    }}>Create Path</PrimaryBtn>
                  </div>
                </Card>
              )}
              <Card>
                <CardHeader title="Learning Paths" subtitle={`${learningPaths.length} paths`} icon="M3 3h7v7H3z M14 3h7v7h-7z" />
                {learningPaths.length === 0 ? <div style={s.emptyState}>No learning paths configured.</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {learningPaths.map(path => (
                      <div key={path.id} style={{ padding: "14px 18px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{path.title}</div>
                            {path.description && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{path.description}</div>}
                          </div>
                          {path.target_role && <Badge label={path.target_role} color="#7c3aed" bg="#f5f3ff" />}
                        </div>
                        {path.course_ids?.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>{path.course_ids.length} courses</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── NOTIFICATIONS ─── */}
          {activeTab === "notifications" && (
            <>
              <Card>
                <CardHeader title="Notifications" subtitle={`${notifications.filter(n => !n.is_read).length} unread`} icon="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <PrimaryBtn onClick={async () => {
                    if (!accessToken) return;
                    try { await markAllNotificationsReadApi(accessToken); setNotifications(p => p.map(n => ({ ...n, is_read: true }))); } catch { /* ignore */ }
                  }}>Mark All Read</PrimaryBtn>
                  <GhostBtn onClick={async () => {
                    if (!accessToken) return;
                    const res = await listNotificationsApi(accessToken);
                    setNotifications(res);
                  }}>Refresh</GhostBtn>
                </div>
                {notifications.length === 0 ? <div style={s.emptyState}>No notifications.</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {notifications.map(n => (
                      <div key={n.id} style={{ padding: "12px 16px", borderRadius: 8, background: n.is_read ? "#f8fafc" : "#eef2ff", border: `1px solid ${n.is_read ? "#e2e8f0" : "#c7d2fe"}`, cursor: n.is_read ? "default" : "pointer" }}
                        onClick={async () => {
                          if (n.is_read || !accessToken) return;
                          try { await markNotificationReadApi(accessToken, n.id); setNotifications(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x)); } catch { /* ignore */ }
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: n.is_read ? "#475569" : "#1e1b4b" }}>{n.title}</div>
                            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{n.message}</div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <Badge label={n.type} color="#7c3aed" bg="#f5f3ff" />
                            {!n.is_read && <span style={{ fontSize: 10, color: "#6366f1", fontWeight: 700 }}>● UNREAD</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── XP HISTORY ─── */}
          {activeTab === "xp-history" && (
            <>
              <Card>
                <CardHeader title="XP Transaction History" subtitle="All experience points earned" icon="M12 2l3.09 6.26L22 9.27l-5 4.87" />
                <PrimaryBtn onClick={async () => {
                  if (!accessToken) return;
                  const res = await listXpHistoryApi(accessToken);
                  setXpHistory(res);
                }}>Refresh</PrimaryBtn>
                {xpHistory.length === 0 ? <div style={{ ...s.emptyState, marginTop: 14 }}>No XP transactions yet. Complete lessons and assessments to earn XP.</div> : (
                  <div style={{ ...s.tableWrap, marginTop: 14 }}>
                    <table style={s.table}>
                      <thead><tr>{["Action","XP Earned","Reference","Type","Date"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {xpHistory.map(tx => (
                          <tr key={tx.id} style={s.tr}>
                            <td style={s.td}><Badge label={tx.action} color="#7c3aed" bg="#f5f3ff" /></td>
                            <td style={{ ...s.td, fontWeight: 700, color: "#4f46e5" }}>+{tx.xp_earned} XP</td>
                            <td style={s.td}><code style={{ ...s.code, fontSize: 11 }}>{(tx as Record<string, unknown>)["reference_id"] ? String((tx as Record<string, unknown>)["reference_id"]).slice(0, 8) + "…" : "—"}</code></td>
                            <td style={s.td}>{tx.reference_type || "—"}</td>
                            <td style={s.td}>{new Date(tx.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── AI LEARNING STUDIO ─── */}
          {canManageOnboarding && activeTab === "modules" && (() => {
            const alsBg2    = alsDark ? "#0a0f1e" : "#f0f4f8";
            const alsCard2  = alsDark ? "#1e293b" : "#ffffff";
            const alsBorder2= alsDark ? "#334155" : "#e2e8f0";
            const alsText2  = alsDark ? "#f1f5f9" : "#0f172a";
            const alsMuted2 = alsDark ? "#94a3b8" : "#64748b";
            const alsInBg   = alsDark ? "#0f172a" : "#ffffff";
            const acc       = "#6366f1";

            const totalL = alsData ? alsData.modules.reduce((s,m)=>s+m.lessons.length,0) : 0;
            const totalQ = alsData ? alsData.modules.reduce((s,m)=>s+(m.quiz?.questions?.length||0),0) : 0;
            const totalA = alsData ? alsData.modules.filter(m=>m.assignment?.title).length : 0;

            const iStyle: React.CSSProperties = {
              width:"100%", padding:"9px 12px", borderRadius:8,
              border:`1.5px solid ${alsBorder2}`, background:alsInBg,
              color:alsText2, fontSize:13, outline:"none", boxSizing:"border-box",
            };
            const lStyle: React.CSSProperties = {
              fontSize:11, fontWeight:700, color:alsMuted2,
              display:"block", marginBottom:5,
              textTransform:"uppercase", letterSpacing:"0.06em",
            };
            const selStyle: React.CSSProperties = {...iStyle, cursor:"pointer"};

            return (
              <div style={{background:alsBg2, borderRadius:18, padding:"0 0 28px", minHeight:"82vh"}}>

                {/* ── Notification banner ── */}
                {alsMsg && (
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 18px",borderRadius:10,margin:"0 0 14px",background:alsMsgType==="success"?"#d1fae5":"#fee2e2",border:`1px solid ${alsMsgType==="success"?"#6ee7b7":"#fca5a5"}`,color:alsMsgType==="success"?"#065f46":"#991b1b",fontSize:13,fontWeight:600}}>
                    <span>{alsMsgType==="success"?"✅":"❌"}</span>
                    <span style={{flex:1}}>{alsMsg}</span>
                    <button onClick={()=>setAlsMsg(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"inherit",lineHeight:1}}>×</button>
                  </div>
                )}

                {/* ── Split layout ── */}
                <div style={{display:"grid",gridTemplateColumns:"clamp(280px,360px,400px) 1fr",gap:18,alignItems:"start"}}>

                  {/* ──────────── LEFT: Input Panel ──────────── */}
                  <div style={{background:alsCard2,borderRadius:16,border:`1.5px solid ${alsBorder2}`,overflow:"hidden",position:"sticky",top:72,boxShadow:`0 4px 20px rgba(0,0,0,${alsDark?"0.4":"0.06"})`}}>

                    {/* Header */}
                    <div style={{background:"linear-gradient(135deg,#1e1b4b 0%,#3730a3 55%,#4f46e5 100%)",padding:"20px 20px 16px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                        <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>✨</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15,fontWeight:800,color:"#fff",letterSpacing:"-0.01em"}}>AI Learning Studio</div>
                          <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:2}}>Generate complete modules in seconds</div>
                        </div>
                        <button onClick={()=>setAlsDark(v=>!v)} title="Toggle theme" style={{background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,color:"#fff",fontSize:14,padding:"4px 9px",cursor:"pointer"}}>{alsDark?"☀️":"🌙"}</button>
                      </div>
                      {alsAiGenerated && alsData && (
                        <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(99,102,241,0.3)",borderRadius:8,padding:"5px 10px",fontSize:11,color:"#c7d2fe",fontWeight:600}}>
                          <span>🤖</span> Generated with AI · {alsData.modules.length} modules · {totalL} lessons
                        </div>
                      )}
                    </div>

                    {/* Input fields */}
                    <div style={{padding:"16px 16px 0",display:"flex",flexDirection:"column",gap:13,overflowY:"auto",maxHeight:"calc(100vh - 340px)"}}>

                      <div>
                        <label style={lStyle}>Topic *</label>
                        <input value={alsTopic} onChange={e=>setAlsTopic(e.target.value)}
                          placeholder="e.g. Customer Service Excellence"
                          style={iStyle} onKeyDown={e=>{ if(e.key==="Enter") void handleAlsGenerate(); }}/>
                      </div>

                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div>
                          <label style={lStyle}>Audience</label>
                          <select value={alsAudience} onChange={e=>setAlsAudience(e.target.value)} style={selStyle}>
                            {["Beginner","Intermediate","Advanced","Expert"].map(v=><option key={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={lStyle}>Duration (weeks)</label>
                          <select value={alsDuration} onChange={e=>setAlsDuration(Number(e.target.value))} style={selStyle}>
                            {[1,2,3,4,6,8,10,12].map(v=><option key={v} value={v}>{v} {v===1?"week":"weeks"}</option>)}
                          </select>
                        </div>
                      </div>

                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div>
                          <label style={lStyle}>No. of Lessons</label>
                          <select value={alsNumLessons} onChange={e=>setAlsNumLessons(Number(e.target.value))} style={selStyle}>
                            {[3,4,5,6,8,10,12,15,20].map(v=><option key={v} value={v}>{v} lessons</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={lStyle}>Language</label>
                          <select value={alsLanguage} onChange={e=>setAlsLanguage(e.target.value)} style={selStyle}>
                            {["English","Spanish","French","German","Arabic","Hindi","Chinese","Portuguese","Japanese"].map(v=><option key={v}>{v}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={lStyle}>Tone / Style</label>
                        <select value={alsTone} onChange={e=>setAlsTone(e.target.value)} style={selStyle}>
                          {["Professional","Conversational","Academic","Engaging","Storytelling","Concise"].map(v=><option key={v}>{v}</option>)}
                        </select>
                      </div>

                      <div>
                        <label style={lStyle}>Learning Goal</label>
                        <textarea value={alsGoal} onChange={e=>setAlsGoal(e.target.value)}
                          placeholder="e.g. Learners will be able to handle customer escalations confidently"
                          rows={2} style={{...iStyle, resize:"vertical"}}/>
                      </div>

                      <div>
                        <label style={lStyle}>Additional Instructions</label>
                        <textarea value={alsPromptExtra} onChange={e=>setAlsPromptExtra(e.target.value)}
                          placeholder="e.g. Include real-world case studies, focus on B2B scenarios"
                          rows={2} style={{...iStyle, resize:"vertical"}}/>
                      </div>

                      {/* Generate button */}
                      <button onClick={()=>void handleAlsGenerate()} disabled={alsGenerating}
                        style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:alsGenerating?"#818cf8":`linear-gradient(135deg,${acc} 0%,#7c3aed 100%)`,color:"#fff",fontSize:14,fontWeight:700,cursor:alsGenerating?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:alsGenerating?"none":"0 4px 14px rgba(99,102,241,0.45)",transition:"all 0.2s",marginBottom:4}}>
                        {alsGenerating
                          ? <><span className="lf-spin" style={{display:"inline-block",width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff"}}/>Generating…</>
                          : <><span>✨</span> Generate Module</>}
                      </button>
                    </div>

                    {/* Rewrite / Translate tools (shown when data exists) */}
                    {alsData && (
                      <div style={{padding:"12px 16px",borderTop:`1px solid ${alsBorder2}`,marginTop:8}}>
                        <div style={{fontSize:11,fontWeight:700,color:alsMuted2,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Content Tools</div>
                        <div style={{display:"flex",gap:8,marginBottom:8}}>
                          <select value={alsRewriteTone} onChange={e=>setAlsRewriteTone(e.target.value)} style={{...selStyle,flex:1,fontSize:12}}>
                            {["Conversational","Professional","Academic","Engaging","Concise","Storytelling"].map(v=><option key={v}>{v}</option>)}
                          </select>
                          <button onClick={()=>void handleAlsRewrite()} disabled={alsRewriting}
                            style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${alsBorder2}`,background:alsDark?"#334155":"#f1f5f9",color:alsText2,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                            {alsRewriting?"…":"🔄 Rewrite"}
                          </button>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <select value={alsTranslateTo} onChange={e=>setAlsTranslateTo(e.target.value)} style={{...selStyle,flex:1,fontSize:12}}>
                            {["Spanish","French","German","Arabic","Hindi","Chinese","Portuguese","Japanese"].map(v=><option key={v}>{v}</option>)}
                          </select>
                          <button onClick={()=>void handleAlsTranslate()} disabled={alsTranslating}
                            style={{padding:"6px 12px",borderRadius:8,border:`1.5px solid ${alsBorder2}`,background:alsDark?"#334155":"#f1f5f9",color:alsText2,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                            {alsTranslating?"…":"🌐 Translate"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Drafts panel */}
                    <div style={{padding:"12px 16px 16px",borderTop:`1px solid ${alsBorder2}`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                        <div style={{fontSize:11,fontWeight:700,color:alsMuted2,textTransform:"uppercase",letterSpacing:"0.06em"}}>Saved Drafts</div>
                        <button onClick={()=>void handleAlsLoadDrafts()} disabled={alsDraftsLoading}
                          style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:`1px solid ${alsBorder2}`,background:"transparent",color:alsMuted2,cursor:"pointer"}}>
                          {alsDraftsLoading?"…":"↻ Refresh"}
                        </button>
                      </div>
                      {alsDrafts.length === 0
                        ? <div style={{fontSize:12,color:alsMuted2,textAlign:"center",padding:"10px 0"}}>No drafts yet. Generate a module and save it.</div>
                        : alsDrafts.map(d=>(
                          <div key={d.draft_id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:`1px solid ${alsBorder2}`,background:alsDraftId===d.draft_id?(alsDark?"#312e81":"#eef2ff"):alsDark?"#0f172a":"#f8fafc",marginBottom:6}}>
                            <div style={{flex:1,overflow:"hidden"}}>
                              <div style={{fontSize:12,fontWeight:600,color:alsText2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.title}</div>
                              <div style={{fontSize:10,color:alsMuted2,marginTop:2}}>{d.updated_at ? new Date(d.updated_at).toLocaleDateString() : ""}</div>
                            </div>
                            <button onClick={()=>void handleAlsLoadDraft(d.draft_id)} style={{fontSize:11,padding:"3px 7px",borderRadius:6,border:`1px solid ${acc}`,background:"transparent",color:acc,cursor:"pointer",fontWeight:600}}>Load</button>
                            <button onClick={()=>void handleAlsDeleteDraft(d.draft_id)} style={{fontSize:11,padding:"3px 7px",borderRadius:6,border:"1px solid #fca5a5",background:"transparent",color:"#dc2626",cursor:"pointer"}}>✕</button>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* ──────────── RIGHT: Output Panel ──────────── */}
                  <div style={{display:"flex",flexDirection:"column",gap:16}}>

                    {!alsData ? (
                      /* Empty state */
                      <div style={{background:alsCard2,borderRadius:16,border:`1.5px solid ${alsBorder2}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 40px",textAlign:"center",minHeight:480}}>
                        <div style={{width:80,height:80,borderRadius:20,background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,marginBottom:20}}>✨</div>
                        <div style={{fontSize:22,fontWeight:800,color:alsText2,marginBottom:12,letterSpacing:"-0.02em"}}>AI Learning Studio</div>
                        <div style={{fontSize:14,color:alsMuted2,maxWidth:400,lineHeight:1.6,marginBottom:28}}>
                          Enter your module parameters in the left panel and click <strong style={{color:acc}}>Generate Module</strong> to create a complete, AI-powered learning programme instantly.
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,maxWidth:480,width:"100%"}}>
                          {[
                            {icon:"📚",title:"Lessons & Content",desc:"AI writes full lesson bodies"},
                            {icon:"🧠",title:"Quizzes & Assessments",desc:"Auto-generated MCQs"},
                            {icon:"📋",title:"Assignments",desc:"Practical task templates"},
                          ].map(f=>(
                            <div key={f.title} style={{background:alsDark?"#0f172a":"#f8fafc",borderRadius:12,padding:"14px 12px",border:`1px solid ${alsBorder2}`}}>
                              <div style={{fontSize:24,marginBottom:6}}>{f.icon}</div>
                              <div style={{fontSize:12,fontWeight:700,color:alsText2,marginBottom:4}}>{f.title}</div>
                              <div style={{fontSize:11,color:alsMuted2}}>{f.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ── Course Header Card ── */}
                        <div style={{borderRadius:16,overflow:"hidden",border:`1.5px solid ${alsBorder2}`,boxShadow:`0 4px 20px rgba(0,0,0,${alsDark?"0.35":"0.06"})`}}>
                          <div style={{background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#1d4ed8 100%)",padding:"24px 24px 20px"}}>
                            {/* Title row */}
                            <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14,flexWrap:"wrap"}}>
                              <div style={{flex:1,minWidth:200}}>
                                <div style={{fontSize:20,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",lineHeight:1.2,marginBottom:6}}>{alsData.title}</div>
                                <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.5}}>{alsData.description}</div>
                              </div>
                              {/* Stats strip */}
                              <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                                {[
                                  {label:"Modules",val:alsData.modules.length,icon:"📦"},
                                  {label:"Lessons",val:totalL,icon:"📖"},
                                  {label:"Questions",val:totalQ,icon:"❓"},
                                  {label:"Assignments",val:totalA,icon:"📝"},
                                ].map(s=>(
                                  <div key={s.label} style={{background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 14px",textAlign:"center",backdropFilter:"blur(6px)",minWidth:68}}>
                                    <div style={{fontSize:16}}>{s.icon}</div>
                                    <div style={{fontSize:16,fontWeight:800,color:"#fff",lineHeight:1}}>{s.val}</div>
                                    <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:2}}>{s.label}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Tags + badges */}
                            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                              <span style={{background:"rgba(99,102,241,0.35)",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#c7d2fe",fontWeight:600}}>📊 {alsData.level}</span>
                              <span style={{background:"rgba(99,102,241,0.35)",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#c7d2fe",fontWeight:600}}>⏱ {alsData.estimated_hours}h</span>
                              <span style={{background:"rgba(99,102,241,0.35)",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#c7d2fe",fontWeight:600}}>🏷 {alsData.category}</span>
                              {alsData.tags.slice(0,4).map(t=>(
                                <span key={t} style={{background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"3px 10px",fontSize:11,color:"rgba(255,255,255,0.7)"}}>{t}</span>
                              ))}
                            </div>
                            {/* Action buttons */}
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              <button onClick={()=>void handleAlsSaveDraft()} disabled={alsSaving}
                                style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:9,border:"1.5px solid rgba(255,255,255,0.35)",background:"rgba(255,255,255,0.12)",color:"#fff",fontSize:13,fontWeight:700,cursor:alsSaving?"not-allowed":"pointer",backdropFilter:"blur(4px)"}}>
                                {alsSaving ? "💾 Saving…" : "💾 Save Draft"}
                              </button>
                              <button onClick={()=>void handleAlsPublish()} disabled={alsPublishing}
                                style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:9,border:"none",background:alsPublishing?"rgba(16,185,129,0.5)":"linear-gradient(135deg,#059669 0%,#10b981 100%)",color:"#fff",fontSize:13,fontWeight:700,cursor:alsPublishing?"not-allowed":"pointer",boxShadow:alsPublishing?"none":"0 3px 12px rgba(16,185,129,0.4)"}}>
                                {alsPublishing ? "⏳ Publishing…" : "🚀 Publish to LMS"}
                              </button>
                              <button onClick={handleAlsExport}
                                style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",borderRadius:9,border:"1.5px solid rgba(255,255,255,0.35)",background:"rgba(255,255,255,0.12)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",backdropFilter:"blur(4px)"}}>
                                📥 Export JSON
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* ── Content Tabs ── */}
                        <div style={{background:alsCard2,borderRadius:16,border:`1.5px solid ${alsBorder2}`,overflow:"hidden",boxShadow:`0 2px 12px rgba(0,0,0,${alsDark?"0.3":"0.04"})`}}>
                          {/* Tab bar */}
                          <div style={{display:"flex",borderBottom:`1px solid ${alsBorder2}`,background:alsCard2,overflowX:"auto"}}>
                            {([
                              {id:"overview",    label:"Overview",     icon:"🗺"},
                              {id:"lessons",     label:`Lessons (${totalL})`, icon:"📖"},
                              {id:"quizzes",     label:`Quizzes (${totalQ})`, icon:"🧠"},
                              {id:"assignments", label:`Assignments (${totalA})`, icon:"📝"},
                            ] as {id:string;label:string;icon:string}[]).map(tab=>(
                              <button key={tab.id} onClick={()=>setAlsOutputTab(tab.id as typeof alsOutputTab)}
                                style={{padding:"13px 16px",fontSize:13,fontWeight:alsOutputTab===tab.id?700:500,color:alsOutputTab===tab.id?acc:alsMuted2,background:"transparent",border:"none",borderBottom:`2.5px solid ${alsOutputTab===tab.id?acc:"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,transition:"color 0.15s"}}>
                                {tab.icon} {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* Tab content */}
                          <div style={{padding:"20px 20px",background:alsBg2,minHeight:320}}>

                            {/* ── OVERVIEW ── */}
                            {alsOutputTab==="overview" && (
                              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                                {/* Objectives */}
                                <div style={{background:alsCard2,borderRadius:12,border:`1px solid ${alsBorder2}`,padding:"16px 18px"}}>
                                  <div style={{fontSize:13,fontWeight:700,color:alsText2,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>🎯 Learning Objectives</div>
                                  <div style={{fontSize:13,color:alsMuted2,lineHeight:1.7,whiteSpace:"pre-line"}}>{alsData.objectives}</div>
                                </div>
                                {/* Module cards */}
                                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                                  {alsData.modules.map((m,mi)=>(
                                    <div key={mi} style={{background:alsCard2,borderRadius:12,border:`1.5px solid ${alsBorder2}`,overflow:"hidden",boxShadow:`0 2px 8px rgba(0,0,0,${alsDark?"0.2":"0.04"})`}}>
                                      <div style={{background:`linear-gradient(135deg,${["#312e81","#1e3a5f","#1f2937","#312e31"][mi%4]} 0%,${[acc,"#0891b2","#374151","#7c3aed"][mi%4]} 100%)`,padding:"14px 16px"}}>
                                        <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:600,marginBottom:4}}>{m.section_title || `Section ${mi+1}`}</div>
                                        <div style={{fontSize:14,fontWeight:700,color:"#fff",lineHeight:1.3}}>{m.title}</div>
                                      </div>
                                      <div style={{padding:"12px 16px"}}>
                                        <div style={{fontSize:12,color:alsMuted2,lineHeight:1.5,marginBottom:10}}>{m.description}</div>
                                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                          <span style={{fontSize:11,color:acc,fontWeight:600,background:alsDark?"#1e1b4b":"#eef2ff",borderRadius:6,padding:"3px 8px"}}>📖 {m.lessons.length} lessons</span>
                                          {m.quiz?.questions?.length>0 && <span style={{fontSize:11,color:"#0891b2",fontWeight:600,background:alsDark?"#0c2f45":"#e0f2fe",borderRadius:6,padding:"3px 8px"}}>❓ {m.quiz.questions.length} Qs</span>}
                                          {m.assignment?.title && <span style={{fontSize:11,color:"#059669",fontWeight:600,background:alsDark?"#0a2d1f":"#d1fae5",borderRadius:6,padding:"3px 8px"}}>📝 Assignment</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ── LESSONS ── */}
                            {alsOutputTab==="lessons" && (
                              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                                {alsData.modules.map((m,mi)=>(
                                  <div key={mi}>
                                    <div style={{fontSize:12,fontWeight:700,color:acc,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>
                                      {m.section_title || `Module ${mi+1}`} — {m.title}
                                    </div>
                                    {m.lessons.map((l,li)=>{
                                      const key = `m${mi}l${li}`;
                                      const isExpanded = alsExpandedLesson===key;
                                      const isEditing = alsEditKey===key;
                                      const isRegen = alsRegenKey===key;
                                      return (
                                        <div key={li} style={{background:alsCard2,borderRadius:12,border:`1.5px solid ${isExpanded?acc:alsBorder2}`,marginBottom:10,overflow:"hidden",transition:"border-color 0.15s"}}>
                                          {/* Lesson header */}
                                          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer"}} onClick={()=>setAlsExpandedLesson(isExpanded?null:key)}>
                                            <div style={{width:28,height:28,borderRadius:8,background:alsDark?"#1e1b4b":"#eef2ff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:acc,flexShrink:0}}>{mi*100+li+1}</div>
                                            <div style={{flex:1}}>
                                              <div style={{fontSize:13,fontWeight:700,color:alsText2}}>{l.title}</div>
                                              <div style={{fontSize:11,color:alsMuted2,marginTop:2}}>{l.summary}</div>
                                            </div>
                                            <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                              <button onClick={e=>{e.stopPropagation();void handleAlsRegenLesson(mi,li);}} disabled={isRegen}
                                                title="Regenerate with AI"
                                                style={{fontSize:11,padding:"4px 9px",borderRadius:6,border:`1px solid ${alsBorder2}`,background:alsDark?"#334155":"#f1f5f9",color:alsMuted2,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                                                <span className={isRegen?"lf-spin":""} style={{display:"inline-block"}}>↻</span> {isRegen?"…":"Regen"}
                                              </button>
                                              <button onClick={e=>{e.stopPropagation();handleAlsEditLesson(mi,li);}}
                                                title="Edit content"
                                                style={{fontSize:11,padding:"4px 9px",borderRadius:6,border:`1px solid ${alsBorder2}`,background:alsDark?"#334155":"#f1f5f9",color:alsMuted2,cursor:"pointer"}}>
                                                ✏️ Edit
                                              </button>
                                              <span style={{fontSize:12,color:alsMuted2}}>{isExpanded?"▲":"▼"}</span>
                                            </div>
                                          </div>
                                          {/* Expanded: content */}
                                          {isExpanded && !isEditing && (
                                            <div style={{padding:"0 16px 14px",borderTop:`1px solid ${alsBorder2}`}}>
                                              <div style={{fontSize:12,color:alsText2,lineHeight:1.7,whiteSpace:"pre-wrap",background:alsDark?"#0f172a":"#f8fafc",borderRadius:8,padding:"12px 14px",marginTop:10,marginBottom:10,fontFamily:"inherit"}}>{l.content_text}</div>
                                              {l.activities?.length>0 && (
                                                <div>
                                                  <div style={{fontSize:11,fontWeight:700,color:alsMuted2,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Activities</div>
                                                  {l.activities.map((act,ai)=>(
                                                    <div key={ai} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:12,color:alsMuted2,marginBottom:4}}>
                                                      <span style={{color:acc,fontWeight:700,flexShrink:0}}>{ai+1}.</span>{act}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {/* Edit mode */}
                                          {isEditing && (
                                            <div style={{padding:"12px 16px 14px",borderTop:`1px solid ${alsBorder2}`}}>
                                              <textarea value={alsEditText} onChange={e=>setAlsEditText(e.target.value)}
                                                rows={10} style={{...iStyle,fontFamily:"monospace",fontSize:12,lineHeight:1.6,resize:"vertical"}}/>
                                              <div style={{display:"flex",gap:8,marginTop:10}}>
                                                <button onClick={()=>handleAlsSaveEdit(mi,li)}
                                                  style={{padding:"8px 16px",borderRadius:8,border:"none",background:acc,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                                                  ✓ Save Changes
                                                </button>
                                                <button onClick={()=>{setAlsEditKey(null);setAlsEditText("");}}
                                                  style={{padding:"8px 16px",borderRadius:8,border:`1.5px solid ${alsBorder2}`,background:"transparent",color:alsMuted2,fontSize:13,cursor:"pointer"}}>
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* ── QUIZZES ── */}
                            {alsOutputTab==="quizzes" && (
                              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                                {alsData.modules.map((m,mi)=>(
                                  m.quiz?.questions?.length>0 && (
                                    <div key={mi} style={{background:alsCard2,borderRadius:12,border:`1.5px solid ${alsBorder2}`,overflow:"hidden"}}>
                                      <div style={{background:"linear-gradient(135deg,#0c2f45 0%,#0891b2 100%)",padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                                        <div>
                                          <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{m.quiz.title}</div>
                                          <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>{m.title} · Passing: {m.quiz.passing_score}%</div>
                                        </div>
                                        <span style={{background:"rgba(255,255,255,0.15)",borderRadius:20,padding:"4px 12px",fontSize:11,color:"#fff",fontWeight:600}}>{m.quiz.questions.length} questions</span>
                                      </div>
                                      <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:12}}>
                                        {m.quiz.questions.map((q,qi)=>(
                                          <div key={qi} style={{background:alsDark?"#0f172a":"#f8fafc",borderRadius:10,padding:"12px 14px",border:`1px solid ${alsBorder2}`}}>
                                            <div style={{fontSize:13,fontWeight:600,color:alsText2,marginBottom:10}}>Q{qi+1}. {q.question}</div>
                                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                                              {(["a","b","c","d"] as const).map((opt,oi)=>(
                                                <div key={opt} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"7px 10px",borderRadius:8,border:`1.5px solid ${oi===q.correct_index?"#10b981":alsBorder2}`,background:oi===q.correct_index?(alsDark?"#0a2d1f":"#d1fae5"):"transparent"}}>
                                                  <span style={{fontWeight:700,fontSize:11,color:oi===q.correct_index?"#059669":alsMuted2,flexShrink:0,textTransform:"uppercase"}}>{opt}.</span>
                                                  <span style={{fontSize:12,color:oi===q.correct_index?"#065f46":alsText2,lineHeight:1.4}}>{q.options[opt]}</span>
                                                </div>
                                              ))}
                                            </div>
                                            {q.explanation && (
                                              <div style={{marginTop:8,fontSize:11,color:alsMuted2,background:alsDark?"#1e293b":"#f1f5f9",borderRadius:6,padding:"7px 10px",borderLeft:`3px solid ${acc}`}}>
                                                💡 {q.explanation}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                ))}
                              </div>
                            )}

                            {/* ── ASSIGNMENTS ── */}
                            {alsOutputTab==="assignments" && (
                              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                                {alsData.modules.filter(m=>m.assignment?.title).map((m,mi)=>(
                                  <div key={mi} style={{background:alsCard2,borderRadius:12,border:`1.5px solid ${alsBorder2}`,overflow:"hidden"}}>
                                    <div style={{background:"linear-gradient(135deg,#0a2d1f 0%,#059669 100%)",padding:"12px 18px"}}>
                                      <div style={{fontSize:13,fontWeight:700,color:"#fff"}}>{m.assignment.title}</div>
                                      <div style={{fontSize:11,color:"rgba(255,255,255,0.6)",marginTop:2}}>{m.title}</div>
                                    </div>
                                    <div style={{padding:"14px 18px",display:"flex",flexDirection:"column",gap:10}}>
                                      <div>
                                        <div style={{fontSize:11,fontWeight:700,color:alsMuted2,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Description</div>
                                        <div style={{fontSize:13,color:alsText2,lineHeight:1.6}}>{m.assignment.description}</div>
                                      </div>
                                      {m.assignment.guidelines && (
                                        <div>
                                          <div style={{fontSize:11,fontWeight:700,color:alsMuted2,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Guidelines</div>
                                          <div style={{fontSize:12,color:alsMuted2,lineHeight:1.7,whiteSpace:"pre-line",background:alsDark?"#0f172a":"#f8fafc",borderRadius:8,padding:"10px 12px",borderLeft:`3px solid #059669`}}>{m.assignment.guidelines}</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {alsData.modules.filter(m=>m.assignment?.title).length===0 && (
                                  <div style={{textAlign:"center",padding:"40px",color:alsMuted2,fontSize:13}}>No assignments in this module.</div>
                                )}
                              </div>
                            )}

                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ─── COURSE MANAGER (MongoDB) ─── */}
          {canManageOnboarding && activeTab === "courses-mongo" && (
            <>
              {mongoCourseMsg && (
                <MsgBox
                  msg={mongoCourseMsg}
                  type={mongoCourseMsg.toLowerCase().includes("error") || mongoCourseMsg.toLowerCase().includes("fail") ? "error" : "success"}
                />
              )}

              {/* Stats Row */}
              {mongoCourseStats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 12, marginBottom: 4 }}>
                  {[
                    { label: "Total Courses", value: mongoCourseStats.total, accent: "#4f46e5" },
                    { label: "Published", value: mongoCourseStats.published, accent: "#059669" },
                    { label: "Draft", value: mongoCourseStats.draft, accent: "#d97706" },
                    { label: "Archived", value: mongoCourseStats.archived, accent: "#6b7280" },
                    { label: "Sales", value: mongoCourseStats.by_category.Sales, accent: "#0891b2" },
                    { label: "Support", value: mongoCourseStats.by_category.Support, accent: "#7c3aed" },
                    { label: "Operations", value: mongoCourseStats.by_category.Operations, accent: "#dc2626" },
                  ].map(({ label, value, accent }) => (
                    <div key={label} style={{ padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${accent}30`, background: `${accent}08`, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: accent }}>{value}</div>
                      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, fontWeight: 600 }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Filter & Action Bar */}
              <Card>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <FieldLabel>Search</FieldLabel>
                    <StyledInput
                      value={mongoCourseFilter.search}
                      onChange={(v) => setMongoCourseFilter((p) => ({ ...p, search: v }))}
                      placeholder="Search title or description…"
                    />
                  </div>
                  <div style={{ flex: "0 1 160px" }}>
                    <FieldLabel>Category</FieldLabel>
                    <StyledSelect value={mongoCourseFilter.category} onChange={(v) => setMongoCourseFilter((p) => ({ ...p, category: v }))}>
                      <option value="">All Categories</option>
                      <option value="Sales">Sales</option>
                      <option value="Support">Support</option>
                      <option value="Operations">Operations</option>
                    </StyledSelect>
                  </div>
                  <div style={{ flex: "0 1 160px" }}>
                    <FieldLabel>Status</FieldLabel>
                    <StyledSelect value={mongoCourseFilter.status} onChange={(v) => setMongoCourseFilter((p) => ({ ...p, status: v }))}>
                      <option value="">All Statuses</option>
                      <option value="Published">Published</option>
                      <option value="Draft">Draft</option>
                      <option value="Archived">Archived</option>
                    </StyledSelect>
                  </div>
                  <PrimaryBtn onClick={() => void handleLoadMongoCourses()}>Search</PrimaryBtn>
                  <SecondaryBtn onClick={openNewCourseModal}>+ Add Course</SecondaryBtn>
                  <GhostBtn onClick={() => void handleSeedCourses()}>Seed Defaults</GhostBtn>
                  <GhostBtn onClick={() => void handleReseedCourses()}>Force Reseed</GhostBtn>
                </div>
              </Card>

              {/* Course Cards Grid */}
              {mongoCourses.length === 0 ? (
                <Card>
                  <div style={s.emptyState}>
                    No courses found. Click &ldquo;Seed Defaults&rdquo; to insert 10 professional courses, or &ldquo;+ Add Course&rdquo; to create one manually.
                  </div>
                </Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
                  {mongoCourses.map((course) => {
                    const catColor: Record<string, string> = { Sales: "#0891b2", Support: "#7c3aed", Operations: "#dc2626" };
                    const statusColor: Record<string, { color: string; bg: string }> = {
                      Published: { color: "#059669", bg: "#d1fae5" },
                      Draft: { color: "#d97706", bg: "#fef3c7" },
                      Archived: { color: "#6b7280", bg: "#f3f4f6" },
                    };
                    const sc = statusColor[course.status] ?? { color: "#6b7280", bg: "#f3f4f6" };
                    return (
                      <div key={course._id} style={{
                        background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0",
                        overflow: "hidden", display: "flex", flexDirection: "column",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "box-shadow 0.15s",
                      }}>
                        {/* Card header accent */}
                        <div style={{ height: 4, background: catColor[course.category] ?? "#4f46e5" }} />
                        <div style={{ padding: "16px 18px", flex: 1 }}>
                          {/* Badges row */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                            <Badge label={course.category} color={catColor[course.category] ?? "#4f46e5"} bg={`${catColor[course.category] ?? "#4f46e5"}15`} />
                            <Badge label={course.status} color={sc.color} bg={sc.bg} />
                            <Badge label={course.level} color="#374151" bg="#f1f5f9" />
                            {course.isNew && <Badge label="New" color="#7c3aed" bg="#f5f3ff" />}
                            {course.isRecommended && <Badge label="⭐ Recommended" color="#d97706" bg="#fef3c7" />}
                          </div>

                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 6, lineHeight: 1.3 }}>{course.title}</div>
                          <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5, marginBottom: 12,
                            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {course.description}
                          </div>

                          {/* Meta row */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginBottom: 12 }}>
                            {[
                              { label: "Instructor", value: course.instructor || "—" },
                              { label: "Duration", value: course.duration || "—" },
                              { label: "Modules", value: `${course.modules?.length ?? 0}` },
                              { label: "Assignments", value: `${course.assignments?.length ?? 0}` },
                              { label: "Quizzes", value: `${course.quizzes?.length ?? 0}` },
                              { label: "Rating", value: course.rating > 0 ? `${course.rating}★` : "—" },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Tags */}
                          {course.tags && course.tags.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                              {course.tags.slice(0, 5).map((tag) => (
                                <span key={tag} style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 20, background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div style={{ padding: "10px 18px 14px", display: "flex", gap: 8, borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                          <button onClick={() => openEditCourseModal(course)} style={{ ...s.primaryBtn, fontSize: 12, padding: "6px 12px" }}>Edit</button>
                          {course.status !== "Published" && (
                            <button onClick={async () => {
                              await mongoPatchCourseApi(course._id!, { status: "Published" });
                              setMongoCourseMsg(`"${course.title}" published.`);
                              void handleLoadMongoCourses();
                            }} style={{ ...s.secondaryBtn, fontSize: 12, padding: "6px 12px", color: "#059669", borderColor: "#bbf7d0" }}>Publish</button>
                          )}
                          {course.status !== "Archived" && (
                            <button onClick={() => void handleArchiveCourse(course._id!, course.title)} style={{ ...s.ghostBtn, fontSize: 12, padding: "6px 12px" }}>Archive</button>
                          )}
                          <button onClick={() => void handleDeleteCourse(course._id!, course.title)} style={{ ...s.ghostBtn, fontSize: 12, padding: "6px 12px", color: "#dc2626" }}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Add/Edit Course Modal ── */}
              {showCourseModal && (
                <div style={{
                  position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
                  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
                }}>
                  <div style={{
                    background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580,
                    maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: 28,
                  }}>
                    {/* Modal header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                          {editingCourse ? "Edit Course" : "Create New Course"}
                        </div>
                        <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                          {editingCourse ? `Editing: ${editingCourse.title}` : "Fill in the details to add a course to MongoDB webx.Course"}
                        </div>
                      </div>
                      <button onClick={() => setShowCourseModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#94a3b8", lineHeight: 1 }}>×</button>
                    </div>

                    <form onSubmit={(e) => void handleSaveCourse(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <FormField label="Course Title *">
                        <StyledInput value={courseForm.title} onChange={(v) => setCourseForm((p) => ({ ...p, title: v }))} placeholder="e.g. Advanced Sales Pitch Mastery" required />
                      </FormField>

                      <FormField label="Description *">
                        <StyledTextarea value={courseForm.description} onChange={(v) => setCourseForm((p) => ({ ...p, description: v }))} placeholder="Comprehensive description of what this course covers…" rows={4} required />
                      </FormField>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <FormField label="Category *">
                          <StyledSelect value={courseForm.category} onChange={(v) => setCourseForm((p) => ({ ...p, category: v }))}>
                            <option value="Sales">Sales</option>
                            <option value="Support">Support</option>
                            <option value="Operations">Operations</option>
                          </StyledSelect>
                        </FormField>
                        <FormField label="Level *">
                          <StyledSelect value={courseForm.level} onChange={(v) => setCourseForm((p) => ({ ...p, level: v }))}>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </StyledSelect>
                        </FormField>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <FormField label="Duration">
                          <StyledInput value={courseForm.duration} onChange={(v) => setCourseForm((p) => ({ ...p, duration: v }))} placeholder="e.g. 10 hours" />
                        </FormField>
                        <FormField label="Instructor">
                          <StyledInput value={courseForm.instructor} onChange={(v) => setCourseForm((p) => ({ ...p, instructor: v }))} placeholder="Instructor name" />
                        </FormField>
                      </div>

                      <FormField label="Status">
                        <StyledSelect value={courseForm.status} onChange={(v) => setCourseForm((p) => ({ ...p, status: v }))}>
                          <option value="Draft">Draft</option>
                          <option value="Published">Published</option>
                          <option value="Archived">Archived</option>
                        </StyledSelect>
                      </FormField>

                      <FormField label="Tags (comma separated)">
                        <StyledInput value={courseForm.tags} onChange={(v) => setCourseForm((p) => ({ ...p, tags: v }))} placeholder="Sales, Beginner, Recommended" />
                      </FormField>

                      <div style={{ display: "flex", gap: 20 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                          <input type="checkbox" checked={courseForm.isRecommended} onChange={(e) => setCourseForm((p) => ({ ...p, isRecommended: e.target.checked }))} />
                          Mark as Recommended
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                          <input type="checkbox" checked={courseForm.isNew} onChange={(e) => setCourseForm((p) => ({ ...p, isNew: e.target.checked }))} />
                          Mark as New
                        </label>
                      </div>

                      {mongoCourseMsg && mongoCourseMsg.toLowerCase().includes("error") && (
                        <MsgBox msg={mongoCourseMsg} type="error" />
                      )}

                      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
                        <SecondaryBtn onClick={() => setShowCourseModal(false)}>Cancel</SecondaryBtn>
                        <PrimaryBtn type="submit">{editingCourse ? "Save Changes" : "Create Course"}</PrimaryBtn>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── ACCESS CONTROL CENTRE ─── */}
          {canManageOnboarding && activeTab === "access-control" && (() => {
            // ── theme ──
            const acBg     = accDark ? "#060d1a" : "#f0f4f8";
            const acCard   = accDark ? "#0f1d2e" : "#ffffff";
            const acCard2  = accDark ? "#162033" : "#f8fafc";
            const acBorder = accDark ? "#1e3048" : "#e2e8f0";
            const acText   = accDark ? "#e2e8f0" : "#0f172a";
            const acMuted  = accDark ? "#7c9abf" : "#64748b";
            const acInBg   = accDark ? "#0f1d2e" : "#ffffff";
            const acAcc    = "#6366f1";

            const iS: React.CSSProperties = { width:"100%", padding:"8px 11px", borderRadius:8, border:`1.5px solid ${acBorder}`, background:acInBg, color:acText, fontSize:13, outline:"none", boxSizing:"border-box" };
            const lS: React.CSSProperties = { fontSize:10, fontWeight:700, color:acMuted, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.07em" };

            const RESOURCES = [
              {id:"courses",label:"Courses",icon:"📚"},
              {id:"users",label:"Users",icon:"👥"},
              {id:"assessments",label:"Assessments",icon:"📋"},
              {id:"knowledge",label:"Knowledge Base",icon:"📖"},
              {id:"ai_studio",label:"AI Studio",icon:"✨"},
              {id:"analytics",label:"Analytics",icon:"📊"},
              {id:"settings",label:"Settings",icon:"⚙️"},
              {id:"billing",label:"Billing",icon:"💳"},
              {id:"integrations",label:"Integrations",icon:"🔗"},
              {id:"adaptive_rules",label:"Adaptive Rules",icon:"🎯"},
              {id:"notifications",label:"Notifications",icon:"🔔"},
              {id:"audit_log",label:"Audit Log",icon:"🔍"},
            ];
            const PERMS = ["view","create","edit","delete","approve"] as const;
            const PERM_COLORS: Record<string,string> = { view:"#0891b2", create:"#059669", edit:"#d97706", delete:"#dc2626", approve:"#7c3aed" };

            const sevColor: Record<string,string> = { critical:"#dc2626", high:"#ea580c", medium:"#d97706", low:"#0891b2" };
            const sevBg: Record<string,string> = { critical:"#fee2e2", high:"#fff7ed", medium:"#fef3c7", low:"#e0f2fe" };

            const filteredRoles = (accData?.roles ?? []).filter(r =>
              !accTopSearch || r.name.toLowerCase().includes(accTopSearch.toLowerCase())
            );

            // Build tree renderer
            function renderTree(nodes: AcTreeNode[], depth = 0): React.ReactNode {
              return nodes
                .filter(n => !accTreeSearch || n.name.toLowerCase().includes(accTreeSearch.toLowerCase()))
                .map(node => {
                  const isSelected = accSelectedRole?.role_id === node.role_id;
                  const isExpanded = accExpanded.has(node.role_id);
                  const hasChildren = node.children.length > 0;
                  const isDragTarget = accDragOver === node.role_id;

                  const fullRole = (accData?.roles ?? []).find(r => r.role_id === node.role_id);

                  return (
                    <div key={node.role_id}>
                      <div
                        draggable={!node.is_locked}
                        onDragStart={()=>setAccDragging(node.role_id)}
                        onDragOver={e=>{e.preventDefault();setAccDragOver(node.role_id);}}
                        onDragLeave={()=>setAccDragOver(null)}
                        onDrop={()=>void accHandleDrop(node.role_id)}
                        onClick={()=>{ if(fullRole) accSelectRole(fullRole); }}
                        style={{
                          display:"flex",alignItems:"center",gap:6,
                          padding:`6px ${8+depth*16}px 6px 8px`,
                          marginBottom:2,borderRadius:9,cursor:"pointer",
                          background:isSelected?(accDark?"rgba(99,102,241,0.2)":"#eef2ff"):isDragTarget?(accDark?"rgba(99,102,241,0.1)":"#f0f4ff"):"transparent",
                          border:`1.5px solid ${isSelected?acAcc:isDragTarget?"#a5b4fc":"transparent"}`,
                          transition:"all 0.15s",
                          marginLeft: depth*8,
                        }}>
                        {/* Drag handle */}
                        <span style={{fontSize:11,color:acMuted,cursor:"grab",opacity:node.is_locked?0.3:1,flexShrink:0}}>⠿</span>
                        {/* Expand toggle */}
                        <span onClick={e=>{e.stopPropagation();setAccExpanded(prev=>{const n=new Set(prev);n.has(node.role_id)?n.delete(node.role_id):n.add(node.role_id);return n;})}}
                          style={{fontSize:10,color:acMuted,width:14,textAlign:"center",flexShrink:0,visibility:hasChildren?"visible":"hidden"}}>
                          {isExpanded?"▾":"▸"}
                        </span>
                        {/* Icon */}
                        <span style={{fontSize:15,flexShrink:0}}>{node.icon}</span>
                        {/* Name */}
                        <span style={{flex:1,fontSize:13,fontWeight:isSelected?700:500,color:isSelected?acAcc:acText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{node.name}</span>
                        {/* User count badge */}
                        <span style={{fontSize:10,fontWeight:700,background:node.is_locked?(accDark?"#1e3048":"#f1f5f9"):node.color+"22",color:node.is_locked?acMuted:node.color,borderRadius:20,padding:"1px 7px",flexShrink:0,border:`1px solid ${node.color}44`}}>
                          {node.is_locked?"🔒":node.user_count}
                        </span>
                        {/* Color dot */}
                        <span style={{width:8,height:8,borderRadius:"50%",background:node.color,flexShrink:0}}/>
                      </div>
                      {isExpanded && hasChildren && (
                        <div>{renderTree(node.children, depth+1)}</div>
                      )}
                    </div>
                  );
                });
            }

            // Toggle permission helper
            function togglePerm(resource: string, perm: string) {
              if (!accLocalPerms || accSelectedRole?.metadata.is_locked) return;
              const next = JSON.parse(JSON.stringify(accLocalPerms)) as AcPermissions;
              next[resource] = next[resource] || { view:false,create:false,edit:false,delete:false,approve:false };
              next[resource][perm as keyof typeof next[string]] = !next[resource][perm as keyof typeof next[string]];
              setAccLocalPerms(next);
            }

            const auditSevColor: Record<string,string> = { critical:"#dc2626",warning:"#d97706",info:acAcc };
            const auditActionIcon: Record<string,string> = { permission_updated:"🔐",role_created:"✨",role_deleted:"🗑️",role_moved:"↕️",role_locked:"🔒",role_updated:"✏️" };

            return (
              <div style={{background:acBg,borderRadius:18,overflow:"hidden",border:`1.5px solid ${acBorder}`,boxShadow:`0 8px 40px rgba(0,0,0,${accDark?"0.5":"0.08"})`,minHeight:"85vh"}}>

                {/* ── TOP BAR ── */}
                <div style={{background:accDark?"linear-gradient(135deg,#060d1a 0%,#0f1d2e 100%)":"linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#1d4ed8 100%)",padding:"14px 20px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  {/* Title */}
                  <div style={{display:"flex",alignItems:"center",gap:10,marginRight:8}}>
                    <div style={{width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19}}>🛡️</div>
                    <div>
                      <div style={{fontSize:15,fontWeight:800,color:"#fff",letterSpacing:"-0.01em"}}>Access Control Centre</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Role hierarchy · Permissions · Security</div>
                    </div>
                  </div>
                  {/* Top search */}
                  <div style={{flex:1,minWidth:160,position:"relative"}}>
                    <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"rgba(255,255,255,0.4)"}}>🔍</span>
                    <input value={accTopSearch} onChange={e=>setAccTopSearch(e.target.value)} placeholder="Search roles…"
                      style={{width:"100%",padding:"7px 10px 7px 28px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:12,outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  {/* Buttons */}
                  <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
                    <button onClick={()=>setAccCreateOpen(v=>!v)}
                      style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#6366f1,#7c3aed)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(99,102,241,0.4)"}}>
                      ＋ Create Role
                    </button>
                    <button onClick={()=>void accHandleExport()}
                      style={{padding:"7px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                      ↓ Export
                    </button>
                    <button onClick={()=>setAccShowAuditPanel(v=>!v)}
                      style={{padding:"7px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.25)",background:accShowAuditPanel?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.08)",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
                      📋 Audit Logs
                    </button>
                    <button onClick={()=>void accLoad()} disabled={accLoading}
                      style={{padding:"7px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:13,cursor:"pointer"}}>
                      <span className={accLoading?"lf-spin":""} style={{display:"inline-block"}}>↻</span>
                    </button>
                    <button onClick={()=>setAccDark(v=>!v)}
                      style={{padding:"6px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:13,cursor:"pointer"}}>
                      {accDark?"☀️":"🌙"}
                    </button>
                    {/* Alert badges */}
                    {(accAlertCounts.critical||0) > 0 && (
                      <span style={{background:"#dc2626",color:"#fff",borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700}}>🚨 {accAlertCounts.critical} Critical</span>
                    )}
                    {(accAlertCounts.high||0) > 0 && (
                      <span style={{background:"#ea580c",color:"#fff",borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700}}>{accAlertCounts.high} High</span>
                    )}
                  </div>
                </div>

                {/* ── Notification ── */}
                {accMsg && (
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 18px",background:accMsgType==="success"?"#d1fae5":"#fee2e2",borderBottom:`1px solid ${accMsgType==="success"?"#6ee7b7":"#fca5a5"}`,color:accMsgType==="success"?"#065f46":"#991b1b",fontSize:12,fontWeight:600}}>
                    <span>{accMsgType==="success"?"✅":"❌"}</span>
                    <span style={{flex:1}}>{accMsg}</span>
                    <button onClick={()=>setAccMsg(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"inherit"}}>×</button>
                  </div>
                )}

                {/* ── Create Role inline form ── */}
                {accCreateOpen && (
                  <div style={{padding:"14px 20px",background:accDark?"#0f1d2e":"#fafbff",borderBottom:`1px solid ${acBorder}`,display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
                    <div style={{flex:"2 1 160px"}}>
                      <label style={lS}>Role Name *</label>
                      <input value={accNewName} onChange={e=>setAccNewName(e.target.value)} placeholder="e.g. Senior Analyst" style={iS}/>
                    </div>
                    <div style={{flex:"3 1 220px"}}>
                      <label style={lS}>Description</label>
                      <input value={accNewDesc} onChange={e=>setAccNewDesc(e.target.value)} placeholder="What can this role do?" style={iS}/>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <label style={lS}>Parent Role</label>
                      <select value={accNewParent} onChange={e=>setAccNewParent(e.target.value)} style={{...iS,cursor:"pointer"}}>
                        <option value="">— None —</option>
                        {(accData?.roles??[]).map(r=><option key={r.role_id} value={r.role_id}>{r.icon} {r.name}</option>)}
                      </select>
                    </div>
                    <div style={{flex:"0 0 auto",display:"flex",gap:6,alignItems:"center"}}>
                      <label style={lS}>Color</label>
                      <input type="color" value={accNewColor} onChange={e=>setAccNewColor(e.target.value)} style={{width:38,height:34,borderRadius:7,border:`1.5px solid ${acBorder}`,cursor:"pointer",background:"transparent"}}/>
                    </div>
                    <div style={{flex:"0 0 auto",display:"flex",gap:6,alignItems:"center"}}>
                      <label style={lS}>Icon</label>
                      <select value={accNewIcon} onChange={e=>setAccNewIcon(e.target.value)} style={{...iS,width:64}}>
                        {["👤","⭐","🎯","🔑","📊","✍️","🏢","🔧","👁️","🛡️","🔐","📋"].map(ic=><option key={ic} value={ic}>{ic}</option>)}
                      </select>
                    </div>
                    <button onClick={()=>void accHandleCreate()} disabled={accCreating||!accNewName.trim()}
                      style={{padding:"8px 18px",borderRadius:8,border:"none",background:acAcc,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",opacity:accCreating||!accNewName.trim()?0.6:1}}>
                      {accCreating?"Creating…":"✓ Create"}
                    </button>
                    <button onClick={()=>setAccCreateOpen(false)} style={{padding:"8px 12px",borderRadius:8,border:`1.5px solid ${acBorder}`,background:"transparent",color:acMuted,fontSize:13,cursor:"pointer"}}>Cancel</button>
                  </div>
                )}

                {/* ── Audit Log full panel ── */}
                {accShowAuditPanel && (
                  <div style={{padding:"16px 20px",background:accDark?"#0a1525":"#f8fafc",borderBottom:`1px solid ${acBorder}`}}>
                    <div style={{fontSize:13,fontWeight:700,color:acText,marginBottom:10}}>📋 Audit Log — Recent Changes</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto"}}>
                      {accAudit.length===0 && <div style={{fontSize:12,color:acMuted,textAlign:"center",padding:20}}>No audit entries yet.</div>}
                      {accAudit.map((e,i)=>(
                        <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 12px",borderRadius:9,background:acCard,border:`1px solid ${acBorder}`}}>
                          <span style={{fontSize:16,flexShrink:0}}>{auditActionIcon[e.action]||"📝"}</span>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                              <span style={{fontSize:12,fontWeight:600,color:acText}}>{e.role_name}</span>
                              <span style={{fontSize:11,color:acMuted}}>— {e.action.replace(/_/g," ")}</span>
                              <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:12,background:e.severity==="critical"?"#fee2e2":e.severity==="warning"?"#fef3c7":"#e0f2fe",color:auditSevColor[e.severity]||acAcc}}>{e.severity}</span>
                            </div>
                            <div style={{fontSize:11,color:acMuted,marginTop:2}}>{e.changed_by} · {new Date(e.timestamp).toLocaleString()}</div>
                            {e.changes.slice(0,2).map((c,ci)=>(
                              <div key={ci} style={{fontSize:10,color:acMuted,marginTop:2}}>
                                <code style={{background:accDark?"#1e3048":"#f1f5f9",padding:"1px 5px",borderRadius:4}}>{c.field}</code>: {JSON.stringify(c.from)} → {JSON.stringify(c.to)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 3-PANEL BODY ── */}
                {accLoading && !accData ? (
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 20px",flexDirection:"column",gap:14}}>
                    <div className="lf-spin" style={{width:36,height:36,borderRadius:"50%",border:`3px solid ${acBorder}`,borderTopColor:acAcc}}/>
                    <div style={{fontSize:13,color:acMuted}}>Loading access control data…</div>
                  </div>
                ) : (
                  <div style={{display:"grid",gridTemplateColumns:"280px 1fr 264px",minHeight:640}}>

                    {/* ──── LEFT PANEL — Role Tree ──── */}
                    <div style={{borderRight:`1px solid ${acBorder}`,background:acCard,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                      {/* Search */}
                      <div style={{padding:"12px 12px 8px",borderBottom:`1px solid ${acBorder}`}}>
                        <div style={{position:"relative"}}>
                          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:12,color:acMuted}}>🔍</span>
                          <input value={accTreeSearch} onChange={e=>setAccTreeSearch(e.target.value)} placeholder="Search roles…"
                            style={{...iS,paddingLeft:28,fontSize:12}}/>
                        </div>
                        <div style={{marginTop:8,display:"flex",gap:6,fontSize:10,color:acMuted,fontWeight:600}}>
                          <span>{accData?.roles.length ?? 0} roles</span>
                          <span>·</span>
                          <span>{accAnalytics?.total_users ?? 0} users</span>
                        </div>
                      </div>
                      {/* Tree */}
                      <div style={{flex:1,overflowY:"auto",padding:"8px 8px"}}>
                        {accData
                          ? renderTree(accData.tree)
                          : <div style={{padding:20,fontSize:12,color:acMuted,textAlign:"center"}}>No roles found.</div>
                        }
                      </div>
                      {/* Legend */}
                      <div style={{padding:"10px 12px",borderTop:`1px solid ${acBorder}`,display:"flex",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontSize:10,color:acMuted,display:"flex",alignItems:"center",gap:4}}>⠿ Drag to move</span>
                        <span style={{fontSize:10,color:acMuted,display:"flex",alignItems:"center",gap:4}}>▸ Expand</span>
                        <span style={{fontSize:10,color:acMuted,display:"flex",alignItems:"center",gap:4}}>🔒 Locked</span>
                      </div>
                    </div>

                    {/* ──── CENTER PANEL ──── */}
                    <div style={{background:acBg,overflowY:"auto",display:"flex",flexDirection:"column"}}>
                      {!accSelectedRole ? (
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,padding:"60px 40px",textAlign:"center",gap:14}}>
                          <div style={{width:64,height:64,borderRadius:16,background:acCard2,border:`1.5px solid ${acBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>🛡️</div>
                          <div style={{fontSize:16,fontWeight:700,color:acText}}>Select a Role</div>
                          <div style={{fontSize:13,color:acMuted,maxWidth:320}}>Click any role in the tree to view and edit its permissions, users, scope, and audit history.</div>
                        </div>
                      ) : (
                        <>
                          {/* Role header */}
                          <div style={{padding:"18px 20px",background:acCard,borderBottom:`1px solid ${acBorder}`}}>
                            <div style={{display:"flex",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
                              <div style={{width:48,height:48,borderRadius:13,background:`${accSelectedRole.color}22`,border:`2px solid ${accSelectedRole.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                                {accSelectedRole.icon}
                              </div>
                              <div style={{flex:1,minWidth:160}}>
                                {accEditRole ? (
                                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                                    <input value={accEditName} onChange={e=>setAccEditName(e.target.value)} style={{...iS,fontSize:15,fontWeight:700}}/>
                                    <input value={accEditDesc} onChange={e=>setAccEditDesc(e.target.value)} style={{...iS,fontSize:12}}/>
                                    <div style={{display:"flex",gap:6}}>
                                      <button onClick={()=>void accSaveRoleMeta()} style={{padding:"6px 14px",borderRadius:7,border:"none",background:acAcc,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
                                      <button onClick={()=>setAccEditRole(false)} style={{padding:"6px 12px",borderRadius:7,border:`1.5px solid ${acBorder}`,background:"transparent",color:acMuted,fontSize:12,cursor:"pointer"}}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{fontSize:17,fontWeight:800,color:acText,letterSpacing:"-0.01em"}}>{accSelectedRole.name}</div>
                                    <div style={{fontSize:12,color:acMuted,marginTop:3,lineHeight:1.5}}>{accSelectedRole.description}</div>
                                  </>
                                )}
                              </div>
                              {/* Badges + actions */}
                              <div style={{display:"flex",gap:6,alignItems:"flex-start",flexWrap:"wrap"}}>
                                <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:`${accSelectedRole.color}22`,color:accSelectedRole.color,border:`1px solid ${accSelectedRole.color}44`}}>
                                  {accSelectedRole.metadata.user_count} users
                                </span>
                                {accSelectedRole.metadata.is_system_role && <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#fef3c7",color:"#d97706",border:"1px solid #fde68a"}}>System</span>}
                                {accSelectedRole.metadata.is_locked && <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#fee2e2",color:"#dc2626",border:"1px solid #fca5a5"}}>🔒 Locked</span>}
                                {accSelectedRole.scope.type !== "global" && <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#e0f2fe",color:"#0891b2",border:"1px solid #bae6fd"}}>{accSelectedRole.scope.type}</span>}
                                {!accSelectedRole.metadata.is_locked && !accEditRole && (
                                  <button onClick={()=>setAccEditRole(true)} style={{fontSize:11,padding:"3px 9px",borderRadius:7,border:`1.5px solid ${acBorder}`,background:"transparent",color:acMuted,cursor:"pointer"}}>✏️ Edit</button>
                                )}
                                {!accSelectedRole.metadata.is_system_role && (
                                  <button onClick={()=>void accHandleDelete(accSelectedRole.role_id,accSelectedRole.name)}
                                    style={{fontSize:11,padding:"3px 9px",borderRadius:7,border:"1.5px solid #fca5a5",background:"transparent",color:"#dc2626",cursor:"pointer"}}>🗑️ Delete</button>
                                )}
                              </div>
                            </div>
                            {/* Tags */}
                            {accSelectedRole.metadata.tags.length>0 && (
                              <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                                {accSelectedRole.metadata.tags.map(tag=>(
                                  <span key={tag} style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:acCard2,color:acMuted,border:`1px solid ${acBorder}`}}>{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Center tabs */}
                          <div style={{display:"flex",borderBottom:`1px solid ${acBorder}`,background:acCard,overflowX:"auto"}}>
                            {([
                              {id:"permissions",label:"Permissions",icon:"🔐"},
                              {id:"users",label:"Users",icon:"👥"},
                              {id:"scope",label:"Scope",icon:"🌐"},
                              {id:"audit",label:"Audit Trail",icon:"📋"},
                            ] as {id:string;label:string;icon:string}[]).map(tab=>(
                              <button key={tab.id} onClick={()=>setAccCenterTab(tab.id as typeof accCenterTab)}
                                style={{padding:"11px 15px",fontSize:12,fontWeight:accCenterTab===tab.id?700:500,color:accCenterTab===tab.id?acAcc:acMuted,background:"transparent",border:"none",borderBottom:`2.5px solid ${accCenterTab===tab.id?acAcc:"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
                                {tab.icon} {tab.label}
                              </button>
                            ))}
                          </div>

                          {/* ── PERMISSIONS TAB ── */}
                          {accCenterTab==="permissions" && (
                            <div style={{padding:"16px 16px",background:acBg,flex:1}}>
                              {accSelectedRole.metadata.is_locked && (
                                <div style={{padding:"10px 14px",borderRadius:9,background:"#fef3c7",border:"1px solid #fde68a",color:"#92400e",fontSize:12,fontWeight:600,marginBottom:12}}>
                                  🔒 This role is locked. Permissions cannot be modified.
                                </div>
                              )}
                              <div style={{overflowX:"auto",borderRadius:12,border:`1.5px solid ${acBorder}`,background:acCard}}>
                                <table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
                                  <thead>
                                    <tr style={{background:accDark?"#162033":"#f8fafc"}}>
                                      <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:acMuted,borderBottom:`1px solid ${acBorder}`,textTransform:"uppercase",letterSpacing:"0.06em",width:160}}>Resource</th>
                                      {PERMS.map(p=>(
                                        <th key={p} style={{padding:"10px 10px",textAlign:"center",fontSize:11,fontWeight:700,color:PERM_COLORS[p],borderBottom:`1px solid ${acBorder}`,textTransform:"capitalize",width:80}}>
                                          {p}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {RESOURCES.map((res,ri)=>{
                                      const isOdd = ri%2===1;
                                      return (
                                        <tr key={res.id} style={{background:isOdd?(accDark?"#0f1d2e":"#fafbff"):acCard}}>
                                          <td style={{padding:"9px 14px",borderBottom:`1px solid ${acBorder}`,display:"flex",alignItems:"center",gap:7}}>
                                            <span style={{fontSize:14}}>{res.icon}</span>
                                            <span style={{fontSize:12,fontWeight:600,color:acText}}>{res.label}</span>
                                          </td>
                                          {PERMS.map(p=>{
                                            const val = accLocalPerms?.[res.id]?.[p] ?? false;
                                            const isLocked = accSelectedRole.metadata.is_locked;
                                            return (
                                              <td key={p} style={{padding:"9px 10px",textAlign:"center",borderBottom:`1px solid ${acBorder}`}}>
                                                <div onClick={()=>togglePerm(res.id,p)}
                                                  title={`${val?"Disable":"Enable"} ${p} on ${res.label}`}
                                                  style={{display:"inline-flex",width:38,height:21,borderRadius:12,background:val?PERM_COLORS[p]:(accDark?"#1e3048":"#e2e8f0"),cursor:isLocked?"not-allowed":"pointer",position:"relative",transition:"background 0.2s",opacity:isLocked?0.5:1,flexShrink:0}}>
                                                  <div style={{width:17,height:17,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:val?19:2,transition:"left 0.18s",boxShadow:"0 1px 3px rgba(0,0,0,0.25)"}}/>
                                                </div>
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              {!accSelectedRole.metadata.is_locked && (
                                <div style={{display:"flex",gap:8,marginTop:14,alignItems:"center"}}>
                                  <button onClick={()=>void accSavePermissions()} disabled={accSavingPerms}
                                    style={{padding:"10px 24px",borderRadius:9,border:"none",background:acAcc,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 10px rgba(99,102,241,0.35)",display:"flex",alignItems:"center",gap:7,opacity:accSavingPerms?0.7:1}}>
                                    {accSavingPerms ? <><span className="lf-spin" style={{display:"inline-block",width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff"}}/>Saving…</> : "💾 Save Permissions"}
                                  </button>
                                  <button onClick={()=>setAccLocalPerms(JSON.parse(JSON.stringify(accSelectedRole.permissions)) as AcPermissions)}
                                    style={{padding:"10px 16px",borderRadius:9,border:`1.5px solid ${acBorder}`,background:"transparent",color:acMuted,fontSize:12,cursor:"pointer"}}>
                                    Reset
                                  </button>
                                  <span style={{fontSize:11,color:acMuted,marginLeft:4}}>Changes are logged in the audit trail.</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── USERS TAB ── */}
                          {accCenterTab==="users" && (
                            <div style={{padding:"16px",background:acBg,flex:1}}>
                              <div style={{background:acCard,borderRadius:12,border:`1.5px solid ${acBorder}`,overflow:"hidden"}}>
                                <div style={{padding:"12px 16px",borderBottom:`1px solid ${acBorder}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                                  <div style={{fontSize:13,fontWeight:700,color:acText}}>Users with this role</div>
                                  <span style={{fontSize:12,fontWeight:700,background:`${accSelectedRole.color}22`,color:accSelectedRole.color,borderRadius:20,padding:"3px 10px",border:`1px solid ${accSelectedRole.color}44`}}>
                                    {accSelectedRole.metadata.user_count} users
                                  </span>
                                </div>
                                {accSelectedRole.metadata.user_count === 0 ? (
                                  <div style={{padding:"40px",textAlign:"center",color:acMuted,fontSize:13}}>No users assigned to this role.</div>
                                ) : (
                                  <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
                                    {Array.from({length:Math.min(accSelectedRole.metadata.user_count,12)},(_,i)=>(
                                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`1px solid ${acBorder}`,background:acCard2}}>
                                        <div style={{width:32,height:32,borderRadius:"50%",background:`${accSelectedRole.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:accSelectedRole.color,flexShrink:0}}>
                                          {String.fromCharCode(65+i)}
                                        </div>
                                        <div>
                                          <div style={{fontSize:12,fontWeight:600,color:acText}}>User {i+1}</div>
                                          <div style={{fontSize:10,color:acMuted}}>user{i+1}@company.com</div>
                                        </div>
                                      </div>
                                    ))}
                                    {accSelectedRole.metadata.user_count > 12 && (
                                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"10px",borderRadius:10,border:`1px dashed ${acBorder}`,color:acMuted,fontSize:12}}>
                                        +{accSelectedRole.metadata.user_count-12} more users
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* ── SCOPE TAB ── */}
                          {accCenterTab==="scope" && (
                            <div style={{padding:"16px",background:acBg,flex:1,display:"flex",flexDirection:"column",gap:12}}>
                              <div style={{background:acCard,borderRadius:12,border:`1.5px solid ${acBorder}`,padding:"16px"}}>
                                <div style={{fontSize:12,fontWeight:700,color:acText,marginBottom:10}}>🌐 Access Scope</div>
                                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                  {["global","tenant","department"].map(s=>(
                                    <div key={s} style={{padding:"10px 16px",borderRadius:10,border:`2px solid ${accSelectedRole.scope.type===s?acAcc:acBorder}`,background:accSelectedRole.scope.type===s?(accDark?"rgba(99,102,241,0.15)":"#eef2ff"):"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:accSelectedRole.scope.type===s?acAcc:acMuted,textTransform:"capitalize"}}>
                                      {s==="global"?"🌐":s==="tenant"?"🏢":"🏗️"} {s}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div style={{background:acCard,borderRadius:12,border:`1.5px solid ${acBorder}`,padding:"16px"}}>
                                <div style={{fontSize:12,fontWeight:700,color:acText,marginBottom:10}}>🔗 Hierarchy Position</div>
                                <div style={{fontSize:12,color:acMuted,lineHeight:1.7}}>
                                  <div><b style={{color:acText}}>Role ID:</b> <code style={{background:acCard2,padding:"2px 6px",borderRadius:5,fontSize:11}}>{accSelectedRole.role_id}</code></div>
                                  <div><b style={{color:acText}}>Parent:</b> {accSelectedRole.parent_id ? <code style={{background:acCard2,padding:"2px 6px",borderRadius:5,fontSize:11}}>{accSelectedRole.parent_id}</code> : "Root role"}</div>
                                  <div><b style={{color:acText}}>Inherited from:</b> {accSelectedRole.scope.inherited_from || "None"}</div>
                                </div>
                              </div>
                              <div style={{background:acCard,borderRadius:12,border:`1.5px solid ${acBorder}`,padding:"16px"}}>
                                <div style={{fontSize:12,fontWeight:700,color:acText,marginBottom:8}}>🕐 Metadata</div>
                                <div style={{fontSize:12,color:acMuted,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                                  {[
                                    ["Created",accSelectedRole.created_at?new Date(accSelectedRole.created_at).toLocaleDateString():"—"],
                                    ["Updated",accSelectedRole.updated_at?new Date(accSelectedRole.updated_at).toLocaleDateString():"—"],
                                    ["System Role",accSelectedRole.metadata.is_system_role?"Yes":"No"],
                                    ["Locked",accSelectedRole.metadata.is_locked?"Yes":"No"],
                                  ].map(([k,v])=>(
                                    <div key={String(k)} style={{background:acCard2,borderRadius:8,padding:"8px 10px"}}>
                                      <div style={{fontSize:10,color:acMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:2}}>{k}</div>
                                      <div style={{fontSize:12,fontWeight:600,color:acText}}>{v}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── AUDIT TAB ── */}
                          {accCenterTab==="audit" && (
                            <div style={{padding:"16px",background:acBg,flex:1}}>
                              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                {accAudit.filter(e=>e.role_id===accSelectedRole.role_id).length===0 && (
                                  <div style={{padding:"40px",textAlign:"center",color:acMuted,fontSize:13,background:acCard,borderRadius:12,border:`1px solid ${acBorder}`}}>No audit entries for this role.</div>
                                )}
                                {accAudit.filter(e=>e.role_id===accSelectedRole.role_id).map((e,i)=>(
                                  <div key={i} style={{background:acCard,borderRadius:10,border:`1px solid ${acBorder}`,padding:"11px 14px"}}>
                                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                                      <span style={{fontSize:15}}>{auditActionIcon[e.action]||"📝"}</span>
                                      <span style={{fontSize:12,fontWeight:700,color:acText}}>{e.action.replace(/_/g," ")}</span>
                                      <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:12,background:e.severity==="critical"?"#fee2e2":e.severity==="warning"?"#fef3c7":"#e0f2fe",color:auditSevColor[e.severity]||acAcc}}>{e.severity}</span>
                                      <span style={{fontSize:10,color:acMuted,marginLeft:"auto"}}>{new Date(e.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div style={{fontSize:11,color:acMuted}}>By: {e.changed_by} · IP: {e.ip}</div>
                                    <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>
                                      {e.changes.map((c,ci)=>(
                                        <div key={ci} style={{fontSize:10,display:"flex",alignItems:"center",gap:6}}>
                                          <code style={{background:acCard2,padding:"1px 5px",borderRadius:4}}>{c.field}</code>
                                          <span style={{color:acMuted}}>{JSON.stringify(c.from)}</span>
                                          <span style={{color:acAcc}}>→</span>
                                          <span style={{color:acText,fontWeight:600}}>{JSON.stringify(c.to)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* ──── RIGHT PANEL ──── */}
                    <div style={{borderLeft:`1px solid ${acBorder}`,background:acCard,overflowY:"auto",display:"flex",flexDirection:"column",gap:0}}>

                      {/* Security Alerts */}
                      <div style={{padding:"14px 14px",borderBottom:`1px solid ${acBorder}`}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:700,color:acText}}>🚨 Security Alerts</div>
                          <div style={{display:"flex",gap:4}}>
                            {(accAlertCounts.critical||0)>0 && <span style={{fontSize:10,fontWeight:700,background:"#dc2626",color:"#fff",borderRadius:12,padding:"1px 7px"}}>{accAlertCounts.critical}</span>}
                            {(accAlertCounts.high||0)>0 && <span style={{fontSize:10,fontWeight:700,background:"#ea580c",color:"#fff",borderRadius:12,padding:"1px 7px"}}>{accAlertCounts.high}</span>}
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:7}}>
                          {accAlerts.filter(a=>!a.resolved).slice(0,4).map(alert=>(
                            <div key={alert.alert_id} style={{background:accDark?"#0a1525":sevBg[alert.severity]||"#f8fafc",borderRadius:9,border:`1px solid ${sevColor[alert.severity]||acBorder}33`,padding:"9px 10px"}}>
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                                <span style={{fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:10,background:sevBg[alert.severity]||"#f8fafc",color:sevColor[alert.severity]||acAcc,border:`1px solid ${sevColor[alert.severity]||acAcc}33`}}>{alert.severity}</span>
                                <button onClick={()=>void accResolveAlert(alert.alert_id)} title="Resolve" style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",fontSize:13,color:acMuted}}>✓</button>
                              </div>
                              <div style={{fontSize:12,fontWeight:600,color:acText,lineHeight:1.3,marginBottom:3}}>{alert.title}</div>
                              <div style={{fontSize:10,color:acMuted,lineHeight:1.4}}>{alert.description}</div>
                            </div>
                          ))}
                          {accAlerts.filter(a=>!a.resolved).length===0 && (
                            <div style={{fontSize:11,color:acMuted,textAlign:"center",padding:"12px 0"}}>✅ No active alerts</div>
                          )}
                        </div>
                      </div>

                      {/* Usage Analytics */}
                      <div style={{padding:"14px 14px",borderBottom:`1px solid ${acBorder}`}}>
                        <div style={{fontSize:12,fontWeight:700,color:acText,marginBottom:10}}>📊 Usage Analytics</div>
                        {accAnalytics && (
                          <>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:10}}>
                              {[
                                {label:"Total Roles",val:accAnalytics.total_roles,clr:"#6366f1"},
                                {label:"Total Users",val:accAnalytics.total_users,clr:"#0891b2"},
                                {label:"Custom Roles",val:accAnalytics.custom_roles,clr:"#059669"},
                                {label:"Changes (30d)",val:accAnalytics.activity_last_30d,clr:"#d97706"},
                              ].map(stat=>(
                                <div key={stat.label} style={{background:acCard2,borderRadius:9,padding:"9px 10px",border:`1px solid ${acBorder}`,textAlign:"center"}}>
                                  <div style={{fontSize:18,fontWeight:800,color:stat.clr}}>{stat.val}</div>
                                  <div style={{fontSize:9,color:acMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginTop:2}}>{stat.label}</div>
                                </div>
                              ))}
                            </div>
                            {/* Role distribution mini bars */}
                            <div style={{display:"flex",flexDirection:"column",gap:5}}>
                              {accAnalytics.role_distribution.slice(0,5).map(d=>(
                                <div key={d.role_id}>
                                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:acMuted,marginBottom:2}}>
                                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{d.role}</span>
                                    <span style={{fontWeight:700,color:acText,flexShrink:0}}>{d.count}</span>
                                  </div>
                                  <div style={{height:5,borderRadius:3,background:acCard2,overflow:"hidden"}}>
                                    <div style={{height:"100%",borderRadius:3,background:d.color,width:`${accAnalytics.total_users>0?Math.round(d.count/accAnalytics.total_users*100):0}%`,transition:"width 0.4s"}}/>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Recent Changes */}
                      <div style={{padding:"14px 14px",borderBottom:`1px solid ${acBorder}`}}>
                        <div style={{fontSize:12,fontWeight:700,color:acText,marginBottom:8}}>🕐 Recent Changes</div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {accAudit.slice(0,5).map((e,i)=>(
                            <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:11}}>
                              <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{auditActionIcon[e.action]||"📝"}</span>
                              <div style={{flex:1}}>
                                <div style={{fontWeight:600,color:acText,lineHeight:1.3}}>{e.role_name}</div>
                                <div style={{color:acMuted,fontSize:10}}>{e.action.replace(/_/g," ")} · {new Date(e.timestamp).toLocaleDateString()}</div>
                              </div>
                              <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,flexShrink:0,background:e.severity==="critical"?"#fee2e2":e.severity==="warning"?"#fef3c7":"#e0f2fe",color:auditSevColor[e.severity]||acAcc}}>{e.severity}</span>
                            </div>
                          ))}
                          {accAudit.length===0 && <div style={{fontSize:11,color:acMuted,textAlign:"center",padding:"8px 0"}}>No recent changes</div>}
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div style={{padding:"14px 14px"}}>
                        <div style={{fontSize:12,fontWeight:700,color:acText,marginBottom:8}}>💡 Recommendations</div>
                        <div style={{display:"flex",flexDirection:"column",gap:7}}>
                          {[
                            {icon:"🔐",tip:"Enable permission inheritance for child roles to reduce management overhead."},
                            {icon:"👥",tip:`${accAnalytics?.most_used_role||"Employee"} is the most used role — review its permissions regularly.`},
                            {icon:"🔒",tip:"Consider locking system roles to prevent accidental changes."},
                            {icon:"📋",tip:"Schedule quarterly access reviews to ensure permissions are up-to-date."},
                          ].map((r,ri)=>(
                            <div key={ri} style={{background:acCard2,borderRadius:9,padding:"9px 10px",border:`1px solid ${acBorder}`,display:"flex",gap:8,alignItems:"flex-start"}}>
                              <span style={{fontSize:14,flexShrink:0}}>{r.icon}</span>
                              <span style={{fontSize:11,color:acMuted,lineHeight:1.5}}>{r.tip}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>{/* end right panel */}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ─── AI COPILOT ─── */}
          {activeTab === "copilot" && (() => {
            const userInitial = me ? me.full_name.charAt(0).toUpperCase() : "U";
            const isAdmin = me?.role === "admin";
            const headerTitle = isAdmin ? "Admin AI Copilot" : "AI Copilot";
            const headerSub = isAdmin
              ? "Powered by real-time course catalog, user analytics & system data. Ask anything about the platform."
              : "Powered by your training progress, course catalog & performance data. Ask anything about your learning.";

            const quickQ = isAdmin
              ? [
                  "What courses are available?",
                  "How many users are in the system?",
                  "What admin tools are available?",
                  "What are recommended actions?",
                  "How do KPI scores work?",
                  "How do simulations work?",
                  "What does the leaderboard track?",
                ]
              : [
                  "What courses are available?",
                  "How am I doing on my training?",
                  "What should I do next?",
                  "How does the leaderboard work?",
                  "How do simulations work?",
                  "What is my KPI score based on?",
                  "What are recommended actions?",
                ];

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 160px)" }}>
                {/* Header */}
                <div style={{ background: "linear-gradient(135deg,#0891b2 0%,#0e7490 100%)", borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={24} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{headerTitle}</div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{headerSub}</div>
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
                    {copilotMessages.map((msg, i) => <CopilotBubble key={i} msg={msg} userInitial={userInitial} />)}
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

                  {/* Quick Questions Row 1 */}
                  <div style={{ padding: "10px 22px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {quickQ.slice(0, 4).map(q => (
                      <button key={q} onClick={() => sendCopilotMessage(q)} style={{ fontSize: 11.5, fontWeight: 600, color: "#0891b2", background: "#e0f2fe", border: "1px solid #bae6fd", padding: "5px 12px", borderRadius: 99, cursor: "pointer", whiteSpace: "nowrap" }}>{q}</button>
                    ))}
                  </div>
                  {/* Quick Questions Row 2 */}
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
                      placeholder={isAdmin ? "Ask about the platform — e.g. 'How many users are in the system?'" : "Ask about your training — e.g. 'What should I do next?'"}
                      style={{ flex: 1, padding: "11px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", fontFamily: "inherit", background: "#fafafa" }}
                    />
                    <button onClick={() => sendCopilotMessage(copilotInput)} disabled={copilotLoading || !copilotInput.trim()} style={{ padding: "11px 20px", borderRadius: 10, background: copilotLoading || !copilotInput.trim() ? "#94a3b8" : "#0891b2", color: "#fff", border: "none", cursor: copilotLoading || !copilotInput.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
                      <Icon d="M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z" size={16} color="#fff" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Profile Panel */}
      {showProfilePanel && me && (
        <ProfilePanel
          me={me}
          profile={userProfile}
          saving={profileSaving}
          msg={profileMsg}
          onClose={() => setShowProfilePanel(false)}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "#f1f5f9",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#0f172a",
  },

  /* Sidebar */
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "#fff",
    borderRight: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    height: "100vh",
    overflow: "hidden",
  },
  sidebarLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "20px 18px 14px",
    borderBottom: "1px solid #f1f5f9",
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 9,
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "0.02em",
  },
  userPill: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 18px",
    margin: "10px 10px 6px",
    background: "#f8fafc",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    color: "white",
    flexShrink: 0,
  },
  userName: { fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 },
  userRole: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },

  nav: { flex: 1, overflowY: "auto", padding: "8px 10px" },
  navSection: { fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 8px 4px", marginTop: 4 },
  navBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 10px",
    marginBottom: 2,
    borderRadius: 8,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 500,
    color: "#475569",
    textAlign: "left",
    position: "relative",
    transition: "background 0.15s, color 0.15s",
  },
  navBtnActive: {
    background: "#eef2ff",
    color: "#4338ca",
    fontWeight: 700,
  },
  navIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.15s",
  },
  navIconActive: { background: "#e0e7ff" },
  navActiveDot: {
    position: "absolute",
    right: 10,
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#4f46e5",
  },

  logoutBtn: {
    margin: "8px 10px 18px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid #fee2e2",
    background: "#fff5f5",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "#ef4444",
  },

  /* Main area */
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },

  topBar: {
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    padding: "14px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  pageTitle: { margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" },
  pageBreadcrumb: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  topBarRight: { display: "flex", alignItems: "center", gap: 8 },
  pollingBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 20,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: 600,
  },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(79,70,229,0.2)",
    borderTopColor: "#4f46e5",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  },

  content: { padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, flex: 1 },

  loadingOverlay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 0",
  },
  loadingSpinner: {
    width: 36,
    height: 36,
    border: "3px solid #e2e8f0",
    borderTopColor: "#4f46e5",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },

  /* Cards */
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: "20px 22px",
    boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottom: "1px solid #f1f5f9",
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a" },
  cardSubtitle: { fontSize: 12, color: "#94a3b8", marginTop: 2 },

  /* Stats */
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 },
  statCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "16px 18px",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: { fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 500 },

  /* Badges */
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: 20,
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: "0.01em",
  },

  /* Msg box */
  msgBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: 500,
    marginTop: 8,
  },

  /* Form elements */
  input: {
    padding: "10px 13px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 9,
    fontSize: 14,
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s, box-shadow 0.15s",
    fontFamily: "inherit",
  },
  inputFocused: {
    borderColor: "#6366f1",
    boxShadow: "0 0 0 3px rgba(99,102,241,0.12)",
  },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: "#374151" },

  /* Buttons */
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    borderRadius: 9,
    border: "none",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
  },
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 9,
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    color: "#374151",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  ghostBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 12px",
    borderRadius: 8,
    border: "1.5px solid #e0e7ff",
    background: "#eef2ff",
    color: "#4f46e5",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  /* Filter chips */
  filterChip: {
    padding: "5px 14px",
    borderRadius: 20,
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    color: "#475569",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterChipActive: {
    borderColor: "#6366f1",
    background: "#eef2ff",
    color: "#4f46e5",
  },

  /* Tables */
  tableWrap: { overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    fontSize: 11.5,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  td: { padding: "11px 14px", borderBottom: "1px solid #f1f5f9", color: "#374151" },
  tr: { transition: "background 0.1s" },
  trGold:   { background: "#fffbeb" },
  trSilver: { background: "#f8fafc" },
  trBronze: { background: "#fff7ed" },
  code: { fontFamily: "monospace", fontSize: 12, background: "#f1f5f9", padding: "2px 6px", borderRadius: 5 },
  rank: { fontSize: 16 },

  /* Empty states */
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: "32px 0",
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
  },

  /* XP tiles */
  xpRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  xpTile: {
    flex: "1 1 80px",
    textAlign: "center",
    padding: "14px 10px",
    borderRadius: 10,
    border: "1.5px solid",
    background: "#fafafa",
  },
  xpValue: { fontSize: 24, fontWeight: 800, lineHeight: 1 },
  xpLabel: { fontSize: 11.5, fontWeight: 600, color: "#64748b", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" },

  /* Courses */
  courseGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 14 },
  courseCard: {
    padding: "14px 16px",
    borderRadius: 10,
    border: "1.5px solid #e2e8f0",
    background: "#fafafa",
    cursor: "pointer",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  courseCardActive: { borderColor: "#6366f1", background: "#eef2ff", boxShadow: "0 0 0 3px rgba(99,102,241,0.1)" },
  courseTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  courseDesc: { fontSize: 12.5, color: "#64748b", marginTop: 4, lineHeight: 1.5 },

  /* Lessons */
  lessonCard: {
    display: "flex",
    gap: 14,
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#fafafa",
  },
  lessonNumber: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
    color: "white",
    fontSize: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  lessonTitle: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  lessonContent: { fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 1.6, whiteSpace: "pre-wrap" },

  /* Questions */
  questionCard: {
    padding: "16px",
    borderRadius: 10,
    border: "1.5px solid #e2e8f0",
    background: "#fafafa",
  },
  questionText: { fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.5 },
  questionNum: { color: "#4f46e5", fontWeight: 800, marginRight: 6 },
  optionLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13.5,
    transition: "border-color 0.1s, background 0.1s",
  },
  optionLabelSelected: { borderColor: "#6366f1", background: "#eef2ff", color: "#4338ca" },

  /* Tutor */
  tutorResult: {
    marginTop: 14,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  },
  tutorRow: {
    display: "flex",
    gap: 12,
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
    alignItems: "flex-start",
  },
  tutorLabel: { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 90, paddingTop: 2 },
  tutorValue: { fontSize: 14, color: "#374151", lineHeight: 1.6, flex: 1 },

  /* Simulation */
  scenarioBox: {
    marginTop: 16,
    padding: "16px",
    borderRadius: 10,
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
  },
  scenarioTitle: { fontSize: 15, fontWeight: 700, color: "#0f172a" },
  scenarioPrompt: { fontSize: 13.5, color: "#475569", marginTop: 8, lineHeight: 1.65, whiteSpace: "pre-wrap" },
  attemptResult: {
    marginTop: 14,
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  attemptScore: { fontSize: 15, fontWeight: 600, color: "#0f172a" },
  attemptFeedback: { fontSize: 13.5, color: "#475569", marginTop: 8, lineHeight: 1.6 },

  /* Recommendations */
  recList: { display: "flex", flexDirection: "column", gap: 10 },
  recItem: {
    display: "flex",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 9,
    border: "1px solid #e2e8f0",
    background: "#fafafa",
    alignItems: "flex-start",
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4f46e5",
    marginTop: 6,
    flexShrink: 0,
  },
  recTitle: { fontSize: 14, fontWeight: 600, color: "#0f172a" },
  recReason: { fontSize: 12.5, color: "#64748b", marginTop: 3, lineHeight: 1.5 },

  /* Tenant */
  tenantDomain: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 9,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },
  tenantLabel: { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  tenantValue: { fontSize: 14, fontWeight: 600, color: "#0f172a" },

  /* Analytics */
  analyticsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 },
  analyticsTile: {
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    textAlign: "center",
  },
  analyticsValue: { fontSize: 22, fontWeight: 800, color: "#0f172a" },
  analyticsLabel: { fontSize: 11.5, color: "#64748b", marginTop: 4, lineHeight: 1.4 },
  weakSkillsTitle: { fontSize: 13, fontWeight: 700, color: "#374151" },
};
