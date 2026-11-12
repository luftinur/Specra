import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidBlock } from './MermaidBlock';
import { Copy, Check, FileCode } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
  isDark?: boolean;
  className?: string;
}

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="my-4 border border-border rounded-xl bg-surface overflow-hidden shadow-2xs">
      <div className="px-3 py-1.5 bg-panel border-b border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-mono text-muted text-[11px]">
          <FileCode size={13} className="text-primary" />
          <span className="font-semibold uppercase">{language || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            copied ? 'bg-ok-tint text-ok font-semibold' : 'hover:bg-fill-mute text-muted hover:text-fg'
          }`}
          title="Salin kode"
        >
          {copied ? <Check size={11} className="text-ok" /> : <Copy size={11} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto font-mono text-xs leading-relaxed bg-fill text-fg-2">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, isDark = false, className = '' }) => {
  return (
    <div className={`markdown-content select-text text-fg ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1].toLowerCase() : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && language === 'mermaid') {
              return <MermaidBlock code={codeString} isDark={isDark} />;
            }

            if (!inline) {
              return <CodeBlock code={codeString} language={language} />;
            }

            return (
              <code
                className="bg-fill px-1.5 py-0.5 rounded font-mono text-[12px] text-primary font-medium border border-border/40"
                {...props}
              >
                {children}
              </code>
            );
          },
          h1({ children }) {
            return (
              <h1 className="text-xl font-bold text-fg border-b border-border pb-2 mt-6 mb-3 first:mt-0">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-lg font-bold text-fg border-b border-border/60 pb-1.5 mt-5 mb-2.5">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base font-semibold text-fg mt-4 mb-2">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-sm font-semibold text-fg mt-3 mb-1.5">
                {children}
              </h4>
            );
          },
          p({ children }) {
            return (
              <p className="text-[13px] text-fg-2 leading-relaxed mb-3.5">
                {children}
              </p>
            );
          },
          ul({ children }) {
            return (
              <ul className="list-disc list-outside ml-5 space-y-1 mb-3.5 text-[13px] text-fg-2">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-outside ml-5 space-y-1 mb-3.5 text-[13px] text-fg-2">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return (
              <li className="text-[13px] text-fg-2 leading-relaxed">
                {children}
              </li>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 border border-border rounded-xl shadow-2xs">
                <table className="w-full border-collapse text-xs text-left">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return (
              <thead className="bg-panel border-b border-border text-fg font-semibold">
                {children}
              </thead>
            );
          },
          tbody({ children }) {
            return (
              <tbody className="divide-y divide-border/60 bg-surface">
                {children}
              </tbody>
            );
          },
          tr({ children }) {
            return (
              <tr className="hover:bg-fill-mute/50 transition-colors">
                {children}
              </tr>
            );
          },
          th({ children }) {
            return (
              <th className="px-3.5 py-2 font-semibold text-fg border-r border-border/40 last:border-r-0">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3.5 py-2 text-fg-2 border-r border-border/40 last:border-r-0">
                {children}
              </td>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary/60 bg-fill-soft/60 px-3.5 py-2.5 my-3.5 rounded-r-lg text-fg-2 text-xs italic">
                {children}
              </blockquote>
            );
          },
          hr() {
            return <hr className="border-border my-6" />;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-bold text-fg">{children}</strong>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
