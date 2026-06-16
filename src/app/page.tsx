import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBoard, getPrimaryProject, buildColorMap, colorFor, computeHighlights } from "@/lib/data";
import { NEUTRAL } from "@/lib/colors";
import { Markdown } from "@/components/Markdown";
import { BoardClient } from "@/components/BoardClient";
import { ActivityBar, type ActivityItem } from "@/components/ActivityBar";
import { FeatureBoard } from "@/components/FeatureBoard";
import { DecisionPanel } from "@/components/DecisionPanel";
import type { MapModule, MapEdge } from "@/components/ModuleMap";
import type { DrawerData } from "@/components/ModuleDrawer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding");

  const project = await getPrimaryProject();
  if (!project) return <EmptyState />;

  const { modules, edges, users, features, decisions } = await getBoard(project.id);
  const colorMap = buildColorMap(users);
  const colorOf: Record<string, string> = Object.fromEntries(users.map((u) => [u.name, u.color]));
  const highlights = computeHighlights(modules, features, colorMap);
  const moduleTitleByKey: Record<string, string> = Object.fromEntries(modules.map((m) => [m.key, m.title]));
  const moduleOwnerByKey: Record<string, string | null> = Object.fromEntries(modules.map((m) => [m.key, m.ownerName]));

  const mapModules: MapModule[] = modules.map((m) => {
    const h = highlights.get(m.key);
    return {
      id: m.id,
      key: m.key,
      title: m.title,
      ownerName: m.ownerName,
      color: h?.color ?? NEUTRAL,
      active: h?.active ?? false,
      activeKind: h?.kind ?? null,
      activeBy: h?.activeBy ?? null,
      posX: m.posX,
      posY: m.posY,
    };
  });
  const mapEdges: MapEdge[] = edges.map((e) => ({ id: e.id, source: e.fromId, target: e.toId, kind: e.kind }));

  const drawerByKey: Record<string, DrawerData> = Object.fromEntries(
    modules.map((m) => [
      m.key,
      {
        key: m.key,
        title: m.title,
        summary: m.summary,
        boundary: m.boundary,
        ownerName: m.ownerName,
        color: highlights.get(m.key)?.color ?? colorFor(m.ownerName, colorMap),
        features: features
          .filter((f) => f.moduleKey === m.key)
          .map((f) => ({ title: f.title, status: f.status })),
        decisions: decisions
          .filter((d) => d.moduleKey === m.key)
          .map((d) => ({ title: d.title, status: d.status })),
      } satisfies DrawerData,
    ]),
  );

  // "谁在做什么":git 改动("X 在改 模块")+ doing 的 feature,都自动派生
  const gitActivity: ActivityItem[] = modules
    .filter((m) => highlights.get(m.key)?.kind === "git")
    .map((m) => {
      const by = highlights.get(m.key)!.activeBy!;
      return {
        title: "在改",
        moduleKey: m.key,
        moduleTitle: m.title,
        ownerName: by,
        color: colorOf[by] ?? NEUTRAL,
      };
    });
  const doingActivity: ActivityItem[] = features
    .filter((f) => f.status === "doing")
    .map((f) => ({
      title: f.title,
      moduleKey: f.moduleKey,
      moduleTitle: f.moduleKey ? moduleTitleByKey[f.moduleKey] ?? f.moduleKey : null,
      ownerName: f.ownerName,
      color: f.ownerName ? colorOf[f.ownerName] ?? NEUTRAL : NEUTRAL,
    }));
  const activity: ActivityItem[] = [...gitActivity, ...doingActivity];

  const members = users.map((u) => ({ name: u.name, color: u.color }));

  const lastSync = project.lastSyncedAt
    ? new Date(project.lastSyncedAt).toLocaleString("zh-CN")
    : "从未同步";

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b bg-white px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-bold text-slate-900">{project.name}</h1>
          <span className="text-xs text-slate-400">看板 · 最近同步:{lastSync}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: user.color }} />
            {user.name}
          </span>
          <Link href="/onboarding" className="text-xs text-slate-400 hover:text-slate-700">
            切换
          </Link>
        </div>
      </header>

      <ActivityBar items={activity} />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 border-b bg-slate-100">
            {modules.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                还没有模块。维护好 BOARD.md 后,本地 <code className="mx-1 rounded bg-white px-1">npm run sync</code> 上传即可成图。
              </div>
            ) : (
              <BoardClient modules={mapModules} edges={mapEdges} drawerByKey={drawerByKey} members={members} />
            )}
          </div>
          <div className="h-[34%] overflow-y-auto p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">产品功能与状态</h2>
              <Link href="/archive" className="text-xs text-slate-400 hover:text-slate-700">
                已归档 →
              </Link>
            </div>
            <FeatureBoard
              features={features.map((f) => ({
                title: f.title,
                status: f.status,
                moduleKey: f.moduleKey,
                ownerName: f.ownerName,
              }))}
              colorOf={colorOf}
              moduleOwnerByKey={moduleOwnerByKey}
            />
          </div>
        </div>

        <aside className="w-[360px] shrink-0 space-y-4 overflow-y-auto border-l bg-white p-3">
          {project.techStack && (
            <section className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <h2 className="mb-1 text-sm font-semibold text-blue-900">当前约定技术栈(钉住)</h2>
              <Markdown>{project.techStack}</Markdown>
            </section>
          )}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">统一技术方案 / 决策</h2>
            <DecisionPanel
              decisions={decisions.map((d) => ({
                title: d.title,
                status: d.status,
                moduleKey: d.moduleKey,
                body: d.body,
              }))}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-xl font-bold text-slate-800">还没有任何项目数据</h1>
      <p className="max-w-md text-sm text-slate-500">
        在你本地仓库里维护一个 <code className="rounded bg-slate-100 px-1">BOARD.md</code>(可用本地 AI 起草),
        然后在 weld-board 目录运行{" "}
        <code className="rounded bg-slate-100 px-1">npm run sync -- 路径/BOARD.md</code> 上传,这页就会出现模块地图。
      </p>
      <p className="text-xs text-slate-400">参考 weld-board/BOARD.sample.md</p>
    </div>
  );
}
