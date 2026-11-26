import React from "react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F2F5F3] text-[#16211B] py-12 px-5 overflow-y-auto">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E2E8E4] p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#EEF2EF]">
          <div>
            <h1 className="text-2xl font-extrabold">Kebijakan Privasi</h1>
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
            <strong>1. Data yang Dikumpulkan:</strong> Saat Anda masuk menggunakan
            Google Sign-In atau Email &amp; Password, kami menyimpan informasi
            dasar akun (nama, alamat email, dan foto profil) serta data proyek
            timeline yang Anda simpan ke cloud.
          </p>
          <p>
            <strong>2. Penggunaan Data:</strong> Data akun hanya digunakan untuk
            autentikasi dan memisahkan kepemilikan proyek timeline antar
            pengguna. Kami tidak menjual atau membagikan data Anda kepada pihak
            ketiga.
          </p>
          <p>
            <strong>3. Penyimpanan &amp; Keamanan:</strong> Data proyek cloud
            disimpan di database terenkripsi Cloudflare D1. Sesi login
            menggunakan cookie <code>HttpOnly</code> dan <code>Secure</code>.
          </p>
          <p>
            <strong>4. Penghapusan Data:</strong> Anda dapat menghapus proyek
            kapan saja melalui menu Proyek Cloud di dalam aplikasi.
          </p>
        </div>
      </div>
    </main>
  );
}
