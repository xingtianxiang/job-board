import { prisma } from "@/lib/db";
import { getPrimaryProject } from "@/lib/data";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "请填写名字并选择高亮色。",
  passcode: "团队口令不正确。",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { e?: string };
}) {
  const project = await getPrimaryProject();
  const members = project
    ? await prisma.user.findMany({
        where: { projectId: project.id },
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      })
    : [];
  const passcodeRequired = Boolean(process.env.TEAM_PASSCODE);
  const error = searchParams.e ? ERRORS[searchParams.e] : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">进入 {project?.name ?? "团队看板"}</h1>
        <p className="mb-4 mt-1 text-sm text-slate-500">点你的名字即可进入。第一次来就"新增成员"。</p>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <OnboardingForm members={members} passcodeRequired={passcodeRequired} />
      </div>
    </main>
  );
}
