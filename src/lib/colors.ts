// 高亮色板:onboarding 时每人挑一个,模块按负责人上色。
export const PALETTE: { name: string; hex: string }[] = [
  { name: "蓝", hex: "#006bff" }, // blue-700
  { name: "绿", hex: "#28a948" }, // green-700
  { name: "橙", hex: "#ff9300" }, // amber-800
  { name: "紫", hex: "#8500d1" }, // purple-800
  { name: "粉", hex: "#e4106e" }, // pink-800
  { name: "青", hex: "#00ac96" }, // teal-700
  { name: "红", hex: "#ea001d" }, // red-800
  { name: "棕", hex: "#aa4d00" }, // amber-900
];

export const NEUTRAL = "#a8a8a8"; // 非活跃模块的中性色(Geist gray-600)
export const ACTIVE_FALLBACK = "#ffa600"; // 正在做但负责人无色时的兜底活跃色(Geist amber-600)

/** 给定背景 hex,返回可读的前景色(黑/白)。 */
export function readableText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#171717" : "#ffffff";
}

/** 淡化背景:用于卡片底色。 */
export function tint(hex: string, alpha = 0.12): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
