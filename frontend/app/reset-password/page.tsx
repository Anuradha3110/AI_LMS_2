"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { resetPasswordApi } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!token) { setError("Invalid reset link — token is missing"); return; }

    setError(null);
    setLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  const inp = (name: string): React.CSSProperties => ({
    ...st.input,
    ...(focused === name ? st.inputFocus : {}),
  });

  if (!token) {
    return (
      <main style={st.root}>
        <div style={st.card}>
          <div style={st.iconWrap}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={st.title}>Invalid Link</h2>
          <p style={st.sub}>This reset link is missing a token. Please request a new one.</p>
          <button onClick={() => router.push("/login")} style={st.btn}>Back to Login</button>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main style={st.root}>
        <div style={st.card}>
          <div style={st.iconWrap}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 style={st.title}>Password Updated!</h2>
          <p style={st.sub}>Your password has been reset successfully. You can now sign in with your new password.</p>
          <button onClick={() => router.push("/login")} style={st.btn}>Go to Login →</button>
        </div>
      </main>
    );
  }

  return (
    <main style={st.root}>
      <div style={st.card}>
        {/* Logo */}
        <div style={st.logoRow}>
          <div style={st.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 44 44" fill="none">
              <path d="M10 32 L22 12 L34 32" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M15 25 L29 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="22" cy="12" r="3" fill="white" />
            </svg>
          </div>
          <span style={st.logoText}>AI-LMS</span>
        </div>

        <h2 style={st.title}>Set a new password</h2>
        <p style={st.sub}>Choose a strong password — at least 8 characters.</p>

        <form onSubmit={onSubmit} style={st.form}>
          {/* New password */}
          <div style={st.fieldGroup}>
            <label style={st.label}>New Password</label>
            <div style={{ position: "relative" }}>
              <span style={st.fieldIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPw ? "text" : "password"}
                required minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("pw")}
                onBlur={() => setFocused(null)}
                placeholder="Min 8 characters"
                style={{ ...inp("pw"), paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={st.eyeBtn} aria-label="Toggle visibility">
                {showPw ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div style={st.fieldGroup}>
            <label style={st.label}>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <span style={st.fieldIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                required minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onFocus={() => setFocused("confirm")}
                onBlur={() => setFocused(null)}
                placeholder="Repeat your password"
                style={inp("confirm")}
              />
            </div>
          </div>

          {error && (
            <div style={st.errorBox}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...st.btn, ...(loading ? st.btnDisabled : {}), marginTop: 4 }}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span style={st.spinner} /> Updating…
              </span>
            ) : "Update Password"}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#94a3b8" }}>
          Remembered it?{" "}
          <button onClick={() => router.push("/login")} style={st.linkBtn}>Back to Login</button>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#64748b" }}>Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

const PURPLE = "#4f46e5";

const st: Record<string, React.CSSProperties> = {
  root: { display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "32px 16px" },
  card: { width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, padding: "40px 40px 36px", boxShadow: "0 8px 40px rgba(0,0,0,0.10)" },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  logoIcon: { width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${PURPLE},#7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "0.04em" },
  iconWrap: { display: "flex", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" },
  sub: { fontSize: 14, color: "#64748b", margin: "0 0 24px", lineHeight: 1.6 },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13.5, fontWeight: 600, color: "#374151" },
  fieldIcon: { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex", alignItems: "center", pointerEvents: "none" },
  input: { width: "100%", padding: "11px 14px 11px 42px", fontSize: 15, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  inputFocus: { borderColor: PURPLE, boxShadow: `0 0 0 3px rgba(99,102,241,0.12)` },
  eyeBtn: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center", padding: 0 },
  errorBox: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 13.5, fontWeight: 500 },
  btn: { padding: "12px 20px", fontSize: 15, fontWeight: 700, borderRadius: 10, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${PURPLE},#7c3aed)`, color: "white", boxShadow: "0 4px 14px rgba(99,102,241,0.35)", letterSpacing: "0.01em" },
  btnDisabled: { opacity: 0.65, cursor: "not-allowed" },
  spinner: { display: "inline-block", width: 15, height: 15, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  linkBtn: { background: "none", border: "none", cursor: "pointer", color: PURPLE, fontWeight: 600, fontSize: 13 },
};
