"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { readableText } from "@/lib/colors";

export type MapModule = {
  id: string;
  key: string;
  title: string;
  ownerName: string | null;
  color: string;
  posX: number;
  posY: number;
};
export type MapEdge = { id: string; source: string; target: string; kind: string };

type NodeData = { title: string; ownerName: string | null; color: string; mkey: string };

function ModuleNode({ data }: { data: NodeData }) {
  const fg = readableText(data.color);
  return (
    <div
      style={{ background: data.color, color: fg }}
      className="min-w-[128px] cursor-pointer rounded-lg border border-black/10 px-3 py-2 text-center shadow-sm"
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="text-sm font-semibold leading-tight">{data.title}</div>
      <div className="text-[11px] opacity-80">{data.ownerName ?? "未认领"}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
}

const nodeTypes = { module: ModuleNode };

export function ModuleMap({
  modules,
  edges,
  onSelect,
}: {
  modules: MapModule[];
  edges: MapEdge[];
  onSelect: (key: string) => void;
}) {
  const nodes: Node[] = useMemo(
    () =>
      modules.map((m) => ({
        id: m.id,
        type: "module",
        position: { x: m.posX, y: m.posY },
        data: { title: m.title, ownerName: m.ownerName, color: m.color, mkey: m.key },
      })),
    [modules],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.kind === "depends",
        label: e.kind === "boundary" ? "边界" : undefined,
        style:
          e.kind === "boundary"
            ? { stroke: "#dc2626", strokeDasharray: "4 4" }
            : { stroke: "#94a3b8" },
      })),
    [edges],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        onNodeClick={(_, n) => onSelect((n.data as NodeData).mkey)}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
