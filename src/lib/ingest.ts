// 把 BOARD.md 原文落库 —— API 路由(/api/ingest)和 seed 共用同一份逻辑。
// 纯确定性,无 AI。按稳定键 upsert,保留人工数据(位置 / UI 认领的负责人)。
import { prisma } from "@/lib/db";
import { parseBoardMarkdown, getBoardWarnings } from "@/lib/board-parse";

function gridPos(i: number) {
  return { posX: (i % 4) * 230 + 40, posY: Math.floor(i / 4) * 150 + 40 };
}

export async function applyBoardMarkdown(raw: string) {
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
        ...pos,
      },
      update: {
        title: m.title,
        summary: m.summary,
        boundary: m.boundary,
        doc: m.doc,
        functions: JSON.stringify(m.functions),
        ...(m.owner ? { ownerName: m.owner } : {}),
      },
    });
  }

  // 3) 边:从 dependsOn 重建
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
  if (edgeData.length) await prisma.moduleEdge.createMany({ data: edgeData });

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

  // 5) 功能
  for (const f of board.features) {
    await prisma.feature.upsert({
      where: { projectId_title: { projectId: project.id, title: f.title } },
      create: { projectId: project.id, title: f.title, status: f.status, moduleKey: f.module ?? null, ownerName: f.owner ?? null, body: f.body },
      update: { status: f.status, moduleKey: f.module ?? null, ownerName: f.owner ?? null, body: f.body },
    });
  }

  return {
    project: project.slug,
    counts: {
      modules: board.modules.length,
      edges: edgeData.length,
      decisions: board.decisions.length,
      features: board.features.length,
    },
    warnings: getBoardWarnings(board),
  };
}
