"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { NEUTRAL } from "@/lib/colors";

type F = { id: string; title: string; moduleKey: string | null; ownerName: string | null };

export function ArchivedList({
  features,
  colorOf,
  moduleOwnerByKey,
}: {
  features: F[];
  colorOf: Record<string, string>;
  moduleOwnerByKey: Record<string, string | null>;
}) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  function unarchive(id: string) {
    setRemoved((prev) => new Set(prev).add(id));
    void fetch("/api/feature", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, archived: false }),
    }).catch(() => {});
  }

  const items = features.filter((f) => !removed.has(f.id));
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">暂无归档项。</p>;
  }

  return (
    <div className="space-y-1.5">
      {items.map((f) => {
        const who = f.ownerName ?? (f.moduleKey ? moduleOwnerByKey[f.moduleKey] ?? null : null);
        return (
          <div key={f.id} className="flex items-center justify-between rounded-md border bg-white p-2.5">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: who ? colorOf[who] ?? NEUTRAL : "#e6e6e6" }}
              />
              <span className="text-sm text-slate-800">{f.title}</span>
              {f.moduleKey && (
                <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">{f.moduleKey}</span>
              )}
            </div>
            <button
              onClick={() => unarchive(f.id)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700"
            >
              <RotateCcw size={13} /> 取消归档
            </button>
          </div>
        );
      })}
    </div>
  );
}
