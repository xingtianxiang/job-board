import { NEUTRAL } from "@/lib/colors";

export type ActivityItem = {
  title: string;
  moduleKey: string | null;
  moduleTitle: string | null;
  ownerName: string | null;
  color: string;
  ago?: string; // git "在改" 的新鲜度(如 "2 小时前");doing 项无
};

// "谁在做什么":从 BOARD.md 里标了 doing 的 feature 自动派生,无需任何人手填。
export function ActivityBar({ items }: { items: ActivityItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">谁在做什么</span>
      {items.length === 0 ? (
        <span className="text-sm text-slate-400">
          BOARD.md 里还没有标成 <code className="rounded bg-slate-100 px-1">doing</code> 的功能
        </span>
      ) : (
        items.map((it) => (
          <div
            key={`${it.ownerName ?? "?"}|${it.moduleKey ?? "?"}|${it.title}`}
            className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1"
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: it.ownerName ? it.color : NEUTRAL }} />
            <span className="text-sm font-medium text-slate-700">{it.ownerName ?? "未指派"}</span>
            <span className="text-sm text-slate-500">{it.title}</span>
            {it.ago && <span className="text-xs text-slate-400">· {it.ago}</span>}
            {it.moduleTitle && (
              <span className="rounded bg-slate-200 px-1.5 text-xs text-slate-600">{it.moduleTitle}</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
