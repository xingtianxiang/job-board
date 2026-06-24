import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getPrimaryProject } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["todo", "doing", "done"]);

// 功能卡为【UI 自管】(sync 不再 upsert/prune):增删改派都走这里,按稳定 id 操作。
// 登录校验沿用 SESSION_COOKIE;项目为 MVP 单项目。

async function authedProjectId(): Promise<{ projectId?: string; error?: NextResponse }> {
  const uid = cookies().get(SESSION_COOKIE)?.value;
  if (!uid) return { error: NextResponse.json({ ok: false, error: "未登录" }, { status: 401 }) };
  const project = await getPrimaryProject();
  if (!project) return { error: NextResponse.json({ ok: false, error: "无项目" }, { status: 404 }) };
  return { projectId: project.id };
}

// 新建。body: { title, status?, moduleKey?, ownerName?, body? }
export async function POST(req: NextRequest) {
  const { projectId, error } = await authedProjectId();
  if (error) return error;

  let b: { title?: string; status?: string; moduleKey?: string | null; ownerName?: string | null; body?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const title = String(b.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, error: "缺少标题" }, { status: 400 });
  const status = STATUSES.has(String(b.status)) ? String(b.status) : "todo";

  try {
    const created = await prisma.feature.create({
      data: {
        projectId: projectId!,
        title,
        status,
        moduleKey: b.moduleKey ? String(b.moduleKey) : null,
        ownerName: b.ownerName ? String(b.ownerName) : null,
        body: typeof b.body === "string" ? b.body : "",
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ ok: false, error: "已有同名功能卡" }, { status: 409 });
  }
}

// 改(部分字段,按 id)。body: { id, title?, status?, moduleKey?, ownerName?, body?, archived? }
export async function PATCH(req: NextRequest) {
  const { projectId, error } = await authedProjectId();
  if (error) return error;

  let b: {
    id?: string;
    title?: string;
    status?: string;
    moduleKey?: string | null;
    ownerName?: string | null;
    body?: string;
    archived?: boolean;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const id = String(b.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "缺少 id" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (b.title !== undefined) {
    const t = String(b.title).trim();
    if (!t) return NextResponse.json({ ok: false, error: "标题不能为空" }, { status: 400 });
    data.title = t;
  }
  if (b.status !== undefined && STATUSES.has(String(b.status))) data.status = String(b.status);
  if (b.moduleKey !== undefined) data.moduleKey = b.moduleKey ? String(b.moduleKey) : null;
  if (b.ownerName !== undefined) data.ownerName = b.ownerName ? String(b.ownerName) : null;
  if (b.body !== undefined) data.body = String(b.body);
  if (b.archived !== undefined) data.archived = Boolean(b.archived);
  if (Object.keys(data).length === 0) return NextResponse.json({ ok: false, error: "无可更新字段" }, { status: 400 });

  try {
    await prisma.feature.updateMany({ where: { projectId: projectId!, id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "改名撞了同名功能卡" }, { status: 409 });
  }
}

// 删(按 id)。body: { id }
export async function DELETE(req: NextRequest) {
  const { projectId, error } = await authedProjectId();
  if (error) return error;

  let b: { id?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const id = String(b.id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "缺少 id" }, { status: 400 });

  await prisma.feature.deleteMany({ where: { projectId: projectId!, id } });
  return NextResponse.json({ ok: true });
}
