import { prisma } from "@/lib/db";
import { NEUTRAL, ACTIVE_FALLBACK } from "@/lib/colors";

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
    prisma.feature.findMany({ where: { projectId }, orderBy: { title: "asc" } }),
    prisma.decision.findMany({ where: { projectId }, orderBy: { decidedAt: "desc" } }),
  ]);
  return { project, modules, edges, users, features, decisions };
}

/** 名字 → 高亮色 的映射;模块按 ownerName 取色。 */
export function buildColorMap(users: { name: string; color: string }[]): Map<string, string> {
  return new Map(users.map((u) => [u.name, u.color]));
}

export function colorFor(ownerName: string | null | undefined, colorMap: Map<string, string>): string {
  if (!ownerName) return NEUTRAL;
  return colorMap.get(ownerName) ?? NEUTRAL;
}

export type ModuleHighlight = { active: boolean; color: string; doers: string[] };

// 高亮逻辑:模块若有 doing 状态的 feature → 取该 feature 负责人(无则模块负责人)的色;否则中性灰。
// 即"颜色 = 正在做的东西",由 BOARD.md 的 feature 状态自动驱动,不靠手点。
export function computeHighlights(
  modules: { key: string; ownerName: string | null }[],
  features: { moduleKey: string | null; status: string; ownerName: string | null }[],
  colorMap: Map<string, string>,
): Map<string, ModuleHighlight> {
  const result = new Map<string, ModuleHighlight>();
  for (const m of modules) {
    const doing = features.filter((f) => f.status === "doing" && f.moduleKey === m.key);
    const doers = Array.from(new Set(doing.map((f) => f.ownerName).filter(Boolean))) as string[];
    if (doing.length === 0) {
      result.set(m.key, { active: false, color: NEUTRAL, doers: [] });
    } else {
      const owner = doers[0] ?? m.ownerName ?? null;
      const color = (owner && colorMap.get(owner)) || ACTIVE_FALLBACK;
      result.set(m.key, { active: true, color, doers });
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
