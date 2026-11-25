"use client";

import React, { useMemo } from "react";
import { Icon } from "@/components/IconSprite";
import {
  ACCENTS,
  BADGES,
  MONTH_NAMES_EN,
  MONTH_NAMES_ID,
  SIZE_DEF,
} from "@/constants/theme";
import { useTimeline } from "@/store/useTimelineStore";

function formatLocalTodayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function SlidePanel() {
  const { activePage, lang, updateActivePage, t } = useTimeline();
  const monthNames = lang === "en" ? MONTH_NAMES_EN : MONTH_NAMES_ID;

  const currentMonthOptions = useMemo(() => {
    if (activePage.months.length > 0) {
      return activePage.months.map((m) => {
        const idx = MONTH_NAMES_ID.indexOf(
          m.name as (typeof MONTH_NAMES_ID)[number]
        );
        const label = idx >= 0 ? `${monthNames[idx]} ${m.year}` : `${m.name} ${m.year}`;
        return { key: `${m.name}|${m.year}`, name: m.name, year: m.year, label, weeks: m.weeks };
      });
    }
    return MONTH_NAMES_ID.map((name, i) => ({
      key: `${name}|${activePage.cy}`,
      name,
      year: activePage.cy,
      label: `${monthNames[i]} ${activePage.cy}`,
      weeks: [1, 2, 3, 4],
    }));
  }, [activePage.months, activePage.cy, monthNames]);

  const activeMonthMeta = useMemo(() => {
    return (
      currentMonthOptions.find(
        (m) => m.name === activePage.cm && m.year === activePage.cy
      ) || currentMonthOptions[0]
    );
  }, [currentMonthOptions, activePage.cm, activePage.cy]);

  const logoMetaText = useMemo(() => {
    const hasL = Boolean(activePage.logoL || activePage.logl);
    const hasR = Boolean(activePage.logoR || activePage.logr);
    if (!hasL && !hasR) return t("pg.logo.empty");
    const lLabel = hasL ? (lang === "en" ? "Left: set" : "Kiri: ada") : lang === "en" ? "Left: empty" : "Kiri: kosong";
    const rLabel = hasR ? (lang === "en" ? "Right: set" : "Kanan: ada") : lang === "en" ? "Right: empty" : "Kanan: kosong";
    return `${lLabel} · ${rLabel}`;
  }, [activePage.logoL, activePage.logl, activePage.logoR, activePage.logr, lang, t]);

  const handleLogoFile = (side: "logoL" | "logoR", file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateActivePage({ [side]: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel">
      {/* Slide Info */}
      <div className="sec">
        <div className="sec-h">
          <Icon name="slide" />
          <span>{t("pg.sec.info")}</span>
        </div>
        <div className="sec-b">
          <div className="fg">
            <label htmlFor="f-title">{t("pg.f.title")}</label>
            <input
              id="f-title"
              className="inp"
              value={activePage.title}
              placeholder={t("pg.f.title.ph")}
              onChange={(e) => updateActivePage({ title: e.target.value })}
            />
          </div>
          <div className="fg">
            <label htmlFor="f-sub">
              {t("pg.f.sub")} <span className="kv">{t("pg.f.sub.opt")}</span>
            </label>
            <input
              id="f-sub"
              className="inp"
              value={activePage.subtitle}
              placeholder={t("pg.f.sub.ph")}
              onChange={(e) => updateActivePage({ subtitle: e.target.value })}
            />
          </div>
          <div className="fg">
            <label htmlFor="f-tgt">{t("pg.f.tgt")}</label>
            <input
              id="f-tgt"
              className="inp"
              value={activePage.tgt}
              placeholder={t("pg.f.tgt.ph")}
              onChange={(e) => updateActivePage({ tgt: e.target.value })}
            />
          </div>
          <div className="fg">
            <label>{t("pg.f.tgtc")}</label>
            <div className="swatches">
              {BADGES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`sw${activePage.tgtc.toUpperCase() === hex ? " on" : ""}`}
                  style={{ background: hex }}
                  aria-label={`Badge color ${hex}`}
                  onClick={() => updateActivePage({ tgtc: hex })}
                />
              ))}
              <label className="sw-custom" title="Custom color">
                <input
                  type="color"
                  value={activePage.tgtc}
                  onChange={(e) => updateActivePage({ tgtc: e.target.value })}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <details className="sec fold" id="sec-logo">
        <summary className="sec-h" title={t("pg.sec.logo.t")}>
          <Icon name="image" />
          <span>{t("pg.sec.logo")}</span>
          <span className="sp" />
          <span className="kv">{logoMetaText}</span>
          <Icon name="chev-down" className="chev" />
        </summary>
        <div className="sec-b">
          <div id="logo-panel">
            {(["L", "R"] as const).map((side) => {
              const imgKey = side === "L" ? "logoL" : "logoR";
              const txtKey = side === "L" ? "logl" : "logr";
              const colKey = side === "L" ? "loglc" : "logrc";
              const imgVal = activePage[imgKey];
              const txtVal = activePage[txtKey];
              const colVal = activePage[colKey];
              return (
                <div key={side} className="logo-side">
                  <div className="logo-h">
                    <span>{side === "L" ? t("pg.logo.left") : t("pg.logo.right")}</span>
                    {(imgVal || txtVal) && (
                      <button
                        type="button"
                        className="btn xs ghost"
                        onClick={() =>
                          updateActivePage({ [imgKey]: "", [txtKey]: "" })
                        }
                      >
                        <Icon name="x" size="xs" />
                      </button>
                    )}
                  </div>
                  <label className="drop">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) =>
                        handleLogoFile(imgKey, e.target.files?.[0])
                      }
                    />
                    {imgVal ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgVal} alt={`${side} logo`} />
                    ) : (
                      <div className="ph">
                        <Icon name="upload" />
                        <span>{t("pg.logo.drop")}</span>
                      </div>
                    )}
                  </label>
                  <div className="hrow">
                    <input
                      type="text"
                      className="inp sm"
                      value={txtVal}
                      placeholder={t("pg.logo.text.ph")}
                      onChange={(e) =>
                        updateActivePage({ [txtKey]: e.target.value })
                      }
                    />
                    <input
                      type="color"
                      className="inp sm"
                      value={colVal}
                      onChange={(e) =>
                        updateActivePage({ [colKey]: e.target.value })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hint">{t("pg.logo.hint")}</div>
        </div>
      </details>

      {/* Period & Status */}
      <div className="sec">
        <div className="sec-h">
          <Icon name="target" />
          <span>{t("pg.sec.period")}</span>
        </div>
        <div className="sec-b">
          <div className="fg">
            <label htmlFor="f-today">{t("pg.f.today")}</label>
            <div className="hrow">
              <input
                type="date"
                className="inp"
                id="f-today"
                value={activePage.today}
                onChange={(e) => updateActivePage({ today: e.target.value })}
              />
              <button
                type="button"
                className="btn sm soft"
                title={t("pg.today.t")}
                onClick={() => updateActivePage({ today: formatLocalTodayISO() })}
              >
                <Icon name="today" />
                <span>{t("core.today")}</span>
              </button>
              <button
                type="button"
                className="ibtn"
                title={t("pg.cleartoday.t")}
                aria-label={t("pg.cleartoday.t")}
                onClick={() => updateActivePage({ today: "" })}
              >
                <Icon name="x" />
              </button>
            </div>
          </div>

          <div className="row2">
            <div className="fg">
              <label htmlFor="f-cm">{t("pg.f.cm")}</label>
              <select
                id="f-cm"
                className="inp"
                value={`${activePage.cm}|${activePage.cy}`}
                onChange={(e) => {
                  const [cm, cyStr] = e.target.value.split("|");
                  updateActivePage({ cm, cy: Number(cyStr) || activePage.cy });
                }}
              >
                {currentMonthOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label htmlFor="f-cw">{t("pg.f.cw")}</label>
              <select
                id="f-cw"
                className="inp"
                value={activePage.cw}
                onChange={(e) =>
                  updateActivePage({ cw: Number(e.target.value) || 1 })
                }
              >
                {(activeMonthMeta?.weeks || [1, 2, 3, 4]).map((w) => (
                  <option key={w} value={w}>
                    W{w}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="tgl">
            <input
              type="checkbox"
              checked={activePage.autoStatus}
              onChange={(e) =>
                updateActivePage({ autoStatus: e.target.checked })
              }
            />
            <span className="tk" />
            <span className="tx">
              <span>{t("pg.autostatus")}</span>
              <small>{t("pg.autostatus.d")}</small>
            </span>
          </label>

          <div className="fg">
            <label>{t("pg.atrisk.tol")}</label>
            <div className="stepper" style={{ width: 130 }}>
              <button
                type="button"
                title={t("pg.step.minus")}
                aria-label={t("pg.step.minus")}
                onClick={() =>
                  updateActivePage({
                    atRiskThreshold: Math.max(1, activePage.atRiskThreshold - 1),
                  })
                }
              >
                <Icon name="minus" />
              </button>
              <input
                type="number"
                min={1}
                max={60}
                value={activePage.atRiskThreshold}
                onChange={(e) =>
                  updateActivePage({
                    atRiskThreshold: Math.max(
                      1,
                      Math.min(60, Number(e.target.value) || 10)
                    ),
                  })
                }
              />
              <button
                type="button"
                title={t("pg.step.plus")}
                aria-label={t("pg.step.plus")}
                onClick={() =>
                  updateActivePage({
                    atRiskThreshold: Math.min(60, activePage.atRiskThreshold + 1),
                  })
                }
              >
                <Icon name="plus" />
              </button>
            </div>
          </div>

          <details className="rules">
            <summary>
              <Icon name="chev-right" size="sm" />
              <span>{t("pg.rules")}</span>
            </summary>
            <div className="note">
              <Icon name="bolt" />
              <div>{t("pg.rules.note")}</div>
            </div>
          </details>
        </div>
      </div>

      {/* Appearance */}
      <div className="sec">
        <div className="sec-h">
          <Icon name="palette" />
          <span>{t("pg.sec.look")}</span>
        </div>
        <div className="sec-b">
          <div className="fg">
            <label>{t("pg.accent")}</label>
            <div className="swatches">
              {ACCENTS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  className={`sw${activePage.accent.toUpperCase() === hex ? " on" : ""}`}
                  style={{ background: hex }}
                  aria-label={`Accent ${hex}`}
                  onClick={() => updateActivePage({ accent: hex })}
                />
              ))}
              <label className="sw-custom" title="Custom accent color">
                <input
                  type="color"
                  value={activePage.accent}
                  onChange={(e) => updateActivePage({ accent: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="hrow" style={{ justifyContent: "space-between" }}>
            <label className="tgl">
              <input
                type="checkbox"
                checked={activePage.showDeps}
                onChange={(e) =>
                  updateActivePage({ showDeps: e.target.checked })
                }
              />
              <span className="tk" />
              <span className="tx">{t("pg.deps")}</span>
            </label>
            <input
              type="color"
              className="inp"
              title={t("pg.depcolor.t")}
              value={activePage.depColor}
              onChange={(e) => updateActivePage({ depColor: e.target.value })}
              style={{ height: 30, width: 38 }}
            />
          </div>

          <label className="tgl">
            <input
              type="checkbox"
              checked={activePage.showToday}
              onChange={(e) => updateActivePage({ showToday: e.target.checked })}
            />
            <span className="tk" />
            <span className="tx">{t("pg.todayline")}</span>
          </label>

          <label className="tgl">
            <input
              type="checkbox"
              checked={activePage.msRail}
              onChange={(e) => updateActivePage({ msRail: e.target.checked })}
            />
            <span className="tk" />
            <span className="tx">
              <span>{t("pg.msrail")}</span>
              <small>{t("pg.msrail.d")}</small>
            </span>
          </label>

          <label className="tgl">
            <input
              type="checkbox"
              checked={activePage.groupRollup}
              onChange={(e) =>
                updateActivePage({ groupRollup: e.target.checked })
              }
            />
            <span className="tk" />
            <span className="tx">
              <span>{t("pg.rollup")}</span>
              <small>{t("pg.rollup.d")}</small>
            </span>
          </label>

          <label className="tgl">
            <input
              type="checkbox"
              checked={activePage.showLegend}
              onChange={(e) =>
                updateActivePage({ showLegend: e.target.checked })
              }
            />
            <span className="tk" />
            <span className="tx">{t("pg.legend")}</span>
          </label>

          <label className="tgl">
            <input
              type="checkbox"
              checked={activePage.showOwner}
              onChange={(e) => updateActivePage({ showOwner: e.target.checked })}
            />
            <span className="tk" />
            <span className="tx">
              <span>{t("pg.owner")}</span>
              <small>{t("pg.owner.d")}</small>
            </span>
          </label>
        </div>
      </div>

      {/* Sizing */}
      <details className="sec fold">
        <summary className="sec-h" title={t("pg.size.t")}>
          <Icon name="ruler" />
          <span>{t("pg.size")}</span>
          <span className="sp" />
          <span className="kv">
            {activePage.fs}px · {activePage.rh}px
          </span>
          <Icon name="chev-down" className="chev" />
        </summary>
        <div className="sec-b">
          <div className="hrow">
            <button
              type="button"
              className="btn sm"
              title={t("pg.resetsize.t")}
              onClick={() => updateActivePage({ ...SIZE_DEF })}
            >
              <Icon name="reset" />
              <span>{t("pg.resetsize")}</span>
            </button>
          </div>
          <div className="row2">
            {(
              [
                ["fs", t("pg.fs"), 9, 16, 1],
                ["rh", t("pg.rh"), 22, 54, 2],
                ["lw", t("pg.taskw"), 120, 420, 10],
                ["dw", t("pg.durw"), 100, 320, 10],
                ["ow", t("pg.picw"), 70, 300, 10],
                ["sw", t("pg.statw"), 70, 360, 10],
                ["ww", t("pg.colw"), 20, 160, 4],
              ] as const
            ).map(([field, label, min, max, step]) => (
              <div key={field} className="fg">
                <label>{label}</label>
                <div className="stepper">
                  <button
                    type="button"
                    onClick={() =>
                      updateActivePage({
                        [field]: Math.max(min, activePage[field] - step),
                      })
                    }
                  >
                    <Icon name="minus" />
                  </button>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={activePage[field]}
                    onChange={(e) =>
                      updateActivePage({
                        [field]: Math.max(
                          min,
                          Math.min(max, Number(e.target.value) || min)
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateActivePage({
                        [field]: Math.min(max, activePage[field] + step),
                      })
                    }
                  >
                    <Icon name="plus" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="hint">{t("pg.size.hint")}</div>
        </div>
      </details>
    </div>
  );
}
