import { prisma } from "@/lib/db";
import { NEUTRAL, ACTIVE_FALLBACK } from "@/lib/colors";

// 分支"在改"的新鲜窗口:超过这个时长没动的分支视为僵尸,读取端不再点亮、查询也据此剪枝。
// 灭灯主要靠 GitHub Action 在 PR 合并/分支删除时删行(立刻);本窗口只兜"漏事件的僵尸分支"。
const BRANCH_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

/** 主项目:MVP 单项目,取第一个。无项目(还没 sync 过)返回 null。 */
export async function getPrimaryProject() {
  return prisma.project.findFirst({ orderBy: { slug: "asc" } });
}

/** 拉取看板一页所需的全部数据。 */
export async function getBoard(projectId: string) {
  const [project, modules, edges, users, features, decisions] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.module.findMany({ where: { projectId }, orderBy: { key: "asc" } }),
    prisma.moduleEdge.findMany({ where: { projectId } }),
    prisma.user.findMany({ where: { projectId }, include: { presence: true }, orderBy: { name: "asc" } }),
    prisma.feature.findMany({ where: { projectId, archived: false }, orderBy: { title: "asc" } }),
    prisma.decision.findMany({ where: { projectId }, orderBy: { decidedAt: "desc" } }),
  ]);
  return { project, modules, edges, users, features, decisions };
}

/** 最近提交流(历史车道)。按 committedAt 倒序。与实时高亮无关,只读 Commit 表。 */
export async function getRecentCommits(projectId: string, limit = 30) {
  return prisma.commit.findMany({
    where: { projectId },
    orderBy: { committedAt: "desc" },
    take: limit,
  });
}

/** 活跃分支雷达(驱动新版"在改"点灯①②)。只读 ActiveBranch 表,与历史车道/旧 diff 信号互不相干。 */
export async function getActiveBranches(projectId: string) {
  // 只拉新鲜窗口内的分支:吃上 @@index([projectId, lastActivityAt]),也避免僵尸行无限堆积拖慢首页。
  return prisma.activeBranch.findMany({
    where: { projectId, lastActivityAt: { gte: new Date(Date.now() - BRANCH_STALE_MS) } },
    orderBy: { lastActivityAt: "desc" },
  });
}

/** 已归档的功能(给 /archive 页面)。 */
export async function getArchivedFeatures(projectId: string) {
  return prisma.feature.findMany({
    where: { projectId, archived: true },
    orderBy: { title: "asc" },
  });
}

/** 名字 → 高亮色 的映射;模块按 ownerName 取色。 */
export function buildColorMap(users: { name: string; color: string }[]): Map<string, string> {
  return new Map(users.map((u) => [u.name, u.color]));
}

export function colorFor(ownerName: string | null | undefined, colorMap: Map<string, string>): string {
  if (!ownerName) return NEUTRAL;
  return colorMap.get(ownerName) ?? NEUTRAL;
}

export type ActiveUser = { name: string; at: string }; // at: 该人对这块最近一次改动的 ISO 时刻;"" 表示无时间(如 doing 派生)
export type ModuleHighlight = {
  active: boolean;
  color: string;
  activeUsers: ActiveUser[]; // 正在改这块的人(新鲜的),按最近改动倒序(最新在前)
  conflict: boolean; // ≥2 人在改 = 撞车
  activeBy: string | null; // 最近改动的那个人,给徽标用
  kind: "git" | "doing" | null;
};

// "✎ 在改" 是【实时】信号,不是"近期碰过"。sync(定时任务,约每 10min)只要发现你还有
// 命中该模块的改动、且机器醒着,就会续上 at;因此这个窗口只在"人停止 sync 后"才起作用——
// 它是【下班/合盖/休假的人】唯一的回收机制(别人的条目不会被他人 sync 摘掉,见 ingest.ts)。
// 2h:扛得过午休与待机,又能让今天收工的人到次日自然淡出。改这个数 = 改"在改"的含义。
const ACTIVE_CUTOFF_MS = 2 * 60 * 60 * 1000; // 2 小时

// 高亮逻辑(颜色 = 正在做的东西,自动派生,不靠手点):
//  1) git 改动:activeUsers 里仍新鲜(at 在 ACTIVE_CUTOFF_MS 窗口内)的人 → 高亮;≥2 人 = 冲突(撞车);优先级最高。
//  2) 否则若有 doing 的 feature → 取该 feature 负责人(无则模块负责人)的色。
//  3) 否则中性灰。
export function computeHighlights(
  modules: { key: string; ownerName: string | null; activeUsers?: string | null }[],
  features: { moduleKey: string | null; status: string; ownerName: string | null }[],
  colorMap: Map<string, string>,
): Map<string, ModuleHighlight> {
  const now = Date.now();
  const result = new Map<string, ModuleHighlight>();
  for (const m of modules) {
    let list: { name: string; at: string }[] = [];
    try {
      list = m.activeUsers ? (JSON.parse(m.activeUsers) as { name: string; at: string }[]) : [];
    } catch {
      list = [];
    }
    // 去重到"每人一条",保留其最近的 at;再按最近改动倒序 → activeBy/徽标取最新那个
    const latestByName = new Map<string, number>();
    for (const e of list) {
      if (!e || !e.at) continue;
      const ts = new Date(e.at).getTime();
      if (isNaN(ts) || now - ts >= ACTIVE_CUTOFF_MS) continue;
      const prev = latestByName.get(e.name);
      if (prev === undefined || ts > prev) latestByName.set(e.name, ts);
    }
    const fresh: ActiveUser[] = [...latestByName.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, ts]) => ({ name, at: new Date(ts).toISOString() }));

    if (fresh.length) {
      result.set(m.key, {
        active: true,
        color: colorMap.get(fresh[0].name) || ACTIVE_FALLBACK,
        activeUsers: fresh,
        conflict: fresh.length >= 2,
        activeBy: fresh[0].name,
        kind: "git",
      });
      continue;
    }

    const doing = features.filter((f) => f.status === "doing" && f.moduleKey === m.key);
    if (doing.length === 0) {
      result.set(m.key, { active: false, color: NEUTRAL, activeUsers: [], conflict: false, activeBy: null, kind: null });
    } else {
      const owner = doing.map((f) => f.ownerName).find(Boolean) ?? m.ownerName ?? null;
      result.set(m.key, {
        active: true,
        color: (owner && colorMap.get(owner)) || ACTIVE_FALLBACK,
        activeUsers: owner ? [{ name: owner, at: "" }] : [],
        conflict: false,
        activeBy: owner,
        kind: "doing",
      });
    }
  }
  return result;
}

// 新版"在改"点灯(① 提交衰减 + ② 分支/合并真相):从活跃分支雷达算,不读 Module.activeUsers。
//  1) 某模块被【最近 W 内还在动、且领先 main】的分支碰到 → 点亮该分支作者;≥2 个不同作者 = 撞车。优先级最高。
//  2) 否则若有 doing 的 feature → 取负责人色(与 computeHighlights 一致)。
//  3) 否则中性灰。
// 灭灯靠 GitHub Action 在 PR 合并/分支删除时删行(立刻);BRANCH_STALE_MS(见顶部)只兜"漏事件的僵尸分支"。
export function computeBranchHighlights(
  modules: { key: string; ownerName: string | null }[],
  features: { moduleKey: string | null; status: string; ownerName: string | null }[],
  activeBranches: { name: string; authorName: string; authorEmail: string; moduleKeys: string; lastActivityAt: Date }[],
  users: { name: string; gitEmail: string | null }[],
  colorMap: Map<string, string>,
): Map<string, ModuleHighlight> {
  const now = Date.now();
  // 认人口径与 ingest.ts 第6步严格一致:先按 git email 精确认成员,失败再按规范化画布名兜底,
  // 都认不到才退到原始 git 名。两级都收敛到【画布名】→ 颜色对得上,且同一个人(不同 email/身份)
  // 不会被算成两人(避免假撞车);旧 diff 信号正是这套两级匹配。
  const norm = (s: string) => (s || "").trim().toLowerCase();
  const emailToName = new Map<string, string>();
  const nameToCanonical = new Map<string, string>();
  for (const u of users) {
    if (u.gitEmail) emailToName.set(norm(u.gitEmail), u.name);
    nameToCanonical.set(norm(u.name), u.name);
  }
  const resolveName = (b: { authorEmail: string; authorName: string }) =>
    emailToName.get(norm(b.authorEmail)) ||
    nameToCanonical.get(norm(b.authorName)) ||
    b.authorName ||
    b.authorEmail ||
    "未知";

  // 模块 key →(作者名 → 最近活动 ms)。只算新鲜(W 内)的分支。
  const perModule = new Map<string, Map<string, number>>();
  for (const b of activeBranches) {
    const ts = b.lastActivityAt instanceof Date ? b.lastActivityAt.getTime() : new Date(b.lastActivityAt).getTime();
    if (isNaN(ts) || now - ts >= BRANCH_STALE_MS) continue;
    let keys: string[] = [];
    try {
      keys = JSON.parse(b.moduleKeys) as string[];
    } catch {
      keys = [];
    }
    if (!keys.length) continue;
    const name = resolveName(b);
    for (const k of keys) {
      let perAuthor = perModule.get(k);
      if (!perAuthor) perModule.set(k, (perAuthor = new Map()));
      const prev = perAuthor.get(name);
      if (prev === undefined || ts > prev) perAuthor.set(name, ts);
    }
  }

  const result = new Map<string, ModuleHighlight>();
  for (const m of modules) {
    const contrib = perModule.get(m.key);
    if (contrib && contrib.size) {
      const fresh: ActiveUser[] = [...contrib.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([name, ts]) => ({ name, at: new Date(ts).toISOString() }));
      result.set(m.key, {
        active: true,
        color: colorMap.get(fresh[0].name) || ACTIVE_FALLBACK,
        activeUsers: fresh,
        conflict: fresh.length >= 2,
        activeBy: fresh[0].name,
        kind: "git",
      });
      continue;
    }
    // doing fallback —— 与 computeHighlights 同款,保持行为一致
    const doing = features.filter((f) => f.status === "doing" && f.moduleKey === m.key);
    if (doing.length === 0) {
      result.set(m.key, { active: false, color: NEUTRAL, activeUsers: [], conflict: false, activeBy: null, kind: null });
    } else {
      const owner = doing.map((f) => f.ownerName).find(Boolean) ?? m.ownerName ?? null;
      result.set(m.key, {
        active: true,
        color: (owner && colorMap.get(owner)) || ACTIVE_FALLBACK,
        activeUsers: owner ? [{ name: owner, at: "" }] : [],
        conflict: false,
        activeBy: owner,
        kind: "doing",
      });
    }
  }
  return result;
}

/** 模块单页:按 key 取模块及其挂靠的 features/decisions。 */
export async function getModuleByKey(projectId: string, key: string) {
  const mod = await prisma.module.findUnique({
    where: { projectId_key: { projectId, key } },
  });
  if (!mod) return null;
  const [features, decisions, edgesOut, edgesIn, users] = await Promise.all([
    prisma.feature.findMany({ where: { projectId, moduleKey: key }, orderBy: { title: "asc" } }),
    prisma.decision.findMany({ where: { projectId, moduleKey: key }, orderBy: { decidedAt: "desc" } }),
    prisma.moduleEdge.findMany({ where: { fromId: mod.id }, include: { to: true } }),
    prisma.moduleEdge.findMany({ where: { toId: mod.id }, include: { from: true } }),
    prisma.user.findMany({ where: { projectId } }),
  ]);
  return { mod, features, decisions, edgesOut, edgesIn, users };
}
