import type { Config } from "tailwindcss";

// 设计系统:Vercel Geist(Light)。
// 做法:把 Tailwind 既有的 slate/blue/red/amber/green 等阶梯按"语义"重映射成 Geist 色值,
// 组件保留原 class 名即可整体换肤——调色板的"单一真源"就在这里。
const geistGray = {
  50: "#fafafa", // background-200:页面 / 次级面
  100: "#f2f2f2", // gray-100:胶囊 / 代码 / 列底 / hover
  200: "#ebebeb", // gray-200:边框 / 标签
  300: "#e6e6e6", // gray-300:节点边框 / hover 面
  400: "#8f8f8f", // gray-700:提示文字 / 图标 / 点(比原 slate-400 略提对比)
  500: "#7d7d7d", // gray-800:次要文字
  600: "#4d4d4d", // gray-900:正文(强)
  700: "#4d4d4d", // gray-900:小标题 / 中等文字
  800: "#171717", // gray-1000:标题
  900: "#171717", // gray-1000:主文字 / 标题
};

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 旧的语义色,顺手指到 Geist
        ink: "#171717",
        panel: "#ffffff",
        muted: "#8f8f8f",
        // 中性阶梯 → Geist gray
        slate: geistGray,
        gray: geistGray,
        // 蓝(链接 / 焦点 / 技术栈卡)→ Geist blue
        blue: {
          50: "#f0f7ff", // blue-100
          100: "#cae7ff", // blue-400:浅蓝边框
          600: "#006bff", // blue-700:强调 / 链接
          700: "#006bff",
          900: "#002359", // blue-1000:浅蓝底上的标题文字
        },
        // 红(报错 / 撞车)→ Geist red
        red: {
          50: "#ffeeef", // red-100
          600: "#ea001d", // red-800:实心填充(撞车徽章)
          700: "#d8001b", // red-900:报错文字
        },
        // 琥珀(警告 / 边界 / proposed)→ Geist amber
        amber: {
          50: "#fff6de", // amber-100
          100: "#fff6de",
          700: "#aa4d00", // amber-900:浅琥珀底上的可读文字
        },
        // 绿(accepted / done)→ Geist green
        green: {
          100: "#ecfdec", // green-100
          700: "#107d32", // green-900:浅绿底上的可读文字
        },
      },
      borderColor: {
        // 裸 `border` 的默认色(Geist 分隔线 gray-200)
        DEFAULT: "#ebebeb",
      },
      borderRadius: {
        // Geist:控件 6 / 容器 12 / 全屏 16
        DEFAULT: "6px",
        md: "6px",
        lg: "12px",
        xl: "16px",
      },
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        // Geist 抬升卡片 / 模态
        sm: "0 2px 2px rgba(0, 0, 0, 0.04)",
        "2xl":
          "0 1px 1px rgba(0,0,0,0.02), 0 8px 16px -4px rgba(0,0,0,0.04), 0 24px 32px -8px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
