/**
 * AiText — renders AI-generated markdown with math support.
 *
 * Converts LaTeX delimiters (\(...\) and \[...\]) to the $...$ / $$...$$ form
 * that remark-math expects, then renders with react-markdown + remark-gfm +
 * remark-math + rehype-katex. Applies prose prose-invert from @tailwindcss/typography.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface AiTextProps {
  children: string;
  className?: string;
}

function normalizeLatex(text: string): string {
  // Convert \(...\) → $...$  and  \[...\] → $$...$$
  return text
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$");
}

export function AiText({ children, className = "" }: AiTextProps) {
  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {normalizeLatex(children)}
      </ReactMarkdown>
    </div>
  );
}
