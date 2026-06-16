import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getModuleByKey, getPrimaryProject } from "@/lib/data";
import { Markdown } from "@/components/Markdown";

export const dynamic = "force-dynamic";

type Fn = { name: string; note?: string };

const STATUS_LABEL: Record<string, string> = { todo: "待办", doing: "进行中", done: "完成", accepted: "已采纳", proposed: "提议", superseded: "已废弃" };

export default async function ModulePage({ params }: { params: { key: string } }) {
  const key = decodeURIComponent(params.key);
  const project = await getPrimaryProject();
  if (!project) notFound();

  const data = await getModuleByKey(project.id, key);
  if (!data) notFound();
  const { mod, features, decisions, edgesOut, edgesIn } = data;

  let functions: Fn[] = [];
  try {
    functions = JSON.parse(mod.functions) as Fn[];
  } catch {
    functions = [];
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-6">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> 返回看板
      </Link>

      <div className="mb-4">
        <div className="text-xs text-slate-400">模块 · {mod.key}</div>
        <h1 className="text-2xl font-bold text-slate-900">{mod.title}</h1>
        <div className="mt-1 text-sm text-slate-600">负责人:{mod.ownerName ?? "未认领"}</div>
        {mod.summary && <p className="mt-2 text-slate-700">{mod.summary}</p>}
      </div>

      {mod.boundary && (
        <Section title="边界">
          <p className="whitespace-pre-wrap rounded-md bg-amber-50 p-3 text-sm text-slate-700">{mod.boundary}</p>
        </Section>
      )}

      {(edgesOut.length > 0 || edgesIn.length > 0) && (
        <Section title="依赖关系">
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-8">
            <div>
              <div className="mb-1 text-xs font-medium text-slate-400">依赖 →</div>
              {edgesOut.length === 0 ? (
                <span className="text-slate-400">无</span>
              ) : (
                edgesOut.map((e) => (
                  <Link key={e.id} href={`/module/${encodeURIComponent(e.to.key)}`} className="mr-2 text-blue-600 hover:underline">
                    {e.to.title}
                  </Link>
                ))
              )}
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-slate-400">← 被依赖</div>
              {edgesIn.length === 0 ? (
                <span className="text-slate-400">无</span>
              ) : (
                edgesIn.map((e) => (
                  <Link key={e.id} href={`/module/${encodeURIComponent(e.from.key)}`} className="mr-2 text-blue-600 hover:underline">
                    {e.from.title}
                  </Link>
                ))
              )}
            </div>
          </div>
        </Section>
      )}

      {mod.doc && (
        <Section title="文档">
          <Markdown>{mod.doc}</Markdown>
        </Section>
      )}

      {functions.length > 0 && (
        <Section title="函数级">
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <tbody>
                {functions.map((fn, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="w-1/2 bg-slate-50 px-3 py-1.5 font-mono text-[13px] text-slate-800">{fn.name}</td>
                    <td className="px-3 py-1.5 text-slate-600">{fn.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="功能">
        {features.length === 0 ? (
          <p className="text-sm text-slate-400">暂无</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {features.map((f) => (
              <li key={f.id} className="text-slate-700">
                <span className="mr-1 rounded bg-slate-100 px-1.5 text-xs text-slate-500">
                  {STATUS_LABEL[f.status] ?? f.status}
                </span>
                {f.title}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="技术决策">
        {decisions.length === 0 ? (
          <p className="text-sm text-slate-400">暂无</p>
        ) : (
          <div className="space-y-2">
            {decisions.map((d) => (
              <div key={d.id} className="rounded-md border bg-white p-3">
                <div className="text-sm font-semibold text-slate-800">
                  <span className="mr-1 rounded bg-slate-100 px-1.5 text-xs font-normal text-slate-500">
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                  {d.title}
                </div>
                {d.body && (
                  <div className="mt-1">
                    <Markdown>{d.body}</Markdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 border-b pb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}
