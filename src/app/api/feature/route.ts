import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getPrimaryProject } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 归档 / 取消归档某个功能(按标题)。
export async function PATCH(req: NextRequest) {
  const uid = cookies().get(SESSION_COOKIE)?.value;
  if (!uid) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  let body: { title?: string; archived?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, error: "缺少 title" }, { status: 400 });
  const archived = Boolean(body.archived);

  const project = await getPrimaryProject();
  if (!project) return NextResponse.json({ ok: false, error: "无项目" }, { status: 404 });

  await prisma.feature.updateMany({
    where: { projectId: project.id, title },
    data: { archived },
  });
  return NextResponse.json({ ok: true });
}
