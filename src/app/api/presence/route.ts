import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getPrimaryProject } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const project = await getPrimaryProject();
  if (!project) return NextResponse.json([]);
  const users = await prisma.user.findMany({
    where: { projectId: project.id },
    include: { presence: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(
    users.map((u) => ({
      userId: u.id,
      name: u.name,
      color: u.color,
      currentTask: u.presence?.currentTask ?? "",
      moduleKey: u.presence?.moduleKey ?? null,
      updatedAt: u.presence?.updatedAt?.toISOString() ?? null,
    })),
  );
}

export async function POST(req: NextRequest) {
  const uid = cookies().get(SESSION_COOKIE)?.value;
  if (!uid) return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });

  let body: { currentTask?: string; moduleKey?: string | null };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const currentTask = String(body.currentTask ?? "").slice(0, 200);
  const moduleKey = body.moduleKey ? String(body.moduleKey) : null;

  await prisma.presence.upsert({
    where: { userId: uid },
    create: { userId: uid, currentTask, moduleKey },
    update: { currentTask, moduleKey },
  });
  return NextResponse.json({ ok: true });
}
