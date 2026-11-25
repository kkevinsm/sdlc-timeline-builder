"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { authClient, fetchHealthStatus } from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

export function AuthModal({ blocking = false }: { blocking?: boolean }) {
  const { activeModal, closeModal, lang, setLang, showNotice } = useTimeline();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!blocking && activeModal !== "auth") return;
    fetchHealthStatus().then((h) => setGoogleEnabled(h.googleEnabled));
    try {
      const errParam = new URLSearchParams(window.location.search).get("error");
      if (errParam) {
        const id = setTimeout(() => setError(`OAuth error: ${errParam}`), 0);
        return () => clearTimeout(id);
      }
    } catch {
      // Ignore
    }
  }, [activeModal, blocking]);

  if (!blocking && activeModal !== "auth") return null;

  const handleGoogleSignIn = async () => {
    if (googleEnabled === false) {
      setError(
        lang === "en"
          ? "Google OAuth secrets are not configured yet on Cloudflare Worker. Please use Email & Password or set GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET."
          : "Google OAuth belum dikonfigurasi di Cloudflare Worker (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET belum diisi). Silakan gunakan Email & Password."
      );
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/?error=google_oauth_failed",
      });
    } catch {
      setError(
        lang === "en"
          ? "Google sign-in failed."
          : "Gagal masuk dengan Google."
      );
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (res.error) {
          setError(res.error.message || "Gagal mendaftar.");
          return;
        }
        showNotice(
          lang === "en"
            ? "Account created & signed in!"
            : "Akun berhasil dibuat & masuk!"
        );
        closeModal();
      } else {
        const res = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (res.error) {
          setError(res.error.message || "Email atau password salah.");
          return;
        }
        showNotice(lang === "en" ? "Signed in!" : "Berhasil masuk!");
        closeModal();
      }
    } catch {
      setError(
        lang === "en"
          ? "Authentication request failed."
          : "Gagal menghubungi server autentikasi."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-center justify-center p-5 ${
        blocking
          ? "bg-[radial-gradient(900px_300px_at_20%_-10%,rgba(52,184,106,0.22),transparent_60%),linear-gradient(135deg,#07331A,#0B4622_55%,#15733A)]"
          : "bg-[#09140E]/45 backdrop-blur-[3px]"
      }`}
      onClick={blocking ? undefined : closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-dlg-title"
    >
      <div
        className="bg-white rounded-[20px] shadow-2xl w-full max-w-[410px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {!blocking ? (
          <button
            type="button"
            className="ibtn absolute top-3 right-3 z-10 bg-white/80 hover:bg-white rounded-full"
            aria-label="Close"
            onClick={closeModal}
          >
            <Icon name="x" />
          </button>
        ) : (
          <div className="absolute top-3 right-3 z-10 inline-flex bg-white/85 rounded-lg p-0.5 border border-[var(--line)]">
            <button
              type="button"
              onClick={() => setLang("id")}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                lang === "id"
                  ? "bg-[var(--brand-700)] text-white"
                  : "text-[var(--ink-2)]"
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                lang === "en"
                  ? "bg-[var(--brand-700)] text-white"
                  : "text-[var(--ink-2)]"
              }`}
            >
              EN
            </button>
          </div>
        )}

        {/* Top Hero */}
        <div
          className="h-[84px] flex justify-center items-end shrink-0"
          style={{
            background:
              "radial-gradient(rgba(27,122,62,.13) 1px,transparent 1.3px) 0 0/16px 16px,linear-gradient(180deg,#DCF0E3,#F2F9F4 72%,#fff)",
          }}
        >
          <div className="-mb-6 w-[56px] h-[56px] drop-shadow-lg">
            <Icon name="brand" className="w-[56px] h-[56px]" />
          </div>
        </div>

        <div className="px-6 pt-9 pb-6 flex flex-col gap-3.5 overflow-y-auto">
          <div className="text-center">
            <h2
              id="auth-dlg-title"
              className="text-[18px] font-extrabold text-[var(--ink)]"
            >
              {mode === "signin"
                ? lang === "en"
                  ? "Sign in to save to cloud"
                  : "Masuk untuk simpan ke cloud"
                : lang === "en"
                  ? "Create your account"
                  : "Buat akun baru"}
            </h2>
            <p className="text-[12.5px] text-[var(--muted)] mt-1">
              {lang === "en"
                ? "Sync your timeline projects across devices"
                : "Sinkronkan proyek timeline Anda di cloud"}
            </p>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--brand-50)] text-[#1F5C36] text-[12px] leading-snug">
            <Icon name="check-circle" size="sm" className="mt-0.5 shrink-0" />
            <span>
              {lang === "en"
                ? "Your current browser draft stays safe and can be saved to your account."
                : "Draft Anda di browser tetap aman dan bisa langsung disimpan ke akun."}
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-[#FDECEC] text-[#8E1B1B] text-[12px] leading-snug">
              {error}
            </div>
          )}

          {/* Google OAuth Button */}
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleSignIn}
            className="h-11 px-4 rounded-xl border border-[#D3DCD6] bg-white hover:bg-[#F7FAF8] font-bold text-[13px] text-[var(--ink)] flex items-center justify-center gap-2.5 shadow-sm transition-colors"
          >
            <Icon name="google" />
            <span>
              {lang === "en" ? "Continue with Google" : "Lanjutkan dengan Google"}
            </span>
          </button>

          <div className="flex items-center gap-3 text-[11px] text-[var(--muted)] font-semibold">
            <span className="flex-1 h-px bg-[var(--line)]" />
            <span>{lang === "en" ? "or with email" : "atau dengan email"}</span>
            <span className="flex-1 h-px bg-[var(--line)]" />
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2.5">
            {mode === "signup" && (
              <div className="fg">
                <label htmlFor="auth-name">
                  {lang === "en" ? "Full Name" : "Nama Lengkap"}
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  className="inp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                />
              </div>
            )}

            <div className="fg">
              <label htmlFor="auth-email">Email</label>
              <input
                id="auth-email"
                type="email"
                required
                className="inp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
              />
            </div>

            <div className="fg">
              <label htmlFor="auth-pass">Password</label>
              <input
                id="auth-pass"
                type="password"
                required
                minLength={8}
                className="inp"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="btn primary w-full h-10 mt-1 text-[13.5px]"
            >
              {busy
                ? lang === "en"
                  ? "Please wait..."
                  : "Memproses..."
                : mode === "signin"
                  ? lang === "en"
                    ? "Sign In"
                    : "Masuk"
                  : lang === "en"
                    ? "Create Account"
                    : "Daftar"}
            </button>
          </form>

          <div className="text-center text-[12px] text-[var(--muted)]">
            {mode === "signin" ? (
              <>
                {lang === "en" ? "Don't have an account?" : "Belum punya akun?"}{" "}
                <button
                  type="button"
                  className="font-bold text-[var(--brand)] hover:underline"
                  onClick={() => {
                    setError(null);
                    setMode("signup");
                  }}
                >
                  {lang === "en" ? "Sign up" : "Daftar sekarang"}
                </button>
              </>
            ) : (
              <>
                {lang === "en" ? "Already have an account?" : "Sudah punya akun?"}{" "}
                <button
                  type="button"
                  className="font-bold text-[var(--brand)] hover:underline"
                  onClick={() => {
                    setError(null);
                    setMode("signin");
                  }}
                >
                  {lang === "en" ? "Sign in" : "Masuk"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
