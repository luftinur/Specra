import React, { useState, useEffect, useRef, useMemo } from 'react';
import { resolveZoomFactor, SCALE_OPTIONS } from './lib/uiScale';
import { 
  Terminal, 
  Settings, 
  Send, 
  FileText, 
  PanelRight, 
  Plus, 
  Loader2, 
  Trash2, 
  MessageSquare, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Edit3, 
  Save, 
  Lock, 
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  ShieldAlert,
  Activity,
  Key,
  Database,
  X,
  Check,
  ListOrdered,
  Cpu,
  Bot,
  Zap,
  BarChart2,
  Search,
  RotateCw,
  List,
  FolderKanban,
  Paperclip,
  LayoutGrid,
  Sun,
  Moon,
  Sliders,
  FolderOpen,
  Layers,
  Globe,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Columns,
  Copy
} from 'lucide-react';
import { MarkdownViewer } from './components/MarkdownViewer';
import { SpecraLogo, SpecraIcon, SpecraWordmark } from './components/SpecraBrand';
import { ToastContainer, type ToastItem, type ToastType } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { ExportModal } from './components/ExportModal';
import { DesktopMenuBar } from './components/DesktopMenuBar';
import { DocumentCanvasPane } from './components/DocumentCanvasPane';
import { useResizablePanel } from './hooks/useResizablePanel';
import { 
  ProjectService, 
  ConversationService, 
  ProviderService, 
  RequirementService, 
  DocumentService,
  ValidationService
} from "../bindings/ai-requirements-studio/internal/services";
import type { 
  Project, 
  Conversation, 
  Message, 
  Requirement, 
  Clarification, 
  Assumption,
  DocumentVersion,
  Document,
  ValidationFinding,
  DetectedAgent,
  ProviderExecution,
  TokenUsageSummary,
  AgentConfig,
  MCPServerConfig,
  GeneralSettings,
  SkillConfig,
  ModelInfo
} from "../bindings/ai-requirements-studio/internal/domain/models";

export default function App() {
  const [currentView, setCurrentView] = useState<'chat' | 'prd' | 'srs' | 'architecture' | 'design'>('chat');
  const [layoutMode, setLayoutMode] = useState<'chat' | 'split' | 'doc'>('chat');
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [activeDocType, setActiveDocType] = useState<'prd' | 'srs' | 'architecture' | 'design'>('prd');

  // Resizable Panels
  const leftPanel = useResizablePanel({
    storageKey: 'specra_left_panel_width',
    defaultWidth: 230,
    minWidth: 160,
    maxWidth: 420,
    direction: 'left',
  });

  const rightPanel = useResizablePanel({
    storageKey: 'specra_right_panel_width',
    defaultWidth: 320,
    minWidth: 240,
    maxWidth: 550,
    direction: 'right',
  });

  const centerSplit = useResizablePanel({
    storageKey: 'specra_chat_split_width',
    defaultWidth: 540,
    minWidth: 320,
    maxWidth: 950,
    direction: 'left',
  });

  // Open Project Tabs (Figma / MQ-Studio Pattern)
  const [openProjectIds, setOpenProjectIds] = useState<string[]>([]);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [projectManagerTab, setProjectManagerTab] = useState<'open' | 'create'>('open');
  const [projectSearchFilter, setProjectSearchFilter] = useState('');

  // In-App Toast & Modal Feedback State
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const notify = (type: ToastType, title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts(prev => [...prev, { id, title, message, type }]);
  };
  const notifySuccess = (title: string, message?: string) => notify('success', title, message);
  const notifyError = (title: string, message?: string) => notify('error', title, message);
  const notifyWarn = (title: string, message?: string) => notify('warn', title, message);
  const notifyInfo = (title: string, message?: string) => notify('info', title, message);
  void notifyInfo;
  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: true,
    onConfirm: () => {},
  });

  // Dedicated Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportInitialScope, setExportInitialScope] = useState<'single' | 'all'>('single');

  // Core State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeSession, setActiveSession] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [providerStatus, setProviderStatus] = useState<{ available: boolean; version: string; model?: string }>({
    available: false,
    version: '...',
    model: '',
  });

  // Document State
  const [prdDetails, setPrdDetails] = useState<{
    document: Document | null;
    current_version: DocumentVersion | null;
    versions: DocumentVersion[];
    sections: string[];
  }>({ document: null, current_version: null, versions: [], sections: [] });

  const [srsDetails, setSrsDetails] = useState<{
    document: Document | null;
    current_version: DocumentVersion | null;
    versions: DocumentVersion[];
    sections: string[];
  }>({ document: null, current_version: null, versions: [], sections: [] });

  const [architectureDetails, setArchitectureDetails] = useState<{
    document: Document | null;
    current_version: DocumentVersion | null;
    versions: DocumentVersion[];
    sections: string[];
  }>({ document: null, current_version: null, versions: [], sections: [] });

  const [designDetails, setDesignDetails] = useState<{
    document: Document | null;
    current_version: DocumentVersion | null;
    versions: DocumentVersion[];
    sections: string[];
  }>({ document: null, current_version: null, versions: [], sections: [] });

  // Phase 4: Validation & Traceability State
  const [findings, setFindings] = useState<ValidationFinding[]>([]);
  const [traceabilityMatrix, setTraceabilityMatrix] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Document UI State
  const [generatingDoc, setGeneratingDoc] = useState<'prd' | 'srs' | 'architecture' | 'design' | null>(null);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [docEditContent, setDocEditContent] = useState('');
  const [selectedSectionNum, setSelectedSectionNum] = useState<number>(1);
  const [docDisplayMode, setDocDisplayMode] = useState<'preview' | 'source'>('preview');
  const [copiedFullDoc, setCopiedFullDoc] = useState(false);

  // Project Co-Pilot & Chat UI State
  const [openAccordion, setOpenAccordion] = useState<'requirements' | 'qa' | 'assumptions' | 'audit' | null>('requirements');
  const [showInspector, setShowInspector] = useState(true);
  const [editingAssumptionId, setEditingAssumptionId] = useState<string | null>(null);
  const [editingAssumptionText, setEditingAssumptionText] = useState<string>('');
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);


  // Close Add Skill dropdown when clicking outside
  const addSkillDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showAddSkillDropdown, setShowAddSkillDropdown] = useState(false);
  useEffect(() => {
    const handleSkillClickOutside = (event: MouseEvent) => {
      if (addSkillDropdownRef.current && !addSkillDropdownRef.current.contains(event.target as Node)) {
        setShowAddSkillDropdown(false);
      }
    };
    if (showAddSkillDropdown) {
      document.addEventListener('mousedown', handleSkillClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleSkillClickOutside);
    };
  }, [showAddSkillDropdown]);

  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [isExtractingReqs, setIsExtractingReqs] = useState(false);

  // Agentic Interaction Modes & Slash Commands
  const [interactionMode, setInteractionMode] = useState<'discovery' | 'execution'>('discovery');
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const personaMenuRef = useRef<HTMLDivElement | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const slashItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const handleMenusClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (personaMenuRef.current && !personaMenuRef.current.contains(target)) {
        setShowPersonaMenu(false);
      }
      if (slashMenuRef.current && !slashMenuRef.current.contains(target)) {
        setShowSlashMenu(false);
      }
    };
    document.addEventListener('mousedown', handleMenusClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleMenusClickOutside);
    };
  }, []);

  // Modals
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  // Specialist Agent Chat State
  const [activeChatAgent, setActiveChatAgent] = useState<'product-analyst' | 'system-analyst' | 'software-architect' | 'ui-ux-agent'>('product-analyst');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: number; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-sync specialist persona with the active document view
  useEffect(() => {
    if (currentView === 'prd') {
      setActiveChatAgent('product-analyst');
    } else if (currentView === 'srs') {
      setActiveChatAgent('system-analyst');
    } else if (currentView === 'architecture') {
      setActiveChatAgent('software-architect');
    } else if (currentView === 'design') {
      setActiveChatAgent('ui-ux-agent');
    }
  }, [currentView]);

  // Theme & Typography Scale State
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => {
    return (localStorage.getItem('theme_mode') as 'system' | 'light' | 'dark') || 'system';
  });
  const [fontScale, setFontScale] = useState<string>(() => {
    return localStorage.getItem('font_scale') || 'auto';
  });
  const [isCurrentDark, setIsCurrentDark] = useState(false);

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    theme: 'system',
    font_size: 'standard',
    animations: true,
    language: 'id',
    chat_language: 'id',
    doc_language: 'en',
    auto_save_draft: true,
    auto_save_interval_ms: 1000,
    default_doc_depth: 'standard',
    proactive_clarification: true,
    desktop_notifications: true,
    workspace_path: '',
  });
  const [generalSaveSuccess, setGeneralSaveSuccess] = useState<string | null>(null);

  // Advanced Settings & Providers State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'personas' | 'mcp' | 'providers' | 'tokens' | 'diagnostics'>('general');
  const [agentsList, setAgentsList] = useState<AgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('product-analyst');
  const [editingPrompt, setEditingPrompt] = useState<string>('');
  const [agentSaveSuccess, setAgentSaveSuccess] = useState<string>('');
  const [skillsCatalog, setSkillsCatalog] = useState<SkillConfig[]>([]);
  const [isNewSkillModalOpen, setIsNewSkillModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState<string>('');
  const [newSkillId, setNewSkillId] = useState<string>('');
  const [newSkillCategory, setNewSkillCategory] = useState<'product' | 'system' | 'architecture' | 'uiux' | 'general'>('general');
  const [newSkillDesc, setNewSkillDesc] = useState<string>('');
  const [newSkillPrompt, setNewSkillPrompt] = useState<string>('');
  const [skillSaveSuccess, setSkillSaveSuccess] = useState<string>('');

  const [mcpList, setMcpList] = useState<MCPServerConfig[]>([]);
  const [newMcpId, setNewMcpId] = useState<string>('');
  const [newMcpName, setNewMcpName] = useState<string>('');
  const [newMcpTransport, setNewMcpTransport] = useState<'stdio' | 'sse'>('stdio');
  const [newMcpEndpoint, setNewMcpEndpoint] = useState<string>('');
  const [newMcpScope, setNewMcpScope] = useState<'global' | 'persona'>('global');
  const [newMcpAssignedAgents, setNewMcpAssignedAgents] = useState<string[]>([]);
  const [mcpSaveSuccess, setMcpSaveSuccess] = useState<string>('');

  const [detectedAgents, setDetectedAgents] = useState<DetectedAgent[]>([]);
  const [isDetectingAgents, setIsDetectingAgents] = useState(false);
  const [primaryProvider, setPrimaryProvider] = useState<string>('antigravity-cli');
  const [fallbackProvider, setFallbackProvider] = useState<string>('opencode');
  const [fallbackEnabled, setFallbackEnabled] = useState<boolean>(true);
  const [agyModel, setAgyModel] = useState<string>('');
  const [agyModelsList, setAgyModelsList] = useState<ModelInfo[]>([]);
  const [opencodeBaseURL, setOpencodeBaseURL] = useState<string>('');
  const [opencodeModel, setOpencodeModel] = useState<string>('default');
  const [opencodeApiKey, setOpencodeApiKey] = useState<string>('');
  const [opencodeModelsList, setOpencodeModelsList] = useState<ModelInfo[]>([]);
  const [geminiModel, setGeminiModel] = useState<string>('gemini-1.5-pro');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [geminiModelsList, setGeminiModelsList] = useState<ModelInfo[]>([]);
  const [tokenSummary, setTokenSummary] = useState<TokenUsageSummary | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ProviderExecution[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [providerSaveSuccess, setProviderSaveSuccess] = useState<string>('');

  const [diagResults, setDiagResults] = useState<any>(null);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySaveMsg, setKeySaveMsg] = useState('');

  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  const [editProjectStatus, setEditProjectStatus] = useState('active');

  // Auto Pipeline Orchestrator State
  const [autoPipelineRunning, setAutoPipelineRunning] = useState(false);
  const [autoPipelineStage, setAutoPipelineStage] = useState<string | null>(null);
  const [pipelinePausedReason, setPipelinePausedReason] = useState<string | null>(null);
  const [pipelineCompletedNotice, setPipelineCompletedNotice] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Theme & Font Scale Application Helpers
  const applyTheme = (mode: 'system' | 'light' | 'dark') => {
    setThemeMode(mode);
    localStorage.setItem('theme_mode', mode);

    let dark = false;
    if (mode === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      dark = (mode === 'dark');
    }
    setIsCurrentDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  };

  const applyFontScale = (scale: string) => {
    setFontScale(scale);
    localStorage.setItem('font_scale', scale);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const { zoom, fontPx } = resolveZoomFactor(scale, w, h);

    document.documentElement.style.zoom = String(zoom);
    document.documentElement.style.setProperty('--app-base-font-size', `${fontPx}px`);
    document.documentElement.style.setProperty('--mqs-scale', String(zoom));

    // Force viewport scroll coordinates to (0, 0) to prevent any off-screen shift
    window.scrollTo(0, 0);
    document.documentElement.scrollLeft = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollLeft = 0;
    document.body.scrollTop = 0;
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.scrollLeft = 0;
      rootEl.scrollTop = 0;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const stored = localStorage.getItem('font_scale') || 'auto';
      if (stored === 'auto') {
        applyFontScale('auto');
      } else {
        window.scrollTo(0, 0);
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Edge guard: ensure document never scrolls off (0, 0) in frameless desktop window
    const handleScrollLock = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', handleScrollLock);
    return () => window.removeEventListener('scroll', handleScrollLock);
  }, []);

  useEffect(() => {
    const handleGlobalZoomKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const cur = document.documentElement.style.zoom ? parseFloat(document.documentElement.style.zoom) : 1;
        const nextZoom = Math.min(2.0, Number((cur + 0.05).toFixed(2)));
        document.documentElement.style.zoom = String(nextZoom);
        document.documentElement.style.setProperty('--mqs-scale', String(nextZoom));
        window.scrollTo(0, 0);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        const cur = document.documentElement.style.zoom ? parseFloat(document.documentElement.style.zoom) : 1;
        const nextZoom = Math.max(0.7, Number((cur - 0.05).toFixed(2)));
        document.documentElement.style.zoom = String(nextZoom);
        document.documentElement.style.setProperty('--mqs-scale', String(nextZoom));
        window.scrollTo(0, 0);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        applyFontScale('auto');
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setSettingsTab('general');
        setShowSettingsModal(true);
        loadGeneralSettings();
        loadTokenUsage();
        handleDetectAgents(true);
      }
    };
    window.addEventListener('keydown', handleGlobalZoomKeys);
    return () => window.removeEventListener('keydown', handleGlobalZoomKeys);
  }, []);

  const toggleQuickTheme = () => {
    const next = isCurrentDark ? 'light' : 'dark';
    applyTheme(next);
    setGeneralSettings(prev => ({ ...prev, theme: next }));
    ProviderService.SaveGeneralSettings({ ...generalSettings, theme: next }).catch(() => {});
  };

  const loadGeneralSettings = async () => {
    try {
      const s = await ProviderService.GetGeneralSettings();
      if (s) {
        setGeneralSettings(s);
        if (s.theme) applyTheme(s.theme as any);
        if (s.font_size) applyFontScale(s.font_size as any);
      }
    } catch (err) {
      console.error("Failed to load general settings:", err);
    }
  };

  const handleSaveGeneralSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await ProviderService.SaveGeneralSettings(generalSettings);
      applyTheme(generalSettings.theme as any);
      applyFontScale(generalSettings.font_size as any);
      setGeneralSaveSuccess("General settings saved successfully!");
      notifySuccess("General Settings", "General settings saved successfully.");
      setTimeout(() => setGeneralSaveSuccess(null), 3000);
    } catch (err: any) {
      notifyError("General Settings", "Failed to save general settings: " + (err?.message || err));
    }
  };

  const handleOpenWorkspaceFolder = async () => {
    try {
      await ProviderService.OpenWorkspaceInExplorer();
    } catch (err: any) {
      notifyError("Workspace Folder", "Failed to open workspace folder: " + (err?.message || err));
    }
  };

  // 1. Initial Load: Theme, Font Scale, Provider Status, General Settings & Projects
  useEffect(() => {
    applyTheme(themeMode);
    applyFontScale(fontScale);
    loadGeneralSettings();
    loadProviderStatus();
    loadProjects();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('theme_mode') === 'system') {
        setIsCurrentDark(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const activeProjectTokenRef = useRef(0);

  // 2. When activeProject changes, load conversation session & all project assets
  useEffect(() => {
    const token = ++activeProjectTokenRef.current;
    if (activeProject) {
      loadSessionAndData(activeProject.id, token);
      loadDocumentDetails(activeProject.id, token);
      loadValidationAndTraceability(activeProject.id, token);
    } else {
      setActiveSession(null);
      setMessages([]);
      setRequirements([]);
      setClarifications([]);
      setAssumptions([]);
      setFindings([]);
      setTraceabilityMatrix([]);
      setPrdDetails({ document: null, current_version: null, versions: [], sections: [] });
      setSrsDetails({ document: null, current_version: null, versions: [], sections: [] });
      setArchitectureDetails({ document: null, current_version: null, versions: [], sections: [] });
      setDesignDetails({ document: null, current_version: null, versions: [], sections: [] });
    }
  }, [activeProject]);

  useEffect(() => {
    if (currentView === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSending, currentView]);

  const handleDetectAgents = async (silent: boolean = false) => {
    setIsDetectingAgents(true);
    try {
      const agents = await ProviderService.DetectInstalledCodingAgents();
      setDetectedAgents(agents || []);
      if (agents) {
        const agy = agents.find(a => a.id === 'antigravity-cli');
        if (agy?.available_models && agy.available_models.length > 0) {
          setAgyModelsList(agy.available_models);
          if (agy.selected_model) setAgyModel(agy.selected_model);
        }
        const oc = agents.find(a => a.id === 'opencode');
        if (oc?.available_models && oc.available_models.length > 0) {
          setOpencodeModelsList(oc.available_models);
          if (oc.selected_model) setOpencodeModel(oc.selected_model);
        }
      }
    } catch (err) {
      if (!silent) notifyError("Agent Detection", `Failed to detect coding agents: ${String(err)}`);
      else console.warn('Silent agent detection error:', err);
    } finally {
      setIsDetectingAgents(false);
    }
  };

  const handleAgentModelChange = async (agentId: string, modelId: string) => {
    try {
      if (agentId === 'antigravity-cli') {
        setAgyModel(modelId);
        await ProviderService.ConfigureAntigravity(modelId);
      } else if (agentId === 'opencode') {
        setOpencodeModel(modelId);
        await ProviderService.ConfigureOpenCode(opencodeBaseURL, modelId, opencodeApiKey);
      }
      setDetectedAgents(prev => prev.map(a => a.id === agentId ? { ...a, selected_model: modelId } : a));
      setProviderSaveSuccess(`Model for ${agentId} updated: ${modelId || '(Default)'}`);
      notifySuccess("Model Updated", `Model for ${agentId} set to: ${modelId || '(Default)'}`);
      await loadProviderStatus();
      setTimeout(() => setProviderSaveSuccess(''), 3000);
    } catch (err) {
      notifyError("Model Configuration", `Failed to save agent model: ${String(err)}`);
    }
  };

  const handleRefreshProviderModels = async (providerId: string) => {
    try {
      const models = await ProviderService.GetProviderModels(providerId);
      if (models && models.length > 0) {
        if (providerId === 'antigravity-cli') {
          setAgyModelsList(models);
        } else if (providerId === 'opencode') {
          setOpencodeModelsList(models);
        } else if (providerId === 'gemini-direct') {
          setGeminiModelsList(models);
        }
        setProviderSaveSuccess(`Successfully loaded ${models.length} models for ${providerId}`);
        notifySuccess("Models Loaded", `Successfully loaded ${models.length} models for ${providerId}`);
        setTimeout(() => setProviderSaveSuccess(''), 3000);
      } else {
        notifyWarn("Models Not Found", `No models found for ${providerId}`);
      }
    } catch (err) {
      notifyError("Failed to Load Models", `Failed to load models: ${String(err)}`);
    }
  };

  const handleSelectPrimaryAgent = async (agentId: string) => {
    setPrimaryProvider(agentId);
    try {
      await ProviderService.ConfigureProviders(agentId, fallbackProvider, fallbackEnabled);
      setProviderSaveSuccess(`AI Provider activated: ${agentId}`);
      notifySuccess("AI Provider Active", `Primary provider set to: ${agentId}`);
      await loadProviderStatus();
      setTimeout(() => setProviderSaveSuccess(''), 3000);
    } catch (err) {
      notifyError("AI Provider", `Failed to switch AI Provider: ${String(err)}`);
    }
  };

  const handleCopyFullDoc = async () => {
    if (!activeDocDetails.current_version?.content) return;
    try {
      await navigator.clipboard.writeText(activeDocDetails.current_version.content);
      setCopiedFullDoc(true);
      setTimeout(() => setCopiedFullDoc(false), 2000);
    } catch (e) {
      console.error('Failed to copy document:', e);
    }
  };

  const loadProviderStatus = async () => {
    try {
      const res = await ProviderService.GetProviderStatus();
      if (res) {
        if (res.primary_provider) setPrimaryProvider(res.primary_provider);
        if (res.fallback_provider) setFallbackProvider(res.fallback_provider);
        if (res.fallback_enabled !== undefined) setFallbackEnabled(Boolean(res.fallback_enabled));
        if (res.agy_model) setAgyModel(res.agy_model);
        if (res.opencode_model) setOpencodeModel(res.opencode_model);
        if (res.gemini_model) setGeminiModel(res.gemini_model);
        const primaryObj = (res.providers as any[])?.find((p: any) => p.id === res.primary_provider) || (res.providers as any[])?.[0];
        if (primaryObj) {
          setProviderStatus({
            available: primaryObj.available,
            version: primaryObj.version || '1.5.5',
            model: (primaryObj.model as string) || (res.agy_model as string) || '',
          });
        }
      }
      await loadTokenUsage();
      await handleDetectAgents(true);
    } catch (err) {
      console.error('Failed to get provider status:', err);
    }
  };

  const loadProjects = async () => {
    try {
      const list = await ProjectService.ListProjects();
      const projList = list || [];
      setProjects(projList);
      if (projList.length > 0) {
        setOpenProjectIds(prev => {
          if (prev.length === 0) return [projList[0].id];
          const valid = prev.filter(id => projList.some(p => p.id === id));
          return valid.length > 0 ? valid : [projList[0].id];
        });
        if (!activeProject || !projList.some(p => p.id === activeProject.id)) {
          setActiveProject(projList[0]);
        }
      } else {
        setOpenProjectIds([]);
        setActiveProject(null);
      }
    } catch (err) {
      console.error('Failed to list projects:', err);
    }
  };

  const handleOpenProjectInTab = (p: Project) => {
    if (!openProjectIds.includes(p.id)) {
      setOpenProjectIds(prev => [...prev, p.id]);
    }
    setActiveProject(p);
    setIsProjectManagerOpen(false);
  };

  const handleCloseProjectTab = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextOpen = openProjectIds.filter(id => id !== projectId);
    setOpenProjectIds(nextOpen);

    if (activeProject?.id === projectId) {
      if (nextOpen.length > 0) {
        const nextActive = projects.find(p => p.id === nextOpen[nextOpen.length - 1]);
        setActiveProject(nextActive || null);
      } else {
        setActiveProject(null);
      }
    }
  };

  const loadSessionAndData = async (projectId: string, token?: number) => {
    try {
      const session = await ConversationService.GetSession(projectId);
      if (token !== undefined && token !== activeProjectTokenRef.current) return;
      setActiveSession(session);
      if (session) {
        const msgs = await ConversationService.ListMessages(session.id);
        if (token !== undefined && token !== activeProjectTokenRef.current) return;
        setMessages(msgs || []);
      }
      await refreshProjectEntities(projectId);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const refreshProjectEntities = async (projectId: string) => {
    try {
      const reqs = await RequirementService.ListRequirements(projectId);
      setRequirements(reqs || []);
      const clar = await ConversationService.ListClarifications(projectId);
      setClarifications(clar || []);
      const assump = await ConversationService.ListAssumptions(projectId);
      setAssumptions(assump || []);
    } catch (err) {
      console.error('Failed to refresh project entities:', err);
    }
  };

  const loadDocumentDetails = async (projectId: string, token?: number) => {
    try {
      const prd = await DocumentService.GetDocumentDetails(projectId, 'prd');
      if (token !== undefined && token !== activeProjectTokenRef.current) return;
      if (prd) {
        setPrdDetails({
          document: prd.document,
          current_version: prd.current_version,
          versions: prd.versions || [],
          sections: prd.sections || [],
        });
      }
      const srs = await DocumentService.GetDocumentDetails(projectId, 'srs');
      if (token !== undefined && token !== activeProjectTokenRef.current) return;
      if (srs) {
        setSrsDetails({
          document: srs.document,
          current_version: srs.current_version,
          versions: srs.versions || [],
          sections: srs.sections || [],
        });
      }
      const arch = await DocumentService.GetDocumentDetails(projectId, 'architecture');
      if (token !== undefined && token !== activeProjectTokenRef.current) return;
      if (arch) {
        setArchitectureDetails({
          document: arch.document,
          current_version: arch.current_version,
          versions: arch.versions || [],
          sections: arch.sections || [],
        });
      }
      const design = await DocumentService.GetDocumentDetails(projectId, 'design');
      if (token !== undefined && token !== activeProjectTokenRef.current) return;
      if (design) {
        setDesignDetails({
          document: design.document,
          current_version: design.current_version,
          versions: design.versions || [],
          sections: design.sections || [],
        });
      }
    } catch (err) {
      console.error('Failed to load document details:', err);
    }
  };

  const loadValidationAndTraceability = async (projectId: string, token?: number) => {
    try {
      const f = await ValidationService.GetLatestFindings(projectId);
      if (token !== undefined && token !== activeProjectTokenRef.current) return;
      setFindings(f || []);
      const m = await ValidationService.GetTraceabilityMatrix(projectId);
      if (token !== undefined && token !== activeProjectTokenRef.current) return;
      setTraceabilityMatrix(m || []);
    } catch (err) {
      console.error('Failed to load validation:', err);
    }
  };

  const handleRunValidation = async () => {
    if (!activeProject) return;
    setIsValidating(true);
    try {
      const res = await ValidationService.RunValidation(activeProject.id);
      setFindings(res || []);
      const m = await ValidationService.GetTraceabilityMatrix(activeProject.id);
      setTraceabilityMatrix(m || []);
      await loadDocumentDetails(activeProject.id);
    } catch (err) {
      notifyError("Validation Audit", `Validation failed: ${String(err)}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleApproveRequirement = async (id: string) => {
    try {
      await RequirementService.ApproveRequirement(id);
      notifySuccess("Requirement Approved", "Requirement has been approved.");
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      notifyError("Approve Requirement", `Failed to approve requirement: ${String(err)}`);
    }
  };

  const handleRejectRequirement = async (id: string) => {
    try {
      await RequirementService.RejectRequirement(id);
      notifyWarn("Requirement Rejected", "Requirement marked as rejected.");
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      notifyError("Reject Requirement", `Failed to reject requirement: ${String(err)}`);
    }
  };

  const handleUpdatePriority = async (id: string, priority: string) => {
    try {
      await RequirementService.UpdatePriority(id, priority);
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      notifyError("Requirement Priority", `Failed to update priority: ${String(err)}`);
    }
  };

  const handleUpdateAssumptionStatus = async (id: string, status: string) => {
    try {
      await RequirementService.UpdateAssumptionStatus(id, status);
      notifySuccess("Assumption Status", `Assumption status changed to: ${status}`);
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      notifyError("Update Assumption", `Failed to update assumption: ${String(err)}`);
    }
  };

  const handleCorrectAssumption = async (id: string) => {
    const text = editingAssumptionText.trim();
    if (!text) return;
    try {
      await RequirementService.CorrectAssumption(id, text);
      setEditingAssumptionId(null);
      setEditingAssumptionText('');
      notifySuccess("Assumption Corrected", "Project fact correction saved successfully.");
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      notifyError("Correct Assumption", `Failed to save assumption correction: ${String(err)}`);
    }
  };

  const notifyChatMilestone = async (title: string, message: string) => {
    if (activeSession && activeProject) {
      try {
        await ConversationService.PostSystemEvent(activeSession.id, activeProject.id, title, message);
        const msgs = await ConversationService.ListMessages(activeSession.id);
        setMessages(msgs || []);
      } catch (err) {
        console.warn('Failed to post milestone to chat:', err);
      }
    }
  };

  const handleAnswerClarification = async (id: string) => {
    const ans = clarificationAnswers[id]?.trim();
    if (!ans) return;
    try {
      await RequirementService.AnswerClarification(id, ans);
      setClarificationAnswers(prev => ({ ...prev, [id]: '' }));
      notifySuccess("Clarification Answered", "Clarification answer saved successfully.");
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      notifyError("Clarification Answer", `Failed to submit clarification answer: ${String(err)}`);
    }
  };

  const handleExtractRequirements = async () => {
    if (!activeProject || !activeSession || isExtractingReqs) return;
    setIsExtractingReqs(true);
    try {
      await ConversationService.SendMessageWithAgent(
        activeSession.id,
        activeProject.id,
        "Analyze all available briefs, PRD documents, and discussions for this project. Extract all functional (FR-xxx) and non-functional requirements into structured JSON requirements.",
        activeChatAgent
      );
      const msgs = await ConversationService.ListMessages(activeSession.id);
      setMessages(msgs || []);
      await refreshProjectEntities(activeProject.id);
      notifySuccess("AI Extraction", "Requirements extracted successfully.");
    } catch (err) {
      notifyError("Requirements Extraction", `Failed to extract requirements: ${String(err)}`);
    } finally {
      setIsExtractingReqs(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const p = await ProjectService.CreateProject(newProjectName.trim(), newProjectDesc.trim());
      setIsProjectManagerOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      await loadProjects();
      if (p) {
        setOpenProjectIds(prev => prev.includes(p.id) ? prev : [...prev, p.id]);
        setActiveProject(p);
        notifySuccess("Project Created", `Project "${p.name}" is ready.`);
      }
    } catch (err) {
      notifyError("Create Project", `Error creating project: ${String(err)}`);
    }
  };

  const handleDeleteProject = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Project',
      message: `Delete project "${name}" including all conversation history and system specifications? This action cannot be undone.`,
      confirmLabel: 'Delete Project',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await ProjectService.DeleteProject(id);
          setOpenProjectIds(prev => prev.filter(pid => pid !== id));
          if (activeProject?.id === id) {
            setActiveProject(null);
            setActiveSession(null);
          }
          await loadProjects();
          notifySuccess("Project Deleted", `Project "${name}" deleted successfully.`);
        } catch (err) {
          notifyError("Delete Project", `Error deleting project: ${String(err)}`);
        }
      },
    });
  };

  const handleOpenEditProject = () => {
    if (!activeProject) return;
    setEditProjectName(activeProject.name);
    setEditProjectDesc(activeProject.description || '');
    setEditProjectStatus(activeProject.status || 'active');
    setShowEditProjectModal(true);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editProjectName.trim()) return;
    try {
      const updated = await ProjectService.UpdateProject(
        activeProject.id,
        editProjectName.trim(),
        editProjectDesc.trim(),
        editProjectStatus
      );
      if (updated) {
        setActiveProject(updated);
        await loadProjects();
        setShowEditProjectModal(false);
        notifySuccess("Project Updated", "Project changes saved successfully.");
      }
    } catch (err) {
      notifyError("Update Project", `Failed to update project: ${String(err)}`);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiag(true);
    try {
      const res = await ProviderService.RunDiagnostics();
      setDiagResults(res);
      notifySuccess("AI Diagnostics Completed", "Provider and CLI tooling diagnostics finished successfully.");
    } catch (err) {
      notifyError("AI Diagnostics Failed", `Failed to run diagnostics: ${String(err)}`);
    } finally {
      setIsRunningDiag(false);
    }
  };

  const handleCopyDiagnostics = () => {
    if (!diagResults) return;
    const lines: string[] = [
      '# Specra Diagnostic Report',
      `- Generated: ${new Date().toLocaleString()}`,
      `- OS / Architecture: ${diagResults.os || navigator.platform} / ${diagResults.arch || 'unknown'}`,
      `- Execution Duration: ${diagResults.duration_ms} ms`,
      `- Storage Engine: ${diagResults.storage_strategy || 'Local SQLite WAL'}`,
      `- OS Keyring Status: ${diagResults.keyring_health || 'Healthy'}`,
      '',
      '## Detected Coding Agents & Executables',
    ];
    if (diagResults.agents && Array.isArray(diagResults.agents)) {
      diagResults.agents.forEach((ag: any) => {
        lines.push(`- **${ag.name}** (${ag.id})`);
        lines.push(`  - Status: ${ag.installed ? `Installed (${ag.version})` : 'Not Installed'}`);
        lines.push(`  - Path: ${ag.path || 'N/A'}`);
        lines.push(`  - Available Models: ${ag.models_count || 0}`);
      });
    } else {
      lines.push(`- Antigravity CLI: ${diagResults.cli_available ? `Found (${diagResults.cli_version}) at ${diagResults.cli_path || 'PATH'}` : (diagResults.cli_error || 'Not Installed')}`);
      lines.push(`- OpenCode CLI: ${diagResults.opencode_available ? `Installed at ${diagResults.opencode_path || 'PATH'}` : 'Not Detected'}`);
    }
    if (diagResults.path_directories && Array.isArray(diagResults.path_directories)) {
      lines.push('');
      lines.push('## System Environment PATH Directories');
      diagResults.path_directories.forEach((dir: string) => {
        if (dir.trim()) lines.push(`- \`${dir.trim()}\``);
      });
    }
    const reportText = lines.join('\n');
    navigator.clipboard.writeText(reportText).then(() => {
      notifySuccess("Copied Diagnostics", "Diagnostic report copied to clipboard.");
    }).catch(() => {
      notifyError("Copy Failed", "Failed to copy diagnostic report to clipboard.");
    });
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    try {
      await ProviderService.StoreAPIKey('gemini', apiKeyInput.trim());
      setKeySaveMsg('API Key saved securely in Windows Credential Manager.');
      setApiKeyInput('');
      notifySuccess("API Key Saved", "Gemini API Key saved securely in Windows Credential Manager.");
      setTimeout(() => setKeySaveMsg(''), 4000);
    } catch (err) {
      notifyError("Save API Key", `Failed to save key: ${String(err)}`);
    }
  };

  const loadTokenUsage = async (projectId?: string) => {
    setIsLoadingLogs(true);
    try {
      const pId = projectId !== undefined ? projectId : (activeProject ? activeProject.id : '');
      const summary = await ProviderService.GetTokenUsageSummary(pId);
      if (summary) setTokenSummary(summary);
      const logs = await ProviderService.ListExecutionLogs(pId, 50);
      if (logs) setExecutionLogs(logs);
    } catch (err) {
      console.error('Failed to load token usage:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };


  const handleSaveProviderConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await ProviderService.ConfigureProviders(primaryProvider, fallbackProvider, fallbackEnabled);
      if (agyModel) {
        await ProviderService.ConfigureAntigravity(agyModel);
      }
      if (opencodeBaseURL || opencodeModel !== 'default' || opencodeApiKey) {
        await ProviderService.ConfigureOpenCode(opencodeBaseURL, opencodeModel, opencodeApiKey);
      }
      if (geminiModel || geminiApiKey) {
        await ProviderService.ConfigureGemini(geminiModel, geminiApiKey);
      }
      setProviderSaveSuccess('AI Provider & Fallback configuration saved successfully!');
      notifySuccess("Configuration Saved", "AI Provider & Fallback configuration saved successfully.");
      await loadProviderStatus();
      setTimeout(() => setProviderSaveSuccess(''), 4000);
    } catch (err) {
      notifyError("Save Configuration", `Failed to save configuration: ${String(err)}`);
    }
  };

  const specialistAgents = [
    {
      id: 'product-analyst' as const,
      name: 'Product Analyst',
      docFocus: 'PRD',
      role: 'Product Strategy & Scope',
      icon: Sparkles,
      colorClass: 'text-tone-blue',
      badgeColor: 'text-tone-blue bg-tone-blue-bg border border-tone-blue/30'
    },
    {
      id: 'system-analyst' as const,
      name: 'System Analyst',
      docFocus: 'SRS',
      role: 'IEEE 830 & Logic Flows',
      icon: FileCode2,
      colorClass: 'text-tone-teal',
      badgeColor: 'text-tone-teal bg-tone-teal-bg border border-tone-teal/30'
    },
    {
      id: 'software-architect' as const,
      name: 'Software Architect',
      docFocus: 'Architecture',
      role: 'C4 Topology & API Contracts',
      icon: Cpu,
      colorClass: 'text-tone-violet',
      badgeColor: 'text-tone-violet bg-tone-violet-bg border border-tone-violet/30'
    },
    {
      id: 'ui-ux-agent' as const,
      name: 'UI/UX Agent',
      docFocus: 'Design System',
      role: 'Tokens & Screen Flows',
      icon: LayoutGrid,
      colorClass: 'text-tone-orange',
      badgeColor: 'text-tone-orange bg-tone-orange-bg border border-tone-orange/30'
    },
  ];

  const currentSpecialist = specialistAgents.find(a => a.id === activeChatAgent) || specialistAgents[0];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notifyWarn("File Too Large", "File exceeds the 2 MB maximum size limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setAttachedFile({
        name: file.name,
        size: file.size,
        content: content,
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadSkillsCatalog = async () => {
    try {
      const list = await ProviderService.ListSkills();
      setSkillsCatalog(list || []);
    } catch (err) {
      console.error('Failed to load skills catalog:', err);
    }
  };

  const handleCreateCustomSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillPrompt.trim()) return;
    const id = newSkillId.trim() || `skill-${Date.now()}`;
    try {
      await ProviderService.SaveSkill({
        id: id,
        name: newSkillName.trim(),
        description: newSkillDesc.trim(),
        prompt: newSkillPrompt.trim(),
        category: newSkillCategory,
        custom: true,
      });
      setNewSkillName('');
      setNewSkillId('');
      setNewSkillDesc('');
      setNewSkillPrompt('');
      setSkillSaveSuccess(`Custom Skill "${newSkillName.trim()}" created successfully!`);
      notifySuccess("Skill Saved", `Custom Skill "${newSkillName.trim()}" created successfully.`);
      setIsNewSkillModalOpen(false);
      setTimeout(() => setSkillSaveSuccess(''), 3500);
      await loadSkillsCatalog();
      await loadAgentsAndMCP();
    } catch (err: any) {
      notifyError("Create Custom Skill", `Failed to save custom skill: ${err?.message || err}`);
    }
  };

  const handleDeleteCustomSkill = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Custom Skill",
      message: `Are you sure you want to delete custom skill "${name}"? This action cannot be undone.`,
      confirmLabel: "Delete Skill",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await ProviderService.DeleteSkill(id);
          await loadSkillsCatalog();
          await loadAgentsAndMCP();
          notifySuccess("Skill Deleted", `Custom skill "${name}" deleted successfully.`);
        } catch (err: any) {
          notifyError("Delete Skill", `Failed to delete custom skill: ${err?.message || err}`);
        }
      },
    });
  };

  const loadAgentsAndMCP = async () => {
    try {
      await loadSkillsCatalog();
      const a = await ProviderService.ListAgents();
      if (a && a.length > 0) {
        setAgentsList(a);
        const curr = a.find(ag => ag.id === selectedAgentId) || a[0];
        if (curr) {
          setSelectedAgentId(curr.id);
          setEditingPrompt(curr.system_prompt);
        }
      }
      const m = await ProviderService.ListMCPServers();
      if (m) {
        setMcpList(m);
      }
    } catch (err) {
      console.error('Failed to load agents/mcp:', err);
    }
  };

  const handleSaveAgentConfig = async (agent: AgentConfig) => {
    try {
      await ProviderService.SaveAgent({
        ...agent,
        system_prompt: editingPrompt,
      });
      setAgentSaveSuccess(`Persona "${agent.name}" saved successfully!`);
      notifySuccess("Persona Saved", `Persona "${agent.name}" updated successfully.`);
      setTimeout(() => setAgentSaveSuccess(''), 3000);
      await loadAgentsAndMCP();
    } catch (err) {
      notifyError("Save Persona", `Failed to save agent persona: ${String(err)}`);
    }
  };

  const handleToggleAgentSkill = async (agent: AgentConfig, skill: string) => {
    const currentSkills = agent.skills || [];
    const nextSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    try {
      await ProviderService.SaveAgent({
        ...agent,
        skills: nextSkills,
      });
      await loadAgentsAndMCP();
    } catch (err) {
      notifyError("Toggle Skill", `Failed to toggle skill: ${String(err)}`);
    }
  };

  const handleAddMCPServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcpName.trim() || !newMcpEndpoint.trim()) return;
    const id = newMcpId.trim() || `mcp-${Date.now()}`;
    try {
      await ProviderService.SaveMCPServer({
        id: id,
        name: newMcpName.trim(),
        transport: newMcpTransport,
        endpoint: newMcpEndpoint.trim(),
        enabled: true,
        scope: newMcpScope,
        assigned_agents: newMcpScope === 'persona' ? newMcpAssignedAgents : [],
        env: {},
      });
      setNewMcpId('');
      setNewMcpName('');
      setNewMcpEndpoint('');
      setNewMcpScope('global');
      setNewMcpAssignedAgents([]);
      setMcpSaveSuccess('MCP Server registered successfully!');
      notifySuccess("MCP Server Registered", `MCP Server "${newMcpName.trim()}" registered successfully.`);
      setTimeout(() => setMcpSaveSuccess(''), 3000);
      await loadAgentsAndMCP();
    } catch (err) {
      notifyError("Register MCP Server", `Failed to register MCP server: ${String(err)}`);
    }
  };

  const handleDeleteMCPServer = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete MCP Server",
      message: "Are you sure you want to delete this MCP Server connection? This action cannot be undone.",
      confirmLabel: "Delete MCP",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await ProviderService.DeleteMCPServer(id);
          await loadAgentsAndMCP();
          notifySuccess("MCP Server Deleted", "MCP Server connection removed successfully.");
        } catch (err) {
          notifyError("Delete MCP Server", `Failed to delete MCP server: ${String(err)}`);
        }
      },
    });
  };

  // Slash Commands Definitions
  const slashCommands = [
    { cmd: '/discovery', label: 'Discovery Mode', desc: 'Proactively uncover ideas, gaps, & ask clarification questions', icon: Search, action: 'discovery' },
    { cmd: '/exec', label: 'Execution Mode', desc: 'Passive execution, generate specifications without asking questions', icon: Zap, action: 'execution' },
    { cmd: '/plan', label: 'Create Plan', desc: 'Create structured step-by-step specification plan', icon: List, action: 'plan' },
    { cmd: '/clarify', label: 'Force Clarifications', desc: 'Evaluate context gaps and trigger clarification questions', icon: HelpCircle, action: 'clarify' },
    { cmd: '/prd', label: 'Generate PRD', desc: 'Generate or update PRD draft (20 Sections)', icon: FileText, action: 'prd' },
    { cmd: '/srs', label: 'Generate SRS', desc: 'Generate or update SRS technical specification (22 Sections)', icon: FileCode2, action: 'srs' },
    { cmd: '/arch', label: 'Generate Architecture', desc: 'Generate C4 Mermaid topology & API contracts (16 Sections)', icon: Cpu, action: 'arch' },
    { cmd: '/design', label: 'Generate Design System', desc: 'Generate design tokens & screen flows (16 Sections)', icon: Layers, action: 'design' },
    { cmd: '/validate', label: 'Run Quality Check', desc: 'Run quality audit for completeness & traceability', icon: Activity, action: 'validate' },
    { cmd: '/clear', label: 'Clear Chat History', desc: 'Clear current conversation session history', icon: Trash2, action: 'clear' },
  ];

  const filteredSlashCommands = useMemo(() => {
    if (!inputMessage.startsWith('/')) return [];
    const query = inputMessage.toLowerCase();
    const cleanQuery = query.replace('/', '').trim();
    return slashCommands.filter(c =>
      c.cmd.toLowerCase().startsWith(query) ||
      (cleanQuery && c.label.toLowerCase().includes(cleanQuery)) ||
      (cleanQuery && c.desc.toLowerCase().includes(cleanQuery))
    );
  }, [inputMessage]);

  useEffect(() => {
    setSelectedSlashIndex(0);
  }, [filteredSlashCommands.length]);

  useEffect(() => {
    if (showSlashMenu && slashItemRefs.current[selectedSlashIndex]) {
      slashItemRefs.current[selectedSlashIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedSlashIndex, showSlashMenu]);

  const handleSelectSlashCommand = async (cmd: typeof slashCommands[0]) => {
    setShowSlashMenu(false);
    setInputMessage('');
    if (cmd.action === 'discovery') {
      setInteractionMode('discovery');
    } else if (cmd.action === 'execution') {
      setInteractionMode('execution');
    } else if (cmd.action === 'plan') {
      setInputMessage('/plan Buatkan rencana spesifikasi bertahap untuk fitur: ');
    } else if (cmd.action === 'clarify') {
      if (activeSession && activeProject) {
        setIsSending(true);
        try {
          await ConversationService.SendMessageWithAgent(
            activeSession.id,
            activeProject.id,
            "[MODE: DISCOVERY] Evaluate all available project context. Identify ambiguities and ask 1-3 crucial clarification questions.",
            activeChatAgent
          );
          const msgs = await ConversationService.ListMessages(activeSession.id);
          setMessages(msgs || []);
          await refreshProjectEntities(activeProject.id);
        } catch (err) {
          notifyError("Clarification AI Error", `Error: ${String(err)}`);
        } finally {
          setIsSending(false);
        }
      }
    } else if (cmd.action === 'prd') {
      setCurrentView('prd');
      await handleGeneratePRD();
    } else if (cmd.action === 'srs') {
      setCurrentView('srs');
      await handleGenerateSRS();
    } else if (cmd.action === 'arch') {
      setCurrentView('architecture');
      await handleGenerateArchitecture();
    } else if (cmd.action === 'design') {
      setCurrentView('design');
      await handleGenerateDesign();
    } else if (cmd.action === 'validate') {
      setShowInspector(true);
      setOpenAccordion('audit');
      await handleRunValidation();
    } else if (cmd.action === 'clear') {
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachedFile) || !activeSession || !activeProject || isSending || autoPipelineRunning) return;

    const userText = inputMessage.trim();
    const currentAttachment = attachedFile;
    setInputMessage('');
    setAttachedFile(null);
    setShowSlashMenu(false);

    // Quick Command Intercepts
    if (userText === '/discovery') {
      setInteractionMode('discovery');
      return;
    }
    if (userText === '/exec') {
      setInteractionMode('execution');
      return;
    }
    if (userText === '/prd') {
      await handleGeneratePRD();
      return;
    }
    if (userText === '/srs') {
      await handleGenerateSRS();
      return;
    }
    if (userText === '/arch') {
      await handleGenerateArchitecture();
      return;
    }
    if (userText === '/design') {
      await handleGenerateDesign();
      return;
    }
    if (userText === '/validate') {
      await handleRunValidation();
      return;
    }
    if (userText === '/clear') {
      setMessages([]);
      return;
    }

    setIsSending(true);

    const displayContent = currentAttachment
      ? `📎 [Attached: ${currentAttachment.name} (${Math.round(currentAttachment.size / 1024)} KB)]\n${userText}`
      : userText;

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeSession.id,
      role: 'user',
      content: displayContent,
      created_at: new Date().toISOString(),
    } as any;
    setMessages((prev) => [...prev, tempUserMsg]);

    const modeHeader = interactionMode === 'execution' ? '[MODE: EXECUTION]' : '[MODE: DISCOVERY]';
    const textToSend = `${modeHeader} ${userText}`;

    try {
      if (currentAttachment) {
        await ConversationService.SubmitAttachment(
          activeSession.id,
          activeProject.id,
          currentAttachment.name,
          currentAttachment.content,
          textToSend || 'Analyze attached draft document and extract structured requirements',
          activeChatAgent
        );
      } else {
        await ConversationService.SendMessageWithAgent(
          activeSession.id,
          activeProject.id,
          textToSend,
          activeChatAgent
        );
      }
      const msgs = await ConversationService.ListMessages(activeSession.id);
      setMessages(msgs || []);
      await refreshProjectEntities(activeProject.id);
    } catch (err) {
      notifyError("AI Execution Error", String(err));
    } finally {
      setIsSending(false);
    }
  };

  // --- Document Operations ---
  const handleGeneratePRD = async () => {
    if (!activeProject) return;
    setGeneratingDoc('prd');
    try {
      await DocumentService.GeneratePRD(activeProject.id);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      setIsEditingDoc(false);
      await notifyChatMilestone(
        'PRD Draft v1 Created Successfully (20 Sections)',
        `Product Analyst has drafted the PRD (20 sections).\n\n- Detected Requirements: **${requirements.length} items**\n- Active Assumptions: **${assumptions.length} items**\n\n👉 *Open the PRD tab to review the complete document, or discuss revisions directly here.*`
      );
    } catch (err) {
      notifyError("Generate PRD Failed", `Failed to generate PRD: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleRegeneratePRDSection = async () => {
    if (!activeProject) return;
    setGeneratingDoc('prd');
    try {
      await DocumentService.RegeneratePRDSection(activeProject.id, selectedSectionNum);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      await notifyChatMilestone(
        `PRD Section ${selectedSectionNum} Diperbarui`,
        `Product Analyst has updated Section ${selectedSectionNum} in the PRD document.`
      );
      notifySuccess(`PRD Section ${selectedSectionNum} Updated`, "Section regenerated successfully.");
    } catch (err) {
      notifyError("Regenerate PRD Section", `Failed to regenerate PRD section: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleApprovePRD = async () => {
    if (!activeProject || !prdDetails.current_version) return;
    try {
      await DocumentService.ApprovePRD(activeProject.id, prdDetails.current_version.id);
      await loadDocumentDetails(activeProject.id);
      await notifyChatMilestone(
        'PRD Approved & Locked',
        'PRD document officially approved. Downstream gate for **SRS (IEEE 830, 22 sections)** is now unlocked and ready for the System Analyst.'
      );
      notifySuccess("PRD Approved", "PRD document approved! SRS specification is now unlocked.");
    } catch (err) {
      notifyError("Approve PRD", `Failed to approve PRD: ${String(err)}`);
    }
  };

  const handleGenerateSRS = async () => {
    if (!activeProject) return;
    if (prdDetails.document?.status !== 'approved') {
      notifyWarn("SRS Generation Gated", "PRD must be approved before generating SRS.");
      return;
    }

    setGeneratingDoc('srs');
    try {
      await DocumentService.GenerateSRS(activeProject.id);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      setIsEditingDoc(false);
      await notifyChatMilestone(
        'SRS Draft v1 Created Successfully (22 Sections)',
        'System Analyst has drafted the IEEE 830 SRS specification (22 sections) with functional requirements (FR-xxx) mapping and Traceability Matrix.'
      );
    } catch (err) {
      notifyError("Generate SRS", `Failed to generate SRS: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleRegenerateSRSSection = async () => {
    if (!activeProject) return;
    setGeneratingDoc('srs');
    try {
      await DocumentService.RegenerateSRSSection(activeProject.id, selectedSectionNum);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      await notifyChatMilestone(
        `SRS Section ${selectedSectionNum} Diperbarui`,
        `System Analyst has updated Section ${selectedSectionNum} in the SRS specification.`
      );
      notifySuccess(`SRS Section ${selectedSectionNum} Updated`, "Section regenerated successfully.");
    } catch (err) {
      notifyError("Regenerate SRS Section", `Failed to regenerate SRS section: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleApproveSRS = async () => {
    if (!activeProject || !srsDetails.current_version) return;
    try {
      await DocumentService.ApproveSRS(activeProject.id, srsDetails.current_version.id);
      await loadDocumentDetails(activeProject.id);
      await notifyChatMilestone(
        'SRS Approved & Locked',
        'SRS document officially approved. System Architecture (C4 diagrams, API contracts, and STRIDE threat models) is ready to generate.'
      );
      notifySuccess("SRS Approved", "SRS document approved! Architecture specification is now unlocked.");
    } catch (err) {
      notifyError("Approve SRS", `Failed to approve SRS: ${String(err)}`);
    }
  };

  const handleGenerateArchitecture = async () => {
    if (!activeProject) return;
    if (prdDetails.document?.status !== 'approved') {
      notifyWarn("Architecture Generation Gated", "PRD must be approved before generating Architecture.");
      return;
    }

    setGeneratingDoc('architecture');
    try {
      await DocumentService.GenerateArchitecture(activeProject.id);
      await loadDocumentDetails(activeProject.id);
      setIsEditingDoc(false);
      await notifyChatMilestone(
        'Architecture Draft Created Successfully (16 Sections)',
        'Software Architect has designed system architecture (16 sections) including C4 Context & Container diagrams, REST API specs, and STRIDE mitigation strategies.'
      );
    } catch (err) {
      notifyError("Generate Architecture", `Failed to generate Architecture: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleRegenerateArchitectureSection = async () => {
    if (!activeProject) return;
    setGeneratingDoc('architecture');
    try {
      await DocumentService.RegenerateArchitectureSection(activeProject.id, selectedSectionNum);
      await loadDocumentDetails(activeProject.id);
      await notifyChatMilestone(
        `Architecture Section ${selectedSectionNum} Diperbarui`,
        `Software Architect has updated Section ${selectedSectionNum} in the Architecture document.`
      );
      notifySuccess(`Architecture Section ${selectedSectionNum} Updated`, "Section regenerated successfully.");
    } catch (err) {
      notifyError("Regenerate Architecture Section", `Failed to regenerate Architecture section: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleApproveArchitecture = async () => {
    if (!activeProject || !architectureDetails.current_version) return;
    try {
      await DocumentService.ApproveArchitecture(activeProject.id, architectureDetails.current_version.id);
      await loadDocumentDetails(activeProject.id);
      await notifyChatMilestone(
        'Architecture Approved & Locked',
        'Architecture document approved. Design System specification (16 sections) is ready to generate by UI/UX Agent.'
      );
      notifySuccess("Architecture Approved", "Architecture document approved! Design System is now unlocked.");
    } catch (err) {
      notifyError("Approve Architecture", `Failed to approve Architecture: ${String(err)}`);
    }
  };

  const handleGenerateDesign = async () => {
    if (!activeProject) return;
    if (prdDetails.document?.status !== 'approved') {
      notifyWarn("Design Generation Gated", "PRD must be approved before generating Design System.");
      return;
    }

    setGeneratingDoc('design');
    try {
      await DocumentService.GenerateDesign(activeProject.id);
      await loadDocumentDetails(activeProject.id);
      setIsEditingDoc(false);
      await notifyChatMilestone(
        'Design System Draft Created Successfully (16 Sections)',
        'UI/UX Agent has drafted Design System specifications (16 sections) including visual tokens, screen flows, atomic components, and WCAG 2.2 AA compliance.'
      );
    } catch (err) {
      notifyError("Generate Design System", `Failed to generate Design System: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleRegenerateDesignSection = async () => {
    if (!activeProject) return;
    setGeneratingDoc('design');
    try {
      await DocumentService.RegenerateDesignSection(activeProject.id, selectedSectionNum);
      await loadDocumentDetails(activeProject.id);
      await notifyChatMilestone(
        `Design System Section ${selectedSectionNum} Diperbarui`,
        `UI/UX Agent has updated Section ${selectedSectionNum} in the Design System document.`
      );
      notifySuccess(`Design System Section ${selectedSectionNum} Updated`, "Section regenerated successfully.");
    } catch (err) {
      notifyError("Regenerate Design Section", `Failed to regenerate Design System section: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleApproveDesign = async () => {
    if (!activeProject || !designDetails.current_version) return;
    try {
      await DocumentService.ApproveDesign(activeProject.id, designDetails.current_version.id);
      await loadDocumentDetails(activeProject.id);
      await notifyChatMilestone(
        'Design System Approved & Locked',
        'All system specifications (**PRD**, **SRS**, **Architecture**, and **Design System**) are complete and approved. Workspace is ready for technical implementation.'
      );
      notifySuccess("Design System Approved", "Design System document approved!");
    } catch (err) {
      notifyError("Approve Design", `Failed to approve Design: ${String(err)}`);
    }
  };

  const handleStartEdit = () => {
    const currentContent = activeDocType === 'prd' 
      ? prdDetails.current_version?.content || '' 
      : activeDocType === 'srs'
      ? srsDetails.current_version?.content || ''
      : activeDocType === 'architecture'
      ? architectureDetails.current_version?.content || ''
      : designDetails.current_version?.content || '';
    setDocEditContent(currentContent);
    setIsEditingDoc(true);
  };

  const handleSaveEdit = async () => {
    if (!activeProject) return;
    setGeneratingDoc(activeDocType);
    try {
      await DocumentService.SaveManualEdit(activeProject.id, activeDocType, docEditContent);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      setIsEditingDoc(false);
      notifySuccess("Changes Saved", "Manual document edit saved successfully.");
    } catch (err) {
      notifyError("Save Manual Edit", `Failed to save manual edit: ${String(err)}`);
    } finally {
      setGeneratingDoc(null);
    }
  };

  const handleExportDoc = () => {
    if (!activeProject) {
      notifyWarn("Export Document", "Select a project first before exporting.");
      return;
    }
    setExportInitialScope('single');
    setIsExportModalOpen(true);
  };

  const handleExportAllDocs = () => {
    if (!activeProject) {
      notifyWarn("Export All Documents", "Select a project first before exporting.");
      return;
    }
    setExportInitialScope('all');
    setIsExportModalOpen(true);
  };

  const runAutoPipeline = async (skipClarificationGating = false) => {
    if (!activeProject) {
      notifyWarn("Auto Pipeline", "Select or create a project first!");
      return;
    }
    if (autoPipelineRunning) return;

    setAutoPipelineRunning(true);
    setPipelineCompletedNotice(false);
    setPipelinePausedReason(null);

    try {
      // 1. Discovery & Requirements Extraction if needed
      if (requirements.length === 0) {
        setAutoPipelineStage('1/5: Extracting Initial Requirements...');
        if (activeSession) {
          try {
            await ConversationService.SendMessageWithAgent(
              activeSession.id,
              activeProject.id,
              "Analyze this project brief and goals. Extract functional (FR-xxx) and non-functional requirements, crucial clarification questions, and initial assumptions.",
              activeChatAgent
            );
            const msgs = await ConversationService.ListMessages(activeSession.id);
            setMessages(msgs || []);
            await refreshProjectEntities(activeProject.id);
          } catch (e) {
            console.warn('Initial discovery prompt error:', e);
          }
        }
      }

      // Clarification Gating Check
      if (!skipClarificationGating) {
        const freshClar = await ConversationService.ListClarifications(activeProject.id);
        const openClar = (freshClar || []).filter(c => c.status !== 'answered' && !c.answer);
        if (openClar.length > 0) {
          setClarifications(freshClar || []);
          setAutoPipelineRunning(false);
          setPipelinePausedReason(`Pipeline Paused: Please answer ${openClar.length} clarification questions.`);
          setCurrentView('chat');
          setOpenAccordion('qa');
          setShowInspector(true);
          return;
        }
      }

      // 2. PRD Generation & Auto-Approve
      setAutoPipelineStage('2/5: Drafting PRD (20 Sections)...');
      setCurrentView('prd');
      const prdVer = await DocumentService.GeneratePRD(activeProject.id);
      if (prdVer) {
        await DocumentService.ApprovePRD(activeProject.id, prdVer.id);
      }
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      await notifyChatMilestone(
        'Auto-Pipeline: PRD Completed & Approved (20 Sections)',
        'Product Analyst has drafted the PRD and approved it automatically to unlock SRS.'
      );

      // 3. SRS Generation & Auto-Approve
      setAutoPipelineStage('3/5: Drafting SRS IEEE 830 (22 Sections)...');
      setCurrentView('srs');
      const srsVer = await DocumentService.GenerateSRS(activeProject.id);
      if (srsVer) {
        await DocumentService.ApproveSRS(activeProject.id, srsVer.id);
      }
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      await notifyChatMilestone(
        'Auto-Pipeline: SRS Completed & Approved (22 Sections)',
        'System Analyst has drafted the IEEE 830 SRS and approved it automatically to unlock Architecture.'
      );

      // 4. Architecture Generation & Auto-Approve
      setAutoPipelineStage('4/5: Designing Architecture C4 (16 Sections)...');
      setCurrentView('architecture');
      const archVer = await DocumentService.GenerateArchitecture(activeProject.id);
      if (archVer) {
        await DocumentService.ApproveArchitecture(activeProject.id, archVer.id);
      }
      await loadDocumentDetails(activeProject.id);
      await notifyChatMilestone(
        'Auto-Pipeline: Architecture Completed & Approved (16 Sections)',
        'Software Architect has designed C4 architecture and approved it automatically to unlock Design System.'
      );

      // 5. Design System Generation & Auto-Approve
      setAutoPipelineStage('5/5: Drafting Design System (16 Sections)...');
      setCurrentView('design');
      const desVer = await DocumentService.GenerateDesign(activeProject.id);
      if (desVer) {
        await DocumentService.ApproveDesign(activeProject.id, desVer.id);
      }
      await loadDocumentDetails(activeProject.id);
      await notifyChatMilestone(
        'Auto-Pipeline Complete: All Documents Ready',
        'The complete specification pipeline (PRD, SRS, Architecture, Design System) has finished and is approved.'
      );
      await loadDocumentDetails(activeProject.id);

      setAutoPipelineStage(null);
      setAutoPipelineRunning(false);
      setPipelineCompletedNotice(true);
    } catch (err) {
      console.error('Auto Pipeline Failed:', err);
      notifyError("Auto Pipeline Halted", `Stage "${autoPipelineStage || 'Execution'}": ${String(err)}`);
      setAutoPipelineRunning(false);
      setAutoPipelineStage(null);
    }
  };

  const isPRDApproved = prdDetails.document?.status === 'approved';
  const isSRSOutdated = srsDetails.document?.status === 'outdated';
  const isArchitectureApproved = architectureDetails.document?.status === 'approved';
  const isDesignApproved = designDetails.document?.status === 'approved';

  const activeDocDetails = activeDocType === 'prd' 
    ? prdDetails 
    : activeDocType === 'srs' 
    ? srsDetails 
    : activeDocType === 'architecture' 
    ? architectureDetails 
    : designDetails;

  const handleOpenDocument = (type: 'prd' | 'srs' | 'architecture' | 'design') => {
    setActiveDocType(type);
    setCurrentView(type);
    if (layoutMode === 'chat') {
      setLayoutMode('split');
    }
    if (type === 'prd') {
      setActiveChatAgent('product-analyst');
    } else if (type === 'srs') {
      setActiveChatAgent('system-analyst');
    } else if (type === 'architecture') {
      setActiveChatAgent('software-architect');
    } else if (type === 'design') {
      setActiveChatAgent('ui-ux-agent');
    }
  };

  const handlePipelineStepClick = (stepId: 'chat' | 'prd' | 'srs' | 'architecture' | 'design') => {
    if (stepId === 'chat') {
      setCurrentView('chat');
      setLayoutMode('chat');
      setActiveChatAgent('product-analyst');
    } else {
      handleOpenDocument(stepId);
    }
    setIsEditingDoc(false);
  };

  const unresolvedQACount = useMemo(() => {
    const openQ = clarifications.filter(c => c.status === 'open' && !c.answer).length;
    const unconfA = assumptions.filter(a => a.status === 'unconfirmed').length;
    return openQ + unconfA;
  }, [clarifications, assumptions]);

  const pipelineSteps = [
    {
      id: 'chat' as const,
      name: '1. Discovery',
      status: requirements.filter(r => r.status === 'approved').length >= 3 ? 'completed' : 'active',
      desc: `${requirements.length} Reqs`,
      locked: false,
    },
    {
      id: 'prd' as const,
      name: '2. PRD',
      status: isPRDApproved ? 'completed' : prdDetails.current_version ? 'draft' : 'pending',
      desc: isPRDApproved ? 'Approved (20 Sec)' : prdDetails.current_version ? 'Draft Ready' : 'Pending',
      locked: false,
    },
    {
      id: 'srs' as const,
      name: '3. SRS',
      status: isSRSOutdated ? 'outdated' : srsDetails.document?.status === 'approved' ? 'completed' : srsDetails.current_version ? 'draft' : isPRDApproved ? 'pending' : 'locked',
      desc: isSRSOutdated ? 'Outdated' : srsDetails.document?.status === 'approved' ? 'Approved (22 Sec)' : isPRDApproved ? (srsDetails.current_version ? 'Draft Ready' : 'Unlocked') : 'Gated',
      locked: !isPRDApproved,
    },
    {
      id: 'architecture' as const,
      name: '4. Architecture',
      status: isArchitectureApproved ? 'completed' : architectureDetails.current_version ? 'draft' : isPRDApproved ? 'pending' : 'locked',
      desc: isArchitectureApproved ? 'Approved (16 Sec)' : isPRDApproved ? (architectureDetails.current_version ? 'Draft Ready' : 'Unlocked') : 'Gated',
      locked: !isPRDApproved,
    },
    {
      id: 'design' as const,
      name: '5. Design System',
      status: isDesignApproved ? 'completed' : designDetails.current_version ? 'draft' : isPRDApproved ? 'pending' : 'locked',
      desc: isDesignApproved ? 'Approved (16 Sec)' : isPRDApproved ? (designDetails.current_version ? 'Draft Ready' : 'Unlocked') : 'Gated',
      locked: !isPRDApproved,
    },
  ];

  const renderDocumentPane = () => (
    <DocumentCanvasPane
      docType={activeDocType}
      document={activeDocDetails.document}
      currentVersion={activeDocDetails.current_version}
      sections={activeDocDetails.sections}
      generatingDoc={generatingDoc}
      isEditingDoc={isEditingDoc}
      docEditContent={docEditContent}
      onDocEditChange={setDocEditContent}
      selectedSectionNum={selectedSectionNum}
      onSelectSectionNum={setSelectedSectionNum}
      docDisplayMode={docDisplayMode}
      onSetDocDisplayMode={setDocDisplayMode}
      copiedFullDoc={copiedFullDoc}
      isDark={isCurrentDark}
      isPRDApproved={isPRDApproved}
      isSRSOutdated={isSRSOutdated}
      layoutMode={layoutMode}
      onSetLayoutMode={setLayoutMode}
      onCloseDocPane={() => setLayoutMode('chat')}
      onGeneratePRD={handleGeneratePRD}
      onRegeneratePRDSection={handleRegeneratePRDSection}
      onApprovePRD={handleApprovePRD}
      onGenerateSRS={handleGenerateSRS}
      onRegenerateSRSSection={handleRegenerateSRSSection}
      onApproveSRS={handleApproveSRS}
      onGenerateArchitecture={handleGenerateArchitecture}
      onRegenerateArchitectureSection={handleRegenerateArchitectureSection}
      onApproveArchitecture={handleApproveArchitecture}
      onGenerateDesign={handleGenerateDesign}
      onRegenerateDesignSection={handleRegenerateDesignSection}
      onApproveDesign={handleApproveDesign}
      onCopyFullDoc={handleCopyFullDoc}
      onExportDoc={handleExportDoc}
      onStartEdit={handleStartEdit}
      onSaveEdit={handleSaveEdit}
    />
  );

  const renderChatPane = () => (
<div className="flex-1 flex flex-col overflow-hidden h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!activeProject ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                  <div className="mb-4 shadow-sm hover:scale-105 transition-transform">
                    <SpecraIcon size={56} />
                  </div>
                  <h3 className="text-xl font-bold text-fg mb-1 tracking-tight">
                    Welcome to <span className="font-extrabold">specra</span>
                  </h3>
                  <p className="text-xs text-muted max-w-md mb-6 leading-relaxed">
                    Personal requirements engineering workspace transforming product briefs and ideas into structured system specifications: PRD, SRS, Architecture, and Design System.
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectManagerTab('open');
                        setIsProjectManagerOpen(true);
                      }}
                      className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all"
                    >
                      <FolderOpen size={15} />
                      <span>Open Project Manager</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectManagerTab('create');
                        setIsProjectManagerOpen(true);
                      }}
                      className="px-4 py-2.5 bg-surface hover:bg-fill-mute border border-border text-fg rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-2 transition-all"
                    >
                      <Plus size={15} />
                      <span>+ Create New Project</span>
                    </button>
                  </div>

                  {projects.length > 0 && (
                    <div className="w-full mt-8 pt-6 border-t border-border/70 text-left space-y-2.5">
                      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-2">
                        Recent Projects
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {projects.slice(0, 4).map((proj) => (
                          <div
                            key={proj.id}
                            onClick={() => handleOpenProjectInTab(proj)}
                            className="p-3 bg-fill-soft/60 hover:bg-fill-soft border border-border/80 hover:border-primary/50 rounded-xl cursor-pointer transition-all group shadow-2xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <FolderKanban size={14} className="text-primary shrink-0" />
                                <span className="font-semibold text-xs text-fg group-hover:text-primary transition-colors truncate">
                                  {proj.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted line-clamp-1 mt-1">
                                {proj.description || 'No description provided'}
                              </p>
                            </div>
                            <div className="mt-2 text-[10px] text-muted-2 flex items-center gap-1 font-mono">
                              <span>Click to open</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <FileText size={32} className="text-slate-300 dark:text-slate-700" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">Start Requirement Discovery</p>
                  <p className="text-xs max-w-sm text-center">
                    Type an idea or upload a specification draft below. {currentSpecialist.name} will analyze requirements and extract structured specs (MoSCoW).
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isUser = m.role === 'user';
                  const isLastAssistant = !isUser && idx === messages.map(msg => String(msg.role)).lastIndexOf('assistant');
                  return isUser ? (
                    <div key={m.id} className="flex justify-end select-text">
                      <div className="max-w-[75%] rounded-[8px] px-3.5 py-2.5 bg-fill text-fg border border-border/60 leading-relaxed whitespace-pre-wrap shadow-2xs text-[13px] select-text">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="border-l-2 border-primary pl-4 py-2 space-y-2 bg-fill-soft/40 p-3 rounded-r-[8px] select-text">
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center justify-between gap-1.5 select-none">
                        <div className="flex items-center gap-1.5">
                          <Bot size={13} />
                          <span>{currentSpecialist.name} ({currentSpecialist.role})</span>
                        </div>
                        <span className="text-[10px] font-mono font-normal opacity-70">
                          {interactionMode === 'discovery' ? 'Discovery Mode' : 'Execution Mode'}
                        </span>
                      </div>
                      <div className="leading-relaxed text-fg-2 text-[13px] select-text">
                        <MarkdownViewer content={m.content} isDark={isCurrentDark} />
                      </div>

                      {/* Interactive Clarification Cards (The Q&A Loop) - Only render pending open questions */}
                      {(() => {
                        const openClarifications = clarifications.filter(c => c.status !== 'answered' && !c.answer);
                        if (!isLastAssistant || openClarifications.length === 0) return null;

                        return (
                          <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5">
                            <div className="flex items-center justify-between text-xs font-semibold text-primary">
                              <span className="flex items-center gap-1.5">
                                <HelpCircle size={13} />
                                <span>Clarification Needed ({openClarifications.length} Open)</span>
                              </span>
                              <span className="text-[10px] font-mono text-muted">The Q&A Loop</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {openClarifications.map((c) => (
                                <div
                                  key={c.id}
                                  className="p-3 rounded-xl border border-border bg-surface shadow-xs text-xs space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-soft text-primary">
                                      Question to Answer
                                    </span>
                                    <span className="text-[10px] font-mono font-medium text-warn">
                                      Pending
                                    </span>
                                  </div>
                                  <p className="font-medium text-fg leading-relaxed">{c.question}</p>
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleAnswerClarification(c.id);
                                    }}
                                    className="flex items-center gap-1.5 pt-1"
                                  >
                                    <input
                                      type="text"
                                      value={clarificationAnswers[c.id] || ''}
                                      onChange={(e) => setClarificationAnswers(prev => ({ ...prev, [c.id]: e.target.value }))}
                                      placeholder="Type your clarification answer..."
                                      className="flex-1 px-2.5 py-1.5 text-xs bg-fill border border-border rounded-lg text-fg placeholder:text-muted focus:outline-none focus:border-primary"
                                    />
                                    <button
                                      type="submit"
                                      disabled={!clarificationAnswers[c.id]?.trim()}
                                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-40 transition-colors shadow-2xs shrink-0"
                                    >
                                      Submit Answer
                                    </button>
                                  </form>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}

              {isSending && (
                <div className="border-l-2 border-primary pl-4 py-2 flex items-center gap-2 text-xs text-primary font-mono">
                  <Loader2 size={13} className="animate-spin" />
                  <span>{currentSpecialist.name} is analyzing and extracting specifications via {primaryProvider}...</span>
                </div>
              )}

              {/* AI Pipeline Readiness Recommender Card */}
              {requirements.length >= 3 && !prdDetails.current_version && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary-soft/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-primary">AI Pipeline Recommendation</span>
                        <span className="text-[10px] font-mono bg-ok text-white px-1.5 py-0.2 rounded font-semibold">Discovery Ready</span>
                      </div>
                      <p className="text-xs text-fg-2 mt-0.5 leading-relaxed">
                        Requirements context is comprehensive ({requirements.length} requirements identified). Ready to advance to <strong>PRD (20 Sections)</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenDocument('prd');
                      handleGeneratePRD();
                    }}
                    disabled={generatingDoc !== null}
                    className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {generatingDoc === 'prd' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                    <span>{generatingDoc === 'prd' ? 'Drafting PRD...' : 'Generate PRD Draft'}</span>
                  </button>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Unified Elevated Chat Input Container */}
            {activeProject && (
              <div className="p-3 border-t border-border/60 bg-panel/30 shrink-0 relative">
                {/* File Attachment Pill Preview */}
                {attachedFile && (
                  <div className="mb-2 p-2 bg-primary-soft/80 border border-primary/30 rounded-xl flex items-center justify-between text-xs text-primary max-w-md shadow-2xs">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip size={13} className="shrink-0" />
                      <span className="font-semibold truncate">{attachedFile.name}</span>
                      <span className="text-[10px] font-mono opacity-70">({Math.round(attachedFile.size / 1024)} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="ml-1 p-0.5 hover:bg-fill-mute rounded text-primary hover:text-err transition-colors"
                      title="Remove attachment"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Floating Slash Commands Popover */}
                {showSlashMenu && filteredSlashCommands.length > 0 && (
                  <div
                    ref={slashMenuRef}
                    onMouseDown={(e) => e.preventDefault()}
                    className="absolute bottom-[calc(100%+8px)] left-4 right-4 max-w-lg bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-border/60 animate-in fade-in slide-in-from-bottom-2 select-none"
                  >
                    <div className="px-3 py-2 bg-panel flex items-center justify-between text-[11px] font-semibold text-muted">
                      <span>AI Studio Quick Commands</span>
                      <span className="font-mono text-[10px] text-muted">Use ↑ ↓ Enter or click</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto overscroll-contain py-1 mqs-scroll">
                      {filteredSlashCommands.map((cmd, idx) => {
                          const CmdIcon = cmd.icon;
                          const isSelected = idx === selectedSlashIndex;
                          return (
                            <button
                              key={cmd.cmd}
                              ref={(el) => (slashItemRefs.current[idx] = el)}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectSlashCommand(cmd)}
                              onMouseEnter={() => setSelectedSlashIndex(idx)}
                              className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition-colors ${
                                isSelected ? 'bg-primary-soft text-primary font-medium' : 'hover:bg-fill-mute text-fg'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <CmdIcon size={14} className={isSelected ? 'text-primary' : 'text-muted'} />
                                <span className="font-mono font-bold">{cmd.cmd}</span>
                                <span className="text-muted text-[11px]">— {cmd.label}</span>
                              </div>
                              <span className="text-[10px] text-muted truncate max-w-[140px]">{cmd.desc}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Hidden File Picker Input */}
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".md,.txt,.json,.markdown" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />

                {/* Unified Elevated Input Console Card */}
                <div className="bg-surface border border-border rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all p-2 space-y-2">
                  
                  {/* Top Mini Toolbar: Persona Selector & Mode Selector Pills */}
                  <div className="flex items-center justify-between gap-2 px-1 border-b border-border/40 pb-1.5">
                    <div className="flex items-center gap-2">
                      {/* Persona Selector Pill */}
                      <div className="relative" ref={personaMenuRef}>
                        <button
                          type="button"
                          onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-panel hover:bg-fill-mute text-fg border border-border/80 text-xs font-semibold shadow-2xs transition-colors"
                          title="Change Specialist AI Persona"
                        >
                          {(() => {
                            const CurrIcon = currentSpecialist.icon;
                            return <CurrIcon size={13} className={currentSpecialist.colorClass} />;
                          })()}
                          <span>{currentSpecialist.name}</span>
                          <ChevronDown size={11} className="text-muted" />
                        </button>

                        {/* Persona Dropdown Menu (Adaptive Upward) */}
                        {showPersonaMenu && (
                          <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 divide-y divide-border/50 animate-in fade-in slide-in-from-bottom-2">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted bg-panel/50">
                              Select Specialist Persona
                            </div>
                            {specialistAgents.map((ag) => {
                              const AgIcon = ag.icon;
                              const isAgActive = activeChatAgent === ag.id;
                              return (
                                <button
                                  key={ag.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveChatAgent(ag.id);
                                    setShowPersonaMenu(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left flex items-start gap-2.5 text-xs transition-colors ${
                                    isAgActive ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill-mute text-fg'
                                  }`}
                                >
                                  <AgIcon size={14} className={`mt-0.5 shrink-0 ${isAgActive ? ag.colorClass : 'text-muted'}`} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold">{ag.name}</span>
                                      <span className="text-[9.5px] font-mono px-1 rounded bg-fill text-muted">
                                        {ag.docFocus}
                                      </span>
                                    </div>
                                    <p className="text-[10.5px] text-muted line-clamp-1">{ag.role}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Interaction Mode Segmented Pill */}
                      <div className="flex items-center p-0.5 rounded-lg bg-panel border border-border/80 text-xs">
                        <button
                          type="button"
                          onClick={() => setInteractionMode('discovery')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                            interactionMode === 'discovery'
                              ? 'bg-primary text-white shadow-2xs'
                              : 'text-muted hover:text-fg'
                          }`}
                          title="Exploration Mode (Default): AI proactively discovers gaps, asks clarification questions, and tracks assumptions."
                        >
                          <Search size={12} />
                          <span>Exploration (Q&A)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInteractionMode('execution')}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                            interactionMode === 'execution'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-muted hover:text-fg'
                          }`}
                          title="Execution Mode: AI generates specifications and document artifacts directly without asking questions."
                        >
                          <Zap size={12} />
                          <span>Execution (Direct)</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Slash Hint */}
                    <div className="text-[10.5px] font-mono text-muted hidden sm:flex items-center gap-1">
                      <span>Type</span>
                      <kbd className="px-1.5 py-0.5 bg-fill border border-border rounded text-[10px] text-fg font-semibold">/</kbd>
                      <span>for commands</span>
                    </div>
                  </div>

                  {/* Input Row: Attachment + Input Field + Send Button */}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach specification draft (.md, .txt, .json)"
                      className="w-8 h-8 flex items-center justify-center text-muted hover:text-primary rounded-lg hover:bg-fill-mute transition-colors shrink-0"
                    >
                      <Paperclip size={15} />
                    </button>

                    <input 
                      type="text"
                      value={inputMessage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputMessage(val);
                        if (val.startsWith('/')) {
                          setShowSlashMenu(true);
                          setSelectedSlashIndex(0);
                        } else {
                          setShowSlashMenu(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (showSlashMenu && filteredSlashCommands.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSelectedSlashIndex(prev => (prev + 1) % filteredSlashCommands.length);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSelectedSlashIndex(prev => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            const selected = filteredSlashCommands[selectedSlashIndex] || filteredSlashCommands[0];
                            if (selected) {
                              handleSelectSlashCommand(selected);
                            }
                          } else if (e.key === 'Escape') {
                            setShowSlashMenu(false);
                          }
                        }
                      }}
                      placeholder={
                        interactionMode === 'discovery'
                          ? `Discuss ideas with ${currentSpecialist.name}, or type / for commands...`
                          : `Direct instructions to ${currentSpecialist.name} (Execution Mode)...`
                      }
                      className="flex-1 bg-transparent text-[13px] font-normal outline-none text-fg placeholder:text-muted px-1 py-1"
                      disabled={isSending}
                    />

                    <button 
                      type="submit"
                      title="Send Message"
                      className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0 shadow-2xs font-semibold text-xs"
                      disabled={(!inputMessage.trim() && !attachedFile) || isSending}
                    >
                      {isSending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send size={12} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
  );



  return (
    <div className="m3 flex flex-col w-full h-full overflow-hidden text-fg">
      
      {/* 1. Full-Width Title Bar (40px) */}
      <header className="tb2 h-10 px-3 flex items-center justify-between border-b border-border/60 bg-chrome select-none shrink-0">
        <div className="mqs-tabrow flex items-center gap-1.5 min-w-0 flex-1">
          {/* Logo / Project Manager Button */}
          <button
            type="button"
            onClick={() => {
              setProjectManagerTab('open');
              setIsProjectManagerOpen(true);
            }}
            className="flex items-center gap-2 px-2 py-1 rounded-[6px] hover:bg-fill-mute text-fg transition-colors shrink-0"
            title="Open Project Manager"
          >
            <SpecraLogo size={22} showWordmark={true} />
          </button>

          <div className="h-4 w-px bg-border/60 mx-2.5 shrink-0" />

          {/* Project Tabs Strip */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {openProjectIds.map((pid) => {
              const proj = projects.find(p => p.id === pid);
              if (!proj) return null;
              const isActive = activeProject?.id === pid;
              return (
                <div
                  key={pid}
                  onClick={() => setActiveProject(proj)}
                  className={`group relative flex items-center gap-2 px-3 py-1 rounded-[6px] text-xs font-medium cursor-pointer transition-all shrink-0 max-w-[160px] select-none ${
                    isActive
                      ? 'bg-surface text-fg shadow-2xs border border-border/80'
                      : 'text-muted hover:text-fg hover:bg-fill-mute/70 border border-transparent'
                  }`}
                  title={proj.name}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-primary' : 'bg-muted-2'}`} />
                  <span className="truncate pr-3">{proj.name}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseProjectTab(pid, e)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-2 hover:text-err hover:bg-fill-mute transition-colors opacity-0 group-hover:opacity-100"
                    title="Close tab"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setProjectManagerTab('create');
                setIsProjectManagerOpen(true);
              }}
              className="flex items-center justify-center w-6 h-6 rounded-[6px] text-muted hover:text-fg hover:bg-fill-mute border border-dashed border-border-dash transition-colors shrink-0"
              title="Open or Create Project"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Right Actions in TitleBar */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {/* Toggle Left Sidebar */}
          <button
            type="button"
            onClick={() => setShowLeftSidebar(prev => !prev)}
            className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
              showLeftSidebar ? 'bg-fill-mute text-fg' : 'text-muted hover:text-fg hover:bg-fill-mute'
            }`}
            title="Toggle Navigator Sidebar (Ctrl+B)"
          >
            <Columns size={14} />
          </button>

          {/* AI Provider Status Pill */}
          <div 
            onClick={() => { setSettingsTab('providers'); setShowSettingsModal(true); loadGeneralSettings(); loadTokenUsage(); handleDetectAgents(true); }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-fill-soft border border-border/60 text-[11px] font-mono cursor-pointer hover:border-primary/50 transition-colors"
            title={`Active Engine: ${primaryProvider}${providerStatus.model ? ` (${providerStatus.model})` : ''} - Click to manage`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${providerStatus.available ? 'bg-ok' : 'bg-err'}`} />
            <span className="text-muted">
              {providerStatus.model ? `${primaryProvider.replace('-cli', '')} · ${providerStatus.model}` : providerStatus.version}
            </span>
          </div>

          {/* Inspector Toggle */}
          {activeProject && (
            <button 
              type="button"
              onClick={() => setShowInspector(!showInspector)}
              className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                showInspector 
                  ? 'bg-fill-mute text-fg' 
                  : 'text-muted hover:text-fg hover:bg-fill-mute'
              }`}
              title="Toggle Project Co-Pilot (Ctrl+J)"
            >
              <PanelRight size={14} />
            </button>
          )}

          {/* Quick Theme Toggle (Sun / Moon) */}
          <button
            type="button"
            onClick={toggleQuickTheme}
            className="p-1.5 rounded-[6px] text-muted hover:text-fg hover:bg-fill-mute transition-colors cursor-pointer"
            title={isCurrentDark ? "Beralih ke Mode Terang (Light)" : "Beralih ke Mode Gelap (Dark)"}
          >
            {isCurrentDark ? (
              <Sun size={14} className="text-amber-400" />
            ) : (
              <Moon size={14} />
            )}
          </button>
        </div>
      </header>

      {/* 2. Desktop Application Menu Bar (28px) */}
      <DesktopMenuBar
        activeProjectName={activeProject?.name}
        hasActiveProject={Boolean(activeProject)}
        activeDocType={activeDocType}
        layoutMode={layoutMode}
        showLeftSidebar={showLeftSidebar}
        showRightInspector={showInspector}
        isDark={isCurrentDark}
        themeMode={themeMode}
        docStatuses={{
          prd: { exists: Boolean(prdDetails.current_version), status: prdDetails.document?.status },
          srs: { exists: Boolean(srsDetails.current_version), status: srsDetails.document?.status },
          architecture: { exists: Boolean(architectureDetails.current_version), status: architectureDetails.document?.status },
          design: { exists: Boolean(designDetails.current_version), status: designDetails.document?.status },
        }}
        generatingDoc={generatingDoc}
        activeAgentId={activeChatAgent}
        onNewProject={() => {
          setProjectManagerTab('create');
          setIsProjectManagerOpen(true);
        }}
        onOpenProjectManager={() => {
          setProjectManagerTab('open');
          setIsProjectManagerOpen(true);
        }}
        onOpenWorkspaceFolder={handleOpenWorkspaceFolder}
        onExportActiveDoc={handleExportDoc}
        onExportAllDocs={handleExportAllDocs}
        onOpenSettings={(tab) => {
          if (tab) setSettingsTab(tab as any);
          setShowSettingsModal(true);
          loadGeneralSettings();
          loadTokenUsage();
          handleDetectAgents(true);
        }}
        onClearChat={() => setMessages([])}
        onCopyDoc={handleCopyFullDoc}
        onToggleLeftSidebar={() => setShowLeftSidebar(prev => !prev)}
        onToggleRightInspector={() => setShowInspector(prev => !prev)}
        onSetLayoutMode={setLayoutMode}
        onSetTheme={(t) => {
          applyTheme(t);
          setGeneralSettings(prev => ({ ...prev, theme: t }));
          ProviderService.SaveGeneralSettings({ ...generalSettings, theme: t }).catch(() => {});
        }}
        onOpenDoc={handleOpenDocument}
        onSelectAgent={(agentId) => setActiveChatAgent(agentId)}
        onRunAutoPipeline={() => runAutoPipeline(false)}
        onRunClarify={async () => {
          if (activeSession && activeProject) {
            setIsSending(true);
            try {
              await ConversationService.SendMessageWithAgent(
                activeSession.id,
                activeProject.id,
                "[MODE: DISCOVERY] Evaluate all available project context. Identify ambiguities and ask 1-3 crucial clarification questions.",
                activeChatAgent
              );
              const msgs = await ConversationService.ListMessages(activeSession.id);
              setMessages(msgs || []);
              await refreshProjectEntities(activeProject.id);
            } catch (err) {
              notifyError("Clarify Error", String(err));
            } finally {
              setIsSending(false);
            }
          }
        }}
        onRunValidation={handleRunValidation}
        onRunDiagnostics={handleRunDiagnostics}
      />

      {/* 2. Main Area: Sidebar + Content Sheet + Inspector */}
      <div className="mqs-main flex-1 flex min-w-0 min-height-0 overflow-hidden">
        
        {/* Left Sidebar (Navigator & Specifications Tree - Resizable) */}
        {showLeftSidebar && (
          <>
            <aside 
              style={{ width: `${leftPanel.width}px` }}
              className="side3 flex flex-col justify-between shrink-0 py-2.5 px-2 select-none border-r border-border/80 bg-panel/40 overflow-y-auto no-scrollbar"
            >
              <div className="space-y-3">
                {/* Group: Specifications & Pipeline Hub */}
                <div className="space-y-2">
                  <div className="gl text-[10.5px] font-semibold uppercase tracking-wider text-muted-2 px-2 py-0.5 flex items-center justify-between">
                    <span>Specifications & Pipeline</span>
                    <span className="text-[10px] font-mono text-muted">{requirements.length} Reqs</span>
                  </div>

                  {/* Primary Pipeline Execution Card */}
                  {activeProject && (
                    <div className="px-1">
                      {autoPipelineRunning ? (
                        <div className="p-2 rounded-lg bg-primary-soft border border-primary/30 flex items-center justify-between text-xs text-primary shadow-2xs animate-pulse">
                          <div className="flex items-center gap-1.5 font-semibold min-w-0">
                            <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                            <span className="truncate text-[11px]">{autoPipelineStage || 'Generating Pipeline...'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setAutoPipelineRunning(false); setAutoPipelineStage(null); setGeneratingDoc(null); }}
                            className="px-1.5 py-0.5 rounded bg-surface hover:bg-fill text-muted hover:text-err text-[10px] font-mono transition-colors shrink-0 cursor-pointer"
                            title="Cancel pipeline execution"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => runAutoPipeline(false)}
                          disabled={!activeProject || generatingDoc !== null}
                          className="w-full py-1.5 px-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11.5px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                          title="Generate all documents in cascade: Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design"
                        >
                          <Zap size={13} className="fill-current text-amber-300" />
                          <span>Generate Full Pipeline</span>
                        </button>
                      )}

                      {pipelinePausedReason && (
                        <div 
                          onClick={() => {
                            setShowInspector(true);
                            setOpenAccordion('qa');
                          }}
                          className="mt-1.5 p-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10.5px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors"
                          title="Buka panel Q&A untuk menjawab pertanyaan klarifikasi"
                        >
                          <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                          <span className="truncate font-medium">Pipeline Paused: Jawab Q&A</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => { setLayoutMode('chat'); setCurrentView('chat'); }}
                      className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center gap-2 text-[12px] font-medium transition-colors cursor-pointer ${
                        layoutMode === 'chat'
                          ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                          : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                      }`}
                    >
                      <MessageSquare size={14} className={layoutMode === 'chat' ? 'text-primary' : 'text-muted'} />
                      <span className="truncate">Chat Co-Pilot</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDocument('prd')}
                      className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors cursor-pointer ${
                        activeDocType === 'prd' && layoutMode !== 'chat'
                          ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                          : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={14} className={activeDocType === 'prd' && layoutMode !== 'chat' ? 'text-primary shrink-0' : 'text-tone-blue shrink-0'} />
                        <span className="truncate">1. PRD Document</span>
                      </div>
                      {generatingDoc === 'prd' ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary-soft text-primary font-bold flex items-center gap-1 shrink-0 animate-pulse">
                          <Loader2 size={10} className="animate-spin" />
                          <span>Generating</span>
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold shrink-0 ${
                          isPRDApproved ? 'bg-ok-tint text-ok' : prdDetails.current_version ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-fill text-muted'
                        }`}>
                          {isPRDApproved ? 'Approved' : prdDetails.current_version ? 'Draft' : 'None'}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDocument('srs')}
                      className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors cursor-pointer ${
                        activeDocType === 'srs' && layoutMode !== 'chat'
                          ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                          : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCode2 size={14} className={activeDocType === 'srs' && layoutMode !== 'chat' ? 'text-primary shrink-0' : 'text-tone-teal shrink-0'} />
                        <span className="truncate">2. SRS Document</span>
                      </div>
                      {generatingDoc === 'srs' ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary-soft text-primary font-bold flex items-center gap-1 shrink-0 animate-pulse">
                          <Loader2 size={10} className="animate-spin" />
                          <span>Generating</span>
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold shrink-0 ${
                          isSRSOutdated
                            ? 'bg-err-bg text-err'
                            : srsDetails.document?.status === 'approved' 
                            ? 'bg-ok-tint text-ok' 
                            : !isPRDApproved 
                            ? 'bg-fill text-muted' 
                            : 'bg-fill text-muted'
                        }`}>
                          {isSRSOutdated ? (
                            'Outdated'
                          ) : !isPRDApproved ? (
                            <span className="flex items-center gap-1 text-[10px]" title="Locked: Requires approved PRD">
                              <Lock size={10} className="text-muted-2" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            srsDetails.document?.status || (srsDetails.current_version ? 'Draft' : 'Ready')
                          )}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDocument('architecture')}
                      className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors cursor-pointer ${
                        activeDocType === 'architecture' && layoutMode !== 'chat'
                          ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                          : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Cpu size={14} className={activeDocType === 'architecture' && layoutMode !== 'chat' ? 'text-primary shrink-0' : 'text-tone-violet shrink-0'} />
                        <span className="truncate">3. Architecture</span>
                      </div>
                      {generatingDoc === 'architecture' ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary-soft text-primary font-bold flex items-center gap-1 shrink-0 animate-pulse">
                          <Loader2 size={10} className="animate-spin" />
                          <span>Generating</span>
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold shrink-0 ${
                          isArchitectureApproved 
                            ? 'bg-ok-tint text-ok' 
                            : !isPRDApproved 
                            ? 'bg-fill text-muted' 
                            : 'bg-fill text-muted'
                        }`}>
                          {isArchitectureApproved ? (
                            'approved'
                          ) : !isPRDApproved ? (
                            <span className="flex items-center gap-1 text-[10px]" title="Locked: Requires approved PRD">
                              <Lock size={10} className="text-muted-2" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            architectureDetails.document?.status || (architectureDetails.current_version ? 'Draft' : 'Ready')
                          )}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDocument('design')}
                      className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors cursor-pointer ${
                        activeDocType === 'design' && layoutMode !== 'chat'
                          ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                          : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers size={14} className={activeDocType === 'design' && layoutMode !== 'chat' ? 'text-primary shrink-0' : 'text-tone-orange shrink-0'} />
                        <span className="truncate">4. Design System</span>
                      </div>
                      {generatingDoc === 'design' ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary-soft text-primary font-bold flex items-center gap-1 shrink-0 animate-pulse">
                          <Loader2 size={10} className="animate-spin" />
                          <span>Generating</span>
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase font-semibold shrink-0 ${
                          isDesignApproved 
                            ? 'bg-ok-tint text-ok' 
                            : !isPRDApproved 
                            ? 'bg-fill text-muted' 
                            : 'bg-fill text-muted'
                        }`}>
                          {isDesignApproved ? (
                            'approved'
                          ) : !isPRDApproved ? (
                            <span className="flex items-center gap-1 text-[10px]" title="Locked: Requires approved PRD">
                              <Lock size={10} className="text-muted-2" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            designDetails.document?.status || (designDetails.current_version ? 'Draft' : 'Ready')
                          )}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Group: Active Project Summary */}
                <div>
                  <div className="gl text-[11px] font-semibold uppercase tracking-wider text-muted-2 px-2 py-1 flex items-center justify-between">
                    <span>Active Project</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProjectManagerTab('open');
                        setIsProjectManagerOpen(true);
                      }}
                      className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Switch
                    </button>
                  </div>

                  {activeProject ? (
                    <div className="p-2.5 rounded-[8px] border border-border bg-fill-soft/80 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <FolderKanban size={13} className="text-primary shrink-0" />
                        <span className="font-semibold text-xs text-fg truncate">
                          {activeProject.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                        {activeProject.description || 'No description provided.'}
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-muted-2 border-t border-border/60">
                        <span>{requirements.length} Reqs</span>
                        <button
                          type="button"
                          onClick={handleOpenEditProject}
                          className="hover:text-primary font-medium cursor-pointer"
                        >
                          Edit Info
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-[8px] border border-border/80 bg-fill-soft/50 text-xs text-muted space-y-1.5">
                      <div className="flex items-center gap-1.5 text-fg-2 font-medium">
                        <FolderKanban size={13} className="text-muted" />
                        <span>No active project</span>
                      </div>
                      <p className="text-[11px] text-muted-2 leading-relaxed">
                        Buka project di tab atas atau gunakan tombol pada menu File.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Footer: Settings / Configuration */}
              <div className="pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsTab('general');
                    setShowSettingsModal(true);
                    loadGeneralSettings();
                    loadTokenUsage();
                    handleDetectAgents(true);
                  }}
                  className="w-full flex items-center justify-between text-xs px-2.5 py-2 rounded-[7px] hover:bg-fill-mute text-fg-2 hover:text-fg transition-colors border border-border/60 bg-surface shadow-2xs cursor-pointer group"
                  title="Settings / Configuration (Ctrl+,)"
                >
                  <div className="flex items-center gap-2">
                    <Settings size={14} className="text-primary group-hover:rotate-45 transition-transform" />
                    <span className="font-semibold text-xs text-fg">Settings / Configuration</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted bg-fill px-1.5 py-0.5 rounded border border-border/60">
                    Ctrl+,
                  </span>
                </button>
              </div>
            </aside>

            {/* Draggable Divider for Left Sidebar */}
            <div
              onMouseDown={leftPanel.startResize}
              className="w-1.5 hover:w-2 hover:bg-primary/50 cursor-col-resize transition-all shrink-0 z-20 group relative flex items-center justify-center select-none"
              title="Tarik untuk mengubah lebar panel navigasi"
            >
              <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary" />
            </div>
          </>
        )}

        {/* Central Workspace Sheet (.mqs-content - Layered Center Stage) */}
        <main className="mqs-content flex-1 flex flex-col min-w-0 min-height-0 mr-2 mb-2 rounded-[12px] border border-border bg-surface shadow-xs overflow-hidden relative">

        {/* Auto Pipeline Gating Banner (Paused on Clarifications) */}
        {pipelinePausedReason && (
          <div className="mx-4 mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 shrink-0 shadow-2xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <div>
                <span className="font-semibold">{pipelinePausedReason}</span>
                <p className="text-[11.5px] text-muted mt-0.5">Submit clarification answers below to prevent AI hallucinations, or resume with current assumptions.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setPipelinePausedReason(null); runAutoPipeline(true); }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Resume Pipeline</span>
                <ChevronRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPipelinePausedReason(null)}
                className="p-1 hover:bg-fill-mute rounded text-muted hover:text-fg transition-colors"
                title="Dismiss notice"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Auto Pipeline Completion Celebration Banner */}
        {pipelineCompletedNotice && (
          <div className="mx-4 mt-2 p-3 bg-ok-tint border border-ok/30 rounded-xl flex items-center justify-between gap-3 text-xs text-ok shrink-0 shadow-2xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-ok shrink-0" />
              <div>
                <span className="font-semibold text-fg">Auto Pipeline Complete! All 4 Specification Documents Generated & Approved</span>
                <p className="text-[11.5px] text-muted mt-0.5">PRD (20 Sections), SRS (22 Sections), Architecture (16 Sections), and Design System (16 Sections) are ready for use.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportAllDocs}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download size={13} />
                <span>Export All (.md)</span>
              </button>
              <button
                type="button"
                onClick={() => setPipelineCompletedNotice(false)}
                className="p-1 hover:bg-fill-mute rounded text-muted hover:text-fg transition-colors"
                title="Dismiss notice"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

                {/* Workspace Panes based on layoutMode */}
        {layoutMode === 'chat' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            {renderChatPane()}
          </div>
        )}

        {layoutMode === 'split' && (
          <div className="flex-1 flex w-full h-full overflow-hidden min-w-0">
            {/* Left Column: Chat Pane (resizable) */}
            <div
              style={{ width: `${centerSplit.width}px` }}
              className="flex flex-col h-full overflow-hidden shrink-0 border-r border-border/80 min-w-[280px]"
            >
              {renderChatPane()}
            </div>

            {/* Draggable Divider between Chat & Document */}
            <div
              onMouseDown={centerSplit.startResize}
              className="w-1.5 hover:w-2 hover:bg-primary/50 cursor-col-resize transition-all shrink-0 z-20 group relative flex items-center justify-center select-none"
              title="Drag to resize Chat vs Document panel width"
            >
              <div className="w-0.5 h-10 rounded-full bg-border group-hover:bg-primary" />
            </div>

            {/* Right Column: Document Canvas */}
            <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
              {renderDocumentPane()}
            </div>
          </div>
        )}

        {layoutMode === 'doc' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
            {renderDocumentPane()}
          </div>
        )}
      </main>

      {/* 3. Context / Project Co-Pilot Panel (Right Pane) */}
      {showInspector && activeProject && (
        <>
          {/* Draggable Divider for Right Inspector */}
          <div
            onMouseDown={rightPanel.startResize}
            className="w-1.5 hover:w-2 hover:bg-primary/50 cursor-col-resize transition-all shrink-0 z-20 group relative flex items-center justify-center select-none"
            title="Tarik untuk mengubah lebar panel Co-Pilot"
          >
            <div className="w-0.5 h-8 rounded-full bg-border group-hover:bg-primary" />
          </div>

          <aside
            style={{ width: `${rightPanel.width}px` }}
            className="mr-2 mb-2 rounded-[12px] border border-border/80 bg-panel/60 shadow-2xs flex flex-col overflow-hidden shrink-0 backdrop-blur-xs"
          >
          
          {/* Co-Pilot Header: Title, pending actions badge, & close button */}
          <div className="h-10 px-3.5 border-b border-border flex items-center justify-between shrink-0 bg-surface/80 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-primary" />
              <span className="font-semibold text-xs text-fg tracking-tight">
                Project Co-Pilot
              </span>
              {unresolvedQACount > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{unresolvedQACount} respon</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInspector(false)}
              className="p-1 rounded-md text-muted hover:text-fg hover:bg-fill transition-colors"
              title="Close Co-Pilot Panel"
            >
              <X size={14} />
            </button>
          </div>

          {/* Project Co-Pilot Accordion (Single-Open, Mutually Exclusive with Independent Scrolling) */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden divide-y divide-border/60">
            
            {/* ACCORDION 1: REQUIREMENTS BACKLOG */}
            <div className={`flex flex-col overflow-hidden transition-all duration-150 ${openAccordion === 'requirements' ? 'flex-1 min-h-0' : 'shrink-0'}`}>
              <button
                type="button"
                onClick={() => setOpenAccordion(prev => prev === 'requirements' ? null : 'requirements')}
                className="w-full px-3 py-2.5 bg-panel hover:bg-fill-soft flex items-center justify-between text-left transition-colors select-none shrink-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ListOrdered size={14} className="text-primary shrink-0" />
                  <span className="text-xs font-semibold text-fg truncate">Requirements Backlog</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-fill-mute text-muted font-bold shrink-0">
                    {requirements.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-muted">
                  {openAccordion === 'requirements' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
              </button>
              {openAccordion === 'requirements' && (
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-3 bg-surface/30">
                {/* Header Actions: Quick Stats + Manual Extraction Trigger */}
                <div className="flex items-center justify-between pb-1 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-fg">
                      Requirements ({requirements.length})
                    </span>
                    {requirements.length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ok-tint text-ok font-bold">
                        {requirements.filter(r => r.status === 'approved').length} Appr
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleExtractRequirements}
                    disabled={isExtractingReqs}
                    className="px-2 py-1 rounded bg-primary hover:bg-primary-hover text-white text-[11px] font-medium flex items-center gap-1 disabled:opacity-50 transition-colors shadow-2xs"
                    title="Analyze documents & chat to extract requirements"
                  >
                    <Sparkles size={11} className={isExtractingReqs ? 'animate-spin' : ''} />
                    <span>{isExtractingReqs ? 'Ekstrak...' : 'Ekstrak AI'}</span>
                  </button>
                </div>

                {requirements.length === 0 ? (
                  <div className="flex flex-col items-center text-center py-6 px-3 space-y-4">
                    <div className="size-11 rounded-xl bg-primary-soft/60 border border-border flex items-center justify-center text-primary shadow-2xs">
                      <ListOrdered size={22} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-fg">No Requirements Yet</h4>
                      <p className="text-[11px] leading-relaxed text-muted max-w-[240px]">
                        Send a prompt or click below to automatically extract functional requirements.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExtractRequirements}
                      disabled={isExtractingReqs}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Sparkles size={13} className={isExtractingReqs ? 'animate-spin' : ''} />
                      <span>{isExtractingReqs ? 'Extracting...' : 'Auto-Extract Requirements'}</span>
                    </button>

                    {/* Illustrated Skeleton Placeholders */}
                    <div className="w-full space-y-2 pt-1 opacity-60 pointer-events-none">
                      <div className="p-2.5 rounded-lg border border-dashed border-border bg-surface/50 text-left space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary-soft">
                            FR-001
                          </span>
                          <span className="text-[9px] uppercase font-semibold text-muted px-1.5 py-0.2 rounded bg-fill">
                            Must-Have
                          </span>
                        </div>
                        <div className="h-2.5 w-3/4 bg-border/60 rounded"></div>
                        <div className="h-2 w-full bg-border/40 rounded"></div>
                      </div>

                      <div className="p-2.5 rounded-lg border border-dashed border-border bg-surface/30 text-left space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary-soft">
                            SYS-001
                          </span>
                          <span className="text-[9px] uppercase font-semibold text-muted px-1.5 py-0.2 rounded bg-fill">
                            IEEE 830
                          </span>
                        </div>
                        <div className="h-2.5 w-2/3 bg-border/60 rounded"></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  requirements.map((req) => (
                    <div key={req.id} className="p-3 bg-surface border border-border rounded-xl shadow-2xs space-y-2">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
                          {req.requirement_key}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* MoSCoW Priority Selector */}
                          <select
                            value={req.priority || 'Must Have'}
                            onChange={(e) => handleUpdatePriority(req.id, e.target.value)}
                            className="text-[10px] font-semibold bg-fill border border-border rounded px-1.5 py-0.5 text-fg cursor-pointer focus:outline-none"
                            title="Change MoSCoW Priority"
                          >
                            <option value="Must Have">Must Have</option>
                            <option value="Should Have">Should Have</option>
                            <option value="Could Have">Could Have</option>
                            <option value="Won't Have">Won't Have</option>
                          </select>

                          <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            req.status === 'approved' 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                              : req.status === 'rejected'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-fg leading-snug">{req.title}</h4>
                        <p className="text-xs text-muted leading-relaxed mt-0.5">{req.description}</p>
                      </div>

                      {/* Actions: Approve & Reject Buttons */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-border text-[11px]">
                        <span className="text-[10px] font-mono text-muted uppercase">
                          {req.category || 'functional'}
                        </span>

                        <div className="flex items-center gap-1">
                          {req.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => handleApproveRequirement(req.id)}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-[10.5px] flex items-center gap-1 transition-colors"
                              title="Approve requirement"
                            >
                              <Check size={11} />
                              <span>Approve</span>
                            </button>
                          )}
                          {req.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleRejectRequirement(req.id)}
                              className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-medium text-[10.5px] flex items-center gap-1 transition-colors"
                              title="Reject requirement"
                            >
                              <X size={11} />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ACCORDION 2: QUESTIONS & CLARIFICATIONS */}
          <div className={`flex flex-col overflow-hidden transition-all duration-150 ${openAccordion === 'qa' ? 'flex-1 min-h-0' : 'shrink-0'}`}>
            <button
              type="button"
              onClick={() => setOpenAccordion(prev => prev === 'qa' ? null : 'qa')}
              className="w-full px-3 py-2.5 bg-panel hover:bg-fill-soft flex items-center justify-between text-left transition-colors select-none shrink-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare size={14} className={unresolvedQACount > 0 ? "text-amber-500 shrink-0" : "text-primary shrink-0"} />
                <span className="text-xs font-semibold text-fg truncate">Questions & Clarifications</span>
                {unresolvedQACount > 0 ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold animate-pulse shrink-0">
                    {unresolvedQACount} Open
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-fill-mute text-muted font-bold shrink-0">
                    {clarifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-muted">
                {openAccordion === 'qa' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>
            {openAccordion === 'qa' && (
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-3 bg-surface/30">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-primary" />
                      <span className="text-xs font-semibold text-fg">
                        AI Clarifications ({clarifications.length})
                      </span>
                    </div>
                    {clarifications.filter(c => c.status === 'open' && !c.answer).length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                        {clarifications.filter(c => c.status === 'open' && !c.answer).length} Needs Answer
                      </span>
                    )}
                  </div>

                  {clarifications.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted">
                      No open clarification questions.
                    </div>
                  ) : (
                    clarifications.map((c) => (
                      <div key={c.id} className="p-3 bg-surface border border-border rounded-xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
                            Clarification
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                            c.status === 'answered' || c.answer 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                          }`}>
                            {c.status || (c.answer ? 'answered' : 'open')}
                          </span>
                        </div>
                        
                        <p className="text-xs text-fg leading-relaxed">{c.question}</p>

                        {c.answer ? (
                          <div className="p-2 rounded-lg bg-fill text-xs space-y-0.5 border border-border/80">
                            <span className="text-[10px] font-bold text-ok uppercase">Your Answer:</span>
                            <p className="text-fg text-xs leading-relaxed">{c.answer}</p>
                          </div>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleAnswerClarification(c.id);
                            }}
                            className="flex items-center gap-1.5 pt-1"
                          >
                            <input
                              type="text"
                              value={clarificationAnswers[c.id] || ''}
                              onChange={(e) => setClarificationAnswers(prev => ({ ...prev, [c.id]: e.target.value }))}
                              placeholder="Type your answer here..."
                              className="flex-1 px-2.5 py-1 text-xs bg-fill border border-border rounded-lg text-fg placeholder:text-muted focus:outline-none focus:border-primary"
                            />
                            <button
                              type="submit"
                              disabled={!clarificationAnswers[c.id]?.trim()}
                              className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-40 transition-colors shrink-0 shadow-2xs"
                            >
                              Submit
                            </button>
                          </form>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 3: ASSUMPTIONS & CONSTRAINTS */}
          <div className={`flex flex-col overflow-hidden transition-all duration-150 ${openAccordion === 'assumptions' ? 'flex-1 min-h-0' : 'shrink-0'}`}>
            <button
              type="button"
              onClick={() => setOpenAccordion(prev => prev === 'assumptions' ? null : 'assumptions')}
              className="w-full px-3 py-2.5 bg-panel hover:bg-fill-soft flex items-center justify-between text-left transition-colors select-none shrink-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-fg truncate">Assumptions & Constraints</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-fill-mute text-muted font-bold shrink-0">
                  {assumptions.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-muted">
                {openAccordion === 'assumptions' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>
            {openAccordion === 'assumptions' && (
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-3 bg-surface/30">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-500" />
                      <span className="text-xs font-semibold text-fg">
                        System Assumptions ({assumptions.length})
                      </span>
                    </div>
                    {assumptions.filter(a => a.status === 'confirmed').length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ok-tint text-ok font-bold">
                        {assumptions.filter(a => a.status === 'confirmed').length} Confirmed
                      </span>
                    )}
                  </div>

                  <p className="text-[10.5px] text-muted leading-tight">
                    Automated AI assumptions. Confirm if accurate, or click <strong>Correct</strong> to enter the true project facts.
                  </p>

                  {assumptions.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted">
                      No active assumptions currently.
                    </div>
                  ) : (
                    assumptions.map((a) => {
                      const isEditing = editingAssumptionId === a.id;
                      return (
                        <div key={a.id} className="p-3 bg-surface border border-border rounded-xl space-y-2 text-xs shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                              a.status === 'confirmed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : a.status === 'rejected'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            }`}>
                              {a.status}
                            </span>

                            {/* Action Buttons if not editing */}
                            {!isEditing && (
                              <div className="flex items-center gap-1">
                                {a.status !== 'confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAssumptionStatus(a.id, 'confirmed')}
                                    className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                                    title="Confirm that this assumption is accurate"
                                  >
                                    <Check size={10} />
                                    <span>Confirm</span>
                                  </button>
                                )}
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingAssumptionId(a.id);
                                    setEditingAssumptionText(a.description);
                                  }}
                                  className="px-2 py-0.5 rounded bg-primary-soft hover:bg-primary/20 text-primary text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                                  title="Correct this assumption with factual info"
                                >
                                  <Edit3 size={10} />
                                  <span>Correct</span>
                                </button>

                                {a.status !== 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateAssumptionStatus(a.id, 'rejected')}
                                    className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                                    title="Reject this assumption (irrelevant)"
                                  >
                                    <X size={10} />
                                    <span>Reject</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Inline Correction Form */}
                          {isEditing ? (
                            <div className="space-y-1.5 pt-1">
                              <label className="text-[10.5px] font-semibold text-fg">
                                Enter accurate project facts / preferences:
                              </label>
                              <textarea
                                value={editingAssumptionText}
                                onChange={(e) => setEditingAssumptionText(e.target.value)}
                                rows={2}
                                className="w-full p-2 text-xs bg-fill border border-border rounded-lg text-fg outline-none focus:border-primary resize-none"
                                placeholder="e.g. We use PostgreSQL instead of MongoDB..."
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingAssumptionId(null)}
                                  className="px-2 py-1 text-[11px] rounded bg-fill hover:bg-fill-mute text-fg transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCorrectAssumption(a.id)}
                                  disabled={!editingAssumptionText.trim()}
                                  className="px-2.5 py-1 text-[11px] rounded bg-primary hover:bg-primary-hover text-white font-medium transition-colors disabled:opacity-40 shadow-2xs"
                                >
                                  Save Correction
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-fg leading-relaxed">{a.description}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 4: QUALITY & AUDIT FINDINGS */}
          <div className={`flex flex-col overflow-hidden transition-all duration-150 ${openAccordion === 'audit' ? 'flex-1 min-h-0' : 'shrink-0'}`}>
            <button
              type="button"
              onClick={() => setOpenAccordion(prev => prev === 'audit' ? null : 'audit')}
              className="w-full px-3 py-2.5 bg-panel hover:bg-fill-soft flex items-center justify-between text-left transition-colors select-none shrink-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert size={14} className={findings.length > 0 ? "text-rose-500 shrink-0" : "text-emerald-500 shrink-0"} />
                <span className="text-xs font-semibold text-fg truncate">Quality & Audit Findings</span>
                {findings.length > 0 ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold shrink-0">
                    {findings.length}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ok-tint text-ok font-bold shrink-0">
                    Clean
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-muted">
                {openAccordion === 'audit' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            </button>
            {openAccordion === 'audit' && (
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-3 bg-surface/30">
                <div className="space-y-4">
                
                {/* 1. Interactive Multi-Agent Pipeline Stepper */}
                <div className="p-3 bg-surface border border-border rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <span className="text-xs font-semibold text-fg flex items-center gap-1.5">
                      <Activity size={13} className="text-primary" />
                      Document Pipeline Stepper
                    </span>
                    <span className="text-[10px] font-mono font-bold text-muted">5 Stages</span>
                  </div>

                  <div className="space-y-1.5">
                    {pipelineSteps.map((s, idx) => {
                      const isCompleted = s.status === 'completed';
                      const isDraft = s.status === 'draft';
                      const isCurrent = (layoutMode === 'chat' && s.id === 'chat') || (layoutMode !== 'chat' && activeDocType === s.id);
                      const isGeneratingThis = generatingDoc === s.id || (autoPipelineRunning && autoPipelineStage?.toLowerCase().includes(s.name.toLowerCase().split(' ')[1] || ''));
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (!s.locked) {
                              handlePipelineStepClick(s.id as any);
                            }
                          }}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${
                            isCurrent
                              ? 'border-primary/50 bg-primary-soft/60 font-semibold'
                              : s.locked
                              ? 'border-border/40 opacity-50 cursor-not-allowed'
                              : 'border-border bg-fill-soft/40 hover:bg-fill-mute cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isGeneratingThis ? (
                              <span className="w-4 h-4 rounded-full flex items-center justify-center bg-primary-soft text-primary shrink-0">
                                <Loader2 size={12} className="animate-spin text-primary" />
                              </span>
                            ) : (
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isCompleted
                                  ? 'bg-ok text-white'
                                  : isDraft
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-fill text-muted'
                              }`}>
                                {isCompleted ? '✓' : idx + 1}
                              </span>
                            )}
                            <span className="text-fg">{s.name}</span>
                          </div>

                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium flex items-center gap-1 ${
                            isGeneratingThis
                              ? 'bg-primary-soft text-primary font-bold animate-pulse'
                              : isCompleted 
                              ? 'bg-ok-tint text-ok font-bold' 
                              : isDraft 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
                              : 'text-muted'
                          }`}>
                            {isGeneratingThis && <Loader2 size={9} className="animate-spin" />}
                            <span>{isGeneratingThis ? 'Generating...' : s.desc}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action: Auto Pipeline (Regenerate All) */}
                  <div className="pt-2 border-t border-border/70">
                    {autoPipelineRunning ? (
                      <div className="p-2.5 rounded-xl bg-primary-soft border border-primary/30 flex items-center justify-between text-xs text-primary animate-pulse shadow-2xs">
                        <div className="flex items-center gap-2 font-semibold min-w-0">
                          <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                          <span className="truncate">{autoPipelineStage || 'Running Pipeline...'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setAutoPipelineRunning(false); setAutoPipelineStage(null); setGeneratingDoc(null); }}
                          className="px-2 py-0.5 rounded bg-surface hover:bg-fill text-muted hover:text-err text-[10px] font-mono transition-colors shrink-0 cursor-pointer"
                          title="Cancel pipeline execution"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => runAutoPipeline(false)}
                        disabled={!activeProject || generatingDoc !== null}
                        className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                        title="Run full autonomous pipeline: Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design System"
                      >
                        <Zap size={14} className="fill-current text-amber-300" />
                        <span>Regenerate All (Full Pipeline)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Inspection & Validation Findings */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert size={13} className="text-primary" />
                      <span className="text-xs font-semibold text-fg">
                        Audit & Findings ({findings.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunValidation}
                      disabled={isValidating}
                      className="px-2 py-0.5 rounded bg-primary hover:bg-primary-hover text-white text-[10.5px] font-medium flex items-center gap-1 disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      <RefreshCw size={10} className={isValidating ? 'animate-spin' : ''} />
                      <span>{isValidating ? 'Checking...' : 'Re-Audit'}</span>
                    </button>
                  </div>

                  {findings.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted space-y-1">
                      <CheckCircle2 size={24} className="mx-auto text-ok" />
                      <p>Clean document health: no conflicts or orphan requirements found!</p>
                    </div>
                  ) : (
                    findings.map((f) => {
                      const isConflict = f.severity === 'conflict';
                      return (
                        <div
                          key={f.id}
                          className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                            isConflict
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                              : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
                              {isConflict ? <ShieldAlert size={12} className="text-rose-600" /> : <AlertTriangle size={12} className="text-amber-600" />}
                              <span>{f.finding_type.replace(/_/g, ' ')}</span>
                            </span>
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                              isConflict ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                            }`}>
                              {f.severity}
                            </span>
                          </div>
                          <p className="leading-relaxed text-[11.5px]">{f.description}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 3. PRD to SRS Traceability Matrix */}
                <div className="space-y-2.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between pb-1 border-b border-border text-xs">
                    <span className="font-semibold text-fg flex items-center gap-1.5">
                      <GitBranch size={13} className="text-primary" />
                      Traceability Matrix
                    </span>
                    <span className="text-[10px] font-mono text-muted">{traceabilityMatrix.length} Matched</span>
                  </div>

                  {traceabilityMatrix.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted">
                      No requirement mapping recorded yet.
                    </div>
                  ) : (
                    traceabilityMatrix.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-2.5 bg-surface border border-border rounded-lg shadow-2xs space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-primary">
                            {item.requirement_key}
                          </span>
                          <span className={`text-[9.5px] font-medium px-2 py-0.2 rounded-full ${
                            item.covered_in_srs 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {item.covered_in_srs ? 'Mapped in SRS' : 'Orphan'}
                          </span>
                        </div>
                        <div className="font-medium text-fg text-[11.5px] line-clamp-1">
                          {item.title}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

          {/* Footer Document Stats */}
          <div className="p-2 border-t border-border bg-panel flex items-center justify-between text-xs shrink-0">
            <span className="text-muted text-[11px]">Audit Health:</span>
            <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
              findings.length === 0 ? 'bg-ok-tint text-ok' : 'bg-warn-bg text-warn'
            }`}>
              {findings.length === 0 ? 'CLEAN' : `${findings.length} FINDINGS`}
            </span>
          </div>
        </aside>
        </>
      )}
      </div>

      {/* Project Manager Modal: Open or Create Project (Figma / MQ-Studio Pattern) */}
      {isProjectManagerOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-[14px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-panel">
              <div className="flex items-center gap-2.5">
                <FolderKanban size={20} className="text-primary" />
                <h3 className="font-bold text-base text-fg">
                  Project Manager
                </h3>
              </div>
              <button 
                onClick={() => setIsProjectManagerOpen(false)} 
                className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-fill transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-border px-6 pt-3 gap-6 bg-fill-soft">
              <button
                type="button"
                onClick={() => setProjectManagerTab('open')}
                className={`pb-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  projectManagerTab === 'open'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                <List size={16} />
                <span>Open Existing ({projects.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setProjectManagerTab('create')}
                className={`pb-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                  projectManagerTab === 'create'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                <Plus size={16} />
                <span>Create New Project</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto no-scrollbar flex-1">
              {projectManagerTab === 'open' ? (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Search projects by title or description..."
                      value={projectSearchFilter}
                      onChange={(e) => setProjectSearchFilter(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-fg placeholder:text-muted"
                    />
                  </div>

                  {/* Projects List */}
                  <div className="space-y-2.5 mt-2">
                    {projects.filter(p => {
                      if (!projectSearchFilter.trim()) return true;
                      const q = projectSearchFilter.toLowerCase();
                      return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
                    }).length === 0 ? (
                      <div className="text-center py-12 text-muted text-sm">
                        {projectSearchFilter ? 'No matching projects found.' : 'No projects available yet.'}
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => setProjectManagerTab('create')}
                            className="px-4 py-2 bg-primary-soft text-primary rounded-lg text-xs font-semibold hover:bg-primary-soft/80 transition-colors"
                          >
                            + Create First Project
                          </button>
                        </div>
                      </div>
                    ) : (
                      projects.filter(p => {
                        if (!projectSearchFilter.trim()) return true;
                        const q = projectSearchFilter.toLowerCase();
                        return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
                      }).map((p) => {
                        const isOpen = openProjectIds.includes(p.id);
                        const isCurrent = activeProject?.id === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleOpenProjectInTab(p)}
                            className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isCurrent
                                ? 'bg-primary-soft/40 border-primary shadow-2xs'
                                : 'bg-surface border-border hover:border-border-soft hover:bg-fill-mute/50'
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2.5">
                                <span className="font-bold text-sm text-fg truncate">
                                  {p.name}
                                </span>
                                {isOpen && (
                                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-ok-tint text-ok font-semibold">
                                    Tab Open
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary-soft text-primary font-semibold">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted truncate mt-1 leading-relaxed">
                                {p.description || 'No description provided.'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProjectInTab(p);
                                }}
                                className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(p.id, p.name);
                                }}
                                className="p-1.5 text-muted hover:text-err rounded-lg hover:bg-fill transition-colors"
                                title="Delete project"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Create Project Form */
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-fg mb-1.5">
                      Project Title <span className="text-err">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Next-Gen Inventory Hub"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-fg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-fg mb-1.5">
                      Description / Target Scope
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Briefly state target scope, problem statement or initial goals..."
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-fg"
                    />
                  </div>
                  <div className="flex justify-end gap-2.5 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsProjectManagerOpen(false)}
                      className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-fill transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                    >
                      Create & Open Tab
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal (FR-002, SYS-PROJ-003) */}
      {showEditProjectModal && activeProject && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-[10px] p-5 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-semibold text-sm text-fg">Edit Project Metadata</h3>
              <button onClick={() => setShowEditProjectModal(false)} className="text-muted hover:text-fg">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleUpdateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">Project Name</label>
                <input 
                  type="text"
                  required
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-surface text-fg placeholder:text-muted outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">Project Description</label>
                <textarea 
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  rows={2}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-surface text-fg placeholder:text-muted outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">Project Status</label>
                <select
                  value={editProjectStatus}
                  onChange={(e) => setEditProjectStatus(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-surface text-fg outline-none focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditProjectModal(false)} className="px-3.5 py-1.5 text-xs text-muted hover:text-fg hover:bg-fill rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary hover:bg-primary-hover text-white shadow-2xs">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Settings & System Diagnostics Modal (Two-Pane Master-Detail) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-4">
          <div className="bg-surface border border-border rounded-[14px] w-[920px] max-w-[94vw] h-[640px] max-h-[88vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            
            {/* 1. Modal Header Bar (h-14 / 56px) */}
            <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface">
              <div className="flex items-center gap-2.5">
                <SpecraIcon size={20} />
                <SpecraWordmark height={16} className="text-fg" />
                <span className="text-muted text-sm font-medium">Settings</span>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="w-8 h-8 flex items-center justify-center text-muted hover:text-fg hover:bg-fill rounded-md transition-colors"
                title="Close (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* 2. Two-Pane Split Container */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left Pane: Master Sidebar Navigation (w-60 / 240px) */}
              <aside className="w-60 shrink-0 bg-panel/75 border-r border-border p-3 flex flex-col justify-between overflow-y-auto select-none">
                <nav className="space-y-1">
                  {[
                    { id: 'general', label: 'General & Appearance', icon: Sliders },
                    { id: 'personas', label: 'Specialist Personas', icon: Sparkles },
                    { id: 'mcp', label: 'MCP Connections', icon: Database, badge: mcpList.length },
                    { id: 'providers', label: 'Coding Agents & LLM', icon: Bot },
                    { id: 'tokens', label: 'Token Telemetry', icon: BarChart2 },
                    { id: 'diagnostics', label: 'Diagnostics & Security', icon: Activity },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = settingsTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setSettingsTab(tab.id as any);
                          if (tab.id === 'general') loadGeneralSettings();
                          if (tab.id === 'personas' || tab.id === 'mcp') loadAgentsAndMCP();
                          if (tab.id === 'tokens') loadTokenUsage();
                        }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all w-full text-left ${
                          isActive
                            ? 'bg-surface text-primary font-semibold shadow-2xs border border-border'
                            : 'text-fg-2 hover:bg-fill hover:text-fg font-medium'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-primary' : 'text-muted'} />
                        <span className="truncate">{tab.label}</span>
                        {tab.badge !== undefined && (
                          <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-mono ${
                            isActive ? 'bg-primary-soft text-primary font-bold' : 'bg-fill text-muted'
                          }`}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
                <div className="pt-3 border-t border-border/60 text-[11px] text-muted-2 px-2">
                  Studio Engine v1.2 • Local-First
                </div>
              </aside>

              {/* Right Pane: Detail Content Sheet */}
              <main className="flex-1 min-w-0 overflow-y-auto p-6 space-y-6 bg-surface">

            {/* TAB -1: GENERAL & APPEARANCE SETTINGS */}
            {settingsTab === 'general' && (
              <div className="space-y-6 text-[13px]">
                <div>
                  <h4 className="text-lg font-semibold text-fg">General & Appearance</h4>
                  <p className="text-xs text-muted mt-0.5">
                    Manage color themes, system font scaling, workspace directories, and AI document output preferences.
                  </p>
                </div>

                {generalSaveSuccess && (
                  <div className="p-3 bg-ok-tint border border-ok/30 rounded-lg text-ok flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} />
                    <span>{generalSaveSuccess}</span>
                  </div>
                )}

                {/* 1. Appearance, Theme & UI Scale */}
                <div className="p-4 bg-fill-soft rounded-xl border border-border space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-fg flex items-center gap-2">
                      <Sun size={16} className="text-primary" />
                      Appearance & Interface Scaling
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Customize interface color theme and display scaling ratio for standard monitors and HiDPI screens.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Theme Select Dropdown */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-fg">
                        Color Theme (Tema Warna)
                      </label>
                      <select
                        value={themeMode}
                        onChange={(e) => {
                          const nextTheme = e.target.value as 'light' | 'dark' | 'system';
                          applyTheme(nextTheme);
                          setGeneralSettings(prev => ({ ...prev, theme: nextTheme }));
                        }}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-hidden focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="light">Light (Warm Stone) — Palet terang alami</option>
                        <option value="dark">Dark (Obsidian Slate) — Kontras tajam & anti-silau</option>
                        <option value="system">System / Auto — Ikuti preferensi OS</option>
                      </select>
                      <p className="text-[11px] text-muted leading-relaxed">
                        {themeMode === 'light' && 'Palet batu hangat cerah, optimal untuk siang hari.'}
                        {themeMode === 'dark' && 'Kontras tinggi WCAG AAA untuk fokus sesi coding malam.'}
                        {themeMode === 'system' && 'Menyelaraskan tema secara dinamis dengan sistem operasi.'}
                      </p>
                    </div>

                    {/* UI Scale / Zoom Dropdown */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-fg">
                          UI Scale & HiDPI Zoom
                        </label>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-primary-soft text-primary">
                          {fontScale === 'auto' ? 'Auto HiDPI' : `${fontScale}%`}
                        </span>
                      </div>
                      <select
                        value={fontScale}
                        onChange={(e) => {
                          const nextScale = e.target.value;
                          applyFontScale(nextScale);
                          setGeneralSettings(prev => ({ ...prev, font_size: nextScale }));
                        }}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-fg focus:outline-hidden focus:border-primary transition-colors cursor-pointer"
                      >
                        {SCALE_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-muted leading-relaxed">
                        {SCALE_OPTIONS.find(o => o.id === fontScale)?.desc || 'Pintasan cepat zoom: Ctrl + / Ctrl - / Ctrl 0'}
                      </p>
                    </div>
                  </div>

                  {/* Animation Toggle */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-fg">Smooth Motion & Animations</span>
                      <p className="text-[11.5px] text-muted">Aktifkan animasi transisi halus pada modal, tab bar, dan chat bubbles.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generalSettings.animations}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, animations: e.target.checked }))}
                        className="rounded border-border text-primary focus:ring-0"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Workspace & Storage Integration */}
                <div className="p-4 bg-fill-soft rounded-xl border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-fg flex items-center gap-2">
                        <FolderOpen size={16} className="text-primary" />
                        Workspace & Local Storage (Penyimpanan Lokal)
                      </h4>
                      <p className="text-xs text-muted mt-0.5">
                        PRD, SRS, Architecture, and Design System documents are stored securely in your computer's local directory.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenWorkspaceFolder}
                      className="px-3.5 py-1.5 bg-surface hover:bg-fill border border-border rounded-lg text-xs font-medium text-fg flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="Buka direktori penyimpanan di Windows Explorer"
                    >
                      <FolderOpen size={13} className="text-primary" />
                      <span>Buka di File Explorer</span>
                    </button>
                  </div>

                  <div className="p-2.5 bg-surface rounded-lg border border-border flex items-center justify-between font-mono text-xs">
                    <span className="text-muted truncate max-w-xl">
                      Path: {generalSettings.workspace_path || '~/AI-Requirements-Studio'}
                    </span>
                    <span className="text-[11px] font-semibold text-ok bg-ok-tint px-2 py-0.5 rounded">
                      Local-First Encrypted
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-fg">Auto-Save Draft Documents</span>
                      <p className="text-[11.5px] text-muted">Automatically saves draft text changes as you edit PRD/SRS documents.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={generalSettings.auto_save_draft}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, auto_save_draft: e.target.checked }))}
                      className="rounded border-border text-primary focus:ring-0"
                    />
                  </div>
                </div>

                {/* 3. AI Document Generation Preferences */}
                <div className="p-4 bg-fill-soft rounded-xl border border-border space-y-3.5">
                  <div>
                    <h4 className="font-semibold text-sm text-fg flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" />
                      AI Generation & Language Preferences
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Atur preferensi bahasa obrolan saat discovery dan bahasa penulisan dokumen spesifikasi formal (PRD, SRS, Arsitektur, Desain).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Track 1: Chat Language */}
                    <div className="space-y-1">
                      <label className="block font-semibold text-xs text-fg">
                        Chat & Discovery Language
                      </label>
                      <select
                        value={generalSettings.chat_language || 'id'}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, chat_language: e.target.value }))}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                      >
                        <option value="id">Bahasa Indonesia (Alami, Ramah & Jelas)</option>
                        <option value="en">English (Global Standard / Clear)</option>
                        <option value="auto">Auto / Adaptif (Ikuti Bahasa Pengguna)</option>
                      </select>
                      <p className="text-[11px] text-muted">
                        Bahasa interaksi saat mengobrol, brainstorming, dan tanya jawab klarifikasi dengan 4 Specialist Agents.
                      </p>
                    </div>

                    {/* Track 2: Document Language */}
                    <div className="space-y-1">
                      <label className="block font-semibold text-xs text-fg">
                        Document Specification Output Language
                      </label>
                      <select
                        value={generalSettings.doc_language || 'en'}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, doc_language: e.target.value, language: e.target.value }))}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                      >
                        <option value="en">English (IEEE 830 / ISO Standard) — Rekomendasi Global</option>
                        <option value="id">Bahasa Indonesia Teknis Formal (Standar Industri)</option>
                        <option value="auto">Samakan dengan Bahasa Obrolan (Auto)</option>
                      </select>
                      <p className="text-[11px] text-muted">
                        Bahasa penulisan formal untuk dokumen PRD (20 bab), SRS (22 bab), Arsitektur, dan Design System.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60">
                    <div className="max-w-md space-y-1">
                      <label className="block font-semibold text-xs text-fg">
                        Document Template Depth
                      </label>
                      <select
                        value={generalSettings.default_doc_depth}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, default_doc_depth: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                      >
                        <option value="standard">Enterprise Comprehensive (20+ Sections Lengkap & Mendalam)</option>
                        <option value="compact">Rapid Agile / Sprint Lite (Ringkas & Cepat)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-fg">Proactive Requirement Clarification</span>
                      <p className="text-[11.5px] text-muted">Specialist agents automatically detect ambiguities and ask clarification questions.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={generalSettings.proactive_clarification}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, proactive_clarification: e.target.checked }))}
                      className="rounded border-border text-primary focus:ring-0"
                    />
                  </div>
                </div>

                {/* 4. Desktop Notifications */}
                <div className="p-4 bg-fill-soft rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-xs text-fg">Desktop Notifications</span>
                    <p className="text-[11.5px] text-muted">Notify via desktop system notifications when long background AI document generations complete.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalSettings.desktop_notifications}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, desktop_notifications: e.target.checked }))}
                    className="rounded border-border text-primary focus:ring-0"
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveGeneralSettings}
                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
                  >
                    <Save size={14} />
                    <span>Save General Settings</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 0: SPECIALIST PERSONAS & SKILLS */}
            {settingsTab === 'personas' && (
              <div className="space-y-6 text-xs">
                <div>
                  <h4 className="text-lg font-semibold text-fg">Specialist Personas & Skills</h4>
                  <p className="text-xs text-muted mt-0.5">
                    Configure prompts for the 4 specialist requirements engineering agents and manage custom prompt directive libraries.
                  </p>
                </div>
                {agentSaveSuccess && (
                  <div className="p-3.5 bg-ok-tint border border-ok/30 rounded-xl text-ok flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} />
                    <span>{agentSaveSuccess}</span>
                  </div>
                )}
                {skillSaveSuccess && (
                  <div className="p-3.5 bg-ok-tint border border-ok/30 rounded-xl text-ok flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} />
                    <span>{skillSaveSuccess}</span>
                  </div>
                )}

                {/* Personas & Skill Library Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-fill-soft rounded-xl border border-border">
                  <div>
                    <h4 className="font-bold text-sm text-fg flex items-center gap-2">
                      <Sparkles size={16} className="text-primary" />
                      Specialist Personas & Custom Skills Library
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Manage the 4 specialist AI personas and create custom skills to equip specific agents.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewSkillModalOpen(true)}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Plus size={14} />
                    <span>+ Create Custom Skill</span>
                  </button>
                </div>

                {/* 4 Agent Selection Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {specialistAgents.map((ag) => {
                    const isSelected = selectedAgentId === ag.id;
                    const AgIcon = ag.icon;
                    return (
                      <div
                        key={ag.id}
                        onClick={() => {
                          setSelectedAgentId(ag.id);
                          const cfg = agentsList.find(a => a.id === ag.id);
                          if (cfg) setEditingPrompt(cfg.system_prompt);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-primary-soft/40 border-primary shadow-2xs'
                            : 'bg-surface border-border hover:border-border-soft hover:bg-fill-mute/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <AgIcon size={18} className={isSelected ? 'text-primary' : 'text-muted'} />
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-fill text-fg-2 font-semibold">
                            {ag.docFocus}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-fg truncate">
                          {ag.name}
                        </h4>
                        <p className="text-xs text-muted truncate mt-0.5">
                          {ag.role}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Agent Editor Panel */}
                {(() => {
                  const currentAgent = agentsList.find(a => a.id === selectedAgentId) || {
                    id: selectedAgentId,
                    name: currentSpecialist.name,
                    role: currentSpecialist.role,
                    system_prompt: editingPrompt,
                    skills: [],
                    mcp_servers: []
                  };

                  const currentSkills = currentAgent.skills || [];

                  // MCP tools connected to this persona (global or assigned)
                  const agentMCPs = mcpList.filter(s => {
                    if (!s.scope || s.scope === 'global') return true;
                    return s.assigned_agents && s.assigned_agents.includes(currentAgent.id);
                  });

                  return (
                    <div className="p-5 bg-fill-soft rounded-xl border border-border space-y-5">
                      <div className="flex items-center justify-between border-b border-border pb-3.5">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h4 className="font-bold text-base text-fg">
                              {currentAgent.name}
                            </h4>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary-soft text-primary font-bold">
                              ID: {currentAgent.id}
                            </span>
                          </div>
                          <p className="text-xs text-muted mt-1">
                            Role Focus: <span className="text-fg font-medium">{currentAgent.role}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSaveAgentConfig(currentAgent as AgentConfig)}
                          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
                        >
                          <Save size={14} />
                          <span>Save Persona</span>
                        </button>
                      </div>

                      {/* System Prompt Textarea */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-fg">
                            System Persona Prompt (Behavior, Standard, & Directive)
                          </label>
                          <span className="text-[11px] text-muted font-mono">
                            Disesuaikan untuk {currentAgent.name}
                          </span>
                        </div>
                        <textarea
                          rows={6}
                          value={editingPrompt}
                          onChange={(e) => setEditingPrompt(e.target.value)}
                          placeholder="Instruksi sistem persona spesialis..."
                          className="w-full p-3.5 bg-surface border border-border rounded-xl text-xs font-mono leading-relaxed outline-none focus:border-primary text-fg"
                        />
                      </div>

                      {/* Skills Library for this Persona (Active Skills Only + Add Skill Dropdown) */}
                      {(() => {
                        const activeSkillsList = currentSkills.map(sId => 
                          skillsCatalog.find(sk => sk.id === sId || sk.name === sId) || {
                            id: sId,
                            name: sId,
                            category: 'general',
                            description: 'Active specialized prompt directive',
                            prompt: '',
                            custom: false
                          }
                        );
                        const unattachedSkills = skillsCatalog.filter(
                          sk => !currentSkills.includes(sk.id) && !currentSkills.includes(sk.name)
                        );

                        return (
                          <div className="pt-2 border-t border-border space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <label className="block text-xs font-bold text-fg flex items-center gap-1.5">
                                  <Sparkles size={14} className="text-primary" />
                                  Specialized Skills ({currentSkills.length} Active for {currentAgent.name})
                                </label>
                                <p className="text-[11.5px] text-muted">
                                  Framework metodologi dan prompt directives yang diinjeksikan langsung saat berkonsultasi dengan persona ini.
                                </p>
                              </div>

                              {/* Dropdown "+ Add Skill to Persona" */}
                              <div className="relative" ref={addSkillDropdownRef}>
                                <button
                                  type="button"
                                  onClick={() => setShowAddSkillDropdown(!showAddSkillDropdown)}
                                  className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors shrink-0"
                                >
                                  <Plus size={13} />
                                  <span>+ Add Skill</span>
                                  <ChevronDown size={13} />
                                </button>

                                {showAddSkillDropdown && (
                                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-surface border border-border rounded-xl shadow-xl p-1.5 z-40 max-h-72 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center justify-between">
                                      <span>Katalog Skill Tersedia</span>
                                      <span>{unattachedSkills.length} Opsi</span>
                                    </div>

                                    {unattachedSkills.length === 0 ? (
                                      <div className="px-3 py-4 text-center text-xs text-muted">
                                        All skills in the catalog are already equipped on this persona!
                                      </div>
                                    ) : (
                                      unattachedSkills.map((sk) => (
                                        <button
                                          key={sk.id}
                                          type="button"
                                          onClick={() => {
                                            handleToggleAgentSkill(currentAgent as AgentConfig, sk.id);
                                            setShowAddSkillDropdown(false);
                                          }}
                                          className="w-full text-left p-2 rounded-lg hover:bg-fill transition-colors flex flex-col gap-0.5 group"
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="font-semibold text-xs text-fg group-hover:text-primary transition-colors truncate">
                                              {sk.name}
                                            </span>
                                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase shrink-0 font-medium">
                                              {sk.category || 'general'}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-muted leading-tight line-clamp-1">
                                            {sk.description || 'No description available.'}
                                          </p>
                                        </button>
                                      ))
                                    )}

                                    <div className="pt-1.5 border-t border-border mt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAddSkillDropdown(false);
                                          setIsNewSkillModalOpen(true);
                                        }}
                                        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary-soft/60 flex items-center justify-center gap-1.5 transition-colors"
                                      >
                                        <Plus size={13} />
                                        <span>+ Create New Custom Skill...</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Active Skills List */}
                            {activeSkillsList.length === 0 ? (
                              <div className="text-center py-6 px-4 text-muted text-xs border border-dashed border-border rounded-xl bg-surface/40 space-y-1.5">
                                <Sparkles size={20} className="mx-auto text-muted/60" />
                                <p className="font-medium text-fg">No Active Skills</p>
                                <p className="text-[11.5px] max-w-sm mx-auto">
                                  This persona has no assigned skills yet. Click <strong>+ Add Skill</strong> above to equip skills from the catalog.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {activeSkillsList.map((sk) => (
                                  <div
                                    key={sk.id}
                                    className="p-3 bg-surface border border-border hover:border-border-soft rounded-xl shadow-2xs flex flex-col justify-between space-y-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-xs text-fg">{sk.name}</span>
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase font-medium">
                                          {sk.category || 'general'}
                                        </span>
                                        {sk.custom && (
                                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-tone-violet-bg text-tone-violet border border-tone-violet/30 font-semibold">
                                            Custom
                                          </span>
                                        )}
                                      </div>
                                      
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAgentSkill(currentAgent as AgentConfig, sk.id)}
                                        title="Lepas skill dari persona ini"
                                        className="p-1 rounded-md text-muted hover:text-err hover:bg-fill transition-colors shrink-0"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>

                                    <p className="text-[11.5px] text-muted leading-relaxed line-clamp-2">
                                      {sk.description || 'No description available.'}
                                    </p>
                                    
                                    {sk.prompt && (
                                      <div className="text-[10.5px] font-mono text-fg-2 bg-fill/60 p-1.5 rounded border border-border/60 truncate">
                                        Directive: {sk.prompt}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Connected MCP Tools for this Persona */}
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <label className="block text-xs font-bold text-fg flex items-center gap-1.5">
                              <Database size={14} className="text-primary" />
                              Connected MCP Tools for {currentAgent.name} ({agentMCPs.length})
                            </label>
                            <p className="text-[11.5px] text-muted">
                              Tool konteks eksternal (Global MCP atau yang di-assign khusus) yang dapat diakses oleh persona ini.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {agentMCPs.length === 0 ? (
                            <div className="col-span-2 text-center py-4 text-muted text-xs border border-dashed border-border rounded-xl">
                              No MCP tools connected to this persona yet. Configure them in the MCP Connections tab.
                            </div>
                          ) : (
                            agentMCPs.map((mcp) => {
                              const isGlobal = !mcp.scope || mcp.scope === 'global';
                              return (
                                <div key={mcp.id} className="p-3 bg-surface border border-border rounded-xl flex items-center justify-between">
                                  <div className="space-y-0.5 min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs text-fg truncate">{mcp.name}</span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase">
                                        {mcp.transport}
                                      </span>
                                    </div>
                                    <div className="font-mono text-[11px] text-muted truncate">
                                      {mcp.endpoint}
                                    </div>
                                  </div>
                                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                                    isGlobal ? 'bg-tone-blue-bg text-tone-blue border border-tone-blue/30' : 'bg-tone-violet-bg text-tone-violet border border-tone-violet/30'
                                  }`}>
                                    {isGlobal ? 'Global' : 'Persona-Spesifik'}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Custom Skills Repository (if any custom skills exist) */}
                      {skillsCatalog.some(s => s.custom) && (
                        <div className="pt-2 border-t border-border">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <label className="block text-xs font-bold text-fg flex items-center gap-1.5">
                                <Sparkles size={14} className="text-tone-violet" />
                                Custom Skills Repository ({skillsCatalog.filter(s => s.custom).length})
                              </label>
                              <p className="text-[11.5px] text-muted">
                                Custom skills you create. Can be equipped to any persona via the <strong>+ Add Skill</strong> menu above.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {skillsCatalog.filter(s => s.custom).map((csk) => (
                              <div key={csk.id} className="p-3 bg-surface border border-tone-violet/30 rounded-xl flex items-center justify-between">
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-fg truncate">{csk.name}</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase">
                                      {csk.category}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-muted truncate">{csk.description}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomSkill(csk.id, csk.name)}
                                  className="p-1.5 text-muted hover:text-err rounded-md hover:bg-fill transition-colors shrink-0"
                                  title="Delete custom skill permanently"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Create Custom Skill Modal Dialog */}
                {isNewSkillModalOpen && (
                  <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-60 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-[14px] p-6 w-full max-w-xl shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={18} className="text-primary" />
                          <h4 className="font-bold text-sm text-fg">Create New Custom Skill</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsNewSkillModalOpen(false)}
                          className="p-1 rounded-md text-muted hover:text-fg hover:bg-fill"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <form onSubmit={handleCreateCustomSkill} className="space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-fg mb-1">
                              Skill Name <span className="text-err">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Fintech OJK Compliance"
                              value={newSkillName}
                              onChange={(e) => setNewSkillName(e.target.value)}
                              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-fg mb-1">
                              Category
                            </label>
                            <select
                              value={newSkillCategory}
                              onChange={(e) => setNewSkillCategory(e.target.value as any)}
                              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                            >
                              <option value="general">General / Cross-Cutting</option>
                              <option value="product">Product Strategy & Business</option>
                              <option value="system">System & Functional Analysis</option>
                              <option value="architecture">Software Architecture & Cloud</option>
                              <option value="uiux">UI/UX & Design Systems</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-fg mb-1">
                            Skill ID (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. fintech-compliance"
                            value={newSkillId}
                            onChange={(e) => setNewSkillId(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-mono text-fg focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-fg mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            placeholder="Summary of this skill's capabilities..."
                            value={newSkillDesc}
                            onChange={(e) => setNewSkillDesc(e.target.value)}
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-fg mb-1">
                            Prompt Directive (Instruksi yang ditanamkan ke AI) <span className="text-err">*</span>
                          </label>
                          <textarea
                            rows={4}
                            required
                            placeholder="Enter AI prompt directives, compliance standards, or architecture constraints..."
                            value={newSkillPrompt}
                            onChange={(e) => setNewSkillPrompt(e.target.value)}
                            className="w-full p-3 bg-surface border border-border rounded-lg text-xs font-mono text-fg focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="flex justify-end gap-2.5 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsNewSkillModalOpen(false)}
                            className="px-4 py-2 border border-border rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-fill transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                          >
                            Save Custom Skill
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 0.5: MCP CONNECTIONS MANAGER */}
            {settingsTab === 'mcp' && (
              <div className="space-y-6 text-xs">
                <div>
                  <h4 className="text-lg font-semibold text-fg">Model Context Protocol (MCP)</h4>
                  <p className="text-xs text-muted mt-0.5">
                    Hubungkan eksternal tool & context providers dengan scoping Global atau spesifik per persona spesialis.
                  </p>
                </div>
                {mcpSaveSuccess && (
                  <div className="p-3.5 bg-ok-tint border border-ok/30 rounded-xl text-ok flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} />
                    <span>{mcpSaveSuccess}</span>
                  </div>
                )}

                {/* List Connected MCP Servers */}
                <div className="p-5 bg-fill-soft rounded-xl border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-fg flex items-center gap-2">
                        <Database size={16} className="text-primary" />
                        Connected MCP (Model Context Protocol) Servers
                      </h4>
                      <p className="text-xs text-muted mt-0.5">
                        Koneksi tools dan konteks eksternal (Figma, GitHub, Database, Jira) berbasis standar MCP dengan scoping Global atau Persona-Spesifik.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 mt-2">
                    {mcpList.length === 0 ? (
                      <div className="text-center py-8 text-muted text-xs border border-dashed border-border rounded-xl">
                        No MCP Servers registered yet. Register a stdio or sse server in the form below.
                      </div>
                    ) : (
                      mcpList.map((srv) => {
                        const isGlobal = !srv.scope || srv.scope === 'global';
                        return (
                          <div
                            key={srv.id}
                            className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-fg">{srv.name}</span>
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-fill text-muted uppercase font-medium">
                                  {srv.transport}
                                </span>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                                  srv.enabled ? 'bg-ok-tint text-ok' : 'bg-fill text-muted'
                                }`}>
                                  {srv.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                                {isGlobal ? (
                                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-tone-blue-bg text-tone-blue border border-tone-blue/30 font-semibold flex items-center gap-1">
                                    <Globe size={11} /> Global (All Personas)
                                  </span>
                                ) : (
                                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-tone-violet-bg text-tone-violet border border-tone-violet/30 font-semibold flex items-center gap-1">
                                    <Layers size={11} /> Persona: {(srv.assigned_agents || []).map(id => specialistAgents.find(a => a.id === id)?.name || id).join(', ')}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs text-muted truncate max-w-xl">
                                {srv.endpoint}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMCPServer(srv.id)}
                              className="p-1.5 text-muted hover:text-err rounded-lg hover:bg-fill transition-colors"
                              title="Delete MCP Server"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Add New MCP Server Form */}
                <form onSubmit={handleAddMCPServer} className="p-5 bg-fill-soft rounded-xl border border-border space-y-4">
                  <h4 className="font-bold text-sm text-fg flex items-center gap-2">
                    <Plus size={16} className="text-primary" />
                    Register New MCP Server with Persona Scoping
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">
                        Server Name <span className="text-err">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Figma Tokens MCP"
                        value={newMcpName}
                        onChange={(e) => setNewMcpName(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">
                        Transport Protocol
                      </label>
                      <select
                        value={newMcpTransport}
                        onChange={(e) => setNewMcpTransport(e.target.value as 'stdio' | 'sse')}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                      >
                        <option value="stdio">stdio (Local Subprocess / npx / binary)</option>
                        <option value="sse">sse (Server-Sent Events HTTP Endpoint)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-fg mb-1">
                        Server ID (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. mcp-figma"
                        value={newMcpId}
                        onChange={(e) => setNewMcpId(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-fg mb-1">
                      Endpoint Command or URL <span className="text-err">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. npx -y @modelcontextprotocol/server-figma OR http://localhost:8080/sse"
                      value={newMcpEndpoint}
                      onChange={(e) => setNewMcpEndpoint(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-xs font-mono text-fg focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* MCP Scoping Controls */}
                  <div className="p-3.5 bg-surface border border-border rounded-xl space-y-3">
                    <label className="block text-xs font-bold text-fg">
                      MCP Tool Scope (Cakupan Persona)
                    </label>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mcpScope"
                          value="global"
                          checked={newMcpScope === 'global'}
                          onChange={() => setNewMcpScope('global')}
                          className="text-primary focus:ring-0"
                        />
                        <span className="text-xs text-fg font-medium flex items-center gap-1.5">
                          <Globe size={13} className="text-primary" />
                          Global (All Specialist Personas)
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="mcpScope"
                          value="persona"
                          checked={newMcpScope === 'persona'}
                          onChange={() => setNewMcpScope('persona')}
                          className="text-primary focus:ring-0"
                        />
                        <span className="text-xs text-fg font-medium flex items-center gap-1.5">
                          <Layers size={13} className="text-primary" />
                          Persona-Specific (Select Specific Personas)
                        </span>
                      </label>
                    </div>

                    {newMcpScope === 'persona' && (
                      <div className="pt-2 border-t border-border mt-2 space-y-1.5">
                        <span className="text-[11.5px] font-medium text-muted block mb-1">
                          Centang persona yang berhak mengakses MCP server ini:
                        </span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {specialistAgents.map((ag) => {
                            const isChecked = newMcpAssignedAgents.includes(ag.id);
                            return (
                              <label
                                key={ag.id}
                                className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-primary-soft/40 border-primary text-fg'
                                    : 'bg-fill-soft border-border text-muted hover:text-fg'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewMcpAssignedAgents(prev => [...prev, ag.id]);
                                    } else {
                                      setNewMcpAssignedAgents(prev => prev.filter(id => id !== ag.id));
                                    }
                                  }}
                                  className="rounded border-border text-primary focus:ring-0"
                                />
                                <span className="font-semibold text-xs">{ag.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Register MCP Server</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 1: CODING AGENTS & PROVIDERS */}
            {settingsTab === 'providers' && (
              <div className="space-y-6 text-xs">
                <div>
                  <h4 className="text-lg font-semibold text-fg">Coding Agents & AI Providers</h4>
                  <p className="text-xs text-muted mt-0.5">
                    Select primary AI execution engine (Antigravity CLI, OpenCode, or Gemini REST API) with Zero-Mock policy.
                  </p>
                </div>
                {/* 1.1 Device Agent Detection Section */}
                <div className="p-3.5 bg-fill-soft rounded-lg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-fg flex items-center gap-1.5">
                        <Cpu size={14} className="text-primary" />
                        Device Installed Coding Agents
                      </h4>
                      <p className="text-[11px] text-muted">
                        Pindai biner coding agent (Antigravity CLI, OpenCode, Claude, Ollama) di komputer lokal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDetectAgents(false)}
                      disabled={isDetectingAgents}
                      className="px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0 shadow-2xs"
                    >
                      {isDetectingAgents ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                      <span>Detect Installed Coding Agents</span>
                    </button>
                  </div>

                  {/* Detected Agents Cards */}
                  {detectedAgents.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      {detectedAgents.map((agent) => (
                        <div 
                          key={agent.id}
                          className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all ${
                            agent.installed 
                              ? 'bg-surface border-ok/40 shadow-2xs'
                              : 'bg-fill/60 border-border opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-fg">
                              {agent.name}
                            </span>
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              agent.installed 
                                ? 'bg-ok-tint text-ok' 
                                : 'bg-fill text-muted'
                            }`}>
                              {agent.installed ? agent.version : 'Not Installed'}
                            </span>
                          </div>

                          {agent.installed && (
                            <div className="text-[11px] text-muted flex items-center justify-between">
                              <span className="text-ok font-medium flex items-center gap-1">
                                <CheckCircle2 size={11} /> Ready to Execute
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSettingsTab('diagnostics');
                                  handleRunDiagnostics();
                                }}
                                className="text-[11px] text-muted hover:text-primary hover:underline flex items-center gap-1 transition-colors"
                                title="Lihat detail lokasi biner dan diagnostik sistem"
                              >
                                <Activity size={11} />
                                <span>Info Diagnostik</span>
                              </button>
                            </div>
                          )}

                          {agent.installed && agent.available_models && agent.available_models.length > 0 && (
                            <div className="pt-1 border-t border-border/50 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-muted font-medium flex items-center gap-1">
                                  <Bot size={12} className="text-primary" />
                                  Model CLI ({agent.available_models.length} terdeteksi):
                                </span>
                              </div>
                              <select
                                value={agent.selected_model || (agent.id === 'antigravity-cli' ? agyModel : (agent.id === 'opencode' ? opencodeModel : ''))}
                                onChange={(e) => handleAgentModelChange(agent.id, e.target.value)}
                                className="w-full border border-border rounded px-2 py-1 text-xs bg-surface text-fg font-mono outline-none focus:border-primary"
                              >
                                <option value="">(Default CLI Model)</option>
                                {agent.available_models.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.display_name && m.display_name !== m.id ? `${m.display_name} (${m.id})` : m.id}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {agent.installed && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleSelectPrimaryAgent(agent.id)}
                                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                                  primaryProvider === agent.id 
                                    ? 'bg-primary text-white border-primary shadow-2xs font-semibold' 
                                    : 'border-border hover:bg-fill text-muted hover:text-fg'
                                }`}
                              >
                                {primaryProvider === agent.id ? 'Primary Active ✓' : 'Set as Primary'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setFallbackProvider(agent.id); setFallbackEnabled(true); }}
                                className={`px-2.5 py-1 rounded text-xs font-medium border ${
                                  fallbackProvider === agent.id && fallbackEnabled
                                    ? 'bg-primary text-white border-primary' 
                                    : 'border-border hover:bg-fill text-muted hover:text-fg'
                                }`}
                              >
                                {fallbackProvider === agent.id && fallbackEnabled ? 'Fallback Active' : 'Set as Fallback'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 1.2 Primary & Fallback Chaining Selector */}
                <form onSubmit={handleSaveProviderConfig} className="space-y-4">
                  <div className="p-3.5 bg-surface border border-border rounded-lg space-y-3">
                    <h4 className="font-semibold text-fg flex items-center gap-1.5">
                      <Zap size={14} className="text-warn" />
                      Execution & Automatic Fallback Chaining
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted mb-1">
                          Primary AI Provider
                        </label>
                        <select
                          value={primaryProvider}
                          onChange={(e) => setPrimaryProvider(e.target.value)}
                          className="w-full border border-border rounded-md px-3 py-2 text-xs bg-surface text-fg outline-none focus:border-primary"
                        >
                          <option value="antigravity-cli">Google Antigravity CLI (agy)</option>
                          <option value="opencode">OpenCode / OpenAI-Compatible</option>
                          <option value="gemini-direct">Google Gemini (Direct API)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-muted">
                            Fallback AI Provider
                          </label>
                          <label className="flex items-center gap-1 text-[11px] text-primary cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              checked={fallbackEnabled}
                              onChange={(e) => setFallbackEnabled(e.target.checked)}
                              className="rounded"
                            />
                            <span>Enable Fallback</span>
                          </label>
                        </div>
                        <select
                          value={fallbackProvider}
                          onChange={(e) => setFallbackProvider(e.target.value)}
                          disabled={!fallbackEnabled}
                          className="w-full border border-border rounded-md px-3 py-2 text-xs bg-surface text-fg outline-none focus:border-primary disabled:opacity-50"
                        >
                          <option value="opencode">OpenCode / OpenAI-Compatible</option>
                          <option value="antigravity-cli">Google Antigravity CLI (agy)</option>
                          <option value="gemini-direct">Google Gemini (Direct API)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 1.3 Antigravity CLI Specific Config */}
                  <div className="p-3.5 bg-surface border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-fg flex items-center gap-1.5">
                        <Bot size={14} className="text-primary" />
                        Google Antigravity CLI (agy) Configuration
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleRefreshProviderModels('antigravity-cli')}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RefreshCw size={11} /> Refresh Models
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Model Identifier (agy --model)
                        </label>
                        {agyModelsList.length > 0 ? (
                          <select
                            value={agyModel}
                            onChange={(e) => setAgyModel(e.target.value)}
                            className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-surface text-fg outline-none focus:border-primary font-mono"
                          >
                            <option value="">(Default: gemini-3.8-flash-high)</option>
                            {agyModelsList.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.display_name && m.display_name !== m.id ? `${m.display_name} (${m.id})` : m.id}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={agyModel}
                            onChange={(e) => setAgyModel(e.target.value)}
                            placeholder="gemini-3.8-flash-high"
                            className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none focus:border-primary font-mono text-fg"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted mb-1">Status Subproses CLI</label>
                        <div className="text-xs font-mono text-muted py-1.5 flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-ok" />
                          <span>Piped Stdin Safe Execution</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1.4 OpenCode & Local LLM Specific Config */}
                  <div className="p-3.5 bg-surface border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-fg flex items-center gap-1.5">
                        <Terminal size={14} className="text-primary" />
                        OpenCode / OpenAI-Compatible Configuration
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleRefreshProviderModels('opencode')}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RefreshCw size={11} /> Refresh Models
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Base URL (Kosongkan utk CLI)
                        </label>
                        <input
                          type="text"
                          value={opencodeBaseURL}
                          onChange={(e) => setOpencodeBaseURL(e.target.value)}
                          placeholder="http://localhost:11434/v1"
                          className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none focus:border-primary font-mono text-fg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          Model Identifier
                        </label>
                        {opencodeModelsList.length > 0 ? (
                          <select
                            value={opencodeModel}
                            onChange={(e) => setOpencodeModel(e.target.value)}
                            className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-surface text-fg outline-none focus:border-primary font-mono"
                          >
                            <option value="default">default</option>
                            {opencodeModelsList.map((m) => (
                              <option key={m.id} value={m.id}>{m.id}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={opencodeModel}
                            onChange={(e) => setOpencodeModel(e.target.value)}
                            placeholder="default / llama3"
                            className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none focus:border-primary font-mono text-fg"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted mb-1">
                          API Key (Optional)
                        </label>
                        <input
                          type="password"
                          value={opencodeApiKey}
                          onChange={(e) => setOpencodeApiKey(e.target.value)}
                          placeholder="Bearer token jika remote"
                          className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none focus:border-primary text-fg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 1.5 Gemini Direct Config */}
                  <div className="p-3.5 bg-surface border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-fg flex items-center gap-1.5">
                        <Key size={14} className="text-primary" />
                        Google Gemini Direct API Configuration
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleRefreshProviderModels('gemini-direct')}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <RefreshCw size={11} /> Refresh Models
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">Model Resmi Gemini</label>
                        <select
                          value={geminiModel}
                          onChange={(e) => setGeminiModel(e.target.value)}
                          className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-surface text-fg outline-none focus:border-primary font-mono"
                        >
                          {geminiModelsList.length > 0 ? (
                            geminiModelsList.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.display_name && m.display_name !== m.id ? `${m.display_name} (${m.id})` : m.id}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Capable)</option>
                              <option value="gemini-2.5-pro">Gemini 2.5 Pro (State-of-the-art Reasoning)</option>
                              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Long Context)</option>
                              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra Fast)</option>
                            </>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-muted mb-1">API Key (Windows Keyring)</label>
                        <input
                          type="password"
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          placeholder="Masukkan Google AI Studio Key..."
                          className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none focus:border-primary text-fg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {providerSaveSuccess ? (
                      <span className="text-ok font-medium flex items-center gap-1 text-xs">
                        <CheckCircle2 size={13} /> {providerSaveSuccess}
                      </span>
                    ) : <span />}
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white font-medium shadow-2xs transition-colors"
                    >
                      Save AI Provider Configuration
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: TOKEN USAGE & AUDIT LOGS */}
            {settingsTab === 'tokens' && (
              <div className="space-y-6 text-xs">
                <div>
                  <h4 className="text-lg font-semibold text-fg">Token Usage & Telemetry</h4>
                  <p className="text-xs text-muted mt-0.5">
                    Monitor token usage statistics, estimated compute costs, and AI provider request history.
                  </p>
                </div>
                {/* 2.1 Metrics Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-fill-soft border border-border rounded-lg">
                    <span className="text-xs text-muted uppercase font-semibold">Total Requests</span>
                    <div className="text-xl font-bold text-fg font-mono mt-0.5">
                      {tokenSummary ? tokenSummary.total_requests : 0}
                    </div>
                  </div>

                  <div className="p-3 bg-fill-soft border border-border rounded-lg">
                    <span className="text-xs text-muted uppercase font-semibold">Prompt Tokens</span>
                    <div className="text-xl font-bold text-primary font-mono mt-0.5">
                      {tokenSummary ? tokenSummary.total_prompt_tokens.toLocaleString() : 0}
                    </div>
                  </div>

                  <div className="p-3 bg-fill-soft border border-border rounded-lg">
                    <span className="text-xs text-muted uppercase font-semibold">Completion Tokens</span>
                    <div className="text-xl font-bold text-ok font-mono mt-0.5">
                      {tokenSummary ? tokenSummary.total_completion_tokens.toLocaleString() : 0}
                    </div>
                  </div>

                  <div className="p-3 bg-fill-soft border border-border rounded-lg">
                    <span className="text-xs text-muted uppercase font-semibold">Grand Total Tokens</span>
                    <div className="text-xl font-bold text-warn font-mono mt-0.5">
                      {tokenSummary ? tokenSummary.total_tokens.toLocaleString() : 0}
                    </div>
                  </div>
                </div>

                {/* 2.2 Execution Log Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-fg flex items-center gap-1.5">
                      <List size={14} className="text-primary" />
                      Detailed Execution History
                    </h4>
                    <button
                      type="button"
                      onClick={() => loadTokenUsage()}
                      disabled={isLoadingLogs}
                      className="px-2.5 py-1 rounded bg-fill hover:bg-fill-soft text-fg font-medium flex items-center gap-1 transition-colors disabled:opacity-50 text-xs"
                    >
                      <RotateCw size={11} className={isLoadingLogs ? 'animate-spin' : ''} />
                      <span>Refresh Logs</span>
                    </button>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto no-scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-fill-soft text-muted font-semibold border-b border-border">
                            <th className="py-2.5 px-3">Waktu</th>
                            <th className="py-2.5 px-3">Provider</th>
                            <th className="py-2.5 px-3">Task</th>
                            <th className="py-2.5 px-3">Tokens</th>
                            <th className="py-2.5 px-3">Durasi</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {executionLogs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-muted italic">
                                No recorded prompt execution history yet.
                              </td>
                            </tr>
                          ) : (
                            executionLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-fill-mute/40 font-mono">
                                <td className="py-2 px-3 text-muted text-xs">
                                  {log.started_at ? new Date(log.started_at).toLocaleTimeString() : '-'}
                                </td>
                                <td className="py-2 px-3 text-fg font-medium">
                                  {log.provider_id}
                                </td>
                                <td className="py-2 px-3 text-muted">
                                  {log.operation || 'chat'}
                                </td>
                                <td className="py-2 px-3 text-primary font-semibold">
                                  {log.total_tokens || 0}
                                </td>
                                <td className="py-2 px-3 text-muted">
                                  {log.duration_ms} ms
                                </td>
                                <td className="py-2 px-3">
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                    log.status === 'success'
                                      ? 'bg-ok-tint text-ok'
                                      : log.status === 'fallback_success'
                                      ? 'bg-primary-soft text-primary'
                                      : 'bg-err-tint text-err'
                                  }`}>
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DIAGNOSTICS & KEYRING */}
            {settingsTab === 'diagnostics' && (
              <div className="space-y-5 text-[13px]">
                <div>
                  <h4 className="text-lg font-semibold text-fg">Diagnostics & Security</h4>
                  <p className="text-xs text-muted mt-0.5">
                    Validate CLI engine health, benchmark response latency, and manage API key credentials in OS Keyring.
                  </p>
                </div>

                {/* Card 1: Health & Latency Diagnostics */}
                <div className="p-4 bg-fill-soft/50 rounded-xl border border-border space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h5 className="font-semibold text-sm text-fg flex items-center gap-2">
                        <Activity size={16} className="text-primary" />
                        Health & Latency Diagnostics
                      </h5>
                      <p className="text-xs text-muted mt-0.5">
                        Uji validasi ketersediaan Antigravity CLI, OpenCode, status SQLite, dan OS Keyring.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${diagResults ? 'bg-ok' : 'bg-muted-2'}`} />
                      {diagResults && (
                        <button
                          type="button"
                          onClick={handleCopyDiagnostics}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface hover:bg-fill text-fg border border-border flex items-center gap-1.5 transition-colors shadow-2xs"
                          title="Salin ringkasan hasil diagnostik ke clipboard"
                        >
                          <Copy size={13} />
                          <span>Salin Laporan</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRunDiagnostics}
                        disabled={isRunningDiag}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-surface hover:bg-fill text-fg border border-border flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
                      >
                        {isRunningDiag ? <Loader2 size={13} className="animate-spin text-primary" /> : <RefreshCw size={13} />}
                        <span>Jalankan Diagnostik</span>
                      </button>
                    </div>
                  </div>

                  {diagResults ? (
                    <div className="space-y-3">
                      {/* System Overview Matrix */}
                      <div className="p-3.5 bg-surface border border-border/80 rounded-lg text-xs space-y-2 font-mono">
                        <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                          <span className="text-muted">Platform OS / Arch</span>
                          <span className="text-fg font-semibold">{diagResults.os || 'darwin'} / {diagResults.arch || 'arm64'}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                          <span className="text-muted">Diagnostics Duration</span>
                          <span className="text-ok font-bold">{diagResults.duration_ms} ms</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                          <span className="text-muted">OS Keyring Health</span>
                          <span className="text-primary font-semibold">{diagResults.keyring_health}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-muted">Storage Engine</span>
                          <span className="text-fg">{diagResults.storage_strategy}</span>
                        </div>
                      </div>

                      {/* Detected Agent Executable Paths */}
                      <div className="p-3 bg-surface border border-border/80 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-fg">
                          <span className="flex items-center gap-1.5">
                            <Cpu size={13} className="text-primary" />
                            Agent Executable Paths & Binary Resolution
                          </span>
                          <span className="text-[11px] text-muted font-normal">
                            Detail lokasi biner di disk
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {diagResults.agents && Array.isArray(diagResults.agents) && diagResults.agents.length > 0 ? (
                            diagResults.agents.map((ag: any) => (
                              <div key={ag.id} className="p-2 rounded bg-fill-soft/70 border border-border/50 text-xs font-mono flex flex-col gap-0.5">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-fg">{ag.name}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    ag.installed ? 'bg-ok-tint text-ok' : 'bg-fill text-muted'
                                  }`}>
                                    {ag.installed ? `v${ag.version}` : 'Not Detected'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted truncate select-all" title={ag.path || 'Not installed'}>
                                  Path: <span className={ag.path ? 'text-fg-2 font-medium' : 'italic text-muted'}>{ag.path || 'Biner tidak ditemukan pada $PATH'}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="space-y-1 text-xs font-mono">
                              <div className="p-2 rounded bg-fill-soft/70 border border-border/50">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-fg">Antigravity CLI (agy)</span>
                                  <span className={diagResults.cli_available ? 'text-ok font-bold' : 'text-err font-bold'}>
                                    {diagResults.cli_available ? `Found (v${diagResults.cli_version})` : 'Not Detected'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted truncate mt-0.5">
                                  Path: <span className="text-fg-2">{diagResults.cli_path || 'PATH environment'}</span>
                                </div>
                              </div>
                              <div className="p-2 rounded bg-fill-soft/70 border border-border/50">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-fg">OpenCode CLI (opencode)</span>
                                  <span className={diagResults.opencode_available ? 'text-ok font-bold' : 'text-muted font-bold'}>
                                    {diagResults.opencode_available ? `Installed (v${diagResults.opencode_version})` : 'Not Detected'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-muted truncate mt-0.5">
                                  Path: <span className="text-fg-2">{diagResults.opencode_path || 'PATH environment'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Evaluated PATH Directories */}
                      {diagResults.path_directories && Array.isArray(diagResults.path_directories) && diagResults.path_directories.length > 0 && (
                        <div className="p-3 bg-surface border border-border/80 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-fg">
                            <span className="flex items-center gap-1.5">
                              <Terminal size={13} className="text-primary" />
                              System $PATH Directories Evaluated ({diagResults.path_directories.length})
                            </span>
                          </div>
                          <div className="max-h-28 overflow-y-auto font-mono text-[11px] text-muted space-y-0.5 p-2 bg-fill-soft/50 rounded border border-border/40">
                            {diagResults.path_directories.map((dir: string, idx: number) => (
                              <div key={idx} className="truncate select-all hover:text-fg">
                                • {dir}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-surface/60 border border-dashed border-border rounded-lg text-xs text-muted flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-2" />
                      <span>No diagnostic results yet. Click "Jalankan Diagnostik" to validate system performance, executable paths, and environment PATH.</span>
                    </div>
                  )}
                </div>

                {/* Card 2: Secure OS Credential Store (API Key) */}
                <div className="p-4 bg-fill-soft/50 rounded-xl border border-border space-y-3.5">
                  <div>
                    <h5 className="font-semibold text-sm text-fg flex items-center gap-2">
                      <Key size={16} className="text-primary" />
                      Secure OS Credential Store
                    </h5>
                    <p className="text-xs text-muted mt-0.5">
                      Kunci API disimpan terenkripsi di OS Keyring (Apple Keychain / Windows Credential Manager).
                    </p>
                  </div>

                  <form onSubmit={handleSaveApiKey} className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="Enter Google Gemini / OpenCode API Key..."
                          className="w-full border border-border rounded-lg pl-3 pr-10 py-2 text-xs bg-surface font-mono text-fg placeholder:text-muted outline-none focus:border-primary shadow-2xs transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-1 rounded transition-colors"
                          title={showApiKey ? 'Hide Key' : 'Show Key'}
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shrink-0 shadow-2xs transition-colors"
                      >
                        Save to Keyring
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-2">
                      <Lock size={12} className="text-ok shrink-0" />
                      <span>API Key is securely encrypted via OS-level Keyring. Never written to disk or plain SQLite files.</span>
                    </div>

                    {keySaveMsg && (
                      <div className="p-2.5 bg-ok-tint border border-ok/30 rounded-lg text-xs text-ok font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        <span>{keySaveMsg}</span>
                      </div>
                    )}
                  </form>
                </div>

                {/* Card 3: Storage & Environment Info */}
                <div className="p-4 bg-fill-soft/50 rounded-xl border border-border space-y-3">
                  <div>
                    <h5 className="font-semibold text-sm text-fg flex items-center gap-2">
                      <Database size={16} className="text-primary" />
                      Local Storage & Privacy Strategy
                    </h5>
                    <p className="text-xs text-muted mt-0.5">
                      Arsitektur penyimpanan lokal tanpa kebocoran data ke cloud pihak ketiga.
                    </p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 bg-surface border border-border/80 rounded-lg">
                      <span className="text-muted font-medium">SQLite Database</span>
                      <code className="font-mono text-[11px] bg-fill px-2 py-0.5 rounded border border-border/60 text-fg">
                        ModernC Pure-Go SQLite (WAL mode, CGO-free)
                      </code>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2.5 bg-surface border border-border/80 rounded-lg">
                      <span className="text-muted font-medium">Workspace Documents</span>
                      <code className="font-mono text-[11px] bg-fill px-2 py-0.5 rounded border border-border/60 text-fg">
                        ~/AI-Requirements-Studio/projects/{'{id}'}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}

              </main>
            </div>

            {/* 3. Modal Footer Bar (h-14 / 56px) */}
            <div className="h-14 px-6 border-t border-border flex items-center justify-between shrink-0 bg-surface">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Lock size={13} className="text-ok shrink-0" />
                <span className="text-[11.5px]">Kredensial dienkripsi di OS Keyring • Data tersimpan lokal di SQLite</span>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSettingsModal(false)} 
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-fill text-fg hover:bg-fill-mute transition-colors border border-border shadow-2xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global Mouse Dragging Overlay for smooth resizing */}
      {(leftPanel.isDragging || rightPanel.isDragging || centerSplit.isDragging) && (
        <div className="fixed inset-0 select-none z-[9999] cursor-col-resize pointer-events-auto" />
      )}

      {/* Global In-App Toast Notification System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* In-App Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Dedicated In-App Export Modal with Native OS Path Chooser */}
      {activeProject && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          projectId={activeProject.id}
          projectName={activeProject.name}
          currentDocType={
            currentView === 'prd' || currentView === 'srs' || currentView === 'architecture' || currentView === 'design'
              ? currentView
              : 'prd'
          }
          docStatuses={{
            prd: {
              exists: Boolean(prdDetails.current_version),
              version: prdDetails.current_version?.version_number,
              status: prdDetails.document?.status,
            },
            srs: {
              exists: Boolean(srsDetails.current_version),
              version: srsDetails.current_version?.version_number,
              status: srsDetails.document?.status,
            },
            architecture: {
              exists: Boolean(architectureDetails.current_version),
              version: architectureDetails.current_version?.version_number,
              status: architectureDetails.document?.status,
            },
            design: {
              exists: Boolean(designDetails.current_version),
              version: designDetails.current_version?.version_number,
              status: designDetails.document?.status,
            },
          }}
          initialScope={exportInitialScope}
          onExportSuccess={(msg) => notifySuccess('Export Successful', msg)}
          onExportError={(errMsg) => notifyError('Export Failed', errMsg)}
        />
      )}

    </div>
  );
}
