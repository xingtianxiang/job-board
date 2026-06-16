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
}: {
  features: Feature[];
  colorOf: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {COLUMNS.map((col) => {
        const items = features.filter((f) => f.status === col.key);
        return (
          <div key={col.key} className="rounded-lg bg-slate-50 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-600">{col.label}</span>
              <span className="text-xs text-slate-400">{items.length}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((f) => (
                <div key={f.title} className="rounded-md border bg-white p-2 shadow-sm">
                  <div className="text-sm text-slate-800">{f.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {f.moduleKey && (
                      <span className="rounded bg-slate-100 px-1.5 text-[11px] text-slate-500">{f.moduleKey}</span>
                    )}
                    {f.ownerName && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: colorOf[f.ownerName] ?? NEUTRAL }}
                        />
                        {f.ownerName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && <div className="px-1 text-xs text-slate-300">—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
