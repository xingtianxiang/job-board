# weld-board · 团队看板

一个给小团队对齐「**模块边界 · 统一技术方案 · 谁在做什么 · 产品功能**」的轻量看板。
中间一张可交互的**模块地图**(节点颜色 = 负责人高亮),点节点弹抽屉,再点进**模块单页**可看完整文档 / 函数级。

数据只有一条来源:本地 `BOARD.md`(可用本地 AI 起草)→ `npm run sync` 上传。**网站后端不调用 AI。**

技术栈:Next.js 14(App Router)+ TypeScript + Prisma + React Flow + Tailwind。

---

## 1. 本地开发(Neon Postgres)

1. 在 [neon.tech](https://neon.tech) 建一个免费库,复制连接串。
2. `cp .env.example .env`,把 `DATABASE_URL` 填成 Neon 连接串(本地直接用 Neon,Windows 无需装 Docker)。

```bash
cd weld-board
npm install
npm run db:push          # 按 schema 在 Neon 建表
npm run dev              # http://localhost:3000
```

> 想纯本地离线(不连网)开发?把 `prisma/schema.prisma` 的 provider 改回 `sqlite`、`DATABASE_URL="file:./dev.db"`、再 `npm run db:push` 即可。

首次打开会跳到 `/onboarding`:填名字、选高亮色(没数据时还没有模块可勾)。

### 载入示例数据 / 上传你的看板

网站起着的时候,在**另一个终端**:

```bash
cd weld-board
npm run sync -- BOARD.sample.md          # 先用自带示例感受一下
# 或上传你真实项目的 BOARD.md:
npm run sync -- ../weld_KAIERDA/BOARD.md
```

刷新页面就能看到模块地图。再回 `/onboarding` 勾选「我负责的模块」,它们会高亮成你的色。

> `npm run sync` 自动从 `weld-board/.env` 读取 `BOARD_INGEST_TOKEN`,并附带本地 git 信息(分支 / commit / git user)。

---

## 2. BOARD.md 怎么写 / 怎么更新

格式见 [`BOARD.sample.md`](./BOARD.sample.md);生成/更新的**指令模板**见 [`BOARD_PROMPT.md`](./BOARD_PROMPT.md)(工具无关,Claude / Codex / Cursor 都能用)。

**更新流程(很轻):**
1. 在你的项目里对 AI 说:“按 BOARD_PROMPT.md 增量更新 BOARD.md”。它会读现有 BOARD.md,只改变化的部分。
2. 回 weld-board 目录 `npm run sync -- <你的项目>/BOARD.md`(线上加 `BOARD_URL`)。
3. 刷新看板即生效。

**关键约定:**
- 文件顶部一对 `---` 之间是 **YAML 结构化数据**(网站读这部分);下面正文随便写。
- **高亮 = 正在做的东西,自动派生**:把某个 feature 标成 `status: doing` 并写 `owner`,该模块就会在看板上自动高亮成那个人的颜色。不做了改回 `todo`/`done`。**这一行就是日常最常改的地方**,改完 sync 一下即可,不用在网页上点。
- 重跑 sync 安全:按 `key`/`title` 合并,**不会冲掉**你在网站上拖好的节点位置。
- “负责人”是模块旁的标签,可在 BOARD.md 写 `owner`,也可在看板抽屉里直接改派。

---

## 3. 部署到 Vercel + Neon(公网网址,免运维)

### 3.1 数据库:Neon Postgres

代码已是 Postgres 版,**无需改 schema**。

1. 在 [neon.tech](https://neon.tech) 建免费库,拿到连接串(形如 `postgresql://...?sslmode=require`)。
2. 本地 `.env` 和 Vercel 环境变量里的 `DATABASE_URL` 都填它。
3. 建表:本地 `npm run db:push` 跑一次(对着 Neon 库即可建好所有表)。

### 3.2 部署(两选一,都行)

- **A. GitHub + Vercel(推荐,push 即部署)**:把 `weld-board/` 推到一个**独立** GitHub 仓库 → 在 Vercel 导入 → 配置环境变量。
- **B. 本地直接上线(不碰 git)**:`npm i -g vercel` → `vercel --prod`。

### 3.3 Vercel 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | Neon 连接串 |
| `BOARD_INGEST_TOKEN` | 上传令牌(本地 `.env` 里要填同一个值) |
| `TEAM_PASSCODE` | 可选,整站口令;留空则不启用 |

> 部署后把 `BOARD_URL` 指向线上地址再 sync:
> `BOARD_URL=https://你的域名 npm run sync -- ../weld_KAIERDA/BOARD.md`
> (PowerShell:`$env:BOARD_URL="https://你的域名"; npm run sync -- ...`)

**无需** `ANTHROPIC_API_KEY` —— 后端不调用 AI。

---

## 4. 目录结构

```
src/app/            页面与 API(看板首页 / onboarding / 模块单页 / ingest / presence)
src/components/     ModuleMap(地图)· ModuleDrawer(抽屉)· PresenceBar · FeatureBoard · DecisionPanel
src/lib/            board-parse(BOARD.md 解析)· ingest(落库)· data(查询)· auth · db · colors
tools/board-sync/   本地上传脚本
prisma/schema.prisma 数据模型(单一真源)
BOARD.sample.md     示例看板源文件
```

## 5. 身份说明

当前为「**选名字 + 高亮色**」的轻量身份(cookie 记住)。`User.githubLogin` 字段与 `src/lib/auth.ts` 已为以后接 GitHub OAuth(Auth.js)预留,不必重构。
