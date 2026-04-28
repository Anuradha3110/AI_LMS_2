export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    if (msg.includes("ENOTFOUND") || msg.includes("ERR_NAME_NOT_RESOLVED")) {
      throw new Error(`Unable to reach the API server. Check that the backend is running at ${API_BASE_URL}.`);
    }
    if (msg.includes("ECONNREFUSED") || msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("Failed to fetch")) {
      throw new Error(`Connection refused. Make sure the backend server is running at ${API_BASE_URL}.`);
    }
    throw new Error(`Network error: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  // New modular-router shape returns these flat
  role?: string;
  user_id?: string;
  tenant_id?: string;
  full_name?: string;
  // Old shape (backwards compat)
  user?: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    tenant_id: string;
    is_active: boolean;
  };
};

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  // Backend uses OAuth2 form-encoded (username field)
  const form = new URLSearchParams({ username: email, password });
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    throw new Error(msg.includes("ECONNREFUSED") || msg.includes("Failed to fetch")
      ? `Connection refused. Make sure the backend is running at ${API_BASE_URL}.`
      : `Network error: ${msg}`);
  }
  if (!res.ok) {
    const text = await res.text();
    let detail = `Request failed: ${res.status}`;
    try { detail = JSON.parse(text).detail || detail; } catch { detail = text || detail; }
    throw new Error(detail);
  }
  return res.json() as Promise<LoginResponse>;
}

// ── MongoDB Auth ─────────────────────────────────────────────────────────────

export type MongoLoginResponse = {
  access_token: string;
  token_type: "bearer";
  role: string;
  user_id: string;
  tenant_id: string;
  full_name: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    tenant_id: string;
    is_active: boolean;
    department?: string;
    job_title?: string;
    avatar_url?: string;
  };
};

export async function mongoLoginApi(
  email: string,
  password: string,
  tenantSlug?: string,
): Promise<MongoLoginResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/mongo/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, tenant_slug: tenantSlug || null }),
    });
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    throw new Error(
      msg.includes("ECONNREFUSED") || msg.includes("Failed to fetch")
        ? `Connection refused. Make sure the backend is running at ${API_BASE_URL}.`
        : `Network error: ${msg}`,
    );
  }
  if (!res.ok) {
    const text = await res.text();
    let detail = `Request failed: ${res.status}`;
    try { detail = JSON.parse(text).detail || detail; } catch { detail = text || detail; }
    throw new Error(detail);
  }
  return res.json() as Promise<MongoLoginResponse>;
}

export async function mongoRegisterApi(body: {
  org_name: string;
  slug: string;
  plan?: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
}): Promise<{ tenant_id: string; slug: string; admin_email: string; api_key: string; message: string }> {
  return request("/api/mongo/register", { method: "POST", body: JSON.stringify(body) });
}

// ── MongoDB Dashboard — Team Progress ────────────────────────────────────────

export type TeamProgressDoc = {
  _id?: string;
  name: string;
  role: string;
  avatar: string;
  kpi: number;
  completion: number;
  pitchScore: number;
  objectionScore: number;
  escalationScore: number;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export async function mongoGetTeamProgressApi(): Promise<TeamProgressDoc[]> {
  return request<TeamProgressDoc[]>("/api/mongo/team-progress", { method: "GET" });
}

export async function mongoCreateTeamProgressApi(body: Omit<TeamProgressDoc, "_id" | "created_at" | "updated_at">): Promise<TeamProgressDoc> {
  return request<TeamProgressDoc>("/api/mongo/team-progress", { method: "POST", body: JSON.stringify(body) });
}

export async function mongoUpdateTeamProgressApi(id: string, body: Omit<TeamProgressDoc, "_id" | "created_at" | "updated_at">): Promise<TeamProgressDoc> {
  return request<TeamProgressDoc>(`/api/mongo/team-progress/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function mongoPatchTeamProgressApi(id: string, body: Partial<TeamProgressDoc>): Promise<TeamProgressDoc> {
  return request<TeamProgressDoc>(`/api/mongo/team-progress/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function mongoDeleteTeamProgressApi(id: string): Promise<void> {
  await request<void>(`/api/mongo/team-progress/${id}`, { method: "DELETE" });
}

// ── MongoDB Dashboard — Leaderboard ──────────────────────────────────────────

export type LeaderboardDoc = {
  _id?: string;
  full_name: string;
  role?: string;
  xp_points: number;
  level: number;
  badges_count: number;
  streak_days: number;
  completion?: number;
  kpi?: number;
  created_at?: string;
  updated_at?: string;
};

export async function mongoGetLeaderboardApi(): Promise<LeaderboardDoc[]> {
  return request<LeaderboardDoc[]>("/api/mongo/leaderboard-data", { method: "GET" });
}

export async function mongoCreateLeaderboardApi(body: Omit<LeaderboardDoc, "_id" | "created_at" | "updated_at">): Promise<LeaderboardDoc> {
  return request<LeaderboardDoc>("/api/mongo/leaderboard-data", { method: "POST", body: JSON.stringify(body) });
}

export async function mongoUpdateLeaderboardApi(id: string, body: Omit<LeaderboardDoc, "_id" | "created_at" | "updated_at">): Promise<LeaderboardDoc> {
  return request<LeaderboardDoc>(`/api/mongo/leaderboard-data/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function mongoPatchLeaderboardApi(id: string, body: Partial<LeaderboardDoc>): Promise<LeaderboardDoc> {
  return request<LeaderboardDoc>(`/api/mongo/leaderboard-data/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function mongoDeleteLeaderboardApi(id: string): Promise<void> {
  await request<void>(`/api/mongo/leaderboard-data/${id}`, { method: "DELETE" });
}

// ── MongoDB Dashboard — Attendance ───────────────────────────────────────────

export type AttendenceDoc = {
  _id?: string;
  Name: string;
  Role?: string;
  Status: string;           // "Present" | "Absent" | "Late" | "On Leave"
  "Check In"?: string;
  "Check Out"?: string;
  "Hours Worked"?: string;
  Note?: string;
  date?: string;
  created_at?: string;
  updated_at?: string;
};

export type AttendenceInput = {
  Name: string;
  Role?: string;
  Status: string;
  CheckIn?: string;
  CheckOut?: string;
  HoursWorked?: string;
  Note?: string;
  date?: string;
};

export async function mongoGetAttendanceApi(): Promise<AttendenceDoc[]> {
  return request<AttendenceDoc[]>("/api/mongo/attendance", { method: "GET" });
}

export async function mongoCreateAttendanceApi(body: AttendenceInput): Promise<AttendenceDoc> {
  return request<AttendenceDoc>("/api/mongo/attendance", { method: "POST", body: JSON.stringify(body) });
}

export async function mongoUpdateAttendanceApi(id: string, body: AttendenceInput): Promise<AttendenceDoc> {
  return request<AttendenceDoc>(`/api/mongo/attendance/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function mongoPatchAttendanceApi(id: string, body: Partial<AttendenceInput>): Promise<AttendenceDoc> {
  return request<AttendenceDoc>(`/api/mongo/attendance/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function mongoDeleteAttendanceApi(id: string): Promise<void> {
  await request<void>(`/api/mongo/attendance/${id}`, { method: "DELETE" });
}

// ── MongoDB Leave Requests ────────────────────────────────────────────────────

export type MongoLeaveRequestDoc = {
  _id?: string;
  name: string;
  avatar?: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  appliedDate?: string;
  comment?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function mongoGetLeaveRequestsApi(): Promise<MongoLeaveRequestDoc[]> {
  return request<MongoLeaveRequestDoc[]>("/api/mongo/leave-requests", { method: "GET" });
}

export async function mongoPatchLeaveRequestApi(
  id: string,
  body: { status: string; comment?: string | null },
): Promise<MongoLeaveRequestDoc> {
  return request<MongoLeaveRequestDoc>(`/api/mongo/leave-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export type MeResponse = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
};

export async function meApi(accessToken: string): Promise<MeResponse> {
  return request<MeResponse>("/api/mongo/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export type CourseOut = {
  id: string; title: string; description: string; objectives: string; category: string;
  thumbnail_url: string; status: string; level: string; duration_hours: number;
  progress_tracking_enabled: boolean; certification_enabled: boolean;
  instructor_name: string; tags_json: string[]; created_at: string;
};
export type ModuleOut = {
  id: string; course_id: string; title: string; description: string; section_title: string;
  order_index: number; created_at: string;
};
export type LessonOut = {
  id: string; module_id: string; title: string; content_text: string;
  video_url: string; subtitle_url: string;
  reading_materials_json: Array<{label: string; url: string}>;
  downloadable_resources_json: Array<{label: string; url: string}>;
  order_index: number; created_at: string;
};
export type AssignmentOut = {
  id: string; module_id: string; title: string; description: string;
  guidelines: string; deadline?: string | null; created_at: string;
};
export type EnrollmentOut = {
  id: string; user_id: string; course_id: string; access_type: string;
  enrollment_type: string; enrolled_at: string;
};
export type CourseFeedbackOut = {
  id: string; user_id: string; course_id: string; rating: number; comment: string; created_at: string;
};
export type UserListOut = { id: string; email: string; full_name: string; role: string; is_active: boolean; department?: string; };
export type BlueprintOut = {
  id: string;
  version: number;
  blueprint_json: Record<string, unknown>;
  created_at: string;
};
export type AssessmentOut = {
  id: string; title: string; assessment_type: string;
  module_id?: string | null; passing_score: number;
  time_limit_minutes: number; marks_per_question: number; created_at: string;
};
export type AssessmentQuestionOut = {
  id: string; question_text: string; question_type: string;
  options_json: Record<string, string>; correct_answer_index: number; marks: number;
};
export type AssessmentSubmissionOut = {
  id: string;
  assessment_id: string;
  score: number;
  submitted_at: string;
};
export type TutorFeedbackOut = {
  feedback: string;
  follow_up_question: string;
  confidence_score: number;
};
export type JobEnqueueOut = {
  job_id: string;
  status: string;
  message: string;
};
export type JobStatusOut = {
  id: string;
  job_type: string;
  status: string;
  result_json: Record<string, unknown>;
  error_message: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
};
export type KpiIngestOut = {
  ok: boolean;
  updated_skills: Array<{ skill_name: string; score: number }>;
};
export type NextLessonRecommendationOut = {
  lesson_id: string;
  module_id: string;
  title: string;
  reason: string;
};
export type RecommendationOut = { next_lessons: NextLessonRecommendationOut[] };
export type BadgeOut = { badge_code: string; badge_name: string; awarded_at: string };
export type GamificationProfileOut = {
  user_id: string;
  xp_points: number;
  level: number;
  badges_count: number;
  streak_days: number;
  badges: BadgeOut[];
};
export type LeaderboardRowOut = {
  user_id: string;
  full_name: string;
  role: string;
  xp_points: number;
  level: number;
  badges_count: number;
};
export type LeaderboardOut = { leaderboard: LeaderboardRowOut[] };
export type WebhookOut = {
  id: string;
  provider: string;
  target_url: string;
  event_name: string;
  is_active: boolean;
  created_at: string;
};
export type SimulationScenarioOut = {
  id: string;
  title: string;
  team: string;
  focus_topic: string;
  prompt_text: string;
  created_at: string;
};
export type SimulationAttemptOut = {
  id: string;
  scenario_id: string;
  status: string;
  score: number;
  feedback_text: string;
  created_at: string;
  completed_at?: string | null;
};
export type TenantProfileOut = {
  business_domain: string;
  role_template_json: Record<string, unknown>;
  taxonomy_mapping_json: Record<string, unknown>;
  generation_prefs_json: Record<string, unknown>;
  connectors_json: Record<string, unknown>;
  labels_json: Record<string, unknown>;
  updated_at: string;
};
export type SheetTabSource = { name: string; url: string; gid: string };
export type TenantDataSyncOut = { ok: boolean; synced_tabs: number; upserted_items: number };
export type KnowledgeItemOut = {
  id: string;
  source_tab: string;
  source_row: number;
  title: string;
  category: string;
  service_type: string;
  team_hint: string;
  description: string;
  tags_json: Record<string, unknown>;
  attrs_json: Record<string, unknown>;
  source_url: string;
  updated_at: string;
};
export type KnowledgeStatsOut = {
  total_items: number;
  by_tab: Record<string, number>;
  by_team_hint: Record<string, number>;
};
export type TenantAnalyticsOut = {
  users_count: number;
  knowledge_items: number;
  knowledge_by_tab: Record<string, number>;
  lesson_completions: number;
  assessments_submitted: number;
  avg_assessment_score: number;
  simulations_completed: number;
  avg_simulation_score: number;
  weak_skills: Array<{ skill_name: string; score: number; user_id: string }>;
};

export async function coursesApi(accessToken: string): Promise<CourseOut[]> {
  return request<CourseOut[]>("/api/courses", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function listBlueprintsApi(accessToken: string): Promise<BlueprintOut[]> {
  return request<BlueprintOut[]>("/api/onboarding/blueprints", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function createBlueprintApi(
  accessToken: string,
  payload: { website_url?: string; documents_text: string; questionnaire?: Record<string, unknown> }
): Promise<BlueprintOut> {
  return request<BlueprintOut>("/api/onboarding/blueprint", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function generateLmsApi(accessToken: string, blueprint_id: string): Promise<JobEnqueueOut> {
  return request<JobEnqueueOut>("/api/onboarding/generate-lms", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ blueprint_id })
  });
}

export async function jobStatusApi(accessToken: string, jobId: string): Promise<JobStatusOut> {
  return request<JobStatusOut>(`/api/jobs/${jobId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function modulesApi(accessToken: string, courseId: string): Promise<ModuleOut[]> {
  return request<ModuleOut[]>(`/api/courses/${courseId}/modules`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function lessonsApi(accessToken: string, moduleId: string): Promise<LessonOut[]> {
  return request<LessonOut[]>(`/api/modules/${moduleId}/lessons`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function completeLessonApi(accessToken: string, lessonId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/progress/lesson-complete", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ lesson_id: lessonId })
  });
}

export async function assessmentsApi(accessToken: string): Promise<AssessmentOut[]> {
  return request<AssessmentOut[]>("/api/assessments", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function assessmentQuestionsApi(accessToken: string, assessmentId: string): Promise<AssessmentQuestionOut[]> {
  return request<AssessmentQuestionOut[]>(`/api/assessments/${assessmentId}/questions`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function submitAssessmentApi(
  accessToken: string,
  payload: { assessment_id: string; answers: Record<string, number> }
): Promise<AssessmentSubmissionOut> {
  return request<AssessmentSubmissionOut>("/api/submissions", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function tutorFeedbackApi(
  accessToken: string,
  payload: { lesson_id: string; learner_answer: string }
): Promise<JobEnqueueOut> {
  return request<JobEnqueueOut>("/api/tutor/feedback", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function ingestKpiApi(
  accessToken: string,
  payload: { user_id: string; metrics: Record<string, number> }
): Promise<KpiIngestOut> {
  return request<KpiIngestOut>("/api/kpi/ingest", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function nextLessonRecommendationsApi(accessToken: string): Promise<RecommendationOut> {
  return request<RecommendationOut>("/api/recommendations/next-lessons", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function gamificationMeApi(accessToken: string): Promise<GamificationProfileOut> {
  return request<GamificationProfileOut>("/api/gamification/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function gamificationLeaderboardApi(accessToken: string): Promise<LeaderboardOut> {
  return request<LeaderboardOut>("/api/gamification/leaderboard", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function integrationsWebhooksApi(accessToken: string): Promise<WebhookOut[]> {
  return request<WebhookOut[]>("/api/integrations/webhooks", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function createWebhookApi(
  accessToken: string,
  payload: { provider: string; target_url: string; event_name: string }
): Promise<WebhookOut> {
  return request<WebhookOut>("/api/integrations/webhooks", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function startSimulationApi(
  accessToken: string,
  payload: { blueprint_id?: string; team: string; focus_topic: string }
): Promise<SimulationScenarioOut> {
  return request<SimulationScenarioOut>("/api/simulations/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function submitSimulationApi(
  accessToken: string,
  payload: { scenario_id: string; user_response_text: string }
): Promise<JobEnqueueOut> {
  return request<JobEnqueueOut>("/api/simulations/submit", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function simulationAttemptApi(accessToken: string, attemptId: string): Promise<SimulationAttemptOut> {
  return request<SimulationAttemptOut>(`/api/simulations/attempts/${attemptId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function tenantProfileApi(accessToken: string): Promise<TenantProfileOut> {
  return request<TenantProfileOut>("/api/tenant/profile", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function upsertTenantProfileApi(
  accessToken: string,
  payload: Omit<TenantProfileOut, "updated_at">
): Promise<TenantProfileOut> {
  return request<TenantProfileOut>("/api/tenant/profile", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function syncTenantDataApi(
  accessToken: string,
  payload: { tabs?: SheetTabSource[] }
): Promise<TenantDataSyncOut> {
  return request<TenantDataSyncOut>("/api/tenant-data/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function knowledgeStatsApi(accessToken: string): Promise<KnowledgeStatsOut> {
  return request<KnowledgeStatsOut>("/api/knowledge/stats", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function knowledgeItemsApi(accessToken: string, tab = "", limit = 20): Promise<KnowledgeItemOut[]> {
  const q = new URLSearchParams();
  if (tab) q.set("tab", tab);
  q.set("limit", String(limit));
  return request<KnowledgeItemOut[]>(`/api/knowledge-items?${q.toString()}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function createBlueprintFromKnowledgeApi(accessToken: string): Promise<BlueprintOut> {
  return request<BlueprintOut>("/api/onboarding/blueprint/from-knowledge", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function tenantAnalyticsApi(accessToken: string): Promise<TenantAnalyticsOut> {
  return request<TenantAnalyticsOut>("/api/analytics/tenant", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function createCourseApi(
  accessToken: string,
  payload: {
    title: string; description?: string; objectives?: string; category?: string;
    thumbnail_url?: string; level?: string; duration_hours?: number;
    progress_tracking_enabled?: boolean; certification_enabled?: boolean;
    instructor_name?: string; tags?: string[];
  }
): Promise<CourseOut> {
  return request<CourseOut>("/api/courses", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function updateCourseApi(
  accessToken: string, courseId: string,
  payload: Partial<{ title: string; description: string; objectives: string; category: string;
    thumbnail_url: string; level: string; duration_hours: number;
    progress_tracking_enabled: boolean; certification_enabled: boolean; instructor_name: string; tags: string[]; }>
): Promise<CourseOut> {
  return request<CourseOut>(`/api/courses/${courseId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function publishCourseApi(accessToken: string, courseId: string): Promise<CourseOut> {
  return request<CourseOut>(`/api/courses/${courseId}/publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function createModuleApi(
  accessToken: string, courseId: string,
  payload: { title: string; description?: string; section_title?: string; order_index?: number }
): Promise<ModuleOut> {
  return request<ModuleOut>(`/api/courses/${courseId}/modules`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function createLessonApi(
  accessToken: string, moduleId: string,
  payload: {
    title: string; content_text?: string; video_url?: string; subtitle_url?: string;
    reading_materials?: Array<{label: string; url: string}>;
    downloadable_resources?: Array<{label: string; url: string}>;
    order_index?: number;
  }
): Promise<LessonOut> {
  return request<LessonOut>(`/api/modules/${moduleId}/lessons`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function createModuleAssessmentApi(
  accessToken: string, moduleId: string,
  payload: {
    title: string; assessment_type?: string; passing_score?: number;
    time_limit_minutes?: number; marks_per_question?: number;
  }
): Promise<AssessmentOut> {
  return request<AssessmentOut>(`/api/modules/${moduleId}/assessments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function listModuleAssessmentsApi(accessToken: string, moduleId: string): Promise<AssessmentOut[]> {
  return request<AssessmentOut[]>(`/api/modules/${moduleId}/assessments`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function addAssessmentQuestionApi(
  accessToken: string, assessmentId: string,
  payload: {
    question_text: string; question_type?: string;
    options_json?: Record<string, string>; correct_answer_index?: number; marks?: number;
  }
): Promise<AssessmentQuestionOut> {
  return request<AssessmentQuestionOut>(`/api/assessments/${assessmentId}/questions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function createAssignmentApi(
  accessToken: string,
  payload: { module_id: string; title: string; description?: string; guidelines?: string; deadline?: string | null }
): Promise<AssignmentOut> {
  return request<AssignmentOut>("/api/assignments", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function listModuleAssignmentsApi(accessToken: string, moduleId: string): Promise<AssignmentOut[]> {
  return request<AssignmentOut[]>(`/api/modules/${moduleId}/assignments`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function enrollUserApi(
  accessToken: string,
  payload: { user_id: string; course_id: string; access_type?: string; enrollment_type?: string }
): Promise<EnrollmentOut> {
  return request<EnrollmentOut>("/api/enrollments", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function listCourseEnrollmentsApi(accessToken: string, courseId: string): Promise<EnrollmentOut[]> {
  return request<EnrollmentOut[]>(`/api/courses/${courseId}/enrollments`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function listUsersApi(accessToken: string): Promise<UserListOut[]> {
  return request<UserListOut[]>("/api/users", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function submitCourseFeedbackApi(
  accessToken: string, courseId: string,
  payload: { rating: number; comment?: string }
): Promise<CourseFeedbackOut> {
  return request<CourseFeedbackOut>(`/api/courses/${courseId}/feedback`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload)
  });
}

export async function listCourseFeedbackApi(accessToken: string, courseId: string): Promise<CourseFeedbackOut[]> {
  return request<CourseFeedbackOut[]>(`/api/courses/${courseId}/feedback`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export type CertificateOut = {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  recipient_name: string;
  course_title: string;
  instructor_name: string;
  issued_at: string;
  template_data_json: Record<string, unknown>;
};

export async function selfEnrollApi(accessToken: string, courseId: string): Promise<EnrollmentOut> {
  return request<EnrollmentOut>(`/api/courses/${courseId}/enroll-me`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function issueCertificateApi(accessToken: string, courseId: string): Promise<CertificateOut> {
  return request<CertificateOut>(`/api/courses/${courseId}/certificates`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export type AddTeamMemberPayload = {
  full_name: string;
  email: string;
  role: string;
  department?: string;
  phone?: string;
  joining_date?: string;
};

export type TeamMemberDetailOut = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  assessments_completed: number;
  avg_assessment_score: number;
  simulations_completed: number;
  badges_count: number;
  xp_points: number;
  level: number;
  enrolled_courses: number;
  skill_scores: Array<{ skill_name: string; score: number }>;
};

export async function addTeamMemberApi(
  accessToken: string,
  payload: AddTeamMemberPayload
): Promise<UserListOut> {
  return request<UserListOut>("/api/team-members/add", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function getTeamMemberDetailApi(
  accessToken: string,
  userId: string
): Promise<TeamMemberDetailOut> {
  return request<TeamMemberDetailOut>(`/api/team-members/${userId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── Attendance ──────────────────────────────────────────────────

export type AttendanceRecordOut = {
  id: string; user_id: string; full_name: string;
  date: string; status: string;
  check_in_time: string | null; check_out_time: string | null;
  notes: string; created_at: string;
};
export type AttendanceSummaryOut = {
  date: string; present: number; absent: number; late: number; on_leave: number; total: number;
};

export async function listAttendanceApi(
  accessToken: string, params?: { date?: string; user_id?: string; att_status?: string }
): Promise<AttendanceRecordOut[]> {
  const q = new URLSearchParams();
  if (params?.date) q.set("date", params.date);
  if (params?.user_id) q.set("user_id", params.user_id);
  if (params?.att_status) q.set("att_status", params.att_status);
  return request<AttendanceRecordOut[]>(`/api/attendance${q.toString() ? "?" + q.toString() : ""}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getAttendanceSummaryApi(
  accessToken: string, date?: string
): Promise<AttendanceSummaryOut> {
  const q = date ? `?date=${date}` : "";
  // Returns a list of summaries (by date range) — grab first entry or wrap
  return request<AttendanceSummaryOut>(`/api/attendance/summary${q}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createAttendanceApi(
  accessToken: string,
  payload: { user_id: string; date: string; status: string; check_in_time?: string; check_out_time?: string; notes?: string }
): Promise<AttendanceRecordOut> {
  return request<AttendanceRecordOut>("/api/attendance", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

// ─── Leave Requests ──────────────────────────────────────────────

export type LeaveRequestOut = {
  id: string; user_id: string; full_name: string;
  leave_type: string; start_date: string; end_date: string; days_count: number;
  reason: string; status: string; manager_comment: string | null;
  applied_at: string; reviewed_at: string | null;
};

export async function listLeaveRequestsApi(
  accessToken: string, req_status?: string
): Promise<LeaveRequestOut[]> {
  const q = req_status ? `?req_status=${req_status}` : "";
  return request<LeaveRequestOut[]>(`/api/leave-requests${q}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createLeaveRequestApi(
  accessToken: string,
  payload: { leave_type: string; start_date: string; end_date: string; days_count: number; reason: string }
): Promise<LeaveRequestOut> {
  return request<LeaveRequestOut>("/api/leave-requests", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function approveLeaveApi(
  accessToken: string, leaveId: string, comment?: string
): Promise<LeaveRequestOut> {
  return request<LeaveRequestOut>(`/api/leave/${leaveId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ comment }),
  });
}

export async function rejectLeaveApi(
  accessToken: string, leaveId: string, comment?: string
): Promise<LeaveRequestOut> {
  return request<LeaveRequestOut>(`/api/leave/${leaveId}/reject`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ comment }),
  });
}

export async function myLeaveRequestsApi(accessToken: string): Promise<LeaveRequestOut[]> {
  return request<LeaveRequestOut[]>("/api/leave-requests/my", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: Tenant API Keys path fix ────────────────────────────────────────────

export async function listApiKeysV2Api(accessToken: string): Promise<ApiKeyOut[]> {
  return request<ApiKeyOut[]>("/api/api-keys", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── Course Assignments ──────────────────────────────────────────

export type CourseAssignmentOut = {
  id: string; user_id: string; full_name: string;
  course_id: string; course_title: string;
  deadline: string | null; status: string;
  assigned_at: string; completed_at: string | null; notes: string;
};
export type CourseProgressSummaryOut = {
  course_id: string; course_title: string;
  total_assigned: number; not_started: number; in_progress: number; completed: number;
};

export async function assignCoursesApi(
  accessToken: string,
  payload: { course_id: string; user_ids: string[]; deadline?: string; notes?: string }
): Promise<CourseAssignmentOut[]> {
  return request<CourseAssignmentOut[]>("/api/courses/assign", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function listCourseAssignmentsApi(accessToken: string): Promise<CourseAssignmentOut[]> {
  return request<CourseAssignmentOut[]>("/api/courses/assignments", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function courseProgressSummaryApi(accessToken: string): Promise<CourseProgressSummaryOut[]> {
  return request<CourseProgressSummaryOut[]>("/api/courses/progress", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function listMyCertificatesApi(accessToken: string): Promise<CertificateOut[]> {
  return request<CertificateOut[]>("/api/certificates/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

// ─── NEW: Self-service Tenant Registration ────────────────────────────────────

export interface RegisterTenantPayload {
  org_name: string; slug: string;
  admin_email: string; admin_password: string; admin_name: string;
  plan?: string; business_domain?: string; industry?: string;
}
export interface RegisterTenantResult {
  tenant_id: string; admin_user_id: string; api_key: string; message: string;
}
export async function registerTenantApi(payload: RegisterTenantPayload): Promise<RegisterTenantResult> {
  return request<RegisterTenantResult>("/api/register", {
    method: "POST", body: JSON.stringify(payload),
  });
}

// ─── NEW: Tenant API Keys ─────────────────────────────────────────────────────

export type ApiKeyOut = { id: string; name: string; prefix: string; scopes: string[]; is_active: boolean; created_at: string; };
export async function listApiKeysApi(accessToken: string): Promise<ApiKeyOut[]> {
  return request<ApiKeyOut[]>("/api/api-keys", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createApiKeyApi(accessToken: string, payload: { name: string; scopes?: string[] }): Promise<ApiKeyOut & { raw_key: string }> {
  return request<ApiKeyOut & { raw_key: string }>("/api/api-keys", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}
export async function revokeApiKeyApi(accessToken: string, keyId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/api-keys/${keyId}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: Embed Configs ────────────────────────────────────────────────────────

export type EmbedConfigOut = { id: string; name: string; embed_token: string; allowed_origins: string[]; widget_config: Record<string, unknown>; is_active: boolean; created_at: string; };
export async function listEmbedConfigsApi(accessToken: string): Promise<EmbedConfigOut[]> {
  return request<EmbedConfigOut[]>("/api/embed-configs", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createEmbedConfigApi(accessToken: string, payload: { name: string; allowed_origins?: string[]; widget_config?: Record<string, unknown> }): Promise<EmbedConfigOut> {
  return request<EmbedConfigOut>("/api/embed-configs", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}

// ─── NEW: Audit Logs ───────────────────────────────────────────────────────────

export type AuditLogOut = { id: string; actor_id: string; actor_email: string; action: string; resource_type: string; resource_id: string; changes_json: Record<string, unknown>; created_at: string; };
export async function listAuditLogsApi(accessToken: string, skip = 0, limit = 50): Promise<AuditLogOut[]> {
  return request<AuditLogOut[]>(`/api/audit-logs?skip=${skip}&limit=${limit}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: Question Bank ────────────────────────────────────────────────────────

export type QuestionBankOut = {
  id: string; question_text: string; question_type: string;
  options_json: Record<string, string>; correct_answer_json: Record<string, unknown>;
  explanation: string; difficulty: string; domain: string;
  is_ai_generated: boolean; review_status: string; usage_count: number; created_at: string;
};
export async function listQuestionBankApi(
  accessToken: string,
  params?: { domain?: string; difficulty?: string; review_status?: string; skip?: number; limit?: number }
): Promise<QuestionBankOut[]> {
  const q = new URLSearchParams();
  if (params?.domain) q.set("domain", params.domain);
  if (params?.difficulty) q.set("difficulty", params.difficulty);
  if (params?.review_status) q.set("review_status", params.review_status);
  if (params?.skip != null) q.set("skip", String(params.skip));
  if (params?.limit != null) q.set("limit", String(params.limit));
  return request<QuestionBankOut[]>(`/api/question-bank?${q}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createBankQuestionApi(accessToken: string, payload: Record<string, unknown>): Promise<QuestionBankOut> {
  return request<QuestionBankOut>("/api/question-bank", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}
export async function updateBankQuestionApi(accessToken: string, qId: string, payload: Record<string, unknown>): Promise<QuestionBankOut> {
  return request<QuestionBankOut>(`/api/question-bank/${qId}`, {
    method: "PUT", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}
export async function deleteBankQuestionApi(accessToken: string, qId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/question-bank/${qId}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function linkBankQuestionsApi(accessToken: string, assessmentId: string, questionIds: string[]): Promise<{ linked: number }> {
  return request<{ linked: number }>(`/api/assessments/${assessmentId}/link-questions`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ question_ids: questionIds }),
  });
}

// ─── NEW: Website Sources ─────────────────────────────────────────────────────

export type WebsiteSourceOut = { id: string; name: string; source_type: string; source_uri: string; sync_status: string; last_synced_at: string | null; created_at: string; };
export async function listWebsiteSourcesApi(accessToken: string): Promise<WebsiteSourceOut[]> {
  return request<WebsiteSourceOut[]>("/api/website-sources", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createWebsiteSourceApi(accessToken: string, payload: { name: string; source_type: string; source_uri: string; sync_schedule?: string }): Promise<WebsiteSourceOut> {
  return request<WebsiteSourceOut>("/api/website-sources", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}
export async function triggerSourceSyncApi(accessToken: string, sourceId: string): Promise<{ job_id: string; message: string }> {
  return request<{ job_id: string; message: string }>(`/api/website-sources/${sourceId}/trigger-sync`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: Learning Paths ──────────────────────────────────────────────────────

export type LearningPathOut = { id: string; title: string; description: string; target_role: string; course_ids: string[]; created_at: string; };
export async function listLearningPathsApi(accessToken: string): Promise<LearningPathOut[]> {
  return request<LearningPathOut[]>("/api/learning-paths", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createLearningPathApi(accessToken: string, payload: { title: string; description?: string; target_role?: string; course_ids?: string[] }): Promise<LearningPathOut> {
  return request<LearningPathOut>("/api/learning-paths", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}

// ─── NEW: Notifications ────────────────────────────────────────────────────────

export type NotificationOut = { id: string; type: string; title: string; message: string; data_json: Record<string, unknown>; is_read: boolean; created_at: string; };
export async function listNotificationsApi(accessToken: string, skip = 0, limit = 20): Promise<NotificationOut[]> {
  return request<NotificationOut[]>(`/api/notifications?skip=${skip}&limit=${limit}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function markNotificationReadApi(accessToken: string, notifId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/notifications/${notifId}/read`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function markAllNotificationsReadApi(accessToken: string): Promise<{ message: string }> {
  // Mark all: iterate over unread or use bulk endpoint if available
  return request<{ message: string }>("/api/notifications/read-all", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: Departments ─────────────────────────────────────────────────────────

export type DepartmentOut = { id: string; name: string; description: string; created_at: string; };
export async function listDepartmentsApi(accessToken: string): Promise<DepartmentOut[]> {
  return request<DepartmentOut[]>("/api/departments", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createDepartmentApi(accessToken: string, payload: { name: string; description?: string }): Promise<DepartmentOut> {
  return request<DepartmentOut>("/api/departments", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}

// ─── NEW: Badge Definitions ────────────────────────────────────────────────────

export type BadgeDefinitionOut = { id: string; name: string; icon: string; description: string; criteria: Record<string, unknown>; is_global: boolean; created_at: string; };
export async function listBadgeDefinitionsApi(accessToken: string): Promise<BadgeDefinitionOut[]> {
  return request<BadgeDefinitionOut[]>("/api/badge-definitions", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createBadgeDefinitionApi(accessToken: string, payload: { name: string; icon?: string; description?: string; criteria?: Record<string, unknown> }): Promise<BadgeDefinitionOut> {
  return request<BadgeDefinitionOut>("/api/badge-definitions", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}

// ─── NEW: XP History ──────────────────────────────────────────────────────────

export type XpTransactionOut = { id: string; action: string; xp_earned: number; reference_type: string; created_at: string; };
export async function listXpHistoryApi(accessToken: string, skip = 0, limit = 30): Promise<XpTransactionOut[]> {
  return request<XpTransactionOut[]>(`/api/gamification/xp-history?skip=${skip}&limit=${limit}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: Adaptive Learning Rules ────────────────────────────────────────────

export type AdaptiveRuleOut = { id: string; name: string; trigger_condition: Record<string, unknown>; action: Record<string, unknown>; is_active: boolean; created_at: string; };
export async function listAdaptiveRulesApi(accessToken: string): Promise<AdaptiveRuleOut[]> {
  return request<AdaptiveRuleOut[]>("/api/adaptive-rules", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createAdaptiveRuleApi(accessToken: string, payload: { name: string; trigger_condition: Record<string, unknown>; action: Record<string, unknown> }): Promise<AdaptiveRuleOut> {
  return request<AdaptiveRuleOut>("/api/adaptive-rules", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}
export async function deleteAdaptiveRuleApi(accessToken: string, ruleId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/adaptive-rules/${ruleId}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: AI Usage ─────────────────────────────────────────────────────────────

export type AiUsageSummaryOut = { total_calls: number; total_tokens: number; cache_hits: number; cache_hit_rate: number; by_feature: Record<string, number>; by_model: Record<string, number>; };
export async function getAiUsageSummaryApi(accessToken: string): Promise<AiUsageSummaryOut> {
  return request<AiUsageSummaryOut>("/api/ai/usage", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export type AiCacheEntryOut = { id: string; content_type: string; model_used: string; tokens_used: number; expires_at: string | null; created_at: string; };
export async function listAiCacheApi(accessToken: string, skip = 0, limit = 20): Promise<AiCacheEntryOut[]> {
  return request<AiCacheEntryOut[]>(`/api/ai/cache?skip=${skip}&limit=${limit}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function generateAiQuestionsApi(accessToken: string, payload: { topic: string; count?: number; difficulty?: string }): Promise<{ generated: number; questions: QuestionBankOut[] }> {
  return request<{ generated: number; questions: QuestionBankOut[] }>("/api/ai/generate-questions", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}

// ─── NEW: Webhook Delivery Logs ────────────────────────────────────────────────

export type WebhookDeliveryLogOut = { id: string; webhook_id: string; event_type: string; payload_json: Record<string, unknown>; status_code: number | null; response_body: string | null; is_success: boolean; attempt_count: number; created_at: string; };
export async function listWebhookDeliveryLogsApi(accessToken: string, webhookId: string): Promise<WebhookDeliveryLogOut[]> {
  return request<WebhookDeliveryLogOut[]>(`/api/integrations/webhooks/${webhookId}/logs`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createWebhookNewApi(accessToken: string, payload: { name: string; target_url: string; events: string[]; secret?: string }): Promise<WebhookOut> {
  return request<WebhookOut>("/api/integrations/webhooks", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}
export async function listWebhooksNewApi(accessToken: string): Promise<WebhookOut[]> {
  return request<WebhookOut[]>("/api/integrations/webhooks", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function deleteWebhookNewApi(accessToken: string, webhookId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/integrations/webhooks/${webhookId}`, {
    method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: External Integrations ───────────────────────────────────────────────

export type ExternalIntegrationOut = { id: string; name: string; provider: string; config_json: Record<string, unknown>; is_active: boolean; created_at: string; };
export async function listExternalIntegrationsApi(accessToken: string): Promise<ExternalIntegrationOut[]> {
  return request<ExternalIntegrationOut[]>("/api/integrations/external", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createExternalIntegrationApi(accessToken: string, payload: { name: string; provider: string; config_json?: Record<string, unknown> }): Promise<ExternalIntegrationOut> {
  return request<ExternalIntegrationOut>("/api/integrations/external", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}

// ─── NEW: Analytics Snapshots ─────────────────────────────────────────────────

export type AnalyticsSnapshotOut = { id: string; snapshot_date: string; active_users: number; total_completions: number; avg_score: number; content_items: number; ai_jobs_run: number; created_at: string; };
export async function listAnalyticsSnapshotsApi(accessToken: string, limit = 30): Promise<AnalyticsSnapshotOut[]> {
  return request<AnalyticsSnapshotOut[]>(`/api/analytics/snapshots?limit=${limit}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}

// ─── NEW: Leave Types ─────────────────────────────────────────────────────────

export type LeaveTypeOut = { id: string; name: string; days_allowed: number; carry_forward: boolean; created_at: string; };
export async function listLeaveTypesApi(accessToken: string): Promise<LeaveTypeOut[]> {
  return request<LeaveTypeOut[]>("/api/leave-types", {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
export async function createLeaveTypeApi(accessToken: string, payload: { name: string; days_allowed: number; carry_forward?: boolean }): Promise<LeaveTypeOut> {
  return request<LeaveTypeOut>("/api/leave-types", {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify(payload),
  });
}

// ── MongoDB Admin Courses ─────────────────────────────────────────────────────

export type CourseModuleDoc = {
  title: string;
  description?: string;
  duration?: string;
  order?: number;
  lessons?: string[];
};

export type CourseAssignmentDoc = {
  title: string;
  description?: string;
  dueDate?: string | null;
  status?: string;
  maxScore?: number;
};

export type CourseQuizDoc = {
  title: string;
  questions?: number;
  passingScore?: number;
  timeLimit?: number;
};

export type MongoCourseDoc = {
  _id?: string;
  title: string;
  description: string;
  category: string;
  level: string;
  duration: string;
  instructor: string;
  thumbnail?: string;
  modules: CourseModuleDoc[];
  assignments: CourseAssignmentDoc[];
  quizzes: CourseQuizDoc[];
  rating: number;
  enrolledUsers: number;
  status: string;
  isRecommended: boolean;
  isNew: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type MongoCourseStatsDoc = {
  total: number;
  published: number;
  draft: number;
  archived: number;
  by_category: { Sales: number; Support: number; Operations: number };
};

export async function mongoListCoursesApi(params?: { category?: string; status?: string; search?: string }): Promise<MongoCourseDoc[]> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<MongoCourseDoc[]>(`/api/mongo/courses${query}`, { method: "GET" });
}

export async function mongoGetCourseStatsApi(): Promise<MongoCourseStatsDoc> {
  return request<MongoCourseStatsDoc>("/api/mongo/courses/stats", { method: "GET" });
}

export async function mongoGetCourseApi(id: string): Promise<MongoCourseDoc> {
  return request<MongoCourseDoc>(`/api/mongo/courses/${id}`, { method: "GET" });
}

export async function mongoCreateCourseApi(body: Omit<MongoCourseDoc, "_id" | "createdAt" | "updatedAt">): Promise<MongoCourseDoc> {
  return request<MongoCourseDoc>("/api/mongo/courses", { method: "POST", body: JSON.stringify(body) });
}

export async function mongoUpdateCourseApi(id: string, body: Omit<MongoCourseDoc, "_id" | "createdAt" | "updatedAt">): Promise<MongoCourseDoc> {
  return request<MongoCourseDoc>(`/api/mongo/courses/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export async function mongoPatchCourseApi(id: string, body: Partial<MongoCourseDoc>): Promise<MongoCourseDoc> {
  return request<MongoCourseDoc>(`/api/mongo/courses/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function mongoDeleteCourseApi(id: string): Promise<void> {
  await request<void>(`/api/mongo/courses/${id}`, { method: "DELETE" });
}

export async function mongoSeedCoursesApi(force = false): Promise<{ message: string; inserted_count: number; seeded: boolean }> {
  return request(`/api/mongo/courses/seed?force=${force}`, { method: "POST" });
}

// ── User Profiles ──────────────────────────────────────────────────────────────

export type UserProfileAddress = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export type UserProfileLinks = {
  linkedin?: string;
  github?: string;
  website?: string;
  twitter?: string;
};

export type UserProfileDoc = {
  _id?: string;
  user_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  department?: string;
  title?: string;
  address?: UserProfileAddress;
  links?: UserProfileLinks;
  updated_at?: string;
};

export async function mongoGetProfileApi(userId: string): Promise<UserProfileDoc> {
  return request<UserProfileDoc>(`/api/mongo/profile/${encodeURIComponent(userId)}`, { method: "GET" });
}

export async function mongoUpsertProfileApi(
  userId: string,
  body: Omit<UserProfileDoc, "_id" | "user_id" | "updated_at">
): Promise<UserProfileDoc> {
  return request<UserProfileDoc>(`/api/mongo/profile/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ── Learning Flow Analytics ───────────────────────────────────────────────────

export type LfCourseDetail = {
  course_id: string;
  course_title: string;
  category: string;
  modules_total: number;
  modules_done: number;
};

export type LfEmployeePerformance = {
  employee_id: string;
  employee_name: string;
  department: string;
  email: string;
  modules_assigned: number;
  modules_completed: number;
  completion_pct: number;
  avg_score: number;
  status: "Excellent" | "Moderate" | "Needs Attention";
  last_active: string;
  courses: LfCourseDetail[];
  kpi?: number | null;
  pitch_score?: number | null;
  objection_score?: number | null;
  escalation_score?: number | null;
  tp_status?: string;
  action_required?: string;
};

export type LfManagerCourse = { title: string; status: string; category: string };

export type LfManagerActivity = {
  manager_id: string;
  manager_name: string;
  job_title: string;
  department: string;
  email: string;
  courses_created: number;
  courses_edited: number;
  courses_published: number;
  approval_pending: number;
  last_activity: string;
  courses: LfManagerCourse[];
};

export type LfTeamMember = { name: string; completion: number; status: string };

export type LfTeamPerformance = {
  team_name: string;
  total_learners: number;
  completion_rate: number;
  avg_score: number;
  ranking: number;
  members: LfTeamMember[];
};

export type LfIntervention = {
  employee: string;
  department: string;
  completion_pct: number;
  recommendation: string;
};

export type LfAIInsights = {
  delayed_learners_count: number;
  delayed_learners: LfEmployeePerformance[];
  top_performing_teams: { team: string; completion: number; score: number }[];
  most_active_managers: { name: string; courses: number; last_active: string }[];
  recommended_interventions: LfIntervention[];
  total_employees: number;
  avg_completion: number;
  avg_score: number;
  courses_count: number;
  published_courses: number;
};

export type LearningFlowAnalytics = {
  _id?: string;
  type: string;
  employee_performance: LfEmployeePerformance[];
  manager_activity: LfManagerActivity[];
  team_performance: LfTeamPerformance[];
  ai_insights: LfAIInsights;
  synced_at: string;
  courses_synced: number;
  users_synced: number;
};

export async function getLearningFlowAnalyticsApi(force = false): Promise<LearningFlowAnalytics> {
  return request<LearningFlowAnalytics>(
    `/api/mongo/learning-flow/analytics${force ? "?force_sync=true" : ""}`,
    { method: "GET" }
  );
}

export type LfDebugResult = {
  team_progress: {
    count: number;
    docs: { _id: string; name: string; role: string; completion: number | null; kpi: number | null; status: string }[];
  };
  users: { count: number; employee_count: number; names: string[] };
  courses: { count: number };
};

export async function getLearningFlowDebugApi(): Promise<LfDebugResult> {
  return request<LfDebugResult>("/api/mongo/learning-flow/debug", { method: "GET" });
}

export async function syncLearningFlowApi(): Promise<{
  message: string; synced_at: string; courses_synced: number; users_synced: number;
}> {
  return request(`/api/mongo/learning-flow/sync`, { method: "POST" });
}

// ── Assessment Analytics ───────────────────────────────────────────────────

export type AsAssessmentRow = {
  assessment_id: string;
  course_id: string;
  course_title: string;
  course_category: string;
  course_level: string;
  assessment_name: string;
  question_count: number;
  passing_score: number;
  time_limit_mins: number;
  attempts: number;
  avg_score: number;
  pass_rate: number;
  passed_count: number;
  failed_count: number;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Active" | "Pending" | "Needs Review";
  last_attempt_at: string;
  retest_candidates: string[];
  questions?: AsAIQuestion[];
  created_manually?: boolean;
};

export type AsKPIs = {
  total_courses: number;
  courses_with_assessments: number;
  total_assessments: number;
  pending_assessments: number;
  avg_pass_rate: number;
  failed_learners: number;
  total_attempts: number;
};

export type AsRetestLearner = {
  name: string;
  status: string;
  completion: number | null;
  kpi: number | null;
  courses: string[];
};

export type AsSuggestion = {
  assessment_name: string;
  course_title: string;
  pass_rate: number;
  avg_score: number;
  suggestion: string;
};

export type AsAIInsights = {
  low_performing_courses: AsAssessmentRow[];
  hardest_assessments: AsAssessmentRow[];
  learners_needing_retest: AsRetestLearner[];
  suggested_improvements: AsSuggestion[];
};

export type AssessmentAnalytics = {
  type: string;
  kpis: AsKPIs;
  assessments: AsAssessmentRow[];
  ai_insights: AsAIInsights;
  synced_at: string;
  courses_synced: number;
  tp_synced: number;
};

export type AsAIQuestion = {
  id: string;
  question: string;
  options: string[];
  answer_index: number;
  difficulty: string;
};

export type AsGenerateAIQuizResult = {
  course_id: string;
  category: string;
  generated: number;
  questions: AsAIQuestion[];
};

export async function getAssessmentAnalyticsApi(force = false): Promise<AssessmentAnalytics> {
  return request<AssessmentAnalytics>(
    `/api/mongo/assessment-analytics/analytics${force ? "?force_sync=true" : ""}`,
    { method: "GET" }
  );
}

export async function syncAssessmentAnalyticsApi(): Promise<{ message: string; synced_at: string; assessments: number; courses: number }> {
  return request(`/api/mongo/assessment-analytics/sync`, { method: "POST" });
}

export async function createAssessmentEntryApi(body: {
  course_id: string; title: string; question_count?: number;
  passing_score?: number; time_limit_mins?: number; questions?: AsAIQuestion[];
}): Promise<{ message: string; assessment: AsAssessmentRow }> {
  return request(`/api/mongo/assessment-analytics/create`, { method: "POST", body: JSON.stringify(body) });
}

export async function generateAIQuizApi(body: { course_id: string; category: string; count?: number }): Promise<AsGenerateAIQuizResult> {
  return request(`/api/mongo/assessment-analytics/generate-ai-quiz`, { method: "POST", body: JSON.stringify(body) });
}

// ─── AI Learning Studio ────────────────────────────────────────────────────

export interface AiStudioLesson {
  title: string;
  content_text: string;
  summary: string;
  activities: string[];
  content_type: string;
}

export interface AiStudioQuestion {
  question: string;
  options: { a: string; b: string; c: string; d: string };
  correct_index: number;
  explanation: string;
}

export interface AiStudioQuiz {
  title: string;
  passing_score: number;
  questions: AiStudioQuestion[];
}

export interface AiStudioAssignment {
  title: string;
  description: string;
  guidelines: string;
}

export interface AiStudioModule {
  title: string;
  description: string;
  section_title: string;
  lessons: AiStudioLesson[];
  quiz: AiStudioQuiz;
  assignment: AiStudioAssignment;
}

export interface AiStudioCourse {
  title: string;
  description: string;
  objectives: string;
  category: string;
  level: string;
  estimated_hours: number;
  tags: string[];
  modules: AiStudioModule[];
}

export interface AiStudioDraft {
  draft_id: string;
  title: string;
  status: string;
  inputs: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export async function generateAiModuleApi(inputs: {
  topic: string; audience_level: string; duration_weeks: number;
  num_lessons: number; language: string; tone: string;
  learning_goal: string; additional_prompt: string;
}): Promise<{ success: boolean; data: AiStudioCourse; ai_generated: boolean }> {
  return request(`/api/mongo/ai-studio/generate`, { method: "POST", body: JSON.stringify(inputs) });
}

export async function regenerateLessonApi(body: {
  lesson_title: string; topic: string; tone: string;
  language: string; additional_instructions?: string;
}): Promise<{ success: boolean; lesson: AiStudioLesson }> {
  return request(`/api/mongo/ai-studio/regenerate-lesson`, { method: "POST", body: JSON.stringify(body) });
}

export async function rewriteContentApi(body: {
  content: string; new_tone: string; language?: string;
}): Promise<{ success: boolean; content: string }> {
  return request(`/api/mongo/ai-studio/rewrite`, { method: "POST", body: JSON.stringify(body) });
}

export async function translateContentApi(body: {
  content: string; target_language: string;
}): Promise<{ success: boolean; content: string }> {
  return request(`/api/mongo/ai-studio/translate`, { method: "POST", body: JSON.stringify(body) });
}

export async function saveAiStudioDraftApi(body: {
  title: string; generated_data: AiStudioCourse;
  inputs: Record<string, unknown>; draft_id?: string;
}): Promise<{ success: boolean; draft_id: string; message: string }> {
  return request(`/api/mongo/ai-studio/save-draft`, { method: "POST", body: JSON.stringify(body) });
}

export async function listAiStudioDraftsApi(): Promise<{ drafts: AiStudioDraft[] }> {
  return request(`/api/mongo/ai-studio/drafts`, { method: "GET" });
}

export async function getAiStudioDraftApi(draftId: string): Promise<{
  draft_id: string; title: string;
  generated_data: AiStudioCourse; inputs: Record<string, unknown>;
}> {
  return request(`/api/mongo/ai-studio/drafts/${draftId}`, { method: "GET" });
}

export async function deleteAiStudioDraftApi(draftId: string): Promise<{ success: boolean; message: string }> {
  return request(`/api/mongo/ai-studio/drafts/${draftId}`, { method: "DELETE" });
}

// ─── Access Control Centre ─────────────────────────────────────────────────

export interface AcPermission {
  view: boolean; create: boolean; edit: boolean; delete: boolean; approve: boolean;
}
export interface AcPermissions { [resource: string]: AcPermission }

export interface AcRole {
  role_id: string; name: string; description: string;
  color: string; icon: string; parent_id: string | null; order: number;
  permissions: AcPermissions;
  scope: { type: string; departments: string[]; inherited_from: string | null };
  metadata: { is_system_role: boolean; is_locked: boolean; tags: string[]; user_count: number };
  created_at: string; updated_at: string;
}

export interface AcTreeNode {
  role_id: string; name: string; color: string; icon: string;
  user_count: number; is_system_role: boolean; is_locked: boolean;
  children: AcTreeNode[];
}

export interface AcResource { id: string; label: string; icon: string }

export interface AcRolesData {
  roles: AcRole[]; tree: AcTreeNode[]; resources: AcResource[];
}

export interface AcAuditEntry {
  action: string; role_id: string; role_name: string; changed_by: string;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
  timestamp: string; severity: string; ip: string;
}

export interface AcSecurityAlert {
  alert_id: string; type: string; severity: string;
  title: string; description: string;
  role_id: string | null; created_at: string; resolved: boolean;
}

export interface AcAnalytics {
  total_roles: number; total_users: number; most_used_role: string;
  permission_coverage: Record<string, number>;
  role_distribution: Array<{ role: string; role_id: string; count: number; color: string }>;
  activity_last_30d: number; system_roles: number; custom_roles: number; locked_roles: number;
}

export async function acGetRolesApi(): Promise<AcRolesData> {
  return request(`/api/mongo/access-control/roles`, { method: "GET" });
}
export async function acGetRoleApi(roleId: string): Promise<AcRole> {
  return request(`/api/mongo/access-control/roles/${roleId}`, { method: "GET" });
}
export async function acCreateRoleApi(body: {
  name: string; description?: string; color?: string; icon?: string; parent_id?: string; tags?: string[];
}): Promise<{ success: boolean; role: AcRole }> {
  return request(`/api/mongo/access-control/roles`, { method: "POST", body: JSON.stringify(body) });
}
export async function acUpdateRoleApi(roleId: string, body: {
  name?: string; description?: string; color?: string; icon?: string; tags?: string[];
}): Promise<{ success: boolean; role: AcRole }> {
  return request(`/api/mongo/access-control/roles/${roleId}`, { method: "PUT", body: JSON.stringify(body) });
}
export async function acDeleteRoleApi(roleId: string): Promise<{ success: boolean; message: string }> {
  return request(`/api/mongo/access-control/roles/${roleId}`, { method: "DELETE" });
}
export async function acUpdatePermissionsApi(roleId: string, body: {
  permissions: AcPermissions; changed_by?: string;
}): Promise<{ success: boolean; role: AcRole; changes: number }> {
  return request(`/api/mongo/access-control/roles/${roleId}/permissions`, { method: "PATCH", body: JSON.stringify(body) });
}
export async function acMoveRoleApi(roleId: string, newParentId: string | null): Promise<{ success: boolean; message: string }> {
  return request(`/api/mongo/access-control/roles/${roleId}/move`, { method: "PATCH", body: JSON.stringify({ new_parent_id: newParentId }) });
}
export async function acGetAuditApi(limit?: number, roleId?: string): Promise<{ entries: AcAuditEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  if (roleId) params.set("role_id", roleId);
  return request(`/api/mongo/access-control/audit?${params}`, { method: "GET" });
}
export async function acGetAlertsApi(): Promise<{ alerts: AcSecurityAlert[]; counts: Record<string, number> }> {
  return request(`/api/mongo/access-control/alerts`, { method: "GET" });
}
export async function acResolveAlertApi(alertId: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/access-control/alerts/${alertId}/resolve`, { method: "PATCH" });
}
export async function acGetAnalyticsApi(): Promise<AcAnalytics> {
  return request(`/api/mongo/access-control/analytics`, { method: "GET" });
}
export async function acExportRolesApi(): Promise<{ version: string; exported_at: string; roles: AcRole[] }> {
  return request(`/api/mongo/access-control/export`, { method: "GET" });
}
export async function acSeedRolesApi(): Promise<{ seeded: number; message: string }> {
  return request(`/api/mongo/access-control/seed`, { method: "POST" });
}

// ─── Admin Audit Logs Workspace ────────────────────────────────────────────────

export type AdminAuditLog = {
  log_id: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  user_avatar: string;
  action: string;
  action_category: string;
  page: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  duration_ms: number;
  browser: string;
  os: string;
  device_type: string;
  ip_address: string;
  status: string;
  severity: string;
  tenant_id: string;
};

export type AdminAuditKpis = {
  total_events: number;
  events_today: number;
  events_trend: number;
  active_users: number;
  failed_logins_24h: number;
  avg_session_sec: number;
  active_alerts: number;
  critical_alerts: number;
};

export type AdminSecurityAlert = {
  alert_id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  user_email?: string;
  ip_address: string;
  timestamp: string;
  created_at: string;
  status: string;
  recommended_action: string;
};

export type AdminAuditAnalytics = {
  hourly_events: Array<{ hour: string; count: number }>;
  daily_events: Array<{ date: string; count: number }>;
  action_distribution: Array<{ action: string; count: number }>;
  status_distribution: Array<{ status: string; count: number }>;
  category_distribution: Array<{ category: string; count: number }>;
  top_users: Array<{ email: string; name: string; role: string; count: number }>;
};

export async function mongoAuditLogsApi(params: {
  page?: number;
  limit?: number;
  q?: string;
  date_from?: string;
  date_to?: string;
  user_role?: string;
  action?: string;
  status?: string;
  severity?: string;
  page_name?: string;
  sort_by?: string;
  sort_dir?: number;
}): Promise<{ logs: AdminAuditLog[]; total: number; page: number; limit: number; pages: number }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") qs.set(k, String(v));
  });
  return request(`/api/mongo/audit-logs?${qs}`, { method: "GET" });
}

export async function mongoAuditKpisApi(): Promise<AdminAuditKpis> {
  return request("/api/mongo/audit-logs/kpis", { method: "GET" });
}

export async function mongoAuditAnalyticsApi(): Promise<AdminAuditAnalytics> {
  return request("/api/mongo/audit-logs/analytics", { method: "GET" });
}

export async function mongoAuditLiveFeedApi(limit = 20): Promise<{ entries: AdminAuditLog[] }> {
  return request(`/api/mongo/audit-logs/live-feed?limit=${limit}`, { method: "GET" });
}

export async function mongoAuditAlertsApi(status?: string): Promise<{
  alerts: AdminSecurityAlert[];
  counts: { total: number; active: number; critical: number; high: number; medium: number; low: number };
}> {
  const q = status ? `?status=${status}` : "";
  return request(`/api/mongo/audit-logs/security-alerts${q}`, { method: "GET" });
}

export async function mongoAuditResolveAlertApi(alertId: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/audit-logs/security-alerts/${alertId}/resolve`, { method: "PATCH" });
}

export async function mongoAuditSeedApi(): Promise<{
  success: boolean; logs_seeded: number; alerts_seeded: number;
}> {
  return request("/api/mongo/audit-logs/seed", { method: "POST" });
}

export async function mongoAuditGenerateApi(): Promise<{ success: boolean; entry: AdminAuditLog }> {
  return request("/api/mongo/audit-logs/generate", { method: "POST" });
}

export function getAuditExportUrl(params: {
  date_from?: string; date_to?: string; user_role?: string; action?: string; status?: string;
}): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
  return `${API_BASE_URL}/api/mongo/audit-logs/export/csv?${qs}`;
}

// ─── Knowledge Workspace Types ─────────────────────────────────────────────────
export type KwCourse = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  modules_count: number;
  enrollments_count: number;
  category: string;
  level: string;
};

export type KwModule = {
  id: string;
  course_id: string;
  course_title: string;
  title: string;
  order: number;
  lessons_count: number;
};

export type KwLesson = {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  type: string;
  duration_minutes: number;
  order: number;
};

export type KwAssessment = {
  id: string;
  course_id: string;
  course_title: string;
  title: string;
  type: string;
  questions_count: number;
  max_score: number;
  pass_score: number;
  created_at: string;
};

export type KwContentItem = {
  id: string;
  title: string;
  type: string;
  tags: string[];
  size_kb: number;
  uploaded_by: string;
  created_at: string;
  description: string;
  url: string;
};

export type KwArticle = {
  id: string;
  title: string;
  category: string;
  content: string;
  author: string;
  views: number;
  helpful: number;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type KwCertificate = {
  id: string;
  title: string;
  course_id: string;
  course_title: string;
  issued_to: string;
  issued_at: string;
  expires_at: string;
  status: string;
  template: string;
};

export type KwCollabItem = {
  id: string;
  title: string;
  type: string;
  author: string;
  participants: string[];
  status: string;
  created_at: string;
  description: string;
};

export type KwOverview = {
  total_courses: number;
  published_courses: number;
  draft_courses: number;
  archived_courses: number;
  total_modules: number;
  total_lessons: number;
  total_assessments: number;
  total_content_items: number;
  total_kb_articles: number;
  total_certificates: number;
  total_collaborations: number;
  enrollments_total: number;
};

export type KwAnalytics = {
  courses_by_status: Record<string, number>;
  courses_by_category: Record<string, number>;
  courses_by_level: Record<string, number>;
  content_by_type: Record<string, number>;
  kb_by_category: Record<string, number>;
  monthly_courses: { month: string; count: number }[];
};

// ─── Knowledge Workspace API ────────────────────────────────────────────────────
export async function kwSeedApi(): Promise<{ success: boolean; seeded: Record<string, number> }> {
  return request("/api/mongo/knowledge-workspace/seed", { method: "POST" });
}

export async function kwOverviewApi(): Promise<KwOverview> {
  return request("/api/mongo/knowledge-workspace/overview", { method: "GET" });
}

export async function kwCoursesApi(params?: {
  status?: string; search?: string; page?: number; limit?: number;
}): Promise<{ courses: KwCourse[]; total: number; page: number; pages: number }> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.set(k, String(v)); });
  return request(`/api/mongo/knowledge-workspace/courses?${qs}`, { method: "GET" });
}

export async function kwModulesApi(courseId?: string): Promise<{ modules: KwModule[] }> {
  const q = courseId ? `?course_id=${courseId}` : "";
  return request(`/api/mongo/knowledge-workspace/curriculum/modules${q}`, { method: "GET" });
}

export async function kwLessonsApi(moduleId?: string): Promise<{ lessons: KwLesson[] }> {
  const q = moduleId ? `?module_id=${moduleId}` : "";
  return request(`/api/mongo/knowledge-workspace/curriculum/lessons${q}`, { method: "GET" });
}

export async function kwAssessmentsApi(courseId?: string): Promise<{ assessments: KwAssessment[] }> {
  const q = courseId ? `?course_id=${courseId}` : "";
  return request(`/api/mongo/knowledge-workspace/assessments${q}`, { method: "GET" });
}

export async function kwAnalyticsApi(): Promise<KwAnalytics> {
  return request("/api/mongo/knowledge-workspace/analytics", { method: "GET" });
}

export async function kwContentListApi(params?: {
  type?: string; search?: string; page?: number; limit?: number;
}): Promise<{ items: KwContentItem[]; total: number }> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.set(k, String(v)); });
  return request(`/api/mongo/knowledge-workspace/content-library?${qs}`, { method: "GET" });
}

export async function kwContentCreateApi(data: Partial<KwContentItem>): Promise<KwContentItem> {
  return request("/api/mongo/knowledge-workspace/content-library", { method: "POST", body: JSON.stringify(data) });
}

export async function kwContentDeleteApi(id: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/knowledge-workspace/content-library/${id}`, { method: "DELETE" });
}

export async function kwArticlesApi(params?: {
  category?: string; search?: string; status?: string;
}): Promise<{ articles: KwArticle[]; total: number }> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.set(k, String(v)); });
  return request(`/api/mongo/knowledge-workspace/knowledge-base?${qs}`, { method: "GET" });
}

export async function kwArticleCreateApi(data: Partial<KwArticle>): Promise<KwArticle> {
  return request("/api/mongo/knowledge-workspace/knowledge-base", { method: "POST", body: JSON.stringify(data) });
}

export async function kwArticleDeleteApi(id: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/knowledge-workspace/knowledge-base/${id}`, { method: "DELETE" });
}

export async function kwCertificatesApi(): Promise<{ certificates: KwCertificate[]; total: number }> {
  return request("/api/mongo/knowledge-workspace/certificates", { method: "GET" });
}

export async function kwCertificateCreateApi(data: Partial<KwCertificate>): Promise<KwCertificate> {
  return request("/api/mongo/knowledge-workspace/certificates", { method: "POST", body: JSON.stringify(data) });
}

export async function kwCollaborationApi(): Promise<{ items: KwCollabItem[]; total: number }> {
  return request("/api/mongo/knowledge-workspace/collaboration", { method: "GET" });
}

export async function kwCollaborationCreateApi(data: Partial<KwCollabItem>): Promise<KwCollabItem> {
  return request("/api/mongo/knowledge-workspace/collaboration", { method: "POST", body: JSON.stringify(data) });
}

export async function kwCollaborationUpdateStatusApi(id: string, status: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/knowledge-workspace/collaboration/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ─── Performance Workspace Types ───────────────────────────────────────────────

export type PerfOverview = {
  active_learners: number; active_learners_trend: number;
  completion_rate: number; completion_rate_trend: number;
  avg_quiz_score: number; avg_quiz_score_trend: number;
  total_revenue: number; total_revenue_trend: number;
  new_enrollments: number; new_enrollments_trend: number;
  current_dau: number; active_alerts: number;
  trend_data: Array<{ month: string; revenue: number; enrollments: number; completions: number }>;
  score_distribution: { "90-100": number; "80-89": number; "70-79": number; "60-69": number; below_60: number };
};

export type PerfLearner = {
  learner_id: string; name: string; email: string; department: string;
  completion_pct: number; avg_quiz_score: number; certificates: number;
  last_active: string; status: string; courses_enrolled: number;
};

export type PerfLearnerPerformance = {
  learners: PerfLearner[]; total: number; at_risk_count: number;
  at_risk: PerfLearner[]; avg_quiz_score: number; avg_completion: number;
  certificates_total: number;
  status_distribution: { completed: number; in_progress: number; not_started: number; at_risk: number };
  by_department: Record<string, { count: number; avg_score: number }>;
  score_distribution: Record<string, number>;
};

export type PerfInstructor = {
  instructor_id: string; name: string; email: string; department: string;
  courses_created: number; avg_rating: number; total_students: number;
  completion_rate: number; avg_course_score: number; revenue_generated: number;
  last_active: string; status: string;
};

export type PerfInstructorPerformance = {
  instructors: PerfInstructor[]; total: number;
  avg_rating: number; avg_completion: number;
  top_instructors: PerfInstructor[]; low_performing: PerfInstructor[];
  rating_distribution: Record<string, number>;
};

export type PerfCourse = {
  course_id: string; title: string; category: string; level: string;
  instructor: string; enrollments: number; completions: number;
  completion_rate: number; avg_score: number; avg_rating: number;
  revenue: number; status: string; created_at: string;
  drop_off_rate: number; avg_time_hours: number;
};

export type PerfCoursePerformance = {
  courses: PerfCourse[]; total: number;
  avg_completion: number; avg_rating: number;
  popular_courses: PerfCourse[]; low_performing: PerfCourse[];
  by_category: Record<string, { count: number; avg_completion: number }>;
};

export type PerfAssessmentItem = {
  assessment_id: string; course_title: string; assessment_name: string;
  total_attempts: number; pass_rate: number; avg_score: number;
  failed_count: number; passed_count: number; difficulty: string;
};

export type PerfAssessmentPerformance = {
  assessments: PerfAssessmentItem[]; total: number;
  avg_pass_rate: number; avg_score: number; total_attempts: number;
  failed_learners: number; score_distribution: Record<string, number>;
  difficulty_breakdown: Record<string, { count: number; avg_pass_rate: number }>;
};

export type PerfEngagement = {
  dau_trend: Array<{ date: string; dau: number; wau: number; sessions: number }>;
  avg_session_minutes: number; bounce_rate: number; retention_7d: number;
  retention_30d: number; total_sessions_30d: number; peak_hours: Array<{ hour: number; sessions: number }>;
  feature_usage: Record<string, number>;
};

export type PerfRevenue = {
  total_revenue: number; current_month_revenue: number;
  total_refunds: number; total_refund_amount: number; refund_rate: number;
  monthly_data: Array<{ month: string; label: string; revenue: number; new_enrollments: number; renewals: number; refunds: number }>;
  revenue_by_course: Array<{ course: string; revenue: number }>;
};

export type PerfDepartmentReport = {
  department: string; team_count: number; avg_completion: number;
  avg_score: number; at_risk_count: number; certificates_issued: number;
  top_courses: string[]; revenue_contribution: number;
};

export type PerfBenchmark = {
  benchmark_id: string; kpi_name: string; current_value: number;
  target_value: number; unit: string; period: string;
  status: "on_track" | "at_risk" | "behind"; trend: number;
};

export type PerfAlert = {
  alert_id: string; type: string; severity: "critical" | "high" | "medium" | "low";
  title: string; description: string; entity_type: string; entity_name: string;
  metric_value: number; threshold: number; created_at: string; resolved: boolean;
};

export type PerfAiInsights = {
  dropout_risk: Array<{ learner: string; department: string; risk_score: number; reason: string }>;
  recommendations: Array<{ type: string; title: string; description: string; impact: string }>;
  revenue_forecast: Array<{ month: string; predicted: number; confidence: number }>;
  kpi_analysis: Array<{ kpi: string; insight: string; action: string }>;
};

// ─── Performance Workspace API ──────────────────────────────────────────────────

export async function perfSeedApi(): Promise<{ success: boolean; seeded: Record<string, number> }> {
  return request("/api/mongo/perf-workspace/seed", { method: "POST" });
}

export async function perfOverviewApi(): Promise<PerfOverview> {
  return request("/api/mongo/perf-workspace/overview", { method: "GET" });
}

export async function perfLearnerPerformanceApi(params?: {
  department?: string; status?: string; search?: string; page?: number; limit?: number;
}): Promise<PerfLearnerPerformance> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.set(k, String(v)); });
  return request(`/api/mongo/perf-workspace/learner-performance?${qs}`, { method: "GET" });
}

export async function perfInstructorPerformanceApi(): Promise<PerfInstructorPerformance> {
  return request("/api/mongo/perf-workspace/instructor-performance", { method: "GET" });
}

export async function perfCoursePerformanceApi(params?: {
  category?: string; status?: string;
}): Promise<PerfCoursePerformance> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.set(k, String(v)); });
  return request(`/api/mongo/perf-workspace/course-performance?${qs}`, { method: "GET" });
}

export async function perfAssessmentPerformanceApi(): Promise<PerfAssessmentPerformance> {
  return request("/api/mongo/perf-workspace/assessment-performance", { method: "GET" });
}

export async function perfEngagementApi(): Promise<PerfEngagement> {
  return request("/api/mongo/perf-workspace/engagement", { method: "GET" });
}

export async function perfRevenueApi(): Promise<PerfRevenue> {
  return request("/api/mongo/perf-workspace/revenue", { method: "GET" });
}

export async function perfDepartmentReportsApi(): Promise<{ departments: PerfDepartmentReport[] }> {
  return request("/api/mongo/perf-workspace/department-reports", { method: "GET" });
}

export async function perfBenchmarksApi(): Promise<{ benchmarks: PerfBenchmark[]; summary: Record<string, number> }> {
  return request("/api/mongo/perf-workspace/benchmarks", { method: "GET" });
}

export async function perfAlertsApi(params?: {
  resolved?: boolean; severity?: string;
}): Promise<{ alerts: PerfAlert[]; counts: Record<string, number> }> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.set(k, String(v)); });
  return request(`/api/mongo/perf-workspace/alerts?${qs}`, { method: "GET" });
}

export async function perfResolveAlertApi(alertId: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/perf-workspace/alerts/${alertId}/resolve`, { method: "PATCH" });
}

export async function perfAiInsightsApi(): Promise<PerfAiInsights> {
  return request("/api/mongo/perf-workspace/ai-insights", { method: "GET" });
}

// ─── Adaptive Rules Workspace ──────────────────────────────────────────────────

export type AdaptiveRule = {
  rule_id: string; name: string; description: string; category: string;
  sub_category: string; priority: number; status: string; audience: string[];
  tone: string; formality: string; depth: string; allowed_topics: string[];
  restricted_topics: string[]; escalation_enabled: boolean; owner: string;
  tags: string[]; conditions: Array<{ if_field: string; operator: string; value: string; then_action: string }>;
  version: number; approval_status: string; created_at: string; updated_at: string;
  published_at: string | null; created_by: string; rejection_reason?: string;
};

export type AdaptiveRoleConfig = {
  role: string; display: string; tone: string; formality: string; depth: string;
  coaching_style: string; assessment_support: string; quiz_guidance: string;
  feedback_style: string; motivation_style: string; allowed_topics: string[];
  restricted_topics: string[]; escalation_enabled: boolean; response_limit: number;
  data_access: string; personalization: boolean; bias_check: boolean; updated_at: string;
};

export type AdaptiveGlobalConfig = {
  config_id: string; default_tone: string; safety_level: string; compliance_mode: string;
  default_language: string; escalation_triggers: string[]; restricted_topics: string[];
  ai_model: string; max_response_tokens: number; temperature: number;
  allow_code_generation: boolean; allow_external_links: boolean;
  fallback_to_human: boolean; session_memory: boolean; bias_detection: boolean;
  content_moderation: boolean; notification_email: string; updated_at: string;
};

export type AdaptiveTemplate = {
  template_id: string; type: string; name: string; description: string;
  content: string; variables: string[]; applicable_roles: string[];
  status: string; usage_count: number; created_at: string; updated_at: string; created_by: string;
};

export type AdaptiveAnalytics = {
  summary: {
    total_usage: number; avg_accuracy_rate: number; avg_satisfaction_score: number;
    total_escalations: number; total_failures: number; approval_rate: number;
  };
  top_rules: Array<{ rule_id: string; rule_name: string; category: string; total_usage: number; accuracy_rate: number; satisfaction_score: number }>;
  daily_usage: number[];
  category_usage: Array<{ category: string; usage: number }>;
  status_distribution: Array<{ status: string; count: number }>;
  rule_analytics: Array<Record<string, unknown>>;
  improvement_suggestions: Array<{ rule: string; suggestion: string; impact: string }>;
};

export type AdaptiveOverview = {
  kpis: { total_rules: number; active_rules: number; draft_rules: number; inactive_rules: number; pending_approval: number; total_usage: number };
  recent_changes: AdaptiveRule[];
};

export type AdaptiveWorkflow = {
  workflow: { draft: AdaptiveRule[]; pending: AdaptiveRule[]; approved: AdaptiveRule[]; published: AdaptiveRule[]; rejected: AdaptiveRule[] };
  counts: Record<string, number>;
};

export async function adaptiveSeedApi(): Promise<{ success: boolean; message: string; rules_count: number }> {
  return request("/api/mongo/adaptive-rules/seed", { method: "POST" });
}

export async function adaptiveOverviewApi(): Promise<AdaptiveOverview> {
  return request("/api/mongo/adaptive-rules/overview", { method: "GET" });
}

export async function adaptiveRulesApi(params?: {
  category?: string; sub_category?: string; status?: string; audience?: string; q?: string; page?: number; limit?: number;
}): Promise<{ rules: AdaptiveRule[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.set(k, String(v)); });
  return request(`/api/mongo/adaptive-rules/rules?${qs}`, { method: "GET" });
}

export async function adaptiveCreateRuleApi(body: Partial<AdaptiveRule>): Promise<{ success: boolean; rule_id: string }> {
  return request("/api/mongo/adaptive-rules/rules", { method: "POST", body: JSON.stringify(body) });
}

export async function adaptiveUpdateRuleApi(ruleId: string, body: Partial<AdaptiveRule>): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/rules/${ruleId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function adaptiveDeleteRuleApi(ruleId: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/rules/${ruleId}`, { method: "DELETE" });
}

export async function adaptiveToggleRuleApi(ruleId: string): Promise<{ success: boolean; new_status: string }> {
  return request(`/api/mongo/adaptive-rules/rules/${ruleId}/toggle`, { method: "PATCH" });
}

export async function adaptiveRoleConfigsApi(): Promise<{ role_configs: AdaptiveRoleConfig[] }> {
  return request("/api/mongo/adaptive-rules/role-configs", { method: "GET" });
}

export async function adaptiveUpdateRoleConfigApi(role: string, body: Partial<AdaptiveRoleConfig>): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/role-configs/${role}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function adaptiveGlobalConfigApi(): Promise<AdaptiveGlobalConfig> {
  return request("/api/mongo/adaptive-rules/global-config", { method: "GET" });
}

export async function adaptiveUpdateGlobalConfigApi(body: Partial<AdaptiveGlobalConfig>): Promise<{ success: boolean }> {
  return request("/api/mongo/adaptive-rules/global-config", { method: "PATCH", body: JSON.stringify(body) });
}

export async function adaptiveTemplatesApi(params?: { type?: string; status?: string; q?: string }): Promise<{ templates: AdaptiveTemplate[] }> {
  const qs = new URLSearchParams();
  if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== "") qs.set(k, String(v)); });
  return request(`/api/mongo/adaptive-rules/templates?${qs}`, { method: "GET" });
}

export async function adaptiveCreateTemplateApi(body: Partial<AdaptiveTemplate>): Promise<{ success: boolean; template_id: string }> {
  return request("/api/mongo/adaptive-rules/templates", { method: "POST", body: JSON.stringify(body) });
}

export async function adaptiveUpdateTemplateApi(templateId: string, body: Partial<AdaptiveTemplate>): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/templates/${templateId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function adaptiveDeleteTemplateApi(templateId: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/templates/${templateId}`, { method: "DELETE" });
}

export async function adaptiveAnalyticsApi(): Promise<AdaptiveAnalytics> {
  return request("/api/mongo/adaptive-rules/analytics", { method: "GET" });
}

export async function adaptiveWorkflowApi(status?: string): Promise<AdaptiveWorkflow> {
  const qs = status ? `?status=${status}` : "";
  return request(`/api/mongo/adaptive-rules/approval-workflow${qs}`, { method: "GET" });
}

export async function adaptiveSubmitRuleApi(ruleId: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/approval-workflow/${ruleId}/submit`, { method: "PATCH" });
}

export async function adaptiveApproveRuleApi(ruleId: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/approval-workflow/${ruleId}/approve`, { method: "PATCH" });
}

export async function adaptiveRejectRuleApi(ruleId: string, reason: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/approval-workflow/${ruleId}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) });
}

export async function adaptivePublishRuleApi(ruleId: string): Promise<{ success: boolean }> {
  return request(`/api/mongo/adaptive-rules/approval-workflow/${ruleId}/publish`, { method: "PATCH" });
}

export async function adaptiveVersionsApi(ruleId: string): Promise<{ versions: Array<{ version_id: string; rule_id: string; version: number; snapshot: Record<string, unknown>; changed_by: string; change_summary: string; created_at: string }> }> {
  return request(`/api/mongo/adaptive-rules/versions/${ruleId}`, { method: "GET" });
}

export async function adaptiveRollbackApi(ruleId: string, version: number): Promise<{ success: boolean; rolled_back_to: number }> {
  return request(`/api/mongo/adaptive-rules/versions/${ruleId}/rollback/${version}`, { method: "POST" });
}

export async function adaptiveTestRuleApi(body: { prompt: string; role: string; rule_id?: string }): Promise<{ simulated_response: string; applied_config: Record<string, unknown>; rule_applied: string }> {
  return request("/api/mongo/adaptive-rules/test-rule", { method: "POST", body: JSON.stringify(body) });
}

