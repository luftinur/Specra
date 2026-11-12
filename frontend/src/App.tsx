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
  CheckCircle,
  FileCode2,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  ShieldAlert,
  Activity,
  Key,
  Database,
  X,
  MoreVertical,
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
  Copy,
  Code
} from 'lucide-react';
import { MarkdownViewer } from './components/MarkdownViewer';
import { SpecraLogo, SpecraIcon, SpecraWordmark } from './components/SpecraBrand';
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
  SkillConfig
} from "../bindings/ai-requirements-studio/internal/domain/models";

export default function App() {
  const [currentView, setCurrentView] = useState<'chat' | 'prd' | 'srs' | 'architecture' | 'design'>('chat');

  // Open Project Tabs (Figma / MQ-Studio Pattern)
  const [openProjectIds, setOpenProjectIds] = useState<string[]>([]);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [projectManagerTab, setProjectManagerTab] = useState<'open' | 'create'>('open');
  const [projectSearchFilter, setProjectSearchFilter] = useState('');

  // Core State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeSession, setActiveSession] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [providerStatus, setProviderStatus] = useState<{ available: boolean; version: string }>({
    available: false,
    version: '...',
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
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [isEditingDoc, setIsEditingDoc] = useState(false);
  const [docEditContent, setDocEditContent] = useState('');
  const [selectedSectionNum, setSelectedSectionNum] = useState<number>(1);
  const [docDisplayMode, setDocDisplayMode] = useState<'preview' | 'source'>('preview');
  const [copiedFullDoc, setCopiedFullDoc] = useState(false);

  // Inspector & Chat UI State
  const [activeTab, setActiveTab] = useState<'requirements' | 'validation' | 'traceability' | 'assumptions' | 'questions'>('requirements');
  const [showInspector, setShowInspector] = useState(true);
  const [showInspectorMenu, setShowInspectorMenu] = useState(false);
  const inspectorMenuRef = useRef<HTMLDivElement | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Close inspector 3-dot dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inspectorMenuRef.current && !inspectorMenuRef.current.contains(event.target as Node)) {
        setShowInspectorMenu(false);
      }
    };
    if (showInspectorMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInspectorMenu]);

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
  const [showModeMenu, setShowModeMenu] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement | null>(null);
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
      if (modeMenuRef.current && !modeMenuRef.current.contains(target)) {
        setShowModeMenu(false);
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
  const [opencodeBaseURL, setOpencodeBaseURL] = useState<string>('');
  const [opencodeModel, setOpencodeModel] = useState<string>('default');
  const [opencodeApiKey, setOpencodeApiKey] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-1.5-pro');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
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
      setGeneralSaveSuccess("Pengaturan umum berhasil disimpan!");
      setTimeout(() => setGeneralSaveSuccess(null), 3000);
    } catch (err: any) {
      alert("Gagal menyimpan pengaturan umum: " + (err?.message || err));
    }
  };

  const handleOpenWorkspaceFolder = async () => {
    try {
      await ProviderService.OpenWorkspaceInExplorer();
    } catch (err: any) {
      alert("Gagal membuka folder workspace: " + (err?.message || err));
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

  // 2. When activeProject changes, load conversation session & all project assets
  useEffect(() => {
    if (activeProject) {
      loadSessionAndData(activeProject.id);
      loadDocumentDetails(activeProject.id);
      loadValidationAndTraceability(activeProject.id);
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
    } catch (err) {
      if (!silent) alert(`Gagal mendeteksi coding agent: ${String(err)}`);
      else console.warn('Silent agent detection error:', err);
    } finally {
      setIsDetectingAgents(false);
    }
  };

  const handleSelectPrimaryAgent = async (agentId: string) => {
    setPrimaryProvider(agentId);
    try {
      await ProviderService.ConfigureProviders(agentId, fallbackProvider, fallbackEnabled);
      setProviderSaveSuccess(`AI Provider diaktifkan: ${agentId}`);
      await loadProviderStatus();
      setTimeout(() => setProviderSaveSuccess(''), 3000);
    } catch (err) {
      alert(`Gagal mengubah AI Provider: ${String(err)}`);
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
        if (res.providers && res.providers[0]) {
          setProviderStatus({
            available: res.providers[0].available,
            version: res.providers[0].version || '1.5.5',
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

  const loadSessionAndData = async (projectId: string) => {
    try {
      const session = await ConversationService.GetSession(projectId);
      setActiveSession(session);
      if (session) {
        const msgs = await ConversationService.ListMessages(session.id);
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

  const loadDocumentDetails = async (projectId: string) => {
    try {
      const prd = await DocumentService.GetDocumentDetails(projectId, 'prd');
      if (prd) {
        setPrdDetails({
          document: prd.document,
          current_version: prd.current_version,
          versions: prd.versions || [],
          sections: prd.sections || [],
        });
      }
      const srs = await DocumentService.GetDocumentDetails(projectId, 'srs');
      if (srs) {
        setSrsDetails({
          document: srs.document,
          current_version: srs.current_version,
          versions: srs.versions || [],
          sections: srs.sections || [],
        });
      }
      const arch = await DocumentService.GetDocumentDetails(projectId, 'architecture');
      if (arch) {
        setArchitectureDetails({
          document: arch.document,
          current_version: arch.current_version,
          versions: arch.versions || [],
          sections: arch.sections || [],
        });
      }
      const design = await DocumentService.GetDocumentDetails(projectId, 'design');
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

  const loadValidationAndTraceability = async (projectId: string) => {
    try {
      const f = await ValidationService.GetLatestFindings(projectId);
      setFindings(f || []);
      const m = await ValidationService.GetTraceabilityMatrix(projectId);
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
      alert(`Gagal validasi: ${String(err)}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleApproveRequirement = async (id: string) => {
    try {
      await RequirementService.ApproveRequirement(id);
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      alert(`Gagal approve requirement: ${String(err)}`);
    }
  };

  const handleRejectRequirement = async (id: string) => {
    try {
      await RequirementService.RejectRequirement(id);
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      alert(`Gagal reject requirement: ${String(err)}`);
    }
  };

  const handleUpdatePriority = async (id: string, priority: string) => {
    try {
      await RequirementService.UpdatePriority(id, priority);
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      alert(`Gagal update priority: ${String(err)}`);
    }
  };

  const handleUpdateAssumptionStatus = async (id: string, status: string) => {
    try {
      await RequirementService.UpdateAssumptionStatus(id, status);
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      alert(`Gagal update assumption: ${String(err)}`);
    }
  };

  const handleAnswerClarification = async (id: string) => {
    const ans = clarificationAnswers[id]?.trim();
    if (!ans) return;
    try {
      await RequirementService.AnswerClarification(id, ans);
      setClarificationAnswers(prev => ({ ...prev, [id]: '' }));
      if (activeProject) await refreshProjectEntities(activeProject.id);
    } catch (err) {
      alert(`Gagal submit jawaban klarifikasi: ${String(err)}`);
    }
  };

  const handleExtractRequirements = async () => {
    if (!activeProject || !activeSession || isExtractingReqs) return;
    setIsExtractingReqs(true);
    try {
      await ConversationService.SendMessageWithAgent(
        activeSession.id,
        activeProject.id,
        "Analisis seluruh brief, dokumen PRD, dan diskusi project yang ada saat ini. Ekstrak seluruh kebutuhan fungsional (FR-xxx) dan non-fungsional ke dalam format JSON requirements terstruktur.",
        activeChatAgent
      );
      const msgs = await ConversationService.ListMessages(activeSession.id);
      setMessages(msgs || []);
      await refreshProjectEntities(activeProject.id);
    } catch (err) {
      alert(`Gagal mengekstrak requirements: ${String(err)}`);
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
      }
    } catch (err) {
      alert(`Error creating project: ${String(err)}`);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (confirm(`Hapus project "${name}" beserta seluruh histori dan requirement-nya?`)) {
      try {
        await ProjectService.DeleteProject(id);
        setOpenProjectIds(prev => prev.filter(pid => pid !== id));
        if (activeProject?.id === id) {
          setActiveProject(null);
        }
        await loadProjects();
      } catch (err) {
        alert(`Error deleting project: ${String(err)}`);
      }
    }
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
      }
    } catch (err) {
      alert(`Gagal update project: ${String(err)}`);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsRunningDiag(true);
    try {
      const res = await ProviderService.RunDiagnostics();
      setDiagResults(res);
    } catch (err) {
      alert(`Gagal menjalankan diagnostik: ${String(err)}`);
    } finally {
      setIsRunningDiag(false);
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    try {
      await ProviderService.StoreAPIKey('gemini', apiKeyInput.trim());
      setKeySaveMsg('API Key berhasil disimpan dengan aman di Windows Credential Manager.');
      setApiKeyInput('');
      setTimeout(() => setKeySaveMsg(''), 4000);
    } catch (err) {
      alert(`Gagal menyimpan key: ${String(err)}`);
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
      if (opencodeBaseURL || opencodeModel !== 'default' || opencodeApiKey) {
        await ProviderService.ConfigureOpenCode(opencodeBaseURL, opencodeModel, opencodeApiKey);
      }
      if (geminiModel || geminiApiKey) {
        await ProviderService.ConfigureGemini(geminiModel, geminiApiKey);
      }
      setProviderSaveSuccess('Konfigurasi AI Provider & Fallback berhasil disimpan!');
      await loadProviderStatus();
      setTimeout(() => setProviderSaveSuccess(''), 4000);
    } catch (err) {
      alert(`Gagal menyimpan konfigurasi: ${String(err)}`);
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
      alert('File size exceeds 2 MB limit');
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
      setIsNewSkillModalOpen(false);
      setTimeout(() => setSkillSaveSuccess(''), 3500);
      await loadSkillsCatalog();
      await loadAgentsAndMCP();
    } catch (err: any) {
      alert(`Failed to save custom skill: ${err?.message || err}`);
    }
  };

  const handleDeleteCustomSkill = async (id: string, name: string) => {
    if (!confirm(`Delete custom skill "${name}"?`)) return;
    try {
      await ProviderService.DeleteSkill(id);
      await loadSkillsCatalog();
      await loadAgentsAndMCP();
    } catch (err: any) {
      alert(`Failed to delete custom skill: ${err?.message || err}`);
    }
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
      setTimeout(() => setAgentSaveSuccess(''), 3000);
      await loadAgentsAndMCP();
    } catch (err) {
      alert(`Failed to save agent persona: ${String(err)}`);
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
      alert(`Failed to toggle skill: ${String(err)}`);
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
      setTimeout(() => setMcpSaveSuccess(''), 3000);
      await loadAgentsAndMCP();
    } catch (err) {
      alert(`Failed to register MCP server: ${String(err)}`);
    }
  };

  const handleDeleteMCPServer = async (id: string) => {
    if (!confirm('Delete this MCP Server connection?')) return;
    try {
      await ProviderService.DeleteMCPServer(id);
      await loadAgentsAndMCP();
    } catch (err) {
      alert(`Failed to delete MCP server: ${String(err)}`);
    }
  };

  // Slash Commands Definitions
  const slashCommands = [
    { cmd: '/discovery', label: 'Discovery Mode', desc: 'Proaktif menggali ide, celah, & ajukan pertanyaan', icon: Search, action: 'discovery' },
    { cmd: '/exec', label: 'Execution Mode', desc: 'Pasif, langsung hasilkan spesifikasi tanpa bertanya', icon: Zap, action: 'execution' },
    { cmd: '/plan', label: 'Create Plan', desc: 'Susun rencana spesifikasi bertahap untuk fitur ini', icon: List, action: 'plan' },
    { cmd: '/clarify', label: 'Force Clarifications', desc: 'Evaluasi celah konteks dan ajukan pertanyaan klarifikasi', icon: HelpCircle, action: 'clarify' },
    { cmd: '/prd', label: 'Generate PRD', desc: 'Buat atau update draft dokumen PRD (20 Sections)', icon: FileText, action: 'prd' },
    { cmd: '/srs', label: 'Generate SRS', desc: 'Buat atau update spesifikasi teknis SRS (22 Sections)', icon: FileCode2, action: 'srs' },
    { cmd: '/arch', label: 'Generate Architecture', desc: 'Buat topologi C4 Mermaid & API contracts (16 Sections)', icon: Cpu, action: 'arch' },
    { cmd: '/design', label: 'Generate Design System', desc: 'Buat token desain & screen flows (16 Sections)', icon: Layers, action: 'design' },
    { cmd: '/validate', label: 'Run Quality Check', desc: 'Audit validasi kelengkapan & keterlacakan requirements', icon: Activity, action: 'validate' },
    { cmd: '/clear', label: 'Clear Chat History', desc: 'Bersihkan histori sesi percakapan saat ini', icon: Trash2, action: 'clear' },
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
            "[MODE: DISCOVERY] Evaluasi seluruh konteks project saat ini. Identifikasi celah ambiguitas dan ajukan 1-3 pertanyaan klarifikasi penting.",
            activeChatAgent
          );
          const msgs = await ConversationService.ListMessages(activeSession.id);
          setMessages(msgs || []);
          await refreshProjectEntities(activeProject.id);
        } catch (err) {
          alert(`Error: ${String(err)}`);
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
      setActiveTab('validation');
      await handleRunValidation();
    } else if (cmd.action === 'clear') {
      setMessages([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachedFile) || !activeSession || !activeProject || isSending) return;

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
      alert(`AI Execution Error: ${String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  // --- Document Operations ---
  const handleGeneratePRD = async () => {
    if (!activeProject) return;
    setIsDocLoading(true);
    try {
      await DocumentService.GeneratePRD(activeProject.id);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      setIsEditingDoc(false);
    } catch (err) {
      alert(`Gagal generate PRD: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleRegeneratePRDSection = async () => {
    if (!activeProject) return;
    setIsDocLoading(true);
    try {
      await DocumentService.RegeneratePRDSection(activeProject.id, selectedSectionNum);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
    } catch (err) {
      alert(`Gagal regenerate section PRD: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleApprovePRD = async () => {
    if (!activeProject || !prdDetails.current_version) return;
    try {
      await DocumentService.ApprovePRD(activeProject.id, prdDetails.current_version.id);
      await loadDocumentDetails(activeProject.id);
      alert('PRD berhasil disetujui (Approved)! Sekarang dokumen SRS dapat digenerate.');
    } catch (err) {
      alert(`Gagal approve PRD: ${String(err)}`);
    }
  };

  const handleGenerateSRS = async () => {
    if (!activeProject) return;
    if (prdDetails.document?.status !== 'approved') {
      alert('SRS Generation Gated: PRD harus di-approve terlebih dahulu!');
      return;
    }

    setIsDocLoading(true);
    try {
      await DocumentService.GenerateSRS(activeProject.id);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      setIsEditingDoc(false);
    } catch (err) {
      alert(`Gagal generate SRS: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleRegenerateSRSSection = async () => {
    if (!activeProject) return;
    setIsDocLoading(true);
    try {
      await DocumentService.RegenerateSRSSection(activeProject.id, selectedSectionNum);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
    } catch (err) {
      alert(`Gagal regenerate section SRS: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleApproveSRS = async () => {
    if (!activeProject || !srsDetails.current_version) return;
    try {
      await DocumentService.ApproveSRS(activeProject.id, srsDetails.current_version.id);
      await loadDocumentDetails(activeProject.id);
      alert('SRS berhasil disetujui (Approved)!');
    } catch (err) {
      alert(`Gagal approve SRS: ${String(err)}`);
    }
  };

  const handleGenerateArchitecture = async () => {
    if (!activeProject) return;
    if (prdDetails.document?.status !== 'approved') {
      alert('Architecture Generation Gated: PRD harus di-approve terlebih dahulu!');
      return;
    }

    setIsDocLoading(true);
    try {
      await DocumentService.GenerateArchitecture(activeProject.id);
      await loadDocumentDetails(activeProject.id);
      setIsEditingDoc(false);
    } catch (err) {
      alert(`Gagal generate Architecture: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleRegenerateArchitectureSection = async () => {
    if (!activeProject) return;
    setIsDocLoading(true);
    try {
      await DocumentService.RegenerateArchitectureSection(activeProject.id, selectedSectionNum);
      await loadDocumentDetails(activeProject.id);
    } catch (err) {
      alert(`Gagal regenerate section Architecture: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleApproveArchitecture = async () => {
    if (!activeProject || !architectureDetails.current_version) return;
    try {
      await DocumentService.ApproveArchitecture(activeProject.id, architectureDetails.current_version.id);
      await loadDocumentDetails(activeProject.id);
      alert('Architecture (architecture.md) berhasil disetujui (Approved)!');
    } catch (err) {
      alert(`Gagal approve Architecture: ${String(err)}`);
    }
  };

  const handleGenerateDesign = async () => {
    if (!activeProject) return;
    if (prdDetails.document?.status !== 'approved') {
      alert('Design Generation Gated: PRD harus di-approve terlebih dahulu!');
      return;
    }

    setIsDocLoading(true);
    try {
      await DocumentService.GenerateDesign(activeProject.id);
      await loadDocumentDetails(activeProject.id);
      setIsEditingDoc(false);
    } catch (err) {
      alert(`Gagal generate Design System: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleRegenerateDesignSection = async () => {
    if (!activeProject) return;
    setIsDocLoading(true);
    try {
      await DocumentService.RegenerateDesignSection(activeProject.id, selectedSectionNum);
      await loadDocumentDetails(activeProject.id);
    } catch (err) {
      alert(`Gagal regenerate section Design: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleApproveDesign = async () => {
    if (!activeProject || !designDetails.current_version) return;
    try {
      await DocumentService.ApproveDesign(activeProject.id, designDetails.current_version.id);
      await loadDocumentDetails(activeProject.id);
      alert('Design System (design.md) berhasil disetujui (Approved)!');
    } catch (err) {
      alert(`Gagal approve Design: ${String(err)}`);
    }
  };

  const handleStartEdit = () => {
    const currentContent = currentView === 'prd' 
      ? prdDetails.current_version?.content || '' 
      : currentView === 'srs'
      ? srsDetails.current_version?.content || ''
      : currentView === 'architecture'
      ? architectureDetails.current_version?.content || ''
      : designDetails.current_version?.content || '';
    setDocEditContent(currentContent);
    setIsEditingDoc(true);
  };

  const handleSaveEdit = async () => {
    if (!activeProject) return;
    setIsDocLoading(true);
    try {
      await DocumentService.SaveManualEdit(activeProject.id, currentView, docEditContent);
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();
      setIsEditingDoc(false);
    } catch (err) {
      alert(`Gagal menyimpan edit: ${String(err)}`);
    } finally {
      setIsDocLoading(false);
    }
  };

  const handleExportDoc = async () => {
    if (!activeProject) return;
    const filename = currentView === 'prd' ? 'PRD.md' : currentView === 'srs' ? 'SRS.md' : currentView === 'architecture' ? 'architecture.md' : 'design.md';
    const defaultPath = prompt(`Tentukan lokasi path penyimpanan file ${filename}:`, `C:\\${filename}`);
    if (!defaultPath) return;

    try {
      await DocumentService.ExportDocument(activeProject.id, currentView, defaultPath);
      alert(`Dokumen berhasil diekspor ke: ${defaultPath}`);
    } catch (err) {
      alert(`Gagal mengekspor dokumen: ${String(err)}`);
    }
  };

  const handleExportAllDocs = async () => {
    if (!activeProject) return;
    const defaultDir = prompt(
      `Tentukan path folder untuk ekspor seluruh dokumen spesifikasi (PRD, SRS, Architecture, Design):`,
      `C:\\specra-exports\\${activeProject.name ? activeProject.name.toLowerCase().replace(/\\s+/g, '-') : 'project'}`
    );
    if (!defaultDir) return;

    try {
      const exported = await DocumentService.ExportAllDocuments(activeProject.id, defaultDir);
      const count = exported ? Object.keys(exported).length : 0;
      alert(`Berhasil mengekspor ${count} dokumen spesifikasi ke folder:\n${defaultDir}`);
    } catch (err) {
      alert(`Gagal mengekspor dokumen: ${String(err)}`);
    }
  };

  const runAutoPipeline = async (skipClarificationGating = false) => {
    if (!activeProject) {
      alert('Pilih atau buat project terlebih dahulu!');
      return;
    }
    if (autoPipelineRunning) return;

    setAutoPipelineRunning(true);
    setPipelineCompletedNotice(false);
    setPipelinePausedReason(null);

    try {
      // 1. Discovery & Requirements Extraction if needed
      if (requirements.length === 0) {
        setAutoPipelineStage('1/5: Mengekstrak Kebutuhan Awal...');
        if (activeSession) {
          try {
            await ConversationService.SendMessageWithAgent(
              activeSession.id,
              activeProject.id,
              "Analisis brief dan ide project ini. Ekstrak kebutuhan fungsional (FR-xxx), non-fungsional, pertanyaan klarifikasi yang krusial, dan asumsi awal.",
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
          setPipelinePausedReason(`Pipeline Berhenti Sementara: Harap jawab ${openClar.length} pertanyaan klarifikasi.`);
          setCurrentView('chat');
          return;
        }
      }

      // 2. PRD Generation & Auto-Approve
      setAutoPipelineStage('2/5: Menyusun PRD (20 Sections)...');
      setCurrentView('prd');
      const prdVer = await DocumentService.GeneratePRD(activeProject.id);
      if (prdVer) {
        await DocumentService.ApprovePRD(activeProject.id, prdVer.id);
      }
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();

      // 3. SRS Generation & Auto-Approve
      setAutoPipelineStage('3/5: Menyusun SRS IEEE 830 (22 Sections)...');
      setCurrentView('srs');
      const srsVer = await DocumentService.GenerateSRS(activeProject.id);
      if (srsVer) {
        await DocumentService.ApproveSRS(activeProject.id, srsVer.id);
      }
      await loadDocumentDetails(activeProject.id);
      await handleRunValidation();

      // 4. Architecture Generation & Auto-Approve
      setAutoPipelineStage('4/5: Menyusun Architecture C4 (16 Sections)...');
      setCurrentView('architecture');
      const archVer = await DocumentService.GenerateArchitecture(activeProject.id);
      if (archVer) {
        await DocumentService.ApproveArchitecture(activeProject.id, archVer.id);
      }
      await loadDocumentDetails(activeProject.id);

      // 5. Design System Generation & Auto-Approve
      setAutoPipelineStage('5/5: Menyusun Design System (16 Sections)...');
      setCurrentView('design');
      const desVer = await DocumentService.GenerateDesign(activeProject.id);
      if (desVer) {
        await DocumentService.ApproveDesign(activeProject.id, desVer.id);
      }
      await loadDocumentDetails(activeProject.id);

      setAutoPipelineStage(null);
      setAutoPipelineRunning(false);
      setPipelineCompletedNotice(true);
    } catch (err) {
      console.error('Auto Pipeline Failed:', err);
      alert(`Auto Pipeline terhenti pada tahap "${autoPipelineStage || 'Eksekusi'}": ${String(err)}`);
      setAutoPipelineRunning(false);
      setAutoPipelineStage(null);
    }
  };

  const isPRDApproved = prdDetails.document?.status === 'approved';
  const isSRSOutdated = srsDetails.document?.status === 'outdated';
  const isArchitectureApproved = architectureDetails.document?.status === 'approved';
  const isDesignApproved = designDetails.document?.status === 'approved';
  const activeDocDetails = currentView === 'prd' 
    ? prdDetails 
    : currentView === 'srs' 
    ? srsDetails 
    : currentView === 'architecture'
    ? architectureDetails
    : designDetails;

  const inspectorTabs = [
    { id: 'requirements' as const, label: 'Requirements', shortLabel: 'Reqs', count: requirements.length, icon: ListOrdered },
    { id: 'validation' as const, label: 'Validation Findings', shortLabel: 'Validate', count: findings.length, icon: ShieldAlert },
    { id: 'traceability' as const, label: 'Traceability Matrix', shortLabel: 'Trace Matrix', count: traceabilityMatrix.length, icon: GitBranch },
    { id: 'assumptions' as const, label: 'Assumptions', shortLabel: 'Assump', count: assumptions.length, icon: AlertTriangle },
    { id: 'questions' as const, label: 'Clarifications', shortLabel: 'Q&A', count: clarifications.length, icon: MessageSquare },
  ];

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

  const currentInspectorTab = inspectorTabs.find(t => t.id === activeTab) || inspectorTabs[0];

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
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {activeProject && (
            <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
              <span className="hidden md:inline px-2 py-0.5 rounded bg-fill-soft border border-border/60">
                {currentView === 'chat' ? 'Chat Discovery' : currentView === 'prd' ? 'PRD Workspace' : currentView === 'srs' ? 'SRS Workspace' : currentView === 'architecture' ? 'Architecture' : 'Design System'}
              </span>
            </div>
          )}

          {/* Global Actions (Export All available even in Chat) */}
          {activeProject && currentView === 'chat' && (
            <button
              onClick={handleExportAllDocs}
              className="px-2 py-1 rounded-[6px] border border-border hover:bg-fill-mute text-fg flex items-center gap-1 text-xs transition-colors shadow-2xs"
              title="Ekspor Seluruh Spesifikasi (PRD, SRS, Architecture, Design) sekaligus ke folder lokal"
            >
              <Download size={12} />
              <span>Export All (.md)</span>
            </button>
          )}

          {/* Document Actions (Export & Edit/Simpan) */}
          {currentView !== 'chat' && activeProject && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyFullDoc}
                disabled={!activeDocDetails.current_version?.content}
                className={`px-2 py-1 rounded-[6px] border border-border flex items-center gap-1 text-xs transition-colors shadow-2xs disabled:opacity-40 ${
                  copiedFullDoc ? 'bg-ok-tint text-ok font-semibold border-ok/40' : 'hover:bg-fill-mute text-fg'
                }`}
                title="Salin seluruh isi dokumen Markdown"
              >
                {copiedFullDoc ? <Check size={12} className="text-ok" /> : <Copy size={12} />}
                <span>{copiedFullDoc ? 'Tersalin!' : 'Copy Doc'}</span>
              </button>

              <button
                onClick={handleExportDoc}
                className="px-2 py-1 rounded-[6px] border border-border hover:bg-fill-mute text-fg flex items-center gap-1 text-xs transition-colors"
                title="Export Dokumen Ini (.md)"
              >
                <Download size={12} />
                <span>Export</span>
              </button>

              <button
                onClick={handleExportAllDocs}
                className="px-2 py-1 rounded-[6px] border border-border hover:bg-fill-mute text-fg flex items-center gap-1 text-xs transition-colors"
                title="Ekspor Seluruh Spesifikasi (PRD, SRS, Architecture, Design) sekaligus ke folder lokal"
              >
                <Download size={12} />
                <span>Export All</span>
              </button>

              {!isEditingDoc ? (
                <button
                  onClick={handleStartEdit}
                  className="px-2 py-1 rounded-[6px] border border-border hover:bg-fill-mute text-fg flex items-center gap-1 text-xs transition-colors"
                >
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 rounded-[6px] bg-primary hover:bg-primary-hover text-white flex items-center gap-1 text-xs font-medium transition-colors shadow-2xs"
                >
                  <Save size={12} />
                  <span>Simpan</span>
                </button>
              )}
            </div>
          )}

          {/* AI Provider Status Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-fill-soft border border-border/60 text-[11px] font-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${providerStatus.available ? 'bg-ok' : 'bg-err'}`} />
            <span className="text-muted">{providerStatus.version}</span>
          </div>

          {/* Inspector Toggle */}
          {activeProject && (
            <button 
              onClick={() => setShowInspector(!showInspector)}
              className={`p-1.5 rounded-[6px] transition-colors ${
                showInspector 
                  ? 'bg-fill-mute text-fg' 
                  : 'text-muted hover:text-fg hover:bg-fill-mute'
              }`}
              title="Toggle Inspector"
            >
              <PanelRight size={15} />
            </button>
          )}

          {/* Quick Theme Toggle (Sun / Moon) */}
          <button
            onClick={toggleQuickTheme}
            className="p-1.5 rounded-[6px] text-muted hover:text-fg hover:bg-fill-mute transition-colors"
            title={isCurrentDark ? "Beralih ke Mode Terang (Light)" : "Beralih ke Mode Gelap (Dark)"}
          >
            {isCurrentDark ? (
              <Sun size={15} className="text-amber-400" />
            ) : (
              <Moon size={15} />
            )}
          </button>

          {/* Settings Studio */}
          <button
            onClick={() => { setShowSettingsModal(true); loadGeneralSettings(); loadTokenUsage(); handleDetectAgents(true); }}
            className="p-1.5 rounded-[6px] text-muted hover:text-fg hover:bg-fill-mute transition-colors"
            title="Studio Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* 2. Main Area: Sidebar + Content Sheet + Inspector */}
      <div className="mqs-main flex-1 flex min-w-0 min-height-0 overflow-hidden">
        
        {/* Left Sidebar (.side3: 230px compact desktop rail) */}
        <aside className="side3 w-[230px] flex flex-col justify-between shrink-0 py-2.5 px-2 select-none">
          <div className="space-y-3">
            {/* Group: Workspace Mode */}
            <div>
              <div className="gl text-[10.5px] font-semibold uppercase tracking-wider text-muted-2 px-2 py-1">
                Workspace
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setCurrentView('chat'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center gap-2 text-[12px] font-medium transition-colors ${
                    currentView === 'chat'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <MessageSquare size={14} className={currentView === 'chat' ? 'text-primary' : 'text-muted'} />
                  <span className="truncate">Chat Discovery</span>
                </button>

                <button
                  onClick={() => { setCurrentView('prd'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors ${
                    currentView === 'prd'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className={currentView === 'prd' ? 'text-primary shrink-0' : 'text-muted shrink-0'} />
                    <span className="truncate">PRD Document</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
                    isPRDApproved ? 'bg-ok-tint text-ok font-semibold' : 'bg-fill text-muted font-medium'
                  }`}>
                    {prdDetails.document?.status || 'none'}
                  </span>
                </button>

                <button
                  onClick={() => { setCurrentView('srs'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors ${
                    currentView === 'srs'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode2 size={14} className={currentView === 'srs' ? 'text-primary shrink-0' : 'text-muted shrink-0'} />
                    <span className="truncate">SRS Document</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
                    isSRSOutdated
                      ? 'bg-err-bg text-err font-semibold'
                      : srsDetails.document?.status === 'approved' 
                      ? 'bg-ok-tint text-ok font-semibold' 
                      : !isPRDApproved 
                      ? 'bg-fill text-muted font-medium'
                      : 'bg-fill text-muted font-medium'
                  }`}>
                    {isSRSOutdated ? (
                      'Outdated'
                    ) : !isPRDApproved ? (
                      <span className="flex items-center gap-1 text-[10px]" title="Terkunci: Memerlukan persetujuan PRD">
                        <Lock size={10} className="text-muted-2" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      srsDetails.document?.status || 'draft'
                    )}
                  </span>
                </button>

                <button
                  onClick={() => { setCurrentView('architecture'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors ${
                    currentView === 'architecture'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Cpu size={14} className={currentView === 'architecture' ? 'text-primary shrink-0' : 'text-muted shrink-0'} />
                    <span className="truncate">Architecture</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
                    isArchitectureApproved 
                      ? 'bg-ok-tint text-ok font-semibold' 
                      : !isPRDApproved 
                      ? 'bg-fill text-muted font-medium'
                      : 'bg-fill text-muted font-medium'
                  }`}>
                    {isArchitectureApproved ? (
                      'approved'
                    ) : !isPRDApproved ? (
                      <span className="flex items-center gap-1 text-[10px]" title="Terkunci: Memerlukan persetujuan PRD">
                        <Lock size={10} className="text-muted-2" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      architectureDetails.document?.status || 'draft'
                    )}
                  </span>
                </button>

                <button
                  onClick={() => { setCurrentView('design'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-[12px] font-medium transition-colors ${
                    currentView === 'design'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles size={14} className={currentView === 'design' ? 'text-primary shrink-0' : 'text-muted shrink-0'} />
                    <span className="truncate">Design System</span>
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold shrink-0 ${
                    isDesignApproved 
                      ? 'bg-ok-tint text-ok font-semibold' 
                      : !isPRDApproved 
                      ? 'bg-fill text-muted font-medium'
                      : 'bg-fill text-muted font-medium'
                  }`}>
                    {isDesignApproved ? (
                      'approved'
                    ) : !isPRDApproved ? (
                      <span className="flex items-center gap-1 text-[10px]" title="Terkunci: Memerlukan persetujuan PRD">
                        <Lock size={10} className="text-muted-2" />
                        <span>Locked</span>
                      </span>
                    ) : (
                      designDetails.document?.status || 'draft'
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* Group: Active Project Summary */}
            <div>
              <div className="gl text-[11px] font-semibold uppercase tracking-wider text-muted-2 px-2 py-1 flex items-center justify-between">
                <span>Active Project</span>
                <button
                  onClick={() => {
                    setProjectManagerTab('open');
                    setIsProjectManagerOpen(true);
                  }}
                  className="text-[10px] text-primary hover:underline font-semibold"
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
                      onClick={handleOpenEditProject}
                      className="hover:text-primary font-medium"
                    >
                      Edit Info
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-[8px] border border-border/80 bg-fill-soft/50 text-xs text-muted space-y-1.5">
                  <div className="flex items-center gap-1.5 text-fg-2 font-medium">
                    <FolderKanban size={13} className="text-muted" />
                    <span>Belum ada project aktif</span>
                  </div>
                  <p className="text-[11px] text-muted-2 leading-relaxed">
                    Buka project di tab atas atau gunakan tombol pada canvas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-1 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => {
                setSettingsTab('general');
                setShowSettingsModal(true);
                loadGeneralSettings();
              }}
              className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded-[6px] hover:bg-fill-mute text-fg-2 hover:text-fg transition-colors border border-border/50 bg-fill-soft/40 shadow-2xs"
              title="Buka Pengaturan Tampilan & Font (General & Appearance)"
            >
              <div className="flex items-center gap-2">
                <Sliders size={13} className="text-primary" />
                <span className="font-medium text-xs">General & Appearance</span>
              </div>
              <span className="text-[10.5px] font-mono text-muted uppercase font-semibold">
                {fontScale === 'auto' ? 'Auto HiDPI' : fontScale}
              </span>
            </button>

            <div className="flex items-center justify-between text-xs px-2 py-1 rounded-[6px] border border-border/80 bg-surface shadow-2xs">
              <div className="flex items-center gap-1.5 text-fg-2">
                <Bot size={13} className="text-primary" />
                <span className="font-medium truncate max-w-[130px] capitalize">
                  {primaryProvider.replace('-cli', '')}
                </span>
                {fallbackEnabled && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-primary-soft text-primary font-semibold">
                    +FB
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${providerStatus.available ? 'bg-ok' : 'bg-err'}`} />
                <span className="text-[10px] text-muted font-mono">
                  {tokenSummary ? `${tokenSummary.total_tokens.toLocaleString()} tok` : '0 tok'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Central Workspace Sheet (.mqs-content - Layered Center Stage) */}
        <main className="mqs-content flex-1 flex flex-col min-w-0 min-height-0 mr-2 mb-2 rounded-[12px] border border-border bg-surface shadow-xs overflow-hidden relative">

        {/* Global Project Pipeline Stepper Bar */}
        {activeProject && (
          <div className="px-4 py-2 border-b border-border bg-panel/75 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
              {pipelineSteps.map((step, idx) => {
                const isActive = currentView === step.id;
                const isLocked = step.locked;
                return (
                  <React.Fragment key={step.id}>
                    {idx > 0 && (
                      <ChevronRight size={13} className="text-muted/40 shrink-0" />
                    )}
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => !isLocked && setCurrentView(step.id as any)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                        isActive
                          ? 'bg-primary-soft text-primary font-semibold border border-primary/30 shadow-2xs'
                          : isLocked
                          ? 'opacity-40 cursor-not-allowed text-muted'
                          : 'text-muted hover:text-fg hover:bg-fill-mute cursor-pointer'
                      }`}
                      title={isLocked ? 'Prasyarat: Dokumen hulu (PRD) harus disetujui terlebih dahulu' : `Buka tahap ${step.name}`}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle2 size={13} className="text-ok shrink-0" />
                      ) : step.status === 'outdated' ? (
                        <AlertTriangle size={13} className="text-err shrink-0" />
                      ) : isLocked ? (
                        <Lock size={12} className="text-muted shrink-0" />
                      ) : (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          isActive ? 'bg-primary animate-pulse' : 'bg-muted/60'
                        }`} />
                      )}
                      <span className="font-semibold">{step.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                        step.status === 'completed'
                          ? 'bg-ok-tint text-ok font-semibold'
                          : step.status === 'outdated'
                          ? 'bg-err-bg text-err font-semibold'
                          : isActive
                          ? 'bg-primary text-white font-semibold'
                          : 'bg-fill text-muted'
                      }`}>
                        {step.desc}
                      </span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="flex items-center gap-2.5 text-xs text-muted shrink-0">
              {/* Auto Pipeline Trigger Button */}
              {autoPipelineRunning ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary-soft border border-primary/40 text-primary text-xs font-semibold shrink-0 animate-pulse">
                  <Loader2 size={13} className="animate-spin text-primary" />
                  <span>{autoPipelineStage || 'Menjalankan Pipeline...'}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => runAutoPipeline(false)}
                  disabled={!activeProject || isDocLoading}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shrink-0 transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  title="Jalankan seluruh rangkaian otomatis: Discovery ➔ PRD ➔ SRS ➔ Architecture ➔ Design System"
                >
                  <Zap size={13} className="fill-current text-amber-300" />
                  <span>Auto Pipeline</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
                <span className="text-[11px] font-mono">Mode:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                  interactionMode === 'discovery'
                    ? 'bg-primary-soft text-primary'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}>
                  {interactionMode}
                </span>
              </div>
              <div className="hidden xl:flex items-center gap-1.5 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                <span>{currentSpecialist.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Auto Pipeline Gating Banner (Paused on Clarifications) */}
        {pipelinePausedReason && (
          <div className="mx-4 mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 shrink-0 shadow-2xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <div>
                <span className="font-semibold">{pipelinePausedReason}</span>
                <p className="text-[11.5px] text-muted mt-0.5">Jawab pertanyaan klarifikasi di bawah agar AI tidak berhalusinasi, atau lanjutkan dengan asumsi saat ini.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setPipelinePausedReason(null); runAutoPipeline(true); }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Lanjutkan Pipeline</span>
                <ChevronRight size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPipelinePausedReason(null)}
                className="p-1 hover:bg-fill-mute rounded text-muted hover:text-fg transition-colors"
                title="Tutup pesan"
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
                <span className="font-semibold text-fg">Auto Pipeline Selesai! Seluruh 4 Dokumen Spesifikasi Berhasil Disusun</span>
                <p className="text-[11.5px] text-muted mt-0.5">PRD (20 Sections), SRS (22 Sections), Architecture (16 Sections), dan Design System (16 Sections) siap digunakan.</p>
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
                title="Tutup pesan"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: CHAT DISCOVERY */}
        {currentView === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!activeProject ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                  <div className="mb-4 shadow-sm hover:scale-105 transition-transform">
                    <SpecraIcon size={56} />
                  </div>
                  <h3 className="text-xl font-bold text-fg mb-1 tracking-tight">
                    Selamat Datang di <span className="font-extrabold">specra</span>
                  </h3>
                  <p className="text-xs text-muted max-w-md mb-6 leading-relaxed">
                    Personal requirements engineering workspace untuk mentransformasikan ide dan brief proyek menjadi spesifikasi sistem terstruktur: PRD, SRS, Architecture, dan Design System.
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
                      <span>Buka Project Manager</span>
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
                      <span>+ Buat Project Baru</span>
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
                                {proj.description || 'Tidak ada deskripsi'}
                              </p>
                            </div>
                            <div className="mt-2 text-[10px] text-muted-2 flex items-center gap-1 font-mono">
                              <span>Klik untuk membuka</span>
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
                  <p className="font-medium text-slate-600 dark:text-slate-400">Mulai Requirement Discovery</p>
                  <p className="text-xs max-w-sm text-center">
                    Ketik ide atau upload draft Markdown spesifikasi di bawah. {currentSpecialist.name} akan menganalisis kebutuhan dan mengekstrak requirement terstruktur (MoSCoW).
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
                                      placeholder="Ketik jawaban klarifikasi..."
                                      className="flex-1 px-2.5 py-1.5 text-xs bg-fill border border-border rounded-lg text-fg placeholder:text-muted focus:outline-none focus:border-primary"
                                    />
                                    <button
                                      type="submit"
                                      disabled={!clarificationAnswers[c.id]?.trim()}
                                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-40 transition-colors shadow-2xs shrink-0"
                                    >
                                      Simpan Jawaban
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
                  <span>{currentSpecialist.name} sedang menganalisis dan mengekstrak spesifikasi via {primaryProvider}...</span>
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
                        <span className="font-bold text-xs text-primary">Rekomendasi Pipeline AI</span>
                        <span className="text-[10px] font-mono bg-ok text-white px-1.5 py-0.2 rounded font-semibold">Discovery Siap</span>
                      </div>
                      <p className="text-xs text-fg-2 mt-0.5 leading-relaxed">
                        Konteks kebutuhan telah mencukupi ({requirements.length} requirement teridentifikasi). AI merekomendasikan untuk beralih ke tahap penyusunan <strong>PRD (20 Sections)</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('prd');
                      handleGeneratePRD();
                    }}
                    disabled={isDocLoading}
                    className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isDocLoading ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                    <span>Generate Draft PRD</span>
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
                      title="Hapus lampiran"
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
                      <span>Perintah Cepat AI Studio</span>
                      <span className="font-mono text-[10px] text-muted">Gunakan ↑ ↓ Enter atau klik</span>
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
                          title="Ganti Specialist AI Agent"
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
                              Pilih Persona Spesialis
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

                      {/* Interaction Mode Pill */}
                      <div className="relative" ref={modeMenuRef}>
                        <button
                          type="button"
                          onClick={() => setShowModeMenu(!showModeMenu)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-2xs transition-colors ${
                            interactionMode === 'discovery'
                              ? 'bg-primary-soft text-primary border-primary/30'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          }`}
                          title="Ganti Mode Interaksi AI"
                        >
                          {interactionMode === 'discovery' ? (
                            <Search size={12} className="text-primary" />
                          ) : (
                            <Zap size={12} className="text-amber-500" />
                          )}
                          <span className="capitalize">{interactionMode} Mode</span>
                          <ChevronDown size={11} className="opacity-70" />
                        </button>

                        {/* Mode Dropdown Menu (Adaptive Upward) */}
                        {showModeMenu && (
                          <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 divide-y divide-border/50 animate-in fade-in slide-in-from-bottom-2">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted bg-panel/50">
                              Mode Interaksi AI
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setInteractionMode('discovery');
                                setShowModeMenu(false);
                              }}
                              className={`w-full px-3 py-2 text-left flex items-start gap-2.5 text-xs transition-colors ${
                                interactionMode === 'discovery' ? 'bg-primary-soft text-primary font-semibold' : 'hover:bg-fill-mute text-fg'
                              }`}
                            >
                              <Search size={14} className="mt-0.5 text-primary shrink-0" />
                              <div>
                                <div className="font-semibold">Discovery Mode (Default)</div>
                                <p className="text-[10.5px] text-muted leading-tight">Proaktif menggali ide, menemukan celah, & mengajukan pertanyaan klarifikasi.</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setInteractionMode('execution');
                                setShowModeMenu(false);
                              }}
                              className={`w-full px-3 py-2 text-left flex items-start gap-2.5 text-xs transition-colors ${
                                interactionMode === 'execution' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold' : 'hover:bg-fill-mute text-fg'
                              }`}
                            >
                              <Zap size={14} className="mt-0.5 text-amber-500 shrink-0" />
                              <div>
                                <div className="font-semibold">Execution Mode</div>
                                <p className="text-[10.5px] text-muted leading-tight">Pasif, langsung menyusun spesifikasi dari konteks tanpa bertanya lagi.</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Slash Hint */}
                    <div className="text-[10.5px] font-mono text-muted hidden sm:flex items-center gap-1">
                      <span>Ketik</span>
                      <kbd className="px-1.5 py-0.5 bg-fill border border-border rounded text-[10px] text-fg font-semibold">/</kbd>
                      <span>untuk perintah</span>
                    </div>
                  </div>

                  {/* Input Row: Attachment + Input Field + Send Button */}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Lampirkan file draft spesifikasi (.md, .txt, .json)"
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
                          ? `Diskusikan ide dengan ${currentSpecialist.name}, atau ketik / untuk perintah...`
                          : `Berikan instruksi dokumen langsung ke ${currentSpecialist.name} (Execution Mode)...`
                      }
                      className="flex-1 bg-transparent text-[13px] font-normal outline-none text-fg placeholder:text-muted px-1 py-1"
                      disabled={isSending}
                    />

                    <button 
                      type="submit"
                      title="Kirim Pesan"
                      className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0 shadow-2xs font-semibold text-xs"
                      disabled={(!inputMessage.trim() && !attachedFile) || isSending}
                    >
                      {isSending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <span>Kirim</span>
                          <Send size={12} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2 & 3: DOCUMENT WORKSPACE (PRD & SRS) */}
        {currentView !== 'chat' && activeProject && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Outdated SRS Warning Alert Banner (SYS-SRS-008) */}
            {currentView === 'srs' && isSRSOutdated && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 flex items-center justify-between text-xs px-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-rose-600 shrink-0" />
                  <span className="font-semibold">SRS Outdated:</span>
                  <span>PRD telah dimodifikasi setelah SRS dibuat. Harap lakukan re-validasi atau regenerate SRS agar spesifikasi tetap konsisten!</span>
                </div>
                <button
                  onClick={handleGenerateSRS}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px]"
                >
                  Regenerate SRS
                </button>
              </div>
            )}

            {/* Document Controls Banner */}
            <div className="p-3 bg-panel border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs text-muted uppercase tracking-wider">
                    {currentView.toUpperCase()} Status:
                  </span>
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-[5px] ${
                    isSRSOutdated && currentView === 'srs'
                      ? 'bg-err-bg text-err'
                      : activeDocDetails.document?.status === 'approved'
                      ? 'bg-ok-tint text-ok font-semibold'
                      : 'bg-warn-bg text-warn font-semibold'
                  }`}>
                    {isSRSOutdated && currentView === 'srs' ? 'Outdated' : activeDocDetails.document?.status || 'draft'}
                  </span>
                </div>

                {activeDocDetails.current_version && (
                  <>
                    <span className="text-xs font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded-[5px]">
                      Version: v{activeDocDetails.current_version.version_number}
                    </span>

                    {/* View Mode Switcher: Formatted Preview vs Raw Markdown */}
                    <div className="flex items-center gap-0.5 bg-surface border border-border rounded-lg p-0.5 text-xs shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setDocDisplayMode('preview')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          docDisplayMode === 'preview'
                            ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                            : 'text-muted hover:text-fg hover:bg-fill-mute'
                        }`}
                      >
                        <Eye size={12} />
                        <span>Preview Mode</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocDisplayMode('source')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          docDisplayMode === 'source'
                            ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                            : 'text-muted hover:text-fg hover:bg-fill-mute'
                        }`}
                      >
                        <Code size={12} />
                        <span>Raw Markdown</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Generation & Approval Buttons */}
              <div className="flex items-center gap-2">
                {currentView === 'prd' ? (
                  <>
                    <button
                      onClick={handleGeneratePRD}
                      disabled={isDocLoading}
                      className="px-3 py-1.5 rounded-[6px] bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
                    >
                      {isDocLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      <span>{activeDocDetails.current_version ? 'Regenerate Full PRD' : 'Generate PRD Draft'}</span>
                    </button>

                    {activeDocDetails.current_version && activeDocDetails.document?.status !== 'approved' && (
                      <button
                        onClick={handleApprovePRD}
                        className="px-3 py-1.5 rounded-[6px] bg-ok hover:bg-ok-text text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <CheckCircle size={13} />
                        <span>Approve PRD</span>
                      </button>
                    )}
                  </>
                ) : currentView === 'srs' ? (
                  <>
                    {!isPRDApproved ? (
                      <div className="flex items-center gap-1.5 text-xs text-warn bg-warn-bg border border-warn-border px-3 py-1 rounded-[6px]">
                        <Lock size={13} />
                        <span>SRS Gated: Approve PRD terlebih dahulu!</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleGenerateSRS}
                          disabled={isDocLoading}
                          className="px-3 py-1.5 rounded-[6px] bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
                        >
                          {isDocLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          <span>{activeDocDetails.current_version ? 'Regenerate Full SRS' : 'Generate SRS from Approved PRD'}</span>
                        </button>

                        {activeDocDetails.current_version && activeDocDetails.document?.status !== 'approved' && (
                          <button
                            onClick={handleApproveSRS}
                            className="px-3 py-1.5 rounded-[6px] bg-ok hover:bg-ok-text text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <FileCheck size={13} />
                            <span>Approve SRS</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : currentView === 'architecture' ? (
                  <>
                    {!isPRDApproved ? (
                      <div className="flex items-center gap-1.5 text-xs text-warn bg-warn-bg border border-warn-border px-3 py-1 rounded-[6px]">
                        <Lock size={13} />
                        <span>Architecture Gated: Approve PRD terlebih dahulu!</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleGenerateArchitecture}
                          disabled={isDocLoading}
                          className="px-3 py-1.5 rounded-[6px] bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
                        >
                          {isDocLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          <span>{activeDocDetails.current_version ? 'Regenerate Full Architecture' : 'Generate Architecture Draft (16 Sections)'}</span>
                        </button>

                        {activeDocDetails.current_version && activeDocDetails.document?.status !== 'approved' && (
                          <button
                            onClick={handleApproveArchitecture}
                            className="px-3 py-1.5 rounded-[6px] bg-ok hover:bg-ok-text text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Cpu size={13} />
                            <span>Approve Architecture</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {!isPRDApproved ? (
                      <div className="flex items-center gap-1.5 text-xs text-warn bg-warn-bg border border-warn-border px-3 py-1 rounded-[6px]">
                        <Lock size={13} />
                        <span>Design System Gated: Approve PRD terlebih dahulu!</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleGenerateDesign}
                          disabled={isDocLoading}
                          className="px-3 py-1.5 rounded-[6px] bg-primary hover:bg-primary-hover text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
                        >
                          {isDocLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                          <span>{activeDocDetails.current_version ? 'Regenerate Full Design System' : 'Generate Design System Draft (16 Sections)'}</span>
                        </button>

                        {activeDocDetails.current_version && activeDocDetails.document?.status !== 'approved' && (
                          <button
                            onClick={handleApproveDesign}
                            className="px-3 py-1.5 rounded-[6px] bg-ok hover:bg-ok-text text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve Design System</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Section-level Regeneration */}
                {activeDocDetails.current_version && (
                  <div className="flex items-center gap-1 pl-2 border-l border-border">
                    <select
                      value={selectedSectionNum}
                      onChange={(e) => setSelectedSectionNum(Number(e.target.value))}
                      className="border border-border rounded-[6px] px-2 py-1 text-xs bg-surface text-fg outline-none"
                    >
                      {activeDocDetails.sections.map((sec, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {idx + 1}. {sec}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={currentView === 'prd' ? handleRegeneratePRDSection : currentView === 'srs' ? handleRegenerateSRSSection : currentView === 'architecture' ? handleRegenerateArchitectureSection : handleRegenerateDesignSection}
                      disabled={isDocLoading}
                      title="Regenerate selected section"
                      className="px-2 py-1 rounded-[6px] border border-border hover:bg-fill-mute text-fg text-xs flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={12} className={isDocLoading ? 'animate-spin' : ''} />
                      <span>Regen Section</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Document Content View / Editor */}
            <div className="flex-1 overflow-y-auto p-8">
              {isDocLoading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-2 text-indigo-600">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-xs font-medium">AI sedang menyusun spesifikasi dokumen via Antigravity CLI...</span>
                </div>
              ) : isEditingDoc ? (
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  <textarea
                    value={docEditContent}
                    onChange={(e) => setDocEditContent(e.target.value)}
                    className="flex-1 w-full p-5 font-mono text-xs leading-relaxed border border-border rounded-lg bg-surface text-fg outline-none focus:border-primary resize-none h-[calc(100vh-250px)] shadow-2xs"
                  />
                </div>
              ) : !activeDocDetails.current_version ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted space-y-3">
                  <FileText size={40} className="text-muted/60" />
                  <p className="text-xs">
                    Dokumen {currentView.toUpperCase()} belum dibuat untuk project ini.
                  </p>
                  {currentView === 'prd' ? (
                    <button
                      onClick={handleGeneratePRD}
                      className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-[6px] text-xs font-medium shadow-2xs transition-colors"
                    >
                      Generate Draft PRD (20 Sections)
                    </button>
                  ) : currentView === 'srs' ? (
                    isPRDApproved ? (
                      <button
                        onClick={handleGenerateSRS}
                        className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-[6px] text-xs font-medium shadow-2xs transition-colors"
                      >
                        Generate Draft SRS (22 Sections)
                      </button>
                    ) : null
                  ) : currentView === 'architecture' ? (
                    isPRDApproved ? (
                      <button
                        onClick={handleGenerateArchitecture}
                        className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-[6px] text-xs font-medium shadow-2xs transition-colors"
                      >
                        Generate Architecture Draft (16 Sections)
                      </button>
                    ) : null
                  ) : (
                    isPRDApproved ? (
                      <button
                        onClick={handleGenerateDesign}
                        className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-[6px] text-xs font-medium shadow-2xs transition-colors"
                      >
                        Generate Design System Draft (16 Sections)
                      </button>
                    ) : null
                  )}
                </div>
              ) : (
                <div className="max-w-5xl mx-auto w-full px-4 py-2">
                  {docDisplayMode === 'preview' ? (
                    <MarkdownViewer content={activeDocDetails.current_version.content} isDark={isCurrentDark} />
                  ) : (
                    <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-2xs">
                      <div className="px-3.5 py-2 bg-panel border-b border-border flex items-center justify-between text-xs">
                        <span className="font-mono text-muted text-[11px]">
                          Markdown Source (v{activeDocDetails.current_version.version_number})
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyFullDoc}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                        >
                          {copiedFullDoc ? <Check size={11} className="text-ok" /> : <Copy size={11} />}
                          <span>{copiedFullDoc ? 'Tersalin' : 'Salin Semua'}</span>
                        </button>
                      </div>
                      <pre className="p-4 overflow-x-auto font-mono text-xs leading-relaxed bg-fill text-fg-2 whitespace-pre-wrap">
                        <code>{activeDocDetails.current_version.content}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Context / Inspector Panel (Right Pane - w-72 inside mqs-main) */}
      {showInspector && activeProject && (
        <aside className="w-72 mr-2 mb-2 rounded-[12px] border border-border/80 bg-panel/60 shadow-2xs flex flex-col overflow-hidden shrink-0 backdrop-blur-xs">
          
          {/* Inspector Header: Selected Title on Left, 3-Dot Dropdown on Right (mq-studio style) */}
          <div className="h-11 px-3.5 border-b border-border flex items-center justify-between shrink-0 relative bg-surface/80 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <currentInspectorTab.icon size={15} className="text-primary" />
              <span className="font-semibold text-xs text-fg tracking-tight">
                {currentInspectorTab.label}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary-soft text-primary">
                {currentInspectorTab.count}
              </span>
            </div>

            <div className="relative" ref={inspectorMenuRef}>
              <button
                type="button"
                onClick={() => setShowInspectorMenu(!showInspectorMenu)}
                className={`p-1.5 rounded-md transition-colors ${
                  showInspectorMenu
                    ? 'bg-fill text-fg'
                    : 'hover:bg-fill text-muted hover:text-fg'
                }`}
                title="Switch Inspector View"
              >
                <MoreVertical size={16} />
              </button>

              {showInspectorMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-surface border border-border rounded-lg shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Inspector Views
                  </div>
                  {inspectorTabs.map((tab) => {
                    const isTabActive = activeTab === tab.id;
                    const TabIcon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowInspectorMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors ${
                          isTabActive
                            ? 'bg-primary-soft text-primary font-semibold'
                            : 'text-fg/80 hover:bg-fill'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <TabIcon size={14} className={isTabActive ? 'text-primary' : 'text-muted'} />
                          <span>{tab.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                            isTabActive 
                              ? 'bg-primary text-white' 
                              : 'bg-fill text-muted'
                          }`}>
                            {tab.count}
                          </span>
                          {isTabActive && <Check size={13} className="text-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
            
            {/* TAB 1: REQUIREMENTS */}
            {activeTab === 'requirements' && (
              <div className="space-y-3">
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
                    title="Analisis dokumen & chat untuk mengekstrak requirements"
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
                      <h4 className="text-xs font-semibold text-fg">Belum Ada Requirement</h4>
                      <p className="text-[11px] leading-relaxed text-muted max-w-[240px]">
                        Kirim prompt atau klik tombol di bawah agar AI mengekstrak kebutuhan fungsional secara otomatis.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleExtractRequirements}
                      disabled={isExtractingReqs}
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Sparkles size={13} className={isExtractingReqs ? 'animate-spin' : ''} />
                      <span>{isExtractingReqs ? 'Mengekstrak...' : 'Ekstrak Requirements Otomatis'}</span>
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
                            title="Ubah MoSCoW Priority"
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
                              title="Setujui requirement ini"
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
                              title="Tolak requirement ini"
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

            {/* TAB 2: VALIDATION FINDINGS */}
            {activeTab === 'validation' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-semibold text-fg">
                    Inspection Findings ({findings.length})
                  </span>
                  <button
                    onClick={handleRunValidation}
                    disabled={isValidating}
                    className="px-2 py-1 rounded bg-primary hover:bg-primary-hover text-white text-[11px] font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={isValidating ? 'animate-spin' : ''} />
                    <span>Run Check</span>
                  </button>
                </div>

                {findings.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted space-y-2">
                    <CheckCircle2 size={28} className="mx-auto text-ok" />
                    <span>Tidak ada isu validasi atau konflik ditemukan!</span>
                  </div>
                ) : (
                  findings.map((f) => {
                    const isConflict = f.severity === 'conflict';
                    return (
                      <div
                        key={f.id}
                        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
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
                        <p className="leading-relaxed">{f.description}</p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: TRACEABILITY MATRIX */}
            {activeTab === 'traceability' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                  <span className="font-semibold text-fg">
                    PRD ➔ SRS Traceability
                  </span>
                  <GitBranch size={13} className="text-primary" />
                </div>

                {traceabilityMatrix.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted">
                    Belum ada mapping requirement tercatat.
                  </div>
                ) : (
                  traceabilityMatrix.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-surface border border-border rounded-lg shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-primary">
                          {item.requirement_key}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          item.covered_in_srs 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {item.covered_in_srs ? 'Mapped in SRS' : 'Orphan (Not in SRS)'}
                        </span>
                      </div>
                      <div className="font-medium text-fg">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-muted flex items-center justify-between">
                        <span>Priority: {item.priority}</span>
                        <span className="capitalize">Status: {item.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: ASSUMPTIONS */}
            {activeTab === 'assumptions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border text-xs font-semibold text-fg">
                  <span>Assumptions ({assumptions.length})</span>
                  {assumptions.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ok-tint text-ok font-bold">
                      {assumptions.filter(a => a.status === 'confirmed').length} Confirmed
                    </span>
                  )}
                </div>

                {assumptions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted">Tidak ada asumsi aktif.</div>
                ) : (
                  assumptions.map((a) => (
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

                        <div className="flex items-center gap-1">
                          {a.status !== 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAssumptionStatus(a.id, 'confirmed')}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                              title="Tandai asumsi ini sebagai valid/terkonfirmasi"
                            >
                              <Check size={10} />
                              <span>Confirm</span>
                            </button>
                          )}
                          {a.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAssumptionStatus(a.id, 'rejected')}
                              className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-semibold transition-colors flex items-center gap-0.5"
                              title="Tolak asumsi ini"
                            >
                              <X size={10} />
                              <span>Reject</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-fg leading-relaxed">{a.description}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 5: QUESTIONS (CLARIFICATIONS) */}
            {activeTab === 'questions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border text-xs font-semibold text-fg">
                  <span>Clarifications ({clarifications.length})</span>
                  {clarifications.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ok-tint text-ok font-bold">
                      {clarifications.filter(c => c.status === 'answered' || c.answer).length} Answered
                    </span>
                  )}
                </div>

                {clarifications.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted">Tidak ada pertanyaan terbuka.</div>
                ) : (
                  clarifications.map((c) => (
                    <div key={c.id} className="p-3 bg-surface border border-border rounded-xl space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-primary bg-primary-soft px-1.5 py-0.5 rounded">
                          Clarification
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          c.status === 'answered' || c.answer ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700'
                        }`}>
                          {c.status || (c.answer ? 'answered' : 'open')}
                        </span>
                      </div>
                      
                      <p className="text-xs text-fg leading-relaxed">{c.question}</p>

                      {c.answer ? (
                        <div className="p-2 rounded-lg bg-fill text-xs space-y-0.5 border border-border/80">
                          <span className="text-[10px] font-bold text-ok uppercase">Jawaban Anda:</span>
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
                            placeholder="Tulis klarifikasi jawaban..."
                            className="flex-1 px-2.5 py-1 text-xs bg-fill border border-border rounded-lg text-fg focus:outline-none focus:border-primary"
                          />
                          <button
                            type="submit"
                            disabled={!clarificationAnswers[c.id]?.trim()}
                            className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-40 transition-colors shrink-0 shadow-2xs"
                          >
                            Kirim
                          </button>
                        </form>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer Document Stats */}
          <div className="p-2.5 border-t border-border bg-panel flex items-center justify-between text-xs">
            <span className="text-muted text-[11px]">Validation Status:</span>
            <span className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${
              findings.length === 0 ? 'bg-ok-tint text-ok' : 'bg-warn-bg text-warn'
            }`}>
              {findings.length === 0 ? 'CLEAN' : `${findings.length} FINDINGS`}
            </span>
          </div>
        </aside>
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
              <h3 className="font-semibold text-sm text-fg">Edit Metadata Project</h3>
              <button onClick={() => setShowEditProjectModal(false)} className="text-muted hover:text-fg">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleUpdateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">Nama Project</label>
                <input 
                  type="text"
                  required
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-surface text-fg placeholder:text-muted outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">Deskripsi Project</label>
                <textarea 
                  value={editProjectDesc}
                  onChange={(e) => setEditProjectDesc(e.target.value)}
                  rows={2}
                  className="w-full border border-border rounded-md px-3 py-2 text-xs bg-surface text-fg placeholder:text-muted outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">Status Project</label>
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
                <button type="button" onClick={() => setShowEditProjectModal(false)} className="px-3.5 py-1.5 text-xs text-muted hover:text-fg hover:bg-fill rounded-md">Batal</button>
                <button type="submit" className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary hover:bg-primary-hover text-white shadow-2xs">Simpan Perubahan</button>
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
                title="Tutup (Esc)"
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
                    Kelola tema warna tampilan, skala font sistem, direktori workspace, dan preferensi output dokumen AI.
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
                      Sesuaikan tema warna antarmuka dan rasio skala tampilan agar nyaman di monitor standar maupun layar HiDPI.
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
                        Dokumen PRD, SRS, Architecture, dan Design System disimpan terlindungi di direktori lokal komputer Anda.
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
                      <span className="font-semibold text-xs text-fg">Auto-Save Dokumen Draf</span>
                      <p className="text-[11.5px] text-muted">Otomatis menyimpan perubahan teks draf saat Anda mengedit dokumen PRD/SRS.</p>
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
                <div className="p-4 bg-fill-soft rounded-xl border border-border space-y-3">
                  <h4 className="font-semibold text-sm text-fg flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    AI Generation & Language Preferences
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold text-xs text-fg mb-1">
                        Bahasa Utama Dokumen (Document Language)
                      </label>
                      <select
                        value={generalSettings.language}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                      >
                        <option value="id">Bahasa Indonesia Teknis Formal (Standar Industri)</option>
                        <option value="en">English (IEEE 830 / ISO Standard)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-xs text-fg mb-1">
                        Kedalaman Template Dokumen
                      </label>
                      <select
                        value={generalSettings.default_doc_depth}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, default_doc_depth: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-fg focus:outline-none focus:border-primary"
                      >
                        <option value="standard">Enterprise Comprehensive (20+ Sections Lengkap)</option>
                        <option value="compact">Rapid Agile / Sprint Lite (Ringkas & Cepat)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-xs text-fg">Proactive Requirement Clarification</span>
                      <p className="text-[11.5px] text-muted">Agen spesialis otomatis mendeteksi celah ambigu dan mengajukan pertanyaan klarifikasi.</p>
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
                    <p className="text-[11.5px] text-muted">Beri tahu via notifikasi desktop Windows saat proses AI generate dokumen panjang selesai di background.</p>
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
                    <span>Simpan Pengaturan Umum</span>
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
                    Konfigurasi prompt 4 agen spesialis requirements engineering dan kelola library custom prompt directives.
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
                      Kelola 4 specialist persona AI dan buat skill kustom tambahan untuk di-tanamkan ke persona tertentu.
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
                                        Semua skill dalam katalog sudah terpasang pada persona ini!
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
                                            {sk.description || 'Tidak ada deskripsi.'}
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
                                <p className="font-medium text-fg">Belum Ada Skill Aktif</p>
                                <p className="text-[11.5px] max-w-sm mx-auto">
                                  Persona ini belum memiliki skill khusus. Klik tombol <strong>+ Add Skill</strong> di atas untuk memasang skill dari katalog.
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
                                      {sk.description || 'Tidak ada deskripsi.'}
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
                              Belum ada MCP tool yang terhubung ke persona ini. Konfigurasikan di tab MCP Connections.
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
                                Skill kustom yang Anda buat. Dapat dipasang ke persona manapun melalui menu <strong>+ Add Skill</strong> di atas.
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
                                  title="Hapus skill kustom permanen"
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
                            placeholder="Ringkasan kemampuan skill ini..."
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
                            placeholder="Masukkan arahan prompt AI, standar kepatuhan, atau batasan arsitektur spesifik..."
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
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                          >
                            Simpan Custom Skill
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
                        Belum ada MCP Server terdaftar. Daftarkan server stdio atau sse di formulir bawah.
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
                                    <Globe size={11} /> Global (Semua Persona)
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
                              title="Hapus MCP Server"
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
                          Global (Semua Persona Spesialis)
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
                          Persona-Spesifik (Pilih Persona Tertentu)
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
                    Pilih mesin eksekusi AI utama (Antigravity CLI, OpenCode, atau Gemini REST API) dengan Zero-Mock policy.
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

                          {agent.installed && agent.path && (
                            <div className="text-xs font-mono text-muted truncate" title={agent.path}>
                              Path: {agent.path}
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

                  {/* 1.3 OpenCode & Local LLM Specific Config */}
                  <div className="p-3.5 bg-surface border border-border rounded-lg space-y-3">
                    <h4 className="font-semibold text-fg flex items-center gap-1.5">
                      <Terminal size={14} className="text-primary" />
                      OpenCode / OpenAI-Compatible Configuration
                    </h4>
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
                        <input
                          type="text"
                          value={opencodeModel}
                          onChange={(e) => setOpencodeModel(e.target.value)}
                          placeholder="default / llama3"
                          className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none focus:border-primary font-mono text-fg"
                        />
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

                  {/* 1.4 Gemini Direct Config */}
                  <div className="p-3.5 bg-surface border border-border rounded-lg space-y-3">
                    <h4 className="font-semibold text-fg flex items-center gap-1.5">
                      <Key size={14} className="text-primary" />
                      Google Gemini Direct API Configuration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-muted mb-1">Model</label>
                        <input
                          type="text"
                          value={geminiModel}
                          onChange={(e) => setGeminiModel(e.target.value)}
                          placeholder="gemini-1.5-pro"
                          className="w-full border border-border rounded-md px-3 py-1.5 text-xs bg-transparent outline-none focus:border-primary font-mono text-fg"
                        />
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
                      Simpan Konfigurasi AI Provider
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
                    Pantau statistik penggunaan token, estimasi biaya komputasi, dan riwayat request ke AI provider.
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
                                Belum ada riwayat eksekusi prompt tercatat.
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
                    Validasi kesehatan mesin CLI, uji latensi respon, dan kelola kredensial API key di OS Keyring.
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
                    <div className="p-3.5 bg-surface border border-border/80 rounded-lg text-xs space-y-2 font-mono">
                      <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                        <span className="text-muted">Duration</span>
                        <span className="text-ok font-bold">{diagResults.duration_ms} ms</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                        <span className="text-muted">Antigravity CLI</span>
                        <span className={diagResults.cli_available ? 'text-ok font-semibold' : 'text-err font-semibold'}>
                          {diagResults.cli_available ? `Found (v${diagResults.cli_version})` : diagResults.cli_error}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                        <span className="text-muted">OpenCode CLI</span>
                        <span className={diagResults.opencode_available ? 'text-ok font-semibold' : 'text-muted'}>
                          {diagResults.opencode_available ? 'Installed & Ready' : 'Not Detected'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                        <span className="text-muted">OS Keyring</span>
                        <span className="text-primary font-semibold">{diagResults.keyring_health}</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-muted">Storage Engine</span>
                        <span className="text-fg">{diagResults.storage_strategy}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-surface/60 border border-dashed border-border rounded-lg text-xs text-muted flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-2" />
                      <span>Belum ada hasil uji. Klik "Jalankan Diagnostik" untuk memvalidasi performa dan integritas sistem.</span>
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
                          placeholder="Simpan Google Gemini / OpenCode API Key..."
                          className="w-full border border-border rounded-lg pl-3 pr-10 py-2 text-xs bg-surface font-mono text-fg placeholder:text-muted outline-none focus:border-primary shadow-2xs transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-1 rounded transition-colors"
                          title={showApiKey ? 'Sembunyikan Kunci' : 'Perlihatkan Kunci'}
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shrink-0 shadow-2xs transition-colors"
                      >
                        Simpan ke Keyring
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-2">
                      <Lock size={12} className="text-ok shrink-0" />
                      <span>Kunci API dienkripsi secara hardware/OS level. Tidak pernah ditulis ke disk atau database SQLite.</span>
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
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
