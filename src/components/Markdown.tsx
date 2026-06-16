import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 统一的 markdown 渲染(模块文档 / 决策正文 / 技术栈卡)。 */
export function Markdown({ children }: { children: string }) {
  if (!children?.trim()) return null;
  return (
    <div className="prose-wb">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
