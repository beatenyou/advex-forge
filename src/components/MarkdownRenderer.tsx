import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className = '' }: MarkdownRendererProps) => {
  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark as any}
                language={match[1]}
                PreTag="div"
                className="rounded-md"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-sm">
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-4 last:mb-0 text-foreground">{children}</p>;
          },
          ul({ children }) {
            return <ul className="mb-4 ml-6 list-disc text-foreground">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-4 ml-6 list-decimal text-foreground">{children}</ol>;
          },
          h1({ children }) {
            return <h1 className="mb-4 text-xl font-bold text-foreground">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="mb-3 text-lg font-semibold text-foreground">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="mb-2 text-base font-semibold text-foreground">{children}</h3>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-primary hover:text-primary/80 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-muted-foreground/20 pl-4 italic text-muted-foreground">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};