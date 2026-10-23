/* ============================================================
   华夏纪年 · 交互层
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.CHRONICLE_DATA;
  const MIN_YEAR = -2999; // 公元前3000年（天文纪年）
  const MAX_YEAR = 1912;
  const CURRENT_YEAR = new Date().getFullYear();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const pad = (n) => String(n).padStart(2, "0");

  const TYPE_LABELS = {
    politics: "政治",
    war: "战争",
    institution: "制度",
    reform: "变革",
    culture: "文化",
    science: "科技",
    society: "社会",
    diplomacy: "外交",
    disaster: "灾变",
  };
  const TYPE_ORDER = ["war", "politics", "institution", "reform", "culture", "science", "diplomacy", "society", "disaster"];

  /* ---------- 年份工具 ---------- */
  function parseYear(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value == null) return null;
    let s = String(value).trim();
    if (!s) return null;
    s = s.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248));
    s = s.replace(/\s+/g, "").replace(/公元|紀元|纪年|年|约|約/g, "");
    let bc = false;
    if (/^前/.test(s)) { bc = true; s = s.slice(1); }
    if (/^公元前/.test(s)) { bc = true; s = s.replace(/^公元前/, ""); }
    if (/^(bc|bce)/i.test(s)) { bc = true; s = s.replace(/^(bc|bce)/i, ""); }
    if (/(bc|bce)$/i.test(s)) { bc = true; s = s.replace(/(bc|bce)$/i, ""); }
    if (/^-/.test(s)) { bc = true; s = s.slice(1); }
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 1) return null;
    return bc ? 1 - Math.round(n) : Math.round(n);
  }

  function formatYear(y) {
    return y <= 0 ? "前" + (1 - y) : String(y);
  }

  function formatYearFull(y) {
    return y <= 0 ? "公元前" + (1 - y) + "年" : "公元" + y + "年";
  }

  function formatRange(start, end) {
    return `${formatYear(start)}—${formatYear(end)}`;
  }

  function centuryLabel(y) {
    if (y <= 0) return "公元前" + (Math.floor((1 - y - 1) / 100) + 1) + "世纪";
    return "公元" + (Math.floor((y - 1) / 100) + 1) + "世纪";
  }

  const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  function ganZhi(y) {
    const idx = ((y - 4) % 60 + 60) % 60;
    return STEMS[idx % 10] + BRANCHES[idx % 12];
  }

  function cnNumber(n) {
    n = Math.round(n);
    if (n <= 0) return "0";
    if (n < 10) return "〇一二三四五六七八九"[n];
    if (n < 20) return "十" + (n === 10 ? "" : cnNumber(n % 10));
    if (n < 100) return cnNumber(Math.floor(n / 10)) + "十" + (n % 10 ? cnNumber(n % 10) : "");
    if (n < 1000) return cnNumber(Math.floor(n / 100)) + "百" + (n % 100 ? (n % 100 < 10 ? "〇" : "") + cnNumber(n % 100) : "");
    return String(n);
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function relativeYear(y) {
    return CURRENT_YEAR - y;
  }

  function contrastOn(hex) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const lin = (c) => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
    const L = .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
    return L > .48 ? "#171814" : "#fffdf7";
  }

  function unique(arr) { return Array.from(new Set(arr)); }

  /* ---------- 山河视觉 ---------- */
  const ERA_SCENE_LABELS = {
    legendary: ["山河初纪", "山岳、河川与聚落的记忆"],
    "xia-shang": ["青铜礼序", "鼎彝、甲骨与王邑"],
    zhou: ["礼乐列国", "车马、简册与诸侯城邦"],
    "qin-han": ["关山一统", "长城、驰道与西行驼队"],
    "wei-jin": ["江左风流", "山水、清谈与南渡衣冠"],
    "sui-tang": ["长安万国", "宫阙、佛塔与丝路商旅"],
    "five-song": ["汴河千里", "桥市、舟楫与海舶"],
    "yuan-ming": ["海陆交汇", "城垣、帆影与驿路"],
    qing: ["四海风雷", "海防、铁路与新旧交叠"],
  };

  function eraArtSVG(eraId) {
    const shared = `<path class="scene-horizon" d="M8 118C54 110 78 119 114 106s62 4 95-7c31-10 60 6 91-2 35-9 64 2 96-5 40-9 70 5 96-1"/>`;
    const motifs = {
      legendary: `
        <path class="scene-fill" d="M0 126 29 92l23 14 29-44 25 32 24-19 32 43 24-30 30 43 21-18 36 36v42H0Z"/>
        <path class="scene-line" d="M8 125c45-20 73-8 107-24 33-16 63 8 99-9 32-15 61 5 91-8 29-12 60 3 91-7 32-10 63 2 96-5 29-8 58 3 86-1"/>`,
      "xia-shang": `
        <path class="scene-fill" d="M122 52h112l-12 49c-20 15-56 20-88 0Z"/>
        <path class="scene-line" d="M138 56h80M160 50v-18h36v18M135 101l-20 18M221 101l20 18M149 75h58M179 50v-17"/>
        <path class="scene-fill-soft" d="M22 131c35-28 68-19 94-33 49-27 85-5 121-24 30-15 67-3 98 22 24 19 43 16 65 33v28H22Z"/>`,
      zhou: `
        <circle class="scene-sun" cx="239" cy="43" r="20"/>
        <path class="scene-fill-soft" d="M8 126c50-8 78-37 127-25 43 11 63-18 110-8 40 8 66-15 105 0 25 9 42 20 63 31v35H8Z"/>
        <path class="scene-fill" d="M91 91h54v29H91zM145 77l33 14v29h-68V91M98 104h-18l9 14m43-14h18l-9 14"/>
        <circle class="scene-wheel" cx="92" cy="112" r="9"/><circle class="scene-wheel" cx="145" cy="112" r="9"/>
        <path class="scene-line" d="M203 64h54v47h-54zM211 72h38M211 81h38M211 90h38"/>`,
      "qin-han": `
        <circle class="scene-sun" cx="288" cy="42" r="18"/>
        <path class="scene-fill-soft" d="M0 130c44-15 76-1 110-30 28-24 64-6 93-24 31-20 66 0 97-13 40-16 76 12 118 10 21-1 43 8 62 19v36H0Z"/>
        <path class="scene-fill" d="M25 91h186l21 12v11h-19v13h-20v-13h-27v13H147v-13h-28v13H99v-13H72v13H52v-13H31v13H14v-16Z"/>
        <path class="scene-line" d="M35 89v-10h18v10M94 88v-10h17v10M151 87v-10h18v10M262 76h15v-22l12-8 12 8v22h14v-30l-17-13-18 12v8"/>
        <path class="scene-fill" d="M266 63c12 0 21 7 25 17l-19 9-2-14-4 14-20-9c5-10 9-17 20-17Z"/>`,
      "wei-jin": `
        <path class="scene-fill" d="M11 136c31-22 44-55 82-55 27 0 33 25 63 21 26-3 35-29 61-25 28 4 38 36 78 40 20 2 35 11 48 23v24H11Z"/>
        <path class="scene-line" d="M27 128c31-4 28-29 56-52m-15 66c25-14 39-31 45-55m108 34c-15-17-16-38-1-48 17 10 19 30 7 49"/>
        <path class="scene-fill-soft" d="M179 98h73l-9 10h-54Z"/>
        <path class="scene-line" d="M190 105v30m52-30v30M186 112h60M214 69v29"/>`,
      "sui-tang": `
        <circle class="scene-sun" cx="278" cy="43" r="19"/>
        <path class="scene-fill-soft" d="M0 134c48-17 73-4 115-31 29-19 61-8 91-25 38-21 71 2 107-11 38-14 65 6 96 20 27 12 42 26 55 42v29H0Z"/>
        <path class="scene-fill" d="M74 115h122v26H74zM84 77h102v38H84zM100 55h70v22h-70z"/>
        <path class="scene-line" d="M92 126V91m12-23h56m-52 0v-16l24-13 25 13v16M101 101h68M118 94v32m34-32v32M209 63h19v19h-19zM217 63l-9-12h24l-9 12"/>
        <path class="scene-line" d="M279 119c0-20 8-29 18-29s18 9 18 29m-41 0h46m-36-29V77m17 13V77m-9-12v-11m-8 0h16"/>`,
      "five-song": `
        <circle class="scene-sun" cx="253" cy="46" r="18"/>
        <path class="scene-fill-soft" d="M0 132c38-15 62-7 105-28 42-20 81 1 122-15 47-19 82-1 130 3 38 4 54 14 76 29v27H0Z"/>
        <path class="scene-line" d="M11 136c41 4 66 19 101 7 53-19 71-28 116-8 50 22 88-9 142 6 22 6 38 13 56 22"/>
        <path class="scene-fill" d="M107 113h155v7H107Z"/><path class="scene-fill-soft" d="M130 120c17-2 23 10 20 21h-42c-3-11 5-21 22-21Zm111 0c17-2 23 10 20 21h-42c-3-11 5-21 22-21Z"/>
        <path class="scene-fill" d="M43 103h47l-9 8H52Zm90-36h9v39h-9zm2 4 28 18-28 2Z"/>`,
      "yuan-ming": `
        <path class="scene-fill-soft" d="M0 131c48-16 82-2 114-29 29-25 63-11 98-27 42-19 72 7 112-4 37-10 65 8 96 28 16 11 27 19 39 32v28H0Z"/>
        <path class="scene-fill" d="M17 97h177v18H17zM31 114h143v22H31z"/>
        <path class="scene-line" d="M39 96v-12h17v12m18 0v-12h17v12m18 0v-12h17v12m18 0v-12h17v12m16 0v-12h17v12"/>
        <path class="scene-fill" d="M209 100h108l-16 22H226Z"/><path class="scene-line" d="M263 100V65m0 8 43 28h-43Z"/>
        <path class="scene-line" d="M27 140c38 11 76-2 112 5 37 7 74-4 110 3 31 6 63 1 91-3"/>`,
      qing: `
        <circle class="scene-sun" cx="286" cy="45" r="18"/>
        <path class="scene-fill-soft" d="M0 134c48-18 76-3 115-32 26-19 59-5 93-23 44-23 75 3 111-6 34-8 62 8 84 25 20 15 37 24 59 42v26H0Z"/>
        <path class="scene-fill" d="M49 121h124v16H49zM58 95h107v26H58zM76 74h73v21H76z"/>
        <path class="scene-line" d="M67 120h90M76 102h73m-60 0V88h43v14M88 74V61l24-12 25 12v13"/>
        <path class="scene-line" d="M215 140 268 88l74-31M198 142l56-46 67-28M240 120l-17-8m44-12 12 8m-4-7 24 8m-18-8 31-10"/>
        <path class="scene-fill" d="M205 99h36v16h-36z"/><circle class="scene-wheel" cx="214" cy="119" r="7"/><circle class="scene-wheel" cx="232" cy="119" r="7"/>
        <path class="scene-line" d="M252 67c8-8 16-10 25-18M261 75c8-8 17-12 26-21"/>`,
    };
    return `<svg class="era-illustration" viewBox="0 0 420 165" aria-hidden="true">${shared}${motifs[eraId] || motifs.legendary}</svg>`;
  }

  const historicalMapIndex = window.HISTORICAL_MAP_INDEX || { phases: [], coverage: [-403, 1912] };

  function historicalMapForYear(year) {
    return historicalMapIndex.phases.find((phase) => year >= phase.from && year <= phase.to) || null;
  }

  function territoryPlateHTML(period, year, mode) {
    const eraId = period && period.eraId ? period.eraId : "legendary";
    const name = period ? period.name : "纪年之外";
    const map = historicalMapForYear(year);
    if (!map) {
      return `<figure class="territory-plate is-unavailable${mode === "compact" ? " is-compact" : ""}" data-era="${esc(eraId)}">
        <div class="historical-map-frame">
          <div class="historical-map-empty">
            <span class="historical-map-empty-mark">前</span>
            <strong>403</strong>
            <p>连续疆域快照始于战国中期</p>
          </div>
        </div>
        <figcaption>
          <span class="territory-kicker">ATLAS · 历史疆域</span>
          <strong>${esc(name)}</strong>
          <span>${esc(formatYear(year))}年</span>
          <p>此年早于本站连续疆域快照的起始年，暂不绘制推测边界。早期国家形态仍需结合考古遗址与文献分区判读。</p>
          <a class="map-source-link" href="#" data-go-year="-403">从战国疆域图开始查看 <svg class="icon"><use href="#i-arrow-right"></use></svg></a>
        </figcaption>
      </figure>`;
    }
    const sourceUrl = `https://deanchen.me/jiangshan-map/?year=${encodeURIComponent(year)}`;
    const phaseSpan = formatRange(map.from, map.to);
    const mapAlt = `${map.dynasty} ${formatYear(year)}年历史疆域示意图`;
    return `<figure class="territory-plate${mode === "compact" ? " is-compact" : ""}" data-era="${esc(eraId)}">
      <div class="historical-map-frame">
        <img class="historical-map-image" src="${esc(map.file)}" alt="${esc(mapAlt)}" loading="lazy" decoding="async" />
        <button type="button" class="map-expand" data-map-zoom data-map-src="${esc(map.file)}" data-map-title="${esc(map.dynasty)} · ${esc(formatYear(year))}" data-map-alt="${esc(mapAlt)}" data-map-source="${esc(sourceUrl)}" aria-label="放大查看${esc(mapAlt)}">
          <svg class="icon"><use href="#i-plus"></use></svg><span>放大</span>
        </button>
        <span class="historical-map-caption">${esc(map.dynasty)} · ${esc(formatYear(year))}</span>
      </div>
      <figcaption>
        <span class="territory-kicker">ATLAS · 历史疆域快照</span>
        <strong>${esc(map.dynasty)}</strong>
        <span>${esc(phaseSpan)} · 本图对应 ${esc(formatYear(year))} 年</span>
        <p>${esc(map.overview || "按历史政权与一级行政区资料绘制的阶段疆域图。")}</p>
        <div class="territory-legend"><span><i class="is-core"></i>历史政权</span><span><i class="is-region"></i>一级行政区</span><span><i class="is-water"></i>主要水系</span></div>
        <a class="map-source-link" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">查看同年交互舆图 <svg class="icon"><use href="#i-external"></use></svg></a>
        <small class="map-disclaimer">历史边界为数据整理中的概括示意，不作现代测绘边界使用。</small>
      </figcaption>
    </figure>`;
  }

  /* ---------- 索引 ---------- */
  const eraById = new Map(DATA.eras.map((e) => [e.id, e]));

  const periods = DATA.periods.map((p, index) => {
    const start = parseYear(p.start);
    const end = parseYear(p.end);
    return { ...p, index, startNum: start, endNum: end, era: eraById.get(p.eraId) };
  });
  const states = DATA.states.map((s) => ({ ...s, startNum: parseYear(s.start), endNum: parseYear(s.end) }));
  const allPolities = [...periods, ...states];
  const polityById = new Map(allPolities.map((p) => [p.id, p]));

  const rulers = DATA.rulers.map((r, index) => ({
    ...r,
    index,
    startNum: parseYear(r.start),
    endNum: parseYear(r.end),
    polity: polityById.get(r.polityId),
    eras: (r.era || []).map((e) => ({ ...e, startNum: parseYear(e.start), endNum: parseYear(e.end) })).filter((e) => e.startNum != null),
  }));

  function lifeRange(f) {
    if (!f.life) return [null, null];
    if (Array.isArray(f.life)) {
      if (f.life.length === 2) return [parseYear(f.life[0]), parseYear(f.life[1])];
      if (f.life.length === 1) {
        const parts = String(f.life[0]).split(/[—–－]/);
        if (parts.length === 2) return [parseYear(parts[0]), parseYear(parts[1])];
      }
    }
    return [null, null];
  }
  const figures = DATA.figures.map((f, index) => {
    const [start, end] = lifeRange(f);
    return { ...f, index, startNum: start, endNum: end };
  });
  const figureById2 = new Map(figures.map((f) => [f.id, f]));
  const figureById = figureById2;
  const periodById = new Map(periods.map((p) => [p.id, p]));
  const stateById = new Map(states.map((s) => [s.id, s]));
  const rulerById = new Map(rulers.map((r) => [r.id, r]));

  const events = DATA.events.map((e, index) => {
    const y = parseYear(e.year);
    return {
      ...e,
      id: "evt-" + index,
      index,
      yearNum: y,
      century: y == null ? "年代不详" : centuryLabel(y),
      typeLabel: TYPE_LABELS[e.type] || "史事",
      figures: e.figures || [],
    };
  }).filter((e) => e.yearNum != null)
    .sort((a, b) => a.yearNum - b.yearNum || b.importance - a.importance || a.index - b.index);
  const eventById = new Map(events.map((e) => [e.id, e]));
  const anchorEvents = events.filter((e) => e.anchor || e.importance === 3);

  function periodAnomaly(period, y) {
    if (!period || !period.anomalies) return null;
    return period.anomalies.find((a) => {
      const s = parseYear(a.start), e = parseYear(a.end);
      return s != null && e != null && y >= s && y <= e;
    }) || null;
  }

  function periodsAtYear(y) {
    return periods.filter((p) => p.startNum != null && p.endNum != null && y >= p.startNum && y <= p.endNum)
      .sort((a, b) => (a.priority || 10) - (b.priority || 10) || b.startNum - a.startNum);
  }
  function statesAtYear(y) {
    return states.filter((s) => s.startNum != null && s.endNum != null && y >= s.startNum && y <= s.endNum)
      .sort((a, b) => (a.type === "并立" ? 0 : 1) - (b.type === "并立" ? 0 : 1) || b.startNum - a.startNum);
  }
  function rulersAtYear(y) {
    return rulers.filter((r) => r.startNum != null && r.endNum != null && y >= r.startNum && y <= r.endNum)
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.startNum - a.startNum);
  }
  function rulersOfPolity(id) {
    return rulers.filter((r) => r.polityId === id).sort((a, b) => {
      if (a.startNum == null && b.startNum == null) return a.index - b.index;
      if (a.startNum == null) return 1;
      if (b.startNum == null) return -1;
      return a.startNum - b.startNum || a.index - b.index;
    });
  }
  function figuresAtYear(y) {
    return figures.filter((f) => f.startNum != null && f.endNum != null && y >= f.startNum && y <= f.endNum)
      .sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }
  function eventsAtYear(y) {
    return events.filter((e) => e.yearNum === y);
  }
  function eventsNearYear(y, radius, limit) {
    return events.filter((e) => Math.abs(e.yearNum - y) <= radius && e.yearNum !== y)
      .sort((a, b) => Math.abs(a.yearNum - y) - Math.abs(b.yearNum - y) || b.importance - a.importance)
      .slice(0, limit || 5);
  }
  function eventsInRange(start, end) {
    return events.filter((e) => e.yearNum >= start && e.yearNum <= end);
  }
  function eventPeopleHTML(event, limit) {
    const ids = unique(event.figures || []).slice(0, limit || 5);
    if (!ids.length) return "";
    return `<div class="figure-chips">${ids.map((id) => {
      const person = rulerById.get(id) || figureById2.get(id);
      if (!person) return "";
      const isRuler = rulerById.has(id);
      const attr = isRuler ? "data-ruler-id" : "data-figure-id";
      return `<button type="button" class="figure-chip" ${attr}="${esc(id)}">${esc(isRuler ? (person.title || person.name) : person.name)}</button>`;
    }).join("")}</div>`;
  }

  function rulerEraLabel(ruler, y) {
    if (!ruler) return "";
    const era = (ruler.eras || []).filter((e) => e.startNum != null && y >= e.startNum && (e.endNum == null || y <= e.endNum)).pop();
    if (era) {
      const n = y - era.startNum + 1;
      const unit = era.unit || "年";
      return `${era.name}${n === 1 ? "元" : cnNumber(n)}${unit}`;
    }
    if (ruler.startNum != null && y >= ruler.startNum) {
      return `在位第${cnNumber(y - ruler.startNum + 1)}年`;
    }
    return ruler.reignLabel || "在位年不详";
  }

  function rulerLife(r) {
    if (r.startNum != null && r.endNum != null) return formatRange(r.startNum, r.endNum);
    return r.reignLabel || "在位年不详";
  }

  function personOf(id) {
    return rulerById.get(id) || figureById2.get(id) || null;
  }

  /* ---------- 状态 ---------- */
  const state = {
    view: "overview",
    year: 755,
    zoom: "all",
    viewStart: MIN_YEAR,
    viewEnd: MAX_YEAR,
    periodFilter: "all",
    periodDetail: null,
    eventType: "all",
    eventEra: "all",
    eventQuery: "",
    eventNear: false,
    eventListYear: null,
    timelineMode: "major",
    fineStart: 715,
    fineEnd: 795,
    drawerTrigger: null,
  };

  const PLAYER_SPEEDS = { 1: "慢", 1.8: "中", 3.2: "快" };
  const player = {
    open: false,
    stage: false,
    mode: "all",
    periodId: "tang",
    start: MIN_YEAR,
    end: MAX_YEAR,
    speed: 1,
    chapters: [],
    index: 0,
    playing: false,
    timer: null,
    raf: null,
    ended: false,
    trigger: null,
    displayYear: 755,
  };

  let timelineBuilt = false;
  let yearRenderQueued = false;
  let eventRenderQueued = false;
  let eventScrollQueued = false;
  let eventScrollLockUntil = 0;
  let toastTimer = null;

  /* ---------- DOM ---------- */
  const dom = {
    header: $("#siteHeader"),
    scrollProgress: $("#scrollProgress"),
    nav: $(".main-nav"),
    navLinks: $$(".nav-link"),
    navInk: $(".nav-ink"),
    themeToggle: $("#themeToggle"),
    views: {
      overview: $("#view-overview"),
      year: $("#view-year"),
      periods: $("#view-periods"),
      events: $("#view-events"),
    },
    heroForm: $("#heroYearForm"),
    heroInput: $("#heroYearInput"),
    heroError: $("#heroYearError"),
    scrollToTimeline: $("#scrollToTimeline"),
    openPlayerTop: $("#openPlayerTop"),
    quickYears: $("#quickYears"),
    statsStrip: $("#statsStrip"),
    heroStrata: $("#heroStrata"),
    timelineYear: $("#timelineYear"),
    timelineEra: $("#timelineEra"),
    timelineGz: $("#timelineGz"),
    timelineExtra: $("#timelineExtra"),
    zoomBtns: $("#zoomBtns"),
    timelineMode: $("#timelineMode"),
    prevEvent: $("#prevEvent"),
    nextEvent: $("#nextEvent"),
    randomYear: $("#randomYear"),
    openPlayerTimeline: $("#openPlayerTimeline"),
    timelineMap: $("#timelineMap"),
    timelineAxis: $("#timelineAxis"),
    tlEraLabels: $("#tlEraLabels"),
    tlPeriods: $("#tlPeriods"),
    tlEvents: $("#tlEvents"),
    tlPlayhead: $("#tlPlayhead"),
    tlTooltip: $("#tlTooltip"),
    mainRange: $("#mainRange"),
    mainBubble: $("#mainBubble"),
    mainTrackBg: $("#mainTrackBg"),
    fineScrub: $("#fineScrub"),
    fineRange: $("#fineRange"),
    fineStart: $("#fineStart"),
    fineEnd: $("#fineEnd"),
    snapshot: $("#overviewSnapshot"),
    yearForm: $("#yearForm"),
    yearInput: $("#yearInput"),
    yearError: $("#yearError"),
    yearResult: $("#yearResult"),
    eraFilters: $("#eraFilters"),
    periodGrid: $("#periodGrid"),
    periodDetail: $("#periodDetail"),
    periodTimebar: $("#periodTimebar"),
    eventEraFilter: $("#eventEraFilter"),
    eventTypeFilters: $("#eventTypeFilters"),
    eventCenturyNav: $("#eventCenturyNav"),
    eventSearch: $("#eventSearch"),
    eventList: $("#eventList"),
    eventEmpty: $("#eventEmpty"),
    eventStats: $("#eventStats"),
    eventNearBtn: $("#eventNearBtn"),
    clearEventFilters: $("#clearEventFilters"),
    eventTimebar: $("#eventTimebar"),
    dock: $("#timeDock"),
    dockYear: $("#dockYear"),
    dockMeta: $("#dockMeta"),
    dockRange: $("#dockRange"),
    dockTrackBg: $("#dockTrackBg"),
    dockOpen: $("#dockOpen"),
    drawerLayer: $("#drawerLayer"),
    drawer: $("#drawer"),
    drawerBody: $("#drawerBody"),
    drawerKicker: $("#drawerKicker"),
    drawerClose: $("#drawerClose"),
    drawerBackdrop: $("#drawerBackdrop"),
    mapViewer: $("#mapViewer"),
    mapViewerTitle: $("#mapViewerTitle"),
    mapViewerImage: $("#mapViewerImage"),
    mapViewerSource: $("#mapViewerSource"),
    playerLayer: $("#playerLayer"),
    playerPanel: $("#playerPanel"),
    playerBackdrop: $("#playerBackdrop"),
    playerClose: $("#playerClose"),
    playerSetup: $("#playerSetup"),
    playerStage: $("#playerStage"),
    playerModes: $("#playerModes"),
    playerPeriodField: $("#playerPeriodField"),
    playerPeriod: $("#playerPeriod"),
    playerCustomField: $("#playerCustomField"),
    playerStartInput: $("#playerStartInput"),
    playerEndInput: $("#playerEndInput"),
    playerPreview: $("#playerPreview"),
    playerSpeed: $("#playerSpeed"),
    playerError: $("#playerError"),
    playerStart: $("#playerStart"),
    playerRangeLabel: $("#playerRangeLabel"),
    playerCounter: $("#playerCounter"),
    playerProgressBar: $("#playerProgressBar"),
    playerYearPrefix: $("#playerYearPrefix"),
    playerYear: $("#playerYear"),
    playerGz: $("#playerGz"),
    playerEra: $("#playerEra"),
    playerRuler: $("#playerRuler"),
    playerEvent: $("#playerEvent"),
    playerEnd: $("#playerEnd"),
    playerPrev: $("#playerPrev"),
    playerToggle: $("#playerToggle"),
    playerNext: $("#playerNext"),
    playerInlineSpeed: $("#playerInlineSpeed"),
    playerRestart: $("#playerRestart"),
    playerBack: $("#playerBack"),
    toast: $("#toast"),
    sourceNote: $("#sourceNote"),
    sourceLinks: $("#sourceLinks"),
  };

  /* ---------- 初始化静态部分 ---------- */
  function initStatic() {
    dom.sourceNote.textContent = DATA.meta.note;
    dom.sourceLinks.innerHTML = DATA.sources.map((s) =>
      `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}<svg class="icon"><use href="#i-external"></use></svg></a>`
    ).join("");

    const span = MAX_YEAR - MIN_YEAR;
    const stats = [
      { value: "4,912", label: "年有纪", sub: "前3000—1912" },
      { value: String(periods.length), label: "个时代段落", sub: "含并立与过渡" },
      { value: String(rulers.length), label: "位君主", sub: "含传说与割据" },
      { value: String(events.length), label: "件大事", sub: "战争·制度·文化" },
    ];
    dom.statsStrip.innerHTML = stats.map((s) =>
      `<div class="stat"><span class="stat-value">${esc(s.value)}</span><span class="stat-label">${esc(s.label)}<small>${esc(s.sub)}</small></span></div>`
    ).join("");

    dom.heroStrata.innerHTML = periods.map((p) => {
      const w = ((p.endNum - p.startNum + 1) / (MAX_YEAR - MIN_YEAR + 1)) * 100;
      return `<span style="width:${w}%;background:${p.color};opacity:${p.priority > 10 ? .35 : .72}"></span>`;
    }).join("");

    dom.eventEraFilter.innerHTML = `<option value="all">全部时代</option>` + DATA.eras.map((e) =>
      `<option value="${esc(e.id)}">${esc(e.name)}</option>`
    ).join("");

    dom.eventTypeFilters.innerHTML =
      `<button type="button" class="type-chip is-active" data-type="all">全部类型</button>` +
      TYPE_ORDER.map((t) => `<button type="button" class="type-chip" data-type="${t}"><i></i>${TYPE_LABELS[t]}</button>`).join("");

    dom.eraFilters.innerHTML =
      `<button type="button" class="era-chip is-active" data-era="all">全部</button>` +
      DATA.eras.map((e) => `<button type="button" class="era-chip" data-era="${esc(e.id)}">${esc(e.name)}</button>`).join("");

    renderRangeTrack(dom.mainTrackBg);
    renderRangeTrack(dom.dockTrackBg);
    initContextTimebars();
    initPlayerStatic();
    setRangeLimits();
    setYear(755, { initial: true, silentView: true });
    buildTimeline();
    renderPeriodGrid();
    renderEvents();
    syncContextTimebars();
    updateNavInk();
    updateDockVisibility();
    handleHash(true);
    requestAnimationFrame(onScroll);
  }

  function setRangeLimits() {
    [dom.mainRange, dom.dockRange].forEach((input) => {
      input.min = String(MIN_YEAR);
      input.max = String(MAX_YEAR);
      input.value = String(state.year);
    });
  }

  function renderRangeTrack(el) {
    if (!el) return;
    const span = MAX_YEAR - MIN_YEAR + 1;
    const segs = periods.map((p) => {
      const left = ((p.startNum - MIN_YEAR) / span) * 100;
      const width = ((p.endNum - p.startNum + 1) / span) * 100;
      return `<span style="left:${left}%;width:${width}%;background:${p.color};position:absolute;top:0;bottom:0"></span>`;
    }).join("");
    const ticks = events.filter((e) => e.importance === 3).map((e) => {
      const left = ((e.yearNum - MIN_YEAR) / span) * 100;
      return `<i class="range-event-tick" style="left:${left}%"></i>`;
    }).join("");
    el.innerHTML = segs + ticks;
  }

  /* ---------- 主题 ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("huaxia-theme", theme); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#121310" : "#f3f0e8");
  }

  function toggleTheme(e) {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reduceMotion) {
      applyTheme(next);
      return;
    }
    const x = e.clientX || window.innerWidth - 40;
    const y = e.clientY || 40;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(.22,.61,.36,1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
  }

  /* ---------- 导航 ---------- */
  function updateNavInk() {
    const active = $(".nav-link.is-active");
    if (!active || !dom.navInk) return;
    dom.navInk.style.left = active.offsetLeft + "px";
    dom.navInk.style.width = active.offsetWidth + "px";
  }

  function switchView(name, opts) {
    opts = opts || {};
    if (!dom.views[name]) return;
    if (state.view === name && !opts.force) {
      if (name === "periods" && state.periodDetail) {
        closePeriodDetail(true);
      }
      return;
    }
    state.view = name;
    dom.navLinks.forEach((btn) => {
      const active = btn.dataset.view === name;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    Object.entries(dom.views).forEach(([key, view]) => {
      const active = key === name;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });
    updateNavInk();
    updateDockVisibility();
    if (name === "year") {
      renderYearResult(true);
      dom.yearInput.value = formatYear(state.year);
    }
    if (name === "periods" && !state.periodDetail) renderPeriodGrid();
    if (name === "events") renderEvents();
    syncContextTimebars();
    if (name === "overview" && timelineBuilt) {
      requestAnimationFrame(() => layoutTimeline());
    }
    if (opts.scroll !== false) {
      scrollToMainTop();
    }
    if (!opts.keepHash) updateHash();
  }

  function updateDockVisibility() {
    const visible = state.view === "year";
    dom.dock.classList.toggle("is-visible", visible);
    document.body.classList.toggle("has-dock", visible);
  }

  function updateHash() {
    let hash = "#/";
    if (state.view === "year") hash = "#/year/" + formatYear(state.year);
    else if (state.view === "periods") hash = state.periodDetail ? "#/period/" + state.periodDetail : "#/periods";
    else if (state.view === "events") hash = "#/events";
    if (history.replaceState) history.replaceState(null, "", hash);
  }

  function handleHash(initial) {
    const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (!raw) {
      if (state.periodDetail) closePeriodDetail(true);
      switchView("overview", { keepHash: true, scroll: false });
      return;
    }
    const parts = raw.split("/");
    if (parts[0] === "year" && parts[1]) {
      const y = parseYear(parts[1]);
      if (y != null) {
        state.view = "year";
        dom.navLinks.forEach((btn) => {
          const active = btn.dataset.view === "year";
          btn.classList.toggle("is-active", active);
          if (active) btn.setAttribute("aria-current", "page"); else btn.removeAttribute("aria-current");
        });
        Object.entries(dom.views).forEach(([key, view]) => {
          const active = key === "year";
          view.hidden = !active;
          view.classList.toggle("is-active", active);
        });
        setYear(y, { silentView: true });
        updateDockVisibility();
        updateNavInk();
        if (!initial) scrollToMainTop();
      }
    } else if (parts[0] === "period" && parts[1] && periodById.has(parts[1])) {
      state.view = "periods";
      dom.navLinks.forEach((btn) => {
        const active = btn.dataset.view === "periods";
        btn.classList.toggle("is-active", active);
        if (active) btn.setAttribute("aria-current", "page"); else btn.removeAttribute("aria-current");
      });
      Object.entries(dom.views).forEach(([key, view]) => {
        const active = key === "periods";
        view.hidden = !active;
        view.classList.toggle("is-active", active);
      });
      renderPeriodGrid();
      openPeriod(parts[1], { noScroll: true, noHash: true });
      updateDockVisibility();
      updateNavInk();
    } else if (parts[0] === "periods") {
      switchView("periods", { keepHash: true, scroll: false });
    } else if (parts[0] === "events") {
      switchView("events", { keepHash: true, scroll: false });
    }
  }

  function scrollToMainTop() {
    const top = window.scrollY + dom.header.getBoundingClientRect().bottom - 1;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? "auto" : "smooth" });
  }

  /* ---------- 年份选择 ---------- */
  function setYear(y, opts) {
    opts = opts || {};
    y = clamp(Math.round(y), MIN_YEAR, MAX_YEAR);
    const changed = y !== state.year;
    state.year = y;

    // 读秒
    if (dom.timelineYear) {
      const prefix = y <= 0 ? "公元前" : "公元";
      const display = y <= 0 ? String(1 - y) : String(y);
      const prefixEl = $(".year-prefix", dom.timelineYear);
      const numEl = $(".year-num", dom.timelineYear);
      if (prefixEl) prefixEl.textContent = prefix;
      if (numEl && numEl.textContent !== display) {
        numEl.textContent = display;
        if (!opts.silent && changed) {
          dom.timelineYear.classList.remove("is-changing");
          void dom.timelineYear.offsetWidth;
          dom.timelineYear.classList.add("is-changing");
          setTimeout(() => dom.timelineYear.classList.remove("is-changing"), 180);
        }
      }
      dom.timelineGz.textContent = ganZhi(y);
    }

    const primary = periodsAtYear(y)[0];
    const anomaly = primary ? periodAnomaly(primary, y) : null;
    if (dom.timelineEra) {
      let label = primary ? (anomaly ? anomaly.label : primary.name) : "纪年之外";
      if (primary && anomaly) label += "（唐）";
      dom.timelineEra.textContent = label + (primary ? " · " + primary.fullName : "");
      dom.timelineExtra.textContent = primary ? (anomaly ? "洛阳" : (primary.capital || "—")) : "—";
    }

    if (dom.mainRange) dom.mainRange.value = String(y);
    if (dom.dockRange) dom.dockRange.value = String(y);
    syncFineScrub(opts.keepFine ? null : y, opts);
    syncContextTimebars();
    updateRangeBubbles();
    if (timelineBuilt) {
      ensureYearInView(y);
      updatePlayhead();
    }
    updateDock();
    if (state.eventNear && state.view === "events") queueEventRender();

    if (dom.yearInput && document.activeElement !== dom.yearInput && opts.syncInput !== false) {
      dom.yearInput.value = formatYear(y);
    }
    if (dom.heroInput && document.activeElement !== dom.heroInput && opts.syncInput !== false) {
      dom.heroInput.value = "";
    }

    renderSnapshot();
    if (state.view === "year") queueYearRender();

    if (!opts.noHash && !opts.initial && (state.view === "year" || state.view === "overview")) updateHash();
    if (opts.scrollToSnapshot) {
      const rect = dom.snapshot.getBoundingClientRect();
      const top = window.scrollY + rect.top - 90;
      window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  function updateRangeBubbles() {
    if (!dom.mainRange || !dom.mainBubble) return;
    const p = ((state.year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
    dom.mainBubble.style.left = p + "%";
    dom.mainBubble.textContent = formatYear(state.year);
  }

  function updateDock() {
    if (!dom.dockYear) return;
    const primary = periodsAtYear(state.year)[0];
    const anomaly = primary ? periodAnomaly(primary, state.year) : null;
    dom.dockYear.textContent = formatYear(state.year);
    dom.dockMeta.textContent = primary
      ? `${anomaly ? anomaly.label : primary.name} · ${ganZhi(state.year)}${primary.capital ? " · " + primary.capital : ""}`
      : ganZhi(state.year);
  }

  function queueYearRender() {
    if (yearRenderQueued) return;
    yearRenderQueued = true;
    requestAnimationFrame(() => {
      yearRenderQueued = false;
      renderYearResult(false);
    });
  }

  function queueEventRender() {
    if (eventRenderQueued) return;
    eventRenderQueued = true;
    requestAnimationFrame(() => {
      eventRenderQueued = false;
      renderEvents();
    });
  }

  /* ---------- 精调时间条 ---------- */
  function fineWindowFor(center) {
    const span = 80;
    let start = clamp(Math.round(center) - span / 2, MIN_YEAR, MAX_YEAR - span);
    let end = Math.min(MAX_YEAR, start + span);
    if (end - start < span) start = Math.max(MIN_YEAR, end - span);
    return [start, end];
  }

  function syncFineScrub(center, opts) {
    if (!dom.fineRange) return;
    opts = opts || {};
    if (center != null) {
      const win = fineWindowFor(center);
      state.fineStart = win[0];
      state.fineEnd = win[1];
    } else if (state.year < state.fineStart || state.year > state.fineEnd) {
      const win = fineWindowFor(state.year);
      state.fineStart = win[0];
      state.fineEnd = win[1];
    }
    if (dom.fineRange.min !== String(state.fineStart)) dom.fineRange.min = String(state.fineStart);
    if (dom.fineRange.max !== String(state.fineEnd)) dom.fineRange.max = String(state.fineEnd);
    if (document.activeElement !== dom.fineRange || opts.force) dom.fineRange.value = String(state.year);
    dom.fineStart.textContent = formatYear(state.fineStart);
    dom.fineEnd.textContent = formatYear(state.fineEnd);
    const fill = state.fineEnd > state.fineStart ? ((state.year - state.fineStart) / (state.fineEnd - state.fineStart)) * 100 : 0;
    dom.fineRange.style.setProperty("--fill", fill + "%");
    dom.fineScrub.classList.toggle("is-edge", state.year <= state.fineStart + 1 || state.year >= state.fineEnd - 1);
  }

  function contextTimebarHTML(kind) {
    const label = kind === "events" ? "在时间长河中定位" : "以年份穿过朝代";
    return `<div class="ctb-inner">
      <div class="ctb-readout">
        <span class="ctb-kicker">${label}</span>
        <strong class="ctb-year" data-ctb-year>755</strong>
        <span class="ctb-meta" data-ctb-meta>唐 · 天宝十四载</span>
      </div>
      <div class="ctb-track">
        <div class="range-track-bg small" data-ctb-track aria-hidden="true"></div>
        <input class="year-range ctb-range" data-ctb-range type="range" min="-2999" max="1912" step="1" value="755" aria-label="拖动选择年份" />
      </div>
      <div class="ctb-actions">
        <button type="button" class="ctb-btn" data-ctb-open>打开此年<svg class="icon"><use href="#i-arrow-right"></use></svg></button>
        <button type="button" class="ctb-btn is-accent" data-ctb-play><svg class="icon"><use href="#i-play"></use></svg><span>放映此段</span></button>
        ${kind === "events" ? `<button type="button" class="ctb-btn ctb-near" data-ctb-near aria-pressed="false">聚焦百年</button>` : ""}
      </div>
    </div>`;
  }

  function initContextTimebars() {
    [dom.periodTimebar, dom.eventTimebar].forEach((bar, index) => {
      if (!bar) return;
      bar.classList.add(index === 0 ? "context-timebar--periods" : "context-timebar--events");
      bar.innerHTML = contextTimebarHTML(index === 0 ? "periods" : "events");
      renderRangeTrack($("[data-ctb-track]", bar));
    });
    syncContextTimebars();
  }

  function contextInfoForYear(y) {
    const primary = periodsAtYear(y)[0] || null;
    const ruler = primary ? primaryRulerAt(y) : null;
    const eraText = primary
      ? `${primary.name} · ${ruler ? rulerEraLabel(ruler, y) : primary.fullName}`
      : "纪年之外 · 无朝代可系";
    return { primary, eraText, openLabel: primary ? `打开${primary.name}` : "查看此年" };
  }

  function eventContextYear() {
    if (state.view === "events" && !state.eventNear && state.eventListYear != null) {
      return state.eventListYear;
    }
    return state.year;
  }

  function syncContextTimebars() {
    const activePeriods = periodsAtYear(state.year);
    const bars = [
      { bar: dom.periodTimebar, year: state.year, isPeriod: true },
      { bar: dom.eventTimebar, year: eventContextYear(), isPeriod: false },
    ];

    bars.forEach(({ bar, year, isPeriod }) => {
      if (!bar) return;
      const info = contextInfoForYear(year);
      const yearEl = $("[data-ctb-year]", bar);
      const metaEl = $("[data-ctb-meta]", bar);
      const range = $("[data-ctb-range]", bar);
      const open = $("[data-ctb-open]", bar);
      const play = $("[data-ctb-play]", bar);
      if (yearEl) yearEl.textContent = formatYear(year);
      if (metaEl) metaEl.textContent = info.eraText;
      if (range) {
        range.value = String(year);
        range.setAttribute("aria-valuetext", formatYearFull(year));
      }
      if (open) {
        const label = isPeriod ? info.openLabel : "打开此年";
        open.innerHTML = `${esc(label)}<svg class="icon"><use href="#i-arrow-right"></use></svg>`;
      }
      if (play) {
        const span = play.querySelector("span");
        if (span) span.textContent = info.primary ? `放映${info.primary.name}` : "放映此段";
      }
    });

    if (dom.eventNearBtn) {
      dom.eventNearBtn.classList.toggle("is-active", state.eventNear);
      dom.eventNearBtn.setAttribute("aria-pressed", String(state.eventNear));
      dom.eventNearBtn.textContent = state.eventNear ? "取消聚焦" : "聚焦百年";
    }
    const near = $("[data-ctb-near]", dom.eventTimebar);
    if (near) {
      near.classList.toggle("is-active", state.eventNear);
      near.setAttribute("aria-pressed", String(state.eventNear));
      near.textContent = state.eventNear ? "取消聚焦" : "聚焦百年";
    }
    $$(".period-card", dom.periodGrid).forEach((card) => {
      card.classList.toggle("is-current", activePeriods.some((p) => p.id === card.dataset.periodId));
    });
    $$(".period-card", dom.periodGrid).forEach((card) => {
      if (card.classList.contains("is-current")) card.setAttribute("aria-current", "date");
      else card.removeAttribute("aria-current");
    });
  }

  function eventGroupYearAtViewport() {
    if (!dom.eventList || dom.eventList.hidden) return null;
    const groups = $$(".event-group", dom.eventList);
    if (!groups.length) return null;
    const barBottom = dom.eventTimebar ? dom.eventTimebar.getBoundingClientRect().bottom : 0;
    const threshold = Math.max(0, barBottom) + 2;
    let candidate = null;
    for (const group of groups) {
      if (group.getBoundingClientRect().bottom > threshold) {
        candidate = group;
        break;
      }
    }
    if (!candidate) candidate = groups[groups.length - 1];
    const start = Number(candidate.dataset.start);
    if (Number.isFinite(start)) return start;
    const end = Number(candidate.dataset.end);
    return Number.isFinite(end) ? end : null;
  }

  function updateEventScrollYear() {
    if (state.view !== "events" || state.eventNear) return;
    const y = eventGroupYearAtViewport();
    if (y == null) return;
    if (state.eventListYear !== y) {
      state.eventListYear = y;
      syncContextTimebars();
    }
  }

  function scheduleEventScrollYear() {
    if (eventScrollQueued) return;
    eventScrollQueued = true;
    requestAnimationFrame(() => {
      eventScrollQueued = false;
      updateEventScrollYear();
    });
  }

  function scrollEventsToYear(y, opts) {
    opts = opts || {};
    if (state.view !== "events" || state.eventNear || !dom.eventList) return;
    const groups = $$(".event-group", dom.eventList);
    if (!groups.length) return;
    let target = null;
    let best = Infinity;
    for (const group of groups) {
      const start = Number(group.dataset.start);
      const end = Number(group.dataset.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (y >= start && y <= end) {
        target = group;
        break;
      }
      const distance = y < start ? start - y : y - end;
      if (distance < best) {
        best = distance;
        target = group;
      }
    }
    if (!target) return;
    eventScrollLockUntil = performance.now() + 900;
    const headerH = dom.header ? dom.header.getBoundingClientRect().height : 0;
    const barH = dom.eventTimebar ? dom.eventTimebar.getBoundingClientRect().height : 0;
    const top = window.scrollY + target.getBoundingClientRect().top - headerH - barH - 10;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: opts.instant || reduceMotion ? "auto" : "smooth",
    });
  }

  function scrollEventListTop(instant) {
    if (state.view !== "events" || !dom.eventList) return;
    const headerH = dom.header ? dom.header.getBoundingClientRect().height : 0;
    const barH = dom.eventTimebar ? dom.eventTimebar.getBoundingClientRect().height : 0;
    const top = window.scrollY + dom.eventList.getBoundingClientRect().top - headerH - barH - 10;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: instant || reduceMotion ? "auto" : "smooth",
    });
  }

  function focusEventYear(y, instant) {
    state.eventListYear = y;
    syncContextTimebars();
    requestAnimationFrame(() => {
      state.eventListYear = y;
      syncContextTimebars();
      scrollEventsToYear(y, { instant: !!instant });
    });
  }

  function bindContextTimebars() {
    [dom.periodTimebar, dom.eventTimebar].forEach((bar, index) => {
      if (!bar) return;
      bar.addEventListener("input", (e) => {
        const range = e.target.closest("[data-ctb-range]");
        if (!range) return;
        const y = Number(range.value);
        if (index === 1 && state.view === "events" && !state.eventNear) {
          state.eventListYear = y;
          setYear(y, { silent: true, keepFine: true });
          scrollEventsToYear(y, { instant: true });
          return;
        }
        setYear(y, { silent: true, keepFine: true });
      });
      bar.addEventListener("click", (e) => {
        if (e.target.closest("[data-ctb-open]")) {
          if (index === 0) {
            const primary = periodsAtYear(state.year)[0];
            if (primary) openPeriod(primary.id);
            else switchView("year");
          } else {
            setYear(eventContextYear(), { silent: true, keepFine: true });
            switchView("year");
          }
          return;
        }
        if (e.target.closest("[data-ctb-play]")) {
          const y = index === 1 ? eventContextYear() : state.year;
          const primary = periodsAtYear(y)[0];
          if (primary) openPlayer({ mode: "period", periodId: primary.id, autoStart: true });
          else {
            const start = clamp(y - 100, MIN_YEAR, MAX_YEAR);
            const end = clamp(y + 100, MIN_YEAR, MAX_YEAR);
            openPlayer({ mode: "custom", start, end, autoStart: true });
          }
          return;
        }
        if (e.target.closest("[data-ctb-near]")) toggleEventNear();
      });
    });

    window.addEventListener("scroll", () => {
      if (state.view !== "events" || state.eventNear) return;
      if (performance.now() < eventScrollLockUntil) return;
      scheduleEventScrollYear();
    }, { passive: true });
  }

  function toggleEventNear() {
    if (!state.eventNear) {
      const y = eventContextYear();
      if (y !== state.year) setYear(y, { silent: true, keepFine: true });
    }
    state.eventNear = !state.eventNear;
    renderEvents();
    if (state.eventNear) {
      syncContextTimebars();
      requestAnimationFrame(() => scrollEventListTop(true));
      showToast(`只显示 ${formatYear(state.year - 50)}—${formatYear(state.year + 50)} 的事件`);
    } else {
      focusEventYear(state.year, true);
    }
  }

  function ensureYearInView(y) {
    if (state.zoom === "all") {
      state.viewStart = MIN_YEAR;
      state.viewEnd = MAX_YEAR;
      return;
    }
    if (y < state.viewStart || y > state.viewEnd) {
      centerTimelineOn(y, state.zoom === "millennium" ? 1200 : 300);
      layoutTimeline();
    }
  }

  function centerTimelineOn(y, span) {
    let start = y - span / 2;
    let end = start + span;
    if (start < MIN_YEAR) { start = MIN_YEAR; end = start + span; }
    if (end > MAX_YEAR) { end = MAX_YEAR; start = end - span; }
    state.viewStart = Math.max(MIN_YEAR, start);
    state.viewEnd = Math.min(MAX_YEAR, end);
  }

  /* ---------- 提示 ---------- */
  function showToast(text) {
    dom.toast.textContent = text;
    dom.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove("is-visible"), 2400);
  }

  function parseAndGo(raw, opts) {
    opts = opts || {};
    const y = parseYear(raw);
    if (y == null) {
      return { ok: false, error: "请按“755”“前221”或“公元前221年”的格式输入。" };
    }
    if (y < MIN_YEAR || y > MAX_YEAR) {
      return { ok: false, error: "本站收录前3000年至1912年；请把年份落在这条长河之内。" };
    }
    setYear(y);
    switchView("year", { scroll: true });
    return { ok: true };
  }

  /* ---------- 事件绑定 ---------- */
  function bindBase() {
    dom.themeToggle.addEventListener("click", toggleTheme);

    dom.navLinks.forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.view;
        if (name === "periods" && state.view === "periods" && state.periodDetail) {
          closePeriodDetail();
          return;
        }
        switchView(name);
      });
    });

    dom.scrollToTimeline.addEventListener("click", () => {
      const rect = $("#timelinePanel").getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top - 76, behavior: reduceMotion ? "auto" : "smooth" });
    });

    dom.openPlayerTop.addEventListener("click", () => openPlayer());
    dom.openPlayerTimeline.addEventListener("click", () => openPlayer());
    dom.randomYear.addEventListener("click", () => randomJump());

    [dom.heroForm, dom.yearForm].forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const isHero = form === dom.heroForm;
        const input = isHero ? dom.heroInput : dom.yearInput;
        const errorEl = isHero ? dom.heroError : dom.yearError;
        errorEl.textContent = "";
        const result = parseAndGo(input.value, { hero: isHero });
        if (!result.ok) {
          errorEl.textContent = result.error;
          input.focus();
          input.select();
        }
      });
    });

    dom.quickYears.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-year]");
      if (!btn) return;
      const y = parseYear(btn.dataset.year);
      if (y != null) { setYear(y); switchView("year"); }
    });

    dom.mainRange.addEventListener("input", (e) => setYear(Number(e.target.value), { silent: true, syncInput: true }));
    dom.dockRange.addEventListener("input", (e) => setYear(Number(e.target.value), { silent: true, syncInput: true }));
    dom.fineRange.addEventListener("input", (e) => setYear(Number(e.target.value), { silent: true, keepFine: true, syncInput: true }));
    dom.fineScrub.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-fine-step]");
      if (!btn) return;
      setYear(state.year + Number(btn.dataset.fineStep));
    });
    dom.dockOpen.addEventListener("click", () => switchView("year"));

    dom.timelineMode.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-mode]");
      if (!btn) return;
      state.timelineMode = btn.dataset.mode;
      $$("button", dom.timelineMode).forEach((b) => b.classList.toggle("is-active", b === btn));
      layoutTimeline();
      showToast(state.timelineMode === "major" ? "时间轴只保留大事与锚点" : "时间轴显示全部事件");
    });

    dom.eventNearBtn.addEventListener("click", toggleEventNear);

    dom.zoomBtns.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-zoom]");
      if (!btn) return;
      setZoom(btn.dataset.zoom);
    });

    dom.prevEvent.addEventListener("click", () => stepEvent(-1));
    dom.nextEvent.addEventListener("click", () => stepEvent(1));

    dom.yearInput.addEventListener("input", () => { dom.yearError.textContent = ""; });
    dom.heroInput.addEventListener("input", () => { dom.heroError.textContent = ""; });

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      updateNavInk();
      if (timelineBuilt) layoutTimeline();
    });
    window.addEventListener("popstate", () => handleHash(false));
    window.addEventListener("hashchange", () => handleHash(false));

    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);

    // 时间轴交互
    bindTimeline();
    bindContextTimebars();
    bindPlayer();
    bindDrawer();
    bindMapViewer();
    bindEventFilters();

    // 导航指示器
    if (window.ResizeObserver) {
      new ResizeObserver(updateNavInk).observe(dom.nav);
    }
  }

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    dom.scrollProgress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
    dom.header.classList.toggle("is-scrolled", window.scrollY > 8);
    const overview = dom.views && dom.views.overview;
    if (overview) {
      const progress = clamp(window.scrollY / Math.max(1, overview.offsetHeight * .72), 0, 1);
      overview.style.setProperty("--hero-progress", progress.toFixed(3));
      overview.style.setProperty("--hero-drift", `${(progress * -34).toFixed(1)}px`);
    }
  }

  function onKeyDown(e) {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
    if (e.key === "Escape") {
      if (dom.mapViewer && dom.mapViewer.open) closeMapViewer();
      else if (player.open) closePlayer();
      else if (dom.drawerLayer.classList.contains("is-open")) closeDrawer();
      else if (state.periodDetail) closePeriodDetail();
      return;
    }
    if (player.open) return;
    if (typing) return;
    if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      openPlayer();
      return;
    }
    if (e.key === "/") {
      e.preventDefault();
      const input = state.view === "overview" ? dom.heroInput : dom.yearInput;
      if (state.view !== "overview" && state.view !== "year") switchView("year");
      setTimeout(() => { const el = state.view === "overview" ? dom.heroInput : dom.yearInput; el.focus(); el.select(); }, 80);
      return;
    }
    if (e.key.toLowerCase() === "t") {
      toggleTheme({ clientX: window.innerWidth - 40, clientY: 40 });
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const delta = e.shiftKey ? 50 : (state.zoom === "century" ? 10 : 1);
      setYear(state.year + (e.key === "ArrowLeft" ? -delta : delta));
    }
  }

  function stepEvent(dir) {
    const candidates = events.filter((e) => e.importance >= 2);
    let target = null;
    if (dir > 0) target = candidates.find((e) => e.yearNum > state.year + (state.zoom === "all" ? 2 : 0));
    else target = [...candidates].reverse().find((e) => e.yearNum < state.year - (state.zoom === "all" ? 2 : 0));
    if (!target) {
      showToast(dir > 0 ? "已经是最新的一页。" : "已经是最早的一页。");
      return;
    }
    setYear(target.yearNum, { scrollToSnapshot: state.view === "overview" });
  }

  function randomJump() {
    const pool = anchorEvents.length ? anchorEvents : events;
    let pick = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (pick.yearNum === state.year && guard++ < 10) pick = pool[Math.floor(Math.random() * pool.length)];
    setYear(pick.yearNum, { scrollToSnapshot: state.view === "overview" });
    if (state.view !== "overview") switchView("year");
    showToast(`${formatYear(pick.yearNum)} · ${pick.title}`);
  }

  function onDocumentClick(e) {
    const mapZoom = e.target.closest("[data-map-zoom]");
    if (mapZoom) {
      e.preventDefault();
      openMapViewer(mapZoom);
      return;
    }
    if (e.target.closest("[data-close-period]")) {
      e.preventDefault();
      closePeriodDetail();
      return;
    }
    if (dom.drawerLayer.contains(e.target) && e.target.closest("[data-go-year], [data-go-period], [data-jump-view]")) {
      closeDrawer();
    }
    const jumpYear = e.target.closest("[data-jump-year]");
    if (jumpYear) {
      e.preventDefault();
      const y = parseYear(jumpYear.dataset.jumpYear);
      if (y != null) setYear(y);
      return;
    }
    const goYear = e.target.closest("[data-go-year]");
    if (goYear) {
      e.preventDefault();
      const y = parseYear(goYear.dataset.goYear);
      if (y != null) { setYear(y); switchView("year"); }
      return;
    }
    const goPeriod = e.target.closest("[data-go-period]");
    if (goPeriod) {
      e.preventDefault();
      const id = goPeriod.dataset.goPeriod;
      switchView("periods");
      openPeriod(id);
      return;
    }
    const goView = e.target.closest("[data-jump-view]");
    if (goView) {
      switchView(goView.dataset.jumpView);
      return;
    }
    const periodCard = e.target.closest("[data-period-id]");
    if (periodCard) {
      openPeriod(periodCard.dataset.periodId);
      return;
    }
    const eventTarget = e.target.closest("[data-event-id]");
    if (eventTarget) {
      const ev = eventById.get(eventTarget.dataset.eventId);
      if (ev) openEventDrawer(ev.id, eventTarget);
      return;
    }
    const rulerTarget = e.target.closest("[data-ruler-id]");
    if (rulerTarget) {
      openRulerDrawer(rulerTarget.dataset.rulerId, rulerTarget);
      return;
    }
    const figureTarget = e.target.closest("[data-figure-id]");
    if (figureTarget) {
      openFigureDrawer(figureTarget.dataset.figureId, figureTarget);
      return;
    }
    const polityTarget = e.target.closest("[data-polity-id]");
    if (polityTarget) {
      openPolityDrawer(polityTarget.dataset.polityId, polityTarget);
    }
  }

  /* ---------- 时间轴 ---------- */
  function buildTimeline() {
    if (!dom.timelineMap) return;
    dom.tlEraLabels.innerHTML = DATA.eras.map((era) =>
      `<span class="tl-era-label" data-era-id="${esc(era.id)}">${esc(era.name)}</span>`
    ).join("");
    dom.tlPeriods.innerHTML = periods.map((p) => {
      const onTone = contrastOn(p.color);
      return `<button type="button" class="tl-period${p.type === "split" ? " is-split" : ""}${p.priority > 10 ? " is-secondary" : ""}" data-period-id="${esc(p.id)}" title="${esc(p.name)} · ${esc(p.start)}—${esc(p.end)}" style="--tone:${p.color};background:${p.color};color:${onTone}"><span>${esc(p.name)}</span></button>`;
    }).join("");
    dom.tlEvents.innerHTML = events.map((ev) => {
      const label = ev.anchor ? ev.title : "";
      return `<button type="button" class="tl-event${ev.anchor ? " is-anchor" : ""}${ev.importance === 3 ? " is-major" : ""}" data-event-id="${ev.id}" data-importance="${ev.importance}" aria-label="${esc(formatYear(ev.yearNum) + '年 · ' + ev.title)}">
        ${label ? `<span class="tl-event-label">${esc(label.length > 12 ? label.slice(0, 12) + "…" : label)}</span>` : ""}
      </button>`;
    }).join("");
    timelineBuilt = true;
    layoutTimeline();
  }

  function layoutTimeline() {
    if (!timelineBuilt) return;
    const span = Math.max(1, state.viewEnd - state.viewStart);
    const mapWidth = dom.timelineMap.clientWidth || 900;
    const pct = (y) => ((y - state.viewStart) / span) * 100;
    dom.timelineMap.classList.add("is-zooming");
    clearTimeout(layoutTimeline._timer);
    layoutTimeline._timer = setTimeout(() => dom.timelineMap.classList.remove("is-zooming"), 650);

    // 时代标签
    $$(".tl-era-label", dom.tlEraLabels).forEach((el, i) => {
      const era = DATA.eras[i];
      const start = parseYear(era.start);
      const end = parseYear(era.end);
      const l = pct(start), r = pct(end + 1);
      if (r < 0 || l > 100) { el.style.display = "none"; return; }
      el.style.display = "";
      el.style.left = clamp(l, 0, 100) + "%";
      el.style.width = Math.max(0, Math.min(r, 100) - Math.max(l, 0)) + "%";
    });

    // 王朝色块
    $$(".tl-period", dom.tlPeriods).forEach((el, i) => {
      const p = periods[i];
      const l = pct(p.startNum), r = pct(p.endNum + 1);
      if (r < 0 || l > 100) { el.style.display = "none"; return; }
      el.style.display = "";
      const left = clamp(l, 0, 100);
      const width = Math.max(.12, Math.min(r, 100) - left);
      el.style.left = left + "%";
      el.style.width = width + "%";
      const px = (width / 100) * mapWidth;
      el.classList.toggle("is-tiny", px < 30);
      el.classList.toggle("is-current", periodsAtYear(state.year).some((x) => x.id === p.id));
      const spanEl = $("span", el);
      if (spanEl) spanEl.textContent = px < 30 ? "" : p.name;
    });

    // 事件点：仅大事模式突出锚点，全部事件模式才铺满短刻度
    const majorMode = state.timelineMode === "major";
    const compact = mapWidth < 720;
    const candidates = [];
    $$(".tl-event", dom.tlEvents).forEach((el, i) => {
      const ev = events[i];
      const visible = majorMode ? (ev.anchor || ev.importance === 3) : true;
      if (!visible || ev.yearNum < state.viewStart || ev.yearNum > state.viewEnd) {
        el.style.display = "none";
        el.classList.remove("is-labeled", "is-current-event");
        const hiddenLabel = $(".tl-event-label", el);
        if (hiddenLabel) hiddenLabel.classList.remove("is-visible");
        return;
      }
      candidates.push({ el, ev, x: pct(ev.yearNum), show: !compact });
    });

    // 窄屏先保住锚点，再用重要事件填充空隙，避免事件线挤成色块
    if (compact) {
      if (majorMode) {
        const chosen = [];
        const choose = (candidate, gapPx) => {
          const gap = gapPx / mapWidth * 100;
          if (chosen.every((x) => Math.abs(x - candidate.x) >= gap)) {
            candidate.show = true;
            chosen.push(candidate.x);
          }
        };
        candidates.filter((c) => c.ev.anchor).forEach((c) => choose(c, 14));
        candidates.filter((c) => !c.ev.anchor).forEach((c) => choose(c, 20));
      } else {
        // “全部事件”在窄屏按时间均匀抽样，保留比“仅大事”更密的刻度
        const gap = 9 / mapWidth * 100;
        let lastX = -Infinity;
        candidates.slice().sort((a, b) => a.x - b.x).forEach((candidate) => {
          if (candidate.x - lastX >= gap) {
            candidate.show = true;
            lastX = candidate.x;
          }
        });
      }

      // 保留视野内最早的锚点，给窄屏全史一个起点
      const firstAnchor = candidates.find((c) => c.ev.anchor);
      if (firstAnchor) firstAnchor.show = true;

      // 当前年份附近总保留一个锚点，避免抽样把正在看的事件抽掉
      if (state.year >= state.viewStart && state.year <= state.viewEnd) {
        let nearest = null;
        candidates.forEach((c) => {
          if (!c.ev.anchor) return;
          if (!nearest || Math.abs(c.ev.yearNum - state.year) < Math.abs(nearest.ev.yearNum - state.year)) nearest = c;
        });
        if (nearest) nearest.show = true;
      }
    }

    const labelCandidates = [];
    candidates.forEach((candidate) => {
      const { el, ev, x } = candidate;
      el.classList.remove("is-labeled");
      if (!candidate.show) {
        el.style.display = "none";
        const hiddenLabel = $(".tl-event-label", el);
        if (hiddenLabel) hiddenLabel.classList.remove("is-visible");
        return;
      }
      el.style.display = "";
      el.style.left = x + "%";
      const current = Math.abs(ev.yearNum - state.year) <= 1;
      el.classList.toggle("is-current-event", !!ev.anchor && current);
      const label = $(".tl-event-label", el);
      if (label) {
        label.classList.remove("is-visible");
        const canLabel = !!ev.anchor || (!majorMode && state.zoom !== "all" && ev.importance === 3);
        if (canLabel) {
          labelCandidates.push({
            el: label,
            eventEl: el,
            x,
            anchor: !!ev.anchor,
            current,
          });
        }
      }
    });
    labelCandidates.sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0) || (b.anchor ? 1 : 0) - (a.anchor ? 1 : 0) || a.x - b.x);
    const minGap = ((mapWidth < 520 ? 100 : 112) / mapWidth) * 100;
    const occupied = [];
    labelCandidates.forEach((c) => {
      const edge = ((c.el.offsetWidth || 72) / 2 + 4) / mapWidth * 100;
      if (c.x < edge || c.x > 100 - edge) return;
      if (occupied.every((x) => Math.abs(x - c.x) >= minGap)) {
        c.el.classList.add("is-visible");
        c.eventEl.classList.add("is-labeled");
        occupied.push(c.x);
      }
    });

    // 时间刻度
    renderAxis(span);
    updatePlayhead();
  }

  function renderAxis(span) {
    const compact = (dom.timelineMap.clientWidth || 0) < 520;
    let step = compact ? 1000 : 500;
    if (span <= 1600) step = compact ? 500 : 200;
    if (span <= 800) step = compact ? 200 : 100;
    if (span <= 400) step = compact ? 100 : 50;
    if (span <= 200) step = compact ? 50 : 25;
    const first = Math.ceil(state.viewStart / step) * step;
    const ticks = [];
    for (let y = first; y <= state.viewEnd; y += step) {
      const left = ((y - state.viewStart) / span) * 100;
      if (left < 0 || left > 100) continue;
      ticks.push(`<span class="axis-label" style="left:${left}%">${formatYear(y)}</span>`);
    }
    dom.timelineAxis.innerHTML = ticks.join("");
  }

  function updatePlayhead() {
    if (!timelineBuilt) return;
    const span = Math.max(1, state.viewEnd - state.viewStart);
    const p = ((state.year - state.viewStart) / span) * 100;
    dom.tlPlayhead.style.left = clamp(p, 0, 100) + "%";
    $$(".tl-period", dom.tlPeriods).forEach((el, i) => {
      el.classList.toggle("is-current", periodsAtYear(state.year).some((x) => x.id === periods[i].id));
    });
  }

  function setZoom(zoom) {
    state.zoom = zoom;
    $$("#zoomBtns button").forEach((b) => b.classList.toggle("is-active", b.dataset.zoom === zoom));
    if (zoom === "all") {
      state.viewStart = MIN_YEAR;
      state.viewEnd = MAX_YEAR;
    } else {
      centerTimelineOn(state.year, zoom === "millennium" ? 1200 : 300);
    }
    layoutTimeline();
  }

  function bindTimeline() {
    const map = dom.timelineMap;
    let dragging = false;
    let moved = false;
    let lastX = 0;

    const yearAtClientX = (clientX) => {
      const rect = map.getBoundingClientRect();
      const p = clamp((clientX - rect.left) / rect.width, 0, 1);
      return Math.round(state.viewStart + p * (state.viewEnd - state.viewStart));
    };

    map.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".tl-event")) return;
      dragging = true;
      moved = false;
      lastX = e.clientX;
      map.classList.add("is-dragging");
      dom.tlPlayhead.classList.add("no-transition");
      try { map.setPointerCapture(e.pointerId); } catch (err) {}
      setYear(yearAtClientX(e.clientX), { silent: true });
      e.preventDefault();
    });

    map.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - lastX) > 2) moved = true;
      setYear(yearAtClientX(e.clientX), { silent: true });
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      map.classList.remove("is-dragging");
      dom.tlPlayhead.classList.remove("no-transition");
      try { map.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    map.addEventListener("pointerup", endDrag);
    map.addEventListener("pointercancel", endDrag);

    map.addEventListener("dblclick", (e) => {
      if (e.target.closest(".tl-event")) return;
      const y = yearAtClientX(e.clientX);
      setYear(y);
      const order = ["all", "millennium", "century"];
      const next = order[(order.indexOf(state.zoom) + 1) % order.length];
      setZoom(next);
      showToast(next === "all" ? "已展开全史" : next === "millennium" ? "已放大到千年" : "已放大到三百年");
    });

    map.addEventListener("wheel", (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const y = yearAtClientX(e.clientX);
      setYear(y, { silent: true });
      const next = e.deltaY < 0
        ? (state.zoom === "all" ? "millennium" : "century")
        : (state.zoom === "century" ? "millennium" : "all");
      setZoom(next);
    }, { passive: false });

    map.addEventListener("pointerover", (e) => {
      const marker = e.target.closest(".tl-event");
      if (!marker) return;
      const ev = eventById.get(marker.dataset.eventId);
      if (!ev) return;
      const rect = map.getBoundingClientRect();
      const left = ((ev.yearNum - state.viewStart) / (state.viewEnd - state.viewStart)) * 100;
      dom.tlTooltip.innerHTML = `<strong>${esc(ev.title)}</strong><em>${esc(formatYearFull(ev.yearNum))} · ${esc(ev.typeLabel)}</em>`;
      dom.tlTooltip.style.left = clamp(left, 12, 88) + "%";
      dom.tlTooltip.style.top = "86px";
      dom.tlTooltip.classList.add("is-visible");
    });
    map.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget || !map.contains(e.relatedTarget)) dom.tlTooltip.classList.remove("is-visible");
      else if (!e.target.closest(".tl-event")) dom.tlTooltip.classList.remove("is-visible");
    });
    map.addEventListener("pointerleave", () => dom.tlTooltip.classList.remove("is-visible"));

    map.addEventListener("focusin", (e) => {
      const marker = e.target.closest(".tl-event");
      if (!marker) return;
      const ev = eventById.get(marker.dataset.eventId);
      if (!ev) return;
      const left = ((ev.yearNum - state.viewStart) / (state.viewEnd - state.viewStart)) * 100;
      dom.tlTooltip.innerHTML = `<strong>${esc(ev.title)}</strong><em>${esc(formatYearFull(ev.yearNum))} · ${esc(ev.typeLabel)}</em>`;
      dom.tlTooltip.style.left = clamp(left, 12, 88) + "%";
      dom.tlTooltip.style.top = "86px";
      dom.tlTooltip.classList.add("is-visible");
    });
    map.addEventListener("focusout", () => dom.tlTooltip.classList.remove("is-visible"));

    // 拖动时只改年份，不改视图
    map.addEventListener("click", (e) => {
      if (e.target.closest(".tl-event")) return;
      if (moved) { moved = false; return; }
      setYear(yearAtClientX(e.clientX));
    });
  }

  /* ---------- 渲染辅助 ---------- */
  function periodTypeLabel(p) {
    return { legendary: "传说与考古", unified: "大一统", split: "并立与分裂", transitional: "过渡政权" }[p.type] || "时代";
  }

  function stateTypeLabel(s) {
    return s.type || "政权";
  }

  function lifeLabel(f) {
    if (!f.life) return "生卒不详";
    if (Array.isArray(f.life)) return f.life.filter(Boolean).join("—") || "生卒不详";
    return String(f.life);
  }

  function overlap(a, b) {
    return a.startNum != null && a.endNum != null && b.startNum != null && b.endNum != null &&
      a.startNum <= b.endNum && a.endNum >= b.startNum;
  }

  function uniqueById(list) {
    const seen = new Set();
    return list.filter((item) => {
      if (!item || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }

  function eventsForPeriod(p) {
    return events.filter((e) => e.periodId === p.id);
  }

  function statesForPeriod(p) {
    // 仅纳入与本段有实质年份重叠的并立政权；起止恰好相接的后继政权不算“并立”
    return states.filter((s) =>
      s.startNum != null && s.endNum != null &&
      s.startNum < p.endNum && s.endNum > p.startNum
    ).sort((a, b) => (b.startNum - a.startNum) || a.name.localeCompare(b.name));
  }

  function rulersForPeriod(p) {
    const direct = rulersOfPolity(p.id);
    if (direct.length) return direct;
    const allowed = {
      "three-kingdoms": ["割据"],
      "northern-southern": ["南朝", "北朝"],
      "five-dynasties": ["五代", "十国"],
    }[p.id];
    if (!allowed) return [];
    return uniqueById(statesForPeriod(p)
      .filter((s) => allowed.includes(s.type))
      .flatMap((s) => rulersOfPolity(s.id)));
  }

  function rulersForPolityAtYear(p, y) {
    return rulersOfPolity(p.id).filter((r) => r.startNum != null && r.endNum != null && y >= r.startNum && y <= r.endNum);
  }

  function figuresForPeriod(p) {
    const referenced = eventsForPeriod(p).flatMap((e) => (e.figures || []).map((id) => figureById2.get(id))).filter(Boolean);
    const living = figures.filter((f) =>
      (f.startNum != null && f.endNum != null && overlap(f, p)) ||
      (p.id === "legendary" && f.life && String(f.life[0]).indexOf("传说") >= 0)
    );
    return uniqueById([...referenced, ...living]).sort((a, b) => (a.rank || 999) - (b.rank || 999));
  }

  function personLabel(person, isRuler) {
    if (!person) return "";
    return isRuler ? (person.title || person.name) : person.name;
  }

  function placeChip(place) {
    if (!place) return "";
    return `<span class="place-chip"><svg class="icon"><use href="#i-pin"></use></svg>${esc(place)}</span>`;
  }

  function typeTag(typeLabel, type) {
    return `<span class="type-tag" data-type="${esc(type)}">${esc(typeLabel)}</span>`;
  }

  function nearestWorld(y) {
    let best = null;
    DATA.world.forEach((w) => {
      const wy = parseYear(w.year);
      if (wy == null) return;
      const diff = Math.abs(wy - y);
      if (!best || diff < best.diff) best = { ...w, yearNum: wy, diff };
    });
    return best;
  }

  function worldCardHTML(y) {
    const w = nearestWorld(y);
    if (!w) return "";
    const when = w.diff === 0 ? "同年" : (w.yearNum < y ? `${w.diff} 年前` : `${w.diff} 年后`);
    return `<div class="world-card">
      <h4>WORLD / 世界坐标</h4>
      <p>${esc(w.text)}</p>
      <small>${esc(formatYearFull(w.yearNum))} · ${when}</small>
    </div>`;
  }

  function figureCardHTML(f) {
    return `<button type="button" class="person-card" data-figure-id="${esc(f.id)}">
      <span class="person-seal">${esc(f.name.slice(0, 1))}</span>
      <span class="person-info">
        <strong>${esc(f.name)}</strong>
        <span>${esc(f.role || "人物")} · ${esc(lifeLabel(f))}</span>
        <p>${esc(f.bio || "")}</p>
      </span>
    </button>`;
  }

  function rulerCardHTML(r, showPolity) {
    const years = r.startNum != null && r.endNum != null ? formatRange(r.startNum, r.endNum) : (r.reignLabel || "在位年不详");
    const polityName = showPolity && r.polity ? r.polity.name + " · " : "";
    return `<button type="button" class="ruler-card${r.startNum == null ? " is-unknown" : ""}" data-ruler-id="${esc(r.id)}">
      <span class="ruler-seal">${esc(r.name.slice(0, 1))}</span>
      <span class="ruler-title">${esc(polityName + (r.title || "君主"))}</span>
      <span class="ruler-name">${esc(r.name)}</span>
      <span class="ruler-years">${esc(years)}</span>
    </button>`;
  }

  function toneForPolity(p) {
    if (p.color) return p.color;
    return {
      "十六国": "#8a6248",
      "并立": "#a35a42",
      "割据": "#9a6048",
      "诸侯": "#8c7a4f",
      "周边": "#5f7368",
      "南朝": "#6f7f69",
      "北朝": "#65748a",
      "五代": "#8a5a4a",
      "十国": "#a06a4a",
    }[p.type] || "#7b6b52";
  }

  function keyRulerForPolity(p) {
    const list = rulersOfPolity(p.id);
    return list.find((r) => r.featured) || list[0] || null;
  }

  function polityCardHTML(p, y, isMain) {
    const active = rulersForPolityAtYear(p, y);
    const key = active.length ? active : (keyRulerForPolity(p) ? [keyRulerForPolity(p)] : []);
    const years = p.startNum != null && p.endNum != null ? formatRange(p.startNum, p.endNum) : "";
    const duration = p.startNum != null && p.endNum != null ? p.endNum - p.startNum + 1 : null;
    const type = periodById.has(p.id) ? periodTypeLabel(p) : stateTypeLabel(p);
    const rules = key.slice(0, 2).map((r) =>
      `<span class="polity-rule"><span>${esc(r.title || r.name)}</span><span>${esc(active.length ? rulerEraLabel(r, y) : (r.reignLabel || (r.startNum != null && r.endNum != null ? formatRange(r.startNum, r.endNum) : "在位年不详")))}</span></span>`
    ).join("");
    return `<button type="button" class="polity-card${isMain ? " is-main" : ""}" data-polity-id="${esc(p.id)}" style="--tone:${esc(toneForPolity(p))}">
      <span class="polity-bar" aria-hidden="true"></span>
      <span class="polity-body">
        <span class="polity-top"><span class="polity-name">${esc(p.name)}</span><span class="polity-years">${esc(years)}</span></span>
        <span class="polity-sub">${esc(type)} · ${esc(p.capital || "都城未详")}${duration ? ` · 存续 ${duration} 年` : ""}</span>
        ${p.summary ? `<span class="polity-summary">${esc(p.summary)}</span>` : ""}
        ${rules ? `<span class="polity-rules">${rules}</span>` : `<span class="polity-rules is-empty">君主待补</span>`}
        <span class="polity-foot">查看政权 <svg class="icon"><use href="#i-arrow-right"></use></svg></span>
      </span>
    </button>`;
  }

  function polityLanesHTML(p, list) {
    const duration = Math.max(1, p.endNum - p.startNum + 1);
    const laneFor = (item, isMain) => {
      const a = isMain ? p.startNum : Math.max(item.startNum, p.startNum);
      const b = isMain ? p.endNum : Math.min(item.endNum, p.endNum);
      const left = clamp(((a - p.startNum) / duration) * 100, 0, 100);
      const width = Math.max(.8, ((b - a + 1) / duration) * 100);
      const tone = toneForPolity(item);
      const type = isMain ? `主体 · ${periodTypeLabel(item)}` : stateTypeLabel(item);
      const key = isMain ? null : keyRulerForPolity(item);
      const rulerText = isMain ? (item.capital || "—") : (key ? (key.title || key.name) : "君主待补");
      const barText = width > 14 ? `${formatRange(a, b)}` : "";
      const inner = `<span class="lane-name"><strong>${esc(item.name)}</strong><small>${esc(type)}</small></span>
        <span class="lane-track"><i style="left:${left}%;width:${width}%;--tone:${esc(tone)}"><em>${esc(barText)}</em></i></span>
        <span class="lane-ruler">${esc(rulerText)}</span>`;
      return isMain
        ? `<div class="polity-lane is-main" style="--tone:${esc(tone)}">${inner}</div>`
        : `<button type="button" class="polity-lane" data-polity-id="${esc(item.id)}" style="--tone:${esc(tone)}" title="${esc(item.summary || "")}">${inner}</button>`;
    };
    return `<div class="polity-lanes">
      <div class="lanes-axis"><span>${esc(formatYear(p.startNum))}</span><span>${esc(formatYear(p.endNum))}</span></div>
      ${laneFor(p, true)}
      ${list.map((s) => laneFor(s, false)).join("")}
    </div>`;
  }

  function polityMiniCardHTML(s) {
    const key = keyRulerForPolity(s);
    const duration = s.endNum - s.startNum + 1;
    return `<button type="button" class="polity-mini" data-polity-id="${esc(s.id)}" style="--tone:${esc(toneForPolity(s))}">
      <span class="pm-top"><strong>${esc(s.name)}</strong><span>${esc(stateTypeLabel(s))}</span></span>
      <span class="pm-meta">${esc(formatRange(s.startNum, s.endNum))} · ${esc(s.capital || "都城未详")} · ${duration} 年</span>
      <span class="pm-summary">${esc(s.summary || "")}</span>
      <span class="pm-foot">${key ? `代表君主 · ${esc(key.title || key.name)}` : "君主待补"} <svg class="icon"><use href="#i-arrow-right"></use></svg></span>
    </button>`;
  }

  function sectionHead(title, meta, action) {
    return `<div class="section-head"><h3>${esc(title)}</h3><span>${esc(meta || "")}${action || ""}</span></div>`;
  }

  function yearEventHTML(ev, isNear) {
    const distance = isNear ? Math.abs(ev.yearNum - state.year) : 0;
    return `<article class="year-event${isNear ? " is-near" : ""}">
      <div class="year-event-head">
        <span class="year-event-year">${esc(formatYear(ev.yearNum))}${ev.approx ? " 约" : ""}</span>
        ${typeTag(ev.typeLabel, ev.type)}
        ${isNear ? `<span class="near-note">距此 ${distance} 年</span>` : ""}
      </div>
      <h3>${esc(ev.title)}</h3>
      <p>${esc(ev.summary)}</p>
      <div class="event-meta-row">
        ${placeChip(ev.place)}
        ${eventPeopleHTML(ev, 4)}
        <button type="button" class="event-more" data-event-id="${esc(ev.id)}">事件全貌 <svg class="icon"><use href="#i-arrow-right"></use></svg></button>
      </div>
    </article>`;
  }

  /* ---------- 长河快照 ---------- */
  function renderSnapshot() {
    if (!dom.snapshot) return;
    const y = state.year;
    const primary = periodsAtYear(y)[0] || null;
    const anomaly = primary ? periodAnomaly(primary, y) : null;
    const ruler = primaryRulerAt(y);
    const exact = eventsAtYear(y).sort((a, b) => b.importance - a.importance);
    const nearby = exact.length ? [] : eventsNearYear(y, 45, 4);
    const picks = (exact.length ? exact : nearby).slice(0, 4);
    const nearStates = statesAtYear(y);
    const eraLabel = ruler ? rulerEraLabel(ruler, y) : "";
    const top = picks[0];
    let headline;
    if (top && top.yearNum === y) {
      headline = `${esc(eraLabel || (primary ? primary.name : "这一年"))}，<em>${esc(top.title)}</em>`;
    } else if (top) {
      headline = `${esc(primary ? primary.name : "这一年")}，<em>${esc(top.title)}</em>`;
    } else {
      headline = `${esc(primary ? primary.name : "这一年")}，<em>史册留白</em>`;
    }

    const summaryParts = [];
    if (anomaly) summaryParts.push(anomaly.note);
    if (primary) summaryParts.push(primary.summary);
    if (nearStates.length) {
      summaryParts.push(`同时并立：${nearStates.slice(0, 4).map((s) => s.name).join("、")}${nearStates.length > 4 ? "等" : ""}。`);
    }

    const eventsHTML = picks.length ? picks.map((ev) => {
      const distance = Math.abs(ev.yearNum - y);
      return `<button type="button" class="snapshot-event" data-event-id="${esc(ev.id)}">
        <span class="snapshot-event-year">${esc(formatYear(ev.yearNum))}${ev.approx ? " 约" : ""}</span>
        <span><span class="snapshot-event-title">${esc(ev.title)}</span><span class="snapshot-event-sub">${esc(ev.summary)}${distance ? ` · 距此 ${distance} 年` : ""}</span></span>
        <span class="snapshot-event-type">${esc(ev.typeLabel)}</span>
      </button>`;
    }).join("") : `<p class="snapshot-empty">这一年还没有录入大事。可以拖动时间轴，或翻到相邻年份看看。</p>`;

    const polisButtons = [...periodsAtYear(y), ...nearStates].slice(0, 5).map((p) =>
      `<span>${esc(p.name)}${p.capital ? " · " + esc(p.capital) : ""}</span>`
    ).join("");

    const quote = primary && primary.quote
      ? `<blockquote class="snapshot-quote">${esc(primary.quote.text)}<footer>— ${esc(primary.quote.source)}</footer></blockquote>`
      : "";
    const visual = ERA_SCENE_LABELS[primary && primary.eraId] || ERA_SCENE_LABELS.legendary;

    dom.snapshot.style.setProperty("--tone", primary ? primary.color : "var(--accent)");
    dom.snapshot.innerHTML = `<div class="snapshot-lead">
      <p class="snapshot-kicker">THE YEAR ${esc(formatYear(y))} · ${esc(ganZhi(y))}年${primary && primary.era ? " · " + esc(primary.era.name) : ""}</p>
      <h2 class="snapshot-headline">${headline}</h2>
      <p class="snapshot-summary">${esc(summaryParts.join(" "))}</p>
      ${quote}
      ${polisButtons ? `<div class="snapshot-polis">${polisButtons}</div>` : ""}
      <figure class="snapshot-scene" aria-label="${esc(visual[0])}：${esc(visual[1])}">
        ${eraArtSVG(primary && primary.eraId)}
        <figcaption><span>${esc(visual[0])}</span><small>${esc(visual[1])}</small></figcaption>
      </figure>
      <div class="snapshot-actions">
        <button type="button" class="btn btn-primary" data-go-year="${y}">展开这一年 <svg class="icon"><use href="#i-arrow-right"></use></svg></button>
        <button type="button" class="btn btn-ghost" data-jump-view="events">翻检大事记</button>
      </div>
    </div>
    <div class="snapshot-events">
      <div class="snapshot-events-head">
        <span>${exact.length ? "本年 · " + exact.length + " 件" : nearby.length ? "附近年份 · " + nearby.length + " 件" : "本年 · 暂无"}</span>
        <button type="button" data-go-year="${y}">进入纪年 <svg class="icon" style="width:11px;height:11px"><use href="#i-arrow-right"></use></svg></button>
      </div>
      ${eventsHTML}
    </div>`;
  }

  /* ---------- 纪年视图 ---------- */
  function primaryRulerAt(y) {
    const active = rulersAtYear(y);
    if (!active.length) return null;
    const primary = periodsAtYear(y)[0];
    if (!primary) return active[0];
    return active.find((r) => r.polityId === primary.id) || active[0];
  }

  function renderYearResult() {
    if (!dom.yearResult) return;
    const y = state.year;
    const primary = periodsAtYear(y)[0] || null;
    const anomaly = primary ? periodAnomaly(primary, y) : null;
    const ruler = primaryRulerAt(y);
    const exact = eventsAtYear(y).sort((a, b) => b.importance - a.importance);
    const nearby = exact.length ? [] : eventsNearYear(y, 35, 5);
    const allEvents = exact.length ? exact : nearby;
    const people = uniqueById([
      ...figuresAtYear(y),
      ...allEvents.flatMap((ev) => (ev.figures || []).map((id) => figureById2.get(id)).filter(Boolean)),
    ]).slice(0, 6);
    const polityPool = uniqueById([...periodsAtYear(y), ...statesAtYear(y)]);
    const polities = polityPool.slice(0, 12);
    const statesNow = statesAtYear(y);
    const eraLabel = ruler ? rulerEraLabel(ruler, y) : "";
    const capital = primary ? primary.capital : "—";
    const eraRange = primary ? formatRange(primary.startNum, primary.endNum) : "—";
    const num = y <= 0 ? String(1 - y) : String(y);
    const prefix = y <= 0 ? "公元前" : "公元";
    const context = [];
    if (anomaly) context.push(anomaly.note);
    if (primary) context.push(`${primary.fullName}，${primary.summary}`);
    if (statesNow.length) context.push(`并立政权：${statesNow.slice(0, 5).map((s) => s.name).join("、")}${statesNow.length > 5 ? "等" : ""}。`);
    const visual = ERA_SCENE_LABELS[primary && primary.eraId] || ERA_SCENE_LABELS.legendary;

    const eventsHTML = allEvents.length ? allEvents.map((ev) => yearEventHTML(ev, !exact.length)).join("") :
      `<p class="empty-inline">这一年没有录入大事。可以把时间轴向前或向后拨动一格。</p>`;

    const peopleHTML = people.length ? `<div class="people-grid">${people.map((f) => figureCardHTML(f)).join("")}</div>` :
      `<p class="empty-inline">此年人物暂无条目。</p>`;

    const situationHTML = polities.length ? polities.map((p) =>
      polityCardHTML(p, y, !!primary && p.id === primary.id)
    ).join("") : `<p class="empty-inline">此年不在已收录的政权纪年之内。</p>`;

    const prev = [...events].reverse().find((ev) => ev.yearNum < y - 1);
    const next = events.find((ev) => ev.yearNum > y + 1);
    const navHTML = `<div class="year-nav">
      <button type="button" data-go-year="${prev ? prev.yearNum : y - 1}">
        <svg class="icon"><use href="#i-arrow-left"></use></svg>
        ${prev ? `${esc(formatYear(prev.yearNum))} · ${esc(prev.title)}` : "向前一年"}
      </button>
      <button type="button" data-go-year="${next ? next.yearNum : y + 1}">
        ${next ? `${esc(formatYear(next.yearNum))} · ${esc(next.title)}` : "向后一年"}
        <svg class="icon"><use href="#i-arrow-right"></use></svg>
      </button>
    </div>`;

    dom.yearResult.innerHTML = `
      <div class="year-hero" style="--tone:${esc(primary ? primary.color : "#a84030")}">
        <div class="year-hero-copy">
          <div class="year-hero-number"><span>${prefix}</span><strong>${num}</strong><sup>年</sup></div>
          <div class="year-hero-meta">
            <div class="ganzhi-seal">${esc(ganZhi(y).slice(0, 1))}<br>${esc(ganZhi(y).slice(1))}<small>GANZHI</small></div>
            <dl class="year-facts">
              <div class="year-fact"><dt>时代</dt><dd>${esc(anomaly ? anomaly.label : (primary ? primary.name : "纪年之外"))}<small>${esc(eraRange)}</small></dd></div>
              <div class="year-fact"><dt>在位</dt><dd>${esc(ruler ? ruler.title : "—")}<small>${esc(eraLabel || (ruler ? ruler.name : ""))}</small></dd></div>
              <div class="year-fact"><dt>都城</dt><dd>${esc(capital)}<small>${esc(primary ? periodTypeLabel(primary) : "")}</small></dd></div>
              <div class="year-fact"><dt>并立</dt><dd>${esc(statesNow.length ? statesNow.slice(0, 3).map((s) => s.name).join(" · ") : "—")}<small>${statesNow.length ? statesNow.length + " 个政权" : "天下一统或未录"}</small></dd></div>
            </dl>
          </div>
        </div>
        <figure class="year-scene" aria-label="${esc(visual[0])}：${esc(visual[1])}">
          <span class="year-scene-index">${esc(formatYear(y))}</span>
          ${eraArtSVG(primary && primary.eraId)}
          <figcaption><span>${esc(visual[0])}</span><small>${esc(visual[1])}</small></figcaption>
        </figure>
      </div>
      <p class="year-context-line">${esc(context.join(" "))}</p>
      <div class="year-layout">
        <div>
          <section class="year-section">
            ${sectionHead(exact.length ? "本年大事" : "附近年份", exact.length ? `${exact.length} 件` : "以最近者为参照")}
            ${eventsHTML}
          </section>
          <section class="year-section">
            ${sectionHead("人物与身影", `${people.length} 位`)}
            ${peopleHTML}
          </section>
          ${navHTML}
        </div>
        <aside class="year-aside">
          <section class="aside-block territory-aside">
            <h3>山河坐标 <span class="aside-count">示意</span></h3>
            ${territoryPlateHTML(primary, y, "compact")}
          </section>
          <section class="aside-block">
            <h3>天下形势 <span class="aside-count">${polityPool.length}</span></h3>
            <div class="situation-list">${situationHTML}</div>
            ${polityPool.length > polities.length ? `<p class="polity-more">另有 ${polityPool.length - polities.length} 个政权，可在“朝代”视图中查看。</p>` : ""}
          </section>
          <section class="aside-block">
            <h3>世界坐标</h3>
            ${worldCardHTML(y) || `<p class="empty-inline">暂无同期世界条目。</p>`}
          </section>
          <section class="aside-block">
            <h3>纪年注脚</h3>
            <p class="year-context-line" style="margin-top:0">干支 ${esc(ganZhi(y))}。${ruler ? `${esc(ruler.title)}${ruler.reignLabel ? "，" + esc(ruler.reignLabel) : ""}；` : ""}${primary ? esc(primary.fullName) + "，" + esc(formatRange(primary.startNum, primary.endNum)) + "。" : "此年不在本站已收录的朝代纪年之内。"}</p>
          </section>
        </aside>
      </div>`;
  }

  /* ---------- 朝代视图 ---------- */
  function renderPeriodGrid() {
    if (!dom.periodGrid) return;
    $$("#eraFilters .era-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.era === state.periodFilter);
    });
    const list = state.periodFilter === "all" ? periods : periods.filter((p) => p.eraId === state.periodFilter);
    const maxDuration = Math.max(...periods.map((p) => p.endNum - p.startNum + 1), 1);
    if (!list.length) {
      dom.periodGrid.innerHTML = `<p class="empty-inline" style="grid-column:1/-1;padding:32px">这个时代还没有收录段落。</p>`;
      return;
    }
    const marks = ["古", "夏", "周", "秦", "裂", "唐", "宋", "元", "明", "清"];
    const groups = DATA.eras.map((era, eraIndex) => ({
      era,
      eraIndex,
      list: list.filter((p) => p.eraId === era.id),
    })).filter((group) => group.list.length);
    const periodNumber = new Map(periods.map((p) => [p.id, p.index + 1]));
    dom.periodGrid.innerHTML = groups.map((group, groupIndex) => {
      const first = group.list[0];
      return `<section class="period-era-run" data-era="${esc(group.era.id)}" style="--tone:${esc(first.color)};--run-index:${groupIndex}">
        <header class="period-run-head">
          <span class="period-run-number">${pad(group.eraIndex + 1)}</span>
          <div>
            <p>${esc(group.era.en || "ERA")}</p>
            <h3>${esc(group.era.name)}</h3>
          </div>
          <span class="period-run-years">${esc(formatRange(parseYear(group.era.start), parseYear(group.era.end)))}</span>
          <span class="period-run-rule" aria-hidden="true"></span>
        </header>
        <div class="period-run-list">
          ${group.list.map((p) => {
            const duration = p.endNum - p.startNum + 1;
            const bar = Math.round(14 + (duration / maxDuration) * 86);
            const rulerCount = rulersForPeriod(p).length;
            const eventCount = eventsForPeriod(p).length;
            const mark = marks[group.eraIndex] || p.name.slice(0, 1);
            return `<button type="button" class="period-card" data-period-id="${esc(p.id)}" style="--tone:${esc(p.color)}" aria-label="打开${esc(p.name)}，${esc(formatRange(p.startNum, p.endNum))}">
              <span class="period-card-index">${pad(periodNumber.get(p.id))}</span>
              <span class="period-card-watermark" aria-hidden="true">${esc(mark)}</span>
              <span class="period-card-top">
                <span class="era-name"><i class="era-dot"></i>${esc(p.era ? p.era.name : "")} · ${esc(periodTypeLabel(p))}</span>
                <span class="period-card-years">${esc(formatRange(p.startNum, p.endNum))}</span>
              </span>
              <span class="period-card-name">${esc(p.name)}<small>${esc(p.en)}</small></span>
              <span class="period-card-summary">${esc(p.summary)}</span>
              <span class="period-card-foot"><span>${rulerCount} 位君主 · ${eventCount} 件大事</span><svg class="icon"><use href="#i-arrow-right"></use></svg></span>
              <span class="period-card-bar"><span style="width:${bar}%"></span></span>
            </button>`;
          }).join("")}
        </div>
      </section>`;
    }).join("");
  }

  function openPeriod(id, opts) {
    opts = opts || {};
    const p = periodById.get(id);
    if (!p) return;
    if (state.view !== "periods") switchView("periods", { scroll: false, keepHash: true });
    state.periodDetail = id;
    if (state.year < p.startNum || state.year > p.endNum) {
      const target = clamp(p.startNum + Math.floor((p.endNum - p.startNum) / 2), p.startNum, p.endNum);
      setYear(target, { silent: true, noHash: true, syncInput: false });
    }
    dom.periodGrid.hidden = true;
    dom.periodDetail.hidden = false;
    dom.views.periods.classList.add("is-detail");

    const periodRulers = rulersForPeriod(p);
    const periodStates = statesForPeriod(p);
    const periodEvents = eventsForPeriod(p).sort((a, b) => a.yearNum - b.yearNum || b.importance - a.importance);
    const periodFigures = figuresForPeriod(p).slice(0, 9);
    const duration = p.endNum - p.startNum + 1;
    const directRulers = rulersOfPolity(p.id);
    const grouped = !directRulers.length;
    const quote = p.quote ? `<div class="quote-block">${esc(p.quote.text)}<cite>${esc(p.quote.source)}</cite></div>` : "";
    const rulerHTML = periodRulers.length
      ? `<div class="ruler-rail">${periodRulers.map((r) => rulerCardHTML(r, grouped)).join("")}</div>`
      : `<p class="empty-inline">此段暂未收录具体君主。</p>`;
    const eventsHTML = periodEvents.length
      ? `<div class="timeline-list">${periodEvents.map((ev) => `<button type="button" class="tl-item" data-event-id="${esc(ev.id)}">
          <span class="tl-item-year">${esc(formatYear(ev.yearNum))}</span>
          <span class="tl-item-dot"></span>
          <span><span class="tl-item-title">${esc(ev.title)}</span><span class="tl-item-sub">${esc(ev.summary)}</span></span>
        </button>`).join("")}</div>`
      : `<p class="empty-inline">这一段还没有录入大事。</p>`;
    const laneStates = [...periodStates].sort((a, b) => a.startNum - b.startNum || a.endNum - b.endNum);
    const typeCounts = {};
    laneStates.forEach((s) => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1; });
    const breakdownHTML = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `<span class="polity-count"><strong>${count}</strong>${esc(type)}</span>`).join("");
    const politySection = `<section class="detail-section polity-atlas-section">
      <div class="detail-head"><h3>同时天下</h3><span>${laneStates.length} 个并立与周边政权</span></div>
      <p class="polity-note">横向为各政权在本段内的存续区间，点开可看君主、都城与释义。主条为本站所系的时代主体，其余为同时并立、割据或周边政权。</p>
      ${polityLanesHTML(p, laneStates)}
      ${laneStates.length ? `<div class="polity-mini-grid">${laneStates.map((s) => polityMiniCardHTML(s)).join("")}</div>` : `<p class="empty-inline">本段暂无并立政权条目。</p>`}
    </section>`;
    const peopleHTML = periodFigures.length
      ? `<div class="people-grid detail">${periodFigures.map((f) => figureCardHTML(f)).join("")}</div>`
      : `<p class="empty-inline">此段人物暂无条目。</p>`;
    const prev = periods[p.index - 1];
    const next = periods[p.index + 1];
    const pagerHTML = `<div class="period-pager">
      ${prev ? `<button type="button" data-go-period="${esc(prev.id)}"><small>上一段</small><strong>← ${esc(prev.name)}</strong></button>` : "<span></span>"}
      ${next ? `<button type="button" class="next" data-go-period="${esc(next.id)}"><small>下一段</small><strong>${esc(next.name)} →</strong></button>` : "<span></span>"}
    </div>`;

    dom.periodDetail.innerHTML = `
      <button type="button" class="back-btn" data-close-period><svg class="icon"><use href="#i-chevron-left"></use></svg>返回朝代列表</button>
      <header class="period-hero" style="--tone:${esc(p.color)}">
        <span class="period-watermark">${esc(p.name)}</span>
        <div>
          <p class="period-detail-kicker"><i class="era-dot"></i>${esc(p.era ? p.era.name : "")} · ${esc(periodTypeLabel(p))}</p>
          <h1 class="period-detail-title">${esc(p.name)}<small>${esc(p.en)}</small></h1>
          <p class="period-detail-years">${esc(formatRange(p.startNum, p.endNum))} · 约 ${duration} 年</p>
          <p class="period-summary">${esc(p.summary)}</p>
          <div class="period-keywords">${(p.keywords || []).map((k) => `<span class="keyword">${esc(k)}</span>`).join("")}</div>
        </div>
        <div class="period-side">
          <dl class="facts-grid">
            <div class="fact-box"><dt>都城</dt><dd>${esc(p.capital || "—")}</dd></div>
            <div class="fact-box"><dt>开国 / 起点</dt><dd>${esc(p.founder || "—")}</dd></div>
            <div class="fact-box"><dt>时段</dt><dd>${esc(formatRange(p.startNum, p.endNum))}</dd></div>
            <div class="fact-box"><dt>并立政权</dt><dd>${periodStates.length} 个</dd></div>
          </dl>
          ${quote}
        </div>
      </header>
      <section class="period-atlas" style="--tone:${esc(p.color)}">
        <div class="period-atlas-copy">
          <p class="section-kicker">ATLAS · 山河与制度</p>
          <h2>以空间，读${esc(p.name)}</h2>
          <p>王朝不是一条孤立的年号。它同时拥有核心统治区、交通方向、并立政权与流动的人口。下图抽取本段的时代空间结构，帮助把人物和事件放回山河之间。</p>
          <dl>
            <div><dt>政治中心</dt><dd>${esc(p.capital || "—")}</dd></div>
            <div><dt>时代类型</dt><dd>${esc(periodTypeLabel(p))}</dd></div>
            <div><dt>并立结构</dt><dd>${periodStates.length} 个</dd></div>
          </dl>
          <button type="button" class="text-arrow" data-go-year="${Math.round((p.startNum + p.endNum) / 2)}">
            在中点年份看天下
            <svg class="icon"><use href="#i-arrow-right"></use></svg>
          </button>
        </div>
        ${territoryPlateHTML(p, state.year)}
      </section>
      ${politySection}
      <section class="detail-section">
        <div class="detail-head"><h3>帝王与执政者</h3><span>${periodRulers.length} 位</span></div>
        ${rulerHTML}
      </section>
      <div class="detail-split">
        <section class="detail-section">
          <div class="detail-head"><h3>大事年表</h3><span>${periodEvents.length} 件</span></div>
          ${eventsHTML}
        </section>
        <aside>
          <section class="aside-block">
            <h3>并立结构</h3>
            <div class="polity-counts">${breakdownHTML || `<span class="empty-inline">暂无并立政权</span>`}</div>
            <p class="year-context-line" style="margin-top:16px">本段共 ${laneStates.length} 个并立与周边政权，以上泳道按起始年份排列；点击政权名或卡片可展开详情。</p>
          </section>
          <section class="aside-block">
            <h3>时代底色</h3>
            <p class="year-context-line" style="margin-top:0">${esc(p.summary)}</p>
          </section>
        </aside>
      </div>
      <section class="detail-section">
        <div class="detail-head"><h3>人物</h3><span>${periodFigures.length} 位</span></div>
        ${peopleHTML}
      </section>
      ${pagerHTML}`;

    syncContextTimebars();
    if (!opts.noHash) updateHash();
    if (!opts.noScroll) scrollToMainTop();
  }

  function closePeriodDetail(skipScroll) {
    if (!state.periodDetail) return;
    state.periodDetail = null;
    dom.periodDetail.hidden = true;
    dom.periodGrid.hidden = false;
    dom.views.periods.classList.remove("is-detail");
    updateHash();
    syncContextTimebars();
    if (!skipScroll) scrollToMainTop();
  }

  /* ---------- 大事视图 ---------- */
  function renderEvents() {
    if (!dom.eventList) return;
    const query = state.eventQuery.trim().toLowerCase();
    const filtered = events.filter((ev) => {
      if (state.eventNear && Math.abs(ev.yearNum - state.year) > 50) return false;
      if (state.eventType !== "all" && ev.type !== state.eventType) return false;
      const period = periodById.get(ev.periodId);
      if (state.eventEra !== "all" && (!period || period.eraId !== state.eventEra)) return false;
      if (!query) return true;
      const people = (ev.figures || []).map((id) => personOf(id)).filter(Boolean).map((p) => p.name + " " + (p.title || ""));
      const haystack = [ev.title, ev.summary, ev.place || "", ev.typeLabel, period ? period.name : "", ...people].join(" ").toLowerCase();
      return haystack.indexOf(query) >= 0;
    });

    $$("#eventTypeFilters .type-chip").forEach((chip) => {
      chip.classList.toggle("is-active", chip.dataset.type === state.eventType);
    });
    if (dom.eventEraFilter) dom.eventEraFilter.value = state.eventEra;

    dom.eventStats.innerHTML = `
      <div class="event-stat"><strong>${filtered.length}</strong><span>筛选结果</span></div>
      ${state.eventNear ? `<div class="event-stat is-window"><strong>${esc(formatYear(state.year - 50))}—${esc(formatYear(state.year + 50))}</strong><span>时间窗 ±50 年</span></div>` : ""}
      <div class="event-stat"><strong>${events.length}</strong><span>全库收录</span></div>
      <div class="event-stat"><strong>${new Set(filtered.map((e) => periodById.get(e.periodId)?.eraId).filter(Boolean)).size}</strong><span>涉及时代</span></div>`;

    dom.eventEmpty.hidden = filtered.length > 0;
    dom.eventList.hidden = filtered.length === 0;
    if (!filtered.length) {
      dom.eventList.innerHTML = "";
      state.eventListYear = null;
      syncContextTimebars();
      return;
    }

    const groups = new Map();
    filtered.forEach((ev) => {
      if (!groups.has(ev.century)) groups.set(ev.century, []);
      groups.get(ev.century).push(ev);
    });
    const groupEntries = [...groups.entries()];
    dom.eventCenturyNav.innerHTML = groupEntries.map(([century, list], index) => {
      const start = Math.min(...list.map((ev) => ev.yearNum));
      return `<button type="button" data-century-start="${start}" title="${esc(century)}，${list.length}件">
        <span>${esc(century.replace(/^公元/, ""))}</span><small>${pad(index + 1)} · ${list.length}</small>
      </button>`;
    }).join("");
    dom.eventList.innerHTML = groupEntries.map(([century, list]) => {
      const start = Math.min(...list.map((ev) => ev.yearNum));
      const end = Math.max(...list.map((ev) => ev.yearNum));
      return `<section class="event-group" data-start="${start}" data-end="${end}">
      <div class="event-group-head"><h3>${esc(century)}</h3><span>${list.length} 件</span></div>
      ${list.map((ev) => `<button type="button" class="event-row" data-event-id="${esc(ev.id)}">
        <span class="event-row-year">${esc(formatYear(ev.yearNum))}${ev.approx ? " 约" : ""}</span>
        <span>
          <span class="event-row-title">${esc(ev.title)}</span>
          <span class="event-row-summary">${esc(ev.summary)}</span>
          <span class="event-row-meta">${typeTag(ev.typeLabel, ev.type)}${ev.place ? placeChip(ev.place) : ""}${ev.anchor ? `<span class="place-chip">长河坐标</span>` : ""}</span>
        </span>
        <span class="event-row-arrow"><svg class="icon"><use href="#i-arrow-right"></use></svg></span>
      </button>`).join("")}
    </section>`;
    }).join("");

    if (state.view === "events" && !state.eventNear) {
      state.eventListYear = filtered[0].yearNum;
      scheduleEventScrollYear();
    } else {
      state.eventListYear = null;
    }
  }

  function clearEventFilters() {
    state.eventType = "all";
    state.eventEra = "all";
    state.eventQuery = "";
    state.eventNear = false;
    dom.eventSearch.value = "";
    renderEvents();
    focusEventYear(state.year, true);
  }

  function bindEventFilters() {
    dom.eventCenturyNav.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-century-start]");
      if (!btn) return;
      $$("button", dom.eventCenturyNav).forEach((item) => item.classList.toggle("is-active", item === btn));
      const start = Number(btn.dataset.centuryStart);
      focusEventYear(start, true);
    });
    dom.eventTypeFilters.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-type]");
      if (!btn) return;
      state.eventType = btn.dataset.type;
      renderEvents();
    });
    dom.eraFilters.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-era]");
      if (!btn) return;
      state.periodFilter = btn.dataset.era;
      renderPeriodGrid();
    });
    dom.eventEraFilter.addEventListener("change", (e) => {
      state.eventEra = e.target.value;
      renderEvents();
    });
    dom.eventSearch.addEventListener("input", (e) => {
      state.eventQuery = e.target.value;
      clearTimeout(dom.eventSearch._timer);
      dom.eventSearch._timer = setTimeout(renderEvents, 90);
    });
    dom.clearEventFilters.addEventListener("click", clearEventFilters);
    dom.eventEmpty.addEventListener("click", (e) => {
      if (e.target.closest("[data-clear-events]")) clearEventFilters();
    });
  }

  /* ---------- 时光放映 ---------- */
  function initPlayerStatic() {
    if (!dom.playerPeriod) return;
    dom.playerPeriod.innerHTML = periods.map((p) =>
      `<option value="${esc(p.id)}">${esc(p.name)} · ${esc(formatRange(p.startNum, p.endNum))}</option>`
    ).join("");
    const initial = periodsAtYear(state.year)[0] || periods[0];
    player.periodId = initial ? initial.id : "tang";
    dom.playerPeriod.value = player.periodId;
    dom.playerStartInput.value = formatYear(clamp(state.year - 100, MIN_YEAR, MAX_YEAR));
    dom.playerEndInput.value = formatYear(clamp(state.year + 100, MIN_YEAR, MAX_YEAR));
    setPlayerMode("all", false);
    setPlayerSpeed(1, false);
  }

  function setPlayerMode(mode, update) {
    player.mode = mode;
    if (!dom.playerModes) return;
    $$("button[data-player-mode]", dom.playerModes).forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.playerMode === mode);
    });
    dom.playerPeriodField.hidden = mode !== "period";
    dom.playerCustomField.hidden = mode !== "custom";
    if (update !== false) updatePlayerPreview();
  }

  function setPlayerSpeed(speed, update) {
    player.speed = speed;
    if (dom.playerSpeed) {
      $$("button[data-speed]", dom.playerSpeed).forEach((btn) => {
        btn.classList.toggle("is-active", Number(btn.dataset.speed) === speed);
      });
    }
    if (dom.playerInlineSpeed) dom.playerInlineSpeed.textContent = `${speed}×`;
    if (update !== false) {
      updatePlayerPreview();
      if (player.playing) schedulePlayer();
    }
  }

  function getPlayerRange() {
    if (player.mode === "period") {
      const p = periodById.get(player.periodId);
      if (!p) return { error: "请选择一个有效的朝代。" };
      return { start: p.startNum, end: p.endNum, label: p.name };
    }
    if (player.mode === "custom") {
      const start = parseYear(dom.playerStartInput.value);
      const end = parseYear(dom.playerEndInput.value);
      if (start == null || end == null) return { error: "请输入有效的起止年份，如“755”或“前221”。" };
      const a = clamp(Math.min(start, end), MIN_YEAR, MAX_YEAR);
      const b = clamp(Math.max(start, end), MIN_YEAR, MAX_YEAR);
      return { start: a, end: b, label: "自选区间", swapped: start > end };
    }
    return { start: MIN_YEAR, end: MAX_YEAR, label: "整个历史" };
  }

  function buildPlayerChapters(start, end) {
    const inRange = events.filter((e) => e.yearNum >= start && e.yearNum <= end);
    let pool = inRange.filter((e) => e.anchor || e.importance === 3);
    if (pool.length < 4) pool = inRange.filter((e) => e.importance >= 2);
    if (!pool.length) pool = inRange;
    pool = [...pool].sort((a, b) =>
      a.yearNum - b.yearNum ||
      (b.anchor ? 1 : 0) - (a.anchor ? 1 : 0) ||
      b.importance - a.importance
    );
    const byYear = new Map();
    pool.forEach((ev) => {
      if (!byYear.has(ev.yearNum)) byYear.set(ev.yearNum, []);
      byYear.get(ev.yearNum).push(ev);
    });
    return [...byYear.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, list]) => ({
        year,
        events: list.sort((a, b) => (b.anchor ? 1 : 0) - (a.anchor ? 1 : 0) || b.importance - a.importance),
      }));
  }

  function getPlayerInfo() {
    const range = getPlayerRange();
    if (range.error) return { error: range.error };
    const chapters = buildPlayerChapters(range.start, range.end);
    return { ...range, chapters };
  }

  function updatePlayerPreview() {
    if (!dom.playerPreview) return;
    const info = getPlayerInfo();
    if (info.error) {
      dom.playerPreview.innerHTML = `<strong>—</strong><span>${esc(info.error)}</span>`;
      dom.playerStart.disabled = true;
      return;
    }
    const count = info.chapters.length;
    const seconds = count * (5.2 / player.speed + .5);
    const time = seconds > 90 ? `约 ${Math.ceil(seconds / 60)} 分钟` : `约 ${Math.max(1, Math.ceil(seconds))} 秒`;
    dom.playerPreview.innerHTML = `<strong>${esc(formatRange(info.start, info.end))}</strong><span>${count} 章 · ${time}</span>`;
    if (info.swapped) {
      dom.playerPreview.innerHTML += `<em class="player-order-note">起止顺序已按时间整理为 ${esc(formatRange(info.start, info.end))}</em>`;
    }
    dom.playerStart.disabled = count === 0;
    if (!count) dom.playerPreview.innerHTML += `<em>此区间暂无可放映的事件，请换一段试试。</em>`;
  }

  function openPlayer(opts) {
    opts = opts || {};
    if (player.open) return;
    player.trigger = document.activeElement;
    player.open = true;
    player.stage = false;
    player.ended = false;
    player.playing = false;
    clearTimeout(player.timer);
    cancelAnimationFrame(player.raf);
    if (opts.periodId && periodById.has(opts.periodId)) {
      player.periodId = opts.periodId;
      dom.playerPeriod.value = opts.periodId;
      setPlayerMode(opts.mode || "period", false);
    } else if (opts.start != null && opts.end != null) {
      dom.playerStartInput.value = formatYear(opts.start);
      dom.playerEndInput.value = formatYear(opts.end);
      setPlayerMode("custom", false);
    } else if (opts.mode) {
      setPlayerMode(opts.mode, false);
    }
    dom.playerSetup.hidden = false;
    dom.playerStage.hidden = true;
    dom.playerEnd.hidden = true;
    dom.playerError.textContent = "";
    dom.playerLayer.hidden = false;
    document.body.style.overflow = "hidden";
    updatePlayerPreview();
    requestAnimationFrame(() => {
      dom.playerLayer.classList.add("is-open");
      try { dom.playerClose.focus({ preventScroll: true }); } catch (e) {}
    });
    if (opts.autoStart) {
      setTimeout(() => {
        if (player.open && !player.stage) startPlayer();
      }, 120);
    }
  }

  function closePlayer() {
    if (!player.open) return;
    player.playing = false;
    clearTimeout(player.timer);
    cancelAnimationFrame(player.raf);
    player.open = false;
    dom.playerLayer.classList.remove("is-open");
    document.body.style.overflow = "";
    const trigger = player.trigger;
    player.trigger = null;
    setTimeout(() => {
      if (player.open) return;
      dom.playerLayer.hidden = true;
      dom.playerSetup.hidden = false;
      dom.playerStage.hidden = true;
      dom.playerEnd.hidden = true;
      if (trigger && document.contains(trigger) && !dom.drawerLayer.classList.contains("is-open")) {
        try { trigger.focus({ preventScroll: true }); } catch (e) {}
      }
    }, reduceMotion ? 0 : 320);
  }

  function startPlayer() {
    const info = getPlayerInfo();
    dom.playerError.textContent = "";
    if (info.error) {
      dom.playerError.textContent = info.error;
      return;
    }
    if (!info.chapters.length) {
      dom.playerError.textContent = "这段区间没有可放映的事件，请换一段试试。";
      return;
    }
    if (info.swapped) {
      dom.playerStartInput.value = formatYear(info.start);
      dom.playerEndInput.value = formatYear(info.end);
    }
    player.chapters = info.chapters;
    player.start = info.start;
    player.end = info.end;
    player.index = 0;
    player.ended = false;
    player.playing = true;
    player.stage = true;
    dom.playerSetup.hidden = true;
    dom.playerStage.hidden = false;
    dom.playerEnd.hidden = true;
    dom.playerRangeLabel.textContent = `${formatRange(info.start, info.end)} · ${info.label}`;
    renderPlayerChapter(0, true);
    setPlayerPlaying(true);
    schedulePlayer();
    try { dom.playerToggle.focus({ preventScroll: true }); } catch (e) {}
  }

  function renderPlayerChapter(index, instant) {
    const chapter = player.chapters[index];
    if (!chapter) return;
    player.index = index;
    const from = player.displayYear;
    player.displayYear = chapter.year;
    setYear(chapter.year, { silent: true, syncInput: false, noHash: true });
    animatePlayerYear(instant ? chapter.year : from, chapter.year, instant);
    const primary = periodsAtYear(chapter.year)[0] || null;
    const ruler = primaryRulerAt(chapter.year);
    const eraLabel = primary ? `${primary.name} · ${primary.fullName}` : "纪年之外";
    dom.playerEra.textContent = eraLabel;
    dom.playerRuler.textContent = ruler ? `${ruler.title || ruler.name}${ruler.reignLabel ? " · " + ruler.reignLabel : ""}` : "君主待补";
    dom.playerCounter.textContent = `第 ${index + 1} / ${player.chapters.length} 章`;
    dom.playerProgressBar.style.width = `${((index + 1) / player.chapters.length) * 100}%`;
    dom.playerEnd.hidden = true;
    dom.playerEvent.classList.remove("is-ended");
    renderPlayerEvent(chapter);
    dom.playerEvent.classList.remove("is-entering");
    void dom.playerEvent.offsetWidth;
    dom.playerEvent.classList.add("is-entering");
    if (!instant) setTimeout(() => dom.playerEvent.classList.remove("is-entering"), 600);
    const prevDisabled = index === 0;
    dom.playerPrev.disabled = prevDisabled;
    dom.playerPrev.classList.toggle("is-disabled", prevDisabled);
    dom.playerNext.disabled = false;
    dom.playerNext.classList.remove("is-disabled");
  }

  function setPlayerNextDisabled(disabled) {
    dom.playerNext.disabled = disabled;
    dom.playerNext.classList.toggle("is-disabled", disabled);
  }

  function renderPlayerEvent(chapter) {
    const ev = chapter.events[0];
    const others = chapter.events.slice(1, 4);
    const people = eventPeopleHTML(ev, 5);
    dom.playerEvent.innerHTML = `
      <div class="player-event-meta">
        ${typeTag(ev.typeLabel, ev.type)}
        ${ev.place ? placeChip(ev.place) : ""}
        ${ev.anchor ? `<span class="player-anchor">长河坐标</span>` : ""}
      </div>
      <h3>${esc(ev.title)}</h3>
      <p class="player-event-summary">${esc(ev.summary)}</p>
      ${people ? `<div class="player-event-people">${people}</div>` : ""}
      ${others.length ? `<div class="player-also"><span>同年还有</span>${others.map((x) => `<button type="button" data-player-event="${esc(x.id)}">${esc(x.title)}</button>`).join("")}</div>` : ""}`;
  }

  function animatePlayerYear(from, to, instant) {
    cancelAnimationFrame(player.raf);
    const paint = (y) => {
      const prefix = y <= 0 ? "公元前" : "公元";
      const num = y <= 0 ? 1 - y : y;
      dom.playerYearPrefix.textContent = prefix;
      dom.playerYear.textContent = String(num);
      dom.playerGz.textContent = ganZhi(y);
    };
    if (instant || reduceMotion || from === to) {
      paint(to);
      return;
    }
    const start = performance.now();
    const duration = 560;
    const step = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      paint(Math.round(from + (to - from) * eased));
      if (p < 1) player.raf = requestAnimationFrame(step);
    };
    player.raf = requestAnimationFrame(step);
  }

  function setPlayerPlaying(flag) {
    player.playing = flag;
    if (!dom.playerToggle) return;
    dom.playerToggle.classList.toggle("is-playing", flag);
    dom.playerToggle.setAttribute("aria-label", flag ? "暂停" : "播放");
    dom.playerToggle.innerHTML = `<svg class="icon"><use href="#${flag ? "i-pause" : "i-play"}"></use></svg>`;
  }

  function schedulePlayer() {
    clearTimeout(player.timer);
    if (!player.playing || player.ended) return;
    const delay = (5200 / player.speed) + 600;
    player.timer = setTimeout(() => {
      if (!player.open || !player.playing) return;
      if (player.index >= player.chapters.length - 1) finishPlayer();
      else {
        renderPlayerChapter(player.index + 1, false);
        schedulePlayer();
      }
    }, delay);
  }

  function togglePlayer() {
    if (!player.stage) return;
    if (player.ended) {
      restartPlayer();
      return;
    }
    setPlayerPlaying(!player.playing);
    if (player.playing) schedulePlayer();
    else clearTimeout(player.timer);
  }

  function nextPlayer(auto) {
    if (!player.stage) return;
    if (player.ended) return;
    if (player.index >= player.chapters.length - 1) {
      if (!auto) finishPlayer();
      return;
    }
    renderPlayerChapter(player.index + 1, false);
    if (player.playing) schedulePlayer();
  }

  function prevPlayer() {
    if (!player.stage || player.index <= 0) return;
    player.ended = false;
    dom.playerEnd.hidden = true;
    dom.playerEvent.classList.remove("is-ended");
    renderPlayerChapter(player.index - 1, false);
    if (player.playing) schedulePlayer();
  }

  function finishPlayer() {
    clearTimeout(player.timer);
    player.ended = true;
    setPlayerPlaying(false);
    setPlayerNextDisabled(true);
    dom.playerEnd.hidden = false;
    dom.playerEvent.classList.add("is-ended");
    try { dom.playerRestart.focus({ preventScroll: true }); } catch (e) {}
  }

  function restartPlayer() {
    if (!player.chapters.length) return;
    player.ended = false;
    player.index = 0;
    dom.playerEnd.hidden = true;
    dom.playerEvent.classList.remove("is-ended");
    renderPlayerChapter(0, true);
    setPlayerPlaying(true);
    schedulePlayer();
  }

  function backToSetup() {
    player.playing = false;
    player.stage = false;
    player.ended = false;
    clearTimeout(player.timer);
    cancelAnimationFrame(player.raf);
    dom.playerStage.hidden = true;
    dom.playerSetup.hidden = false;
    dom.playerEnd.hidden = true;
    dom.playerError.textContent = "";
    updatePlayerPreview();
    try { dom.playerStart.focus({ preventScroll: true }); } catch (e) {}
  }

  function bindPlayer() {
    if (!dom.playerLayer) return;
    dom.playerClose.addEventListener("click", closePlayer);
    dom.playerBackdrop.addEventListener("click", closePlayer);
    dom.playerModes.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-player-mode]");
      if (!btn) return;
      setPlayerMode(btn.dataset.playerMode);
    });
    dom.playerPeriod.addEventListener("change", (e) => {
      player.periodId = e.target.value;
      updatePlayerPreview();
    });
    [dom.playerStartInput, dom.playerEndInput].forEach((input) => {
      input.addEventListener("input", updatePlayerPreview);
    });
    dom.playerSpeed.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-speed]");
      if (!btn) return;
      setPlayerSpeed(Number(btn.dataset.speed));
    });
    dom.playerStart.addEventListener("click", startPlayer);
    dom.playerToggle.addEventListener("click", togglePlayer);
    dom.playerPrev.addEventListener("click", prevPlayer);
    dom.playerNext.addEventListener("click", () => nextPlayer(false));
    dom.playerRestart.addEventListener("click", restartPlayer);
    dom.playerBack.addEventListener("click", backToSetup);
    dom.playerEvent.addEventListener("click", (e) => {
      const eventBtn = e.target.closest("[data-player-event]");
      if (eventBtn) {
        e.stopPropagation();
        const id = eventBtn.dataset.playerEvent;
        player.trigger = null;
        closePlayer();
        setTimeout(() => openEventDrawer(id), reduceMotion ? 0 : 200);
        return;
      }
      const person = e.target.closest("[data-figure-id],[data-ruler-id]");
      if (person) {
        e.stopPropagation();
        const id = person.dataset.figureId || person.dataset.rulerId;
        const isRuler = !!person.dataset.rulerId;
        player.trigger = null;
        closePlayer();
        setTimeout(() => {
          if (isRuler) openRulerDrawer(id, null);
          else openFigureDrawer(id, null);
        }, reduceMotion ? 0 : 200);
      }
    });
    dom.playerPanel.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      const typing = tag === "input" || tag === "textarea" || tag === "select" || e.target.isContentEditable;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closePlayer();
        return;
      }
      if (typing) return;
      if (e.key === " " && player.stage) {
        e.preventDefault();
        e.stopPropagation();
        togglePlayer();
        return;
      }
      if (e.key === "ArrowLeft" && player.stage) {
        e.preventDefault();
        e.stopPropagation();
        prevPlayer();
        return;
      }
      if (e.key === "ArrowRight" && player.stage) {
        e.preventDefault();
        e.stopPropagation();
        nextPlayer(false);
        return;
      }
      if (e.key === "Tab") {
        const focusables = $$("button:not([disabled]), input, select, [tabindex]:not([tabindex='-1'])", dom.playerPanel)
          .filter((el) => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------- 历史地图查看 ---------- */
  function openMapViewer(trigger) {
    if (!dom.mapViewer || !dom.mapViewerImage || !trigger) return;
    const title = trigger.dataset.mapTitle || "历史疆域图";
    dom.mapViewerTitle.textContent = title;
    dom.mapViewerImage.src = trigger.dataset.mapSrc || "";
    dom.mapViewerImage.alt = trigger.dataset.mapAlt || title;
    dom.mapViewerSource.href = trigger.dataset.mapSource || "#";
    dom.mapViewer.classList.remove("is-zoomed");
    try {
      if (!dom.mapViewer.open) dom.mapViewer.showModal();
    } catch (e) {
      dom.mapViewer.setAttribute("open", "");
    }
  }

  function closeMapViewer() {
    if (!dom.mapViewer || !dom.mapViewer.open) return;
    try { dom.mapViewer.close(); } catch (e) { dom.mapViewer.removeAttribute("open"); }
  }

  function bindMapViewer() {
    if (!dom.mapViewer) return;
    dom.mapViewer.addEventListener("click", (e) => {
      if (e.target.closest("[data-map-close]")) {
        closeMapViewer();
        return;
      }
      if (e.target === dom.mapViewer) closeMapViewer();
    });
    dom.mapViewerImage.addEventListener("click", () => {
      dom.mapViewer.classList.toggle("is-zoomed");
      dom.mapViewerImage.setAttribute("title", dom.mapViewer.classList.contains("is-zoomed") ? "再次点击恢复全图" : "点击放大细节");
    });
    dom.mapViewer.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeMapViewer();
    });
  }

  /* ---------- 抽屉 ---------- */
  let drawerCloseTimer = null;

  function openDrawer(kicker, html, trigger) {
    clearTimeout(drawerCloseTimer);
    state.drawerTrigger = trigger || null;
    dom.drawerKicker.textContent = kicker;
    dom.drawerBody.innerHTML = html;
    const drawerTitle = dom.drawerBody.querySelector(".drawer-title");
    if (drawerTitle) drawerTitle.id = "drawerTitle";
    dom.drawerBody.scrollTop = 0;
    dom.drawerLayer.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      dom.drawerLayer.classList.add("is-open");
      try { dom.drawerClose.focus({ preventScroll: true }); } catch (e) { dom.drawer.focus({ preventScroll: true }); }
    });
  }

  function closeDrawer() {
    if (!dom.drawerLayer || dom.drawerLayer.hidden) return;
    dom.drawerLayer.classList.remove("is-open");
    document.body.style.overflow = "";
    clearTimeout(drawerCloseTimer);
    const trigger = state.drawerTrigger;
    state.drawerTrigger = null;
    drawerCloseTimer = setTimeout(() => {
      dom.drawerLayer.hidden = true;
      dom.drawerBody.innerHTML = "";
      if (trigger && document.contains(trigger)) {
        try { trigger.focus({ preventScroll: true }); } catch (e) {}
      }
    }, reduceMotion ? 0 : 460);
  }

  function drawerRelatedEvents(ev) {
    const pool = events.filter((x) => x.id !== ev.id && Math.abs(x.yearNum - ev.yearNum) <= 60)
      .sort((a, b) => Math.abs(a.yearNum - ev.yearNum) - Math.abs(b.yearNum - ev.yearNum) || b.importance - a.importance);
    const samePeriod = pool.filter((x) => x.periodId === ev.periodId);
    const picks = [...samePeriod, ...pool.filter((x) => x.periodId !== ev.periodId)];
    return uniqueById(picks).slice(0, 4);
  }

  function drawerEventList(list, emptyText) {
    if (!list.length) return `<p class="empty-inline">${esc(emptyText)}</p>`;
    return list.map((ev) => `<div class="drawer-event"><button type="button" data-event-id="${esc(ev.id)}">
      <span class="year">${esc(formatYear(ev.yearNum))} · ${esc(ev.typeLabel)}</span>
      <strong>${esc(ev.title)}</strong>
    </button></div>`).join("");
  }

  function openEventDrawer(id, trigger) {
    const ev = eventById.get(id);
    if (!ev) return;
    const p = periodById.get(ev.periodId);
    const related = drawerRelatedEvents(ev);
    const people = eventPeopleHTML(ev, 12);
    openDrawer("EVENT · 史事", `
      <h2 class="drawer-title">${esc(ev.title)}</h2>
      <p class="drawer-subtitle">${esc(formatYearFull(ev.yearNum))}${ev.approx ? "（约）" : ""} · ${esc(p ? p.name : "纪年之外")} · ${esc(ev.typeLabel)}</p>
      <div class="drawer-meta">
        ${ev.place ? `<span>${esc(ev.place)}</span>` : ""}
        <span>${esc(ganZhi(ev.yearNum))}年</span>
        ${ev.anchor ? "<span>长河坐标</span>" : ""}
      </div>
      <p style="margin-top:24px">${esc(ev.summary)}</p>
      ${people ? `<section class="drawer-section"><h3>相关人物</h3>${people}</section>` : ""}
      <section class="drawer-section"><h3>同代脉络</h3>${drawerEventList(related, "附近暂无可系事件。")}</section>
      <div class="drawer-actions">
        <button type="button" class="btn btn-primary small" data-go-year="${ev.yearNum}">跳到这一年 <svg class="icon"><use href="#i-arrow-right"></use></svg></button>
        ${p ? `<button type="button" class="btn btn-ghost small" data-go-period="${esc(p.id)}">查看 ${esc(p.name)}</button>` : ""}
      </div>`, trigger);
  }

  function eventsForRuler(r) {
    const direct = events.filter((ev) => (ev.figures || []).includes(r.id));
    const inReign = r.startNum != null && r.endNum != null
      ? events.filter((ev) => ev.yearNum >= r.startNum && ev.yearNum <= r.endNum)
      : [];
    return uniqueById([...direct, ...inReign]).sort((a, b) => b.importance - a.importance || Math.abs(a.yearNum - (r.startNum || a.yearNum)) - Math.abs(b.yearNum - (r.startNum || b.yearNum))).slice(0, 8);
  }

  function openRulerDrawer(id, trigger) {
    const r = rulerById.get(id);
    if (!r) return;
    const p = r.polity;
    const eras = r.eras || [];
    const evs = eventsForRuler(r);
    const years = r.startNum != null && r.endNum != null ? formatRange(r.startNum, r.endNum) : (r.reignLabel || "在位年不详");
    const eraHTML = eras.length ? `<div class="drawer-era-list">${eras.map((e) => `<span>${esc(e.name)} · ${esc(formatRange(e.startNum, e.endNum))}</span>`).join("")}</div>` : "";
    const goYear = r.startNum != null ? r.startNum : (evs[0] ? evs[0].yearNum : null);
    openDrawer("RULER · 君主", `
      <h2 class="drawer-title">${esc(r.title || r.name)}</h2>
      <p class="drawer-subtitle">${esc(r.name)}${p ? " · " + esc(p.fullName) : ""}</p>
      <div class="drawer-meta"><span>${esc(years)}</span>${p ? `<span>${esc(p.name)}</span>` : ""}${r.featured ? "<span>重点人物</span>" : ""}</div>
      <p style="margin-top:24px">${esc(r.bio || "")}</p>
      ${eraHTML ? `<section class="drawer-section"><h3>年号</h3>${eraHTML}</section>` : ""}
      <section class="drawer-section"><h3>在位前后</h3>${drawerEventList(evs, "暂无与其直接相关的事件条目。")}</section>
      <div class="drawer-actions">
        ${goYear != null ? `<button type="button" class="btn btn-primary small" data-go-year="${goYear}">看这一年的天下</button>` : ""}
        ${p ? `<button type="button" class="btn btn-ghost small" data-go-period="${esc(p.id)}">进入 ${esc(p.name)}</button>` : ""}
      </div>`, trigger);
  }

  function openFigureDrawer(id, trigger) {
    const f = figureById2.get(id);
    if (!f) return;
    const evs = events.filter((ev) => (ev.figures || []).includes(f.id)).sort((a, b) => a.yearNum - b.yearNum).slice(0, 8);
    const goYear = evs[0] ? evs[0].yearNum : (f.startNum != null ? f.startNum : null);
    openDrawer("FIGURE · 人物", `
      <h2 class="drawer-title">${esc(f.name)}</h2>
      <p class="drawer-subtitle">${esc(f.role || "历史人物")} · ${esc(lifeLabel(f))}</p>
      <div class="drawer-meta">${f.life ? `<span>${esc(lifeLabel(f))}</span>` : ""}${f.quote ? "<span>有言传世</span>" : ""}</div>
      <p style="margin-top:24px">${esc(f.bio || "")}</p>
      ${f.quote ? `<blockquote class="drawer-quote">${esc(f.quote)}</blockquote>` : ""}
      <section class="drawer-section"><h3>相关史事</h3>${drawerEventList(evs, "暂无直接关联的事件条目。")}</section>
      <div class="drawer-actions">
        ${goYear != null ? `<button type="button" class="btn btn-primary small" data-go-year="${goYear}">跳到其时代</button>` : ""}
      </div>`, trigger);
  }

  function openPolityDrawer(id, trigger) {
    const isPeriod = periodById.has(id);
    const p = isPeriod ? periodById.get(id) : stateById.get(id);
    if (!p) return;
    const rs = isPeriod ? rulersForPeriod(p) : rulersOfPolity(p.id);
    const evs = isPeriod
      ? eventsForPeriod(p)
      : events.filter((ev) => ev.yearNum >= p.startNum && ev.yearNum <= p.endNum);
    const sortedEvents = [...evs].sort((a, b) => a.yearNum - b.yearNum).slice(0, 8);
    const midpoint = p.startNum != null && p.endNum != null ? Math.round((p.startNum + p.endNum) / 2) : null;
    const ownerPeriod = periodsAtYear(p.startNum != null ? p.startNum : state.year)[0];
    const goYear = midpoint != null ? midpoint : (sortedEvents[0] ? sortedEvents[0].yearNum : null);
    const rulerSection = rs.length
      ? `<div class="ruler-rail">${rs.slice(0, 12).map((r) => rulerCardHTML(r, !isPeriod)).join("")}</div>`
      : `<p class="empty-inline">暂无君主条目。</p>`;
    openDrawer(isPeriod ? "DYNASTY · 朝代" : "REGIME · 政权", `
      <h2 class="drawer-title">${esc(p.name)}</h2>
      <p class="drawer-subtitle">${esc(p.fullName || "")}${p.en ? " · " + esc(p.en) : ""}</p>
      <div class="drawer-meta">
        <span>${esc(formatRange(p.startNum, p.endNum))}</span>
        ${p.capital ? `<span>${esc(p.capital)}</span>` : ""}
        ${p.founder ? `<span>开国：${esc(p.founder)}</span>` : ""}
        ${isPeriod ? `<span>${esc(periodTypeLabel(p))}</span>` : `<span>${esc(stateTypeLabel(p))}</span>`}
      </div>
      <p style="margin-top:24px">${esc(p.summary || "")}</p>
      ${p.quote ? `<blockquote class="drawer-quote">${esc(p.quote.text)}<cite style="display:block;margin-top:6px;font-size:9.5px;color:var(--ink-faint)">${esc(p.quote.source)}</cite></blockquote>` : ""}
      <section class="drawer-section"><h3>君主与执政者</h3>${rulerSection}</section>
      <section class="drawer-section"><h3>同期大事</h3>${drawerEventList(sortedEvents, "暂无同期事件条目。")}</section>
      <div class="drawer-actions">
        ${isPeriod ? `<button type="button" class="btn btn-primary small" data-go-period="${esc(p.id)}">展开朝代档案</button>` : ""}
        ${goYear != null ? `<button type="button" class="btn btn-ghost small" data-go-year="${goYear}">看这一年的天下</button>` : ""}
        ${!isPeriod && ownerPeriod ? `<button type="button" class="btn btn-ghost small" data-go-period="${esc(ownerPeriod.id)}">所属时代：${esc(ownerPeriod.name)}</button>` : ""}
      </div>`, trigger);
  }

  function bindDrawer() {
    dom.drawerClose.addEventListener("click", closeDrawer);
    dom.drawerBackdrop.addEventListener("click", closeDrawer);
    dom.drawerLayer.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const focusables = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', dom.drawer)
        .filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  /* ---------- 启动 ---------- */
  initStatic();
  bindBase();

  // 若动画因后台标签页或截图环境被暂停，超时后直接呈现最终状态
  setTimeout(() => {
    const sample = document.querySelector(".hero-copy h1");
    const anims = sample && sample.getAnimations ? sample.getAnimations() : [];
    const stuck = !anims.length || anims.some((a) => a.playState !== "finished" && a.startTime === null);
    if (stuck) document.documentElement.classList.add("anim-fallback");
  }, 1800);

  const app = { initStatic, bindBase, setYear, switchView, setZoom, showToast, updateNavInk, state, dom, formatYear, parseYear, periodsAtYear, eventsAtYear };
  window.__HUAXIA_APP = app;
})();
