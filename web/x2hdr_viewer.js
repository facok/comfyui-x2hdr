import { app } from "/scripts/app.js";

const TONE_MAPS = ["None", "Reinhard", "ACES Fitted", "AgX", "Hable"];
const I18N = {
  zh: {
    "Exposure": "曝光",
    "Exposure Bias": "曝光补偿",
    "Auto Exposure": "自动曝光",
    "Input Exposure": "输入曝光",
    "Auto EV": "自动 EV",
    "Bias EV": "补偿 EV",
    "Final EV": "最终 EV",
    "Lock": "锁定",
    "Unlock": "解锁",
    "Reset Exposure": "重置曝光",
    "Tone Map": "色调映射",
    "Soft Clip": "柔和裁切",
    "Contrast": "对比度",
    "Pivot": "中灰点",
    "Temperature": "色温",
    "Tint": "色调",
    "Saturation": "饱和度",
    "Vibrance": "自然饱和度",
    "Hue Shift": "色相偏移",
    "Density": "密度",
    "Black Lift": "黑位提升",
    "Tone Bal": "影调平衡",
    "Shadow R": "阴影 R",
    "Shadow G": "阴影 G",
    "Shadow B": "阴影 B",
    "High R": "高光 R",
    "High G": "高光 G",
    "High B": "高光 B",
    "Lift R": "提升 R",
    "Lift G": "提升 G",
    "Lift B": "提升 B",
    "Gamma R": "伽马 R",
    "Gamma G": "伽马 G",
    "Gamma B": "伽马 B",
    "Gain R": "增益 R",
    "Gain G": "增益 G",
    "Gain B": "增益 B",
    "Offset R": "偏移 R",
    "Offset G": "偏移 G",
    "Offset B": "偏移 B",
    "Shadows": "阴影",
    "Highlights": "高光",
    "False Color": "伪色",
    "Primary": "基础",
    "Balance": "色彩平衡",
    "Look": "风格",
    "Split Tone": "分离色调",
    "Color Matrix": "颜色矩阵",
    "Lift": "提升",
    "Gamma": "伽马",
    "Gain": "增益",
    "Offset": "偏移",
    "Range": "范围",
    "Open X2HDR color grade": "打开 X2HDR 调色",
    "X2HDR Color Grade": "X2HDR 调色",
    "Grade": "调色",
    "Source": "源图",
    "Split": "分割",
    "Prev": "上一帧",
    "Next": "下一帧",
    "Fit": "适应",
    "Reset": "重置",
    "Cancel": "取消",
    "Save": "保存",
    "Save PNG": "保存 PNG",
    "Save EXR": "保存 EXR",
    "Export": "导出",
    "Output Folder": "输出文件夹",
    "Filename Prefix": "文件名前缀",
    "Load": "加载",
    "Delete": "删除",
    "Select preset": "选择预设",
    "No presets": "无预设",
    "built-in": "内置",
    "Built-in presets cannot be deleted": "内置预设不能删除",
    "Preset name": "预设名称",
    "New preset": "新预设",
    "preset saved: {name}": "已保存预设：{name}",
    "preset loaded: {name}": "已加载预设：{name}",
    "preset deleted: {name}": "已删除预设：{name}",
    "Delete preset \"{name}\"?": "删除预设 “{name}”？",
    "No HDR source": "无 HDR 源",
    "Move over image to sample": "将指针移到图像上取样",
    "Double click to reset": "双击重置",
    "Split position": "分割位置",
    "loading source...": "正在加载源...",
    "source missing": "源缺失",
    "Run the node once": "先运行节点一次",
    "rendering high...": "高质量渲染...",
    "rendering...": "正在渲染...",
    "live": "实时",
    "preview failed": "预览失败",
    "Run X2HDR Color Grade, then open the viewer.": "先运行 X2HDR Color Grade，再打开查看器。",
    "preview {width}x{height}": "预览 {width}x{height}",
    "preview pending": "预览待生成",
    "zoom {pct}%": "缩放 {pct}%",
    "Outside image": "图像外",
    "sampling...": "取样中...",
    "sample failed": "取样失败",
    "saving {format}...": "正在保存 {format}...",
    "saved {format}: {path}": "已保存 {format}：{path}",
    "save failed": "保存失败",
    "display": "显示",
    "on": "开",
    "off": "关",
    "preset.Camera - Canon warm portrait": "相机 - Canon 暖调人像",
    "preset.Camera - Nikon vivid landscape": "相机 - Nikon 鲜艳风景",
    "preset.Camera - Fuji classic chrome": "相机 - Fuji Classic Chrome",
    "preset.Camera - Fuji velvia color": "相机 - Fuji Velvia 色彩",
    "preset.Camera - Leica crisp color": "相机 - Leica 清晰色彩",
    "preset.Camera - Sony clean neutral": "相机 - Sony 干净中性",
    "preset.Camera - ARRI soft cinema": "相机 - ARRI 柔和电影",
    "preset.Camera - Hasselblad natural": "相机 - Hasselblad 自然",
    "preset.Camera - Kodak print warm": "相机 - Kodak 暖调印相",
    "preset.Camera - Cine bleach bypass": "相机 - 电影漂白旁路",
  },
};

function detectLanguage() {
  const languages = globalThis.navigator?.languages || [globalThis.navigator?.language || ""];
  return languages.some((language) => String(language).toLowerCase().startsWith("zh")) ? "zh" : "en";
}

const UI_LANGUAGE = detectLanguage();

function tr(key, values = {}) {
  const template = I18N[UI_LANGUAGE]?.[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function trPresetName(name) {
  return tr(`preset.${name}`);
}

const PARAMS = [
  { name: "exposure", label: "Exposure", section: "Primary", type: "range", min: -10, max: 10, step: 0.1, default: 0 },
  { name: "auto_exposure", label: "Auto Exposure", section: "Primary", type: "checkbox", default: false },
  { name: "auto_exposure_lock", label: "Lock", section: "Primary", type: "checkbox", default: false },
  { name: "auto_exposure_ev", label: "Auto EV", section: "Primary", type: "range", min: -10, max: 10, step: 0.01, default: 0 },
  { name: "tone_map", label: "Tone Map", section: "Primary", type: "select", values: TONE_MAPS, default: "ACES Fitted" },
  { name: "soft_clip", label: "Soft Clip", section: "Primary", type: "range", min: 0, max: 1, step: 0.01, default: 0 },
  { name: "contrast", label: "Contrast", section: "Primary", type: "range", min: 0, max: 4, step: 0.01, default: 1 },
  { name: "pivot", label: "Pivot", section: "Primary", type: "range", min: 0.001, max: 4, step: 0.001, default: 0.18 },
  { name: "temperature", label: "Temperature", section: "Balance", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "tint", label: "Tint", section: "Balance", type: "range", min: -1, max: 1, step: 0.01, default: 0 },
  { name: "saturation", label: "Saturation", section: "Balance", type: "range", min: 0, max: 3, step: 0.01, default: 1 },
  { name: "vibrance", label: "Vibrance", section: "Balance", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "hue_shift", label: "Hue Shift", section: "Balance", type: "range", min: -180, max: 180, step: 1, default: 0 },
  { name: "density", label: "Density", section: "Look", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "black_lift", label: "Black Lift", section: "Look", type: "range", min: -0.25, max: 0.25, step: 0.001, default: 0 },
  { name: "tone_balance", label: "Tone Bal", section: "Look", type: "range", min: 0, max: 1, step: 0.01, default: 0.5 },
  { name: "shadow_tone_r", label: "Shadow R", section: "Split Tone", type: "range", min: -0.25, max: 0.25, step: 0.001, default: 0 },
  { name: "shadow_tone_g", label: "Shadow G", section: "Split Tone", type: "range", min: -0.25, max: 0.25, step: 0.001, default: 0 },
  { name: "shadow_tone_b", label: "Shadow B", section: "Split Tone", type: "range", min: -0.25, max: 0.25, step: 0.001, default: 0 },
  { name: "highlight_tone_r", label: "High R", section: "Split Tone", type: "range", min: -0.25, max: 0.25, step: 0.001, default: 0 },
  { name: "highlight_tone_g", label: "High G", section: "Split Tone", type: "range", min: -0.25, max: 0.25, step: 0.001, default: 0 },
  { name: "highlight_tone_b", label: "High B", section: "Split Tone", type: "range", min: -0.25, max: 0.25, step: 0.001, default: 0 },
  { name: "matrix_rr", label: "R<-R", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 1 },
  { name: "matrix_rg", label: "R<-G", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "matrix_rb", label: "R<-B", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "matrix_gr", label: "G<-R", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "matrix_gg", label: "G<-G", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 1 },
  { name: "matrix_gb", label: "G<-B", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "matrix_br", label: "B<-R", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "matrix_bg", label: "B<-G", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 0 },
  { name: "matrix_bb", label: "B<-B", section: "Color Matrix", type: "range", min: -2, max: 2, step: 0.01, default: 1 },
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
const PARAM_BY_NAME = new Map(PARAMS.map((p) => [p.name, p]));
const PARAM_NAMES = new Set(PARAMS.map((p) => p.name));
const EXPOSURE_PARAM_NAMES = new Set(["auto_exposure", "auto_exposure_lock", "auto_exposure_ev", "exposure"]);
const NON_PRESET_PARAM_NAMES = new Set(["auto_exposure", "auto_exposure_lock", "auto_exposure_ev", "exposure", "false_color"]);
const PRESET_PARAM_NAMES = PARAMS.map((p) => p.name).filter((name) => !NON_PRESET_PARAM_NAMES.has(name));
const PRESET_PARAM_NAME_SET = new Set(PRESET_PARAM_NAMES);
const PREVIEW_THROTTLE_MS = 96;
const PRESET_STORAGE_KEY = "x2hdr.colorGradePresets.v1";
const NODE_STATE_KEY = "x2hdr_color_grade_state";
const NODE_STATE_VERSION = 1;
const EXPORT_SETTINGS_STORAGE_KEY = "x2hdr.colorGradeExport.v1";
const FACTORY_PRESET_VERSION = 11;
const FACTORY_PRESETS = {
  "Camera - Canon warm portrait": {
    tone_map: "Hable",
    soft_clip: 0.22,
    temperature: 0.16,
    tint: 0.035,
    contrast: 1.04,
    pivot: 0.2,
    highlights: -0.45,
    shadows: 0.02,
    saturation: 1.04,
    vibrance: 0.14,
    density: 0.06,
    black_lift: 0.0,
    shadow_tone_r: 0.008,
    shadow_tone_g: 0.002,
    shadow_tone_b: -0.012,
    highlight_tone_r: 0.022,
    highlight_tone_g: 0.01,
    highlight_tone_b: -0.014,
    tone_balance: 0.45,
    matrix_rr: 1.035,
    matrix_rg: -0.015,
    matrix_rb: -0.005,
    matrix_gr: 0.006,
    matrix_gg: 1.005,
    matrix_gb: -0.006,
    matrix_br: -0.01,
    matrix_bg: -0.012,
    matrix_bb: 1.03,
  },
  "Camera - Nikon vivid landscape": {
    tone_map: "ACES Fitted",
    soft_clip: 0.16,
    temperature: -0.05,
    tint: 0.01,
    contrast: 1.14,
    pivot: 0.22,
    highlights: -0.35,
    shadows: -0.08,
    saturation: 1.12,
    vibrance: 0.2,
    density: 0.08,
    black_lift: -0.004,
    shadow_tone_r: -0.006,
    shadow_tone_g: 0.004,
    shadow_tone_b: 0.016,
    highlight_tone_r: 0.002,
    highlight_tone_g: 0.014,
    highlight_tone_b: -0.004,
    tone_balance: 0.52,
    matrix_rr: 0.99,
    matrix_rg: 0.005,
    matrix_rb: -0.008,
    matrix_gr: -0.018,
    matrix_gg: 1.06,
    matrix_gb: -0.006,
    matrix_br: -0.006,
    matrix_bg: -0.008,
    matrix_bb: 1.055,
  },
  "Camera - Fuji classic chrome": {
    tone_map: "AgX",
    soft_clip: 0.32,
    temperature: 0.04,
    tint: -0.035,
    contrast: 1.06,
    pivot: 0.23,
    highlights: -0.65,
    shadows: -0.12,
    saturation: 0.72,
    vibrance: -0.1,
    density: 0.12,
    black_lift: 0.0,
    shadow_tone_r: -0.01,
    shadow_tone_g: 0.002,
    shadow_tone_b: 0.016,
    highlight_tone_r: 0.024,
    highlight_tone_g: 0.014,
    highlight_tone_b: -0.018,
    tone_balance: 0.46,
    matrix_rr: 1.025,
    matrix_rg: -0.035,
    matrix_rb: 0.006,
    matrix_gr: 0.014,
    matrix_gg: 0.98,
    matrix_gb: -0.006,
    matrix_br: -0.022,
    matrix_bg: 0.022,
    matrix_bb: 1.01,
  },
  "Camera - Fuji velvia color": {
    tone_map: "ACES Fitted",
    soft_clip: 0.18,
    temperature: 0.02,
    tint: 0.03,
    contrast: 1.18,
    pivot: 0.22,
    highlights: -0.4,
    shadows: -0.1,
    saturation: 1.22,
    vibrance: 0.22,
    density: 0.12,
    black_lift: -0.006,
    shadow_tone_r: -0.01,
    shadow_tone_g: 0.006,
    shadow_tone_b: 0.016,
    highlight_tone_r: 0.02,
    highlight_tone_g: 0.018,
    highlight_tone_b: -0.014,
    tone_balance: 0.5,
    matrix_rr: 1.04,
    matrix_rg: -0.018,
    matrix_rb: -0.008,
    matrix_gr: -0.03,
    matrix_gg: 1.085,
    matrix_gb: -0.008,
    matrix_br: -0.012,
    matrix_bg: -0.018,
    matrix_bb: 1.08,
  },
  "Camera - Leica crisp color": {
    tone_map: "Hable",
    soft_clip: 0.18,
    temperature: 0.04,
    tint: 0.015,
    contrast: 1.12,
    pivot: 0.19,
    highlights: -0.45,
    shadows: -0.02,
    saturation: 1.04,
    vibrance: 0.1,
    density: 0.1,
    black_lift: 0.0,
    shadow_tone_r: 0.01,
    shadow_tone_g: -0.004,
    shadow_tone_b: -0.01,
    highlight_tone_r: 0.016,
    highlight_tone_g: 0.008,
    highlight_tone_b: -0.006,
    tone_balance: 0.48,
    matrix_rr: 1.06,
    matrix_rg: -0.032,
    matrix_rb: -0.01,
    matrix_gr: -0.012,
    matrix_gg: 1.035,
    matrix_gb: -0.01,
    matrix_br: -0.012,
    matrix_bg: -0.014,
    matrix_bb: 1.04,
  },
  "Camera - Sony clean neutral": {
    tone_map: "ACES Fitted",
    soft_clip: 0.14,
    temperature: -0.03,
    tint: 0.012,
    contrast: 1.02,
    pivot: 0.18,
    highlights: -0.25,
    shadows: 0.0,
    saturation: 1.02,
    vibrance: 0.08,
    density: 0.02,
    black_lift: 0.0,
    shadow_tone_r: -0.004,
    shadow_tone_g: 0.0,
    shadow_tone_b: 0.008,
    highlight_tone_r: -0.002,
    highlight_tone_g: 0.004,
    highlight_tone_b: 0.006,
    tone_balance: 0.5,
    matrix_rr: 0.99,
    matrix_rg: 0.002,
    matrix_rb: 0.006,
    matrix_gr: -0.004,
    matrix_gg: 1.015,
    matrix_gb: -0.002,
    matrix_br: 0.004,
    matrix_bg: -0.006,
    matrix_bb: 1.025,
  },
  "Camera - ARRI soft cinema": {
    tone_map: "AgX",
    soft_clip: 0.38,
    temperature: 0.06,
    tint: 0.02,
    contrast: 0.9,
    pivot: 0.18,
    highlights: -0.75,
    shadows: -0.08,
    saturation: 0.88,
    vibrance: 0.04,
    density: 0.04,
    black_lift: 0.0,
    shadow_tone_r: -0.008,
    shadow_tone_g: 0.002,
    shadow_tone_b: 0.014,
    highlight_tone_r: 0.022,
    highlight_tone_g: 0.012,
    highlight_tone_b: -0.012,
    tone_balance: 0.42,
    matrix_rr: 1.025,
    matrix_rg: -0.016,
    matrix_rb: -0.004,
    matrix_gr: 0.006,
    matrix_gg: 1.006,
    matrix_gb: -0.004,
    matrix_br: -0.014,
    matrix_bg: 0.01,
    matrix_bb: 1.02,
  },
  "Camera - Hasselblad natural": {
    tone_map: "Hable",
    soft_clip: 0.18,
    temperature: 0.025,
    tint: -0.012,
    contrast: 1.04,
    pivot: 0.18,
    highlights: -0.32,
    shadows: 0.0,
    saturation: 1.02,
    vibrance: 0.1,
    density: 0.06,
    black_lift: 0.0,
    shadow_tone_r: -0.004,
    shadow_tone_g: 0.006,
    shadow_tone_b: 0.01,
    highlight_tone_r: 0.01,
    highlight_tone_g: 0.012,
    highlight_tone_b: -0.004,
    tone_balance: 0.5,
    matrix_rr: 1.025,
    matrix_rg: -0.012,
    matrix_rb: -0.004,
    matrix_gr: -0.004,
    matrix_gg: 1.025,
    matrix_gb: -0.006,
    matrix_br: -0.006,
    matrix_bg: -0.004,
    matrix_bb: 1.025,
  },
  "Camera - Kodak print warm": {
    tone_map: "Hable",
    soft_clip: 0.32,
    temperature: 0.14,
    tint: 0.03,
    contrast: 1.08,
    pivot: 0.22,
    highlights: -0.56,
    shadows: 0.0,
    saturation: 1.08,
    vibrance: 0.12,
    density: 0.16,
    black_lift: 0.012,
    shadow_tone_r: 0.014,
    shadow_tone_g: -0.004,
    shadow_tone_b: -0.026,
    highlight_tone_r: 0.034,
    highlight_tone_g: 0.018,
    highlight_tone_b: -0.03,
    tone_balance: 0.44,
    matrix_rr: 1.06,
    matrix_rg: -0.03,
    matrix_rb: -0.014,
    matrix_gr: 0.01,
    matrix_gg: 1.012,
    matrix_gb: -0.014,
    matrix_br: -0.03,
    matrix_bg: -0.012,
    matrix_bb: 1.04,
  },
  "Camera - Cine bleach bypass": {
    tone_map: "AgX",
    soft_clip: 0.26,
    temperature: -0.03,
    tint: -0.015,
    contrast: 1.18,
    pivot: 0.24,
    highlights: -0.55,
    shadows: -0.18,
    saturation: 0.54,
    vibrance: -0.26,
    density: 0.22,
    black_lift: -0.01,
    shadow_tone_r: -0.01,
    shadow_tone_g: 0.004,
    shadow_tone_b: 0.024,
    highlight_tone_r: 0.01,
    highlight_tone_g: 0.012,
    highlight_tone_b: -0.006,
    tone_balance: 0.54,
    matrix_rr: 1.02,
    matrix_rg: -0.01,
    matrix_rb: 0.0,
    matrix_gr: -0.01,
    matrix_gg: 1.02,
    matrix_gb: -0.004,
    matrix_br: -0.004,
    matrix_bg: -0.01,
    matrix_bb: 1.04,
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
  activePresetName: "",
  activePresetDirty: false,
  snapshotPresetName: "",
  snapshotPresetDirty: false,
  exposureReadout: null,
  exposureLockButton: null,
  exposureAutoCheckbox: null,
  exposureBiasRange: null,
  exposureBiasNumber: null,
  exportFolderInput: null,
  exportPrefixInput: null,
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
  exposureMeta: { autoEv: 0, biasEv: 0, finalEv: 0, auto: false, locked: false },
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
  exportSettings: { folder: "x2hdr", prefix: "x2hdr_grade" },
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
    .x2hdr-grade-side{display:grid;grid-template-rows:auto auto auto auto auto minmax(0,1fr);border-left:1px solid #2c3138;background:#14171b;min-width:0}
    .x2hdr-grade-readout{display:grid;grid-template-columns:1fr;gap:6px;padding:10px;border-bottom:1px solid #2c3138;background:#111419;color:#aeb7c2;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;line-height:1.35}
    .x2hdr-grade-exposure{display:grid;gap:7px;padding:9px 10px;border-bottom:1px solid #2c3138;background:#13181d}
    .x2hdr-grade-exposure-head{display:flex;align-items:center;gap:8px;color:#e3e6e8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
    .x2hdr-grade-toggle{display:flex;align-items:center;gap:5px;margin-left:auto;color:#cbd1d8;font-size:12px;font-weight:400;text-transform:none;letter-spacing:0}
    .x2hdr-grade-toggle input{width:16px;height:16px;accent-color:#5fb8a8}
    .x2hdr-grade-evrow{display:grid;grid-template-columns:86px minmax(0,1fr) 58px;gap:8px;align-items:center;color:#cbd1d8}
    .x2hdr-grade-evrow input[type="range"]{width:100%;accent-color:#5fb8a8}
    .x2hdr-grade-evrow input[type="number"]{width:100%;box-sizing:border-box;background:#0c0f12;color:#dfe5ea;border:1px solid #39404a;border-radius:4px;padding:4px 5px;font:12px ui-monospace,SFMono-Regular,Consolas,monospace}
    .x2hdr-grade-evreadout{color:#aeb7c2;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
    .x2hdr-grade-presets{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:6px;padding:8px 10px;border-bottom:1px solid #2c3138;background:#12161a}
    .x2hdr-grade-presets select{min-width:0;width:100%;box-sizing:border-box;background:#0c0f12;color:#dfe5ea;border:1px solid #39404a;border-radius:4px;padding:4px 5px;font:12px system-ui,-apple-system,"Segoe UI",sans-serif}
    .x2hdr-grade-export{display:grid;grid-template-columns:1fr 1fr auto auto;gap:6px;align-items:end;padding:8px 10px;border-bottom:1px solid #2c3138;background:#11151a}
    .x2hdr-grade-field{display:grid;gap:3px;min-width:0;color:#aeb7c2;font-size:11px}
    .x2hdr-grade-field input{min-width:0;width:100%;box-sizing:border-box;background:#0c0f12;color:#dfe5ea;border:1px solid #39404a;border-radius:4px;padding:5px 6px;font:12px ui-monospace,SFMono-Regular,Consolas,monospace}
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

function readNodeState(node) {
  const stored = node?.properties?.[NODE_STATE_KEY];
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  return {
    activePresetName: typeof stored.activePresetName === "string" ? stored.activePresetName : "",
    activePresetDirty: stored.activePresetDirty === true,
  };
}

function writeNodeState(node, patch) {
  if (!node) return;
  node.properties ||= {};
  const current = readNodeState(node);
  node.properties[NODE_STATE_KEY] = {
    version: NODE_STATE_VERSION,
    ...current,
    ...patch,
  };
  node.setDirtyCanvas?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
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

function readExportSettings() {
  const defaults = { folder: "x2hdr", prefix: "x2hdr_grade" };
  try {
    const data = JSON.parse(localStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY) || "{}");
    return {
      folder: String(data?.folder ?? defaults.folder),
      prefix: String(data?.prefix ?? defaults.prefix) || defaults.prefix,
    };
  } catch (_) {
    return defaults;
  }
}

function writeExportSettings() {
  const folder = String(state.exportFolderInput?.value ?? state.exportSettings.folder ?? "").trim();
  const prefix = String(state.exportPrefixInput?.value ?? state.exportSettings.prefix ?? "").trim() || "x2hdr_grade";
  state.exportSettings = { folder, prefix };
  localStorage.setItem(EXPORT_SETTINGS_STORAGE_KEY, JSON.stringify(state.exportSettings));
}

function sanitizePresetParams(params) {
  const clean = {};
  for (const name of PRESET_PARAM_NAMES) clean[name] = params[name] ?? DEFAULTS[name];
  return clean;
}

function ensureFactoryPresets() {
  const presets = readPresets();
  let changed = false;
  for (const [name, params] of Object.entries(FACTORY_PRESETS)) {
    if (presets[name] && presets[name].factory !== true) continue;
    if (presets[name]?.factory_version === FACTORY_PRESET_VERSION) continue;
    presets[name] = {
      factory: true,
      factory_version: FACTORY_PRESET_VERSION,
      params: sanitizePresetParams(normalizeParams(params)),
      updated_at: "factory",
    };
    changed = true;
  }
  if (changed) writePresets(presets);
}

function updatePresetButtons() {
  if (!state.presetDeleteButton || !state.presetSelect) return;
  const name = state.presetSelect.value || "";
  const preset = name ? readPresets()[name] : null;
  const canDelete = !!preset && preset.factory !== true;
  state.presetDeleteButton.disabled = !canDelete;
  state.presetDeleteButton.title = preset?.factory ? tr("Built-in presets cannot be deleted") : "";
}

function setActivePreset(name, dirty = false) {
  const presets = readPresets();
  const active = name && presets[name] ? name : "";
  state.activePresetName = active;
  state.activePresetDirty = active ? !!dirty : false;
  refreshActivePresetDisplay();
  updatePresetButtons();
}

function refreshActivePresetDisplay() {
  if (state.presetSelect) {
    state.presetSelect.value = state.activePresetName;
    state.presetSelect.title = state.activePresetName
      ? tr("preset loaded: {name}", { name: `${presetDisplayName(state.activePresetName)}${state.activePresetDirty ? " *" : ""}` })
      : "";
    for (const option of state.presetSelect.options || []) {
      const name = option.value;
      if (!name) continue;
      option.textContent = presetOptionLabel(name, name === state.activePresetName && state.activePresetDirty);
    }
  }
}

function updateActivePresetDirtyForEdit(paramName) {
  if (!state.activePresetName || !PRESET_PARAM_NAME_SET.has(paramName)) return;
  const dirty = !presetMatchesWorking(state.activePresetName);
  if (dirty === state.activePresetDirty) return;
  setActivePreset(state.activePresetName, dirty);
}

function writeActivePresetState() {
  if (!state.currentNode) return;
  writeNodeState(state.currentNode, {
    activePresetName: state.activePresetName || "",
    activePresetDirty: !!state.activePresetName && !!state.activePresetDirty,
  });
}

function presetDisplayName(name) {
  const preset = readPresets()[name];
  return preset?.factory ? trPresetName(name) : name;
}

function presetOptionLabel(name, dirty = false) {
  const preset = readPresets()[name];
  const displayName = preset?.factory ? trPresetName(name) : name;
  const suffixes = [];
  if (preset?.factory) suffixes.push(tr("built-in"));
  if (dirty) suffixes.push("*");
  return suffixes.length ? `${displayName} [${suffixes.join(" | ")}]` : displayName;
}

function valuesEqualForPreset(paramName, a, b) {
  const param = PARAM_BY_NAME.get(paramName);
  if (param?.type === "select") return String(a ?? param.default) === String(b ?? param.default);
  if (param?.type === "checkbox") return !!a === !!b;
  return Math.abs(Number(a ?? param?.default ?? 0) - Number(b ?? param?.default ?? 0)) < 1e-6;
}

function presetMatchesWorking(name) {
  const preset = readPresets()[name];
  if (!preset?.params) return false;
  const clean = sanitizePresetParams(state.working);
  return PRESET_PARAM_NAMES.every((paramName) =>
    valuesEqualForPreset(paramName, clean[paramName], preset.params[paramName] ?? DEFAULTS[paramName]),
  );
}

function refreshPresetSelect(selected = "") {
  if (!state.presetSelect) return;
  ensureFactoryPresets();
  const presets = readPresets();
  const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
  state.presetSelect.textContent = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = names.length ? tr("Select preset") : tr("No presets");
  state.presetSelect.append(empty);
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = presetOptionLabel(name, name === state.activePresetName && state.activePresetDirty);
    state.presetSelect.append(option);
  }
  state.presetSelect.value = names.includes(selected) ? selected : "";
  state.activePresetName = state.presetSelect.value || "";
  if (!state.activePresetName) state.activePresetDirty = false;
  refreshActivePresetDisplay();
  updatePresetButtons();
}

function restoreActivePresetState(node) {
  const nodeState = readNodeState(node);
  state.snapshotPresetName = nodeState.activePresetName || "";
  state.snapshotPresetDirty = nodeState.activePresetDirty === true;
  state.activePresetDirty = state.snapshotPresetDirty;
  refreshPresetSelect(state.snapshotPresetName);
  if (state.activePresetName) {
    const dirty = state.snapshotPresetDirty || !presetMatchesWorking(state.activePresetName);
    setActivePreset(state.activePresetName, dirty);
  }
  state.snapshotPresetName = state.activePresetName;
  state.snapshotPresetDirty = state.activePresetDirty;
}

function savePreset() {
  const current = state.presetSelect?.value || "";
  const name = prompt(tr("Preset name"), current || tr("New preset"));
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
  setActivePreset(trimmed, false);
  setStatus(tr("preset saved: {name}", { name: trimmed }));
}

function loadPreset() {
  const name = state.presetSelect?.value || "";
  if (!name) return;
  const preset = readPresets()[name];
  if (!preset?.params) return;
  const preserved = {};
  for (const paramName of NON_PRESET_PARAM_NAMES) preserved[paramName] = state.working[paramName];
  state.working = normalizeParams({ ...preset.params, ...preserved });
  updateExposurePanel();
  buildControls();
  schedulePreview(0, true);
  setActivePreset(name, false);
  setStatus(tr("preset loaded: {name}", { name: preset.factory ? trPresetName(name) : name }));
}

function deletePreset() {
  const name = state.presetSelect?.value || "";
  if (!name) return;
  const presets = readPresets();
  if (presets[name]?.factory) {
    setStatus(tr("Built-in presets cannot be deleted"));
    updatePresetButtons();
    return;
  }
  if (!confirm(tr("Delete preset \"{name}\"?", { name }))) return;
  const deletingActivePreset = state.activePresetName === name;
  delete presets[name];
  writePresets(presets);
  refreshPresetSelect();
  if (deletingActivePreset) setActivePreset("");
  setStatus(tr("preset deleted: {name}", { name }));
}

function neutralParams(params) {
  return {
    ...DEFAULTS,
    auto_exposure: params.auto_exposure ?? DEFAULTS.auto_exposure,
    exposure: params.exposure ?? DEFAULTS.exposure,
    tone_map: params.tone_map ?? DEFAULTS.tone_map,
    false_color: false,
  };
}

function button(label, onClick, className = "") {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `x2hdr-grade-btn ${className}`.trim();
  el.textContent = label;
  el.onclick = onClick;
  return el;
}

function exportField(label, value) {
  const field = document.createElement("label");
  field.className = "x2hdr-grade-field";
  const text = document.createElement("span");
  text.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.oninput = writeExportSettings;
  field.append(text, input);
  return { field, input };
}

function buildExposurePanel() {
  const panel = document.createElement("div");
  panel.className = "x2hdr-grade-exposure";

  const head = document.createElement("div");
  head.className = "x2hdr-grade-exposure-head";
  const title = document.createElement("span");
  title.textContent = tr("Input Exposure");
  const toggle = document.createElement("label");
  toggle.className = "x2hdr-grade-toggle";
  state.exposureAutoCheckbox = document.createElement("input");
  state.exposureAutoCheckbox.type = "checkbox";
  state.exposureAutoCheckbox.checked = !!state.working.auto_exposure;
  state.exposureAutoCheckbox.oninput = () => {
    state.working.auto_exposure = state.exposureAutoCheckbox.checked;
    if (!state.working.auto_exposure) state.working.auto_exposure_lock = false;
    updateExposurePanel();
    schedulePreview(0, true);
  };
  const toggleText = document.createElement("span");
  toggleText.textContent = tr("Auto Exposure");
  toggle.append(state.exposureAutoCheckbox, toggleText);
  head.append(title, toggle);

  const biasRow = document.createElement("label");
  biasRow.className = "x2hdr-grade-evrow";
  const biasLabel = document.createElement("span");
  biasLabel.textContent = tr("Exposure Bias");
  state.exposureBiasRange = document.createElement("input");
  state.exposureBiasRange.type = "range";
  state.exposureBiasRange.min = "-10";
  state.exposureBiasRange.max = "10";
  state.exposureBiasRange.step = "0.1";
  state.exposureBiasNumber = document.createElement("input");
  state.exposureBiasNumber.type = "number";
  state.exposureBiasNumber.min = "-10";
  state.exposureBiasNumber.max = "10";
  state.exposureBiasNumber.step = "0.1";
  const setBias = (value, highQuality = false) => {
    const next = clamp(Number(value), -10, 10);
    state.working.exposure = next;
    state.exposureBiasRange.value = String(next);
    state.exposureBiasNumber.value = formatValue(next, 0.1);
    updateExposurePanel();
    schedulePreview(0, highQuality);
  };
  state.exposureBiasRange.oninput = () => setBias(state.exposureBiasRange.value, false);
  state.exposureBiasRange.onpointerdown = () => {
    state.activeControl = true;
  };
  state.exposureBiasRange.onpointerup = () => finishInteractiveControl();
  state.exposureBiasRange.onpointercancel = () => finishInteractiveControl();
  state.exposureBiasRange.onchange = () => finishInteractiveControl();
  state.exposureBiasNumber.onchange = () => setBias(state.exposureBiasNumber.value, true);
  biasRow.append(biasLabel, state.exposureBiasRange, state.exposureBiasNumber);

  const actions = document.createElement("div");
  actions.style.cssText = "display:flex;gap:6px;align-items:center";
  state.exposureReadout = document.createElement("div");
  state.exposureReadout.className = "x2hdr-grade-evreadout";
  state.exposureReadout.style.flex = "1";
  state.exposureLockButton = button(tr("Lock"), toggleExposureLock);
  actions.append(state.exposureReadout, state.exposureLockButton, button(tr("Reset Exposure"), resetExposureControls));

  panel.append(head, biasRow, actions);
  updateExposurePanel();
  return panel;
}

function updateExposurePanel() {
  if (state.exposureAutoCheckbox) state.exposureAutoCheckbox.checked = !!state.working.auto_exposure;
  if (state.exposureBiasRange) state.exposureBiasRange.value = String(state.working.exposure ?? 0);
  if (state.exposureBiasNumber) state.exposureBiasNumber.value = formatValue(state.working.exposure ?? 0, 0.1);
  if (state.exposureLockButton) {
    state.exposureLockButton.textContent = state.working.auto_exposure_lock ? tr("Unlock") : tr("Lock");
    state.exposureLockButton.disabled = !state.working.auto_exposure;
  }
  if (state.exposureReadout) {
    const meta = state.exposureMeta;
    const autoText = state.working.auto_exposure ? signedEv(meta.autoEv) : signedEv(0);
    const lockText = state.working.auto_exposure_lock ? ` ${tr("Lock")}` : "";
    state.exposureReadout.textContent = `${tr("Auto EV")} ${autoText}${lockText} | ${tr("Bias EV")} ${signedEv(state.working.exposure ?? 0)} | ${tr("Final EV")} ${signedEv(meta.finalEv)}`;
  }
}

function toggleExposureLock() {
  if (!state.working.auto_exposure) return;
  if (state.working.auto_exposure_lock) {
    state.working.auto_exposure_lock = false;
  } else {
    state.working.auto_exposure_lock = true;
    state.working.auto_exposure_ev = Number(state.exposureMeta.autoEv || 0);
  }
  updateExposurePanel();
  schedulePreview(0, true);
}

function resetExposureControls() {
  state.working.auto_exposure = false;
  state.working.auto_exposure_lock = false;
  state.working.auto_exposure_ev = 0;
  state.working.exposure = 0;
  state.exposureMeta = { autoEv: 0, biasEv: 0, finalEv: 0, auto: false, locked: false };
  updateExposurePanel();
  schedulePreview(0, true);
}

function signedEv(value) {
  const number = Number(value || 0);
  const formatted = number.toFixed(2);
  return number > 0 ? `+${formatted}` : formatted;
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
  title.textContent = tr("X2HDR Color Grade");

  state.frame = document.createElement("span");
  state.frame.className = "x2hdr-grade-status";

  const modeGroup = document.createElement("span");
  modeGroup.style.cssText = "display:flex;gap:4px";
  const gradedBtn = button(tr("Grade"), () => setCompareMode("graded"), "active");
  const sourceBtn = button(tr("Source"), () => setCompareMode("source"));
  const splitBtn = button(tr("Split"), () => setCompareMode("split"));
  state.compare = { gradedBtn, sourceBtn, splitBtn };
  modeGroup.append(gradedBtn, sourceBtn, splitBtn);

  const splitSlider = document.createElement("input");
  splitSlider.type = "range";
  splitSlider.min = "0.05";
  splitSlider.max = "0.95";
  splitSlider.step = "0.01";
  splitSlider.value = String(state.split);
  splitSlider.title = tr("Split position");
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
    button(tr("Prev"), () => setFrame(state.frameIndex - 1)),
    state.frame,
    button(tr("Next"), () => setFrame(state.frameIndex + 1)),
    button(tr("Fit"), () => fitImage(true)),
    button("1:1", () => setZoom(1)),
    button("-", () => zoomBy(0.8)),
    button("+", () => zoomBy(1.25)),
    modeGroup,
    splitSlider,
    spanSpacer(),
    state.status,
    button(tr("Reset"), resetControls),
    button(tr("Cancel"), closeModal),
    button(tr("Save"), saveAndClose, "primary"),
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
  state.info.textContent = tr("No HDR source");
  state.sample.textContent = tr("Move over image to sample");
  readout.append(state.info, state.sample);

  const exposurePanel = buildExposurePanel();

  const presets = document.createElement("div");
  presets.className = "x2hdr-grade-presets";
  state.presetSelect = document.createElement("select");
  state.presetSelect.onchange = () => {
    updatePresetButtons();
    loadPreset();
  };
  state.presetDeleteButton = button(tr("Delete"), deletePreset);
  presets.append(
    state.presetSelect,
    button(tr("Load"), loadPreset),
    button(tr("Save"), savePreset),
    state.presetDeleteButton,
  );

  state.exportSettings = readExportSettings();
  const exportPanel = document.createElement("div");
  exportPanel.className = "x2hdr-grade-export";
  const exportFolder = exportField(tr("Output Folder"), state.exportSettings.folder);
  const exportPrefix = exportField(tr("Filename Prefix"), state.exportSettings.prefix);
  state.exportFolderInput = exportFolder.input;
  state.exportPrefixInput = exportPrefix.input;
  exportPanel.append(
    exportFolder.field,
    exportPrefix.field,
    button(tr("Save PNG"), () => saveCurrentFrame("png")),
    button(tr("Save EXR"), () => saveCurrentFrame("exr")),
  );

  state.histogram = document.createElement("canvas");
  state.histogram.className = "x2hdr-grade-hist";
  state.histogramCtx = state.histogram.getContext("2d");

  state.controls = document.createElement("div");
  state.controls.className = "x2hdr-grade-controls";

  side.append(readout, exposurePanel, presets, exportPanel, state.histogram, state.controls);
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
    if (EXPOSURE_PARAM_NAMES.has(param.name)) continue;
    if (!sections.has(param.section)) sections.set(param.section, []);
    sections.get(param.section).push(param);
  }

  for (const [section, params] of sections) {
    const group = document.createElement("div");
    group.className = "x2hdr-grade-section";
    const heading = document.createElement("div");
    heading.className = "x2hdr-grade-section-title";
    heading.textContent = tr(section);
    group.append(heading);
    for (const param of params) group.append(buildControlRow(param));
    state.controls.append(group);
  }
}

function buildControlRow(param) {
  const row = document.createElement("label");
  row.className = "x2hdr-grade-row";
  row.title = tr("Double click to reset");
  row.ondblclick = (event) => {
    event.preventDefault();
    state.working[param.name] = param.default;
    updateActivePresetDirtyForEdit(param.name);
    buildControls();
    schedulePreview(0, true);
  };

  const label = document.createElement("span");
  label.textContent = tr(param.label);

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
    readout.textContent = input.checked ? tr("on") : tr("off");
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
      updateActivePresetDirtyForEdit(param.name);
      schedulePreview(0, true);
    };
    readout = number;
  }

  input.oninput = () => {
    if (param.type === "checkbox") {
      state.working[param.name] = input.checked;
      readout.textContent = input.checked ? tr("on") : tr("off");
    } else if (param.type === "select") {
      state.working[param.name] = input.value;
    } else {
      state.working[param.name] = Number(input.value);
      readout.value = formatValue(input.value, param.step);
    }
    updateActivePresetDirtyForEdit(param.name);
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
  restoreActivePresetState(node);
  updateExposurePanel();
  buildControls();
  resizeCanvas();
  setCompareMode(state.compareMode, false);
  setStatus(tr("loading source..."));
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
  if (state.currentNode) {
    writeNodeParams(state.currentNode, state.working);
    writeActivePresetState();
  }
  closeModal();
}

async function saveCurrentFrame(format) {
  if (!state.currentNode || !state.cacheId) return;
  if (state.currentNode) {
    writeNodeParams(state.currentNode, state.working);
    writeActivePresetState();
  }
  writeExportSettings();
  const normalizedFormat = String(format || "").toLowerCase();
  const label = normalizedFormat.toUpperCase();
  setStatus(tr("saving {format}...", { format: label }));
  try {
    const response = await fetch("/x2hdr/grade/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cache_id: state.cacheId,
        node_id: String(state.currentNode?.id || ""),
        frame: state.frameIndex,
        format: normalizedFormat,
        save_subfolder: state.exportSettings.folder,
        filename_prefix: state.exportSettings.prefix,
        params: state.working,
      }),
    });
    if (!response.ok) throw new Error(await responseText(response));
    const data = await response.json();
    setStatus(tr("saved {format}: {path}", { format: label, path: data.path || data.filename || "" }));
  } catch (error) {
    setStatus(error.message || tr("save failed"));
  }
}

function resetControls() {
  state.working = { ...state.snapshot };
  setActivePreset(state.snapshotPresetName, state.snapshotPresetDirty);
  updateExposurePanel();
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
    setStatus(error.message || tr("source missing"));
    updateReadout(error.message || tr("Run the node once"));
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
  setStatus(highQuality ? tr("rendering high...") : tr("rendering..."));
  updateReadout();

  try {
    const maxSize = previewMaxSize(highQuality);
    const image = await requestPreview(state.working, false, maxSize);
    let compareImage = state.compareImage;
    const compareKey = [
      state.cacheId,
      state.frameIndex,
      maxSize,
      state.working.tone_map || "",
      state.working.auto_exposure ? 1 : 0,
      state.working.auto_exposure_lock ? 1 : 0,
      Number(state.working.auto_exposure_ev || 0).toFixed(4),
      Number(state.working.exposure || 0).toFixed(4),
    ].join(":");
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
    setStatus(tr("live"));
  } catch (error) {
    if (serial !== state.serial) return;
    setStatus(error.message || tr("preview failed"));
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
    state.exposureMeta = {
      autoEv: Number(response.headers.get("X-X2HDR-Auto-EV") || 0),
      biasEv: Number(response.headers.get("X-X2HDR-Bias-EV") || 0),
      finalEv: Number(response.headers.get("X-X2HDR-Final-EV") || 0),
      auto: response.headers.get("X-X2HDR-Auto-Exposure") === "1",
      locked: response.headers.get("X-X2HDR-Auto-Locked") === "1",
    };
    if (state.working.auto_exposure && !state.working.auto_exposure_lock) {
      state.working.auto_exposure_ev = state.exposureMeta.autoEv;
    }
    updateExposurePanel();
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
    ctx.fillText(tr("Run X2HDR Color Grade, then open the viewer."), w / 2, h / 2);
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
    ? tr("preview {width}x{height}", {
        width: state.previewMeta.previewWidth,
        height: state.previewMeta.previewHeight,
      })
    : tr("preview pending");
  const zoom = tr("zoom {pct}%", { pct: Math.round(state.view.scale * 100) });
  state.info.textContent = error || `${width || "?"}x${height || "?"} HDR | ${preview} | ${zoom}`;
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
    state.sample.textContent = tr("Outside image");
    return;
  }
  state.sample.textContent = `x ${p.x}, y ${p.y} | ${tr("sampling...")}`;
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
    state.sample.textContent = `x ${data.x}, y ${data.y} | HDR ${fmtRgb(data.hdr_rgb)} | ${tr("display")} ${fmtRgb(data.display_rgb)} | Y ${fmt(data.luma)}`;
  } catch (error) {
    state.sample.textContent = error.message || tr("sample failed");
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
      const oldLabel = "Open X2HDR color grade";
      const buttonLabel = tr(oldLabel);
      const existing = (this.widgets || []).find(
        (widget) => widget.x2hdrViewerButton || widget.name === oldLabel || widget.name === buttonLabel,
      );
      if (existing) {
        existing.name = buttonLabel;
        existing.callback = () => openModal(this);
        existing.serialize = false;
        existing.x2hdrViewerButton = true;
      } else {
        const viewer = this.addWidget("button", buttonLabel, null, () => openModal(this));
        viewer.serialize = false;
        viewer.x2hdrViewerButton = true;
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
