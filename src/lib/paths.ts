// 代码路径归属:文件 → 模块。把"改了哪些文件"对到"哪个模块的 paths glob"。
// 从 ingest.ts 原样抽出,供 ingest(实时高亮)与 github-ingest(提交历史归属)共用。
// 纯函数,无副作用、无 DB、无 AI。

// 极简 glob → 正则:支持 ** / * / ?;另外把"无通配的目录前缀"也当前缀匹配。
export function globToRegExp(glob: string): RegExp {
  const re = glob
    .trim()
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, " ")
    .replace(/\*/g, "[^/]*")
    .replace(/ /g, ".*")
    .replace(/\?/g, ".");
  return new RegExp("^" + re + "$");
}
export function fileMatchesPaths(file: string, globs: string[]): boolean {
  return globs.some((g) => {
    if (!g) return false;
    if (!/[*?]/.test(g) && file.startsWith(g.replace(/\/$/, "") + "/")) return true;
    return globToRegExp(g).test(file);
  });
}
