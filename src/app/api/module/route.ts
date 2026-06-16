import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getPrimaryProject } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 在看板上改派模块负责人(只改 ownerName)。
export async function PATCH(req: NextRequest) {
  const uid = cookies().get(SESSION_COOKIE)?.value;
  if (!uid) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  let body: { key?: string; ownerName?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const key = String(body.key ?? "").trim();
  if (!key) return NextResponse.json({ ok: false, error: "缺少 key" }, { status: 400 });
  const ownerName = body.ownerName ? String(body.ownerName) : null;

  const project = await getPrimaryProject();
  if (!project) return NextResponse.json({ ok: false, error: "无项目" }, { status: 404 });

  await prisma.module.updateMany({
    where: { projectId: project.id, key },
    data: { ownerName },
  });
  return NextResponse.json({ ok: true });
}
