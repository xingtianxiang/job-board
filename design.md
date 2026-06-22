---
version: alpha
name: weld-board · Geist Light
description: weld-board 团队看板的设计系统。基于 Vercel Geist(Light 主题),按语义把 Tailwind 既有阶梯重映射为 Geist 色值。可执行的单一真源是 tailwind.config.ts —— 本文是给人读的参考,改 token 改那里、本文同步更新。
theme: light
source: tailwind.config.ts
font:
  sans: Geist(Google Fonts,layout.tsx <link> 加载;离线回退 system-ui)
  mono: Geist Mono
colors:
  # 中性阶梯(Tailwind slate/gray 已被重映射成下面这套 Geist gray)
  bg-100: "#ffffff"     # 卡片 / 主面
  bg-200: "#fafafa"     # 页面 / 次级面(slate-50)
  gray-100: "#f2f2f2"   # 胶囊 / 代码 / 标签底 / hover(slate-100)
  gray-200: "#ebebeb"   # 边框 / 分隔 / 标签(slate-200 · 裸 border 默认色)
  gray-300: "#e6e6e6"   # 节点边框 / hover 面(slate-300)
  gray-700: "#8f8f8f"   # 提示文字 / 图标 / 小圆点(slate-400)
  gray-800: "#7d7d7d"   # 次要文字(slate-500)
  gray-900: "#4d4d4d"   # 正文 / 小标题(slate-600·700)
  gray-1000: "#171717"  # 标题 / 主文字(slate-800·900)
  # 强调与语义
  blue-100: "#f0f7ff"   # 技术栈卡底(blue-50)
  blue-400: "#cae7ff"   # 浅蓝边框(blue-100)
  blue-700: "#006bff"   # 链接 / 强调 / 焦点环(blue-600·700)
  blue-1000: "#002359"  # 浅蓝底上的标题(blue-900)
  red-100: "#ffeeef"    # 报错框 / 撞车区底(red-50)
  red-800: "#ea001d"    # 撞车实心填充 / 环 / 边界虚线(red-600)
  red-900: "#d8001b"    # 报错文字(red-700)
  amber-100: "#fff6de"  # 边界框 / proposed 徽章底(amber-50·100)
  amber-600: "#ffa600"  # 兜底活跃色 ACTIVE_FALLBACK
  amber-800: "#ff9300"  # doing 状态点
  amber-900: "#aa4d00"  # 浅琥珀底上的可读文字(amber-700)
  green-100: "#ecfdec"  # accepted 徽章底
  green-700: "#28a948"  # done 状态点
  green-900: "#107d32"  # accepted 文字(green-700)
  neutral: "#a8a8a8"    # 非活跃模块 / 未指派 NEUTRAL
member-palette:        # onboarding 选人高亮色(lib/colors.ts · PALETTE)
  蓝: "#006bff"
  绿: "#28a948"
  橙: "#ff9300"
  紫: "#8500d1"
  粉: "#e4106e"
  青: "#00ac96"
  红: "#ea001d"
  棕: "#aa4d00"
typography:
  # 项目实际用到的字号 → Geist 排印 token
  heading-24: { class: text-2xl, weight: 600, use: 模块单页大标题 }
  heading-20: { class: "text-xl / text-lg", weight: 600, use: 抽屉标题 / archive / 空状态 }
  heading-16: { class: text-base, weight: 600, use: 看板项目名 / 区块标题 }
  label-14:   { class: text-sm, weight: "400/500", use: 绝大多数正文与控件 }
  label-12:   { class: text-xs, weight: 400, use: 元信息 / 标签 / 时间 }
  label-13-mono: { class: "text-[13px] font-mono", use: 函数名 / commit sha }
spacing:
  base: 4px            # Tailwind 默认 4px scale 与 Geist 对齐
  inside-group: 8px    # gap-2
  between-group: 16px  # gap-4 / p-4
  section: 24-32px
  card-pad: 12-16px    # p-3 紧凑 / p-4 默认 / p-6(24)onboarding
  sidebar: 360px       # 右侧栏
  drawer: 380px        # 模块抽屉
rounded:
  sm: 6px              # rounded / rounded-md —— 控件、卡片、标签
  lg: 12px             # rounded-lg —— 容器、决策卡、技术栈卡、抽屉
  xl: 16px             # rounded-xl —— onboarding 卡 / 全屏面
  full: 9999px         # 胶囊、圆点、头像
shadow:
  sm: "0 2px 2px rgba(0,0,0,0.04)"                                                          # 抬升卡片
  modal: "0 1px 1px rgba(0,0,0,.02), 0 8px 16px -4px rgba(0,0,0,.04), 0 24px 32px -8px rgba(0,0,0,.06)"  # 抽屉 / 模态(shadow-2xl)
focus: "box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #006bff"                                   # 两层焦点环(globals.css)
---

# weld-board 设计系统

## 概览

weld-board 采用 Vercel **Geist** 的 **Light** 主题:近中性灰、留白充足、克制用色——**色彩用来表达状态与层级,而非装饰**。整页坐落在近白的中性面上,优先可读性与无障碍。

本系统目前只有 Light 一套。暗色主题尚未实现(见文末)。

## 单一真源与换肤原理

设计 token 的**可执行单一真源是 [`tailwind.config.ts`](./tailwind.config.ts)**(与 `prisma/schema.prisma` 之于数据同理)。本文是人读的说明;两者冲突时以 config 为准。

换肤不是逐个组件改类名,而是**把 Tailwind 既有的色阶按语义重映射成 Geist 值**。因此组件继续写 `text-slate-700`、`bg-blue-50` 这类语义类名,渲染出来就是 Geist。新增 UI 时**沿用下表的语义类名即可**,不要写裸 hex、也不要引入表外色板(如 `indigo-*`、`zinc-*`)绕过映射。

### 中性阶梯(slate / gray → Geist gray)

| 写的类名 | 渲染值 | 语义 / 典型用法 |
|---|---|---|
| `slate-50` | `#fafafa` | 页面底 / 次级面 / 看板列底 |
| `slate-100` | `#f2f2f2` | 胶囊、代码、标签底、hover |
| `slate-200` | `#ebebeb` | 边框、分隔线、标签(也是裸 `border` 默认色) |
| `slate-300` | `#e6e6e6` | 节点边框、hover 面 |
| `slate-400` | `#8f8f8f` | 提示文字、图标、小圆点 |
| `slate-500` | `#7d7d7d` | 次要文字 |
| `slate-600` / `slate-700` | `#4d4d4d` | 正文(强)、小标题 |
| `slate-800` / `slate-900` | `#171717` | 标题、主文字 |

`gray-*` 映射与 `slate-*` 完全相同。裸 `border` / `border-b` / `border-l` 的默认色为 `#ebebeb`。

### 强调与语义色

| 写的类名 | 渲染值 | 用途 |
|---|---|---|
| `blue-50` | `#f0f7ff` | 技术栈卡底 |
| `blue-100` | `#cae7ff` | 浅蓝边框 |
| `blue-600` / `blue-700` | `#006bff` | 链接、强调、焦点环 |
| `blue-900` | `#002359` | 浅蓝底上的标题文字 |
| `red-50` | `#ffeeef` | 报错框、撞车区底 |
| `red-600` | `#ea001d` | 撞车徽章实心填充 |
| `red-700` | `#d8001b` | 报错文字 |
| `amber-50` / `amber-100` | `#fff6de` | 边界框、proposed 徽章底 |
| `amber-700` | `#aa4d00` | 浅琥珀底上的可读文字 |
| `green-100` | `#ecfdec` | accepted 徽章底 |
| `green-700` | `#107d32` | accepted 文字 |

## 颜色

中性灰用来排信息层级:`#171717` 主文字、`#4d4d4d` 次要、`#8f8f8f` 提示。强调蓝 `#006bff` 只留给链接、焦点和一处最重要的动作。**不要只用颜色表达状态**——配上图标或文字标签(撞车带 ⚠、进行中带 ▶)。正文对比度守住 WCAG AA(4.5:1)。

### 成员高亮色

每位成员在 onboarding 选一个高亮色(`lib/colors.ts · PALETTE`),模块按负责人上色。前景黑/白由 `readableText()` 按背景亮度自动取(>0.6 用 `#171717`,否则白)。

`蓝 #006bff` · `绿 #28a948` · `橙 #ff9300` · `紫 #8500d1` · `粉 #e4106e` · `青 #00ac96` · `红 #ea001d` · `棕 #aa4d00`

### 状态色(语义固定,勿改)

| 状态 | 色值 | 出现处 |
|---|---|---|
| 撞车 / conflict | 环 + 徽章 `#ea001d`(白字),区底 `red-50` | 模块节点、抽屉、活动条 |
| 在改(git active) | 模块填成**成员色**,徽章黑 15% 底 | 模块节点 ✎ |
| 进行中 / doing | 状态点 `#ff9300`,节点徽章 ▶ | 功能卡、抽屉 |
| 完成 / done | 状态点 `#28a948` | 抽屉、功能 |
| 待办 / todo·未指派 | `#a8a8a8`(NEUTRAL) | 状态点、空负责人 |
| 兜底活跃 | `#ffa600`(ACTIVE_FALLBACK) | 在做但负责人无色 |
| decision accepted | `green-100` 底 / `green-700` 字 | 决策面板 |
| decision proposed | `amber-100` 底 / `amber-700` 字 | 决策面板 |
| decision superseded | `slate-200` 底 / `slate-500` 字 + 删除线 | 决策面板 |
| 模块图 · 依赖边 | `#c9c9c9`(动画虚线) | ModuleMap |
| 模块图 · 边界边 | `#ea001d` 虚线 | ModuleMap |

## 字体

Geist Sans 排 UI 与正文,Geist Mono 排代码、commit sha、函数名等等宽数据。两者经 [`layout.tsx`](./src/app/layout.tsx) 的 `<link>` 从 Google Fonts 加载;离线时回退 `system-ui`。

字号统一用 Tailwind 类(见 frontmatter `typography`):`text-base`(16,项目名/区块标题)、`text-sm`(14,绝大多数)、`text-xs`(12,元信息/标签)。字重只用两档:`font-semibold`(600)给标题、`font-medium`(500)给按钮/强调、默认 400 给正文。**不要手写 font-size / line-height**,用类名。

## 间距与布局

4px 基准(Tailwind 默认即与 Geist 对齐)。节奏三档:组内 8px(`gap-2`)、组间 16px(`gap-4` / `p-4`)、区块 24–32px。卡片 padding:`p-3`(12,紧凑)/ `p-4`(16,默认)/ `p-6`(24,onboarding)。

主看板是三段式:顶栏 + 「谁在做什么」活动条 + (左:模块地图 + 功能看板 / 右:360px 侧栏);模块抽屉 380px。每个布局都要在桌面与移动端可用。

## 圆角

一套视图保持同一圆角家族,别混圆角与直角:

- `rounded` / `rounded-md` = **6px** —— 控件、卡片、标签、输入框
- `rounded-lg` = **12px** —— 容器、决策卡、技术栈卡、抽屉
- `rounded-xl` = **16px** —— onboarding 卡、全屏面
- `rounded-full` = 胶囊、圆点、头像

## 阴影与层级

层级先靠**色面与边框**,阴影保持克制:

- 抬升卡片:`shadow-sm` = `0 2px 2px rgba(0,0,0,.04)`
- 抽屉 / 模态:`shadow-2xl` = `0 1px 1px rgba(0,0,0,.02), 0 8px 16px -4px rgba(0,0,0,.04), 0 24px 32px -8px rgba(0,0,0,.06)`

## 焦点与无障碍

[`globals.css`](./src/app/globals.css) 给所有可交互元素的 `:focus-visible` 加了 Geist 两层焦点环:`0 0 0 2px #ffffff, 0 0 0 4px #006bff`(2px 表面间隙 + 2px blue-700 环)。**不要去掉 outline 而不给可见替代**。状态不能只靠颜色,配图标或文字。

## 组件约定

- **模块节点(ModuleMap)**:白底、`slate-300` 边、6px 圆角;活跃时填成员色、前景由 `readableText()` 定;撞车套 `#ea001d` 3px 环 + 红徽章。依赖边 `#c9c9c9`、边界边 `#ea001d` 虚线。
- **活动胶囊(ActivityBar)**:`slate-50` 底、`rounded-full`、成员色圆点 + 名字 + 模块标签;撞车项用 `red-50`/`#ea001d`。
- **功能卡(FeatureBoard)**:白底卡 + `shadow-sm`,落在 `slate-50` 的列里;负责人圆点 + 模块 key 标签。
- **决策卡(DecisionPanel)**:白底 `rounded-lg`,状态徽章见上表。
- **成员芯片(onboarding)**:`rounded-full`、填成员色、`readableText()` 前景;选中态 `ring-2 ring-slate-900 ring-offset-2`。
- **按钮**:主操作实心 `slate-900`(`#171717`)白字、`rounded-md`;次要用边框;链接式用 `slate-500` hover `slate-800`。
- **输入框**:白底、`border`、`rounded-md`、`px-3 py-2 text-sm`。

## 文案

文案是设计的一部分,精确、去填充词(去掉「请」「成功」)。

- 按钮用**动词 + 名词**:`部署项目`、`删除成员`,不要光写 `确定`/`OK`。
- 报错写「发生了什么 + 下一步怎么办」:`构建失败。Bundle 超过 50 MB,精简或调高上限。`
- Toast 只点名变化的对象、**不带句号、不说「成功」**:`项目已删除`,而非 `成功删除了项目。`
- 空状态指向第一个动作:`还没有模块。维护好 BOARD.md 后本地 npm run sync 上传即可成图。`
- 进行中用省略号:`同步中…`、`保存中…`。
- 数字用阿拉伯数字(`3 个模块`),避免营销式夸张词。

## Do / Don't

- ✅ 用灰阶排信息优先级:`1000` 主文字、`900` 次要、`700` 提示。
- ✅ 强调蓝只留给状态和一处最重要动作。
- ✅ 守住 AA 对比;每个可交互元素 `:focus-visible` 都显示焦点环。
- ✅ 用语义类名(`slate-*`/`blue-600`),不写裸 hex。改色去 `tailwind.config.ts`。
- ⛔ 不要只用颜色表状态——配图标或文字。
- ⛔ 不要把 `slate-50`(次级面)当通用填充乱用。
- ⛔ 不要在一个视图里混圆角与直角、或用超过两种字重。
- ⛔ 不要引入表外色板(`indigo`/`zinc`/`emerald`…)或 `next/font` 之外的字体绕过本系统。

## 暗色主题(未实现)

当前只交付 Light。若要做 Dark,沿用 Geist 思路:**同名 class、不同值**——在 `tailwind.config.ts` 用 `dark:` 变体或 CSS 变量再覆盖一套 token,组件无需改类名。届时本文增补 `design.dark.md`。
