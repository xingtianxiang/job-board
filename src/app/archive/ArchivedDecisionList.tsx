"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";

type D = { title: string; status: string; moduleKey: string | null };

const STATUS_STYLE: Record<string, string> = {
  accepted: "bg-green-100 text-green-700",
  proposed: "bg-amber-100 text-amber-700",
  superseded: "bg-slate-200 text-slate-500 line-through",
};

export function ArchivedDecisionList({ decisions }: { decisions: D[] }) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  function unarchive(title: string) {
    setRemoved((prev) => new Set(prev).add(title));
    void fetch("/api/decision", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, archived: false }),
    }).catch(() => {});
  }

  const items = decisions.filter((d) => !removed.has(d.title));
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">暂无归档决策。</p>;
  }

  return (
    <div className="space-y-1.5">
      {items.map((d) => (
        <div key={d.title} className="flex items-center justify-between rounded-md border bg-white p-2.5">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[d.status] ?? STATUS_STYLE.accepted}`}>
              {d.status}
            </span>
            <span className="text-sm text-slate-800">{d.title}</span>
            {d.moduleKey && (
              <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">{d.moduleKey}</span>
            )}
          </div>
          <button
            onClick={() => unarchive(d.title)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
          >
            <RotateCcw size={13} /> 取消归档
          </button>
        </div>
      ))}
    </div>
  );
}
