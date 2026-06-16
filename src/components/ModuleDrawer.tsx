"use client";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { tint } from "@/lib/colors";

export type DrawerItem = { title: string; status: string };
export type DrawerData = {
  key: string;
  title: string;
  summary: string;
  boundary: string;
  ownerName: string | null;
  color: string;
  features: DrawerItem[];
  decisions: DrawerItem[];
};

export function ModuleDrawer({
  data,
  onClose,
}: {
  data: DrawerData | null;
  onClose: () => void;
}) {
  if (!data) return null;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-40 flex w-[380px] max-w-[90vw] flex-col border-l bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b p-4" style={{ background: tint(data.color, 0.1) }}>
          <div>
            <div className="text-xs text-slate-500">模块</div>
            <h2 className="text-lg font-bold text-slate-900">{data.title}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: data.color }} />
              <span className="text-slate-600">{data.ownerName ?? "未认领"}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-black/5 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          {data.boundary && (
            <section>
              <h3 className="mb-1 font-semibold text-slate-700">边界</h3>
              <p className="whitespace-pre-wrap rounded bg-amber-50 p-2 text-slate-700">{data.boundary}</p>
            </section>
          )}
          {data.summary && (
            <section>
              <h3 className="mb-1 font-semibold text-slate-700">简介</h3>
              <p className="whitespace-pre-wrap text-slate-700">{data.summary}</p>
            </section>
          )}
          <section>
            <h3 className="mb-1 font-semibold text-slate-700">进行中 / 功能</h3>
            {data.features.length === 0 ? (
              <p className="text-slate-400">暂无</p>
            ) : (
              <ul className="space-y-1">
                {data.features.map((f) => (
                  <li key={f.title} className="flex items-center gap-2">
                    <StatusDot status={f.status} />
                    <span className="text-slate-700">{f.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-semibold text-slate-700">相关技术决策</h3>
            {data.decisions.length === 0 ? (
              <p className="text-slate-400">暂无</p>
            ) : (
              <ul className="space-y-1">
                {data.decisions.map((d) => (
                  <li key={d.title} className="text-slate-700">
                    · {d.title} <span className="text-xs text-slate-400">({d.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="border-t p-3">
          <Link
            href={`/module/${encodeURIComponent(data.key)}`}
            className="flex items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            进入模块单页(完整文档 / 函数级) <ArrowRight size={15} />
          </Link>
        </div>
      </aside>
    </>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "done" ? "#16a34a" : status === "doing" ? "#ea580c" : "#94a3b8";
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}
