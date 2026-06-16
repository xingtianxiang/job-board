// BOARD.md 解析器 —— 确定性纯规则,绝不调用 AI。
// 服务端(/api/ingest)和本地脚本(tools/board-sync)共用这一份。
//
// BOARD.md 格式:顶部 YAML front-matter 放结构化数据,正文随意写人类备注。
// front-matter 字段见 BOARD.sample.md。
import matter from "gray-matter";
import { z } from "zod";

const FunctionSchema = z.object({
  name: z.string().min(1),
  note: z.string().optional().default(""),
});

const ModuleSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional().default(""),
  boundary: z.string().optional().default(""),
  owner: z.string().optional(),
  doc: z.string().optional().default(""),
  dependsOn: z.array(z.string()).optional().default([]),
  functions: z.array(FunctionSchema).optional().default([]),
  paths: z.array(z.string()).optional().default([]),
});

const DecisionSchema = z.object({
  title: z.string().min(1),
  status: z.enum(["proposed", "accepted", "superseded"]).optional().default("accepted"),
  module: z.string().optional(),
  body: z.string().optional().default(""),
  decidedAt: z.string().optional(),
});

const FeatureSchema = z.object({
  title: z.string().min(1),
  status: z.enum(["todo", "doing", "done"]).optional().default("todo"),
  module: z.string().optional(),
  owner: z.string().optional(),
  body: z.string().optional().default(""),
});

const BoardSchema = z.object({
  project: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    techStack: z.string().optional().default(""),
  }),
  modules: z.array(ModuleSchema).optional().default([]),
  decisions: z.array(DecisionSchema).optional().default([]),
  features: z.array(FeatureSchema).optional().default([]),
});

export type ParsedBoard = z.infer<typeof BoardSchema>;
export type ParsedModule = z.infer<typeof ModuleSchema>;

export class BoardParseError extends Error {}

/** 解析 BOARD.md 原文 → 校验过的结构。失败抛 BoardParseError(带可读信息)。 */
export function parseBoardMarkdown(raw: string): ParsedBoard {
  let data: unknown;
  try {
    data = matter(raw).data;
  } catch (e) {
    throw new BoardParseError(
      "BOARD.md 的 front-matter(顶部 --- 之间的 YAML)解析失败:" +
        (e instanceof Error ? e.message : String(e)),
    );
  }

  if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
    throw new BoardParseError(
      "BOARD.md 缺少 front-matter。请在文件顶部用一对 --- 包住 YAML(参见 BOARD.sample.md)。",
    );
  }

  const result = BoardSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(根)"}: ${i.message}`)
      .join("\n");
    throw new BoardParseError("BOARD.md 字段不合法:\n" + issues);
  }

  // 校验 dependsOn / module 引用是否存在(只警告,不阻断)
  const keys = new Set(result.data.modules.map((m) => m.key));
  const warnings: string[] = [];
  for (const m of result.data.modules) {
    for (const dep of m.dependsOn) {
      if (!keys.has(dep)) warnings.push(`模块 "${m.key}" 的 dependsOn 引用了不存在的模块 "${dep}"`);
    }
  }
  for (const d of result.data.decisions) {
    if (d.module && !keys.has(d.module)) warnings.push(`决策 "${d.title}" 挂在不存在的模块 "${d.module}"`);
  }
  for (const f of result.data.features) {
    if (f.module && !keys.has(f.module)) warnings.push(`功能 "${f.title}" 挂在不存在的模块 "${f.module}"`);
  }
  if (warnings.length) {
    // 不抛错,留给调用方决定是否打印
    (result.data as ParsedBoard & { _warnings?: string[] })._warnings = warnings;
  }

  return result.data;
}

export function getBoardWarnings(board: ParsedBoard): string[] {
  return (board as ParsedBoard & { _warnings?: string[] })._warnings ?? [];
}
