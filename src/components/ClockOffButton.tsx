"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// 顶栏"收工"按钮:清掉当前用户在所有模块上的"在改"高亮(只清自己、保留负责人与历史)。
// active=false(我当前没有任何"在改"标记)时禁用并变灰,避免点了个寂寞。
export function ClockOffButton({ active }: { active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function clockOff() {
    if (busy) return;
    if (
      !confirm(
        "收工?将清除你在所有模块上的『在改』标记。\n(不影响负责人与提交历史;下次同步时若你仍有未合并的改动,会重新点亮)",
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/clock-off", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      alert("收工失败:" + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={clockOff}
      disabled={busy || !active}
      title={active ? "清除我在所有模块上的『在改』标记(保留负责人与历史)" : "你当前没有『在改』标记"}
      className="rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? "收工中…" : "收工"}
    </button>
  );
}
