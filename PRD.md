# Product Requirements Document (PRD) — Timeline Builder Pro (Full-Pro Rebuild)

> **Status:** Draft v1.0 (Ready for Phase 1)  
> **Workspace:** `/Users/mac/Documents/Codes/timelinebuilder`  
> **Reference Product:** `https://timelinebuilder.id/app` (Full-Pro feature parity, **without billing/paywall/DOKU/credit gating**)

---

## 1. Product Vision & Goals

**Timeline Builder Pro** adalah aplikasi web *presentation tool* (bukan *project management tool* penuh) yang mengubah data timeline proyek menjadi **slide PowerPoint (`.pptx`) yang rapi dan sepenuhnya bisa diedit (*native PowerPoint shapes*)** dalam hitungan menit.

### Target Pengguna
- Project Manager, PMO, Business Analyst, Product Manager, Konsultan, IT Delivery, Tim Konstruksi/Event/Marketing yang rutin mempresentasikan status proyek ke manajemen/direksi/klien.

### Prinsip Utama
1. **Full-Pro Unlocked:** Seluruh fitur Pro terbuka 100% di sisi client tanpa login wajib, tanpa kuota kredit, tanpa *watermark*, dan tanpa *payment gateway*.
2. **Editable Native PPTX:** Setiap bar, teks, panah dependency, dan milestone diekspor sebagai *native shape* PowerPoint (`.pptx`), bukan gambar *screenshot*.
3. **Pixel-by-Pixel UI/UX Parity:** Tata letak, warna, tipografi, interaksi *drag/resize*, dan responsivitas mengikuti desain referensi `timelinebuilder.id/app`.

---

## 2. Tech Stack

- **Core:** React + TypeScript + Tailwind CSS + PptxGenJS (`^3.12.0`)
- **Framework/Bundler:** Vite (rekomendasi untuk *pure client-side*) atau Next.js App Router (opsi jika perlu backend/cloud sync di masa depan) — *menunggu konfirmasi final sebelum Fase 1*.
- **Font:** `Plus Jakarta Sans` (UI) dan `Calibri` / `Arial` / `Segoe UI` (PPTX Export).
- **Persistence:** `localStorage` auto-save + Export/Import file `.json` proyek.

---

## 3. Design System & Visual Tokens

Diambil dari CSS `:root` referensi:
- **Brand Greens:**
  - `--brand`: `#1B7A3E` (Primary)
  - `--brand-600`: `#176B37`
  - `--brand-700`: `#0F5A2C`
  - `--brand-800`: `#0B4622` (Appbar)
  - `--brand-900`: `#07331A`
  - `--brand-50`: `#EEF7F1`, `--brand-100`: `#D9EEDF`, `--brand-200`: `#B4DCC1`
- **Accent Oranges:**
  - `--accent`: `#FF6A13` (CTA Export PPT / Wizard)
  - `--accent-600`: `#EA5A06`
  - `--accent-50`: `#FFF1E8`
- **Neutrals & Semantic:**
  - `--ink`: `#16211B`, `--ink-2`: `#3A4841`, `--muted`: `#6B7A72`, `--muted-2`: `#98A39D`
  - `--line`: `#E2E8E4`, `--line-2`: `#EEF2EF`, `--bg`: `#F2F5F3` (Dotted Canvas), `--panel`: `#FFFFFF`
  - `--danger`: `#E53935` (At Risk), `--warn`: `#F59E0B` (In Progress)
- **Shadows:**
  - `--shadow-sm`: `0 1px 2px rgba(16,24,20,.06), 0 1px 3px rgba(16,24,20,.08)`
  - `--shadow`: `0 4px 14px rgba(16,24,20,.08), 0 1px 3px rgba(16,24,20,.06)`
  - `--shadow-lg`: `0 24px 60px rgba(8,20,14,.20), 0 8px 20px rgba(8,20,14,.10)`

---

## 4. Data Model & Domain Specifications

### 4.1 Project & Page
Satu proyek dapat memiliki banyak halaman (`pages[]` / tabs):
- **Header & Branding:** `title`, `subtitle`, `tgt` (target badge text), `tgtc` (badge color), `logoL` / `logoR` (uploaded image atau text badge fallback + warna `loglc` / `logrc`), `accent` (7 preset warna aksen).
- **Time & Scale:** `dateMode` (`day` | `3day` | `week` | `2week` | `month`), `months[]` (daftar bulan+tahun aktif), `today` (ISO date garis hari ini), `cm`/`cw`/`cy`, `showToday`.
- **Layout Defaults (`SIZE_DEF`):** `fs: 11`, `rh: 30`, `lw: 220` (Task col), `dw: 190` (Duration col), `sw: 150` (Status col), `ww: 44` (Week col width), `ow: 130` (Owner/PIC col).
- **Options:** `autoStatus`, `atRiskThreshold` (default `10`%), `showDeps`, `cascade`, `wdSnap`, `groupRollup`, `showLegend`, `msRail`.

### 4.2 Rows (`group` & `task`)
- **`group`:** Nama fase/kelompok, status *collapse/expand*, rata-rata progress otomatis (*group rollup*) dari seluruh task di bawahnya.
- **`task`:** `name`, `owner` (PIC), `bar` (`startMonth`/`startWeek` atau tanggal ISO `sd`–`ed`, `progress` `0–100`, `ms` boolean milestone, `status`, `statusLocked`, `statusText`), dan `deps[]` (`targetId`, `type`).

### 4.3 Business Logic Rules
1. **Hari Kerja (HK):** Menghitung selisih hari kerja dengan mengecualikan akhir pekan (default Sabtu–Minggu) serta tanggal pada daftar `holidays` (preset libur nasional & cuti bersama Indonesia + libur kustom).
2. **Status Otomatis (`autoStat`):**
   - `progress >= 100` → `done` (`#1B7A3E`)
   - `today < startDate` → `done` jika `progress > 0`, else `notstarted` (`#B4BDB8`)
   - `today > endDate` → `atrisk` (`#E53935`)
   - `startDate <= today <= endDate`: hitung `exp = Math.min(100, elapsedDays / totalDays * 100)`:
     - `progress >= exp` → `done`
     - `exp - progress >= atRiskThreshold` → `atrisk`
     - else → `inprogress` (`#F59E0B`) jika `progress > 0`, else `notstarted`.
3. **Dependency & Conflict Detection (`depBad`):**
   - `FS`: konflik jika `successor.sd <= predecessor.ed`
   - `SS`: konflik jika `successor.sd < predecessor.sd`
   - `FF`: konflik jika `successor.ed < predecessor.ed`
   - `SF`: konflik jika `successor.ed < predecessor.sd`
   - **Cascade Shift:** Jika `cascade: true`, menggeser *predecessor* ikut menggeser *successor* dengan mempertahankan durasi HK.

---

## 5. Functional Requirements

### 5.1 App Shell & Navigation
- **Top Appbar:** Logo produk, Menu Proyek (New/Open/Save JSON), Planning Wizard, New/Open/Save shortcuts, Status Autosave, Undo/Redo, Help/Shortcuts, Mode Presentasi, CTA **Export PPT**, Toggle Bahasa (`ID | EN`).
- **Page Tabs Bar:** Switch antar halaman, tambah halaman (`+`), rename/duplicate/delete halaman.
- **Left Sidebar (Collapsible):** 4 tab utama: `SLIDE`, `MONTHS`, `TASK`, `HOLIDAYS`.
- **Main Stage:** Toolbar `SCALE` (`Day`, `3 days`, `Week`, `2 weeks`, `Month`), `ZOOM` slider + `Fit`, status chips, *dotted canvas*, *slide preview card*, dan *empty-state overlay*.

### 5.2 Editor & Productivity Features
- **Direct Manipulation:** Drag bar untuk geser jadwal, resize tepi kiri/kanan bar (dengan *working-day snap*), edit progress, toggle milestone.
- **Bulk Paste (`Tambah banyak task`):** Hingga **200 baris** sekali tempel; membersihkan bullet/nomor otomatis; mendukung *paste* tab-separated dari Excel/Google Sheets beserta tanggal mulai & selesai.
- **4 Template Proyek + Planning Wizard:** *Simple*, *IT Implementation*, *Release*, *Management* (tanggal otomatis mulai bulan berjalan) + *Forward/Backward Scheduling* dengan *buffer* hari kerja.
- **Milestone & Milestone Rail:** Diamond untuk milestone biasa, *star5* untuk milestone terakhir + sorotan baris, serta rel horizontal tanggal milestone di bawah chart.
- **Mode Presentasi:** Layar penuh tanpa panel editor, navigasi panah/Spasi/`Esc`.

### 5.3 Export Engine (`.pptx` & `.png`)
- **5 Slide Styles (`STY_DEF`):**
  1. `standar` — Pengaturan penuh sesuai editor.
  2. `simple` — Minimalis (tanpa kolom durasi, status, dependency, notes; garis grid tipis).
  3. `it` — Padat & teknis (durasi, status, PIC/owner, dependency, today line, notes; font `7.5–10pt`).
  4. `release` — Fokus rilis (ikon milestone `1.45×`, label milestone, tanpa durasi/owner).
  5. `management` — *Executive rollup* (`execRows`: jika group > 3 task, task biasa diringkas ke group dan hanya menampilkan **Milestone** & **At Risk**; bar tebal `0.5"`, font `10–14pt`, menyertakan **Summary Slide**).
- **Native PowerPoint Shapes (via PptxGenJS `LAYOUT_WIDE` 16:9):**
  - `rect`, `roundRect`, `line`, `diamond`, `star5`, `custGeom` + `triangle` (panah dependency ortogonal), `text`, dan `image` (logo).
  - *Auto-pagination* untuk task yang melebihi tinggi 1 slide (header diulang).
  - *Summary Slide* & *Speaker Notes* otomatis.
  - Pilihan font export (`Calibri`, `Arial`, `Segoe UI`) dan bahasa (`ID`/`EN`).
- **Export PNG:** Render slide ke PNG resolusi tinggi.

---

## 6. Phased Execution Plan

- **Fase 1:** Fondasi Proyek, Design System, App Shell (*pixel-by-pixel*), State & `localStorage` Autosave, Undo/Redo, i18n (`ID/EN`).
- **Fase 2:** Core Timeline Engine, Kalender Hari Kerja (HK) & Libur Nasional, 5 Skala Waktu, Render Slide Preview Card, Status Otomatis, Milestone & Rail.
- **Fase 3:** Interaktivitas Penuh (Drag/Resize bar), Dependency Engine (`FS/SS/FF/SF`, *Cascade*, Konflik), Bulk Paste (200 baris Excel/Text), 4 Template & Planning Wizard.
- **Fase 4:** Export `.pptx` Native Shapes (PptxGenJS), 5 Gaya Slide, Summary Slide, Speaker Notes, Auto-Pagination, Export PNG, dan Mode Presentasi.
- **Fase 5:** Save/Open JSON, Keyboard Shortcuts, Help Dialog, Audit Visual *Pixel-by-Pixel* (via REA MCP) & Bugfixes.
