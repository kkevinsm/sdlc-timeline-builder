"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@/components/IconSprite";
import { AuthModal } from "@/components/Modals/AuthModal";
import { useTimeline } from "@/store/useTimelineStore";

export function PublicLanding() {
  const { lang, setLang, openModal } = useTimeline();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("invite")) {
      const id = setTimeout(() => {
        openModal("auth");
      }, 0);
      return () => clearTimeout(id);
    }
  }, [openModal]);

  const features =
    lang === "en"
      ? [
          {
            title: "Interactive Gantt & Roadmap",
            desc: "Drag timeline bars, configure FS/SS/FF/SF dependencies, milestones, and public holidays.",
          },
          {
            title: "Real-Time Collaboration",
            desc: "Share a link like a spreadsheet and edit together live with presence avatars and row indicators.",
          },
          {
            title: "Native PowerPoint Export",
            desc: "Export directly to editable .pptx slides with native shapes or crisp HD PNG images.",
          },
          {
            title: "Cloud Sync & Workspace",
            desc: "Your timelines are saved securely in Cloudflare D1 with role-based access (Viewer / Editor).",
          },
        ]
      : [
          {
            title: "Gantt & Roadmap Interaktif",
            desc: "Geser bar timeline, atur dependensi FS/SS/FF/SF, milestone, dan kalender hari libur.",
          },
          {
            title: "Kolaborasi Real-Time",
            desc: "Bagikan link seperti spreadsheet dan kerjakan bersama secara live dengan indikator kolaborator.",
          },
          {
            title: "Ekspor PowerPoint Native",
            desc: "Ekspor langsung ke slide .pptx yang dapat diedit (native shapes) atau gambar PNG HD.",
          },
          {
            title: "Cloud Sync & Hak Akses",
            desc: "Proyek tersimpan aman di Cloudflare D1 dengan kontrol akses Pelihat / Editor.",
          },
        ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8F6] text-[#111C16]">
      {/* Public Header */}
      <header className="sticky top-0 z-30 bg-[#9A3412] text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/tlbicon.png"
              alt="Timeline Builder Online"
              className="w-8 h-8 rounded-lg object-contain bg-white/95 p-0.5 shadow-sm"
            />
            <span className="font-extrabold text-[17px] tracking-tight">
              Timeline Builder Online
            </span>
          </div>

          <nav className="flex items-center gap-4 text-[13px] font-semibold">
            <Link
              href="/privacy"
              className="hidden sm:inline text-white/80 hover:text-white transition-colors"
            >
              {lang === "en" ? "Privacy Policy" : "Kebijakan Privasi"}
            </Link>
            <Link
              href="/terms"
              className="hidden sm:inline text-white/80 hover:text-white transition-colors"
            >
              {lang === "en" ? "Terms" : "Ketentuan"}
            </Link>

            <div className="inline-flex bg-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setLang("id")}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                  lang === "id" ? "bg-white text-[#9A3412]" : "text-white/80"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                  lang === "en" ? "bg-white text-[#9A3412]" : "text-white/80"
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => openModal("auth")}
              style={{ backgroundColor: "#FFFFFF", color: "#9A3412" }}
              className="px-4 py-2 rounded-full font-bold text-[13px] hover:opacity-95 transition-opacity shadow-sm"
            >
              {lang === "en" ? "Sign in" : "Masuk"}
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="bg-[radial-gradient(900px_320px_at_20%_-10%,rgba(251,146,60,0.24),transparent_60%),linear-gradient(135deg,#431407,#9A3412_55%,#EA580C)] text-white py-16 px-5">
          <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[12px] font-semibold border border-white/20">
              tlb.web.id · WakeLabs
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-3xl">
              Timeline Builder Online
            </h1>
            <p className="text-[15px] sm:text-[17px] text-white/85 max-w-2xl leading-relaxed">
              {lang === "en"
                ? "Build clean SDLC & project Gantt timelines in your browser, collaborate with your team in real time, and export directly to editable PowerPoint slides."
                : "Susun timeline proyek & roadmap SDLC dengan rapi di browser, berkolaborasi bersama tim secara real-time, dan ekspor langsung ke PowerPoint yang dapat diedit."}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => openModal("auth")}
                style={{ backgroundColor: "#FFFFFF", color: "#9A3412" }}
                className="px-6 py-3 rounded-full font-extrabold text-[14px] hover:opacity-95 shadow-lg transition-transform active:scale-[0.98]"
              >
                {lang === "en" ? "Sign in / Get Started" : "Masuk / Mulai Sekarang"}
              </button>
              <Link
                href="/privacy"
                className="px-5 py-3 rounded-full border border-white/30 text-white font-semibold text-[13.5px] hover:bg-white/10 transition-colors"
              >
                {lang === "en" ? "Privacy Policy" : "Kebijakan Privasi"}
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-5xl mx-auto px-5 py-14">
          <h2 className="text-xl sm:text-2xl font-extrabold text-center text-[#111C16] mb-8">
            {lang === "en"
              ? "What you can do with Timeline Builder Online"
              : "Fitur Utama Timeline Builder Online"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-[#E7DDD5] p-6 shadow-sm"
              >
                <h3 className="font-extrabold text-[15.5px] text-[#C2410C] mb-2">
                  {f.title}
                </h3>
                <p className="text-[13.5px] text-[#44544C] leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-[#E7DDD5] bg-white py-6 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#5C6B63]">
          <div>
            &copy; {new Date().getFullYear()} Timeline Builder Online — WakeLabs (tlb.web.id)
          </div>
          <div className="flex items-center gap-4 font-semibold">
            <Link href="/privacy" className="hover:text-[#C2410C]">
              {lang === "en" ? "Privacy Policy" : "Kebijakan Privasi"}
            </Link>
            <Link href="/terms" className="hover:text-[#C2410C]">
              {lang === "en" ? "Terms of Service" : "Syarat & Ketentuan"}
            </Link>
          </div>
        </div>
      </footer>

      <AuthModal />
    </div>
  );
}
