import React from 'react';
import {
  FileText,
  FileCode2,
  Cpu,
  Layers,
  Sparkles,
  Eye,
  Code,
  CheckCircle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  Loader2,
  Lock,
  Copy,
  Check,
  Download,
  Edit3,
  Save,
  X,
  Maximize2,
  Columns,
} from 'lucide-react';
import { MarkdownViewer } from './MarkdownViewer';
import type { Document, DocumentVersion } from '../../bindings/ai-requirements-studio/internal/domain/models';

export interface DocumentCanvasPaneProps {
  docType: 'prd' | 'srs' | 'architecture' | 'design';
  document: Document | null;
  currentVersion: DocumentVersion | null;
  sections: string[];
  isDocLoading: boolean;
  isEditingDoc: boolean;
  docEditContent: string;
  onDocEditChange: (text: string) => void;
  selectedSectionNum: number;
  onSelectSectionNum: (num: number) => void;
  docDisplayMode: 'preview' | 'source';
  onSetDocDisplayMode: (mode: 'preview' | 'source') => void;
  copiedFullDoc: boolean;
  isDark: boolean;
  isPRDApproved: boolean;
  isSRSOutdated: boolean;
  layoutMode: 'chat' | 'split' | 'doc';
  onSetLayoutMode: (mode: 'chat' | 'split' | 'doc') => void;
  onCloseDocPane: () => void;
  // Handlers
  onGeneratePRD: () => void;
  onRegeneratePRDSection: () => void;
  onApprovePRD: () => void;
  onGenerateSRS: () => void;
  onRegenerateSRSSection: () => void;
  onApproveSRS: () => void;
  onGenerateArchitecture: () => void;
  onRegenerateArchitectureSection: () => void;
  onApproveArchitecture: () => void;
  onGenerateDesign: () => void;
  onRegenerateDesignSection: () => void;
  onApproveDesign: () => void;
  onCopyFullDoc: () => void;
  onExportDoc: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
}

export const DocumentCanvasPane: React.FC<DocumentCanvasPaneProps> = ({
  docType,
  document: docModel,
  currentVersion,
  sections,
  isDocLoading,
  isEditingDoc,
  docEditContent,
  onDocEditChange,
  selectedSectionNum,
  onSelectSectionNum,
  docDisplayMode,
  onSetDocDisplayMode,
  copiedFullDoc,
  isDark,
  isPRDApproved,
  isSRSOutdated,
  layoutMode,
  onSetLayoutMode,
  onCloseDocPane,
  onGeneratePRD,
  onRegeneratePRDSection,
  onApprovePRD,
  onGenerateSRS,
  onRegenerateSRSSection,
  onApproveSRS,
  onGenerateArchitecture,
  onRegenerateArchitectureSection,
  onApproveArchitecture,
  onGenerateDesign,
  onRegenerateDesignSection,
  onApproveDesign,
  onCopyFullDoc,
  onExportDoc,
  onStartEdit,
  onSaveEdit,
}) => {
  const docMeta = {
    prd: {
      title: 'PRD Document',
      subtitle: 'Product Requirements (20 Sections)',
      icon: FileText,
      color: 'text-tone-blue',
      bgColor: 'bg-tone-blue-bg',
    },
    srs: {
      title: 'SRS Document',
      subtitle: 'IEEE 830 Technical Specification (22 Sections)',
      icon: FileCode2,
      color: 'text-tone-teal',
      bgColor: 'bg-tone-teal-bg',
    },
    architecture: {
      title: 'Architecture Specification',
      subtitle: 'C4 Topology, API Contracts & STRIDE (16 Sections)',
      icon: Cpu,
      color: 'text-tone-violet',
      bgColor: 'bg-tone-violet-bg',
    },
    design: {
      title: 'Design System',
      subtitle: 'Visual Tokens, Flows & WCAG 2.2 AA (16 Sections)',
      icon: Layers,
      color: 'text-tone-orange',
      bgColor: 'bg-tone-orange-bg',
    },
  }[docType];

  const IconComp = docMeta.icon;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-surface text-fg select-text">
      {/* 1. Header Toolbar */}
      <div className="px-4 py-2 border-b border-border bg-panel/85 flex flex-wrap items-center justify-between gap-2 shrink-0 select-none">
        {/* Left: Document Badge & Versions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className={`p-1.5 rounded-lg ${docMeta.bgColor} ${docMeta.color}`}>
              <IconComp size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs text-fg leading-none">{docMeta.title}</h3>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold ${
                  docModel?.status === 'approved'
                    ? 'bg-ok-tint text-ok'
                    : isSRSOutdated && docType === 'srs'
                    ? 'bg-err-bg text-err'
                    : 'bg-fill text-muted'
                }`}>
                  {isSRSOutdated && docType === 'srs' ? 'Outdated' : docModel?.status || 'Draft'}
                </span>
              </div>
              <p className="text-[10px] text-muted-2 mt-0.5">{docMeta.subtitle}</p>
            </div>
          </div>

          {currentVersion && (
            <>
              <span className="text-[11px] font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded-[5px]">
                v{currentVersion.version_number}
              </span>

              {/* View Mode Switcher: Formatted Preview vs Raw Markdown */}
              <div className="flex items-center gap-0.5 bg-surface border border-border rounded-lg p-0.5 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => onSetDocDisplayMode('preview')}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    docDisplayMode === 'preview'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-muted hover:text-fg hover:bg-fill-mute'
                  }`}
                  title="Pratinjau Terformat Markdown & Diagram"
                >
                  <Eye size={12} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetDocDisplayMode('source')}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    docDisplayMode === 'source'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-muted hover:text-fg hover:bg-fill-mute'
                  }`}
                  title="Lihat Kode Sumber Mentah Markdown"
                >
                  <Code size={12} />
                  <span>Source</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Actions, Generation, Section Regen, Export, and Layout Mode */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Generation & Approval Buttons */}
          {docType === 'prd' ? (
            <>
              <button
                type="button"
                onClick={onGeneratePRD}
                disabled={isDocLoading}
                className="px-2.5 py-1 rounded-[6px] bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
              >
                {isDocLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>{currentVersion ? 'Regenerate PRD' : 'Generate PRD Draft'}</span>
              </button>

              {currentVersion && docModel?.status !== 'approved' && (
                <button
                  type="button"
                  onClick={onApprovePRD}
                  className="px-2.5 py-1 rounded-[6px] bg-ok hover:bg-ok-text text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <CheckCircle size={12} />
                  <span>Approve PRD</span>
                </button>
              )}
            </>
          ) : docType === 'srs' ? (
            <>
              {!isPRDApproved ? (
                <div className="flex items-center gap-1 text-[11px] text-warn bg-warn-bg border border-warn-border px-2 py-0.5 rounded-[6px]">
                  <Lock size={11} />
                  <span>Gated: PRD Belum Approved</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onGenerateSRS}
                    disabled={isDocLoading}
                    className="px-2.5 py-1 rounded-[6px] bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {isDocLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{currentVersion ? 'Regenerate SRS' : 'Generate SRS'}</span>
                  </button>

                  {currentVersion && docModel?.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={onApproveSRS}
                      className="px-2.5 py-1 rounded-[6px] bg-ok hover:bg-ok-text text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <FileCheck size={12} />
                      <span>Approve SRS</span>
                    </button>
                  )}
                </>
              )}
            </>
          ) : docType === 'architecture' ? (
            <>
              {!isPRDApproved ? (
                <div className="flex items-center gap-1 text-[11px] text-warn bg-warn-bg border border-warn-border px-2 py-0.5 rounded-[6px]">
                  <Lock size={11} />
                  <span>Gated: PRD Belum Approved</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onGenerateArchitecture}
                    disabled={isDocLoading}
                    className="px-2.5 py-1 rounded-[6px] bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {isDocLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{currentVersion ? 'Regenerate Arch' : 'Generate Arch'}</span>
                  </button>

                  {currentVersion && docModel?.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={onApproveArchitecture}
                      className="px-2.5 py-1 rounded-[6px] bg-ok hover:bg-ok-text text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Cpu size={12} />
                      <span>Approve Arch</span>
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {!isPRDApproved ? (
                <div className="flex items-center gap-1 text-[11px] text-warn bg-warn-bg border border-warn-border px-2 py-0.5 rounded-[6px]">
                  <Lock size={11} />
                  <span>Gated: PRD Belum Approved</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onGenerateDesign}
                    disabled={isDocLoading}
                    className="px-2.5 py-1 rounded-[6px] bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                  >
                    {isDocLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span>{currentVersion ? 'Regenerate Design' : 'Generate Design'}</span>
                  </button>

                  {currentVersion && docModel?.status !== 'approved' && (
                    <button
                      type="button"
                      onClick={onApproveDesign}
                      className="px-2.5 py-1 rounded-[6px] bg-ok hover:bg-ok-text text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 size={12} />
                      <span>Approve Design</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* Section Regen Selector */}
          {currentVersion && sections.length > 0 && (
            <div className="flex items-center gap-1 pl-1.5 border-l border-border/80">
              <select
                value={selectedSectionNum}
                onChange={(e) => onSelectSectionNum(Number(e.target.value))}
                className="border border-border rounded-[6px] px-1.5 py-1 text-[11px] bg-surface text-fg outline-none max-w-[130px] truncate"
              >
                {sections.map((sec, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1}. {sec}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={
                  docType === 'prd'
                    ? onRegeneratePRDSection
                    : docType === 'srs'
                    ? onRegenerateSRSSection
                    : docType === 'architecture'
                    ? onRegenerateArchitectureSection
                    : onRegenerateDesignSection
                }
                disabled={isDocLoading}
                title="Regenerate Section Terpilih Saja"
                className="p-1 rounded-[6px] border border-border hover:bg-fill-mute text-fg transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={isDocLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          )}

          {/* Document Content Utility: Copy, Export, Edit */}
          {currentVersion && (
            <div className="flex items-center gap-1 pl-1.5 border-l border-border/80">
              <button
                type="button"
                onClick={onCopyFullDoc}
                className={`p-1 rounded-[6px] border border-border transition-colors cursor-pointer ${
                  copiedFullDoc ? 'bg-ok-tint text-ok border-ok/40' : 'hover:bg-fill-mute text-fg'
                }`}
                title="Salin Seluruh Markdown"
              >
                {copiedFullDoc ? <Check size={12} /> : <Copy size={12} />}
              </button>

              <button
                type="button"
                onClick={onExportDoc}
                className="p-1 rounded-[6px] border border-border hover:bg-fill-mute text-fg transition-colors cursor-pointer"
                title="Export Dokumen Ini (.md)"
              >
                <Download size={12} />
              </button>

              {!isEditingDoc ? (
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="px-2 py-0.5 rounded-[6px] border border-border hover:bg-fill-mute text-fg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Edit Manual Dokumen"
                >
                  <Edit3 size={11} />
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onSaveEdit}
                  className="px-2.5 py-0.5 rounded-[6px] bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                  title="Simpan Perubahan Manual"
                >
                  <Save size={11} />
                  <span>Simpan</span>
                </button>
              )}
            </div>
          )}

          {/* Layout Controls: Maximize / Split toggle & Close */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-border/80">
            {layoutMode === 'split' ? (
              <button
                type="button"
                onClick={() => onSetLayoutMode('doc')}
                className="p-1 rounded-[5px] text-muted hover:text-fg hover:bg-fill transition-colors cursor-pointer"
                title="Maksimalkan Dokumen (Layar Penuh)"
              >
                <Maximize2 size={13} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSetLayoutMode('split')}
                className="p-1 rounded-[5px] text-muted hover:text-fg hover:bg-fill transition-colors cursor-pointer"
                title="Kembali ke Tampilan Split (Chat + Dokumen)"
              >
                <Columns size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={onCloseDocPane}
              className="p-1 rounded-[5px] text-muted hover:text-fg hover:bg-fill transition-colors cursor-pointer"
              title="Tutup Panel Dokumen (Kembali ke Chat Penuh)"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Outdated SRS Warning Banner */}
      {docType === 'srs' && isSRSOutdated && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 flex items-center justify-between text-xs px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">⚠️ Dokumen SRS Outdated:</span>
            <span>PRD mengalami perubahan versi sejak SRS terakhir disetujui. Harap regenerate SRS agar sinkron.</span>
          </div>
          <button
            type="button"
            onClick={onGenerateSRS}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-medium cursor-pointer shadow-2xs"
          >
            Regenerate SRS Sekarang
          </button>
        </div>
      )}

      {/* 2. Document Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
        {isDocLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-2 text-primary">
            <Loader2 size={30} className="animate-spin" />
            <span className="text-xs font-medium">AI Agent sedang menyusun spesifikasi dokumen secara real-time...</span>
          </div>
        ) : isEditingDoc ? (
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            <textarea
              value={docEditContent}
              onChange={(e) => onDocEditChange(e.target.value)}
              className="flex-1 w-full p-4 font-mono text-xs leading-relaxed border border-border rounded-xl bg-surface text-fg outline-none focus:border-primary resize-none min-h-[400px] shadow-2xs"
              placeholder="Tulis atau edit markdown spesifikasi di sini..."
            />
          </div>
        ) : !currentVersion ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted space-y-3">
            <IconComp size={42} className="text-muted/50" />
            <p className="text-xs font-medium text-fg">Draft {docMeta.title} Belum Dibuat</p>
            <p className="text-[11px] text-muted-2 max-w-sm text-center leading-relaxed">
              Anda dapat mengklik tombol "Generate {docType.toUpperCase()}" di atas atau mendiskusikannya dengan agen spesialis di panel Chat di sebelah kiri.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full">
            {docDisplayMode === 'preview' ? (
              <MarkdownViewer content={currentVersion.content} isDark={isDark} />
            ) : (
              <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-2xs">
                <div className="px-3.5 py-2 bg-panel border-b border-border flex items-center justify-between text-xs">
                  <span className="font-mono text-muted text-[11px]">
                    Markdown Source (v{currentVersion.version_number})
                  </span>
                  <button
                    type="button"
                    onClick={onCopyFullDoc}
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
                  >
                    <Copy size={11} />
                    <span>Salin Source</span>
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto font-mono text-xs leading-relaxed bg-fill text-fg-2 whitespace-pre-wrap">
                  <code>{currentVersion.content}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
