import React, { useState, useEffect, useRef } from 'react';
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
  Monitor,
  Sliders,
  FolderOpen,
  Layers,
  Globe
} from 'lucide-react';
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
  const [fontScale, setFontScale] = useState<'compact' | 'standard' | 'comfort'>(() => {
    return (localStorage.getItem('font_scale') as 'compact' | 'standard' | 'comfort') || 'standard';
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

  const applyFontScale = (scale: 'compact' | 'standard' | 'comfort') => {
    setFontScale(scale);
    localStorage.setItem('font_scale', scale);
    const sizeMap = { compact: '13px', standard: '14px', comfort: '15.5px' };
    document.documentElement.style.setProperty('--app-base-font-size', sizeMap[scale] || '14px');
  };

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

  const handleDetectAgents = async () => {
    setIsDetectingAgents(true);
    try {
      const agents = await ProviderService.DetectInstalledCodingAgents();
      setDetectedAgents(agents || []);
    } catch (err) {
      alert(`Gagal mendeteksi coding agent: ${String(err)}`);
    } finally {
      setIsDetectingAgents(false);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachedFile) || !activeSession || !activeProject || isSending) return;

    const userText = inputMessage.trim();
    const currentAttachment = attachedFile;
    setInputMessage('');
    setAttachedFile(null);
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

    try {
      if (currentAttachment) {
        await ConversationService.SubmitAttachment(
          activeSession.id,
          activeProject.id,
          currentAttachment.name,
          currentAttachment.content,
          userText || 'Analyze attached draft document and extract structured requirements',
          activeChatAgent
        );
      } else {
        await ConversationService.SendMessageWithAgent(
          activeSession.id,
          activeProject.id,
          userText,
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

  const currentInspectorTab = inspectorTabs.find(t => t.id === activeTab) || inspectorTabs[0];

  return (
    <div className="m3 flex flex-col h-screen w-screen overflow-hidden text-fg select-none">
      
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
            className="flex items-center gap-2 px-2 py-1 rounded-[6px] hover:bg-fill-mute text-fg transition-colors shrink-0 font-medium text-xs"
            title="Open Project Manager"
          >
            <div className="w-5 h-5 rounded-[5px] bg-primary flex items-center justify-center text-white font-bold text-[10.5px] shadow-2xs">
              AR
            </div>
            <span className="font-semibold tracking-tight text-fg">Requirements Studio</span>
          </button>

          <div className="h-4 w-px bg-border/60 mx-1 shrink-0" />

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

          {/* Document Actions (Export & Edit/Simpan) */}
          {currentView !== 'chat' && activeProject && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleExportDoc}
                className="px-2 py-1 rounded-[6px] border border-border hover:bg-fill-mute text-fg flex items-center gap-1 text-xs transition-colors"
                title="Export Document"
              >
                <Download size={12} />
                <span>Export</span>
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
            onClick={() => { setShowSettingsModal(true); loadGeneralSettings(); loadTokenUsage(); }}
            className="p-1.5 rounded-[6px] text-muted hover:text-fg hover:bg-fill-mute transition-colors"
            title="Studio Settings"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* 2. Main Area: Sidebar + Content Sheet + Inspector */}
      <div className="mqs-main flex-1 flex min-w-0 min-height-0 overflow-hidden">
        
        {/* Left Sidebar (.side3: 198px, sits directly on chrome ground) */}
        <aside className="side3 w-[198px] flex flex-col justify-between shrink-0 py-2 px-2 select-none">
          <div className="space-y-3">
            {/* Group: Workspace Mode */}
            <div>
              <div className="gl text-[11px] font-semibold uppercase tracking-wider text-muted-2 px-2 py-1">
                Workspace
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setCurrentView('chat'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center gap-2 text-xs font-medium transition-colors ${
                    currentView === 'chat'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <MessageSquare size={14} className={currentView === 'chat' ? 'text-primary' : 'text-muted'} />
                  <span>Chat Discovery</span>
                </button>

                <button
                  onClick={() => { setCurrentView('prd'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-xs font-medium transition-colors ${
                    currentView === 'prd'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className={currentView === 'prd' ? 'text-primary' : 'text-muted'} />
                    <span>PRD Document</span>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase ${
                    isPRDApproved ? 'bg-ok-tint text-ok font-semibold' : 'bg-fill text-muted font-medium'
                  }`}>
                    {prdDetails.document?.status || 'none'}
                  </span>
                </button>

                <button
                  onClick={() => { setCurrentView('srs'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-xs font-medium transition-colors ${
                    currentView === 'srs'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode2 size={14} className={currentView === 'srs' ? 'text-primary' : 'text-muted'} />
                    <span>SRS Document</span>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase ${
                    isSRSOutdated
                      ? 'bg-err-bg text-err font-semibold'
                      : srsDetails.document?.status === 'approved' 
                      ? 'bg-ok-tint text-ok font-semibold' 
                      : !isPRDApproved 
                      ? 'bg-warn-bg text-warn font-semibold'
                      : 'bg-fill text-muted font-medium'
                  }`}>
                    {isSRSOutdated ? 'Outdated' : !isPRDApproved ? 'Gated' : srsDetails.document?.status || 'draft'}
                  </span>
                </button>

                <button
                  onClick={() => { setCurrentView('architecture'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-xs font-medium transition-colors ${
                    currentView === 'architecture'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className={currentView === 'architecture' ? 'text-primary' : 'text-muted'} />
                    <span>Architecture</span>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase ${
                    isArchitectureApproved 
                      ? 'bg-ok-tint text-ok font-semibold' 
                      : !isPRDApproved 
                      ? 'bg-warn-bg text-warn font-semibold'
                      : 'bg-fill text-muted font-medium'
                  }`}>
                    {isArchitectureApproved ? 'approved' : !isPRDApproved ? 'Gated' : architectureDetails.document?.status || 'draft'}
                  </span>
                </button>

                <button
                  onClick={() => { setCurrentView('design'); setIsEditingDoc(false); }}
                  className={`ni w-full text-left px-2.5 py-1.5 rounded-[7px] flex items-center justify-between text-xs font-medium transition-colors ${
                    currentView === 'design'
                      ? 'bg-primary-soft text-primary font-semibold shadow-2xs'
                      : 'text-fg-2 hover:bg-fill-mute hover:text-fg'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className={currentView === 'design' ? 'text-primary' : 'text-muted'} />
                    <span>Design System</span>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase ${
                    isDesignApproved 
                      ? 'bg-ok-tint text-ok font-semibold' 
                      : !isPRDApproved 
                      ? 'bg-warn-bg text-warn font-semibold'
                      : 'bg-fill text-muted font-medium'
                  }`}>
                    {isDesignApproved ? 'approved' : !isPRDApproved ? 'Gated' : designDetails.document?.status || 'draft'}
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
                <div className="p-2.5 text-center rounded-[8px] border border-dashed border-border-dash bg-fill-soft/40 text-xs text-muted space-y-2">
                  <p className="text-[11px]">No active project</p>
                  <button
                    onClick={() => {
                      setProjectManagerTab('open');
                      setIsProjectManagerOpen(true);
                    }}
                    className="px-2 py-1 bg-primary hover:bg-primary-hover text-white rounded-[5px] text-[11px] font-medium shadow-2xs"
                  >
                    + Open Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-1 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-xs px-2 py-1 rounded-[6px] border border-border/80 bg-surface shadow-2xs">
              <div className="flex items-center gap-1.5 text-fg-2">
                <Bot size={13} className="text-primary" />
                <span className="font-medium truncate max-w-[85px] capitalize">
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

        {/* Central Workspace Sheet (.mqs-content) */}
        <main className="mqs-content flex-1 flex flex-col min-w-0 min-height-0 mr-2 mb-2 rounded-[10px] border border-border bg-surface shadow-2xs overflow-hidden relative">

        {/* VIEW 1: CHAT DISCOVERY */}
        {currentView === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Specialist Agent Switcher Bar */}
            {activeProject && (
              <div className="px-4 py-2 border-b border-border bg-panel flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5 p-1 bg-fill rounded-[8px] text-xs">
                  {specialistAgents.map((ag) => {
                    const isAgActive = activeChatAgent === ag.id;
                    const AgIcon = ag.icon;
                    return (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => setActiveChatAgent(ag.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-medium transition-all ${
                          isAgActive
                            ? 'bg-surface text-fg font-semibold shadow-2xs border border-border/80'
                            : 'text-muted hover:text-fg hover:bg-fill-mute'
                        }`}
                      >
                        <AgIcon size={13} className={isAgActive ? ag.colorClass : 'text-muted-2'} />
                        <span>{ag.name}</span>
                        <span className="text-[10px] font-mono opacity-60">({ag.docFocus})</span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-muted flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                  <span>Target: <strong className="text-fg-2 font-semibold">{currentSpecialist.role}</strong></span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!activeProject ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <FolderKanban size={36} className="text-slate-300 dark:text-slate-700" />
                  <p>Pilih project di tab atas atau buka Project Manager untuk memulai.</p>
                  <button 
                    onClick={() => {
                      setProjectManagerTab('open');
                      setIsProjectManagerOpen(true);
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium shadow-xs"
                  >
                    Buka Project Manager
                  </button>
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
                messages.map((m) => {
                  const isUser = m.role === 'user';
                  return isUser ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[75%] rounded-[8px] px-3.5 py-2.5 bg-fill text-fg border border-border/60 leading-relaxed whitespace-pre-wrap shadow-2xs text-[13px]">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="border-l-2 border-primary pl-4 py-2 space-y-2 bg-fill-soft/40 p-3 rounded-r-[8px]">
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Bot size={13} />
                        <span>{currentSpecialist.name} ({currentSpecialist.role})</span>
                      </div>
                      <div className="leading-relaxed text-fg-2 whitespace-pre-wrap text-[13px]">
                        {m.content}
                      </div>
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
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar with File Attachment */}
            {activeProject && (
              <div className="p-3 border-t border-border bg-panel shrink-0">
                {/* File Attachment Preview Badge */}
                {attachedFile && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-1 rounded-[6px] bg-primary-soft text-xs text-primary font-medium w-fit border border-primary/20">
                    <Paperclip size={13} />
                    <span className="font-semibold">{attachedFile.name}</span>
                    <span className="text-[10px] font-mono opacity-70">({Math.round(attachedFile.size / 1024)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="ml-1 p-0.5 hover:bg-fill-mute rounded text-primary hover:text-err transition-colors"
                    >
                      <X size={12} />
                    </button>
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

                <form onSubmit={handleSendMessage} className="flex items-center gap-2 border border-border rounded-[8px] px-3 py-1.5 bg-surface focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload draft specification (.md, .txt, .json)"
                    className="p-1 text-muted hover:text-primary rounded hover:bg-fill-mute transition-colors shrink-0"
                  >
                    <Paperclip size={15} />
                  </button>

                  <input 
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Konsultasi dengan ${currentSpecialist.name} (${currentSpecialist.docFocus}) atau upload draft .md...`}
                    className="flex-1 bg-transparent text-[13px] font-normal outline-none text-fg placeholder:text-muted"
                    disabled={isSending}
                  />

                  <button 
                    type="submit"
                    title="Kirim"
                    className="px-3 py-1.5 rounded-[6px] bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-40 flex items-center justify-center shrink-0 shadow-2xs"
                    disabled={(!inputMessage.trim() && !attachedFile) || isSending}
                  >
                    {isSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>
                </form>
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
                  <span className="text-xs font-mono text-muted bg-surface border border-border px-2 py-0.5 rounded-[5px]">
                    Version: v{activeDocDetails.current_version.version_number}
                  </span>
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
                <div className="max-w-prose mx-auto prose dark:prose-invert text-fg">
                  <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                    {activeDocDetails.current_version.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. Context / Inspector Panel (Right Pane - w-80 inside mqs-main) */}
      {showInspector && activeProject && (
        <aside className="w-80 mr-2 mb-2 rounded-[10px] border border-border bg-surface shadow-2xs flex flex-col overflow-hidden shrink-0">
          
          {/* Inspector Header: Selected Title on Left, 3-Dot Dropdown on Right (mq-studio style) */}
          <div className="h-10 px-3.5 border-b border-border flex items-center justify-between shrink-0 relative bg-panel">
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
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Switch Inspector View"
              >
                <MoreVertical size={16} />
              </button>

              {showInspectorMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1 z-30 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <TabIcon size={14} className={isTabActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
                          <span>{tab.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                            isTabActive 
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {tab.count}
                          </span>
                          {isTabActive && <Check size={13} className="text-indigo-600 dark:text-indigo-400" />}
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
              requirements.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Belum ada requirement terekstraksi.</div>
              ) : (
                requirements.map((req) => (
                  <div key={req.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                        {req.requirement_key}
                      </span>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">{req.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{req.description}</p>
                  </div>
                ))
              )
            )}

            {/* TAB 2: VALIDATION FINDINGS */}
            {activeTab === 'validation' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Inspection Findings ({findings.length})
                  </span>
                  <button
                    onClick={handleRunValidation}
                    disabled={isValidating}
                    className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={isValidating ? 'animate-spin' : ''} />
                    <span>Run Check</span>
                  </button>
                </div>

                {findings.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    <CheckCircle2 size={28} className="mx-auto text-emerald-500 mb-1.5" />
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
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    PRD ➔ SRS Traceability
                  </span>
                  <GitBranch size={13} className="text-indigo-500" />
                </div>

                {traceabilityMatrix.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Belum ada mapping requirement tercatat.
                  </div>
                ) : (
                  traceabilityMatrix.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-600">
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
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
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
              assumptions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Tidak ada asumsi aktif.</div>
              ) : (
                assumptions.map((a) => (
                  <div key={a.id} className="p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-600">{a.status}</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{a.description}</p>
                  </div>
                ))
              )
            )}

            {/* TAB 5: QUESTIONS */}
            {activeTab === 'questions' && (
              clarifications.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Tidak ada pertanyaan terbuka.</div>
              ) : (
                clarifications.map((c) => (
                  <div key={c.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-bold text-indigo-500">Clarification</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{c.question}</p>
                    {c.answer && <div className="text-xs text-emerald-600 font-medium">Ans: {c.answer}</div>}
                  </div>
                ))
              )
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

      {/* Advanced Settings & System Diagnostics Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-5">
          <div className="bg-surface border border-border rounded-[14px] p-7 w-full max-w-7xl h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <Settings size={22} className="text-primary" />
                <h3 className="font-bold text-base text-fg">
                  AI Requirements Studio Settings
                </h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="p-1.5 text-muted hover:text-fg hover:bg-fill rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex border-b border-border gap-2 pb-3 text-sm shrink-0 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => { setSettingsTab('general'); loadGeneralSettings(); }}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  settingsTab === 'general'
                    ? 'bg-primary-soft text-primary shadow-2xs'
                    : 'text-muted hover:text-fg hover:bg-fill'
                }`}
              >
                <Sliders size={16} />
                <span>General & Appearance</span>
              </button>

              <button
                type="button"
                onClick={() => { setSettingsTab('personas'); loadAgentsAndMCP(); }}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  settingsTab === 'personas'
                    ? 'bg-primary-soft text-primary shadow-2xs'
                    : 'text-muted hover:text-fg hover:bg-fill'
                }`}
              >
                <Sparkles size={16} />
                <span>Specialist Personas & Skills</span>
              </button>

              <button
                type="button"
                onClick={() => { setSettingsTab('mcp'); loadAgentsAndMCP(); }}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  settingsTab === 'mcp'
                    ? 'bg-primary-soft text-primary shadow-2xs'
                    : 'text-muted hover:text-fg hover:bg-fill'
                }`}
              >
                <Database size={16} />
                <span>MCP Connections ({mcpList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('providers')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  settingsTab === 'providers'
                    ? 'bg-primary-soft text-primary shadow-2xs'
                    : 'text-muted hover:text-fg hover:bg-fill'
                }`}
              >
                <Bot size={16} />
                <span>Coding Agents & Providers</span>
              </button>

              <button
                type="button"
                onClick={() => { setSettingsTab('tokens'); loadTokenUsage(); }}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  settingsTab === 'tokens'
                    ? 'bg-primary-soft text-primary shadow-2xs'
                    : 'text-muted hover:text-fg hover:bg-fill'
                }`}
              >
                <BarChart2 size={16} />
                <span>Token Usage & Logs</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('diagnostics')}
                className={`px-3.5 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                  settingsTab === 'diagnostics'
                    ? 'bg-primary-soft text-primary shadow-2xs'
                    : 'text-muted hover:text-fg hover:bg-fill'
                }`}
              >
                <Activity size={16} />
                <span>Diagnostics & Security</span>
              </button>
            </div>

            {/* Modal Body Container */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-1 mt-3">

            {/* TAB -1: GENERAL & APPEARANCE SETTINGS */}
            {settingsTab === 'general' && (
              <div className="space-y-5 text-[13px]">
                {generalSaveSuccess && (
                  <div className="p-3 bg-ok-tint border border-ok/30 rounded-lg text-ok flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} />
                    <span>{generalSaveSuccess}</span>
                  </div>
                )}

                {/* 1. Appearance & Theme Selection */}
                <div className="p-4 bg-fill-soft rounded-xl border border-border space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-fg flex items-center gap-2">
                      <Sun size={16} className="text-primary" />
                      Appearance & Color Themes (Tampilan & Tema)
                    </h4>
                    <p className="text-xs text-muted mt-0.5">
                      Pilih tema visual yang nyaman untuk workspace coding assistant: Warm Stone (terang), Obsidian Slate (gelap), atau Otomatis.
                    </p>
                  </div>

                  {/* 3 Theme Mockup Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Light Mode Card */}
                    <div
                      onClick={() => {
                        applyTheme('light');
                        setGeneralSettings(prev => ({ ...prev, theme: 'light' }));
                      }}
                      className={`rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                        themeMode === 'light'
                          ? 'border-primary ring-2 ring-primary/20 bg-surface shadow-2xs'
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="h-20 bg-[#f2ede4] border-b border-[#e5dfd5] relative overflow-hidden p-1 flex flex-col">
                        <div className="h-3.5 bg-[#f5f0e8] border-b border-[#e5dfd5] flex items-center px-1.5 gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d8d2c8]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d8d2c8]" />
                          <span className="w-8 h-2 rounded bg-white border border-[#e5dfd5] ml-1" />
                        </div>
                        <div className="flex-1 flex gap-1 pt-1 overflow-hidden">
                          <div className="w-6 bg-[#f2ede4] flex flex-col gap-1 p-0.5 shrink-0">
                            <span className="w-full h-1.5 rounded bg-[#e5dfd5]" />
                            <span className="w-full h-1.5 rounded bg-[#e5dfd5]" />
                          </div>
                          <div className="flex-1 bg-[#faf6f0] rounded border border-[#e5dfd5] p-1.5 space-y-1">
                            <span className="block w-3/4 h-1.5 rounded bg-[#e5dfd5]" />
                            <span className="block w-1/2 h-1 rounded bg-[#ece6dc]" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-xs text-fg flex items-center gap-1.5">
                            <span>Light (Warm Stone)</span>
                          </div>
                          <p className="text-[11.5px] text-muted mt-0.5">
                            Palet batu hangat alami, cerah dan nyaman di siang hari.
                          </p>
                        </div>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          themeMode === 'light' ? 'border-primary bg-primary text-white' : 'border-border'
                        }`}>
                          {themeMode === 'light' && <Check size={10} strokeWidth={3} />}
                        </span>
                      </div>
                    </div>

                    {/* Dark Mode Card */}
                    <div
                      onClick={() => {
                        applyTheme('dark');
                        setGeneralSettings(prev => ({ ...prev, theme: 'dark' }));
                      }}
                      className={`rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                        themeMode === 'dark'
                          ? 'border-primary ring-2 ring-primary/20 bg-surface shadow-2xs'
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="h-20 bg-[#121110] border-b border-[#2a2724] relative overflow-hidden p-1 flex flex-col">
                        <div className="h-3.5 bg-[#171513] border-b border-[#2a2724] flex items-center px-1.5 gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3a3632]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3a3632]" />
                          <span className="w-8 h-2 rounded bg-[#1a1816] border border-[#2a2724] ml-1" />
                        </div>
                        <div className="flex-1 flex gap-1 pt-1 overflow-hidden">
                          <div className="w-6 bg-[#121110] flex flex-col gap-1 p-0.5 shrink-0">
                            <span className="w-full h-1.5 rounded bg-[#2a2724]" />
                            <span className="w-full h-1.5 rounded bg-[#2a2724]" />
                          </div>
                          <div className="flex-1 bg-[#1a1816] rounded border border-[#2a2724] p-1.5 space-y-1">
                            <span className="block w-3/4 h-1.5 rounded bg-[#332f2b]" />
                            <span className="block w-1/2 h-1 rounded bg-[#25221f]" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-xs text-fg flex items-center gap-1.5">
                            <span>Dark (Obsidian Slate)</span>
                          </div>
                          <p className="text-[11.5px] text-muted mt-0.5">
                            Kontras tajam & anti-lelah, minim silau untuk sesi fokus malam hari.
                          </p>
                        </div>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          themeMode === 'dark' ? 'border-primary bg-primary text-white' : 'border-border'
                        }`}>
                          {themeMode === 'dark' && <Check size={10} strokeWidth={3} />}
                        </span>
                      </div>
                    </div>

                    {/* System Auto Card */}
                    <div
                      onClick={() => {
                        applyTheme('system');
                        setGeneralSettings(prev => ({ ...prev, theme: 'system' }));
                      }}
                      className={`rounded-xl border transition-all cursor-pointer overflow-hidden flex flex-col justify-between ${
                        themeMode === 'system'
                          ? 'border-primary ring-2 ring-primary/20 bg-surface shadow-2xs'
                          : 'border-border bg-surface hover:border-border-soft'
                      }`}
                    >
                      <div className="h-20 relative overflow-hidden border-b border-border grid grid-cols-2">
                        {/* Left Light Half */}
                        <div className="bg-[#f2ede4] p-1 flex flex-col border-r border-border">
                          <div className="h-3.5 bg-[#f5f0e8] border-b border-[#e5dfd5] flex items-center px-1 shrink-0">
                            <span className="w-5 h-2 rounded bg-white border border-[#e5dfd5]" />
                          </div>
                          <div className="flex-1 bg-[#faf6f0] mt-1 rounded border border-[#e5dfd5] p-1">
                            <span className="block w-3/4 h-1.5 rounded bg-[#e5dfd5]" />
                          </div>
                        </div>
                        {/* Right Dark Half */}
                        <div className="bg-[#121110] p-1 flex flex-col">
                          <div className="h-3.5 bg-[#171513] border-b border-[#2a2724] flex items-center px-1 shrink-0">
                            <span className="w-5 h-2 rounded bg-[#1a1816] border border-[#2a2724]" />
                          </div>
                          <div className="flex-1 bg-[#1a1816] mt-1 rounded border border-[#2a2724] p-1">
                            <span className="block w-3/4 h-1.5 rounded bg-[#332f2b]" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-xs text-fg flex items-center gap-1.5">
                            <Monitor size={13} className="text-primary" />
                            <span>System / Auto</span>
                          </div>
                          <p className="text-[11.5px] text-muted mt-0.5">
                            Otomatis mengikuti preferensi terang/gelap sistem operasi Windows.
                          </p>
                        </div>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          themeMode === 'system' ? 'border-primary bg-primary text-white' : 'border-border'
                        }`}>
                          {themeMode === 'system' && <Check size={10} strokeWidth={3} />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Font Scale Selector */}
                  <div className="pt-2 border-t border-border">
                    <label className="block font-semibold text-xs text-fg mb-1">
                      Interface Font Scale (Skala Ukuran Teks)
                    </label>
                    <p className="text-xs text-muted mb-3">
                      Sesuaikan kenyamanan pembacaan teks di seluruh sidebar, editor, chat, dan tabel:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {[
                        { id: 'compact', label: 'Compact (13px)', desc: 'Tampilan padat, memuat lebih banyak baris kode & dokumen.' },
                        { id: 'standard', label: 'Standard (14px) - Default', desc: 'Skala seimbang & tajam, direkomendasikan untuk kenyamanan harian.' },
                        { id: 'comfort', label: 'Comfort (15.5px)', desc: 'Teks ekstra besar, anti-lelah untuk monitor QHD/4K atau jarak baca jauh.' }
                      ].map((item) => {
                        const isSelected = (fontScale === item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              applyFontScale(item.id as any);
                              setGeneralSettings(prev => ({ ...prev, font_size: item.id }));
                            }}
                            className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-primary-soft/40 border-primary shadow-2xs'
                                : 'bg-surface border-border hover:border-border-soft'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-xs text-fg">{item.label}</span>
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-primary bg-primary text-white' : 'border-border'
                              }`}>
                                {isSelected && <Check size={9} strokeWidth={3} />}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-muted leading-relaxed">
                              {item.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Animation Toggle */}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
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
              <div className="space-y-5 text-xs">
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

                      {/* Skills Library for this Persona */}
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <label className="block text-xs font-bold text-fg">
                              Specialized Skills Catalog ({currentSkills.length} Active for {currentAgent.name})
                            </label>
                            <p className="text-[11.5px] text-muted">
                              Klik pada kartu skill untuk mengaktifkan atau menonaktifkan skill pada persona ini.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
                          {skillsCatalog.length === 0 ? (
                            <div className="col-span-2 text-center py-6 text-muted text-xs border border-dashed border-border rounded-xl">
                              Memuat katalog skill...
                            </div>
                          ) : (
                            skillsCatalog.map((sk) => {
                              const isAttached = currentSkills.includes(sk.id) || currentSkills.includes(sk.name);
                              return (
                                <div 
                                  key={sk.id}
                                  onClick={() => handleToggleAgentSkill(currentAgent as AgentConfig, sk.id)}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                    isAttached
                                      ? 'bg-ok-tint/30 border-ok/50 shadow-2xs'
                                      : 'bg-surface border-border hover:border-border-soft'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs text-fg">{sk.name}</span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-fill text-muted uppercase font-medium">
                                        {sk.category || 'general'}
                                      </span>
                                      {sk.custom && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-tone-violet-bg text-tone-violet border border-tone-violet/30 font-semibold">
                                          Custom Skill
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                        isAttached ? 'bg-ok text-white' : 'bg-fill text-muted'
                                      }`}>
                                        {isAttached ? 'Active' : 'Disabled'}
                                      </span>
                                      {sk.custom && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCustomSkill(sk.id, sk.name);
                                          }}
                                          className="p-1 text-muted hover:text-err rounded hover:bg-fill transition-colors"
                                          title="Delete custom skill"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-[11.5px] text-muted leading-relaxed line-clamp-2">
                                    {sk.description || 'Tidak ada deskripsi.'}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

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
              <div className="space-y-5 text-xs">
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
              <div className="space-y-5 text-xs">
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
                      onClick={handleDetectAgents}
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
                                onClick={() => setPrimaryProvider(agent.id)}
                                className={`px-2.5 py-1 rounded text-xs font-medium border ${
                                  primaryProvider === agent.id 
                                    ? 'bg-primary text-white border-primary' 
                                    : 'border-border hover:bg-fill text-muted hover:text-fg'
                                }`}
                              >
                                {primaryProvider === agent.id ? 'Primary Active' : 'Set as Primary'}
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
              <div className="space-y-4 text-xs">
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
              <div className="space-y-4 text-xs">
                {/* Diagnostics Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Activity size={14} className="text-primary" />
                      Health & Latency Diagnostics (SYS-AI-011)
                    </h4>
                    <button
                      type="button"
                      onClick={handleRunDiagnostics}
                      disabled={isRunningDiag}
                      className="px-2.5 py-1 text-xs font-medium rounded bg-fill hover:bg-fill-soft text-fg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isRunningDiag ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      <span>Jalankan Diagnostik</span>
                    </button>
                  </div>

                  {diagResults ? (
                    <div className="p-3 bg-surface border border-border rounded-lg text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted">Duration:</span>
                        <span className="text-ok font-bold">{diagResults.duration_ms} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Antigravity CLI:</span>
                        <span className={diagResults.cli_available ? 'text-ok' : 'text-err'}>
                          {diagResults.cli_available ? `Found (v${diagResults.cli_version})` : diagResults.cli_error}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">OpenCode CLI:</span>
                        <span className={diagResults.opencode_available ? 'text-ok' : 'text-muted'}>
                          {diagResults.opencode_available ? 'Installed & Ready' : 'Not Detected'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">OS Keyring:</span>
                        <span className="text-primary">{diagResults.keyring_health}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Storage:</span>
                        <span className="text-fg">{diagResults.storage_strategy}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted italic">
                      Klik "Jalankan Diagnostik" untuk memvalidasi Antigravity CLI, OpenCode, SQLite database, dan OS Keyring.
                    </div>
                  )}
                </div>

                {/* Secure OS Credential Store Section */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Key size={14} className="text-primary" />
                    Secure OS Credential Store (FR-055, SRS Section 12.1)
                  </h4>
                  <form onSubmit={handleSaveApiKey} className="space-y-2">
                    <div className="text-[11px] text-muted">
                      Kunci API disimpan terenkripsi di Windows Credential Manager (<code className="font-mono bg-fill px-1 py-0.5 rounded text-fg">zalando/go-keyring</code>).
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Simpan Google Gemini / OpenCode API Key..."
                        className="flex-1 border border-border rounded-md px-3 py-2 text-xs bg-surface text-fg placeholder:text-muted outline-none focus:border-primary"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-2 text-xs font-medium rounded-md bg-primary hover:bg-primary-hover text-white shrink-0 shadow-2xs transition-colors"
                      >
                        Simpan ke Keyring
                      </button>
                    </div>
                    {keySaveMsg && (
                      <div className="text-xs text-ok font-medium flex items-center gap-1">
                        <CheckCircle2 size={13} /> {keySaveMsg}
                      </div>
                    )}
                  </form>
                </div>

                {/* Storage Strategy */}
                <div className="space-y-2 border-t border-border pt-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <Database size={14} className="text-primary" />
                    Local Storage & Privacy (FR-005, FR-006)
                  </h4>
                  <div className="text-xs text-muted space-y-1">
                    <div>• SQLite Database: <span className="font-mono text-fg">ModernC Pure-Go SQLite (WAL mode, CGO-free)</span></div>
                    <div>• Workspace Documents: <span className="font-mono text-fg">AI-Requirements-Studio/projects/{'{project_id}'} (Isolated PRD.md & SRS.md)</span></div>
                  </div>
                </div>
              </div>
            )}

            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-border">
              <button 
                type="button" 
                onClick={() => setShowSettingsModal(false)} 
                className="px-4 py-1.5 text-xs font-medium rounded-md bg-fill text-fg hover:bg-fill-soft transition-colors border border-border"
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
