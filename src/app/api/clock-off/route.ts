import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 收工:把【当前登录用户】自己的"在改"标记从本项目所有模块的 activeUsers 里摘掉。
// 只动 activeUsers(实时高亮),不碰 ownerName(负责人)、不碰提交历史 —— 一键清空"我现在在干的",归属与历史全保留。
// 按 name 精确匹配自己,别人的条目一律不动。摘除写法与 /api/user 的删人保持一致。
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  const mods = await prisma.module.findMany({ where: { projectId: user.projectId } });
  let cleared = 0;
  for (const m of mods) {
    let list: { name: string; at: string }[] = [];
    try {
      list = JSON.parse(m.activeUsers) as { name: string; at: string }[];
    } catch {
      continue;
    }
    const next = list.filter((e) => e && e.name !== user.name);
    if (next.length !== list.length) {
      await prisma.module.update({ where: { id: m.id }, data: { activeUsers: JSON.stringify(next) } });
      cleared++;
    }
  }

  return NextResponse.json({ ok: true, cleared });
}
