package services

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

type ConversationService struct {
	repo          *storage.ConversationRepository
	reqRepo       *storage.RequirementRepository
	orchestrator  *ai.Orchestrator
	workspace     *storage.WorkspaceManager
	agentRegistry *ai.AgentRegistry
}

func NewConversationService(
	repo *storage.ConversationRepository,
	reqRepo *storage.RequirementRepository,
	orch *ai.Orchestrator,
) *ConversationService {
	return &ConversationService{
		repo:         repo,
		reqRepo:      reqRepo,
		orchestrator: orch,
	}
}

func (s *ConversationService) SetWorkspace(wm *storage.WorkspaceManager) {
	s.workspace = wm
}

func (s *ConversationService) SetAgentRegistry(ar *ai.AgentRegistry) {
	s.agentRegistry = ar
}

func (s *ConversationService) GetSession(projectID string) (*domain.Conversation, error) {
	return s.repo.GetOrCreateForProject(context.Background(), projectID, "Main Discovery")
}

func (s *ConversationService) ListMessages(conversationID string) ([]domain.Message, error) {
	return s.repo.ListMessages(context.Background(), conversationID)
}

func (s *ConversationService) SendMessage(conversationID, projectID, content string) (*domain.Message, error) {
	return s.SendMessageWithAgent(conversationID, projectID, content, "product-analyst")
}

func (s *ConversationService) SendMessageWithAgent(conversationID, projectID, content, agentID string) (*domain.Message, error) {
	ctx := context.Background()
	if agentID == "" {
		agentID = "product-analyst"
	}

	// 1. Save user message
	userMsgID := fmt.Sprintf("msg-%d", time.Now().UnixNano())
	userMsg := &domain.Message{
		ID:             userMsgID,
		ConversationID: conversationID,
		Role:           domain.RoleUser,
		Content:        content,
		CreatedAt:      time.Now().UTC(),
	}

	if err := s.repo.AddMessage(ctx, userMsg); err != nil {
		return nil, fmt.Errorf("failed to save user message: %w", err)
	}

	// 2. Fail-fast if orchestrator is not configured
	if s.orchestrator == nil {
		return nil, fmt.Errorf("AI Orchestrator is not configured or no active AI provider available")
	}

	// 3. Resolve Specialist Agent persona
	roleName := "Product Analyst"
	systemDirective := ""
	if s.agentRegistry != nil {
		if agent, ok := s.agentRegistry.GetAgent(agentID); ok {
			roleName = agent.Role
			systemDirective = agent.SystemPrompt

			// Append Active Skills Prompt Directives
			skills := s.agentRegistry.GetSkillsForAgent(agentID)
			if len(skills) > 0 {
				var skillDirectives []string
				for _, sk := range skills {
					if sk.Prompt != "" {
						skillDirectives = append(skillDirectives, fmt.Sprintf("- [%s]: %s", sk.Name, sk.Prompt))
					}
				}
				if len(skillDirectives) > 0 {
					systemDirective += "\n\nACTIVE SPECIALIZED SKILLS & FRAMEWORKS:\n" + strings.Join(skillDirectives, "\n")
				}
			}

			// Append Connected MCP Tools (Global + Persona-Specific)
			mcpServers := s.agentRegistry.GetMCPServersForAgent(agentID)
			if len(mcpServers) > 0 {
				var mcpInfo []string
				for _, m := range mcpServers {
					mcpInfo = append(mcpInfo, fmt.Sprintf("- %s (endpoint: %s, transport: %s, scope: %s)", m.Name, m.Endpoint, m.Transport, m.Scope))
				}
				systemDirective += "\n\nCONNECTED MCP EXTENSIONS & DATA SOURCES:\n" + strings.Join(mcpInfo, "\n")
			}
		}
	}

	// 4. Gather project discovery context & Interconnected Multi-Agent Pipeline
	var existingReqs []domain.Requirement
	if s.reqRepo != nil {
		existingReqs, _ = s.reqRepo.ListByProject(ctx, projectID)
	}
	existingAssump, _ := s.repo.ListAssumptions(ctx, projectID)
	existingClar, _ := s.repo.ListClarifications(ctx, projectID)

	prompt := ai.BuildDiscoveryPrompt(roleName, content, existingReqs, existingAssump, existingClar)

	// Interconnected Context Injection: downstream agents inherit upstream artifacts
	if s.workspace != nil {
		pDir := s.workspace.ProjectDir(projectID)
		var contextBuilder strings.Builder

		// System Analyst, Software Architect, UI/UX inherit PRD
		if agentID != "product-analyst" {
			prdPath := filepath.Join(pDir, "PRD.md")
			if prdBytes, err := os.ReadFile(prdPath); err == nil && len(prdBytes) > 0 {
				contentStr := string(prdBytes)
				if len(contentStr) > 4000 {
					contentStr = contentStr[:4000] + "\n...[truncated]"
				}
				contextBuilder.WriteString(fmt.Sprintf("\n\n--- INTERCONNECTED UPSTREAM PRD CONTEXT ---\n%s\n--- END PRD CONTEXT ---\n", contentStr))
			}
		}

		// Software Architect & UI/UX inherit SRS
		if agentID == "software-architect" || agentID == "ui-ux-agent" {
			srsPath := filepath.Join(pDir, "SRS.md")
			if srsBytes, err := os.ReadFile(srsPath); err == nil && len(srsBytes) > 0 {
				contentStr := string(srsBytes)
				if len(contentStr) > 4000 {
					contentStr = contentStr[:4000] + "\n...[truncated]"
				}
				contextBuilder.WriteString(fmt.Sprintf("\n\n--- INTERCONNECTED UPSTREAM SRS CONTEXT ---\n%s\n--- END SRS CONTEXT ---\n", contentStr))
			}
		}

		// UI/UX inherits Architecture
		if agentID == "ui-ux-agent" {
			archPath := filepath.Join(pDir, "architecture.md")
			if archBytes, err := os.ReadFile(archPath); err == nil && len(archBytes) > 0 {
				contentStr := string(archBytes)
				if len(contentStr) > 3000 {
					contentStr = contentStr[:3000] + "\n...[truncated]"
				}
				contextBuilder.WriteString(fmt.Sprintf("\n\n--- INTERCONNECTED UPSTREAM ARCHITECTURE CONTEXT ---\n%s\n--- END ARCHITECTURE CONTEXT ---\n", contentStr))
			}
		}

		if contextBuilder.Len() > 0 {
			prompt = prompt + "\n" + contextBuilder.String()
		}
	}

	if systemDirective != "" {
		prompt = fmt.Sprintf("SPECIALIST PERSONA INSTRUCTIONS:\n%s\n\n%s", systemDirective, prompt)
	}

	// 5. Pure Real AI Execution - NO MOCKS, FAIL-FAST
	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		Role:      roleName,
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("AI Provider Execution Failed (%s): %w", roleName, err)
	}

	// 6. Parse structured discovery results
	discovery, parseErr := ai.ParseDiscoveryOutput(resp.Content)
	aiContent := resp.Content
	if parseErr == nil && discovery != nil && discovery.Reply != "" {
		aiContent = discovery.Reply

		// Persist extracted requirements
		if s.reqRepo != nil {
			for _, r := range discovery.Requirements {
				reqKey, _ := s.reqRepo.NextKey(ctx, projectID, "REQ")
				if r.Key != "" {
					reqKey = r.Key
				}
				reqID := fmt.Sprintf("req-%d", time.Now().UnixNano())
				_ = s.reqRepo.Create(ctx, &domain.Requirement{
					ID:             reqID,
					ProjectID:      projectID,
					RequirementKey: reqKey,
					Category:       domain.RequirementCategory(r.Category),
					Title:          r.Title,
					Description:    r.Description,
					Priority:       domain.MoSCoWPriority(r.Priority),
					Status:         domain.RequirementStatusDraft,
					Confidence:     r.Confidence,
				})
			}
		}

		// Persist clarification questions
		for _, c := range discovery.Clarifications {
			clarID := fmt.Sprintf("clar-%d", time.Now().UnixNano())
			_ = s.repo.AddClarification(ctx, &domain.Clarification{
				ID:        clarID,
				ProjectID: projectID,
				Question:  c.Question,
				Status:    "open",
			})
		}

		// Persist assumptions
		for _, a := range discovery.Assumptions {
			assumpID := fmt.Sprintf("asmp-%d", time.Now().UnixNano())
			_ = s.repo.AddAssumption(ctx, &domain.Assumption{
				ID:          assumpID,
				ProjectID:   projectID,
				Description: a.Description,
				Status:      "unconfirmed",
			})
		}
	}

	// 7. Save Assistant Message
	aiMsgID := fmt.Sprintf("msg-%d", time.Now().UnixNano()+1)
	var execID *string
	if resp.ExecutionID != "" {
		execID = &resp.ExecutionID
	}
	aiMsg := &domain.Message{
		ID:                  aiMsgID,
		ConversationID:      conversationID,
		Role:                domain.RoleAssistant,
		Content:             aiContent,
		ProviderExecutionID: execID,
		CreatedAt:           time.Now().UTC(),
	}
	if err := s.repo.AddMessage(ctx, aiMsg); err != nil {
		return nil, fmt.Errorf("failed to save assistant message: %w", err)
	}

	return aiMsg, nil
}

func (s *ConversationService) SubmitAttachment(
	conversationID, projectID, filename, fileContent, userNote, agentID string,
) (*domain.Message, error) {
	// 1. Save attachment physically to project workspace
	if s.workspace != nil {
		if _, err := s.workspace.SaveAttachment(projectID, filename, []byte(fileContent)); err != nil {
			return nil, fmt.Errorf("failed to save attachment to workspace: %w", err)
		}
	}

	// 2. Build prompt with attached content
	compositeUserMessage := fmt.Sprintf("📎 [Attached: %s (%d bytes)]\n%s\n\n--- DRAFT CONTENT: %s ---\n```markdown\n%s\n```",
		filename, len(fileContent), userNote, filename, fileContent)

	return s.SendMessageWithAgent(conversationID, projectID, compositeUserMessage, agentID)
}

func (s *ConversationService) ListAttachments(projectID string) ([]string, error) {
	if s.workspace == nil {
		return []string{}, nil
	}
	return s.workspace.ListAttachments(projectID)
}

func (s *ConversationService) ListClarifications(projectID string) ([]domain.Clarification, error) {
	return s.repo.ListClarifications(context.Background(), projectID)
}

func (s *ConversationService) ListAssumptions(projectID string) ([]domain.Assumption, error) {
	return s.repo.ListAssumptions(context.Background(), projectID)
}
