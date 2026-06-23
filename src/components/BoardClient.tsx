"use client";
import { useState } from "react";
import { ModuleMap, type MapModule, type MapEdge } from "./ModuleMap";
import { ModuleDrawer, type DrawerData } from "./ModuleDrawer";

export function BoardClient({
  modules,
  edges,
  drawerByKey,
  members,
}: {
  modules: MapModule[];
  edges: MapEdge[];
  drawerByKey: Record<string, DrawerData>;
  members: { name: string; color: string }[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  // 首页默认只画工艺流(干净的一条链);代码依赖是次要叠加层,按需开。
  const [showDeps, setShowDeps] = useState(false);
  // 负责人改派用乐观更新:点了立刻在本地变,PATCH 后台存,不再整页重拉(避免每次都远程往返 Neon)
  const [ownerOverrides, setOwnerOverrides] = useState<Record<string, string | null>>({});

  function assignOwner(moduleKey: string, name: string | null) {
    setOwnerOverrides((prev) => ({ ...prev, [moduleKey]: name }));
    void fetch("/api/module", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: moduleKey, ownerName: name }),
    }).catch(() => {
      /* 后台失败就算了,下次刷新以服务端为准 */
    });
  }

  const modulesView = modules.map((m) =>
    m.key in ownerOverrides ? { ...m, ownerName: ownerOverrides[m.key] } : m,
  );

  let drawerData: DrawerData | null = null;
  if (selected && drawerByKey[selected]) {
    const d = drawerByKey[selected];
    drawerData = selected in ownerOverrides ? { ...d, ownerName: ownerOverrides[selected] } : d;
  }

  const hasDeps = edges.some((e) => e.kind === "depends");

  return (
    <div className="relative h-full w-full">
      {hasDeps && (
        <div className="absolute right-3 top-3 z-10 flex overflow-hidden rounded-md border border-slate-300 bg-white text-xs shadow-sm">
          <button
            onClick={() => setShowDeps(false)}
            className={!showDeps ? "bg-blue-50 px-2.5 py-1 font-medium text-blue-700" : "px-2.5 py-1 text-slate-500 hover:bg-slate-50"}
          >
            工艺流
          </button>
          <button
            onClick={() => setShowDeps(true)}
            className={showDeps ? "bg-blue-50 px-2.5 py-1 font-medium text-blue-700" : "px-2.5 py-1 text-slate-500 hover:bg-slate-50"}
          >
            + 代码依赖
          </button>
        </div>
      )}
      <ModuleMap modules={modulesView} edges={edges} onSelect={setSelected} showDeps={showDeps} />
      <ModuleDrawer
        data={drawerData}
        members={members}
        onClose={() => setSelected(null)}
        onAssignOwner={assignOwner}
      />
    </div>
  );
}
