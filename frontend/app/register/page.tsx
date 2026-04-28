"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerTenantApi } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    org_name: "",
    slug: "",
    admin_email: "",
    admin_password: "",
    admin_name: "",
    plan: "free",
    business_domain: "technology",
    industry: "Software",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ api_key: string; message: string } | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    if (key === "org_name" && !form.slug) {
      setForm(f => ({ ...f, org_name: value, slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await registerTenantApi(form);
      setSuccess({ api_key: res.api_key, message: res.message });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main style={st.root}>
        <div style={st.successCard}>
          <div style={st.successIcon}>🎉</div>
          <h2 style={st.successTitle}>Organization created!</h2>
          <p style={st.successSub}>{success.message}</p>
          <div style={st.apiKeyBox}>
            <div style={st.apiKeyLabel}>Your API Key — save it, shown only once:</div>
            <code style={st.apiKeyCode}>{success.api_key}</code>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button onClick={() => router.push("/login")} style={st.primaryBtn}>
              Go to Login →
            </button>
            <button onClick={() => { setSuccess(null); setForm({ org_name:"", slug:"", admin_email:"", admin_password:"", admin_name:"", plan:"free", business_domain:"technology", industry:"Software" }); }} style={st.ghostBtn}>
              Register Another
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={st.root}>
      {/* Left panel */}
      <div style={st.leftPanel}>
        <div style={st.leftContent}>
          <div style={st.logoRow}>
            <div style={st.logoIcon}>
              <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
                <path d="M10 32 L22 12 L34 32" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <path d="M15 25 L29 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="22" cy="12" r="3" fill="white" />
              </svg>
            </div>
            <span style={st.logoText}>AI-LMS</span>
          </div>
          <h1 style={st.heroTitle}>Start your free<br />AI-powered LMS</h1>
          <p style={st.heroSub}>
            Set up your organization in under 60 seconds. Get AI-generated courses,
            adaptive learning paths, and full multi-tenant isolation.
          </p>
          <div style={st.featureList}>
            {[
              { icon: "🤖", text: "AI course generation from blueprints" },
              { icon: "📊", text: "Real-time analytics & gamification" },
              { icon: "🔑", text: "API keys & embed SDK for any website" },
              { icon: "👥", text: "Role-based access: admin, manager, employee" },
            ].map(f => (
              <div key={f.text} style={st.featureItem}>
                <span style={st.featureIcon}>{f.icon}</span>
                <span style={st.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...st.blob, top: "-80px", right: "-80px" }} />
        <div style={{ ...st.blob, bottom: "-60px", left: "-60px", width: 280, height: 280 }} />
      </div>

      {/* Right panel — form */}
      <div style={st.rightPanel}>
        <div style={st.formCard}>
          <div style={st.formHeader}>
            <h2 style={st.formTitle}>Create your organization</h2>
            <p style={st.formSub}>Free forever • No credit card required</p>
          </div>

          <form onSubmit={onSubmit} style={st.form}>
            <div style={st.sectionLabel}>Organization Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Organization Name" required focus={focusedField === "org_name"} onFocus={() => setFocusedField("org_name")} onBlur={() => setFocusedField(null)}>
                <input type="text" required value={form.org_name} onChange={e => set("org_name", e.target.value)} style={{ ...st.input, ...(focusedField === "org_name" ? st.inputFocus : {}) }} placeholder="Acme Corp" />
              </Field>
              <Field label="URL Slug" required focus={focusedField === "slug"} onFocus={() => setFocusedField("slug")} onBlur={() => setFocusedField(null)}>
                <input type="text" required value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} style={{ ...st.input, ...(focusedField === "slug" ? st.inputFocus : {}) }} placeholder="acme-corp" />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Industry" focus={focusedField === "industry"} onFocus={() => setFocusedField("industry")} onBlur={() => setFocusedField(null)}>
                <input type="text" value={form.industry} onChange={e => set("industry", e.target.value)} style={{ ...st.input, ...(focusedField === "industry" ? st.inputFocus : {}) }} placeholder="Software" />
              </Field>
              <Field label="Business Domain" focus={focusedField === "business_domain"} onFocus={() => setFocusedField("business_domain")} onBlur={() => setFocusedField(null)}>
                <select value={form.business_domain} onChange={e => set("business_domain", e.target.value)} style={{ ...st.input, ...(focusedField === "business_domain" ? st.inputFocus : {}) }}>
                  {["technology","finance","healthcare","retail","education","manufacturing","consulting","other"].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </Field>
            </div>

            <div style={st.sectionLabel}>Plan</div>
            <div style={{ display: "flex", gap: 10 }}>
              {([["free","Free","Up to 50 users"],["pro","Pro","Up to 500 users"],["enterprise","Enterprise","Unlimited"]] as [string,string,string][]).map(([val, label, desc]) => (
                <div key={val} onClick={() => set("plan", val)} style={{ ...st.planCard, ...(form.plan === val ? st.planCardActive : {}) }}>
                  <div style={st.planLabel}>{label}</div>
                  <div style={st.planDesc}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ ...st.sectionLabel, marginTop: 4 }}>Admin Account</div>
            <Field label="Full Name" required focus={focusedField === "admin_name"} onFocus={() => setFocusedField("admin_name")} onBlur={() => setFocusedField(null)}>
              <input type="text" required value={form.admin_name} onChange={e => set("admin_name", e.target.value)} style={{ ...st.input, ...(focusedField === "admin_name" ? st.inputFocus : {}) }} placeholder="Jane Smith" />
            </Field>
            <Field label="Admin Email" required focus={focusedField === "admin_email"} onFocus={() => setFocusedField("admin_email")} onBlur={() => setFocusedField(null)}>
              <input type="email" required value={form.admin_email} onChange={e => set("admin_email", e.target.value)} style={{ ...st.input, ...(focusedField === "admin_email" ? st.inputFocus : {}) }} placeholder="jane@company.com" />
            </Field>
            <Field label="Admin Password" required focus={focusedField === "admin_password"} onFocus={() => setFocusedField("admin_password")} onBlur={() => setFocusedField(null)}>
              <input type="password" required minLength={8} value={form.admin_password} onChange={e => set("admin_password", e.target.value)} style={{ ...st.input, ...(focusedField === "admin_password" ? st.inputFocus : {}) }} placeholder="Min 8 characters" />
            </Field>

            {error && (
              <div style={st.errorBox}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} style={{ ...st.primaryBtn, opacity: loading ? 0.65 : 1, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span style={st.spinner} /> Creating organization…
                </span>
              ) : "Create Organization →"}
            </button>
          </form>

          <p style={st.loginLink}>
            Already have an account?{" "}
            <button onClick={() => router.push("/login")} style={st.linkBtn}>Sign in</button>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

function Field({ label, children, required, focus, onFocus, onBlur }: {
  label: string; children: React.ReactNode; required?: boolean;
  focus?: boolean; onFocus?: () => void; onBlur?: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }} onFocus={onFocus} onBlur={onBlur}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
        {label}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const PURPLE = "#4f46e5";
const st: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "100vh", background: "#f8fafc" },
  leftPanel: {
    flex: "0 0 42%", background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "48px 52px", position: "relative", overflow: "hidden",
  },
  leftContent: { position: "relative", zIndex: 1, color: "white", maxWidth: 400 },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 36 },
  logoIcon: { width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "0.04em" },
  heroTitle: { fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px", color: "white" },
  heroSub: { fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.78)", margin: "0 0 28px" },
  featureList: { display: "flex", flexDirection: "column", gap: 10 },
  featureItem: { display: "flex", alignItems: "center", gap: 10 },
  featureIcon: { fontSize: 18, flexShrink: 0 },
  featureText: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  blob: { position: "absolute", width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" },
  rightPanel: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 32px", overflowY: "auto" },
  formCard: { width: "100%", maxWidth: 500 },
  formHeader: { marginBottom: 24 },
  formTitle: { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" },
  formSub: { fontSize: 14, color: "#64748b", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8", marginBottom: -4 },
  input: { width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  inputFocus: { borderColor: PURPLE, boxShadow: "0 0 0 3px rgba(79,70,229,0.12)" },
  planCard: { flex: 1, padding: "10px 12px", borderRadius: 8, border: "2px solid #e2e8f0", cursor: "pointer", transition: "all 0.15s" },
  planCardActive: { borderColor: PURPLE, background: "#eef2ff" },
  planLabel: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  planDesc: { fontSize: 11, color: "#64748b", marginTop: 2 },
  errorBox: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13 },
  primaryBtn: { padding: "12px 20px", fontSize: 15, fontWeight: 700, borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg, ${PURPLE} 0%, #7c3aed 100%)`, color: "white", boxShadow: "0 4px 14px rgba(99,102,241,0.35)", letterSpacing: "0.01em" },
  ghostBtn: { padding: "12px 20px", fontSize: 15, fontWeight: 600, borderRadius: 10, border: "1.5px solid #e2e8f0", cursor: "pointer", background: "white", color: "#374151" },
  spinner: { display: "inline-block", width: 15, height: 15, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  loginLink: { marginTop: 20, textAlign: "center", fontSize: 13.5, color: "#64748b" },
  linkBtn: { background: "none", border: "none", cursor: "pointer", color: PURPLE, fontWeight: 700, fontSize: 13.5 },
  successCard: { margin: "auto", maxWidth: 480, background: "#fff", borderRadius: 16, padding: "40px 48px", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", textAlign: "center" },
  successIcon: { fontSize: 52, marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" },
  successSub: { fontSize: 15, color: "#64748b", margin: "0 0 20px" },
  apiKeyBox: { background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 10, padding: "14px 18px", textAlign: "left" },
  apiKeyLabel: { fontSize: 13, fontWeight: 700, color: "#15803d", marginBottom: 8 },
  apiKeyCode: { fontSize: 12, color: "#166534", background: "#dcfce7", padding: "8px 12px", borderRadius: 6, display: "block", wordBreak: "break-all", lineHeight: 1.6 },
};
