import { NextRequest, NextResponse } from "next/server";
import { applyBoardMarkdown } from "@/lib/ingest";
import { BoardParseError } from "@/lib/board-parse";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const expected = process.env.BOARD_INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "服务端未配置 BOARD_INGEST_TOKEN" }, { status: 500 });
  }
  if (req.headers.get("x-board-token") !== expected) {
    return NextResponse.json({ ok: false, error: "令牌不正确" }, { status: 401 });
  }

  let body: { boardMarkdown?: string; git?: { user?: string; changedFiles?: string[] } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const raw = typeof body.boardMarkdown === "string" ? body.boardMarkdown : "";
  if (!raw.trim()) {
    return NextResponse.json({ ok: false, error: "缺少 boardMarkdown" }, { status: 400 });
  }

  try {
    const result = await applyBoardMarkdown(raw, body.git);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof BoardParseError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
    console.error("ingest 失败", e);
    return NextResponse.json({ ok: false, error: "服务端处理失败" }, { status: 500 });
  }
}
