import React from "react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F2F5F3] text-[#16211B] py-12 px-5 overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E2E8E4] p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#EEF2EF]">
          <div>
            <h1 className="text-2xl font-extrabold">Syarat &amp; Ketentuan</h1>
            <p className="text-sm text-[#6B7A72] mt-1">
              Timeline Builder Online — WakeLabs (tlb.web.id)
            </p>
          </div>
          <Link
            href="/"
            className="px-3.5 py-2 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold"
          >
            Kembali ke Aplikasi
          </Link>
        </div>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#3A4841]">
          <p>
            <strong>1. Penggunaan Layanan:</strong> Timeline Builder Online oleh
            WakeLabs disediakan untuk membantu penyusunan timeline proyek dan
            ekspor slide presentasi (<code>.pptx</code> / <code>.png</code>).
          </p>
          <p>
            <strong>2. Akun Pengguna:</strong> Anda bertanggung jawab menjaga
            kerahasiaan akun serta seluruh konten proyek yang Anda unggah dan
            kelola di dalam workspace Anda.
          </p>
          <p>
            <strong>3. Hak Kekayaan Intelektual:</strong> Seluruh data timeline
            dan file ekspor yang Anda buat sepenuhnya menjadi milik Anda.
          </p>
        </div>
      </div>
    </main>
  );
}
