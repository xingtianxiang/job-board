"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPrimaryProject } from "@/lib/data";
import { SESSION_COOKIE } from "@/lib/auth";

export async function createIdentity(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "");
  const modules = formData.getAll("modules").map(String);

  if (!name || !color) redirect("/onboarding?e=missing");

  const required = process.env.TEAM_PASSCODE ?? "";
  if (required && passcode !== required) redirect("/onboarding?e=passcode");

  // 还没 sync 过项目时,创建一个占位项目,身份照样能先建
  const project = await getPrimaryProject();
  const projectId =
    project?.id ?? (await prisma.project.create({ data: { slug: "default", name: "我的项目" } })).id;

  const user = await prisma.user.upsert({
    where: { projectId_name: { projectId, name } },
    create: { projectId, name, color },
    update: { color },
  });

  // 认领模块:把所选模块的负责人设为我(高亮成我的色)
  if (modules.length) {
    await prisma.module.updateMany({
      where: { projectId, key: { in: modules } },
      data: { ownerName: name },
    });
  }

  cookies().set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}
