"use client";
import { useState } from "react";
import { Archive } from "lucide-react";
import { NEUTRAL } from "@/lib/colors";

type Feature = { title: string; status: string; moduleKey: string | null; ownerName: string | null };

const COLUMNS: { key: string; label: string }[] = [
  { key: "todo", label: "待办" },
  { key: "doing", label: "进行中" },
  { key: "done", label: "完成" },
];

export function FeatureBoard({
  features,
  colorOf,
  moduleOwnerByKey,
}: {
  features: Feature[];
  colorOf: Record<string, string>;
  moduleOwnerByKey: Record<string, string | null>;
}) {
  // 乐观归档:本地记下已归档的标题,立即从"完成"列移除,PATCH 后台存
  const [archived, setArchived] = useState<Set<string>>(new Set());

  function archive(title: string) {
    setArchived((prev) => new Set(prev).add(title));
    void fetch("/api/feature", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, archived: true }),
    }).catch(() => {});
  }

  // 谁负责:功能自己的 owner 优先,否则跟所属模块的负责人
  function responsibleOf(f: Feature): string | null {
    return f.ownerName ?? (f.moduleKey ? moduleOwnerByKey[f.moduleKey] ?? null : null);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {COLUMNS.map((col) => {
        let items = features.filter((f) => f.status === col.key);
        if (col.key === "done") items = items.filter((f) => !archived.has(f.title));
        const isDone = col.key === "done";
        return (
          <div key={col.key} className="rounded-lg bg-slate-50 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-600">{col.label}</span>
              <div className="flex items-center gap-2">
                {isDone && items.length > 0 && (
                  <button
                    onClick={() => items.forEach((f) => archive(f.title))}
                    className="text-[11px] text-slate-400 hover:text-slate-700"
                  >
                    全部归档
                  </button>
                )}
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {items.map((f) => {
                const who = responsibleOf(f);
                return (
                  <div key={f.title} className="group rounded-md border bg-white p-2 shadow-sm">
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-sm text-slate-800">{f.title}</div>
                      {isDone && (
                        <button
                          onClick={() => archive(f.title)}
                          title="归档"
                          className="shrink-0 text-slate-300 opacity-0 hover:text-slate-600 group-hover:opacity-100"
                        >
                          <Archive size={14} />
                        </button>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: who ? colorOf[who] ?? NEUTRAL : "#e6e6e6" }}
                        />
                        {who ?? "未指派"}
                      </span>
                      {f.moduleKey && (
                        <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">{f.moduleKey}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && <div className="px-1 text-xs text-slate-300">—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
