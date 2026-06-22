"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
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
  color: string; // 高亮色(活跃时用)
  active: boolean;
  activeKind: "git" | "doing" | null;
  activeBy: string | null;
  activeUsers: string[];
  conflict: boolean;
  posX: number;
  posY: number;
};
export type MapEdge = { id: string; source: string; target: string; kind: string };

type NodeData = {
  title: string;
  ownerName: string | null;
  color: string;
  active: boolean;
  activeKind: "git" | "doing" | null;
  activeBy: string | null;
  activeUsers: string[];
  conflict: boolean;
  mkey: string;
};

function ModuleNode({ data }: { data: NodeData }) {
  const active = data.active;
  const conflict = data.conflict;
  const bg = active ? data.color : "#ffffff";
  const fg = active ? readableText(data.color) : "#171717";
  const ring = conflict ? "0 0 0 3px #ea001d" : active ? `0 0 0 3px ${data.color}55` : undefined;
  const badge = conflict
    ? `⚠ ${data.activeUsers.length} 人在改`
    : data.activeKind === "git"
      ? `✎ ${data.activeBy ?? ""} 在改`
      : data.activeKind === "doing"
        ? "▶ 进行中"
        : null;
  return (
    <div
      style={{ background: bg, color: fg, boxShadow: ring }}
      className={`min-w-[144px] cursor-pointer rounded-lg border px-3 py-2 text-center ${
        active ? "border-black/10" : "border-slate-300"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="text-sm font-semibold leading-tight">{data.title}</div>
      <div className="mt-0.5 text-[11px]" style={{ opacity: active ? 0.85 : 0.6 }}>
        负责:{data.ownerName ?? "—"}
      </div>
      {badge && (
        <div
          className={`mt-1 inline-block rounded-full px-1.5 text-[10px] font-medium ${
            conflict ? "bg-red-600 text-white" : "bg-black/15"
          }`}
        >
          {badge}
        </div>
      )}
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
        data: {
          title: m.title,
          ownerName: m.ownerName,
          color: m.color,
          active: m.active,
          activeKind: m.activeKind,
          activeBy: m.activeBy,
          activeUsers: m.activeUsers,
          conflict: m.conflict,
          mkey: m.key,
        },
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
            ? { stroke: "#ea001d", strokeDasharray: "4 4" }
            : { stroke: "#c9c9c9" },
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
      </ReactFlow>
    </div>
  );
}
