// 历史车道 endpoint —— 与 /api/ingest【四不沾】:独立 token(GITHUB_INGEST_TOKEN)、
// 独立 handler、只写 Commit/CommitFile。由 GitHub Action(push 时)POST 进来。
import { NextRequest, NextResponse } from "next/server";
import { applyGithubCommits, githubPayloadSchema } from "@/lib/github-ingest";
import { getPrimaryProject } from "@/lib/data";

export const dynamic = "force-dynamic";

// slug 归一:lowercase + 非字母数字 → 连字符。让 repo 名 "weld_KAIERDA" 对得上 slug "weld-kaierda"。
function normSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  const expected = process.env.GITHUB_INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "服务端未配置 GITHUB_INGEST_TOKEN" }, { status: 500 });
  }
  if (req.headers.get("x-github-token") !== expected) {
    return NextResponse.json({ ok: false, error: "令牌不正确" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }

  // zod 校验:坏 payload 返回 400(而非 500)。
  const parsed = githubPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload 不合法", detail: parsed.error.issues }, { status: 400 });
  }
  const payload = parsed.data;

  const project = await getPrimaryProject();
  if (!project) {
    return NextResponse.json({ ok: false, error: "还没有任何项目(先 sync 一次 BOARD.md)" }, { status: 409 });
  }

  // repo→project 绑定(§5 坑4):payload.repo 存在则断言匹配单个项目 slug,否则 400。
  if (payload.repo) {
    const repoName = payload.repo.split("/").pop() ?? "";
    if (repoName && normSlug(repoName) !== normSlug(project.slug)) {
      return NextResponse.json(
        { ok: false, error: `repo「${payload.repo}」与当前项目「${project.slug}」不匹配` },
        { status: 400 },
      );
    }
  }

  try {
    const counts = await applyGithubCommits(project, payload);
    return NextResponse.json({ ok: true, project: project.slug, counts });
  } catch (e) {
    console.error("github-ingest 失败", e);
    return NextResponse.json({ ok: false, error: "服务端处理失败" }, { status: 500 });
  }
}
