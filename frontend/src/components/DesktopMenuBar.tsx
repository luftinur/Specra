import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  FileCode2,
  Cpu,
  Layers,
  Sparkles,
  Download,
  FolderOpen,
  Plus,
  Settings,
  Moon,
  Sun,
  Monitor,
  Layout,
  Columns,
  Maximize2,
  Trash2,
  Copy,
  Zap,
  Activity,
  HelpCircle,
  Search,
  CheckCircle2,
} from 'lucide-react';

export interface DesktopMenuBarProps {
  activeProjectName?: string;
  hasActiveProject: boolean;
  activeDocType: 'prd' | 'srs' | 'architecture' | 'design';
  layoutMode: 'chat' | 'split' | 'doc';
  showLeftSidebar: boolean;
  showRightInspector: boolean;
  isDark: boolean;
  themeMode: 'system' | 'light' | 'dark';
  docStatuses: {
    prd: { exists: boolean; status?: string };
    srs: { exists: boolean; status?: string };
    architecture: { exists: boolean; status?: string };
    design: { exists: boolean; status?: string };
  };
  activeAgentId: 'product-analyst' | 'system-analyst' | 'software-architect' | 'ui-ux-agent';
  // Actions
  onNewProject: () => void;
  onOpenProjectManager: () => void;
  onOpenWorkspaceFolder: () => void;
  onExportActiveDoc: () => void;
  onExportAllDocs: () => void;
  onOpenSettings: (tab?: string) => void;
  onClearChat: () => void;
  onCopyDoc: () => void;
  onToggleLeftSidebar: () => void;
  onToggleRightInspector: () => void;
  onSetLayoutMode: (mode: 'chat' | 'split' | 'doc') => void;
  onSetTheme: (theme: 'system' | 'light' | 'dark') => void;
  onOpenDoc: (type: 'prd' | 'srs' | 'architecture' | 'design') => void;
  onSelectAgent: (agentId: 'product-analyst' | 'system-analyst' | 'software-architect' | 'ui-ux-agent') => void;
  onRunAutoPipeline: () => void;
  onRunClarify: () => void;
  onRunValidation: () => void;
  onRunDiagnostics: () => void;
}

export const DesktopMenuBar: React.FC<DesktopMenuBarProps> = ({
  hasActiveProject,
  activeDocType,
  layoutMode,
  showLeftSidebar,
  showRightInspector,
  themeMode,
  docStatuses,
  activeAgentId,
  onNewProject,
  onOpenProjectManager,
  onOpenWorkspaceFolder,
  onExportActiveDoc,
  onExportAllDocs,
  onOpenSettings,
  onClearChat,
  onCopyDoc,
  onToggleLeftSidebar,
  onToggleRightInspector,
  onSetLayoutMode,
  onSetTheme,
  onOpenDoc,
  onSelectAgent,
  onRunAutoPipeline,
  onRunClarify,
  onRunValidation,
  onRunDiagnostics,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B: Toggle Left Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleLeftSidebar();
      }
      // Ctrl+J: Toggle Right Co-Pilot
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onToggleRightInspector();
      }
      // Ctrl+1: Chat Only
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        onSetLayoutMode('chat');
      }
      // Ctrl+2: Split View
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        onSetLayoutMode('split');
      }
      // Ctrl+3: Document Only
      if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        e.preventDefault();
        onSetLayoutMode('doc');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleLeftSidebar, onToggleRightInspector, onSetLayoutMode]);

  const toggleMenu = (menuKey: string) => {
    setOpenMenu(prev => (prev === menuKey ? null : menuKey));
  };

  const handleMenuHover = (menuKey: string) => {
    if (openMenu !== null) {
      setOpenMenu(menuKey);
    }
  };

  const closeMenu = () => setOpenMenu(null);

  return (
    <div
      ref={barRef}
      className="h-7 px-2 border-b border-border/70 bg-chrome/90 backdrop-blur-xs flex items-center justify-between text-xs select-none shrink-0 z-40"
    >
      {/* Left Menu Items */}
      <div className="flex items-center gap-0.5">
        {/* FILE MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('file')}
            onMouseEnter={() => handleMenuHover('file')}
            className={`px-2 py-0.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
              openMenu === 'file' ? 'bg-primary-soft text-primary font-semibold' : 'text-fg-2 hover:bg-fill hover:text-fg'
            }`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div className="absolute top-full left-0 mt-1 w-56 rounded-lg bg-surface border border-border shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => { closeMenu(); onNewProject(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Plus size={13} />
                  <span>Project Baru...</span>
                </div>
                <span className="text-[10px] text-muted font-mono">Ctrl+N</span>
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onOpenProjectManager(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={13} />
                  <span>Buka Project Manager</span>
                </div>
                <span className="text-[10px] text-muted font-mono">Ctrl+O</span>
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onOpenWorkspaceFolder(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center gap-2 transition-colors"
              >
                <FolderOpen size={13} />
                <span>Buka Folder Workspace di Explorer</span>
              </button>

              <div className="my-1 border-t border-border/60" />

              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onExportActiveDoc(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-2">
                  <Download size={13} />
                  <span>Ekspor Dokumen Aktif...</span>
                </div>
                <span className="text-[10px] text-muted font-mono">.md</span>
              </button>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onExportAllDocs(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-2">
                  <Download size={13} />
                  <span>Ekspor Seluruh Dokumen (.md)...</span>
                </div>
                <span className="text-[10px] text-muted font-mono">All</span>
              </button>

              <div className="my-1 border-t border-border/60" />

              <button
                type="button"
                onClick={() => { closeMenu(); onOpenSettings('general'); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings size={13} />
                  <span>Pengaturan Studio...</span>
                </div>
                <span className="text-[10px] text-muted font-mono">Ctrl+,</span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('edit')}
            onMouseEnter={() => handleMenuHover('edit')}
            className={`px-2 py-0.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
              openMenu === 'edit' ? 'bg-primary-soft text-primary font-semibold' : 'text-fg-2 hover:bg-fill hover:text-fg'
            }`}
          >
            Edit
          </button>
          {openMenu === 'edit' && (
            <div className="absolute top-full left-0 mt-1 w-52 rounded-lg bg-surface border border-border shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onCopyDoc(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-2">
                  <Copy size={13} />
                  <span>Salin Isi Dokumen</span>
                </div>
                <span className="text-[10px] text-muted font-mono">Ctrl+C</span>
              </button>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onClearChat(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-500/10 hover:text-rose-600 flex items-center gap-2 transition-colors text-rose-500 disabled:opacity-40 disabled:pointer-events-none"
              >
                <Trash2 size={13} />
                <span>Bersihkan Riwayat Chat</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('view')}
            onMouseEnter={() => handleMenuHover('view')}
            className={`px-2 py-0.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
              openMenu === 'view' ? 'bg-primary-soft text-primary font-semibold' : 'text-fg-2 hover:bg-fill hover:text-fg'
            }`}
          >
            View
          </button>
          {openMenu === 'view' && (
            <div className="absolute top-full left-0 mt-1 w-60 rounded-lg bg-surface border border-border shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-2 tracking-wider">
                Tata Letak Panel
              </div>
              <button
                type="button"
                onClick={() => { closeMenu(); onToggleLeftSidebar(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Columns size={13} />
                  <span>Sidebar Kiri (Navigator)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted">{showLeftSidebar ? 'On' : 'Off'}</span>
                  <span className="text-[10px] text-muted-2 font-mono">Ctrl+B</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onToggleRightInspector(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layout size={13} />
                  <span>Sidebar Kanan (Co-Pilot)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted">{showRightInspector ? 'On' : 'Off'}</span>
                  <span className="text-[10px] text-muted-2 font-mono">Ctrl+J</span>
                </div>
              </button>

              <div className="my-1 border-t border-border/60" />

              <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-2 tracking-wider">
                Mode Tampilan Workspace
              </div>
              <button
                type="button"
                onClick={() => { closeMenu(); onSetLayoutMode('chat'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  layoutMode === 'chat' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Maximize2 size={13} />
                  <span>Chat Utama Saja</span>
                </div>
                <span className="text-[10px] text-muted font-mono">Ctrl+1</span>
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onSetLayoutMode('split'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  layoutMode === 'split' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Columns size={13} />
                  <span>Split View (Chat + Dokumen)</span>
                </div>
                <span className="text-[10px] text-muted font-mono">Ctrl+2</span>
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onSetLayoutMode('doc'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  layoutMode === 'doc' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText size={13} />
                  <span>Dokumen Layar Penuh</span>
                </div>
                <span className="text-[10px] text-muted font-mono">Ctrl+3</span>
              </button>

              <div className="my-1 border-t border-border/60" />

              <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-2 tracking-wider">
                Tema Visual
              </div>
              <button
                type="button"
                onClick={() => { closeMenu(); onSetTheme('light'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  themeMode === 'light' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sun size={13} className="text-amber-500" />
                  <span>Light (Warm Stone)</span>
                </div>
                {themeMode === 'light' && <CheckCircle2 size={12} />}
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onSetTheme('dark'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  themeMode === 'dark' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Moon size={13} className="text-tone-violet" />
                  <span>Dark (Obsidian Slate)</span>
                </div>
                {themeMode === 'dark' && <CheckCircle2 size={12} />}
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onSetTheme('system'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  themeMode === 'system' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Monitor size={13} />
                  <span>System Auto</span>
                </div>
                {themeMode === 'system' && <CheckCircle2 size={12} />}
              </button>
            </div>
          )}
        </div>

        {/* DOCUMENTS MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('docs')}
            onMouseEnter={() => handleMenuHover('docs')}
            className={`px-2 py-0.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
              openMenu === 'docs' ? 'bg-primary-soft text-primary font-semibold' : 'text-fg-2 hover:bg-fill hover:text-fg'
            }`}
          >
            Documents
          </button>
          {openMenu === 'docs' && (
            <div className="absolute top-full left-0 mt-1 w-64 rounded-lg bg-surface border border-border shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-2 tracking-wider">
                Spesifikasi Sistem
              </div>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onOpenDoc('prd'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                  activeDocType === 'prd' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={13} className="text-tone-blue shrink-0" />
                  <span className="truncate">PRD (Product Requirements)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase">
                  {docStatuses.prd.status || 'Draft'}
                </span>
              </button>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onOpenDoc('srs'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                  activeDocType === 'srs' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode2 size={13} className="text-tone-teal shrink-0" />
                  <span className="truncate">SRS (System Requirements)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase">
                  {docStatuses.srs.status || 'Draft'}
                </span>
              </button>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onOpenDoc('architecture'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                  activeDocType === 'architecture' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Cpu size={13} className="text-tone-violet shrink-0" />
                  <span className="truncate">Architecture (C4 & API)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase">
                  {docStatuses.architecture.status || 'Draft'}
                </span>
              </button>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onOpenDoc('design'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                  activeDocType === 'design' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers size={13} className="text-tone-orange shrink-0" />
                  <span className="truncate">Design System (Tokens)</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase">
                  {docStatuses.design.status || 'Draft'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* AI AGENT MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('agent')}
            onMouseEnter={() => handleMenuHover('agent')}
            className={`px-2 py-0.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
              openMenu === 'agent' ? 'bg-primary-soft text-primary font-semibold' : 'text-fg-2 hover:bg-fill hover:text-fg'
            }`}
          >
            AI Agent
          </button>
          {openMenu === 'agent' && (
            <div className="absolute top-full left-0 mt-1 w-64 rounded-lg bg-surface border border-border shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-2 tracking-wider">
                Persona Spesialis
              </div>
              <button
                type="button"
                onClick={() => { closeMenu(); onSelectAgent('product-analyst'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  activeAgentId === 'product-analyst' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-tone-blue" />
                  <span>Product Analyst (PRD)</span>
                </div>
                {activeAgentId === 'product-analyst' && <CheckCircle2 size={12} />}
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onSelectAgent('system-analyst'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  activeAgentId === 'system-analyst' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode2 size={13} className="text-tone-teal" />
                  <span>System Analyst (SRS)</span>
                </div>
                {activeAgentId === 'system-analyst' && <CheckCircle2 size={12} />}
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onSelectAgent('software-architect'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  activeAgentId === 'software-architect' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cpu size={13} className="text-tone-violet" />
                  <span>Software Architect (C4)</span>
                </div>
                {activeAgentId === 'software-architect' && <CheckCircle2 size={12} />}
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onSelectAgent('ui-ux-agent'); }}
                className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
                  activeAgentId === 'ui-ux-agent' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill text-fg'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers size={13} className="text-tone-orange" />
                  <span>UI/UX Agent (Design)</span>
                </div>
                {activeAgentId === 'ui-ux-agent' && <CheckCircle2 size={12} />}
              </button>

              <div className="my-1 border-t border-border/60" />

              <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted-2 tracking-wider">
                Orchestration & Perintah
              </div>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onRunAutoPipeline(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-2">
                  <Zap size={13} className="text-amber-500" />
                  <span>Jalankan Auto-Pipeline</span>
                </div>
                <span className="text-[10px] text-muted font-mono">/plan</span>
              </button>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onRunClarify(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-2">
                  <HelpCircle size={13} />
                  <span>Trigger Klarifikasi</span>
                </div>
                <span className="text-[10px] text-muted font-mono">/clarify</span>
              </button>
              <button
                type="button"
                disabled={!hasActiveProject}
                onClick={() => { closeMenu(); onRunValidation(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center justify-between transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-2">
                  <Activity size={13} />
                  <span>Audit Kualitas Requirements</span>
                </div>
                <span className="text-[10px] text-muted font-mono">/validate</span>
              </button>
            </div>
          )}
        </div>

        {/* HELP MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('help')}
            onMouseEnter={() => handleMenuHover('help')}
            className={`px-2 py-0.5 rounded-[4px] text-[12px] font-medium transition-colors cursor-pointer ${
              openMenu === 'help' ? 'bg-primary-soft text-primary font-semibold' : 'text-fg-2 hover:bg-fill hover:text-fg'
            }`}
          >
            Help
          </button>
          {openMenu === 'help' && (
            <div className="absolute top-full left-0 mt-1 w-52 rounded-lg bg-surface border border-border shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => { closeMenu(); onRunDiagnostics(); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center gap-2 transition-colors"
              >
                <Activity size={13} />
                <span>Diagnostik AI & Keyring</span>
              </button>
              <button
                type="button"
                onClick={() => { closeMenu(); onOpenSettings('tokens'); }}
                className="w-full text-left px-3 py-1.5 hover:bg-primary-soft hover:text-primary flex items-center gap-2 transition-colors"
              >
                <Search size={13} />
                <span>Log Pemakaian Token</span>
              </button>
              <div className="my-1 border-t border-border/60" />
              <div className="px-3 py-1.5 text-[11px] text-muted space-y-0.5">
                <div className="font-semibold text-fg">AI Requirements Studio</div>
                <div className="text-[10px] text-muted-2">v1.2.0 Desktop • Zero-Mock</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side Quick Indicators */}
      <div className="flex items-center gap-2 text-[11px]">
        {/* Quick Layout Mode Pill */}
        <div className="flex items-center p-0.5 rounded-[5px] bg-fill border border-border/70">
          <button
            type="button"
            onClick={() => onSetLayoutMode('chat')}
            className={`px-1.5 py-0.5 rounded-[4px] text-[10.5px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              layoutMode === 'chat' ? 'bg-surface text-primary font-semibold shadow-2xs' : 'text-muted hover:text-fg'
            }`}
            title="Mode Chat Saja (Ctrl+1)"
          >
            <span>💬 Chat</span>
          </button>
          <button
            type="button"
            onClick={() => onSetLayoutMode('split')}
            className={`px-1.5 py-0.5 rounded-[4px] text-[10.5px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              layoutMode === 'split' ? 'bg-surface text-primary font-semibold shadow-2xs' : 'text-muted hover:text-fg'
            }`}
            title="Mode Split: Chat + Dokumen Berdampingan (Ctrl+2)"
          >
            <span>◫ Split</span>
          </button>
          <button
            type="button"
            onClick={() => onSetLayoutMode('doc')}
            className={`px-1.5 py-0.5 rounded-[4px] text-[10.5px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              layoutMode === 'doc' ? 'bg-surface text-primary font-semibold shadow-2xs' : 'text-muted hover:text-fg'
            }`}
            title="Mode Dokumen Penuh (Ctrl+3)"
          >
            <span>📄 Doc</span>
          </button>
        </div>
      </div>
    </div>
  );
};
