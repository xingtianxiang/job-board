import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getPrimaryProject, getArchivedFeatures, getArchivedDecisions } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ArchivedList } from "./ArchivedList";
import { ArchivedDecisionList } from "./ArchivedDecisionList";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");
  const project = await getPrimaryProject();
  if (!project) redirect("/");

  const [features, decisions, users, modules] = await Promise.all([
    getArchivedFeatures(project.id),
    getArchivedDecisions(project.id),
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
      <h1 className="mb-1 text-xl font-bold text-slate-900">已归档</h1>
      <p className="mb-4 text-sm text-slate-500">归档不影响 BOARD.md;重新 sync 不会取消归档。</p>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-700">完成项</h2>
        <ArchivedList
          features={features.map((f) => ({ id: f.id, title: f.title, moduleKey: f.moduleKey, ownerName: f.ownerName }))}
          colorOf={colorOf}
          moduleOwnerByKey={moduleOwnerByKey}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">技术决策</h2>
        <ArchivedDecisionList
          decisions={decisions.map((d) => ({ title: d.title, status: d.status, moduleKey: d.moduleKey }))}
        />
      </section>
    </main>
  );
}
