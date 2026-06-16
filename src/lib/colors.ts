// 高亮色板:onboarding 时每人挑一个,模块按负责人上色。
export const PALETTE: { name: string; hex: string }[] = [
  { name: "蓝", hex: "#2563eb" },
  { name: "绿", hex: "#16a34a" },
  { name: "橙", hex: "#ea580c" },
  { name: "紫", hex: "#7c3aed" },
  { name: "粉", hex: "#db2777" },
  { name: "青", hex: "#0891b2" },
  { name: "红", hex: "#dc2626" },
  { name: "棕", hex: "#a16207" },
];

export const NEUTRAL = "#94a3b8"; // 无主模块的中性色

/** 给定背景 hex,返回可读的前景色(黑/白)。 */
export function readableText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
}

/** 淡化背景:用于卡片底色。 */
export function tint(hex: string, alpha = 0.12): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
