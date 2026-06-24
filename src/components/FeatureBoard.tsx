"use client";
import { useState } from "react";
import { Archive, Plus, Trash2, Pencil, Check } from "lucide-react";
import { NEUTRAL } from "@/lib/colors";

type Feature = {
  id: string;
  title: string;
  status: string;
  moduleKey: string | null;
  ownerName: string | null;
  body: string;
};
type Member = { name: string; color: string };
type Mod = { key: string; title: string };

const COLUMNS: { key: string; label: string }[] = [
  { key: "todo", label: "待办" },
  { key: "doing", label: "进行中" },
  { key: "done", label: "完成" },
];

export function FeatureBoard({
  features: initial,
  members,
  modules,
  colorOf,
  moduleOwnerByKey,
}: {
  features: Feature[];
  members: Member[];
  modules: Mod[];
  colorOf: Record<string, string>;
  moduleOwnerByKey: Record<string, string | null>;
}) {
  // 功能卡为 UI 自管:本地保存一份可变副本,改动乐观先行、再 PATCH/POST/DELETE 落库。
  const [features, setFeatures] = useState<Feature[]>(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [busy, setBusy] = useState(false);
  // 拖拽改状态:draggingId = 正在拖的卡,dragOverCol = 当前悬停高亮的列
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // 谁负责:功能自己的 owner 优先,否则跟所属模块的负责人
  function responsibleOf(f: Feature): string | null {
    return f.ownerName ?? (f.moduleKey ? moduleOwnerByKey[f.moduleKey] ?? null : null);
  }

  async function api(method: string, body: unknown): Promise<{ ok?: boolean; id?: string; error?: string }> {
    const res = await fetch("/api/feature", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json().catch(() => ({ ok: res.ok }));
  }

  async function addFeature(status: string) {
    const title = addTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    const r = await api("POST", { title, status }).catch(() => null);
    setBusy(false);
    if (r?.ok && r.id) {
      setFeatures((prev) => [...prev, { id: r.id!, title, status, moduleKey: null, ownerName: null, body: "" }]);
      setAddTitle("");
      setAddingCol(null);
    } else {
      alert(r?.error ?? "添加失败");
    }
  }

  // 三个乐观操作都做失败回滚:本地先改、API 失败则还原并提示,避免"看着成功了其实没落库"。
  function saveEdit(id: string, patch: Partial<Feature>) {
    const before = features.find((f) => f.id === id);
    setFeatures((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setEditingId(null);
    void api("PATCH", { id, ...patch })
      .then((r) => {
        if (!r?.ok && before) {
          setFeatures((prev) => prev.map((f) => (f.id === id ? before : f)));
          alert(r?.error ?? "保存失败,已撤销");
        }
      })
      .catch(() => before && setFeatures((prev) => prev.map((f) => (f.id === id ? before : f))));
  }

  function deleteFeature(id: string) {
    const before = features.find((f) => f.id === id);
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    setEditingId(null);
    void api("DELETE", { id })
      .then((r) => {
        if (!r?.ok && before) {
          setFeatures((prev) => [...prev, before]);
          alert(r?.error ?? "删除失败,已恢复");
        }
      })
      .catch(() => before && setFeatures((prev) => [...prev, before]));
  }

  function archive(id: string) {
    const before = features.find((f) => f.id === id);
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    void api("PATCH", { id, archived: true })
      .then((r) => {
        if (!r?.ok && before) {
          setFeatures((prev) => [...prev, before]);
          alert(r?.error ?? "归档失败,已恢复");
        }
      })
      .catch(() => before && setFeatures((prev) => [...prev, before]));
  }

  // 把拖动的卡放到某列 = 改状态(复用 saveEdit 的乐观+回滚)
  function handleDrop(status: string) {
    const id = draggingId;
    setDraggingId(null);
    setDragOverCol(null);
    if (!id) return;
    const f = features.find((x) => x.id === id);
    if (f && f.status !== status) saveEdit(id, { status });
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {COLUMNS.map((col) => {
        const items = features.filter((f) => f.status === col.key);
        const isDone = col.key === "done";
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverCol !== col.key) setDragOverCol(col.key);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(col.key);
            }}
            className={`rounded-lg p-2 transition-colors ${
              dragOverCol === col.key ? "bg-blue-50 ring-2 ring-inset ring-blue-300" : "bg-slate-50"
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-600">{col.label}</span>
              <div className="flex items-center gap-2">
                {isDone && items.length > 0 && (
                  <button
                    onClick={() => items.forEach((f) => archive(f.id))}
                    className="text-[11px] text-slate-400 hover:text-slate-700"
                  >
                    全部归档
                  </button>
                )}
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {items.map((f) =>
                editingId === f.id ? (
                  <FeatureEditor
                    key={f.id}
                    feature={f}
                    members={members}
                    modules={modules}
                    onSave={(patch) => saveEdit(f.id, patch)}
                    onDelete={() => deleteFeature(f.id)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <FeatureCard
                    key={f.id}
                    feature={f}
                    who={responsibleOf(f)}
                    colorOf={colorOf}
                    isDone={isDone}
                    dragging={draggingId === f.id}
                    onEdit={() => setEditingId(f.id)}
                    onArchive={() => archive(f.id)}
                    onDragStart={() => setDraggingId(f.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverCol(null);
                    }}
                  />
                ),
              )}

              {addingCol === col.key ? (
                <div className="rounded-md border bg-white p-2">
                  <input
                    autoFocus
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addFeature(col.key);
                      if (e.key === "Escape") {
                        setAddingCol(null);
                        setAddTitle("");
                      }
                    }}
                    placeholder="功能标题,回车添加"
                    className="w-full border-0 p-0 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-0"
                  />
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      onClick={() => addFeature(col.key)}
                      disabled={busy}
                      className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      添加
                    </button>
                    <button
                      onClick={() => {
                        setAddingCol(null);
                        setAddTitle("");
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-700"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingCol(col.key);
                    setAddTitle("");
                  }}
                  className="flex w-full items-center gap-1 rounded-md px-1 py-1 text-[11px] text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <Plus size={13} /> 添加
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureCard({
  feature: f,
  who,
  colorOf,
  isDone,
  dragging,
  onEdit,
  onArchive,
  onDragStart,
  onDragEnd,
}: {
  feature: Feature;
  who: string | null;
  colorOf: Record<string, string>;
  isDone: boolean;
  dragging: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group cursor-grab rounded-md border bg-white p-2 shadow-sm active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="text-sm text-slate-800">{f.title}</div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={onEdit} title="编辑" className="text-slate-300 hover:text-slate-600">
            <Pencil size={13} />
          </button>
          {isDone && (
            <button onClick={onArchive} title="归档" className="text-slate-300 hover:text-slate-600">
              <Archive size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: who ? colorOf[who] ?? NEUTRAL : "#e6e6e6" }}
          />
          {who ?? "未指派"}
        </span>
        {f.moduleKey && <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">{f.moduleKey}</span>}
      </div>
    </div>
  );
}

function FeatureEditor({
  feature: f,
  members,
  modules,
  onSave,
  onDelete,
  onCancel,
}: {
  feature: Feature;
  members: Member[];
  modules: Mod[];
  onSave: (patch: Partial<Feature>) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(f.title);
  const [ownerName, setOwnerName] = useState(f.ownerName ?? "");
  const [moduleKey, setModuleKey] = useState(f.moduleKey ?? "");
  const [body, setBody] = useState(f.body);

  function save() {
    const t = title.trim();
    if (!t) return;
    onSave({ title: t, ownerName: ownerName || null, moduleKey: moduleKey || null, body });
  }

  return (
    <div className="space-y-1.5 rounded-md border border-slate-300 bg-white p-2 shadow-sm">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        className="w-full rounded border px-1.5 py-1 text-sm text-slate-800"
      />
      <div className="grid grid-cols-2 gap-1.5">
        <label className="text-[11px] text-slate-500">
          负责人
          <select
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="mt-0.5 w-full rounded border px-1 py-1 text-xs text-slate-700"
          >
            <option value="">未指派</option>
            {members.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-slate-500">
          模块
          <select
            value={moduleKey}
            onChange={(e) => setModuleKey(e.target.value)}
            className="mt-0.5 w-full rounded border px-1 py-1 text-xs text-slate-700"
          >
            <option value="">无</option>
            {modules.map((m) => (
              <option key={m.key} value={m.key}>
                {m.title}({m.key})
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="备注(可选)"
        className="w-full rounded border px-1.5 py-1 text-xs text-slate-700"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={save}
            className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-white hover:bg-slate-700"
          >
            <Check size={12} /> 保存
          </button>
          <button onClick={onCancel} className="text-[11px] text-slate-400 hover:text-slate-700">
            取消
          </button>
        </div>
        <button onClick={onDelete} title="删除" className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600">
          <Trash2 size={12} /> 删除
        </button>
      </div>
    </div>
  );
}
