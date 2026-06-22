import { app } from "/scripts/app.js";

const TONE_MAPS = ["None", "Reinhard", "ACES Fitted", "AgX", "Hable"];
const PARAMS = [
  { name: "exposure", label: "Exposure", section: "Primary", type: "range", min: -10, max: 10, step: 0.1, default: 0 },
  { name: "tone_map", label: "Tone Map", section: "Primary", type: "select", values: TONE_MAPS, default: "ACES Fitted" },
  { name: "soft_clip", label: "Soft Clip", section: "Primary", type: "range", min: 0, max: 1, step: 0.01, default: 0 },
  { name: "contrast", label: "Contrast", section: "Primary", type: "range", min: 0, max: 4, step: 0.01, default: 1 },
  { name: "pivot", label: "Pivot", section: "Primary", type: "range", min: 0.001, max: 4, step: 0.001, default: 0.18 },
  { name: "temperature", label: "Temperature", section: "Balance", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "tint", label: "Tint", section: "Balance", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "saturation", label: "Saturation", section: "Balance", type: "range", min: 0, max: 3, step: 0.01, default: 1 },
  { name: "vibrance", label: "Vibrance", section: "Balance", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "hue_shift", label: "Hue Shift", section: "Balance", type: "range", min: -180, max: 180, step: 1, default: 0 },
  { name: "lift_r", label: "Lift R", section: "Lift", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "lift_g", label: "Lift G", section: "Lift", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "lift_b", label: "Lift B", section: "Lift", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "gamma_r", label: "Gamma R", section: "Gamma", type: "range", min: 0.1, max: 4, step: 0.01, default: 1 },
  { name: "gamma_g", label: "Gamma G", section: "Gamma", type: "range", min: 0.1, max: 4, step: 0.01, default: 1 },
  { name: "gamma_b", label: "Gamma B", section: "Gamma", type: "range", min: 0.1, max: 4, step: 0.01, default: 1 },
  { name: "gain_r", label: "Gain R", section: "Gain", type: "range", min: 0, max: 4, step: 0.01, default: 1 },
  { name: "gain_g", label: "Gain G", section: "Gain", type: "range", min: 0, max: 4, step: 0.01, default: 1 },
  { name: "gain_b", label: "Gain B", section: "Gain", type: "range", min: 0, max: 4, step: 0.01, default: 1 },
  { name: "offset_r", label: "Offset R", section: "Offset", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "offset_g", label: "Offset G", section: "Offset", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "offset_b", label: "Offset B", section: "Offset", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "shadows", label: "Shadows", section: "Range", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "highlights", label: "Highlights", section: "Range", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "false_color", label: "False Color", section: "Range", type: "checkbox", default: false },
];

const DEFAULTS = Object.fromEntries(PARAMS.map((p) => [p.name, p.default]));
const PARAM_NAMES = new Set(PARAMS.map((p) => p.name));
const PREVIEW_THROTTLE_MS = 96;
const PRESET_STORAGE_KEY = "x2hdr.colorGradePresets.v1";
const PRESET_SEED_KEY = "x2hdr.colorGradePresets.seeded.v1";
const FACTORY_PRESETS = {
  "Camera - Canon warm portrait": {
    exposure: 0.0,
    tone_map: "ACES Fitted",
    soft_clip: 0.14,
    temperature: 0.14,
    tint: 0.05,
    contrast: 1.08,
    pivot: 0.18,
    highlights: -0.14,
    shadows: 0.08,
    saturation: 1.08,
    vibrance: 0.18,
    hue_shift: 1,
    gain_r: 1.04,
    gain_g: 1.0,
    gain_b: 0.97,
    gamma_r: 1.0,
    gamma_g: 1.0,
    gamma_b: 1.02,
  },
  "Camera - Nikon vivid landscape": {
    exposure: -0.1,
    tone_map: "ACES Fitted",
    soft_clip: 0.08,
    temperature: -0.02,
    tint: 0.02,
    contrast: 1.2,
    pivot: 0.2,
    highlights: -0.08,
    shadows: -0.02,
    saturation: 1.22,
    vibrance: 0.28,
    hue_shift: -1,
    gain_r: 0.99,
    gain_g: 1.03,
    gain_b: 1.02,
  },
  "Camera - Fuji classic chrome": {
    exposure: -0.15,
    tone_map: "AgX",
    soft_clip: 0.18,
    temperature: 0.06,
    tint: -0.03,
    contrast: 1.12,
    pivot: 0.2,
    highlights: -0.28,
    shadows: -0.08,
    saturation: 0.82,
    vibrance: -0.08,
    hue_shift: -4,
    lift_b: 0.015,
    gain_r: 1.03,
    gain_g: 1.0,
    gain_b: 0.96,
  },
  "Camera - Fuji velvia color": {
    exposure: -0.05,
    tone_map: "ACES Fitted",
    soft_clip: 0.1,
    temperature: 0.02,
    tint: 0.03,
    contrast: 1.28,
    pivot: 0.2,
    highlights: -0.06,
    shadows: -0.06,
    saturation: 1.34,
    vibrance: 0.34,
    hue_shift: -2,
    gain_r: 1.02,
    gain_g: 1.04,
    gain_b: 0.98,
  },
  "Camera - Leica crisp color": {
    exposure: -0.05,
    tone_map: "Hable",
    soft_clip: 0.08,
    temperature: 0.05,
    tint: 0.02,
    contrast: 1.18,
    pivot: 0.18,
    highlights: -0.1,
    shadows: -0.1,
    saturation: 1.05,
    vibrance: 0.12,
    hue_shift: 2,
    gain_r: 1.03,
    gain_g: 1.0,
    gain_b: 0.98,
  },
  "Camera - Sony clean neutral": {
    exposure: 0.0,
    tone_map: "ACES Fitted",
    soft_clip: 0.06,
    temperature: -0.04,
    tint: 0.01,
    contrast: 1.04,
    pivot: 0.18,
    highlights: -0.06,
    shadows: 0.02,
    saturation: 1.02,
    vibrance: 0.06,
    hue_shift: 0,
    gain_r: 0.99,
    gain_g: 1.0,
    gain_b: 1.02,
  },
  "Camera - ARRI soft cinema": {
    exposure: -0.2,
    tone_map: "AgX",
    soft_clip: 0.28,
    temperature: 0.08,
    tint: 0.02,
    contrast: 0.92,
    pivot: 0.18,
    highlights: -0.34,
    shadows: 0.12,
    saturation: 0.94,
    vibrance: 0.08,
    hue_shift: 1,
    lift_r: 0.01,
    lift_g: 0.008,
    lift_b: 0.014,
    gain_r: 1.02,
    gain_g: 1.0,
    gain_b: 0.98,
  },
  "Camera - Hasselblad natural": {
    exposure: 0.0,
    tone_map: "Hable",
    soft_clip: 0.12,
    temperature: 0.04,
    tint: -0.01,
    contrast: 1.08,
    pivot: 0.18,
    highlights: -0.12,
    shadows: 0.04,
    saturation: 1.0,
    vibrance: 0.1,
    hue_shift: -1,
    gain_r: 1.02,
    gain_g: 1.01,
    gain_b: 0.99,
  },
  "Camera - Kodak print warm": {
    exposure: -0.1,
    tone_map: "Hable",
    soft_clip: 0.22,
    temperature: 0.16,
    tint: 0.03,
    contrast: 1.16,
    pivot: 0.2,
    highlights: -0.2,
    shadows: -0.04,
    saturation: 1.12,
    vibrance: 0.16,
    hue_shift: 3,
    lift_b: -0.012,
    gain_r: 1.06,
    gain_g: 1.0,
    gain_b: 0.94,
  },
  "Camera - Cine bleach bypass": {
    exposure: -0.25,
    tone_map: "AgX",
    soft_clip: 0.16,
    temperature: -0.02,
    tint: -0.02,
    contrast: 1.35,
    pivot: 0.22,
    highlights: -0.18,
    shadows: -0.18,
    saturation: 0.62,
    vibrance: -0.2,
    hue_shift: -3,
    gain_r: 1.0,
    gain_g: 1.01,
    gain_b: 1.03,
  },
};
const state = {
  modal: null,
  shell: null,
  stage: null,
  canvas: null,
  ctx: null,
  controls: null,
  histogram: null,
  histogramCtx: null,
  status: null,
  sample: null,
  info: null,
  frame: null,
  presetSelect: null,
  presetDeleteButton: null,
  compare: null,
  currentNode: null,
  cacheId: "",
  cacheInfo: null,
  working: {},
  snapshot: {},
  frameIndex: 0,
  view: { x: 0, y: 0, scale: 1, fit: true },
  image: null,
  compareImage: null,
  compareKey: "",
  previewMeta: { width: 0, height: 0, previewWidth: 0, previewHeight: 0, frames: 1 },
  renderTimer: 0,
  renderInFlight: false,
  renderQueued: false,
  queuedHighQuality: false,
  lastRenderStarted: 0,
  sampleTimer: 0,
  serial: 0,
  compareMode: "graded",
  split: 0.5,
  pointer: null,
  drag: null,
  lastUrl: "",
  lastCompareUrl: "",
  activeControl: false,
  refineTimer: 0,
};

function insertStyles() {
  if (document.getElementById("x2hdr-grade-style")) return;
  const style = document.createElement("style");
  style.id = "x2hdr-grade-style";
  style.textContent = `
    .x2hdr-grade-modal{position:fixed;inset:0;z-index:10000;display:none;background:rgba(0,0,0,.76);align-items:center;justify-content:center;color:#ddd;font:12px system-ui,-apple-system,"Segoe UI",sans-serif}
    .x2hdr-grade-shell{width:min(98vw,1680px);height:min(96vh,1040px);display:grid;grid-template-columns:minmax(0,1fr) 390px;grid-template-rows:44px minmax(0,1fr);background:#101214;border:1px solid #333840;border-radius:8px;box-shadow:0 22px 80px rgba(0,0,0,.7);overflow:hidden}
    .x2hdr-grade-toolbar{grid-column:1/3;display:flex;align-items:center;gap:8px;padding:0 10px;background:#191c20;border-bottom:1px solid #2c3138;white-space:nowrap}
    .x2hdr-grade-title{font-size:13px;font-weight:700;color:#f0f0f0;margin-right:8px}
    .x2hdr-grade-stage{position:relative;overflow:hidden;background:#050607;cursor:crosshair}
    .x2hdr-grade-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
    .x2hdr-grade-side{display:grid;grid-template-rows:auto auto auto minmax(0,1fr);border-left:1px solid #2c3138;background:#14171b;min-width:0}
    .x2hdr-grade-readout{display:grid;grid-template-columns:1fr;gap:6px;padding:10px;border-bottom:1px solid #2c3138;background:#111419;color:#aeb7c2;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;line-height:1.35}
    .x2hdr-grade-presets{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:6px;padding:8px 10px;border-bottom:1px solid #2c3138;background:#12161a}
    .x2hdr-grade-presets select{min-width:0;width:100%;box-sizing:border-box;background:#0c0f12;color:#dfe5ea;border:1px solid #39404a;border-radius:4px;padding:4px 5px;font:12px system-ui,-apple-system,"Segoe UI",sans-serif}
    .x2hdr-grade-hist{width:100%;height:96px;background:#070809;border-bottom:1px solid #2c3138}
    .x2hdr-grade-controls{overflow:auto;padding:10px 12px 16px;display:grid;gap:12px;align-content:start}
    .x2hdr-grade-section{display:grid;gap:7px}
    .x2hdr-grade-section-title{color:#e3e6e8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-top:2px}
    .x2hdr-grade-row{display:grid;grid-template-columns:86px minmax(0,1fr) 58px;gap:8px;align-items:center;color:#cbd1d8}
    .x2hdr-grade-row span:first-child{overflow:hidden;text-overflow:ellipsis}
    .x2hdr-grade-row input[type="range"]{width:100%;accent-color:#5fb8a8}
    .x2hdr-grade-row input[type="number"],.x2hdr-grade-row select{width:100%;box-sizing:border-box;background:#0c0f12;color:#dfe5ea;border:1px solid #39404a;border-radius:4px;padding:4px 5px;font:12px ui-monospace,SFMono-Regular,Consolas,monospace}
    .x2hdr-grade-row input[type="checkbox"]{width:16px;height:16px;accent-color:#5fb8a8}
    .x2hdr-grade-value{color:#aeb7c2;text-align:right;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
    .x2hdr-grade-btn{border:1px solid #3d4550;background:#242a31;color:#e0e4e8;border-radius:4px;padding:5px 9px;font:12px system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;line-height:1}
    .x2hdr-grade-btn:hover{background:#2d3540}
    .x2hdr-grade-btn:disabled{opacity:.42;cursor:not-allowed;background:#1d2228}
    .x2hdr-grade-btn.primary{background:#2a625a;border-color:#3f8e81;color:#fff}
    .x2hdr-grade-btn.active{background:#385064;border-color:#4e7896;color:#fff}
    .x2hdr-grade-spacer{flex:1}
    .x2hdr-grade-status{color:#9aa4af;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow:hidden;text-overflow:ellipsis}
  `;
  document.head.append(style);
}

function nodeWidgets(node) {
  const map = new Map();
  for (const widget of node.widgets || []) map.set(widget.name, widget);
  return map;
}

function normalizeParams(params) {
  return { ...DEFAULTS, ...params };
}

function readNodeParams(node) {
  const widgets = nodeWidgets(node);
  const params = {};
  for (const param of PARAMS) {
    const widget = widgets.get(param.name);
    params[param.name] = widget?.value ?? param.default;
  }
  return normalizeParams(params);
}

function writeNodeParams(node, params) {
  const widgets = nodeWidgets(node);
  for (const param of PARAMS) {
    const widget = widgets.get(param.name);
    if (!widget || params[param.name] === undefined) continue;
    widget.value = params[param.name];
    widget.callback?.(widget.value, app.canvas, node, widget);
  }
  node.setDirtyCanvas?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function hideInternalWidgets(node) {
  if (!node.widgets) return;
  for (const widget of node.widgets) {
    if (!PARAM_NAMES.has(widget.name) || widget.x2hdrHidden) continue;
    widget.x2hdrHidden = true;
    widget.x2hdrOrigType = widget.type;
    widget.x2hdrOrigComputeSize = widget.computeSize;
    widget.computeSize = () => [0, -4];
    widget.type = `x2hdr-hidden-${widget.name}`;
  }
  requestAnimationFrame(() => resizeCompactNode(node));
}

function resizeCompactNode(node) {
  const size = node.computeSize?.() || node.size;
  if (!size) return;
  const width = Math.max(node.size?.[0] || 260, size[0] || 260);
  const height = Math.max(92, size[1] || 92);
  node.setSize?.([width, height]);
  node.setDirtyCanvas?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function readPresets() {
  try {
    const data = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || "{}");
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch (_) {
    return {};
  }
}

function writePresets(presets) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

function sanitizePresetParams(params) {
  const clean = {};
  for (const param of PARAMS) clean[param.name] = params[param.name] ?? param.default;
  return clean;
}

function ensureFactoryPresets() {
  const presets = readPresets();
  let changed = false;
  for (const [name, params] of Object.entries(FACTORY_PRESETS)) {
    if (presets[name]) continue;
    presets[name] = {
      factory: true,
      params: sanitizePresetParams(normalizeParams(params)),
      updated_at: "factory",
    };
    changed = true;
  }
  if (changed) writePresets(presets);
  localStorage.setItem(PRESET_SEED_KEY, "1");
}

function updatePresetButtons() {
  if (!state.presetDeleteButton || !state.presetSelect) return;
  const name = state.presetSelect.value || "";
  const preset = name ? readPresets()[name] : null;
  const canDelete = !!preset && preset.factory !== true;
  state.presetDeleteButton.disabled = !canDelete;
  state.presetDeleteButton.title = preset?.factory ? "Built-in presets cannot be deleted" : "";
}

function refreshPresetSelect(selected = "") {
  if (!state.presetSelect) return;
  ensureFactoryPresets();
  const presets = readPresets();
  const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
  state.presetSelect.textContent = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = names.length ? "Select preset" : "No presets";
  state.presetSelect.append(empty);
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = presets[name]?.factory ? `${name} [built-in]` : name;
    state.presetSelect.append(option);
  }
  state.presetSelect.value = names.includes(selected) ? selected : "";
  updatePresetButtons();
}

function savePreset() {
  const current = state.presetSelect?.value || "";
  const name = prompt("Preset name", current || "New preset");
  if (!name) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const presets = readPresets();
  presets[trimmed] = {
    params: sanitizePresetParams(state.working),
    updated_at: new Date().toISOString(),
  };
  writePresets(presets);
  refreshPresetSelect(trimmed);
  setStatus(`preset saved: ${trimmed}`);
}

function loadPreset() {
  const name = state.presetSelect?.value || "";
  if (!name) return;
  const preset = readPresets()[name];
  if (!preset?.params) return;
  state.working = normalizeParams(preset.params);
  buildControls();
  schedulePreview(0, true);
  setStatus(`preset loaded: ${name}`);
}

function deletePreset() {
  const name = state.presetSelect?.value || "";
  if (!name) return;
  const presets = readPresets();
  if (presets[name]?.factory) {
    setStatus("built-in presets cannot be deleted");
    updatePresetButtons();
    return;
  }
  if (!confirm(`Delete preset "${name}"?`)) return;
  delete presets[name];
  writePresets(presets);
  refreshPresetSelect();
  setStatus(`preset deleted: ${name}`);
}

function neutralParams(params) {
  return { ...DEFAULTS, tone_map: params.tone_map ?? DEFAULTS.tone_map, false_color: false };
}

function button(label, onClick, className = "") {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `x2hdr-grade-btn ${className}`.trim();
  el.textContent = label;
  el.onclick = onClick;
  return el;
}

function setStatus(text) {
  if (state.status) state.status.textContent = text;
}

function buildModal() {
  insertStyles();
  const modal = document.createElement("div");
  modal.className = "x2hdr-grade-modal";

  const shell = document.createElement("div");
  shell.className = "x2hdr-grade-shell";

  const toolbar = document.createElement("div");
  toolbar.className = "x2hdr-grade-toolbar";

  const title = document.createElement("div");
  title.className = "x2hdr-grade-title";
  title.textContent = "X2HDR Color Grade";

  state.frame = document.createElement("span");
  state.frame.className = "x2hdr-grade-status";

  const modeGroup = document.createElement("span");
  modeGroup.style.cssText = "display:flex;gap:4px";
  const gradedBtn = button("Grade", () => setCompareMode("graded"), "active");
  const sourceBtn = button("Source", () => setCompareMode("source"));
  const splitBtn = button("Split", () => setCompareMode("split"));
  state.compare = { gradedBtn, sourceBtn, splitBtn };
  modeGroup.append(gradedBtn, sourceBtn, splitBtn);

  const splitSlider = document.createElement("input");
  splitSlider.type = "range";
  splitSlider.min = "0.05";
  splitSlider.max = "0.95";
  splitSlider.step = "0.01";
  splitSlider.value = String(state.split);
  splitSlider.title = "Split position";
  splitSlider.style.cssText = "width:100px;accent-color:#5fb8a8";
  splitSlider.oninput = () => {
    state.split = Number(splitSlider.value);
    drawCanvas();
  };
  state.splitSlider = splitSlider;

  state.status = document.createElement("span");
  state.status.className = "x2hdr-grade-status";

  toolbar.append(
    title,
    button("Prev", () => setFrame(state.frameIndex - 1)),
    state.frame,
    button("Next", () => setFrame(state.frameIndex + 1)),
    button("Fit", () => fitImage(true)),
    button("1:1", () => setZoom(1)),
    button("-", () => zoomBy(0.8)),
    button("+", () => zoomBy(1.25)),
    modeGroup,
    splitSlider,
    spanSpacer(),
    state.status,
    button("Reset", resetControls),
    button("Cancel", closeModal),
    button("Save", saveAndClose, "primary"),
  );

  state.stage = document.createElement("div");
  state.stage.className = "x2hdr-grade-stage";
  state.canvas = document.createElement("canvas");
  state.canvas.className = "x2hdr-grade-canvas";
  state.ctx = state.canvas.getContext("2d", { alpha: false });
  state.stage.append(state.canvas);

  const side = document.createElement("div");
  side.className = "x2hdr-grade-side";

  const readout = document.createElement("div");
  readout.className = "x2hdr-grade-readout";
  state.info = document.createElement("div");
  state.sample = document.createElement("div");
  state.info.textContent = "No HDR source";
  state.sample.textContent = "Move over image to sample";
  readout.append(state.info, state.sample);

  const presets = document.createElement("div");
  presets.className = "x2hdr-grade-presets";
  state.presetSelect = document.createElement("select");
  state.presetSelect.onchange = () => {
    updatePresetButtons();
    loadPreset();
  };
  state.presetDeleteButton = button("Delete", deletePreset);
  presets.append(
    state.presetSelect,
    button("Load", loadPreset),
    button("Save", savePreset),
    state.presetDeleteButton,
  );

  state.histogram = document.createElement("canvas");
  state.histogram.className = "x2hdr-grade-hist";
  state.histogramCtx = state.histogram.getContext("2d");

  state.controls = document.createElement("div");
  state.controls.className = "x2hdr-grade-controls";

  side.append(readout, presets, state.histogram, state.controls);
  shell.append(toolbar, state.stage, side);
  modal.append(shell);
  document.body.append(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", () => {
    if (modal.style.display === "flex") {
      resizeCanvas();
      if (state.view.fit) fitImage(false);
      drawCanvas();
    }
  });

  state.stage.addEventListener("wheel", handleWheel, { passive: false });
  state.stage.addEventListener("pointerdown", handlePointerDown);
  state.stage.addEventListener("pointermove", handlePointerMove);
  state.stage.addEventListener("pointerup", handlePointerUp);
  state.stage.addEventListener("pointerleave", () => {
    state.pointer = null;
    drawCanvas();
  });
  state.stage.addEventListener("dblclick", () => fitImage(true));

  state.modal = modal;
  state.shell = shell;
}

function spanSpacer() {
  const spacer = document.createElement("span");
  spacer.className = "x2hdr-grade-spacer";
  return spacer;
}

function buildControls() {
  state.controls.textContent = "";
  const sections = new Map();
  for (const param of PARAMS) {
    if (!sections.has(param.section)) sections.set(param.section, []);
    sections.get(param.section).push(param);
  }

  for (const [section, params] of sections) {
    const group = document.createElement("div");
    group.className = "x2hdr-grade-section";
    const heading = document.createElement("div");
    heading.className = "x2hdr-grade-section-title";
    heading.textContent = section;
    group.append(heading);
    for (const param of params) group.append(buildControlRow(param));
    state.controls.append(group);
  }
}

function buildControlRow(param) {
  const row = document.createElement("label");
  row.className = "x2hdr-grade-row";
  row.title = "Double click to reset";
  row.ondblclick = (event) => {
    event.preventDefault();
    state.working[param.name] = param.default;
    buildControls();
    schedulePreview(0, true);
  };

  const label = document.createElement("span");
  label.textContent = param.label;

  let input;
  let readout = document.createElement("span");
  readout.className = "x2hdr-grade-value";

  if (param.type === "select") {
    input = document.createElement("select");
    for (const option of param.values) {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      input.append(opt);
    }
    input.value = state.working[param.name] ?? param.default;
    readout.textContent = "";
  } else if (param.type === "checkbox") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!state.working[param.name];
    readout.textContent = input.checked ? "on" : "off";
  } else {
    input = document.createElement("input");
    input.type = "range";
    input.min = String(param.min);
    input.max = String(param.max);
    input.step = String(param.step);
    input.value = String(state.working[param.name] ?? param.default);

    const number = document.createElement("input");
    number.type = "number";
    number.min = String(param.min);
    number.max = String(param.max);
    number.step = String(param.step);
    number.value = formatValue(input.value, param.step);
    number.onchange = () => {
      const next = clamp(Number(number.value), param.min, param.max);
      state.working[param.name] = next;
      input.value = String(next);
      number.value = formatValue(next, param.step);
      schedulePreview(0, true);
    };
    readout = number;
  }

  input.oninput = () => {
    if (param.type === "checkbox") {
      state.working[param.name] = input.checked;
      readout.textContent = input.checked ? "on" : "off";
    } else if (param.type === "select") {
      state.working[param.name] = input.value;
    } else {
      state.working[param.name] = Number(input.value);
      readout.value = formatValue(input.value, param.step);
    }
    schedulePreview(0, false);
  };

  input.onpointerdown = () => {
    state.activeControl = true;
  };
  input.onpointerup = () => finishInteractiveControl();
  input.onpointercancel = () => finishInteractiveControl();
  input.onkeyup = (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
      scheduleRefinePreview();
    }
  };
  input.onchange = () => finishInteractiveControl();

  row.append(label, input, readout);
  return row;
}

function formatValue(value, step) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (step < 0.01) return n.toFixed(3);
  if (step < 1) return n.toFixed(2);
  return n.toFixed(0);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

async function openModal(node) {
  if (!state.modal) buildModal();
  state.currentNode = node;
  state.snapshot = readNodeParams(node);
  state.working = { ...state.snapshot };
  state.frameIndex = 0;
  state.view = { x: 0, y: 0, scale: 1, fit: true };
  state.image = null;
  state.compareImage = null;
  state.pointer = null;
  state.cacheInfo = node.x2hdrViewer || null;
  state.cacheId = String(state.cacheInfo?.cache_id || state.cacheInfo?.node_id || node.id);
  state.modal.style.display = "flex";
  refreshPresetSelect();
  buildControls();
  resizeCanvas();
  setCompareMode(state.compareMode, false);
  setStatus("loading source...");
  updateReadout();

  await refreshInfo();
  schedulePreview(0);
}

function closeModal() {
  if (!state.modal) return;
  state.modal.style.display = "none";
  revokeImages();
  state.currentNode = null;
  clearTimeout(state.renderTimer);
  clearTimeout(state.sampleTimer);
  state.renderInFlight = false;
  state.renderQueued = false;
}

function saveAndClose() {
  if (state.currentNode) writeNodeParams(state.currentNode, state.working);
  closeModal();
}

function resetControls() {
  state.working = { ...state.snapshot };
  buildControls();
  schedulePreview(0, true);
}

function setFrame(index) {
  const frames = Math.max(1, Number(state.cacheInfo?.frames || state.previewMeta.frames || 1));
  state.frameIndex = clamp(index, 0, frames - 1);
  schedulePreview(0);
}

function setCompareMode(mode, render = true) {
  state.compareMode = mode;
  state.compare.gradedBtn.classList.toggle("active", mode === "graded");
  state.compare.sourceBtn.classList.toggle("active", mode === "source");
  state.compare.splitBtn.classList.toggle("active", mode === "split");
  state.splitSlider.style.display = mode === "split" ? "" : "none";
  if (render) schedulePreview(0);
  else drawHistogram();
}

function finishInteractiveControl() {
  if (!state.activeControl) return;
  state.activeControl = false;
  scheduleRefinePreview();
}

function scheduleRefinePreview() {
  clearTimeout(state.refineTimer);
  state.refineTimer = setTimeout(() => schedulePreview(0, true), 140);
}

function previewMaxSize(highQuality = false) {
  const rect = state.stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const longest = Math.max(rect.width, rect.height);
  const interactiveScale = state.activeControl ? 0.62 : 0.82;
  const scale = highQuality ? 1.0 : interactiveScale;
  return Math.max(384, Math.min(highQuality ? 2048 : 1280, Math.ceil(longest * dpr * scale)));
}

async function refreshInfo() {
  if (!state.cacheId) return;
  try {
    const response = await fetch("/x2hdr/grade/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cache_id: state.cacheId, node_id: String(state.currentNode?.id || "") }),
    });
    if (!response.ok) throw new Error(await responseText(response));
    const info = await response.json();
    state.cacheInfo = info;
    if (state.currentNode) state.currentNode.x2hdrViewer = info;
    updateReadout();
  } catch (error) {
    setStatus(error.message || "source missing");
    updateReadout(error.message || "Run the node once");
  }
}

function schedulePreview(delay = 0, highQuality = false) {
  clearTimeout(state.renderTimer);
  if (highQuality) clearTimeout(state.refineTimer);
  if (state.renderInFlight) {
    state.renderQueued = true;
    state.queuedHighQuality = !!state.queuedHighQuality || highQuality;
    return;
  }

  const elapsed = performance.now() - state.lastRenderStarted;
  const wait = delay > 0 ? delay : Math.max(0, PREVIEW_THROTTLE_MS - elapsed);
  state.renderTimer = setTimeout(() => renderPreview(highQuality), wait);
}

async function renderPreview(highQuality = false) {
  if (!state.currentNode || !state.cacheId) return;
  state.renderInFlight = true;
  state.renderQueued = false;
  state.queuedHighQuality = false;
  state.lastRenderStarted = performance.now();
  const serial = ++state.serial;
  setStatus(highQuality ? "rendering high..." : "rendering...");
  updateReadout();

  try {
    const maxSize = previewMaxSize(highQuality);
    const image = await requestPreview(state.working, false, maxSize);
    let compareImage = state.compareImage;
    const compareKey = `${state.cacheId}:${state.frameIndex}:${maxSize}:${state.working.tone_map || ""}`;
    if (state.compareMode !== "graded") {
      if (!state.compareImage || state.compareKey !== compareKey) {
        compareImage = await requestPreview(neutralParams(state.working), true, maxSize);
      }
    } else {
      state.compareKey = "";
    }
    if (serial !== state.serial) {
      image.close?.();
      if (compareImage !== state.compareImage) compareImage.close?.();
      return;
    }

    state.image?.close?.();
    if (state.compareImage && compareImage !== state.compareImage) state.compareImage.close?.();
    state.image = image;
    state.compareImage = compareImage;
    if (state.compareMode !== "graded") state.compareKey = compareKey;
    if (state.view.fit) fitImage(false);
    drawCanvas();
    drawHistogram();
    updateReadout();
    setStatus("live");
  } catch (error) {
    if (serial !== state.serial) return;
    setStatus(error.message || "preview failed");
    drawCanvas();
  } finally {
    state.renderInFlight = false;
    if (state.renderQueued && state.currentNode) {
      const queuedHighQuality = state.queuedHighQuality;
      state.queuedHighQuality = false;
      schedulePreview(0, queuedHighQuality);
    } else if (!highQuality && !state.activeControl && state.currentNode) {
      scheduleRefinePreview();
    }
  }
}

async function requestPreview(params, compare = false, maxSize = previewMaxSize(false)) {
  const response = await fetch("/x2hdr/grade/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cache_id: state.cacheId,
      node_id: String(state.currentNode?.id || ""),
      frame: state.frameIndex,
      max_size: maxSize,
      params,
    }),
  });
  if (!response.ok) throw new Error(await responseText(response));

  const width = Number(response.headers.get("X-X2HDR-Width") || 0);
  const height = Number(response.headers.get("X-X2HDR-Height") || 0);
  const previewWidth = Number(response.headers.get("X-X2HDR-Preview-Width") || 0);
  const previewHeight = Number(response.headers.get("X-X2HDR-Preview-Height") || 0);
  const frames = Number(response.headers.get("X-X2HDR-Frames") || 1);
  if (!compare) {
    state.previewMeta = { width, height, previewWidth, previewHeight, frames };
    if (state.cacheInfo) {
      state.cacheInfo.width = width || state.cacheInfo.width;
      state.cacheInfo.height = height || state.cacheInfo.height;
      state.cacheInfo.frames = frames || state.cacheInfo.frames;
    }
  }

  const blob = await response.blob();
  return await blobToDrawable(blob, compare);
}

async function blobToDrawable(blob, compare) {
  if (window.createImageBitmap) return await createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  if (compare) {
    if (state.lastCompareUrl) URL.revokeObjectURL(state.lastCompareUrl);
    state.lastCompareUrl = url;
  } else {
    if (state.lastUrl) URL.revokeObjectURL(state.lastUrl);
    state.lastUrl = url;
  }
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

async function responseText(response) {
  try {
    const data = await response.json();
    return data.error || `HTTP ${response.status}`;
  } catch (_) {
    return `HTTP ${response.status}`;
  }
}

function resizeCanvas() {
  const rect = state.stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (state.canvas.width !== width || state.canvas.height !== height) {
    state.canvas.width = width;
    state.canvas.height = height;
  }
}

function fitImage(force) {
  if (!state.image) return;
  resizeCanvas();
  const pad = 28 * (window.devicePixelRatio || 1);
  const scale = Math.min(
    (state.canvas.width - pad * 2) / state.image.width,
    (state.canvas.height - pad * 2) / state.image.height,
  );
  state.view.scale = Math.max(0.01, Math.min(32, scale));
  state.view.x = (state.canvas.width - state.image.width * state.view.scale) / 2;
  state.view.y = (state.canvas.height - state.image.height * state.view.scale) / 2;
  state.view.fit = true;
  if (force) drawCanvas();
}

function setZoom(scale) {
  if (!state.image) return;
  const old = state.view.scale;
  const next = clamp(scale, 0.02, 32);
  const cx = state.canvas.width / 2;
  const cy = state.canvas.height / 2;
  state.view.x = cx - ((cx - state.view.x) * next) / old;
  state.view.y = cy - ((cy - state.view.y) * next) / old;
  state.view.scale = next;
  state.view.fit = false;
  drawCanvas();
}

function zoomBy(multiplier, px = state.canvas.width / 2, py = state.canvas.height / 2) {
  if (!state.image) return;
  const old = state.view.scale;
  const next = clamp(old * multiplier, 0.02, 32);
  state.view.x = px - ((px - state.view.x) * next) / old;
  state.view.y = py - ((py - state.view.y) * next) / old;
  state.view.scale = next;
  state.view.fit = false;
  drawCanvas();
}

function drawCanvas() {
  resizeCanvas();
  const ctx = state.ctx;
  const w = state.canvas.width;
  const h = state.canvas.height;
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, w, h);

  if (!state.image) {
    ctx.fillStyle = "#8f98a3";
    ctx.font = `${13 * (window.devicePixelRatio || 1)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Run X2HDR Color Grade, then open the viewer.", w / 2, h / 2);
    return;
  }

  const dw = state.image.width * state.view.scale;
  const dh = state.image.height * state.view.scale;
  const dx = state.view.x;
  const dy = state.view.y;
  const source = state.compareMode === "source" ? state.compareImage || state.image : state.image;
  ctx.imageSmoothingEnabled = state.view.scale < 1;

  if (state.compareMode === "split" && state.compareImage) {
    const splitX = Math.round(w * state.split);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, splitX, h);
    ctx.clip();
    ctx.drawImage(state.compareImage, dx, dy, dw, dh);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(splitX, 0, w - splitX, h);
    ctx.clip();
    ctx.drawImage(state.image, dx, dy, dw, dh);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1);
    ctx.beginPath();
    ctx.moveTo(splitX, 0);
    ctx.lineTo(splitX, h);
    ctx.stroke();
  } else {
    ctx.drawImage(source, dx, dy, dw, dh);
  }

  drawOverlay(ctx, w, h, dx, dy, dw, dh);
}

function drawOverlay(ctx, w, h, dx, dy, dw, dh) {
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1);
  ctx.strokeRect(dx, dy, dw, dh);

  if (!state.pointer) return;
  const p = canvasToImage(state.pointer.x, state.pointer.y);
  if (!p) return;
  const x = state.view.x + p.previewX * state.view.scale;
  const y = state.view.y + p.previewY * state.view.scale;
  ctx.strokeStyle = "rgba(95,184,168,.9)";
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x + 8, y);
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y + 8);
  ctx.stroke();
}

function drawHistogram() {
  const canvas = state.histogram;
  const ctx = state.histogramCtx;
  const drawable = state.compareMode === "source" && state.compareImage ? state.compareImage : state.image;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.fillStyle = "#070809";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!drawable) return;

  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 256;
  sampleCanvas.height = Math.max(1, Math.round((drawable.height / drawable.width) * 256));
  const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
  sampleCtx.drawImage(drawable, 0, 0, sampleCanvas.width, sampleCanvas.height);
  const pixels = sampleCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
  const bins = [new Array(64).fill(0), new Array(64).fill(0), new Array(64).fill(0), new Array(64).fill(0)];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    bins[0][Math.min(63, Math.floor(r / 4))]++;
    bins[1][Math.min(63, Math.floor(g / 4))]++;
    bins[2][Math.min(63, Math.floor(b / 4))]++;
    bins[3][Math.min(63, Math.floor((0.2126 * r + 0.7152 * g + 0.0722 * b) / 4))]++;
  }
  const maxBin = Math.max(...bins.flat(), 1);
  drawBins(ctx, bins[3], maxBin, "rgba(255,255,255,.35)", canvas.width, canvas.height);
  drawBins(ctx, bins[0], maxBin, "rgba(255,80,80,.55)", canvas.width, canvas.height);
  drawBins(ctx, bins[1], maxBin, "rgba(80,255,150,.45)", canvas.width, canvas.height);
  drawBins(ctx, bins[2], maxBin, "rgba(90,150,255,.5)", canvas.width, canvas.height);
}

function drawBins(ctx, bins, maxBin, color, width, height) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, window.devicePixelRatio || 1);
  ctx.beginPath();
  for (let i = 0; i < bins.length; i++) {
    const x = (i / (bins.length - 1)) * width;
    const y = height - (bins[i] / maxBin) * (height - 8) - 4;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function updateReadout(error = "") {
  const info = state.cacheInfo || state.previewMeta;
  const frames = Math.max(1, Number(info.frames || 1));
  state.frameIndex = clamp(state.frameIndex, 0, frames - 1);
  if (state.frame) state.frame.textContent = `${state.frameIndex + 1}/${frames}`;
  const width = Number(info.width || state.previewMeta.width || 0);
  const height = Number(info.height || state.previewMeta.height || 0);
  const preview = state.previewMeta.previewWidth
    ? `preview ${state.previewMeta.previewWidth}x${state.previewMeta.previewHeight}`
    : "preview pending";
  state.info.textContent = error || `${width || "?"}x${height || "?"} HDR | ${preview} | zoom ${Math.round(state.view.scale * 100)}%`;
}

function handleWheel(event) {
  event.preventDefault();
  const p = eventToCanvas(event);
  zoomBy(Math.exp(-event.deltaY * 0.001), p.x, p.y);
}

function handlePointerDown(event) {
  if (!state.image) return;
  state.stage.setPointerCapture(event.pointerId);
  const p = eventToCanvas(event);
  state.drag = { id: event.pointerId, startX: p.x, startY: p.y, x: state.view.x, y: state.view.y, moved: false };
}

function handlePointerMove(event) {
  const p = eventToCanvas(event);
  state.pointer = p;
  if (state.drag?.id === event.pointerId) {
    const dx = p.x - state.drag.startX;
    const dy = p.y - state.drag.startY;
    state.drag.moved ||= Math.abs(dx) + Math.abs(dy) > 4;
    state.view.x = state.drag.x + dx;
    state.view.y = state.drag.y + dy;
    state.view.fit = false;
  }
  drawCanvas();
  scheduleSample();
}

function handlePointerUp(event) {
  if (state.drag?.id === event.pointerId && !state.drag.moved) scheduleSample(0);
  state.drag = null;
}

function handleKeyDown(event) {
  if (!state.modal || state.modal.style.display !== "flex") return;
  if (event.target?.tagName === "INPUT" || event.target?.tagName === "SELECT") return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") setFrame(state.frameIndex - 1);
  if (event.key === "ArrowRight") setFrame(state.frameIndex + 1);
  if (event.key === "f") fitImage(true);
  if (event.key === "1") setZoom(1);
  if (event.key === "b") setCompareMode(state.compareMode === "graded" ? "split" : "graded");
}

function eventToCanvas(event) {
  const rect = state.canvas.getBoundingClientRect();
  const sx = state.canvas.width / rect.width;
  const sy = state.canvas.height / rect.height;
  return { x: (event.clientX - rect.left) * sx, y: (event.clientY - rect.top) * sy };
}

function canvasToImage(x, y) {
  if (!state.image || !state.previewMeta.width || !state.previewMeta.height) return null;
  const previewX = (x - state.view.x) / state.view.scale;
  const previewY = (y - state.view.y) / state.view.scale;
  if (previewX < 0 || previewY < 0 || previewX >= state.image.width || previewY >= state.image.height) return null;
  return {
    previewX,
    previewY,
    x: Math.floor((previewX / state.image.width) * state.previewMeta.width),
    y: Math.floor((previewY / state.image.height) * state.previewMeta.height),
  };
}

function scheduleSample(delay = 140) {
  clearTimeout(state.sampleTimer);
  state.sampleTimer = setTimeout(requestSample, delay);
}

async function requestSample() {
  if (!state.pointer || !state.cacheId) return;
  const p = canvasToImage(state.pointer.x, state.pointer.y);
  if (!p) {
    state.sample.textContent = "Outside image";
    return;
  }
  state.sample.textContent = `x ${p.x}, y ${p.y} | sampling...`;
  try {
    const response = await fetch("/x2hdr/grade/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cache_id: state.cacheId,
        node_id: String(state.currentNode?.id || ""),
        frame: state.frameIndex,
        x: p.x,
        y: p.y,
        params: state.working,
      }),
    });
    if (!response.ok) throw new Error(await responseText(response));
    const data = await response.json();
    state.sample.textContent = `x ${data.x}, y ${data.y} | HDR ${fmtRgb(data.hdr_rgb)} | display ${fmtRgb(data.display_rgb)} | Y ${fmt(data.luma)}`;
  } catch (error) {
    state.sample.textContent = error.message || "sample failed";
  }
}

function fmtRgb(values) {
  return values.map(fmt).join(", ");
}

function fmt(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

function revokeImages() {
  state.image?.close?.();
  state.compareImage?.close?.();
  state.image = null;
  state.compareImage = null;
  if (state.lastUrl) URL.revokeObjectURL(state.lastUrl);
  if (state.lastCompareUrl) URL.revokeObjectURL(state.lastCompareUrl);
  state.lastUrl = "";
  state.lastCompareUrl = "";
}

app.registerExtension({
  name: "x2hdr.color_grade_viewer",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== "X2HDRColorGrade") return;

    const originalOnNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      originalOnNodeCreated?.apply(this, arguments);
      if (!(this.widgets || []).some((widget) => widget.name === "Open X2HDR color grade")) {
        const viewer = this.addWidget("button", "Open X2HDR color grade", null, () => openModal(this));
        viewer.serialize = false;
      }
      hideInternalWidgets(this);
    };

    const originalOnConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function () {
      originalOnConfigure?.apply(this, arguments);
      hideInternalWidgets(this);
    };

    const originalOnExecuted = nodeType.prototype.onExecuted;
    nodeType.prototype.onExecuted = function (message) {
      originalOnExecuted?.apply(this, arguments);
      const viewer = message?.x2hdr_viewer?.[0];
      if (viewer) {
        this.x2hdrViewer = viewer;
        this.x2hdrViewer.cache_id = String(viewer.cache_id || viewer.node_id || this.id);
      }
      hideInternalWidgets(this);
    };
  },
});
