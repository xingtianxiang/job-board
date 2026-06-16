"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPrimaryProject } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";

function setSession(userId: string) {
  cookies().set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

// 点已有名字即登录
export async function loginAs(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirect("/onboarding");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/onboarding");
  setSession(user.id);
  redirect("/");
}

// 新增成员(第一次的人用):名字 + 高亮色
export async function createIdentity(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "");

  if (!name || !color) redirect("/onboarding?e=missing");

  const required = process.env.TEAM_PASSCODE ?? "";
  if (required && passcode !== required) redirect("/onboarding?e=passcode");

  const project = await getPrimaryProject();
  const projectId =
    project?.id ?? (await prisma.project.create({ data: { slug: "default", name: "我的项目" } })).id;

  const user = await prisma.user.upsert({
    where: { projectId_name: { projectId, name } },
    create: { projectId, name, color },
    update: { color },
  });

  setSession(user.id);
  redirect("/");
}
