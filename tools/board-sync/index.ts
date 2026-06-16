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
  };

  console.log(`→ 上传 ${file}`);
  console.log(`  目标 ${url}/api/ingest   分支 ${gitInfo.branch || "?"}@${gitInfo.commit || "?"}`);

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
    `✓ 成功:项目 ${data.project} —— 模块 ${data.counts?.modules}、边 ${data.counts?.edges}、决策 ${data.counts?.decisions}、功能 ${data.counts?.features}`,
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
