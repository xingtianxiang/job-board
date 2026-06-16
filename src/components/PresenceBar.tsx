"use client";
import { useEffect, useState, type FormEvent } from "react";

export type PresenceItem = {
  userId: string;
  name: string;
  color: string;
  currentTask: string;
  moduleKey: string | null;
  updatedAt: string | null;
};

export function PresenceBar({
  currentUserId,
  modules,
  initial,
}: {
  currentUserId: string;
  modules: { key: string; title: string }[];
  initial: PresenceItem[];
}) {
  const [list, setList] = useState<PresenceItem[]>(initial);
  const me = list.find((p) => p.userId === currentUserId);
  const [task, setTask] = useState(me?.currentTask ?? "");
  const [moduleKey, setModuleKey] = useState(me?.moduleKey ?? "");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const r = await fetch("/api/presence", { cache: "no-store" });
      if (r.ok) setList(await r.json());
    } catch {
      /* 忽略瞬时网络错误 */
    }
  }

  useEffect(() => {
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/presence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentTask: task, moduleKey: moduleKey || null }),
    });
    setSaving(false);
    refresh();
  }

  const others = list.filter((p) => p.userId !== currentUserId && p.currentTask.trim());

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">谁在做什么</span>

      {/* 我的状态:可编辑 */}
      <form onSubmit={save} className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full" style={{ background: me?.color ?? "#94a3b8" }} />
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="我正在做…"
          className="w-48 rounded border px-2 py-1 text-sm"
        />
        <select
          value={moduleKey}
          onChange={(e) => setModuleKey(e.target.value)}
          className="rounded border px-1.5 py-1 text-sm text-slate-600"
        >
          <option value="">(模块)</option>
          {modules.map((m) => (
            <option key={m.key} value={m.key}>
              {m.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "…" : "更新"}
        </button>
      </form>

      <div className="h-5 w-px bg-slate-200" />

      {/* 其他人 */}
      {others.length === 0 ? (
        <span className="text-sm text-slate-400">还没有其他人填写状态</span>
      ) : (
        others.map((p) => (
          <div key={p.userId} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
            <span className="text-sm font-medium text-slate-700">{p.name}</span>
            <span className="text-sm text-slate-500">{p.currentTask}</span>
            {p.moduleKey && (
              <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">{p.moduleKey}</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
