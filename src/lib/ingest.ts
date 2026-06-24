// 把 BOARD.md 原文落库 —— API 路由(/api/ingest)和 seed 共用同一份逻辑。
// 纯确定性,无 AI。按稳定键 upsert,保留人工数据(位置)。
// 另:根据本地 git 改动(changedFiles)+ 模块 paths,自动设置"谁在改哪个模块"的高亮。
import { prisma } from "@/lib/db";
import { parseBoardMarkdown, getBoardWarnings } from "@/lib/board-parse";
import { fileMatchesPaths } from "@/lib/paths";

function gridPos(i: number) {
  return { posX: (i % 4) * 230 + 40, posY: Math.floor(i / 4) * 150 + 40 };
}

export type GitInfo = { user?: string; email?: string; changedFiles?: string[] };

export async function applyBoardMarkdown(raw: string, git?: GitInfo) {
  const board = parseBoardMarkdown(raw);

  // 1) 项目
  const project = await prisma.project.upsert({
    where: { slug: board.project.slug },
    create: {
      slug: board.project.slug,
      name: board.project.name,
      techStack: board.project.techStack,
      lastSyncedAt: new Date(),
    },
    update: { name: board.project.name, techStack: board.project.techStack, lastSyncedAt: new Date() },
  });

  // 2) 模块:按 key upsert,保留位置;仅当 BOARD 显式给 owner 才覆盖(否则保留 UI 认领)
  const existing = await prisma.module.findMany({ where: { projectId: project.id } });
  const byKey = new Map(existing.map((m) => [m.key, m]));
  let newIdx = existing.length;
  for (const m of board.modules) {
    const prev = byKey.get(m.key);
    const pos = prev ? { posX: prev.posX, posY: prev.posY } : gridPos(newIdx++);
    await prisma.module.upsert({
      where: { projectId_key: { projectId: project.id, key: m.key } },
      create: {
        projectId: project.id,
        key: m.key,
        title: m.title,
        summary: m.summary,
        boundary: m.boundary,
        ownerName: m.owner ?? null,
        doc: m.doc,
        functions: JSON.stringify(m.functions),
        paths: JSON.stringify(m.paths),
        ...pos,
      },
      update: {
        title: m.title,
        summary: m.summary,
        boundary: m.boundary,
        doc: m.doc,
        functions: JSON.stringify(m.functions),
        paths: JSON.stringify(m.paths),
        ...(m.owner ? { ownerName: m.owner } : {}),
      },
    });
  }

  // prune:删掉 BOARD.md 里已不存在的模块(BOARD.md 即单一真源)。0 模块时不删,防误清。
  const keepKeys = board.modules.map((m) => m.key);
  if (keepKeys.length) {
    await prisma.module.deleteMany({ where: { projectId: project.id, key: { notIn: keepKeys } } });
  }

  // 3) 边:从 dependsOn 重建(代码依赖)+ 从 pipeline 重建(工艺流向)
  await prisma.moduleEdge.deleteMany({ where: { projectId: project.id } });
  const all = await prisma.module.findMany({ where: { projectId: project.id } });
  const keyToId = new Map(all.map((m) => [m.key, m.id]));
  const edgeData: { projectId: string; fromId: string; toId: string; kind: string }[] = [];
  for (const m of board.modules) {
    const fromId = keyToId.get(m.key);
    if (!fromId) continue;
    for (const dep of m.dependsOn) {
      const toId = keyToId.get(dep);
      if (toId) edgeData.push({ projectId: project.id, fromId, toId, kind: "depends" });
    }
  }
  // 工艺流:相邻 pipeline 成员之间连一条 flow 边(数据流向,与代码依赖无关、方向常相反)
  const chainKeys = board.pipeline.filter((k) => keyToId.has(k));
  for (let i = 0; i < chainKeys.length - 1; i++) {
    edgeData.push({
      projectId: project.id,
      fromId: keyToId.get(chainKeys[i])!,
      toId: keyToId.get(chainKeys[i + 1])!,
      kind: "flow",
    });
  }
  if (edgeData.length) await prisma.moduleEdge.createMany({ data: edgeData });

  // 3.5) 工艺流布局:声明了 pipeline 时由它接管位置 —— 主链横向一字排开,
  //      不在链里的模块(共享旁路)落到下面一排。未声明则保留 gridPos / 历史位置。
  if (chainKeys.length) {
    const sideKeys = all.map((m) => m.key).filter((k) => !chainKeys.includes(k));
    const layout = new Map<string, { posX: number; posY: number }>();
    chainKeys.forEach((k, i) => layout.set(k, { posX: i * 240 + 40, posY: 60 }));
    sideKeys.forEach((k, i) => layout.set(k, { posX: i * 240 + 40, posY: 320 }));
    for (const m of all) {
      const p = layout.get(m.key);
      if (p && (p.posX !== m.posX || p.posY !== m.posY)) {
        await prisma.module.update({ where: { id: m.id }, data: p });
      }
    }
  }

  // 4) 决策
  for (const d of board.decisions) {
    const parsed = d.decidedAt ? new Date(d.decidedAt) : null;
    const decidedAt = parsed && !isNaN(parsed.getTime()) ? parsed : null;
    await prisma.decision.upsert({
      where: { projectId_title: { projectId: project.id, title: d.title } },
      create: { projectId: project.id, title: d.title, status: d.status, moduleKey: d.module ?? null, body: d.body, decidedAt },
      update: { status: d.status, moduleKey: d.module ?? null, body: d.body, decidedAt },
    });
  }
  await prisma.decision.deleteMany({
    where: { projectId: project.id, title: { notIn: board.decisions.map((d) => d.title) } },
  });

  // 5) 功能:已改为【UI 自管】—— 功能卡在网页上增/删/改/派负责人、存 DB(见 /api/feature)。
  //    sync 故意【不再 upsert/prune 功能卡】:否则每 10 分钟的定时同步会拿 BOARD.md 把网页改动冲掉
  //    (加的被 prune 删、负责人被覆盖成 null)。BOARD.md 的 features 段仅留历史,不再驱动看板。
  const featureCount = await prisma.feature.count({ where: { projectId: project.id } });

  // 6) 按 git 改动自动高亮:在命中模块的 activeUsers 里【增量加上自己】;自己已不在改的模块只摘掉自己的条目
  //    (别人的条目不动)→ 支持一个模块多人在改、多分支多人互不覆盖。
  //    身份解析:git.email 优先、git.user 兜底(均规范化)→ 认到看板成员,存其【画布名】,
  //    这样颜色/名单永远对得上;匹配上且成员还没存 email 时自动学习,以后即便改名也认得出。
  let gitActive = 0;
  const gitUser = (git?.user ?? "").trim();
  const gitEmail = (git?.email ?? "").trim().toLowerCase();
  const changed = Array.isArray(git?.changedFiles)
    ? git!.changedFiles.map((f) => String(f).replace(/\\/g, "/"))
    : [];
  if (gitUser && changed.length) {
    // 解析画布身份。gitEmail 列可能还没 db push,查询失败时降级为只按 name 匹配,绝不阻断同步。
    const norm = (s: string) => s.trim().toLowerCase();
    let canonicalName = gitUser;
    let members: { id: string; name: string; gitEmail: string | null }[] = [];
    try {
      members = await prisma.user.findMany({
        where: { projectId: project.id },
        select: { id: true, name: true, gitEmail: true },
      });
    } catch {
      const tmp = await prisma.user.findMany({ where: { projectId: project.id }, select: { id: true, name: true } });
      members = tmp.map((u) => ({ id: u.id, name: u.name, gitEmail: null }));
    }
    let matched = gitEmail ? members.find((u) => u.gitEmail && norm(u.gitEmail) === gitEmail) : undefined;
    if (!matched) matched = members.find((u) => norm(u.name) === norm(gitUser));
    if (matched) {
      canonicalName = matched.name;
      // 学习 email:成员还没绑且这次带了 email → 记下来(列未迁移时静默跳过)
      if (gitEmail && !matched.gitEmail) {
        try {
          await prisma.user.update({ where: { id: matched.id }, data: { gitEmail } });
        } catch {
          /* gitEmail 列还没 db push,忽略 */
        }
      }
    }

    const mods = await prisma.module.findMany({ where: { projectId: project.id } });
    const nowIso = new Date().toISOString();
    const touched = new Set<string>();
    for (const m of mods) {
      let globs: string[] = [];
      try {
        globs = JSON.parse(m.paths) as string[];
      } catch {
        globs = [];
      }
      if (globs.length && changed.some((f) => fileMatchesPaths(f, globs))) touched.add(m.key);
    }
    for (const m of mods) {
      let list: { name: string; at: string }[] = [];
      try {
        list = JSON.parse(m.activeUsers) as { name: string; at: string }[];
      } catch {
        list = [];
      }
      // 摘掉自己的旧条目:画布名 + 原始 git 名都摘(覆盖"改名/首次认领"的过渡,避免留鬼影)
      const others = list.filter((e) => e && e.name !== canonicalName && e.name !== gitUser);
      const next = touched.has(m.key) ? [...others, { name: canonicalName, at: nowIso }] : others;
      const nextJson = JSON.stringify(next);
      if (nextJson !== m.activeUsers) {
        await prisma.module.update({ where: { id: m.id }, data: { activeUsers: nextJson } });
      }
    }
    gitActive = touched.size;
  }

  return {
    project: project.slug,
    counts: {
      modules: board.modules.length,
      edges: edgeData.length,
      decisions: board.decisions.length,
      features: featureCount,
      gitActive,
    },
    warnings: getBoardWarnings(board),
  };
}
