# Agent Handoff & Architecture Guide (`agent.md`)

Dokumen ini dibuat agar setiap AI agent atau developer yang melanjutkan proyek di device lain langsung memahami tujuan, arsitektur, aturan domain, dan status fase proyek.

---

## 1. Project Overview
- **Nama Proyek:** Timeline Builder Pro (Full-Pro Rebuild)
- **Direktori Workspace:** `/Users/mac/Documents/Codes/timelinebuilder`
- **Tujuan:** Membangun ulang aplikasi web `https://timelinebuilder.id/app` dengan kesamaan fungsi dan UI/UX *pixel-by-pixel*, **tanpa modul billing/paywall/DOKU/kuota kredit** (semua fitur Pro terbuka penuh di client).
- **Dokumen Referensi Utama:** Lihat [PRD.md](./PRD.md) untuk spesifikasi lengkap fitur, rumus bisnis, dan token desain.

---

## 2. Tech Stack & Conventions
- **Frontend:** React + TypeScript + Tailwind CSS + `pptxgenjs`
- **Bundler/Framework:** Vite (atau Next.js App Router — cek `package.json` di root workspace untuk melihat pilihan final yang sudah di-scaffold).
- **Bahasa UI:** Bilingual Indonesia (`id`) & Inggris (`en`) via sistem i18n internal.
- **Font:** `Plus Jakarta Sans` untuk UI aplikasi; `Calibri`, `Arial`, `Segoe UI` untuk slide export.
- **Persistence:** `localStorage` (autosave draft) + Import/Export `.json` lokal. Tidak ada backend billing.

---

## 3. Architecture Blueprint (Recommended Module Layout)

Saat membangun atau memodifikasi kode, pisahkan *domain logic* murni dari *UI components* agar mudah diuji dan tidak ada duplikasi antara **Canvas Preview** dan **PPTX Exporter**:

```text
src/
├── types/
│   └── timeline.ts        # Project, Page, Row (Group/Task), Bar, Dependency, Holiday, SlideStyle
├── constants/
│   ├── theme.ts           # Design tokens (:root colors, ACCENTS, BADGES, STATUS colors)
│   ├── holidays.ts        # Preset libur nasional & cuti bersama Indonesia + default weekends
│   ├── templates.ts       # 4 template proyek (Simple, IT Implementation, Release, Management)
│   ├── styles.ts          # 5 preset gaya slide (STY_DEF: standar, simple, it, release, management)
│   └── i18n.ts            # Kamus terjemahan ID & EN
├── engine/
│   ├── calendar.ts        # countHK, addHK, nextWD, prevWD, isHoliday, date/week column generators
│   ├── status.ts          # autoStat, effStat, statusFit, groupRollup
│   ├── dependency.ts      # depBad (FS/SS/FF/SF), cascadeSnap/Apply, orthogonal arrow routing
│   ├── layoutModel.ts     # buildModel (shared geometry model untuk Canvas SVG & PPTX Exporter)
│   ├── pasteParser.ts     # Bulk paste parser (<=200 lines, bullets, Excel/Sheets TSV + dates)
│   └── planner.ts         # Forward & backward scheduling wizard + working-day buffer
├── export/
│   ├── pptxExporter.ts    # PptxGenJS generator (LAYOUT_WIDE, native shapes, auto-pagination, summary slide, speaker notes)
│   └── pngExporter.ts     # High-DPI PNG export
├── store/
│   └── useTimelineStore.ts # State management, multi-page tabs, undo/redo history stack, localStorage autosave
└── components/
    ├── AppBar.tsx         # Top green bar (#0B4622), actions, Export PPT CTA (#FF6A13), ID/EN toggle
    ├── PageTabs.tsx       # Multi-page tab bar
    ├── Sidebar/           # 4 tabs: SlidePanel, MonthsPanel, TaskPanel, HolidaysPanel
    ├── Stage/             # Scale & zoom toolbar, dotted canvas, SlidePreviewCard, SVG bars/deps/rail, EmptyState
    ├── Modals/            # ExportModal, BulkPasteModal, PlanWizardModal, TemplatesModal, TaskEditModal, HelpModal
    └── PresentationMode.tsx # Fullscreen presentation view (arrow keys, Space, Esc)
```

---

## 4. Critical Domain Rules (Do Not Violate)
1. **Shared Geometry Model:** Canvas preview dan PptxGenJS exporter harus membaca model perhitungan yang sama (`buildModel`: kolom, unit posisi `u0`/`u1`, status efektif, konflik dependency, *milestone rail*) agar tampilan di layar dan hasil `.pptx` identik.
2. **Native Shapes Only in PPTX:** Jangan mengekspor slide timeline sebagai gambar ke dalam `.pptx`. Gunakan shape asli PptxGenJS (`rect`, `roundRect`, `line`, `diamond`, `star5`, `custGeom`, `triangle`, `text`).
3. **No Billing Logic:** Jangan menambahkan paywall, watermark, DOKU checkout, atau batasan kredit export.
4. **Management Style Rollup (`execRows`):** Pada gaya slide `management`, jika sebuah `group` memiliki `> 3` task, task reguler diringkas ke bar `group` dan hanya task bertanda **Milestone** atau **At Risk** yang ditampilkan.
5. **Working Days (HK) Accuracy:** Durasi HK harus selalu mengecualikan hari libur akhir pekan dan daftar `holidays` yang dicentang aktif.

---

## 5. Phased Roadmap & Current Status
- [x] **Fase 1:** Project Setup, Design System, App Shell (pixel-by-pixel), Store + Undo/Redo + Autosave, i18n (`ID/EN`).
- [x] **Fase 2:** Core Timeline Engine, Kalender HK & Libur, 5 Skala Waktu, Slide Preview Card, Auto-Status, Milestone & Rail.
- [x] **Fase 3:** Direct Manipulation (Drag/Resize), Dependency Engine (`FS/SS/FF/SF` + Cascade + Conflict), Bulk Paste (200 baris), 4 Template & Planning Wizard.
- [x] **Fase 4:** PPTX Native Exporter (PptxGenJS), 5 Gaya Slide, Summary Slide, Speaker Notes, Auto-Pagination, PNG Export, Mode Presentasi.
- [x] **Fase 5:** File JSON Save/Open, Keyboard Shortcuts, Visual Pixel-by-Pixel Audit, Final Polish.

---

## 6. Handoff Notes for Next Agent
- Jika workspace masih kosong, konfirmasi atau cek pilihan bundler user (**Vite** vs **Next.js**), lalu langsung eksekusi **Fase 1**.
- Selalu update checklist pada Bagian 5 di file ini setiap kali satu fase selesai diverifikasi.
- Untuk verifikasi visual *pixel-by-pixel* terhadap `https://timelinebuilder.id/app`, gunakan **REA MCP** (`capture_web_screenshot`, `inspect_web_page`) jika Chrome CDP (`127.0.0.1:9222`) aktif.
