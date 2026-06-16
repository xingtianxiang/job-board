"use client";
import { useState } from "react";
import { ModuleMap, type MapModule, type MapEdge } from "./ModuleMap";
import { ModuleDrawer, type DrawerData } from "./ModuleDrawer";

export function BoardClient({
  modules,
  edges,
  drawerByKey,
}: {
  modules: MapModule[];
  edges: MapEdge[];
  drawerByKey: Record<string, DrawerData>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="relative h-full w-full">
      <ModuleMap modules={modules} edges={edges} onSelect={setSelected} />
      <ModuleDrawer data={selected ? drawerByKey[selected] ?? null : null} onClose={() => setSelected(null)} />
    </div>
  );
}
