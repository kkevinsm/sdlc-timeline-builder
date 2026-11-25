import React from "react";

export type IconName =
  | "brand"
  | "plus"
  | "minus"
  | "x"
  | "group"
  | "task"
  | "wand"
  | "file-plus"
  | "folder-open"
  | "save"
  | "present"
  | "play"
  | "download"
  | "upload"
  | "undo"
  | "redo"
  | "help"
  | "keyboard"
  | "slide"
  | "calendar"
  | "rows"
  | "holiday"
  | "image"
  | "edit"
  | "trash"
  | "copy"
  | "up"
  | "down"
  | "left"
  | "right"
  | "chev-down"
  | "chev-left"
  | "chev-right"
  | "grip"
  | "lock"
  | "dep"
  | "star"
  | "diamond"
  | "bolt"
  | "check"
  | "check-circle"
  | "clock"
  | "alert"
  | "info"
  | "dash-circle"
  | "zoom-in"
  | "zoom-out"
  | "fit"
  | "target"
  | "today"
  | "palette"
  | "flag"
  | "cloud-check"
  | "cloud-off"
  | "reset"
  | "search"
  | "layers"
  | "unfold"
  | "fold"
  | "ruler"
  | "sparkle"
  | "list";

export function IconSprite() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="hidden" aria-hidden="true">
      <defs>
        <linearGradient id="gBrand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34B86A" />
          <stop offset="1" stopColor="#0B4622" />
        </linearGradient>
      </defs>
      <symbol id="i-brand" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="9" fill="url(#gBrand)" />
        <rect x=".5" y=".5" width="31" height="31" rx="8.5" fill="none" stroke="#fff" strokeOpacity=".22" />
        <rect x="6.5" y="8" width="11" height="3.4" rx="1.7" fill="#fff" />
        <rect x="10.5" y="14.3" width="13" height="3.4" rx="1.7" fill="#fff" fillOpacity=".86" />
        <rect x="6.5" y="20.6" width="7.5" height="3.4" rx="1.7" fill="#fff" fillOpacity=".7" />
        <path d="M22.6 18.9l3.3 3.4-3.3 3.3-3.3-3.3z" fill="#FF8A3D" stroke="#fff" strokeWidth="1.1" strokeLinejoin="round" />
      </symbol>
      <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
      <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14" /></symbol>
      <symbol id="i-x" viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></symbol>
      <symbol id="i-group" viewBox="0 0 24 24"><path d="M3 7.5V17a2.5 2.5 0 0 0 2.5 2.5h13A2.5 2.5 0 0 0 21 17v-7a2.5 2.5 0 0 0-2.5-2.5H12L10 5H5.5A2.5 2.5 0 0 0 3 7.5z" /><path d="M7.5 12.5h5M9.5 16h6" /></symbol>
      <symbol id="i-task" viewBox="0 0 24 24"><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" /><path d="M6 12h7" /></symbol>
      <symbol id="i-wand" viewBox="0 0 24 24"><path d="m4 20 11-11M13.5 7.5l3 3" /><path d="M18 3v3.5M16.25 4.75h3.5M8.5 3.5V6M7.25 4.75h2.5M19.5 12.5V15M18.25 13.75h2.5" /></symbol>
      <symbol id="i-file-plus" viewBox="0 0 24 24"><path d="M14 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V9z" /><path d="M14 3.5V9h5.5M12 12v5M9.5 14.5h5" /></symbol>
      <symbol id="i-folder-open" viewBox="0 0 24 24"><path d="M3.5 17.5v-11a2 2 0 0 1 2-2h3.7l2 2.2h6.3a2 2 0 0 1 2 2V10" /><path d="M3.6 18.4 6.1 11.6a1.6 1.6 0 0 1 1.5-1.05h12.8a.9.9 0 0 1 .85 1.2l-2.2 6.2a2 2 0 0 1-1.9 1.35H4.4a.85.85 0 0 1-.8-.9z" /></symbol>
      <symbol id="i-save" viewBox="0 0 24 24"><path d="M5.5 3.5h10.7l4.3 4.3v10.7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" /><path d="M8 3.5V8h7V3.5M7.5 20.5V15a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v5.5" /></symbol>
      <symbol id="i-present" viewBox="0 0 24 24"><rect x="2.5" y="3.5" width="19" height="13" rx="2" /><path d="M12 16.5V20M8 20.5h8M6.5 8H13M9.5 12h8" /></symbol>
      <symbol id="i-play" viewBox="0 0 24 24"><path d="M7.5 5v14a.8.8 0 0 0 1.2.7l11.2-7a.8.8 0 0 0 0-1.4L8.7 4.3A.8.8 0 0 0 7.5 5z" /></symbol>
      <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" /></symbol>
      <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14" /></symbol>
      <symbol id="i-undo" viewBox="0 0 24 24"><path d="M9 14 4.5 9.5 9 5" /><path d="M4.5 9.5H15a5 5 0 0 1 0 10h-4" /></symbol>
      <symbol id="i-redo" viewBox="0 0 24 24"><path d="m15 14 4.5-4.5L15 5" /><path d="M19.5 9.5H9a5 5 0 0 0 0 10h4" /></symbol>
      <symbol id="i-help" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.3-2.5 4M12 17.2v.1" /></symbol>
      <symbol id="i-keyboard" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M8 14h8" /></symbol>
      <symbol id="i-slide" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13.5" rx="2.2" /><path d="M7 8.5h6M7 12.5h10M9 21h6" /></symbol>
      <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.8h17M8 3v4M16 3v4M7.8 13.6h.01M12 13.6h.01M16.2 13.6h.01M7.8 17h.01M12 17h.01" /></symbol>
      <symbol id="i-rows" viewBox="0 0 24 24"><path d="M3.5 4v16" strokeWidth="1.5" /><path d="M7 7h8M10 12h9.5M7 17h6" strokeWidth="2.8" /></symbol>
      <symbol id="i-holiday" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.8h17M8 3v4M16 3v4" /><path d="M12 12.2 12.85 14.43 15.23 14.55 13.38 16.05 14 18.35 12 17.05 10 18.35 10.62 16.05 8.77 14.55 11.15 14.43z" fill="currentColor" strokeWidth="1" /></symbol>
      <symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.7" cy="9.6" r="1.7" /><path d="m21 15.5-4.3-4.3a1.2 1.2 0 0 0-1.7 0L6.5 19.5" /></symbol>
      <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4.5 19.5v-3.6L15.4 5a2.1 2.1 0 0 1 3 0l.6.6a2.1 2.1 0 0 1 0 3L8.1 19.5z" /><path d="m13.4 7 3.6 3.6" /></symbol>
      <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" /><path d="m6.5 7 .8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v5.5M14 11v5.5" /></symbol>
      <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" /></symbol>
      <symbol id="i-up" viewBox="0 0 24 24"><path d="M12 19V5.5M6.5 11 12 5.5l5.5 5.5" /></symbol>
      <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 5v13.5M6.5 13l5.5 5.5 5.5-5.5" /></symbol>
      <symbol id="i-left" viewBox="0 0 24 24"><path d="M19 12H5.5M11 6.5 5.5 12l5.5 5.5" /></symbol>
      <symbol id="i-right" viewBox="0 0 24 24"><path d="M5 12h13.5M13 6.5l5.5 5.5-5.5 5.5" /></symbol>
      <symbol id="i-chev-down" viewBox="0 0 24 24"><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></symbol>
      <symbol id="i-chev-left" viewBox="0 0 24 24"><path d="m14.5 6.5-5.5 5.5 5.5 5.5" /></symbol>
      <symbol id="i-chev-right" viewBox="0 0 24 24"><path d="m9.5 6.5 5.5 5.5-5.5 5.5" /></symbol>
      <symbol id="i-grip" viewBox="0 0 24 24"><g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></g></symbol>
      <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2" /></symbol>
      <symbol id="i-dep" viewBox="0 0 24 24"><rect x="2.5" y="4" width="10" height="4.6" rx="2.3" /><rect x="11.5" y="15.4" width="10" height="4.6" rx="2.3" /><path d="M12.5 6.3h2a1.5 1.5 0 0 1 1.5 1.5v5.6M13.6 11.3l2.4 2.4 2.4-2.4" /></symbol>
      <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3.7 14.29 9.15 20.18 9.64 15.71 13.51 17.06 19.26 12 16.2 6.94 19.26 8.29 13.51 3.82 9.64 9.71 9.15z" /></symbol>
      <symbol id="i-diamond" viewBox="0 0 24 24"><path d="M12 3.5 20.5 12 12 20.5 3.5 12z" /></symbol>
      <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13.5 2.5 5 13.5h6.2l-.7 8 8.5-11h-6.2z" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></symbol>
      <symbol id="i-check-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.8 5.4-5.5" /></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3.2 2" /></symbol>
      <symbol id="i-alert" viewBox="0 0 24 24"><path d="M10.3 4.6 2.9 17.6a2 2 0 0 0 1.7 2.9h14.8a2 2 0 0 0 1.7-2.9L13.7 4.6a2 2 0 0 0-3.4 0z" /><path d="M12 9.5V14M12 17.2v.1" /></symbol>
      <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8v.1" /></symbol>
      <symbol id="i-dash-circle" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" strokeDasharray="3.4 2.6" /></symbol>
      <symbol id="i-zoom-in" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.6-4.6M8 10.5h5M10.5 8v5" /></symbol>
      <symbol id="i-zoom-out" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.6-4.6M8 10.5h5" /></symbol>
      <symbol id="i-fit" viewBox="0 0 24 24"><path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3M8 12h8M10 10l-2 2 2 2M14 10l2 2-2 2" /></symbol>
      <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.8" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></symbol>
      <symbol id="i-today" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 9.8h17M8 3v4M16 3v4" /><circle cx="12" cy="15.2" r="2.3" fill="currentColor" stroke="none" /></symbol>
      <symbol id="i-palette" viewBox="0 0 24 24"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.8-.9 1.5-1.9-.35-1.2.55-2.4 1.8-2.4h1.8a3.9 3.9 0 0 0 3.9-3.9c0-4.9-4-8.8-9-8.8z" /><g fill="currentColor" stroke="none"><circle cx="7.8" cy="11.6" r="1.2" /><circle cx="10.6" cy="7.9" r="1.2" /><circle cx="15.2" cy="8.4" r="1.2" /></g></symbol>
      <symbol id="i-flag" viewBox="0 0 24 24"><path d="M5.5 21V4M5.5 4.5h11.8l-2.5 4 2.5 4H5.5" /></symbol>
      <symbol id="i-cloud-check" viewBox="0 0 24 24"><path d="M7 18.5a4.5 4.5 0 0 1-.55-8.97A6 6 0 0 1 17.9 9.1a4.7 4.7 0 0 1-.4 9.4z" /><path d="m9.3 13.7 2 2 3.6-3.6" /></symbol>
      <symbol id="i-cloud-off" viewBox="0 0 24 24"><path d="M7 18.5a4.5 4.5 0 0 1-.55-8.97 6 6 0 0 1 1.2-2.6M10.2 5.8a6 6 0 0 1 7.7 3.3 4.7 4.7 0 0 1 1.9 8.1M17 18.5H7M3.5 3.5l17 17" /></symbol>
      <symbol id="i-reset" viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4.5 4.5v4.2h4.2" /></symbol>
      <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.4-4.4" /></symbol>
      <symbol id="i-layers" viewBox="0 0 24 24"><path d="m12 3.5 9 4.5-9 4.5L3 8z" /><path d="m3 12.2 9 4.5 9-4.5M3 16.4l9 4.5 9-4.5" /></symbol>
      <symbol id="i-unfold" viewBox="0 0 24 24"><path d="m7 15.5 5 5 5-5M7 8.5l5-5 5 5" /></symbol>
      <symbol id="i-fold" viewBox="0 0 24 24"><path d="m7 20 5-5 5 5M7 4l5 5 5-5" /></symbol>
      <symbol id="i-ruler" viewBox="0 0 24 24"><rect x="2.5" y="7.5" width="19" height="9" rx="2" /><path d="M6.5 7.5v3M10 7.5V12M13.5 7.5v3M17 7.5V12" /></symbol>
      <symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M11 3.5c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6z" /><path d="M18.5 14.5c.25 1.6.9 2.25 2.5 2.5-1.6.25-2.25.9-2.5 2.5-.25-1.6-.9-2.25-2.5-2.5 1.6-.25 2.25-.9 2.5-2.5z" /></symbol>
      <symbol id="i-list" viewBox="0 0 24 24"><path d="M9.5 6.5h11M9.5 12h11M9.5 17.5h11M4 6.5h.01M4 12h.01M4 17.5h.01" /></symbol>
    </svg>
  );
}

export function Icon({
  name,
  className = "",
  size,
}: {
  name: IconName;
  className?: string;
  size?: "xs" | "sm" | "lg";
}) {
  const sz = size ? ` ${size}` : "";
  return (
    <svg className={`ic${sz} ${className}`.trim()} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}
