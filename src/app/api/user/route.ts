import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// 删除成员。内部工具,onboarding 阶段(未登录)也能用。
// 同时清掉该名字在模块/功能上残留的负责人与"在改"标记,删得干净。
export async function DELETE(req: NextRequest) {
  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const userId = String(body.userId ?? "");
  if (!userId) return NextResponse.json({ ok: false, error: "缺少 userId" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ ok: true }); // 已经没了

  await prisma.user.delete({ where: { id: userId } }); // presence 级联删除
  await prisma.module.updateMany({
    where: { projectId: user.projectId, ownerName: user.name },
    data: { ownerName: null },
  });
  await prisma.module.updateMany({
    where: { projectId: user.projectId, activeUserName: user.name },
    data: { activeUserName: null, activeAt: null },
  });
  await prisma.feature.updateMany({
    where: { projectId: user.projectId, ownerName: user.name },
    data: { ownerName: null },
  });

  return NextResponse.json({ ok: true });
}
