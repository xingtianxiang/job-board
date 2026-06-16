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

  return (
    <div className="relative h-full w-full">
      <ModuleMap modules={modulesView} edges={edges} onSelect={setSelected} />
      <ModuleDrawer
        data={drawerData}
        members={members}
        onClose={() => setSelected(null)}
        onAssignOwner={assignOwner}
      />
    </div>
  );
}
