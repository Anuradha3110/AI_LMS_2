"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "@/lib/api";

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  if (role === "employee") return "Employee";
  return role;
}

type DashboardTab = "overview" | "onboarding" | "learning" | "ai" | "knowledge" | "performance" | "integrations" | "modules";

/* ─── SVG Icon helpers ──────────────────────────────────────────── */
function Icon({ d, size = 18, color = "currentColor" }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const NAV_ITEMS: { id: DashboardTab; label: string; iconD: string; adminOnly?: boolean }[] = [
  { id: "overview",      label: "Overview",      iconD: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "learning",      label: "Learning",       iconD: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
  { id: "ai",            label: "AI Coach",       iconD: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" },
  { id: "modules",       label: "Module Builder",  iconD: "M4 6h16M4 10h16M4 14h16M4 18h16", adminOnly: true },
  { id: "onboarding",    label: "Onboarding",     iconD: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", adminOnly: true },
  { id: "knowledge",     label: "Knowledge",      iconD: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z", adminOnly: true },
  { id: "performance",   label: "Performance",    iconD: "M18 20V10M12 20V4M6 20v-6", adminOnly: true },
  { id: "integrations",  label: "Integrations",   iconD: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71", adminOnly: true },
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
  const [me, setMe] = useState<null | { role: string; full_name: string }>(null);
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
  // Learning tab — module-level assignments
  const [moduleAssignments, setModuleAssignments] = useState<AssignmentOut[]>([]);
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
    setMe({ role: meRes.role, full_name: meRes.full_name });

    const [courseRes, recRes, assessmentRes, gamificationRes, leaderboardRes, certRes] = await Promise.all([
      coursesApi(token),
      nextLessonRecommendationsApi(token),
      assessmentsApi(token),
      gamificationMeApi(token),
      gamificationLeaderboardApi(token),
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
        const [lessonRes, assignRes] = await Promise.all([
          lessonsApi(token, mId),
          listModuleAssignmentsApi(token, mId).catch(() => [] as AssignmentOut[]),
        ]);
        setLessons(lessonRes);
        setModuleAssignments(assignRes);
        if (lessonRes.length > 0 && !selectedLessonIdForTutor) setSelectedLessonIdForTutor(lessonRes[0].id);
      } else { setLessons([]); setModuleAssignments([]); }
    } else { setModules([]); setLessons([]); }

    if (assessmentRes.length > 0) {
      const aId = selectedAssessmentId || assessmentRes[0].id;
      setSelectedAssessmentId(aId);
      const questionRes = await assessmentQuestionsApi(token, aId);
      setAssessmentQuestions(questionRes);
    } else { setAssessmentQuestions([]); }

    if (meRes.role === "admin" || meRes.role === "manager") {
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
    } else {
      setBlueprints([]); setWebhooks([]); setKnowledgeStats(null);
      setKnowledgeItems([]); setTenantProfile(null); setTenantAnalytics(null);
    }
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
      const [lessonRes, assignRes] = await Promise.all([
        lessonsApi(accessToken, modRes[0].id),
        listModuleAssignmentsApi(accessToken, modRes[0].id).catch(() => [] as AssignmentOut[]),
      ]);
      setLessons(lessonRes);
      setModuleAssignments(assignRes);
    } else { setSelectedModuleId(""); setLessons([]); setModuleAssignments([]); }
  }

  async function handleModuleChange(moduleId: string) {
    if (!accessToken) return;
    setSelectedModuleId(moduleId);
    const [lessonRes, assignRes] = await Promise.all([
      lessonsApi(accessToken, moduleId),
      listModuleAssignmentsApi(accessToken, moduleId).catch(() => [] as AssignmentOut[]),
    ]);
    setLessons(lessonRes);
    setModuleAssignments(assignRes);
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
        duration_hours: parseInt(mgrCourseDuration) || 0,
        progress_tracking_enabled: mgrCourseTracking, certification_enabled: mgrCourseCert,
        instructor_name: mgrCourseInstructor,
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
    setMgrCourse(course);
    setMgrCourseTitle(course.title); setMgrCourseDesc(course.description);
    setMgrCourseObj(course.objectives); setMgrCourseCat(course.category);
    setMgrCourseThumbnail(course.thumbnail_url);
    setMgrCourseDuration(String(course.duration_hours));
    setMgrCourseTracking(course.progress_tracking_enabled);
    setMgrCourseCert(course.certification_enabled);
    setMgrCourseInstructor(course.instructor_name || "");
    try {
      const mods = await modulesApi(accessToken, course.id);
      setMgrModules(mods);
      if (mods.length > 0) await handleMgrSelectModule(mods[0]);
      const enrs = await listCourseEnrollmentsApi(accessToken, course.id);
      setMgrEnrollments(enrs);
    } catch { /* keep prior state */ }
  }

  /* ─── Role badge color ─── */
  const roleAccent = me?.role === "admin" ? "#7c3aed" : me?.role === "manager" ? "#0891b2" : "#059669";

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div style={s.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
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
          {NAV_ITEMS.filter((item) => !item.adminOnly || canManageOnboarding).map((item) => {
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
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
              {/* Stats */}
              <div style={s.statsGrid}>
                <StatCard label="Courses" value={courses.length} iconD="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" accent="#4f46e5" />
                <StatCard label="Modules" value={modules.length} iconD="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" accent="#0891b2" />
                <StatCard label="Lessons" value={lessons.length} iconD="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" accent="#7c3aed" />
                <StatCard label="Recommendations" value={recommendations.length} iconD="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" accent="#059669" />
                <StatCard label="Knowledge Items" value={knowledgeStats?.total_items ?? 0} iconD="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" accent="#f59e0b" />
                {gamificationProfile && (
                  <StatCard label="XP Points" value={gamificationProfile.xp_points} iconD="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" accent="#ec4899" />
                )}
              </div>

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

              {/* Recommendations */}
              <Card>
                <CardHeader title="Recommended Next Lessons" subtitle="AI-powered learning path" icon="M9 11l3 3L22 4" />
                {recommendations.length === 0 ? (
                  <div style={s.emptyState}>
                    <Icon d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" size={32} color="#cbd5e1" />
                    <div>You are all caught up! No pending lessons right now.</div>
                  </div>
                ) : (
                  <div style={s.recList}>
                    {recommendations.map((item) => (
                      <div key={item.lesson_id} style={s.recItem}>
                        <div style={s.recDot} />
                        <div>
                          <div style={s.recTitle}>{item.title}</div>
                          <div style={s.recReason}>{item.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ─── LEARNING ─── */}
          {(activeTab === "learning" || activeTab === "overview") && activeTab === "learning" && (
            <>
              {/* Courses */}
              <Card>
                <CardHeader title="Courses" subtitle={`${courses.length} available`} icon="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                {courses.length > 0 ? (
                  <>
                    <FormField label="Select Course">
                      <StyledSelect value={selectedCourseId} onChange={(v) => void handleCourseChange(v)}>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </StyledSelect>
                    </FormField>
                    <div style={s.courseGrid}>
                      {courses.map((c) => {
                        const isNew = (Date.now() - new Date(c.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000;
                        const isSelected = c.id === selectedCourseId;
                        const alreadyCertified = myCertificates.some((cert) => cert.course_id === c.id);
                        return (
                          <div key={c.id} style={{ ...s.courseCard, ...(isSelected ? s.courseCardActive : {}), padding: 0, overflow: "hidden" }}>
                            {/* Thumbnail */}
                            {c.thumbnail_url && (
                              <div style={{ position: "relative", height: 130, overflow: "hidden", cursor: "pointer" }} onClick={() => void handleCourseChange(c.id)}>
                                <img src={c.thumbnail_url} alt={c.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                {isNew && <span style={{ position: "absolute", top: 8, right: 8, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: "0.05em" }}>NEW</span>}
                                {c.certification_enabled && <span style={{ position: "absolute", top: 8, left: 8, background: "#7c3aed", color: "#fff", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20 }}>🎓 Certificate</span>}
                              </div>
                            )}
                            <div style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                                {!c.thumbnail_url && isNew && <Badge label="New" color="#ef4444" bg="#fee2e2" />}
                                {c.category && <Badge label={c.category} color="#0891b2" bg="#e0f2fe" />}
                                {!c.thumbnail_url && c.certification_enabled && <Badge label="🎓 Certificate" color="#7c3aed" bg="#f5f3ff" />}
                                <Badge label={c.status === "published" ? "Live" : "Draft"} color={c.status === "published" ? "#059669" : "#d97706"} bg={c.status === "published" ? "#d1fae5" : "#fef3c7"} />
                              </div>
                              <div style={s.courseTitle} onClick={() => void handleCourseChange(c.id)} role="button" tabIndex={0}>{c.title}</div>
                              <div style={{ ...s.courseDesc, WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</div>
                              {c.instructor_name && (
                                <div style={{ fontSize: 12, color: "#4f46e5", marginTop: 4, fontWeight: 500 }}>
                                  👩‍🏫 {c.instructor_name}
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 11, color: "#64748b" }}>
                                {c.duration_hours > 0 && <span>⏱ {c.duration_hours}h</span>}
                                <span>⭐ 0.0</span>
                                <span>👤 0 enrolled</span>
                              </div>
                              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                {c.status === "published" && (
                                  <button onClick={(e) => { e.stopPropagation(); void handleSelfEnroll(c.id); }} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "1px solid #4f46e5", background: "#4f46e5", color: "#fff", cursor: "pointer" }}>
                                    Enroll Now
                                  </button>
                                )}
                                {c.certification_enabled && alreadyCertified && (
                                  <button onClick={(e) => { e.stopPropagation(); setShowCertModal(myCertificates.find((cert) => cert.course_id === c.id) ?? null); }} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "1px solid #7c3aed", background: "#f5f3ff", color: "#7c3aed", cursor: "pointer" }}>
                                    View Certificate
                                  </button>
                                )}
                                {c.certification_enabled && !alreadyCertified && (
                                  <button onClick={(e) => { e.stopPropagation(); void handleClaimCertificate(c.id); }} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "1px solid #059669", background: "#d1fae5", color: "#065f46", cursor: "pointer" }}>
                                    Claim Certificate
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={s.emptyState}>
                    <Icon d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" size={32} color="#cbd5e1" />
                    <div>No courses found for this tenant yet.</div>
                  </div>
                )}
              </Card>

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

              {/* Learning Flow */}
              <Card>
                <CardHeader title="Learning Flow" subtitle="Modules & Lessons" icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
                {modules.length > 0 ? (
                  <FormField label="Select Module">
                    <StyledSelect value={selectedModuleId} onChange={(v) => void handleModuleChange(v)}>
                      {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </StyledSelect>
                  </FormField>
                ) : <div style={s.emptyState}>No modules available for selected course.</div>}
                {lessons.length > 0 && (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    {lessons.map((lesson, idx) => (
                      <div key={lesson.id} style={s.lessonCard}>
                        <div style={s.lessonNumber}>{idx + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={s.lessonTitle}>{lesson.title}</div>
                          <div style={s.lessonContent}>{lesson.content_text}</div>
                          {lesson.video_url && (
                            <div style={{ marginTop: 8 }}>
                              <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>
                                ▶ Watch Video Lecture
                              </a>
                            </div>
                          )}
                          {lesson.reading_materials_json?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#0891b2", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reading Materials</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {lesson.reading_materials_json.map((rm, ri) => (
                                  <a key={ri} href={rm.url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: "#0891b2", textDecoration: "underline" }}>
                                    📄 {rm.label}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          {lesson.downloadable_resources_json?.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Downloadable Resources</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {lesson.downloadable_resources_json.map((dl, di) => (
                                  <a key={di} href={dl.url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: "#059669", textDecoration: "underline" }}>
                                    ⬇ {dl.label}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ marginTop: 10 }}>
                            <SecondaryBtn onClick={() => void handleCompleteLesson(lesson.id)}>
                              Mark Complete
                            </SecondaryBtn>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {learningMessage && <div style={{ marginTop: 10 }}><MsgBox msg={learningMessage} type="success" /></div>}
              </Card>

              {/* Assessment */}
              <Card>
                <CardHeader title="Assessment" subtitle="Test your knowledge" icon="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                {assessments.length > 0 ? (
                  <FormField label="Select Assessment">
                    <StyledSelect value={selectedAssessmentId} onChange={(v) => void handleAssessmentChange(v)}>
                      {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                    </StyledSelect>
                  </FormField>
                ) : <div style={s.emptyState}>No assessments found yet.</div>}
                {assessmentQuestions.length > 0 && (
                  <form onSubmit={handleSubmitAssessment} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                    {assessmentQuestions.map((q, qi) => (
                      <div key={q.id} style={s.questionCard}>
                        <div style={s.questionText}><span style={s.questionNum}>Q{qi + 1}.</span> {q.question_text}</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                          {Object.entries(q.options_json).map(([key, label], index) => {
                            const selected = assessmentAnswers[q.id] === index;
                            return (
                              <label key={key} style={{ ...s.optionLabel, ...(selected ? s.optionLabelSelected : {}) }}>
                                <input type="radio" name={`question-${q.id}`}
                                  checked={selected}
                                  onChange={() => setAssessmentAnswers((prev) => ({ ...prev, [q.id]: index }))}
                                  style={{ accentColor: "#4f46e5" }}
                                />
                                {label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div><PrimaryBtn type="submit">Submit Assessment</PrimaryBtn></div>
                  </form>
                )}
                {assessmentMessage && <div style={{ marginTop: 10 }}><MsgBox msg={assessmentMessage} type="info" /></div>}
              </Card>

              {/* Assignments for selected module */}
              <Card>
                <CardHeader title="Module Assignments & Case Studies" subtitle="Practical tasks for each module" icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 0 2-2h2a2 2 0 0 1 2 2" />
                {modules.length > 0 ? (
                  <div>
                    {selectedModuleId && (() => {
                      const selectedModule = modules.find((m) => m.id === selectedModuleId);
                      return selectedModule ? (
                        <div>
                          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
                            Assignments for: <b style={{ color: "#374151" }}>{selectedModule.title}</b>
                          </div>
                          {moduleAssignments.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                              {moduleAssignments.map((asgn) => (
                                <div key={asgn.id} style={{ padding: "16px 18px", borderRadius: 10, background: "#fffbeb", border: "1.5px solid #fde68a" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: 18 }}>📋</span>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: "#92400e" }}>{asgn.title}</div>
                                    {asgn.deadline && <Badge label={`Due: ${new Date(asgn.deadline).toLocaleDateString()}`} color="#d97706" bg="#fef3c7" />}
                                  </div>
                                  {asgn.description && (
                                    <div style={{ fontSize: 13, color: "#78350f", marginBottom: 8, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                      {asgn.description}
                                    </div>
                                  )}
                                  {asgn.guidelines && (
                                    <div style={{ marginTop: 8, padding: "10px 12px", background: "#fef9c3", borderRadius: 8, border: "1px solid #fde047" }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: "#854d0e", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Submission Guidelines</div>
                                      <div style={{ fontSize: 12, color: "#713f12", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{asgn.guidelines}</div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ padding: "12px 14px", borderRadius: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 13, color: "#166534" }}>
                              No assignments for this module yet.
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : <div style={s.emptyState}>No modules available yet.</div>}
              </Card>
            </>
          )}

          {/* ─── AI COACH ─── */}
          {activeTab === "ai" && (
            <>
              {/* Tutor */}
              <Card>
                <CardHeader title="AI Tutor Feedback" subtitle="Get personalised lesson feedback" icon="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" />
                {lessons.length > 0 ? (
                  <form onSubmit={handleTutorFeedback} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <FormField label="Select Lesson">
                      <StyledSelect value={selectedLessonIdForTutor} onChange={setSelectedLessonIdForTutor}>
                        {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                      </StyledSelect>
                    </FormField>
                    <FormField label="Your Answer">
                      <StyledTextarea value={learnerAnswer} onChange={setLearnerAnswer}
                        placeholder="Write your answer for the selected lesson…" rows={5} required />
                    </FormField>
                    <div><PrimaryBtn type="submit" disabled={isPollingJob}>
                      {isPollingJob ? <><span style={s.spinner} /> Waiting for AI…</> : "Get Tutor Feedback"}
                    </PrimaryBtn></div>
                  </form>
                ) : <div style={s.emptyState}>Choose a module with lessons to use tutor feedback.</div>}
                {tutorMessage && <div style={{ marginTop: 10 }}><MsgBox msg={tutorMessage} type="info" /></div>}
                {tutorResult && (
                  <div style={s.tutorResult}>
                    <div style={s.tutorRow}><span style={s.tutorLabel}>Feedback</span><span style={s.tutorValue}>{tutorResult.feedback}</span></div>
                    <div style={s.tutorRow}><span style={s.tutorLabel}>Follow-up</span><span style={s.tutorValue}>{tutorResult.follow_up_question}</span></div>
                    <div style={s.tutorRow}>
                      <span style={s.tutorLabel}>Confidence</span>
                      <span style={{ ...s.tutorValue, fontWeight: 700, color: tutorResult.confidence_score >= 0.7 ? "#059669" : "#f59e0b" }}>
                        {(tutorResult.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Simulation */}
              <Card>
                <CardHeader title="AI Simulation" subtitle="Role-play scenario evaluation" icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />
                <form onSubmit={handleStartSimulation} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FormField label="Team">
                      <StyledInput value={simulationTeam} onChange={setSimulationTeam} placeholder="e.g. Sales" />
                    </FormField>
                    <FormField label="Focus Topic">
                      <StyledInput value={simulationFocus} onChange={setSimulationFocus} placeholder="e.g. objection_handling" />
                    </FormField>
                  </div>
                  <div><PrimaryBtn type="submit" disabled={isPollingJob}>Start Simulation</PrimaryBtn></div>
                </form>

                {simulationScenario && (
                  <div style={s.scenarioBox}>
                    <div style={s.scenarioTitle}>{simulationScenario.title}</div>
                    <div style={s.scenarioPrompt}>{simulationScenario.prompt_text}</div>
                    <form onSubmit={handleSubmitSimulation} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                      <FormField label="Your Response">
                        <StyledTextarea value={simulationResponse} onChange={setSimulationResponse}
                          placeholder="Write your simulation response…" rows={5} required />
                      </FormField>
                      <div><PrimaryBtn type="submit" disabled={isPollingJob}>
                        {isPollingJob ? <><span style={s.spinner} /> Evaluating…</> : "Submit for AI Evaluation"}
                      </PrimaryBtn></div>
                    </form>
                  </div>
                )}

                {simulationMessage && <div style={{ marginTop: 10 }}><MsgBox msg={simulationMessage} type="info" /></div>}
                {simulationAttempt && (
                  <div style={s.attemptResult}>
                    <div style={s.attemptScore}>
                      Score: <span style={{ color: simulationAttempt.score >= 70 ? "#059669" : "#f59e0b", fontWeight: 800 }}>{simulationAttempt.score}</span>
                    </div>
                    <div style={s.attemptFeedback}>{simulationAttempt.feedback_text}</div>
                  </div>
                )}
              </Card>
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

          {/* ─── KNOWLEDGE ─── */}
          {canManageOnboarding && activeTab === "knowledge" && (
            <>
              {knowledgeStats && (
                <div style={s.statsGrid}>
                  <StatCard label="Total Items" value={knowledgeStats.total_items} iconD="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" accent="#4f46e5" />
                  {Object.entries(knowledgeStats.by_tab).slice(0, 4).map(([tabName, count], i) => {
                    const colors = ["#0891b2", "#7c3aed", "#059669", "#f59e0b"];
                    return <StatCard key={tabName} label={tabName} value={count} iconD="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" accent={colors[i % colors.length]} />;
                  })}
                </div>
              )}

              <Card>
                <CardHeader title="Knowledge Base" subtitle="Tenant knowledge items" icon="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                {knowledgeStats && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    <GhostBtn onClick={() => setKnowledgeTabFilter("")}>All</GhostBtn>
                    {Object.keys(knowledgeStats.by_tab).map((tabName) => (
                      <button key={tabName}
                        onClick={() => setKnowledgeTabFilter(tabName)}
                        style={{ ...s.filterChip, ...(knowledgeTabFilter === tabName ? s.filterChipActive : {}) }}>
                        {tabName}
                      </button>
                    ))}
                  </div>
                )}
                {knowledgeItems.length > 0 ? (
                  <div style={s.tableWrap}>
                    <table style={s.table}>
                      <thead>
                        <tr>{["Tab", "Title", "Team", "Category"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {knowledgeItems.slice(0, 8).map((item) => (
                          <tr key={item.id} style={s.tr}>
                            <td style={s.td}><Badge label={item.source_tab} color="#0891b2" bg="#e0f2fe" /></td>
                            <td style={s.td}>{item.title}</td>
                            <td style={s.td}>{item.team_hint || "—"}</td>
                            <td style={s.td}>{item.category || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <div style={s.emptyState}>Sync data to view knowledge items.</div>}
              </Card>

              {tenantProfile && (
                <Card>
                  <CardHeader title="Tenant Configuration" subtitle={tenantProfile.business_domain} icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <div style={s.tenantDomain}>
                    <span style={s.tenantLabel}>Business Domain</span>
                    <span style={s.tenantValue}>{tenantProfile.business_domain}</span>
                  </div>
                  {me?.role === "admin" && (
                    <div style={{ marginTop: 14 }}>
                      <PrimaryBtn onClick={() => void handleSaveTenantProfile()}>Save Configuration</PrimaryBtn>
                    </div>
                  )}
                  {knowledgeMessage && <div style={{ marginTop: 10 }}><MsgBox msg={knowledgeMessage} type="success" /></div>}
                </Card>
              )}

              {tenantAnalytics && (
                <Card>
                  <CardHeader title="Adaptive Analytics" subtitle="Tenant-wide insights" icon="M18 20V10M12 20V4M6 20v-6" />
                  <div style={s.analyticsGrid}>
                    {[
                      { label: "Users", value: tenantAnalytics.users_count },
                      { label: "Lesson Completions", value: tenantAnalytics.lesson_completions },
                      { label: "Assessments Submitted", value: tenantAnalytics.assessments_submitted },
                      { label: "Avg Assessment Score", value: tenantAnalytics.avg_assessment_score.toFixed(1) },
                      { label: "Simulations Completed", value: tenantAnalytics.simulations_completed },
                      { label: "Avg Simulation Score", value: tenantAnalytics.avg_simulation_score.toFixed(1) },
                    ].map((item) => (
                      <div key={item.label} style={s.analyticsTile}>
                        <div style={s.analyticsValue}>{item.value}</div>
                        <div style={s.analyticsLabel}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                  {tenantAnalytics.weak_skills.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={s.weakSkillsTitle}>Weak Skills</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {tenantAnalytics.weak_skills.map((w) => (
                          <Badge key={`${w.user_id}-${w.skill_name}`} label={`${w.skill_name}: ${w.score}`} color="#dc2626" bg="#fee2e2" />
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {/* ─── PERFORMANCE ─── */}
          {activeTab === "performance" && (
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

          {/* ─── MODULE BUILDER ─── */}
          {canManageOnboarding && activeTab === "modules" && (
            <>
              {mgrMessage && <MsgBox msg={mgrMessage} type={mgrMessage.toLowerCase().includes("fail") || mgrMessage.toLowerCase().includes("error") ? "error" : "success"} />}

              {/* ── Module Builder Header ── */}
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 4 }}>
                {/* Title bar */}
                <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon d="M4 6h16M4 10h16M4 14h16M4 18h16" size={18} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Module Builder</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {mgrCourse ? <>Working on: <b style={{ color: "#4f46e5" }}>{mgrCourse.title}</b> <Badge label={mgrCourse.status} color={mgrCourse.status === "published" ? "#059669" : "#d97706"} bg={mgrCourse.status === "published" ? "#d1fae5" : "#fef3c7"} /></> : "Create or pick a course to get started"}
                      </div>
                    </div>
                  </div>
                  {/* Primary tabs: Course | Modules | Lessons | Quiz | Assignments */}
                  <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
                    {([
                      ["course",      "Course",      "M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"],
                      ["modules",     "Modules",     "M4 6h16M4 10h16M4 14h16M4 18h16"],
                      ["lessons",     "Lessons",     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6"],
                      ["quiz",        "Quiz",        "M9 11l3 3L22 4"],
                      ["assignments", "Assignments", "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"],
                    ] as [MgrStep, string, string][]).map(([step, label, iconD]) => {
                      const active = mgrStep === step;
                      return (
                        <button key={step} onClick={() => setMgrStep(step)} style={{
                          display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
                          border: "none", borderBottom: active ? "2px solid #4f46e5" : "2px solid transparent",
                          background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
                          color: active ? "#4f46e5" : "#64748b", whiteSpace: "nowrap",
                          marginBottom: -1,
                        }}>
                          <Icon d={iconD} size={14} color={active ? "#4f46e5" : "#94a3b8"} />
                          {label}
                        </button>
                      );
                    })}
                    {/* Secondary tabs */}
                    <div style={{ flex: 1 }} />
                    {([
                      ["users",    "Users"],
                      ["settings", "Settings"],
                      ["preview",  "Preview"],
                      ["publish",  "Publish"],
                      ["feedback", "Feedback"],
                    ] as [MgrStep, string][]).map(([step, label]) => {
                      const active = mgrStep === step;
                      return (
                        <button key={step} onClick={() => setMgrStep(step)} style={{
                          padding: "10px 12px", border: "none",
                          borderBottom: active ? "2px solid #4f46e5" : "2px solid transparent",
                          background: "transparent", cursor: "pointer", fontSize: 12,
                          fontWeight: active ? 700 : 500,
                          color: active ? "#4f46e5" : "#94a3b8", whiteSpace: "nowrap",
                          marginBottom: -1,
                        }}>{label}</button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── STEP 1: Course ── */}
              {mgrStep === "course" && (
                <>
                  {/* Pick an Existing Course */}
                  {courses.length > 0 && (
                    <Card>
                      <CardHeader title="Pick an Existing Course" subtitle="Click to load a course into the builder" icon="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                        {courses.map((c) => {
                          const selected = mgrCourse?.id === c.id;
                          return (
                            <button key={c.id} onClick={() => { void handleMgrSelectCourse(c); }} style={{
                              display: "flex", flexDirection: "column", alignItems: "flex-start",
                              padding: "12px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                              border: `2px solid ${selected ? "#4f46e5" : "#e2e8f0"}`,
                              background: selected ? "#eef2ff" : "#f8fafc",
                              minWidth: 180, transition: "border-color 0.15s, background 0.15s",
                            }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: selected ? "#3730a3" : "#374151", marginBottom: 4 }}>{c.title}</div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <Badge label={c.status} color={c.status === "published" ? "#059669" : "#d97706"} bg={c.status === "published" ? "#d1fae5" : "#fef3c7"} />
                                {c.category && <Badge label={c.category} color="#0891b2" bg="#e0f2fe" />}
                              </div>
                              {selected && <div style={{ marginTop: 6, fontSize: 11, color: "#4f46e5", fontWeight: 600 }}>Currently editing</div>}
                            </button>
                          );
                        })}
                      </div>
                      {mgrCourse && (
                        <div style={{ marginTop: 14 }}>
                          <SecondaryBtn onClick={() => setMgrStep("modules")}>Continue to Modules &rarr;</SecondaryBtn>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Create / Edit Course */}
                  <Card>
                    <CardHeader
                      title={mgrCourse ? `Edit Course — ${mgrCourse.title}` : "Create New Course"}
                      subtitle="Fill in the course details below"
                      icon="M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                    />
                    <form onSubmit={(e) => { void handleMgrCreateCourse(e); }} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
                      <FormField label="Course Title *">
                        <StyledInput value={mgrCourseTitle} onChange={setMgrCourseTitle} placeholder="e.g. Onboarding for Sales Team" required />
                      </FormField>
                      <FormField label="Description">
                        <StyledTextarea value={mgrCourseDesc} onChange={setMgrCourseDesc} placeholder="This course covers onboarding process for sales team members" rows={3} />
                      </FormField>
                      <FormField label="Learning Objectives">
                        <StyledTextarea value={mgrCourseObj} onChange={setMgrCourseObj} placeholder="By the end of this course, learners will be able to..." rows={3} />
                      </FormField>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <FormField label="Category">
                          <StyledSelect value={mgrCourseCat} onChange={setMgrCourseCat}>
                            <option value="">Select category…</option>
                            <option value="HR & Compliance">HR & Compliance</option>
                            <option value="Sales">Sales</option>
                            <option value="Leadership & Management">Leadership & Management</option>
                            <option value="Finance & Accounting">Finance & Accounting</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Customer Service">Customer Service</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Operations">Operations</option>
                            <option value="Health & Safety">Health & Safety</option>
                            <option value="Data & Analytics">Data & Analytics</option>
                            <option value="General">General</option>
                          </StyledSelect>
                        </FormField>
                        <FormField label="Duration (hours)">
                          <StyledInput value={mgrCourseDuration} onChange={setMgrCourseDuration} type="number" placeholder="0" />
                        </FormField>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <FormField label="Instructor Name">
                          <StyledInput value={mgrCourseInstructor} onChange={setMgrCourseInstructor} placeholder="e.g. Anuradha Biswas" />
                        </FormField>
                        <FormField label="Thumbnail / Cover Image URL">
                          <StyledInput value={mgrCourseThumbnail} onChange={setMgrCourseThumbnail} placeholder="https://..." />
                        </FormField>
                      </div>
                      <div style={{ display: "flex", gap: 20 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                          <input type="checkbox" checked={mgrCourseTracking} onChange={(e) => setMgrCourseTracking(e.target.checked)} />
                          Enable Progress Tracking
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                          <input type="checkbox" checked={mgrCourseCert} onChange={(e) => setMgrCourseCert(e.target.checked)} />
                          Enable Certification
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <PrimaryBtn type="submit">{mgrCourse ? "Save Changes" : "Create Course"} &rarr;</PrimaryBtn>
                        {mgrCourse && <SecondaryBtn onClick={() => setMgrStep("modules")}>Skip to Modules &rarr;</SecondaryBtn>}
                      </div>
                    </form>
                  </Card>
                </>
              )}

              {/* STEP 2: Modules */}
              {mgrStep === "modules" && (
                <Card>
                  <CardHeader title="Structure the Module" subtitle={`Course: ${mgrCourse?.title ?? "none selected"}`} icon="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  {!mgrCourse && <MsgBox msg="Please create or select a course first." type="info" />}
                  {mgrCourse && (
                    <>
                      <form onSubmit={(e) => { void handleMgrAddModule(e); }} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <FormField label="Module Title *">
                            <StyledInput value={mgrModTitle} onChange={setMgrModTitle} placeholder="e.g. Chapter 1: Introduction" required />
                          </FormField>
                          <FormField label="Section Label">
                            <StyledInput value={mgrModSection} onChange={setMgrModSection} placeholder="e.g. Introduction, Part 1" />
                          </FormField>
                        </div>
                        <FormField label="Module Description">
                          <StyledTextarea value={mgrModDesc} onChange={setMgrModDesc} placeholder="What this module covers..." rows={2} />
                        </FormField>
                        <FormField label="Order (sequence position)">
                          <StyledInput value={mgrModOrder} onChange={setMgrModOrder} type="number" placeholder="0" />
                        </FormField>
                        <PrimaryBtn type="submit">Add Module</PrimaryBtn>
                      </form>
                      {mgrModules.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 8 }}>Modules ({mgrModules.length})</div>
                          {mgrModules.map((mod, i) => (
                            <div key={mod.id} onClick={() => { void handleMgrSelectModule(mod); }} style={{
                              padding: "10px 14px", borderRadius: 8, marginBottom: 6, cursor: "pointer",
                              border: `2px solid ${mgrSelModule?.id === mod.id ? "#4f46e5" : "#e2e8f0"}`,
                              background: mgrSelModule?.id === mod.id ? "#eef2ff" : "#fff",
                            }}>
                              <span style={{ fontWeight: 700, color: "#374151" }}>{i + 1}. {mod.title}</span>
                              {mod.section_title && <Badge label={mod.section_title} color="#0891b2" bg="#e0f2fe" />}
                              {mod.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{mod.description}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}>
                        <SecondaryBtn onClick={() => setMgrStep("lessons")}>Next: Add Lessons &rarr;</SecondaryBtn>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {/* STEP 3: Lessons / Content Upload */}
              {mgrStep === "lessons" && (
                <Card>
                  <CardHeader title="Content Upload — Lessons" subtitle={`Module: ${mgrSelModule?.title ?? "none selected"}`} icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
                  {!mgrSelModule && (
                    <>
                      <MsgBox msg="Select a module from step 2 first." type="info" />
                      {mgrModules.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                          {mgrModules.map((mod) => (
                            <button key={mod.id} onClick={() => { void handleMgrSelectModule(mod); }} style={{
                              padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 13,
                            }}>{mod.title}</button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {mgrSelModule && (
                    <>
                      <form onSubmit={(e) => { void handleMgrAddLesson(e); }} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                        <FormField label="Lesson Title *">
                          <StyledInput value={mgrLessonTitle} onChange={setMgrLessonTitle} placeholder="e.g. Welcome & Overview" required />
                        </FormField>
                        <FormField label="Lesson Content / Text">
                          <StyledTextarea value={mgrLessonContent} onChange={setMgrLessonContent} placeholder="Lesson body text..." rows={4} />
                        </FormField>
                        <FormField label="Video Lecture URL">
                          <StyledInput value={mgrLessonVideo} onChange={setMgrLessonVideo} placeholder="https://youtube.com/... or CDN URL" />
                        </FormField>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <FormField label="Reading Material URL (PDF/DOC/Link)">
                            <StyledInput value={mgrLessonReading} onChange={setMgrLessonReading} placeholder="https://..." />
                          </FormField>
                          <FormField label="Downloadable Resource URL">
                            <StyledInput value={mgrLessonDownload} onChange={setMgrLessonDownload} placeholder="https://..." />
                          </FormField>
                        </div>
                        <FormField label="Subtitle / Transcript URL">
                          <StyledInput value={mgrLessonSubtitle} onChange={setMgrLessonSubtitle} placeholder="https://... (.srt / .vtt)" />
                        </FormField>
                        <FormField label="Sequence Order">
                          <StyledInput value={mgrLessonOrder} onChange={setMgrLessonOrder} type="number" placeholder="0" />
                        </FormField>
                        <PrimaryBtn type="submit">Add Lesson</PrimaryBtn>
                      </form>
                      {mgrLessons.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 8 }}>Lessons ({mgrLessons.length})</div>
                          {mgrLessons.map((l, i) => (
                            <div key={l.id} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, marginBottom: 6, border: "1px solid #e2e8f0" }}>
                              <span style={{ fontWeight: 700, color: "#374151" }}>{i + 1}. {l.title}</span>
                              <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                                {l.video_url && <Badge label="Video" color="#7c3aed" bg="#f5f3ff" />}
                                {l.reading_materials_json?.length > 0 && <Badge label="Reading" color="#0891b2" bg="#e0f2fe" />}
                                {l.downloadable_resources_json?.length > 0 && <Badge label="Download" color="#059669" bg="#d1fae5" />}
                                {l.subtitle_url && <Badge label="Subtitle" color="#d97706" bg="#fef3c7" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}>
                        <SecondaryBtn onClick={() => setMgrStep("quiz")}>Next: Quiz Setup &rarr;</SecondaryBtn>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {/* STEP 4: Quiz / Assessment */}
              {mgrStep === "quiz" && (
                <Card>
                  <CardHeader title="Quiz / Assessment Setup" subtitle={`Module: ${mgrSelModule?.title ?? "none selected"}`} icon="M9 11l3 3L22 4" />
                  {!mgrSelModule && <MsgBox msg="Select a module first." type="info" />}
                  {mgrSelModule && (
                    <>
                      <form onSubmit={(e) => { void handleMgrCreateQuiz(e); }} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                        <FormField label="Quiz Title *">
                          <StyledInput value={mgrQuizTitle} onChange={setMgrQuizTitle} placeholder="e.g. Chapter 1 Knowledge Check" required />
                        </FormField>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                          <FormField label="Type">
                            <StyledSelect value={mgrQuizType} onChange={setMgrQuizType}>
                              <option value="quiz">Quiz</option>
                              <option value="exam">Exam</option>
                              <option value="survey">Survey</option>
                            </StyledSelect>
                          </FormField>
                          <FormField label="Passing Score (%)">
                            <StyledInput value={mgrQuizPassing} onChange={setMgrQuizPassing} type="number" placeholder="60" />
                          </FormField>
                          <FormField label="Time Limit (min, 0=none)">
                            <StyledInput value={mgrQuizTime} onChange={setMgrQuizTime} type="number" placeholder="0" />
                          </FormField>
                          <FormField label="Marks / Question">
                            <StyledInput value={mgrQuizMarks} onChange={setMgrQuizMarks} type="number" placeholder="1" />
                          </FormField>
                        </div>
                        <PrimaryBtn type="submit">Create Quiz</PrimaryBtn>
                      </form>

                      {mgrSelAssessment && (
                        <div style={{ marginTop: 20, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#374151", marginBottom: 12 }}>
                            Add Questions to: "{mgrSelAssessment.title}" ({mgrQuestionsAdded} added)
                          </div>
                          <form onSubmit={(e) => { void handleMgrAddQuestion(e); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <FormField label="Question Text *">
                              <StyledTextarea value={mgrQuestionText} onChange={setMgrQuestionText} placeholder="Type your question here..." rows={2} required />
                            </FormField>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <FormField label="Type">
                                <StyledSelect value={mgrQuestionType} onChange={setMgrQuestionType}>
                                  <option value="mcq">Multiple Choice (MCQ)</option>
                                  <option value="descriptive">Descriptive</option>
                                </StyledSelect>
                              </FormField>
                              <FormField label="Marks">
                                <StyledInput value={mgrQMarks} onChange={setMgrQMarks} type="number" placeholder="1" />
                              </FormField>
                            </div>
                            {mgrQuestionType === "mcq" && (
                              <>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                  <FormField label="Option A">
                                    <StyledInput value={mgrQOptA} onChange={setMgrQOptA} placeholder="Option A text" />
                                  </FormField>
                                  <FormField label="Option B">
                                    <StyledInput value={mgrQOptB} onChange={setMgrQOptB} placeholder="Option B text" />
                                  </FormField>
                                  <FormField label="Option C">
                                    <StyledInput value={mgrQOptC} onChange={setMgrQOptC} placeholder="Option C text" />
                                  </FormField>
                                  <FormField label="Option D">
                                    <StyledInput value={mgrQOptD} onChange={setMgrQOptD} placeholder="Option D text" />
                                  </FormField>
                                </div>
                                <FormField label="Correct Answer">
                                  <StyledSelect value={mgrQCorrect} onChange={setMgrQCorrect}>
                                    <option value="0">A (index 0)</option>
                                    <option value="1">B (index 1)</option>
                                    <option value="2">C (index 2)</option>
                                    <option value="3">D (index 3)</option>
                                  </StyledSelect>
                                </FormField>
                              </>
                            )}
                            <PrimaryBtn type="submit">Add Question</PrimaryBtn>
                          </form>
                        </div>
                      )}

                      {mgrAssessments.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 8 }}>Existing Quizzes</div>
                          {mgrAssessments.map((a) => (
                            <div key={a.id} onClick={() => setMgrSelAssessment(a)} style={{
                              padding: "8px 14px", background: mgrSelAssessment?.id === a.id ? "#eef2ff" : "#f8fafc",
                              borderRadius: 8, marginBottom: 6, cursor: "pointer",
                              border: `1px solid ${mgrSelAssessment?.id === a.id ? "#4f46e5" : "#e2e8f0"}`,
                            }}>
                              <span style={{ fontWeight: 700 }}>{a.title}</span>
                              <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b" }}>Pass: {a.passing_score}% | Time: {a.time_limit_minutes ? `${a.time_limit_minutes}m` : "No limit"}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}><SecondaryBtn onClick={() => setMgrStep("assignments")}>Next: Assignments &rarr;</SecondaryBtn></div>
                    </>
                  )}
                </Card>
              )}

              {/* STEP 5: Assignments */}
              {mgrStep === "assignments" && (
                <Card>
                  <CardHeader title="Assignments (Optional)" subtitle={`Module: ${mgrSelModule?.title ?? "none"}`} icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" />
                  {!mgrSelModule && <MsgBox msg="Select a module first." type="info" />}
                  {mgrSelModule && (
                    <>
                      <form onSubmit={(e) => { void handleMgrCreateAssignment(e); }} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                        <FormField label="Assignment Title *">
                          <StyledInput value={mgrAssignTitle} onChange={setMgrAssignTitle} placeholder="e.g. Sales Role-Play Exercise" required />
                        </FormField>
                        <FormField label="Description / Project Brief">
                          <StyledTextarea value={mgrAssignDesc} onChange={setMgrAssignDesc} placeholder="What learners should do..." rows={3} />
                        </FormField>
                        <FormField label="Submission Guidelines">
                          <StyledTextarea value={mgrAssignGuide} onChange={setMgrAssignGuide} placeholder="How to submit, format requirements..." rows={2} />
                        </FormField>
                        <FormField label="Deadline (optional)">
                          <StyledInput value={mgrAssignDeadline} onChange={setMgrAssignDeadline} type="datetime-local" />
                        </FormField>
                        <PrimaryBtn type="submit">Create Assignment</PrimaryBtn>
                      </form>
                      {mgrAssignments.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 8 }}>
                            Existing Assignments ({mgrAssignments.length})
                          </div>
                          {mgrAssignments.map((a) => (
                            <div key={a.id} style={{ padding: "12px 14px", background: "#fffbeb", borderRadius: 8, marginBottom: 8, border: "1.5px solid #fde68a" }}>
                              <div style={{ fontWeight: 700, color: "#92400e", fontSize: 14 }}>📋 {a.title}</div>
                              {a.deadline && <div style={{ fontSize: 12, color: "#d97706", marginTop: 3 }}>Due: {new Date(a.deadline).toLocaleDateString()}</div>}
                              {a.description && <div style={{ fontSize: 12, color: "#78350f", marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{a.description.slice(0, 200)}{a.description.length > 200 ? "…" : ""}</div>}
                              {a.guidelines && <div style={{ fontSize: 11, color: "#713f12", marginTop: 4, background: "#fef9c3", padding: "6px 8px", borderRadius: 6 }}><b>Guidelines:</b> {a.guidelines.slice(0, 150)}{a.guidelines.length > 150 ? "…" : ""}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}><SecondaryBtn onClick={() => { setMgrStep("users"); void handleMgrLoadUsers(); }}>Next: User Management &rarr;</SecondaryBtn></div>
                    </>
                  )}
                </Card>
              )}

              {/* STEP 6: User Management / Enrollment */}
              {mgrStep === "users" && (
                <Card>
                  <CardHeader title="User Management & Enrollment" subtitle={`Course: ${mgrCourse?.title ?? "none"}`} icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0" />
                  {!mgrCourse && <MsgBox msg="Create or select a course first." type="info" />}
                  {mgrCourse && (
                    <>
                      {/* Access + Enrollment type selectors */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, marginBottom: 16 }}>
                        <FormField label="Access Type">
                          <StyledSelect value={mgrEnrollAccess} onChange={setMgrEnrollAccess}>
                            <option value="full">Full Access</option>
                            <option value="read_only">Read Only</option>
                            <option value="limited">Limited</option>
                          </StyledSelect>
                        </FormField>
                        <FormField label="Enrollment Type">
                          <StyledSelect value={mgrEnrollType} onChange={setMgrEnrollType}>
                            <option value="manual">Manual</option>
                            <option value="automatic">Automatic</option>
                          </StyledSelect>
                        </FormField>
                      </div>

                      {/* Users table with inline Enroll button */}
                      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>
                          {mgrUsers.length > 0 ? `${mgrUsers.length} user(s) — click Enroll to add` : "Load users to enroll them"}
                        </div>
                        <SecondaryBtn onClick={() => { void handleMgrLoadUsers(); }}>
                          {mgrUsers.length > 0 ? "Refresh Users" : "Load Users"}
                        </SecondaryBtn>
                      </div>

                      {mgrUsers.length > 0 && (
                        <div style={{ overflowX: "auto", marginBottom: 16 }}>
                          <table style={s.table}>
                            <thead>
                              <tr>
                                {["Name", "Email", "Role", "Status", "Action"].map((h) => (
                                  <th key={h} style={s.th}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {mgrUsers.map((u) => {
                                const alreadyEnrolled = mgrEnrollments.some((e) => e.user_id === u.id);
                                const isSelected = mgrEnrollUserId === u.id;
                                return (
                                  <tr key={u.id} style={{
                                    ...s.tr,
                                    background: isSelected ? "#eef2ff" : alreadyEnrolled ? "#f0fdf4" : undefined,
                                  }}>
                                    <td style={s.td}>
                                      <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                                    </td>
                                    <td style={s.td}>{u.email}</td>
                                    <td style={s.td}><Badge label={u.role} /></td>
                                    <td style={s.td}>
                                      <Badge
                                        label={u.is_active ? "active" : "inactive"}
                                        color={u.is_active ? "#059669" : "#dc2626"}
                                        bg={u.is_active ? "#d1fae5" : "#fee2e2"}
                                      />
                                    </td>
                                    <td style={s.td}>
                                      {alreadyEnrolled ? (
                                        <Badge label="Enrolled" color="#059669" bg="#d1fae5" />
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setMgrEnrollUserId(u.id);
                                            void handleMgrEnroll(
                                              { preventDefault: () => {} } as React.FormEvent,
                                              u.id
                                            );
                                          }}
                                          style={{
                                            padding: "4px 12px", fontSize: 12, fontWeight: 600,
                                            borderRadius: 6, border: "none", cursor: "pointer",
                                            background: "#4f46e5", color: "#fff",
                                          }}
                                        >
                                          Enroll
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Enrolled list */}
                      {mgrEnrollments.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 8 }}>
                            Enrolled ({mgrEnrollments.length})
                          </div>
                          {mgrEnrollments.map((e) => {
                            const user = mgrUsers.find((u) => u.id === e.user_id);
                            return (
                              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", background: "#f0fdf4", borderRadius: 8, marginBottom: 6, fontSize: 13, border: "1px solid #bbf7d0" }}>
                                <Icon d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={16} color="#059669" />
                                <span style={{ fontWeight: 600, color: "#374151" }}>
                                  {user ? user.full_name : `User ${e.user_id.slice(0, 8)}…`}
                                </span>
                                {user && <span style={{ color: "#64748b", fontSize: 12 }}>{user.email}</span>}
                                <Badge label={e.access_type} color="#0891b2" bg="#e0f2fe" />
                                <Badge label={e.enrollment_type} color="#7c3aed" bg="#f5f3ff" />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={{ marginTop: 14 }}>
                        <SecondaryBtn onClick={() => setMgrStep("settings")}>Next: Settings &rarr;</SecondaryBtn>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {/* STEP 7: Settings */}
              {mgrStep === "settings" && (
                <Card>
                  <CardHeader title="Settings Configuration" subtitle={`Course: ${mgrCourse?.title ?? "none"}`} icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                  {mgrCourse ? (
                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ padding: 16, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                        <div style={{ fontWeight: 700, color: "#374151", marginBottom: 12 }}>Current Settings</div>
                        {[
                          ["Title", mgrCourse.title],
                          ["Category", mgrCourse.category || "—"],
                          ["Duration", `${mgrCourse.duration_hours} hours`],
                          ["Progress Tracking", mgrCourse.progress_tracking_enabled ? "Enabled" : "Disabled"],
                          ["Certification", mgrCourse.certification_enabled ? "Enabled" : "Disabled"],
                          ["Status", mgrCourse.status],
                          ["Modules", String(mgrModules.length)],
                          ["Lessons", String(mgrLessons.length)],
                          ["Assessments", String(mgrAssessments.length)],
                          ["Assignments", String(mgrAssignments.length)],
                          ["Enrollments", String(mgrEnrollments.length)],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <span style={{ color: "#64748b" }}>{k}</span>
                            <span style={{ fontWeight: 600, color: "#374151" }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <SecondaryBtn onClick={() => setMgrStep("preview")}>Next: Preview &rarr;</SecondaryBtn>
                    </div>
                  ) : <MsgBox msg="Create or select a course first." type="info" />}
                </Card>
              )}

              {/* STEP 8: Preview */}
              {mgrStep === "preview" && (
                <Card>
                  <CardHeader title="Preview Module" subtitle="Review all content before publishing" icon="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />
                  {!mgrCourse ? <MsgBox msg="No course selected." type="info" /> : (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ background: "#eef2ff", borderRadius: 10, padding: 16, marginBottom: 14, border: "1px solid #c7d2fe" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#3730a3" }}>{mgrCourse.title}</div>
                        {mgrCourse.category && <Badge label={mgrCourse.category} color="#4f46e5" bg="#e0e7ff" />}
                        <div style={{ fontSize: 13, color: "#4338ca", marginTop: 6 }}>{mgrCourse.description}</div>
                        {mgrCourse.objectives && <div style={{ fontSize: 12, color: "#6366f1", marginTop: 4 }}><b>Objectives:</b> {mgrCourse.objectives}</div>}
                        <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap", fontSize: 12 }}>
                          <span>⏱ {mgrCourse.duration_hours}h</span>
                          <span>{mgrCourse.progress_tracking_enabled ? "✅ Progress Tracking" : "❌ No Tracking"}</span>
                          <span>{mgrCourse.certification_enabled ? "🎓 Certificate" : "No Certificate"}</span>
                        </div>
                      </div>
                      {mgrModules.map((mod, mi) => (
                        <div key={mod.id} style={{ marginBottom: 14, padding: 14, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
                          <div style={{ fontWeight: 700, color: "#374151" }}>{mi + 1}. {mod.title}</div>
                          {mod.section_title && <Badge label={mod.section_title} color="#0891b2" bg="#e0f2fe" />}
                          {mod.description && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{mod.description}</div>}
                          <div style={{ marginTop: 8, paddingLeft: 14 }}>
                            {mgrLessons.filter((l) => l.module_id === mod.id).map((l, li) => (
                              <div key={l.id} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px solid #f8fafc" }}>
                                📄 {li + 1}. {l.title}
                                {l.video_url && <Badge label="Video" color="#7c3aed" bg="#f5f3ff" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Badge label={`${mgrModules.length} Modules`} color="#4f46e5" bg="#eef2ff" />
                        <Badge label={`${mgrLessons.length} Lessons`} color="#0891b2" bg="#e0f2fe" />
                        <Badge label={`${mgrAssessments.length} Quizzes`} color="#059669" bg="#d1fae5" />
                        <Badge label={`${mgrAssignments.length} Assignments`} color="#d97706" bg="#fef3c7" />
                        <Badge label={`${mgrEnrollments.length} Enrolled`} color="#7c3aed" bg="#f5f3ff" />
                      </div>
                      <div style={{ marginTop: 12 }}><SecondaryBtn onClick={() => setMgrStep("publish")}>Next: Publish &rarr;</SecondaryBtn></div>
                    </div>
                  )}
                </Card>
              )}

              {/* STEP 9: Publish */}
              {mgrStep === "publish" && (
                <Card>
                  <CardHeader title="Publish Module" subtitle="Make it live for learners" icon="M5 12h14 M12 5l7 7-7 7" />
                  {!mgrCourse ? <MsgBox msg="No course selected." type="info" /> : (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ padding: 20, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 16, textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{mgrCourse.status === "published" ? "🟢" : "🟡"}</div>
                        <div style={{ fontWeight: 800, fontSize: 20, color: "#374151" }}>{mgrCourse.title}</div>
                        <div style={{ marginTop: 8 }}>
                          <Badge label={mgrCourse.status === "published" ? "PUBLISHED — Live" : "DRAFT — Not visible to learners"}
                            color={mgrCourse.status === "published" ? "#059669" : "#d97706"}
                            bg={mgrCourse.status === "published" ? "#d1fae5" : "#fef3c7"} />
                        </div>
                        <div style={{ marginTop: 16 }}>
                          <PrimaryBtn onClick={() => { void handleMgrPublish(); }}>
                            {mgrCourse.status === "published" ? "Unpublish (back to draft)" : "Publish — Make Live"}
                          </PrimaryBtn>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        After publishing: learners with enrollment will see this course in their Learning tab.
                        You can unpublish at any time to hide it.
                      </div>
                      <div style={{ marginTop: 12 }}><SecondaryBtn onClick={() => setMgrStep("feedback")}>Next: Post-Launch &rarr;</SecondaryBtn></div>
                    </div>
                  )}
                </Card>
              )}

              {/* STEP 10: Post-Launch (Feedback) */}
              {mgrStep === "feedback" && (
                <Card>
                  <CardHeader title="Post-Launch Tasks" subtitle="Monitor, collect feedback, update content" icon="M18 20V10M12 20V4M6 20v-6" />
                  {!mgrCourse ? <MsgBox msg="No course selected." type="info" /> : (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                        <SecondaryBtn onClick={() => { void handleMgrLoadFeedback(); }}>Load Feedback</SecondaryBtn>
                        <SecondaryBtn onClick={() => { void loadDashboardData(accessToken!); }}>Refresh Progress Data</SecondaryBtn>
                      </div>
                      {mgrFeedback.length === 0 ? (
                        <MsgBox msg="No feedback yet. Publish the course and have learners complete it first." type="info" />
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                            Feedback ({mgrFeedback.length}) — Avg rating: {(mgrFeedback.reduce((s, f) => s + f.rating, 0) / mgrFeedback.length).toFixed(1)} / 5
                          </div>
                          {mgrFeedback.map((fb) => (
                            <div key={fb.id} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8, marginBottom: 8, border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
                                <span style={{ fontSize: 12, color: "#94a3b8" }}>{new Date(fb.created_at).toLocaleDateString()}</span>
                              </div>
                              {fb.comment && <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{fb.comment}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 16, padding: 14, background: "#eef2ff", borderRadius: 10, border: "1px solid #c7d2fe", fontSize: 13, color: "#4338ca" }}>
                        <b>Post-launch checklist:</b>
                        <ul style={{ margin: "8px 0 0 16px", padding: 0, lineHeight: 2 }}>
                          <li>Monitor learner progress in the Performance tab</li>
                          <li>Review quiz scores and weak skill areas</li>
                          <li>Update lessons with new content as needed (go back to Lessons step)</li>
                          <li>Collect and act on learner feedback above</li>
                          <li>Re-publish after significant content updates</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
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
