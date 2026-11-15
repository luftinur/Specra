package domain

import (
	"time"
)

type ProjectStatus string

const (
	ProjectStatusActive   ProjectStatus = "active"
	ProjectStatusArchived ProjectStatus = "archived"
)

type Project struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Status      ProjectStatus `json:"status"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

type Conversation struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"project_id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type MessageRole string

const (
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
	RoleSystem    MessageRole = "system"
)

type Message struct {
	ID                  string      `json:"id"`
	ConversationID      string      `json:"conversation_id"`
	Role                MessageRole `json:"role"`
	Content             string      `json:"content"`
	ProviderExecutionID *string     `json:"provider_execution_id,omitempty"`
	CreatedAt           time.Time   `json:"created_at"`
}

type RequirementCategory string

const (
	CategoryFunctional    RequirementCategory = "functional"
	CategoryNonFunctional RequirementCategory = "non-functional"
	CategoryBusinessRule  RequirementCategory = "business-rule"
	CategoryUIUX          RequirementCategory = "ui-ux"
)

type MoSCoWPriority string

const (
	PriorityMustHave   MoSCoWPriority = "Must Have"
	PriorityShouldHave MoSCoWPriority = "Should Have"
	PriorityCouldHave  MoSCoWPriority = "Could Have"
	PriorityWontHave   MoSCoWPriority = "Won't Have"
)

type RequirementStatus string

const (
	RequirementStatusDraft    RequirementStatus = "draft"
	RequirementStatusApproved RequirementStatus = "approved"
	RequirementStatusRejected RequirementStatus = "rejected"
)

type Requirement struct {
	ID             string              `json:"id"`
	ProjectID      string              `json:"project_id"`
	RequirementKey string              `json:"requirement_key"` // e.g. REQ-001
	Category       RequirementCategory `json:"category"`
	Title          string              `json:"title"`
	Description    string              `json:"description"`
	Priority       MoSCoWPriority      `json:"priority"`
	Status         RequirementStatus   `json:"status"`
	Confidence     string              `json:"confidence"`
	CreatedAt      time.Time           `json:"created_at"`
	UpdatedAt      time.Time           `json:"updated_at"`
}

type Clarification struct {
	ID         string     `json:"id"`
	ProjectID  string     `json:"project_id"`
	Question   string     `json:"question"`
	Answer     *string    `json:"answer,omitempty"`
	Status     string     `json:"status"` // "open", "answered"
	CreatedAt  time.Time  `json:"created_at"`
	AnsweredAt *time.Time `json:"answered_at,omitempty"`
}

type Assumption struct {
	ID              string    `json:"id"`
	ProjectID       string    `json:"project_id"`
	Description     string    `json:"description"`
	Status          string    `json:"status"` // "unconfirmed", "confirmed", "rejected"
	SourceReference *string   `json:"source_reference,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

type Decision struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	Description string    `json:"description"`
	Rationale   *string   `json:"rationale,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type DocumentType string

const (
	DocTypePRD          DocumentType = "prd"
	DocTypeSRS          DocumentType = "srs"
	DocTypeArchitecture DocumentType = "architecture"
	DocTypeDesign       DocumentType = "design"
)

type DocumentStatus string

const (
	DocStatusDraft      DocumentStatus = "draft"
	DocStatusInReview   DocumentStatus = "in_review"
	DocStatusApproved   DocumentStatus = "approved"
	DocStatusSuperseded DocumentStatus = "superseded"
	DocStatusOutdated   DocumentStatus = "outdated"
)

type Document struct {
	ID               string         `json:"id"`
	ProjectID        string         `json:"project_id"`
	DocumentType     DocumentType   `json:"document_type"`
	Status           DocumentStatus `json:"status"`
	CurrentVersionID *string        `json:"current_version_id,omitempty"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}

type DocumentVersion struct {
	ID              string     `json:"id"`
	DocumentID      string     `json:"document_id"`
	VersionNumber   int        `json:"version_number"`
	Content         string     `json:"content"`
	ContentHash     string     `json:"content_hash"`
	SourceVersionID *string    `json:"source_version_id,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	ApprovedAt      *time.Time `json:"approved_at,omitempty"`
}

type ProviderType string

const (
	ProviderAPI ProviderType = "api"
	ProviderCLI ProviderType = "cli"
)

type ModelInfo struct {
	ID          string `json:"id"`
	DisplayName string `json:"display_name"`
	Description string `json:"description,omitempty"`
}

type AIProviderConfig struct {
	ID             string       `json:"id"`
	ProviderType   ProviderType `json:"provider_type"`
	Name           string       `json:"name"`
	ExecutablePath string       `json:"executable_path,omitempty"`
	Model          string       `json:"model,omitempty"`
	ConfigJSON     string       `json:"config_json,omitempty"`
	Enabled        bool         `json:"enabled"`
}

type DetectedAgent struct {
	ID              string      `json:"id"`
	Name            string      `json:"name"`
	Executable      string      `json:"executable"`
	Installed       bool        `json:"installed"`
	Version         string      `json:"version"`
	Path            string      `json:"path"`
	Description     string      `json:"description"`
	AvailableModels []ModelInfo `json:"available_models"`
	SelectedModel   string      `json:"selected_model"`
}

type TokenUsageSummary struct {
	TotalRequests   int   `json:"total_requests"`
	TotalPrompt     int   `json:"total_prompt_tokens"`
	TotalCompletion int   `json:"total_completion_tokens"`
	TotalTokens     int   `json:"total_tokens"`
	AverageDuration int64 `json:"average_duration_ms"`
	FallbackCount   int   `json:"fallback_count"`
}

type ProviderExecution struct {
	ID               string     `json:"id"`
	ProjectID        string     `json:"project_id"`
	ProviderID       string     `json:"provider_id"`
	Operation        string     `json:"operation"`
	Status           string     `json:"status"`
	Model            string     `json:"model,omitempty"`
	StartedAt        time.Time  `json:"started_at"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
	DurationMs       int64      `json:"duration_ms"`
	PromptTokens     int        `json:"prompt_tokens"`
	CompletionTokens int        `json:"completion_tokens"`
	TotalTokens      int        `json:"total_tokens"`
	FallbackUsed     bool       `json:"fallback_used"`
	ErrorCode        *string    `json:"error_code,omitempty"`
}

type FindingSeverity string

const (
	SeverityConflict FindingSeverity = "conflict"
	SeverityWarning  FindingSeverity = "warning"
	SeverityInfo     FindingSeverity = "info"
)

type ValidationFinding struct {
	ID                string          `json:"id"`
	ValidationRunID   string          `json:"validation_run_id"`
	Severity          FindingSeverity `json:"severity"`
	FindingType       string          `json:"finding_type"`
	Description       string          `json:"description"`
	RequirementID     *string         `json:"requirement_id,omitempty"`
	DocumentVersionID *string         `json:"document_version_id,omitempty"`
}

type TraceabilityLink struct {
	ID                  string    `json:"id"`
	SourceRequirementID string    `json:"source_requirement_id"`
	TargetRequirementID string    `json:"target_requirement_id"`
	RelationshipType    string    `json:"relationship_type"`
	CreatedAt           time.Time `json:"created_at"`
}

type AgentConfig struct {
	ID           string   `json:"id"`            // e.g. "prd-agent", "srs-agent", "design-agent"
	Name         string   `json:"name"`
	Role         string   `json:"role"`
	SystemPrompt string   `json:"system_prompt"`
	Skills       []string `json:"skills"`
	MCPServers   []string `json:"mcp_servers"`
	Model        string   `json:"model,omitempty"`
}

type SkillConfig struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Prompt      string `json:"prompt"`
	Category    string `json:"category"` // "product" | "system" | "architecture" | "uiux" | "general"
	Custom      bool   `json:"custom"`
}

type MCPServerConfig struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Transport      string            `json:"transport"` // "stdio" or "sse"
	Endpoint       string            `json:"endpoint"`  // command path or SSE url
	Enabled        bool              `json:"enabled"`
	Scope          string            `json:"scope"`     // "global" | "persona"
	AssignedAgents []string          `json:"assigned_agents,omitempty"`
	Env            map[string]string `json:"env,omitempty"`
}

type AttachmentInfo struct {
	Filename    string    `json:"filename"`
	Path        string    `json:"path"`
	SizeBytes   int64     `json:"size_bytes"`
	UploadedAt  time.Time `json:"uploaded_at"`
	Description string    `json:"description,omitempty"`
}

type GeneralSettings struct {
	Theme                  string `json:"theme"`                   // "system" | "light" | "dark"
	FontSize               string `json:"font_size"`               // "compact" (13px), "standard" (14px), "comfort" (15.5px)
	Animations             bool   `json:"animations"`              // true / false
	Language               string `json:"language"`                // Kept for backward compatibility
	ChatLanguage           string `json:"chat_language"`           // "id" | "en" | "auto"
	DocLanguage            string `json:"doc_language"`            // "en" | "id" | "auto"
	AutoSaveDraft          bool   `json:"auto_save_draft"`         // true / false
	AutoSaveIntervalMs     int    `json:"auto_save_interval_ms"`   // 1000
	DefaultDocDepth        string `json:"default_doc_depth"`       // "standard" | "compact"
	ProactiveClarification bool   `json:"proactive_clarification"` // true / false
	DesktopNotifications   bool   `json:"desktop_notifications"`   // true / false
	WorkspacePath          string `json:"workspace_path"`          // Path folder workspace
}



