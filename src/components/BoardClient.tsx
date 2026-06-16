"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  async function assignOwner(moduleKey: string, name: string | null) {
    await fetch("/api/module", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: moduleKey, ownerName: name }),
    });
    router.refresh(); // 重新拉服务端数据,标签/颜色随之更新
  }

  return (
    <div className="relative h-full w-full">
      <ModuleMap modules={modules} edges={edges} onSelect={setSelected} />
      <ModuleDrawer
        data={selected ? drawerByKey[selected] ?? null : null}
        members={members}
        onClose={() => setSelected(null)}
        onAssignOwner={assignOwner}
      />
    </div>
  );
}
