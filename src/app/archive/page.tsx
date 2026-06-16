import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getPrimaryProject, getArchivedFeatures } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ArchivedList } from "./ArchivedList";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");
  const project = await getPrimaryProject();
  if (!project) redirect("/");

  const [features, users, modules] = await Promise.all([
    getArchivedFeatures(project.id),
    prisma.user.findMany({ where: { projectId: project.id } }),
    prisma.module.findMany({ where: { projectId: project.id }, select: { key: true, ownerName: true } }),
  ]);
  const colorOf: Record<string, string> = Object.fromEntries(users.map((u) => [u.name, u.color]));
  const moduleOwnerByKey: Record<string, string | null> = Object.fromEntries(
    modules.map((m) => [m.key, m.ownerName]),
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> 返回看板
      </Link>
      <h1 className="mb-1 text-xl font-bold text-slate-900">已归档的完成项</h1>
      <p className="mb-4 text-sm text-slate-500">归档不影响 BOARD.md;重新 sync 不会取消归档。</p>
      <ArchivedList
        features={features.map((f) => ({ title: f.title, moduleKey: f.moduleKey, ownerName: f.ownerName }))}
        colorOf={colorOf}
        moduleOwnerByKey={moduleOwnerByKey}
      />
    </main>
  );
}
