"use client";
import { useState } from "react";
import { PALETTE, readableText } from "@/lib/colors";
import { createIdentity } from "./actions";

export function OnboardingForm({
  modules,
  passcodeRequired,
  defaultName,
}: {
  modules: { key: string; title: string; ownerName: string | null }[];
  passcodeRequired: boolean;
  defaultName?: string;
}) {
  const [color, setColor] = useState(PALETTE[0].hex);

  return (
    <form action={createIdentity} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">你的名字</label>
        <input
          name="name"
          required
          defaultValue={defaultName}
          placeholder="例如 txing"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">高亮色</label>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              type="button"
              key={c.hex}
              onClick={() => setColor(c.hex)}
              style={{ background: c.hex, color: readableText(c.hex) }}
              className={`h-9 w-9 rounded-full text-[11px] font-medium ring-offset-2 transition ${
                color === c.hex ? "ring-2 ring-slate-900" : ""
              }`}
              title={c.name}
            >
              {color === c.hex ? "✓" : ""}
            </button>
          ))}
        </div>
      </div>

      {modules.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            我负责 / 在做的模块(会高亮成你的色)
          </label>
          <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
            {modules.map((m) => (
              <label key={m.key} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50">
                <input type="checkbox" name="modules" value={m.key} />
                <span className="text-slate-700">{m.title}</span>
                {m.ownerName && <span className="text-[11px] text-slate-400">({m.ownerName})</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {passcodeRequired && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">团队口令</label>
          <input name="passcode" type="password" className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>
      )}

      <button
        type="submit"
        style={{ background: color, color: readableText(color) }}
        className="w-full rounded-md px-3 py-2.5 text-sm font-semibold shadow-sm"
      >
        进入看板
      </button>
    </form>
  );
}
