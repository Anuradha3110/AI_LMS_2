"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loginApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginApi(email, password);
      localStorage.setItem("access_token", res.access_token);
      localStorage.setItem("user_role", res.user.role);
      router.push(`/dashboard/${res.user.role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const demoAccounts = [
    { role: "Admin", email: "admin@gmail.com", color: "#8b5cf6" },
    { role: "Manager", email: "manager@gmail.com", color: "#06b6d4" },
    { role: "Employee", email: "employee@gmail.com", color: "#10b981" },
  ];

  return (
    <main style={styles.root}>
      {/* Left panel — branding */}
      <div style={styles.leftPanel}>
        <div style={styles.leftContent}>
          {/* Logo mark */}
          <div style={styles.logoWrap}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="12" fill="white" fillOpacity="0.15" />
              <path d="M10 32 L22 12 L34 32" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M15 25 L29 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="22" cy="12" r="3" fill="white" />
            </svg>
            <span style={styles.logoText}>AI-LMS</span>
          </div>

          <h1 style={styles.heroHeading}>
            Empower Learning<br />with Intelligence
          </h1>
          <p style={styles.heroSubtext}>
            An adaptive AI-powered learning platform that personalises courses,
            tracks progress, and grows with every learner.
          </p>

          {/* Feature chips */}
          <div style={styles.chipRow}>
            {["Adaptive Paths", "Role-Based Access", "AI Insights", "Real-Time Analytics"].map((f) => (
              <span key={f} style={styles.chip}>{f}</span>
            ))}
          </div>
        </div>

        {/* Decorative blobs */}
        <div style={{ ...styles.blob, top: "-80px", right: "-80px", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ ...styles.blob, bottom: "-60px", left: "-60px", width: 300, height: 300, background: "rgba(255,255,255,0.04)" }} />
      </div>

      {/* Right panel — form */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSubtitle}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={onSubmit} style={styles.form}>
            {/* Email */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email address</label>
              <div style={{ position: "relative" }}>
                <span style={styles.fieldIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  type="email"
                  required
                  placeholder="you@example.com"
                  style={{
                    ...styles.input,
                    ...(focusedField === "email" ? styles.inputFocused : {}),
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={styles.label}>Password</label>
                <button type="button" style={styles.forgotBtn}>Forgot password?</button>
              </div>
              <div style={{ position: "relative" }}>
                <span style={styles.fieldIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  style={{
                    ...styles.input,
                    paddingRight: 44,
                    ...(focusedField === "password" ? styles.inputFocused : {}),
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnDisabled : {}) }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span style={styles.spinner} />
                  Signing in…
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={styles.demoSection}>
            <div style={styles.dividerRow}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>Demo accounts</span>
              <div style={styles.dividerLine} />
            </div>
            <div style={styles.demoGrid}>
              {demoAccounts.map(({ role, email: demoEmail, color }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setEmail(demoEmail);
                    setPassword(
                      role === "Admin"
                        ? "admin@123"
                        : role === "Manager"
                        ? "manager@123"
                        : "employee@123"
                    );
                  }}
                  style={{ ...styles.demoChip, borderColor: color + "55", color }}
                >
                  <span style={{ ...styles.demoDot, background: color }} />
                  {role}
                </button>
              ))}
            </div>
            <p style={styles.demoHint}>Click a role to auto-fill credentials, then sign in.</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}

/* ─── Styles ────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "#f8fafc",
  },

  /* Left panel */
  leftPanel: {
    flex: "0 0 46%",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 56px",
    position: "relative",
    overflow: "hidden",
  },
  leftContent: {
    position: "relative",
    zIndex: 1,
    color: "white",
    maxWidth: 420,
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 48,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    color: "white",
    letterSpacing: "0.04em",
  },
  heroHeading: {
    fontSize: 40,
    fontWeight: 800,
    lineHeight: 1.18,
    margin: "0 0 20px",
    color: "white",
  },
  heroSubtext: {
    fontSize: 16,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.78)",
    margin: "0 0 36px",
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 20,
    background: "rgba(255,255,255,0.15)",
    color: "white",
    letterSpacing: "0.02em",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(255,255,255,0.25)",
  },
  blob: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: "50%",
    pointerEvents: "none",
  },

  /* Right panel */
  rightPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 32px",
  },
  formCard: {
    width: "100%",
    maxWidth: 420,
  },
  formHeader: {
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a",
    margin: "0 0 6px",
  },
  formSubtitle: {
    fontSize: 15,
    color: "#64748b",
    margin: 0,
  },

  /* Form */
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: 600,
    color: "#374151",
    letterSpacing: "0.01em",
  },
  fieldIcon: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "11px 14px 11px 42px",
    fontSize: 15,
    borderRadius: 10,
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    color: "#0f172a",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  inputFocused: {
    borderColor: "#6366f1",
    boxShadow: "0 0 0 3px rgba(99,102,241,0.12)",
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    display: "flex",
    alignItems: "center",
    padding: 0,
  },
  forgotBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "#6366f1",
    fontWeight: 600,
    padding: 0,
  },

  /* Error */
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    fontSize: 13.5,
    fontWeight: 500,
  },

  /* Submit button */
  submitBtn: {
    padding: "13px 20px",
    fontSize: 15,
    fontWeight: 700,
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
    color: "white",
    transition: "opacity 0.2s, transform 0.1s",
    boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
    letterSpacing: "0.01em",
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
    transform: "none",
  },
  spinner: {
    display: "inline-block",
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.35)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },

  /* Demo */
  demoSection: {
    marginTop: 28,
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#e2e8f0",
  },
  dividerText: {
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  demoGrid: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
  },
  demoChip: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1.5px solid",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "background 0.15s",
  },
  demoDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    flexShrink: 0,
  },
  demoHint: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
  },
};
