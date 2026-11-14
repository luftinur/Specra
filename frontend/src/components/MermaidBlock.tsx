import React, { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import { Copy, Check, ZoomIn, ZoomOut, RotateCcw, Code, Eye, AlertTriangle } from 'lucide-react';

interface MermaidBlockProps {
  code: string;
  isDark?: boolean;
}

const getDiagramType = (source: string): string => {
  const line = source.trim().split('\n').find(l => l.trim() && !l.trim().startsWith('%%'))?.trim() || '';
  if (line.startsWith('graph') || line.startsWith('flowchart')) return 'Flowchart';
  if (line.startsWith('sequenceDiagram')) return 'Sequence Diagram';
  if (line.startsWith('classDiagram')) return 'Class Diagram';
  if (line.startsWith('stateDiagram')) return 'State Diagram';
  if (line.startsWith('erDiagram')) return 'Entity-Relationship';
  if (line.startsWith('C4Context') || line.startsWith('C4Container') || line.startsWith('C4Component')) return 'C4 Architecture';
  if (line.startsWith('gantt')) return 'Gantt Chart';
  if (line.startsWith('pie')) return 'Pie Chart';
  if (line.startsWith('gitGraph')) return 'Git Graph';
  if (line.startsWith('mindmap')) return 'Mindmap';
  if (line.startsWith('timeline')) return 'Timeline';
  return 'Diagram';
};

export const MermaidBlock: React.FC<MermaidBlockProps> = ({ code, isDark = false }) => {
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);

  const diagramType = getDiagramType(code);

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      const cleanCode = code.trim();
      if (!cleanCode) return;

      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: isDark ? 'dark' : 'neutral',
          themeVariables: isDark ? {
            darkMode: true,
            background: '#171513',
            primaryColor: '#6366f1',
            primaryTextColor: '#f7f5f3',
            primaryBorderColor: '#38332e',
            lineColor: '#a8a29e',
            secondaryColor: '#282420',
            tertiaryColor: '#1e1b18',
          } : {
            darkMode: false,
            background: '#ffffff',
            primaryColor: '#4f46e5',
            primaryTextColor: '#171513',
            primaryBorderColor: '#e5e1dc',
            lineColor: '#57534e',
            secondaryColor: '#f7f5f3',
            tertiaryColor: '#f0ede8',
          },
          fontFamily: 'inherit',
        });

        // Clean any leftover error elements added to body by mermaid
        const leftoverErrors = document.querySelectorAll('[id^="dmermaid"]');
        leftoverErrors.forEach(el => el.remove());

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, cleanCode);
        
        if (isMounted) {
          setSvgHtml(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Mermaid compilation error:', err);
          setError(err?.message || 'Failed to parse Mermaid diagram syntax');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [code, isDark]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy mermaid code:', err);
    }
  };

  return (
    <div className="my-5 border border-border rounded-xl bg-surface shadow-xs overflow-hidden transition-all">
      {/* Block Header Bar */}
      <div className="px-3.5 py-2 bg-panel border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[11px] uppercase tracking-wider text-primary bg-primary-soft px-2 py-0.5 rounded font-mono">
            Mermaid: {diagramType}
          </span>
          {error && (
            <span className="flex items-center gap-1 text-[11px] text-err font-medium">
              <AlertTriangle size={12} />
              <span>Syntax Warning</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls (only in preview mode and when no error) */}
          {viewMode === 'preview' && !error && svgHtml && (
            <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5 text-muted shadow-2xs">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(Number((z - 0.15).toFixed(2)), 0.4))}
                title="Zoom Out"
                className="p-1 hover:text-fg hover:bg-fill-mute rounded transition-colors"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[10px] font-mono px-1 font-semibold text-fg">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(Number((z + 0.15).toFixed(2)), 2.5))}
                title="Zoom In"
                className="p-1 hover:text-fg hover:bg-fill-mute rounded transition-colors"
              >
                <ZoomIn size={13} />
              </button>
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="Reset Zoom"
                  className="p-1 hover:text-fg hover:bg-fill-mute rounded transition-colors border-l border-border pl-1"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          )}

          {/* Segmented View Mode Switcher */}
          <div className="flex items-center gap-0.5 bg-surface border border-border rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === 'preview'
                  ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                  : 'text-muted hover:text-fg hover:bg-fill-mute'
              }`}
            >
              <Eye size={12} />
              <span>Visual</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                viewMode === 'code'
                  ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                  : 'text-muted hover:text-fg hover:bg-fill-mute'
              }`}
            >
              <Code size={12} />
              <span>Code</span>
            </button>
          </div>

          {/* One-Click Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all shadow-2xs ${
              copied
                ? 'bg-ok-tint text-ok border-ok/40 font-semibold'
                : 'bg-surface hover:bg-fill-mute text-fg border-border'
            }`}
            title="Copy Mermaid diagram to clipboard"
          >
            {copied ? <Check size={12} className="text-ok" /> : <Copy size={12} />}
            <span>{copied ? 'Copied!' : 'Copy Mermaid'}</span>
          </button>
        </div>
      </div>

      {/* Main Block Content */}
      {viewMode === 'preview' && !error ? (
        <div className="w-full overflow-auto p-6 max-h-[650px] flex justify-center items-center min-h-[160px] bg-surface">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.15s ease',
            }}
            className="w-full flex justify-center"
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        </div>
      ) : viewMode === 'preview' && error ? (
        <div className="p-4 bg-warn-bg/40 border-b border-border space-y-2">
          <div className="flex items-start gap-2 text-warn text-xs">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Mermaid syntax could not be rendered visually:</p>
              <p className="text-[11px] font-mono opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-[11px] text-muted mb-1 font-medium">Diagram Source Code:</p>
            <pre className="p-3 overflow-x-auto font-mono text-xs leading-relaxed bg-fill text-fg-2 rounded-lg border border-border">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      ) : (
        <pre className="p-4 overflow-x-auto font-mono text-xs leading-relaxed bg-fill text-fg-2 max-h-[500px]">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};
