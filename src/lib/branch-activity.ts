// 活跃分支雷达的落库逻辑 —— 驱动"提交/分支在改"点灯(①②)。
//
// 与 /api/ingest(旧 diff 信号,写 Module.activeUsers)和 /api/github-ingest(历史车道,写 Commit)
// 【三不沾】:独立 endpoint(/api/branch-activity)、独立 token 复用 GITHUB_INGEST_TOKEN、只写 ActiveBranch。
// 由 GitHub Action 喂数:push → upsert(领先 main 的文件 → 命中模块);PR 合并 / 远端删除 → delete(立刻灭)。
// 纯确定性,无 AI。按 (projectId, name) 幂等。
import { prisma } from "@/lib/db";
import { fileMatchesPaths } from "@/lib/paths";
import { z } from "zod";

export const branchActivitySchema = z.object({
  repo: z.string().optional(), // owner/repo;存在则路由做 repo→project 绑定校验
  branch: z.string().min(1),
  deleted: z.boolean().optional().default(false), // true = 该分支合并/删除 → 删行(立刻灭)
  authorName: z.string().optional().default(""),
  authorEmail: z.string().optional().default(""),
  files: z.array(z.string()).optional().default([]), // 该分支领先 main 的文件(正斜杠归一)
  lastActivityAt: z.string().optional().default(""), // ISO;坏/缺时兜底 now
});

export type BranchActivityPayload = z.infer<typeof branchActivitySchema>;

/** 落库一条分支活动。project 只需 id。返回动作与命中模块数。 */
export async function applyBranchActivity(project: { id: string }, payload: BranchActivityPayload) {
  // 合并/删除:删这条分支的雷达行(不存在则幂等无操作)。
  if (payload.deleted) {
    await prisma.activeBranch.deleteMany({ where: { projectId: project.id, name: payload.branch } });
    return { action: "deleted" as const, branch: payload.branch, moduleHits: 0 };
  }

  // 文件 → 模块归属(复用 github-ingest 的同一套 fileMatchesPaths)。
  const modules = await prisma.module.findMany({
    where: { projectId: project.id },
    select: { key: true, paths: true },
  });
  const files = (Array.isArray(payload.files) ? payload.files : [])
    .map((f) => String(f).replace(/\\/g, "/").trim())
    .filter(Boolean);
  const hitKeys = modules
    .filter((m) => {
      let globs: string[] = [];
      try {
        globs = JSON.parse(m.paths) as string[];
      } catch {
        globs = [];
      }
      return globs.length && files.some((f) => fileMatchesPaths(f, globs));
    })
    .map((m) => m.key);

  // 一个已知模块都不命中(全是 docs/配置等)→ 不该点亮任何模块:删掉可能存在的旧行
  //(覆盖"曾命中、现已挪出所有模块"→ 灭灯),也不留一条永不点亮的空 moduleKeys 死行。
  if (hitKeys.length === 0) {
    await prisma.activeBranch.deleteMany({ where: { projectId: project.id, name: payload.branch } });
    return { action: "skipped" as const, branch: payload.branch, moduleHits: 0 };
  }

  // lastActivityAt 防御:坏/缺时兜底 now(照抄 github-ingest 的 committedAt 守卫)。
  const parsed = payload.lastActivityAt ? new Date(payload.lastActivityAt) : null;
  const lastActivityAt = parsed && !isNaN(parsed.getTime()) ? parsed : new Date();

  const data = {
    authorName: payload.authorName ?? "",
    authorEmail: (payload.authorEmail ?? "").toLowerCase(),
    moduleKeys: JSON.stringify(hitKeys),
    lastActivityAt,
  };

  await prisma.activeBranch.upsert({
    where: { projectId_name: { projectId: project.id, name: payload.branch } },
    create: { projectId: project.id, name: payload.branch, ...data },
    update: data,
  });

  return { action: "upserted" as const, branch: payload.branch, moduleHits: hitKeys.length };
}
