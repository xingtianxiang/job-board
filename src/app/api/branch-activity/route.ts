// 活跃分支雷达 endpoint —— 驱动"提交/分支在改"点灯(①②)。
// 与 /api/ingest、/api/github-ingest【三不沾】:复用 GITHUB_INGEST_TOKEN 鉴权,只写 ActiveBranch。
// 由 GitHub Action(push / PR-merged / delete)POST 进来。
import { NextRequest, NextResponse } from "next/server";
import { applyBranchActivity, branchActivitySchema } from "@/lib/branch-activity";
import { getPrimaryProject } from "@/lib/data";

export const dynamic = "force-dynamic";

// slug 归一:让 repo 名 "weld_KAIERDA" 对得上 slug "weld-kaierda"(与 github-ingest 一致)。
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

  const parsed = branchActivitySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "payload 不合法", detail: parsed.error.issues }, { status: 400 });
  }
  const payload = parsed.data;

  const project = await getPrimaryProject();
  if (!project) {
    return NextResponse.json({ ok: false, error: "还没有任何项目(先 sync 一次 BOARD.md)" }, { status: 409 });
  }

  // repo→project 绑定:payload.repo 存在则断言匹配单个项目 slug,否则 400(与 github-ingest 一致)。
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
    const result = await applyBranchActivity(project, payload);
    return NextResponse.json({ ok: true, project: project.slug, ...result });
  } catch (e) {
    console.error("branch-activity 失败", e);
    return NextResponse.json({ ok: false, error: "服务端处理失败" }, { status: 500 });
  }
}
