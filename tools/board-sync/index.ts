// 本地脚本:读取 BOARD.md + git 信息,POST 到 /api/ingest。纯搬运,绝不调用 AI。
//
// 用法(在 weld-board 目录):
//   npm run sync -- ../weld_KAIERDA/BOARD.md
// 需要环境变量 BOARD_INGEST_TOKEN(从 weld-board/.env 自动读取),
// 可选 BOARD_URL(默认 http://localhost:3000)。
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execSync } from "node:child_process";

// 从 weld-board/.env 加载环境变量(Node ≥ 20.12 内置)
try {
  (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
} catch {
  /* 没有 .env 也无妨,可由 shell 直接提供 */
}

function git(cwd: string, cmd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

// "我当前在改什么":优先取【未提交改动】(最能代表此刻在做什么);
// 没有未提交时,才回退到"当前分支相对主线的改动"。
function changedFiles(cwd: string): string[] {
  const norm = (f: string) => {
    const p = f.trim().replace(/\\/g, "/");
    return p ? (p.includes(" -> ") ? p.split(" -> ").pop()!.trim() : p) : "";
  };

  // 1) 未提交(已跟踪 + 未跟踪;-uall 让未跟踪文件逐个列出,不折叠成目录)
  const uncommitted = new Set<string>();
  for (const line of git(cwd, "git status --porcelain -uall").split("\n")) {
    const f = norm(line.slice(3));
    if (f) uncommitted.add(f);
  }
  if (uncommitted.size) return [...uncommitted];

  // 2) 回退:当前分支相对主线的已提交改动
  const bases = ["origin/HEAD", "origin/main", "origin/master", "main", "master"];
  const base = bases.find((b) => git(cwd, `git rev-parse --verify --quiet ${b}`) !== "");
  const committed = base
    ? git(cwd, `git diff --name-only ${base}...HEAD`)
    : git(cwd, "git diff --name-only HEAD~1 HEAD");
  const out = new Set<string>();
  for (const f of committed.split("\n")) {
    const n = norm(f);
    if (n) out.add(n);
  }
  return [...out];
}

async function main() {
  // npm run 会把 cwd 切到包目录;用 INIT_CWD 还原用户实际所在目录,好让相对路径符合直觉
  const baseDir = process.env.INIT_CWD || process.cwd();
  const fileArg = process.argv[2] || "BOARD.md";
  const file = resolve(baseDir, fileArg);
  const url = (process.env.BOARD_URL || "http://localhost:3000").replace(/\/$/, "");
  const token = process.env.BOARD_INGEST_TOKEN;

  if (!token) {
    console.error("✗ 缺少 BOARD_INGEST_TOKEN(应与网站一致;本地放在 weld-board/.env)");
    process.exit(1);
  }

  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    console.error(`✗ 读不到文件:${file}`);
    process.exit(1);
  }

  const repoDir = dirname(file);
  const gitInfo = {
    branch: git(repoDir, "git rev-parse --abbrev-ref HEAD"),
    commit: git(repoDir, "git rev-parse --short HEAD"),
    user: git(repoDir, "git config user.name"),
    email: git(repoDir, "git config user.email"),
    changedFiles: changedFiles(repoDir),
  };

  console.log(`→ 上传 ${file}`);
  console.log(`  目标 ${url}/api/ingest   分支 ${gitInfo.branch || "?"}@${gitInfo.commit || "?"}`);
  if (gitInfo.user && gitInfo.changedFiles.length) {
    console.log(`  ${gitInfo.user} 当前改动 ${gitInfo.changedFiles.length} 个文件 → 命中的模块会自动高亮`);
  }

  let res: Response;
  try {
    res = await fetch(`${url}/api/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-board-token": token },
      body: JSON.stringify({ boardMarkdown: raw, git: gitInfo }),
    });
  } catch (e) {
    console.error(`✗ 连不上 ${url}。网站起来了吗?(本地先 npm run dev)`);
    console.error("  " + (e instanceof Error ? e.message : String(e)));
    process.exit(1);
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    project?: string;
    counts?: Record<string, number>;
    warnings?: string[];
  };

  if (!res.ok) {
    console.error(`✗ 失败(${res.status}):${data.error || "未知错误"}`);
    process.exit(1);
  }

  console.log(
    `✓ 成功:项目 ${data.project} —— 模块 ${data.counts?.modules}、边 ${data.counts?.edges}、决策 ${data.counts?.decisions}、功能 ${data.counts?.features}` +
      (data.counts?.gitActive ? `,按 git 高亮 ${data.counts.gitActive} 个模块` : ""),
  );
  if (data.warnings?.length) {
    console.log("  ⚠ 警告(不影响上传):");
    data.warnings.forEach((w) => console.log("   - " + w));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
