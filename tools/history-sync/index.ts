// 本地脚本:读取目标仓库的 git log → POST 到 /api/github-ingest(历史车道)。纯搬运,绝不调用 AI。
//
// 与实时 sync(/api/ingest)【四不沾】:独立 endpoint、独立 token(GITHUB_INGEST_TOKEN)、
// 只写 Commit/CommitFile。给"非仓库管理员、用不了 GitHub Action"的场景兜底——在自己机器上喂历史。
//
// 用法(在 weld-board 目录):
//   npm run sync:history -- ../weld_KAIERDA/BOARD.md
// 参数同 board-sync:传 BOARD.md 路径,取其所在目录当作 git 仓库(只读 git log,不读 BOARD.md 内容)。
// 需要 GITHUB_INGEST_TOKEN(从 weld-board/.env 自动读取),可选 BOARD_URL(默认 http://localhost:3000)、
// HISTORY_LIMIT(默认 100,取最近多少条提交)。
import { resolve, dirname, basename } from "node:path";
import { execSync } from "node:child_process";

// 从 weld-board/.env 加载环境变量(Node ≥ 20.12 内置)
try {
  (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
} catch {
  /* 没有 .env 也无妨,可由 shell 直接提供 */
}

function git(cwd: string, cmd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return "";
  }
}

type Commit = {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  files: string[];
};

// 读最近 N 条提交,连同每条改动的文件。用 git 自带的 %x1e/%x1f 控制字节当分隔符,
// 避免 message/路径里出现的空格、引号干扰解析;core.quotepath=false 让非 ASCII 路径不被转义。
function readCommits(repoDir: string, limit: number): Commit[] {
  const fmt = "%x1e%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%cI";
  const raw = git(repoDir, `git -c core.quotepath=false log -n ${limit} --pretty=format:${fmt} --name-only`);
  if (!raw.trim()) return [];
  return raw
    .split("\x1e")
    .map((r) => r.replace(/^\r?\n/, "").trimEnd())
    .filter(Boolean)
    .map((rec) => {
      const nl = rec.indexOf("\n");
      const headerLine = nl === -1 ? rec : rec.slice(0, nl);
      const rest = nl === -1 ? "" : rec.slice(nl + 1);
      const [sha, shortSha, message, authorName, authorEmail, committedAt] = headerLine.split("\x1f");
      const files = rest
        .split("\n")
        .map((f) => f.trim().replace(/\\/g, "/"))
        .filter(Boolean);
      return {
        sha: sha ?? "",
        shortSha: shortSha ?? "",
        message: message ?? "",
        authorName: authorName ?? "",
        authorEmail: authorEmail ?? "",
        committedAt: committedAt ?? "",
        files,
      };
    })
    .filter((c) => c.sha);
}

async function main() {
  const baseDir = process.env.INIT_CWD || process.cwd();
  const fileArg = process.argv[2] || "BOARD.md";
  const repoDir = dirname(resolve(baseDir, fileArg));
  const url = (process.env.BOARD_URL || "http://localhost:3000").replace(/\/$/, "");
  const token = process.env.GITHUB_INGEST_TOKEN;
  const limit = Number(process.env.HISTORY_LIMIT) || 100;

  if (!token) {
    console.error("✗ 缺少 GITHUB_INGEST_TOKEN(应与网站一致;本地放在 weld-board/.env)");
    process.exit(1);
  }

  const commits = readCommits(repoDir, limit);
  if (commits.length === 0) {
    console.error(`✗ 在 ${repoDir} 没读到任何提交(是 git 仓库吗?)`);
    process.exit(1);
  }

  const payload = {
    repo: basename(repoDir),
    branch: git(repoDir, "git rev-parse --abbrev-ref HEAD"),
    pushedBy: git(repoDir, "git config user.name"),
    commits,
  };

  console.log(`→ 推历史 ${commits.length} 条(最近 ${limit})  仓库 ${payload.repo}@${payload.branch || "?"}`);
  console.log(`  目标 ${url}/api/github-ingest`);

  let res: Response;
  try {
    res = await fetch(`${url}/api/github-ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-github-token": token },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error(`✗ 连不上 ${url}。网站起来了吗?(本地先 npm run dev)`);
    console.error("  " + (e instanceof Error ? e.message : String(e)));
    process.exit(1);
  }

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    project?: string;
    counts?: { commits?: number; files?: number; unattributed?: number };
  };
  if (!res.ok) {
    console.error(`✗ 失败(${res.status}):${data.error || "未知错误"}`);
    process.exit(1);
  }

  console.log(
    `✓ 成功:项目 ${data.project} —— 入库 commit ${data.counts?.commits}、文件行 ${data.counts?.files}` +
      (data.counts?.unattributed ? `,其中 ${data.counts.unattributed} 条未命中任何模块` : ""),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
