import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getModuleByKey, getPrimaryProject } from "@/lib/data";
import { Markdown } from "@/components/Markdown";

export const dynamic = "force-dynamic";

type Fn = { name: string; note?: string };

const STATUS_LABEL: Record<string, string> = {
  todo: "待办",
  doing: "进行中",
  done: "完成",
  accepted: "已采纳",
  proposed: "提议",
  superseded: "已废弃",
};

const STATUS_CLASS: Record<string, string> = {
  todo: "bg-slate-100 text-slate-600",
  doing: "bg-amber-50 text-amber-700",
  done: "bg-green-100 text-green-700",
  accepted: "bg-green-100 text-green-700",
  proposed: "bg-amber-100 text-amber-700",
  superseded: "bg-slate-200 text-slate-500 line-through",
};

export default async function ModulePage({ params }: { params: { key: string } }) {
  const key = decodeURIComponent(params.key);
  const project = await getPrimaryProject();
  if (!project) notFound();

  const data = await getModuleByKey(project.id, key);
  if (!data) notFound();
  const { mod, features, decisions, edgesOut, edgesIn } = data;

  const upstream = edgesIn.filter((edge) => edge.kind === "flow").map((edge) => edge.from);
  const downstream = edgesOut.filter((edge) => edge.kind === "flow").map((edge) => edge.to);
  const dependsOut = edgesOut.filter((edge) => edge.kind === "depends").map((edge) => edge.to);
  const dependsIn = edgesIn.filter((edge) => edge.kind === "depends").map((edge) => edge.from);
  const onChain = upstream.length > 0 || downstream.length > 0;

  let functions: Fn[] = [];
  try {
    functions = JSON.parse(mod.functions) as Fn[];
  } catch {
    functions = [];
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] px-5 py-6 lg:px-8 lg:py-7">
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-slate-800">
          <ArrowLeft size={15} /> 返回看板
        </Link>
        <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
        <span>参考总览</span>
      </div>

      <header className={`mt-5 gap-8 border-b pb-6 ${mod.boundary ? "grid lg:grid-cols-2" : ""}`}>
        <div>
          <div className="text-xs font-medium text-slate-500">模块身份</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{mod.title}</h1>
          <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-500">模块键</dt>
              <dd className="font-mono text-blue-600">{mod.key}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500">负责人</dt>
              <dd className="text-slate-700">{mod.ownerName ?? "未认领"}</dd>
            </div>
          </dl>
          {mod.summary && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700">{mod.summary}</p>}
        </div>

        {mod.boundary && (
          <aside className="border-l border-slate-200 pl-0 lg:pl-6">
            <h2 className="text-sm font-semibold text-slate-800">边界与约束</h2>
            <p className="mt-3 whitespace-pre-wrap rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
              {mod.boundary}
            </p>
          </aside>
        )}
      </header>

      <div className="grid gap-8 py-7 lg:grid-cols-2 lg:gap-12">
        <div className="min-w-0 space-y-8">
          <Section title="工艺流程位置">
            {onChain ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
                  <FlowGroup label="上游 · 喂数据给我" mods={upstream} empty="管线起点" align="end" />
                  <ArrowRight size={18} className="shrink-0 self-center text-slate-300" />
                  <div className="flex min-w-[166px] shrink-0 flex-col justify-center rounded-lg border-2 border-blue-300 bg-white px-4 py-3">
                    <div className="text-[11px] font-medium text-blue-600">本模块</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{mod.title}</div>
                    <div className="font-mono text-[11px] text-slate-400">{mod.key}</div>
                  </div>
                  <ArrowRight size={18} className="shrink-0 self-center text-slate-300" />
                  <FlowGroup label="下游 · 用我的产出" mods={downstream} empty="管线终点" align="start" />
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">共享旁路</span>
                不在工艺主链上 —— 被多个模块调用的公共能力。
              </p>
            )}
          </Section>

            <Section title="功能清单与状态">
            {features.length === 0 ? (
              <p className="text-sm text-slate-400">暂无功能记录</p>
            ) : (
              <div className="overflow-hidden border-y border-slate-200 text-sm">
                <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] gap-4 border-b border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
                  <span>功能项</span>
                  <span>说明</span>
                  <span>状态</span>
                </div>
                {features.map((feature) => (
                  <div key={feature.id} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-200 px-3 py-3 last:border-b-0">
                    <span className="min-w-0 text-slate-700">{feature.title}</span>
                    <span className="min-w-0 text-slate-500">{feature.body || "—"}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[feature.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {STATUS_LABEL[feature.status] ?? feature.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="接口与函数">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 text-xs text-slate-500">
                  <tr>
                    <th className="w-[42%] px-3 py-2 text-left font-normal">接口 / 数据</th>
                    <th className="px-3 py-2 text-left font-normal">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {functions.length > 0 ? (
                    functions.map((fn, index) => (
                      <tr key={index} className="border-t border-slate-200 last:border-0">
                        <td className="bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">{fn.name}</td>
                        <td className="px-3 py-2 text-slate-600">{fn.note}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-slate-200">
                      <td colSpan={2} className="px-3 py-3 text-slate-400">暂无接口与函数记录</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="min-w-0 space-y-8">
          <Section title="依赖与被依赖（代码级）">
            <div className="border-y border-slate-200">
              <DependencyRow label="依赖模块（仅直接）">
                {dependsOut.length > 0 ? <ModuleLinks mods={dependsOut} /> : "无"}
              </DependencyRow>
              <DependencyRow label="被依赖模块（直接）">
                {dependsIn.length > 0 ? <ModuleLinks mods={dependsIn} /> : "无"}
              </DependencyRow>
              <DependencyRow label="工艺链位置">
                {onChain ? "主链模块" : "共享旁路"}
              </DependencyRow>
            </div>
          </Section>

          <Section title="技术决策与设计要点">
            {decisions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">暂无技术决策</p>
            ) : (
              <div className="border-y border-slate-200">
                {decisions.map((decision) => (
                  <article key={decision.id} className="border-b border-slate-200 py-4 last:border-0">
                    <div className="flex items-start gap-2 text-sm font-semibold text-slate-800">
                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-normal ${STATUS_CLASS[decision.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABEL[decision.status] ?? decision.status}
                      </span>
                      <span>{decision.title}</span>
                    </div>
                    {decision.body && <div className="mt-2"><Markdown>{decision.body}</Markdown></div>}
                  </article>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {mod.doc && (
        <section className="border-t pt-7">
          <Section title="模块文档">
            <Markdown>{mod.doc}</Markdown>
          </Section>
        </section>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function DependencyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[148px_minmax(0,1fr)] border-b border-slate-200 last:border-b-0">
      <div className="bg-slate-50 px-3 py-2 text-xs text-slate-500">{label}</div>
      <div className="px-3 py-2 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function ModuleLinks({ mods }: { mods: { key: string; title: string }[] }) {
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-1">
      {mods.map((mod) => (
        <Link key={mod.key} href={`/module/${encodeURIComponent(mod.key)}`} className="font-mono text-slate-600 hover:text-blue-600 hover:underline">
          {mod.key}
        </Link>
      ))}
    </span>
  );
}

function FlowGroup({
  label,
  mods,
  empty,
  align,
}: {
  label: string;
  mods: { key: string; title: string }[];
  empty: string;
  align: "start" | "end";
}) {
  if (mods.length === 0) {
    return (
      <div className="flex min-w-[116px] shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-200 px-3 text-xs text-slate-300">
        {empty}
      </div>
    );
  }
  return (
    <div className={`flex shrink-0 flex-col gap-1.5 ${align === "end" ? "items-end" : "items-start"}`}>
      <div className="text-[11px] text-slate-400">{label}</div>
      {mods.map((mod) => (
        <Link
          key={mod.key}
          href={`/module/${encodeURIComponent(mod.key)}`}
          className="block min-w-[142px] rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-slate-300 hover:bg-slate-50"
        >
          <div className="text-sm font-medium text-slate-800">{mod.title}</div>
          <div className="font-mono text-[11px] text-slate-400">{mod.key}</div>
        </Link>
      ))}
    </div>
  );
}
