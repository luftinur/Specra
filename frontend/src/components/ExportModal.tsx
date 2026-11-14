import React, { useState, useEffect } from 'react';
import { Download, FolderOpen, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { DocumentService } from '../../bindings/ai-requirements-studio/internal/services';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectId: string;
  currentDocType: 'prd' | 'srs' | 'architecture' | 'design';
  docStatuses: {
    prd: { exists: boolean; version?: number; status?: string };
    srs: { exists: boolean; version?: number; status?: string };
    architecture: { exists: boolean; version?: number; status?: string };
    design: { exists: boolean; version?: number; status?: string };
  };
  initialScope?: 'single' | 'all';
  onExportSuccess: (message: string) => void;
  onExportError: (error: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  projectId,
  currentDocType,
  docStatuses,
  initialScope = 'all',
  onExportSuccess,
  onExportError,
}) => {
  const [exportScope, setExportScope] = useState<'single' | 'all'>(initialScope);
  const [targetPath, setTargetPath] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isBrowsing, setIsBrowsing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && initialScope) {
      setExportScope(initialScope);
    }
  }, [isOpen, initialScope]);

  // Initialize default path based on project name and scope
  useEffect(() => {
    const slug = (projectName || 'project').toLowerCase().replace(/\s+/g, '-');
    if (exportScope === 'all') {
      setTargetPath(`C:\\specra-exports\\${slug}`);
    } else {
      const filename = currentDocType === 'prd' 
        ? 'PRD.md' 
        : currentDocType === 'srs' 
        ? 'SRS.md' 
        : currentDocType === 'architecture' 
        ? 'architecture.md' 
        : 'design.md';
      setTargetPath(`C:\\specra-exports\\${slug}\\${filename}`);
    }
  }, [projectName, exportScope, currentDocType, isOpen]);

  if (!isOpen) return null;

  const handleBrowse = async () => {
    setIsBrowsing(true);
    try {
      if (exportScope === 'all') {
        const dir = await DocumentService.SelectDirectory('Select Destination Folder for Documents');
        if (dir) setTargetPath(dir);
      } else {
        const filename = currentDocType === 'prd' 
          ? 'PRD.md' 
          : currentDocType === 'srs' 
          ? 'SRS.md' 
          : currentDocType === 'architecture' 
          ? 'architecture.md' 
          : 'design.md';
        const file = await DocumentService.SelectSaveFile('Save Document As', filename);
        if (file) setTargetPath(file);
      }
    } catch (err) {
      console.warn('Native dialog closed or unsupported:', err);
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleExecuteExport = async () => {
    if (!targetPath.trim()) {
      onExportError('Please specify a destination file or folder path first.');
      return;
    }

    setIsExporting(true);
    try {
      if (exportScope === 'all') {
        const results = await DocumentService.ExportAllDocuments(projectId, targetPath.trim());
        const count = results ? Object.keys(results).length : 0;
        onExportSuccess(`Successfully exported ${count} specification document(s) to: ${targetPath.trim()}`);
        onClose();
      } else {
        await DocumentService.ExportDocument(projectId, currentDocType, targetPath.trim());
        onExportSuccess(`${currentDocType.toUpperCase()} document successfully exported to: ${targetPath.trim()}`);
        onClose();
      }
    } catch (err) {
      onExportError(`Failed to export document(s): ${String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  const docList = [
    { id: 'prd' as const, name: 'PRD (Product Requirements)', filename: 'PRD.md', ...docStatuses.prd },
    { id: 'srs' as const, name: 'SRS (IEEE 830 Specs)', filename: 'SRS.md', ...docStatuses.srs },
    { id: 'architecture' as const, name: 'Architecture (C4 & APIs)', filename: 'architecture.md', ...docStatuses.architecture },
    { id: 'design' as const, name: 'Design System (Tokens & Flows)', filename: 'design.md', ...docStatuses.design },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9990] flex items-center justify-center p-4 select-none animate-in fade-in duration-100">
      <div 
        className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border bg-panel flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-soft text-primary">
              <Download size={16} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-fg">Export Specification Documents</h4>
              <p className="text-[11px] text-muted">Project: {projectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-fg hover:bg-fill transition-colors cursor-pointer"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Scope Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-fg">Export Scope</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  exportScope === 'all'
                    ? 'border-primary bg-primary-soft/60 text-primary font-semibold shadow-2xs'
                    : 'border-border bg-fill-soft/40 hover:bg-fill-mute text-fg'
                }`}
              >
                <div className="text-xs font-bold">All Documents (4)</div>
                <div className="text-[10.5px] text-muted mt-0.5">PRD, SRS, Architecture, & Design</div>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('single')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  exportScope === 'single'
                    ? 'border-primary bg-primary-soft/60 text-primary font-semibold shadow-2xs'
                    : 'border-border bg-fill-soft/40 hover:bg-fill-mute text-fg'
                }`}
              >
                <div className="text-xs font-bold">Active Document Only</div>
                <div className="text-[10.5px] text-muted mt-0.5">Only {currentDocType.toUpperCase()}.md</div>
              </button>
            </div>
          </div>

          {/* Target Location Input with Browse Button */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-fg">
              {exportScope === 'all' ? 'Destination Folder' : 'Save File Path'}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                placeholder={exportScope === 'all' ? 'C:\\path\\to\\folder' : 'C:\\path\\to\\file.md'}
                className="flex-1 px-3 py-2 text-xs bg-fill border border-border rounded-xl text-fg font-mono outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleBrowse}
                disabled={isBrowsing}
                className="px-3 py-2 bg-surface hover:bg-fill-mute border border-border rounded-xl text-xs font-semibold text-fg flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs cursor-pointer"
                title="Browse folder visually using native system dialog"
              >
                {isBrowsing ? <Loader2 size={13} className="animate-spin text-primary" /> : <FolderOpen size={13} className="text-primary" />}
                <span>Browse...</span>
              </button>
            </div>
            <p className="text-[10.5px] text-muted">
              {exportScope === 'all' 
                ? 'All specification documents will be exported as Markdown (.md) files into this folder.' 
                : 'Document will be saved directly to the target file above.'}
            </p>
          </div>

          {/* Document Readiness Checklist */}
          <div className="space-y-1.5 pt-1 border-t border-border">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
              Document Readiness Status
            </div>
            <div className="space-y-1">
              {docList.map((doc) => {
                const isCurrent = doc.id === currentDocType;
                const isSelected = exportScope === 'all' || isCurrent;
                return (
                  <div 
                    key={doc.id}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                      isSelected 
                        ? 'border-border bg-surface' 
                        : 'border-border/40 opacity-40 bg-fill/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={13} className={doc.exists ? 'text-primary' : 'text-muted'} />
                      <span className="font-medium text-fg">{doc.name}</span>
                      <span className="text-[10px] font-mono text-muted">({doc.filename})</span>
                    </div>

                    <div>
                      {doc.exists ? (
                        <span className="text-[10px] font-mono font-bold text-ok flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          <span>Ready (v{doc.version || 1})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-muted flex items-center gap-1">
                          <AlertCircle size={11} />
                          <span>Not Generated</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-border bg-panel flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-fill-mute text-fg text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting || !targetPath.trim()}
            className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span>{isExporting ? 'Exporting...' : 'Export Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
