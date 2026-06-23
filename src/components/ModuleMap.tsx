"use client";
import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export type MapModule = {
  id: string;
  key: string;
  title: string;
  ownerName: string | null;
  color: string; // 高亮色(活跃时用)
  active: boolean;
  activeKind: "git" | "doing" | null;
  activeBy: string | null;
  activeUsers: { name: string; ago: string; color: string }[];
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
  activeUsers: { name: string; ago: string; color: string }[];
  conflict: boolean;
  mkey: string;
};

function ModuleNode({ data }: { data: NodeData }) {
  const active = data.active;
  const conflict = data.conflict;
  const memberColor = data.activeUsers[0]?.color ?? data.color;
  const borderColor = conflict ? "#ea001d" : active ? memberColor : "#e6e6e6";
  const ago = data.activeUsers[0]?.ago;
  const badge = conflict
    ? `⚠ ${data.activeUsers.length} 人在改`
    : data.activeKind === "git"
      ? `${data.activeBy ?? ""} 在改${ago ? ` · ${ago}` : ""}`
      : data.activeKind === "doing"
        ? "▶ 进行中"
        : null;
  return (
    <div
      style={{ background: "#ffffff", color: "#171717", borderColor, borderWidth: conflict || active ? 3 : 1 }}
      className="min-w-[144px] cursor-pointer rounded-lg border px-3 py-2 text-center"
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-400" />
      <div className="text-sm font-semibold leading-tight">{data.title}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">
        负责:{data.ownerName ?? "—"}
      </div>
      {badge && (
        <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-medium">
          {data.activeUsers.length > 0 && (
            <span className="flex -space-x-1">
              {data.activeUsers.slice(0, conflict ? 2 : 1).map((user) => (
                <span
                  key={user.name}
                  title={user.name}
                  style={{ background: user.color }}
                  className="inline-block h-2.5 w-2.5 rounded-full border border-white"
                />
              ))}
            </span>
          )}
          <span className={conflict ? "rounded-full bg-red-600 px-1.5 text-white" : "text-slate-600"}>{badge}</span>
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-slate-400" />
    </div>
  );
}

const nodeTypes = { module: ModuleNode };

export function ModuleMap({
  modules,
  edges,
  onSelect,
  showDeps = false,
}: {
  modules: MapModule[];
  edges: MapEdge[];
  onSelect: (key: string) => void;
  showDeps?: boolean; // 是否叠加显示代码依赖(depends)边;默认只画工艺流
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

  // 工艺流(flow)= 主角:实线 + 箭头,左→右。
  // 代码依赖(depends)= 次要叠加层:淡虚线,默认隐藏(showDeps 开才画)。
  // 边界(boundary)= 红虚线,保留。
  const flowEdges: Edge[] = useMemo(
    () =>
      edges
        .filter((e) => (e.kind === "depends" ? showDeps : true))
        .map((e) => {
          if (e.kind === "flow") {
            return {
              id: e.id,
              source: e.source,
              target: e.target,
              markerEnd: { type: MarkerType.ArrowClosed, color: "#7d7d7d", width: 8, height: 8 },
              style: { stroke: "#7d7d7d", strokeWidth: 2 },
            };
          }
          if (e.kind === "boundary") {
            return {
              id: e.id,
              source: e.source,
              target: e.target,
              label: "边界",
              style: { stroke: "#ea001d", strokeDasharray: "4 4" },
            };
          }
          return {
            id: e.id,
            source: e.source,
            target: e.target,
            animated: true,
            style: { stroke: "#cbd5e1", strokeDasharray: "4 4" },
          };
        }),
    [edges, showDeps],
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
