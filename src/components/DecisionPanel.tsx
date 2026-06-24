"use client";
import { useState } from "react";
import { Archive } from "lucide-react";
import { Markdown } from "./Markdown";

type Decision = { title: string; status: string; moduleKey: string | null; body: string };

const STATUS_STYLE: Record<string, string> = {
  accepted: "bg-green-100 text-green-700",
  proposed: "bg-amber-100 text-amber-700",
  superseded: "bg-slate-200 text-slate-500 line-through",
};

export function DecisionPanel({ decisions }: { decisions: Decision[] }) {
  // 乐观归档:本地记下已归档标题,立即从面板移除,PATCH 后台存(与 FeatureBoard 同款)
  const [archived, setArchived] = useState<Set<string>>(new Set());

  function archive(title: string) {
    setArchived((prev) => new Set(prev).add(title));
    void fetch("/api/decision", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, archived: true }),
    }).catch(() => {});
  }

  const items = decisions.filter((d) => !archived.has(d.title));
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">还没有技术决策。在 BOARD.md 的 decisions 里补充,或本地 sync 上来。</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((d) => (
        <div key={d.title} className="group rounded-lg border bg-white p-3">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[d.status] ?? STATUS_STYLE.accepted}`}>
              {d.status}
            </span>
            <span className="font-semibold text-slate-800">{d.title}</span>
            {d.moduleKey && (
              <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">{d.moduleKey}</span>
            )}
            <button
              onClick={() => archive(d.title)}
              title="归档"
              className="ml-auto shrink-0 text-slate-300 opacity-0 hover:text-slate-600 group-hover:opacity-100"
            >
              <Archive size={14} />
            </button>
          </div>
          {d.body && (
            <div className="mt-1.5 text-sm text-slate-600">
              <Markdown>{d.body}</Markdown>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
