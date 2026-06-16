"use client";
import { useState } from "react";
import { PALETTE, readableText } from "@/lib/colors";
import { loginAs, createIdentity } from "./actions";

export function OnboardingForm({
  members,
  passcodeRequired,
}: {
  members: { id: string; name: string; color: string }[];
  passcodeRequired: boolean;
}) {
  const [adding, setAdding] = useState(members.length === 0);
  const [color, setColor] = useState(PALETTE[0].hex);

  return (
    <div className="space-y-5">
      {members.length > 0 && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">选你的名字</label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <form key={m.id} action={loginAs}>
                <input type="hidden" name="userId" value={m.id} />
                <button
                  type="submit"
                  style={{ background: m.color, color: readableText(m.color) }}
                  className="rounded-full px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
                >
                  {m.name}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {members.length > 0 && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm text-slate-500 underline hover:text-slate-800"
        >
          + 新增成员
        </button>
      )}

      {adding && (
        <form action={createIdentity} className="space-y-4 rounded-lg border bg-slate-50 p-4">
          <div className="text-sm font-medium text-slate-700">新增成员</div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">名字</label>
            <input
              name="name"
              required
              placeholder="例如 txing"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">高亮色</label>
            <input type="hidden" name="color" value={color} />
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  style={{ background: c.hex, color: readableText(c.hex) }}
                  className={`h-9 w-9 rounded-full text-[11px] font-medium ${
                    color === c.hex ? "ring-2 ring-slate-900 ring-offset-2" : ""
                  }`}
                  title={c.name}
                >
                  {color === c.hex ? "✓" : ""}
                </button>
              ))}
            </div>
          </div>
          {passcodeRequired && (
            <div>
              <label className="mb-1 block text-sm text-slate-600">团队口令</label>
              <input name="passcode" type="password" className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>
          )}
          <button
            type="submit"
            style={{ background: color, color: readableText(color) }}
            className="w-full rounded-md px-3 py-2.5 text-sm font-semibold shadow-sm"
          >
            创建并进入
          </button>
        </form>
      )}
    </div>
  );
}
