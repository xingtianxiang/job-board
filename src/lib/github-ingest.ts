// GitHub 提交历史 —— 历史车道(additive history lane)的落库逻辑。
//
// 与"✎ 实时在改"信号【四不沾】:独立的表(Commit/CommitFile)、独立的 endpoint
// (/api/github-ingest)、独立的 handler、独立的 token(GITHUB_INGEST_TOKEN)。
// 本文件绝不读、也绝不写 Module.activeUsers,绝不调用 computeHighlights。
// 纯确定性,无 AI。每个 commit 按 (projectId, sha) 幂等 upsert;重推自愈。
import { prisma } from "@/lib/db";
import { fileMatchesPaths } from "@/lib/paths";
import { z } from "zod";

// 单条 commit。结构性字段必填(sha),其余缺省兜底(让坏 payload 走 400 而非 500)。
export const githubCommitSchema = z.object({
  sha: z.string().min(1),
  shortSha: z.string().optional().default(""),
  message: z.string().optional().default(""), // 可能多行,落库只取首行
  authorName: z.string().optional().default(""),
  authorEmail: z.string().optional().default(""),
  authorLogin: z.string().nullish(), // 对应 User.githubLogin;git log 通常给不出,留空
  committedAt: z.string().optional().default(""), // ISO 字符串;坏/缺时 applyGithubCommits 兜底 now
  files: z.array(z.string()).optional().default([]),
});

export const githubPayloadSchema = z.object({
  repo: z.string().optional(), // owner/repo;存在则路由做 repo→project 绑定校验
  branch: z.string().optional().default(""),
  pushedBy: z.string().optional(),
  commits: z.array(githubCommitSchema),
});

export type GithubPayload = z.infer<typeof githubPayloadSchema>;

/** 落库一批 GitHub 提交。project 只需 id。返回计数(commits / files / 未命中模块数)。 */
export async function applyGithubCommits(project: { id: string }, payload: GithubPayload) {
  // 一次性把各模块的 paths glob 读出来(只读 key + paths,绝不碰 activeUsers),
  // 复用现有 fileMatchesPaths 做"文件 → 模块"归属。
  const modules = await prisma.module.findMany({
    where: { projectId: project.id },
    select: { key: true, paths: true },
  });
  const moduleGlobs = modules.map((m) => {
    let globs: string[] = [];
    try {
      globs = JSON.parse(m.paths) as string[];
    } catch {
      globs = [];
    }
    return { key: m.key, globs };
  });

  let upserted = 0;
  let fileRows = 0;
  let unattributed = 0;

  for (const c of payload.commits) {
    // 正斜杠归一(Action 已归一,这里再兜底一次)+ 去空。
    const files = (Array.isArray(c.files) ? c.files : [])
      .map((f) => String(f).replace(/\\/g, "/").trim())
      .filter(Boolean);

    // 归属:任一改动文件命中模块 glob,则该模块 key 进 moduleKeys(每模块至多一次)。
    const hitKeys = moduleGlobs
      .filter((m) => m.globs.length && files.some((f) => fileMatchesPaths(f, m.globs)))
      .map((m) => m.key);
    if (hitKeys.length === 0) unattributed++;

    // committedAt 防御:坏/缺时间戳兜底为 now(照抄 ingest.ts 的 decidedAt 守卫)。
    const parsed = c.committedAt ? new Date(c.committedAt) : null;
    const committedAt = parsed && !isNaN(parsed.getTime()) ? parsed : new Date();

    const data = {
      shortSha: c.shortSha || c.sha.slice(0, 7),
      branch: payload.branch ?? "",
      message: (c.message ?? "").split(/\r?\n/)[0], // 只存首行
      authorName: c.authorName ?? "",
      authorEmail: c.authorEmail ?? "",
      authorLogin: c.authorLogin ?? null,
      committedAt,
      moduleKeys: JSON.stringify(hitKeys),
    };

    // 按 (projectId, sha) 幂等 upsert。
    const commit = await prisma.commit.upsert({
      where: { projectId_sha: { projectId: project.id, sha: c.sha } },
      create: { projectId: project.id, sha: c.sha, ...data },
      update: data,
    });

    // CommitFile 行:delete + recreate(重推自愈)。
    await prisma.commitFile.deleteMany({ where: { commitId: commit.id } });
    if (files.length) {
      await prisma.commitFile.createMany({ data: files.map((path) => ({ commitId: commit.id, path })) });
      fileRows += files.length;
    }
    upserted++;
  }

  // 让"没命中任何模块"可见(§5 坑4)。
  if (unattributed) {
    console.warn(
      `[github-ingest] ${unattributed}/${payload.commits.length} 个 commit 未命中任何模块(moduleKeys 为空)`,
    );
  }

  return { commits: upserted, files: fileRows, unattributed };
}
